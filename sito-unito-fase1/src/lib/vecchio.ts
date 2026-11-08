import { fattoreOlio, fattoreSale } from './fermentazione';
import type { FasciaCurva, ParametriTempo, PuntoCurva, Ramo } from '../types';

/*
 * VECCHIO CALCOLATORE — emulazione provvisoria
 * --------------------------------------------
 * Serve solo per le prove: riproduce il comportamento del calcolatore
 * precedente per confrontarlo con il modello a inerzia termica.
 *
 * Il calcolatore precedente non pubblica le sue formule, quindi qui non c'è
 * una formula copiata: ci sono dei coefficienti fittati su otto calcoli
 * eseguiti davvero su quello strumento, con lo stesso impasto (6 panetti da
 * 250 g, 62% di idratazione, 2,5% di sale, ambiente 20 °C, frigo 4 °C,
 * lievito secco) e con la curva di temperatura letta dai suoi risultati.
 *
 * Cosa è stato misurato e cosa è stato fittato:
 * - la forma della curva di temperatura è misurata: raffreddamento con
 *   costante di tempo 2,3 h, riaccesa all'uscita dal frigo quasi istantanea
 *   (0,39 h), prima puntata a temperatura ambiente (3 h);
 * - i tre coefficienti del ritmo di fermentazione sono fittati, e
 *   riproducono le otto ore equivalenti entro il 7%;
 * - la legge della dose è una potenza fittata sulle otto dosi, entro l'8%
 *   tranne due casi (24 h a +11%, 46 h a −18%);
 * - la legge della forza è una retta in due variabili (ore equivalenti e ore
 *   totali) che riproduce gli otto W entro l'1%.
 *
 * La ripartizione delle ore resta quella impostata dall'utente: cambia solo
 * il modo di inseguire la temperatura, così il confronto è sullo stesso
 * programma di lavoro.
 */

export const COSTANTI_VECCHIO = {
  /** ln(ritmo) = a + b·T + c·T², fittata sulle ore equivalenti misurate. */
  ritmo: { a: -2.64024655, b: 0.15789607, c: -0.00140871 },
  /** Costante di tempo a temperatura ambiente, in ore. */
  tauAmbiente: 3,
  /** Costante di tempo in frigorifero, in ore. */
  tauFreddo: 2.3,
  /** Costante di tempo all'uscita dal frigo, in ore. */
  tauCaldo: 0.39,
  /**
   * Dose di lievito fresco, un ramo per formato: percentuale = K × oreEq^−e.
   * Tonda: fittata sulle otto dosi del calcolatore (6 panetti da 250 g).
   * Teglia: fittata su sette dosi a pezzo unico da 750 g, che è la geometria
   * della teglia, perché quel calcolatore carica la dose quando il pezzo è
   * grande (+12% da 3 pezzi a 1 pezzo a parità di farina).
   */
  dose: {
    verace: { coefficiente: 3.9635, esponente: 1.2506 },
    // Il calcolatore precedente non distingueva le due tonde: la contemporanea
    // usa gli stessi coefficienti della verace. La separazione in tre rami
    // vale per il modello nuovo; qui si riproduce quello vecchio, e quello
    // vecchio una curva sola ce l'aveva.
    contemporanea: { coefficiente: 3.9635, esponente: 1.2506 },
    teglia: { coefficiente: 11.755, esponente: 1.2059 },
  },
  /** Forza consigliata: base + oreEq × a + oreTotali × b. */
  forza: { base: 161.149, oreEquivalenti: 3.912, oreTotali: 1.759, tetto: 365 },
  /** Idratazione di riferimento: l'acqua abbassa la dose (vedi fermentazione.ts). */
  idro: { riferimento: 62, esponente: -1.2 },
} as const;

/** Quante ore equivalenti matura l'impasto in un'ora a questa temperatura. */
export function ritmoVecchio(temperatura: number): number {
  const t = Math.min(40, Math.max(-5, temperatura));
  const { a, b, c } = COSTANTI_VECCHIO.ritmo;
  return Math.exp(a + b * t + c * t * t);
}

export interface IngressiVecchio {
  /** Temperatura dell'impasto a fine impastamento, in °C. */
  temperaturaIniziale: number;
}

export interface ProfiloVecchio {
  curva: PuntoCurva[];
  fasce: FasciaCurva[];
  oreEquivalenti: number;
  oreEquivalentiInFrigo: number;
  temperaturaUscitaFrigo: number | null;
}

const PASSO = 1 / 60;
const CAMPIONI = 5;

/**
 * Curva termica e ore equivalenti del vecchio calcolatore.
 *
 * Le fasi sono le stesse dell'impasto (puntata, frigo, appretto), ma la
 * temperatura le inseguе con tre costanti di tempo fisse, uguali per qualsiasi
 * peso: il vecchio modello non sapeva distinguere un panetto da 250 g da una
 * massa da 1,5 kg.
 */
export function profiloVecchio(
  tempi: ParametriTempo,
  ingressi: IngressiVecchio,
): ProfiloVecchio {
  const fasi: { ore: number; ambiente: number; inFrigo: boolean; dopoFrigo: boolean }[] = [];
  const frigo = Math.max(0, tempi.oreFrigo);

  if (tempi.oreTaPrima > 0) {
    fasi.push({ ore: tempi.oreTaPrima, ambiente: tempi.ta, inFrigo: false, dopoFrigo: false });
  }
  if (frigo > 0) {
    fasi.push({ ore: frigo, ambiente: tempi.tc, inFrigo: true, dopoFrigo: false });
  }
  if (tempi.oreTaDopo > 0) {
    fasi.push({
      ore: tempi.oreTaDopo,
      ambiente: tempi.ta,
      inFrigo: false,
      dopoFrigo: frigo > 0,
    });
  }

  const curva: PuntoCurva[] = [];
  const fasce: FasciaCurva[] = [];
  let temperatura = ingressi.temperaturaIniziale;
  let ora = 0;
  let oreEquivalenti = 0;
  let oreEquivalentiInFrigo = 0;
  let temperaturaUscitaFrigo: number | null = null;

  curva.push({ ora: 0, temperatura, attivita: ritmoVecchio(temperatura) });

  for (const fase of fasi) {
    const nome = fase.inFrigo ? 'Frigorifero' : fase.dopoFrigo ? 'Appretto' : 'Puntata';
    fasce.push({ da: ora, a: ora + fase.ore, nome, inFrigo: fase.inFrigo });

    const tau = fase.inFrigo
      ? COSTANTI_VECCHIO.tauFreddo
      : fase.dopoFrigo
        ? COSTANTI_VECCHIO.tauCaldo
        : COSTANTI_VECCHIO.tauAmbiente;

    const passi = Math.max(1, Math.round(fase.ore / PASSO));
    const dt = fase.ore / passi;
    const decadimento = Math.exp(-dt / tau);
    let equivalentiFase = 0;

    for (let indice = 0; indice < passi; indice += 1) {
      const dopo = fase.ambiente + (temperatura - fase.ambiente) * decadimento;
      equivalentiFase += ((ritmoVecchio(temperatura) + ritmoVecchio(dopo)) / 2) * dt;
      temperatura = dopo;
      ora += dt;

      if (indice % CAMPIONI === CAMPIONI - 1 || indice === passi - 1) {
        curva.push({ ora, temperatura, attivita: ritmoVecchio(temperatura) });
      }
    }

    oreEquivalenti += equivalentiFase;
    if (fase.inFrigo) {
      oreEquivalentiInFrigo += equivalentiFase;
      temperaturaUscitaFrigo = temperatura;
    }
  }

  if (curva.length === 1) {
    curva.push({ ora: 0.5, temperatura, attivita: ritmoVecchio(temperatura) });
  }

  return { curva, fasce, oreEquivalenti, oreEquivalentiInFrigo, temperaturaUscitaFrigo };
}

export interface ParametriDoseVecchio {
  oreEquivalenti: number;
  /** Ramo della dose: la teglia chiede quasi il triplo del lievito. */
  ramo: Ramo;
  /** Idratazione in punti percentuali. */
  idratazione: number;
  /** Sale in percentuale sulla farina. */
  sale: number;
  /** Olio in percentuale sulla farina. */
  olio: number;
}

/**
 * Percentuale di lievito fresco del vecchio calcolatore.
 *
 * La dose ha un ramo per formato, come il modello nuovo: alla geometria e al
 * programma su cui è tarata, la teglia chiede circa 3,3 volte la tonda.
 * Ogni ramo è tarato sulla propria geometria (tonda: 6 panetti da 250 g,
 * teglia: un pezzo da 750 g), perché quel calcolatore carica la dose quando il
 * pezzo è unico.
 *
 * Idratazione, sale e olio usano le correzioni condivise, misurate sullo stesso
 * calcolatore: non c'è più una legge termica con correzioni prese in prestito.
 */
/** Limiti del vecchio calcolatore: dose 0,01–8% sulla farina. */
export const LIMITI_LIEVITO_VECCHIO = { min: 0.01, max: 8 } as const;

export function percentualeLievitoVecchio(parametri: ParametriDoseVecchio): number {
  const ore = Math.max(parametri.oreEquivalenti, 0.5);
  const { coefficiente, esponente } = COSTANTI_VECCHIO.dose[parametri.ramo];
  const idro = Math.pow(
    Math.max(parametri.idratazione, 30) / COSTANTI_VECCHIO.idro.riferimento,
    COSTANTI_VECCHIO.idro.esponente,
  );
  const rallentamento = fattoreSale(parametri.sale) * fattoreOlio(parametri.olio);

  const percentuale = (coefficiente * Math.pow(ore, -esponente) * idro) / rallentamento;
  return Math.min(
    LIMITI_LIEVITO_VECCHIO.max,
    Math.max(LIMITI_LIEVITO_VECCHIO.min, percentuale),
  );
}

/**
 * W del vecchio calcolatore — **emulazione storica, non più usata in uscita**.
 *
 * Questa retta (base + ore equivalenti + ore totali) è quella che riproduce il
 * W del calcolatore precedente entro l'1% sugli otto punti misurati, e per
 * questo resta qui con il suo test: documenta come quel programma pesava la
 * farina. Da quando il W è passato alla legge a due orologi — uguale per
 * entrambi i motori — l'applicazione non la chiama più: riprodurla e correggerla
 * insieme è impossibile, perché il termine 1,759 × oreTotali e il termine
 * 2 × oreFrigo dicono cose diverse sulle stesse ore fredde.
 */
export function forzaVecchio(
  oreEquivalenti: number,
  oreTotali: number,
  correzione = 1,
): number {
  const { base, oreEquivalenti: coefficienteOre, oreTotali: coefficienteTotali, tetto } =
    COSTANTI_VECCHIO.forza;
  const valore =
    (base + coefficienteOre * Math.max(0, oreEquivalenti) + coefficienteTotali * Math.max(0, oreTotali)) *
    correzione;
  return Math.min(tetto, Math.max(0, Math.round(valore)));
}
