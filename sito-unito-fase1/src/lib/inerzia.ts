import { fattoreTemperatura } from './fermentazione';
import type { FasciaCurva, ParametriTempo, PuntoCurva } from '../types';

/*
 * INERZIA TERMICA
 * ---------------
 * L'impasto non passa istantaneamente alla temperatura dell'ambiente: ha una
 * capacità termica e una superficie, quindi insegue l'ambiente con un ritardo.
 * Il modello è quello di Newton a capacità concentrata:
 *
 *   dT/dt = (T_ambiente − T) / τ
 *
 * La costante di tempo viene dalla geometria, non da un numero scelto a occhio:
 *
 *   τ = ρ · cp · L / h        con L = V / A
 *
 * ρ è la densità dell'impasto (1.100 kg/m³, poco sopra l'acqua perché c'è la
 * farina), cp il calore specifico (3.400 J/kg·K), h il coefficiente di scambio
 * con l'aria ferma di un frigorifero domestico, contenitore compreso
 * (5,5 W/m²·K). L è la lunghezza caratteristica del pezzo: per un cilindro
 * appiattito vale k·r/(1+2k), dove k è il rapporto fra altezza e diametro.
 *
 * Da qui escono due cose che il modello a scalini non poteva dare:
 * - la massa unica è più lenta dei panetti (τ cresce con la radice cubica della
 *   massa, quindi raddoppiando il peso la costante sale solo del 26%);
 * - entrando e uscendo dal frigo l'impasto resta per un po' a temperatura
 *   intermedia, e quella è la parte di lievitazione che si sta svolgendo
 *   davvero.
 *
 * Il limite del modello: vale finché il numero di Biot (h·L/λ, con λ ≈ 0,35
 * W/m·K per l'impasto) resta basso. Per un panetto da 250 g viene 0,15, per una
 * massa unica da 1,5 kg 0,30: va bene per una stima, ma il cuore del pezzo è un
 * po' più lento della superficie, quindi τ misurata con la sonda risulterà
 * leggermente più alta — soprattutto sulla massa unica.
 */

export const COSTANTI_INERZIA = {
  /** Densità dell'impasto, kg/m³. */
  densita: 1100,
  /** Calore specifico, J/(kg·K). */
  caloreSpecifico: 3400,
  /** Scambio termico con l'aria del frigo, W/(m²·K). */
  convezione: 5.5,
  /** Altezza / diametro di un panetto. */
  aspettoPanetto: 0.35,
  /** Altezza / diametro di una massa unica in ciotola. */
  aspettoMassa: 0.5,
} as const;

/** Come si presenta l'impasto: pezzi già formati oppure una massa sola. */
export type FormaMassa = 'panetto' | 'massa';

export function costanteTempo(massaG: number, forma: FormaMassa): number {
  const massa = Math.max(massaG, 20);
  const volume = massa / 1000 / COSTANTI_INERZIA.densita; // m³
  const k = forma === 'panetto' ? COSTANTI_INERZIA.aspettoPanetto : COSTANTI_INERZIA.aspettoMassa;

  const raggio = Math.cbrt(volume / (2 * Math.PI * k));
  const caratteristica = (k * raggio) / (1 + 2 * k);

  return (
    (COSTANTI_INERZIA.densita * COSTANTI_INERZIA.caloreSpecifico * caratteristica) /
    COSTANTI_INERZIA.convezione /
    3600
  );
}

export interface IngressiInerzia {
  /** Peso di un pezzo: panetto, oppure teglia intera. */
  pesoPezzoG: number;
  /** Peso di tutto l'impasto. */
  pesoImpastoG: number;
  /** Forma durante puntata e frigorifero. */
  formaInFrigo: FormaMassa;
  /** Forma durante l'appretto finale. */
  formaInAppretto: FormaMassa;
  /** Temperatura dell'impasto a fine impastamento. */
  temperaturaIniziale: number;
}

export interface ProfiloTermico {
  curva: PuntoCurva[];
  fasce: FasciaCurva[];
  /** Integrale del ritmo di fermentazione sulla temperatura reale. */
  oreEquivalenti: number;
  /** Lo stesso conto trattando ogni fase come istantanea. */
  oreSenzaInerzia: number;
  equivalenti: { inFrigo: number; fuoriFrigo: number };
  costanteTempoPezzo: number;
  costanteTempoMassa: number;
  /** Temperatura dell'impasto all'uscita dal frigo, null senza frigo. */
  temperaturaUscitaFrigo: number | null;
}

interface Fase {
  nome: string;
  ore: number;
  ambiente: number;
  inFrigo: boolean;
  massaG: number;
  forma: FormaMassa;
}

/** Passo di integrazione: un minuto. */
const PASSO = 1 / 60;
/** Un punto di curva ogni cinque passi, cioè ogni cinque minuti. */
const CAMPIONI = 5;

function fasiDi(tempi: ParametriTempo, ingressi: IngressiInerzia): Fase[] {
  // In teglia il pezzo è la teglia intera: non ci sono panetti separati.
  const massa = (forma: FormaMassa) =>
    forma === 'panetto' ? ingressi.pesoPezzoG : ingressi.pesoImpastoG;
  const fasi: Fase[] = [];

  if (tempi.oreTaPrima > 0) {
    fasi.push({
      nome: 'Puntata',
      ore: tempi.oreTaPrima,
      ambiente: tempi.ta,
      inFrigo: false,
      massaG: massa(ingressi.formaInFrigo),
      forma: ingressi.formaInFrigo,
    });
  }

  if (tempi.oreFrigo > 0) {
    fasi.push({
      nome: 'Frigorifero',
      ore: tempi.oreFrigo,
      ambiente: tempi.tc,
      inFrigo: true,
      massaG: massa(ingressi.formaInFrigo),
      forma: ingressi.formaInFrigo,
    });
  }

  if (tempi.oreTaDopo > 0) {
    fasi.push({
      nome: 'Appretto',
      ore: tempi.oreTaDopo,
      ambiente: tempi.ta,
      inFrigo: false,
      massaG: massa(ingressi.formaInAppretto),
      forma: ingressi.formaInAppretto,
    });
  }

  return fasi;
}

/**
 * Profilo termico dell'impasto e ore equivalenti che ne derivano.
 *
 * L'integrazione avanza con passi di un minuto e, dentro ogni passo, usa la
 * soluzione esatta dell'esponenziale: la temperatura non può quindi «saltare»
 * quando cambia la fase, cambia solo la τ con cui insegue la nuova ambiente.
 */
export function profiloTermico(
  tempi: ParametriTempo,
  ingressi: IngressiInerzia,
): ProfiloTermico {
  const fasi = fasiDi(tempi, ingressi);
  const curva: PuntoCurva[] = [];
  const fasce: FasciaCurva[] = [];

  const costanteTempoPezzo = costanteTempo(ingressi.pesoPezzoG, 'panetto');
  const costanteTempoMassa = costanteTempo(ingressi.pesoImpastoG, 'massa');

  let temperatura = ingressi.temperaturaIniziale;
  let ora = 0;
  let oreEquivalenti = 0;
  let oreSenzaInerzia = 0;
  const equivalenti = { inFrigo: 0, fuoriFrigo: 0 };
  let temperaturaUscitaFrigo: number | null = null;

  curva.push({ ora: 0, temperatura, attivita: fattoreTemperatura(temperatura) });

  for (const fase of fasi) {
    fasce.push({ da: ora, a: ora + fase.ore, nome: fase.nome, inFrigo: fase.inFrigo });

    const passi = Math.max(1, Math.round(fase.ore / PASSO));
    const dt = fase.ore / passi;
    const tau = Math.max(costanteTempo(fase.massaG, fase.forma), 1e-3);
    const decadimento = Math.exp(-dt / tau);

    let equivalentiFase = 0;

    for (let indice = 0; indice < passi; indice += 1) {
      const dopo = fase.ambiente + (temperatura - fase.ambiente) * decadimento;

      // Trapezio: il ritmo cambia poco dentro un minuto, ma così l'integrale
      // non dipende da dove cade il confine della fase.
      equivalentiFase +=
        ((fattoreTemperatura(temperatura) + fattoreTemperatura(dopo)) / 2) * dt;

      temperatura = dopo;
      ora += dt;

      if (indice % CAMPIONI === CAMPIONI - 1 || indice === passi - 1) {
        curva.push({ ora, temperatura, attivita: fattoreTemperatura(temperatura) });
      }
    }

    oreEquivalenti += equivalentiFase;
    oreSenzaInerzia += fase.ore * fattoreTemperatura(fase.ambiente);

    if (fase.inFrigo) {
      equivalenti.inFrigo += equivalentiFase;
      temperaturaUscitaFrigo = temperatura;
    } else {
      equivalenti.fuoriFrigo += equivalentiFase;
    }
  }

  if (curva.length === 1) {
    // Nessuna ora da percorrere: serve comunque un punto per disegnare.
    curva.push({
      ora: 0.5,
      temperatura,
      attivita: fattoreTemperatura(temperatura),
    });
  }

  return {
    curva,
    fasce,
    oreEquivalenti,
    oreSenzaInerzia,
    equivalenti,
    costanteTempoPezzo,
    costanteTempoMassa,
    temperaturaUscitaFrigo,
  };
}
