/**
 * IL W DELLA BIGA E DEL RINFRESCO
 * ===============================
 * La scheda di una ricetta con biga non può dire un solo W, e nemmeno un
 * «almeno 300»: al rinfresco entra farina nuova, che non ha fatto le ore della
 * biga. Le due farine chiedono forza diversa, e la differenza non è una
 * sfumatura — su una biga di 24 ore sono un centinaio di gradi W.
 *
 * LA LEGGE
 * --------
 * È la stessa del resto del sito (`lib/fermentazione.ts`), applicata a ogni
 * farina con le sue ore. Due scelte che vanno spiegate, perché non sono quelle
 * che verrebbero naturali:
 *
 * 1. **Le ore della biga contano 1,8 volte.** Un prefermento sodo al 45–55% di
 *    idratazione è più ossidativo di un impasto diretto: a parità di ore la
 *    maglia si degrada di più. Il fattore è tarato sui quattro vincoli italiani
 *    che dichiarano il W per una biga (Confraternita 12 e 24 ore, Colombo 24 ore
 *    in frigo, Lario Millenium 18 ore): tutti e quattro stanno entro ±16 W con
 *    1,8, mentre senza termine restano bassi di 34–80 W
 *    (artifacts/calcolatori/W-CONFRONTO-71-FONTI.md).
 *
 * 2. **Le ore della biga si contano nominali, senza sconto per il freddo.** È
 *    la parte controintuitiva. Per il lievito un'ora a 4 °C vale sette minuti,
 *    ma per la farina no: le schede dei molini chiedono lo stesso W per 24 ore
 *    in ambiente e per 24 ore in frigo. Se qui si applicasse lo sconto del
 *    frigo, una biga di 24 ore in cella chiederebbe W 240 mentre le fonti ne
 *    chiedono 300–340. Il freddo rallenta il lievito, non la proteolisi.
 *
 * Il `W` così ottenuto è quello della farina **per quella fase**; la correzione
 * di idratazione, sale e olio è quella dell'impasto finale, perché è l'acqua
 * totale che la farina deve tenere.
 */

import { forzaImpasto } from '../../lib/fermentazione';
import type { IngredientiForza } from '../../lib/fermentazione';
import type { PianoBiga, RicettaConfig } from '../types';
import { oreAttesa, piano as pianoMotore } from './motore-biga';

/** Quanto pesa un'ora di biga rispetto a un'ora di impasto diretto. */
export const PESO_ORE_BIGA = 1.8;

/**
 * Ore fra il rinfresco e la cottura: puntata in massa (circa 1 h) più appretto
 * (circa 3 h). È il tempo che la farina del rinfresco matura davvero.
 */
export const ORE_DOPO_RINFRESCO = 4;

/**
 * Errore tipico della legge del W sui 75 vincoli italiani: RMSE 36 W. La
 * forbice mostrata accanto al numero è questa, non un margine inventato.
 */
export const FASCIA_W = 35;

export interface ConsiglioForza {
  /** W consigliato per la farina che va nella biga. */
  biga: number;
  /** W consigliato per la farina del rinfresco: `null` se la biga è al 100%. */
  rinfresco: number | null;
  /** Riga per la scheda: «Biga W 403 · rinfresco W 251». */
  riga: string;
  /** Frase estesa con la forbice, per i consigli. */
  frase: string;
}

function fascia(w: number): string {
  return `W ${Math.max(0, w - FASCIA_W)}–${Math.min(420, w + FASCIA_W)}`;
}

/**
 * Il consiglio per una biga con le sue ore. `quotaFarinaBiga` è la frazione
 * della farina totale che sta nella biga: a 1 non c'è rinfresco e la seconda
 * farina non esiste.
 */
export function consiglioForza(
  piano: PianoBiga,
  ingredienti: IngredientiForza,
  quotaFarinaBiga: number,
  oreDopo: number = ORE_DOPO_RINFRESCO,
): ConsiglioForza {
  const biga = forzaImpasto(PESO_ORE_BIGA * piano.oreTotali, 0, 1, ingredienti);

  if (quotaFarinaBiga >= 1) {
    return {
      biga,
      rinfresco: null,
      riga: `Biga ${fascia(biga)}`,
      frase:
        `La farina della biga matura ${piano.oreTotali} ore: serve ${fascia(biga)}. ` +
        'Quando la unirai alla farina del rinfresco, quella nuova non deve essere così forte.',
    };
  }

  const rinfresco = forzaImpasto(oreDopo, 0, 1, ingredienti);

  return {
    biga,
    rinfresco,
    riga: `Biga W ${biga} · rinfresco W ${rinfresco}`,
    frase:
      `La farina della biga matura ${piano.oreTotali} ore e serve ${fascia(biga)}; ` +
      `quella del rinfresco lavora solo ${oreDopo} ore e basta ${fascia(rinfresco)}. ` +
      'Usare una sola farina, quella della biga, è sicuro ma sprecato: ' +
      'nel rinfresco regge anche una farina più debole.',
  };
}

/** Le ore della biga chieste dalla configurazione, orari compresi. */
function oreDellaConfig(ricetta: RicettaConfig): number | null {
  const biga = ricetta.motoreBiga;
  if (!biga) return ricetta.oreBiga ?? null;

  if (biga.oraImpasto && biga.oraPronta) {
    const ore = oreAttesa(biga.oraImpasto, biga.oraPronta);
    if (ore !== null) return ore;
  }
  return biga.ore;
}

/**
 * Il consiglio a partire dalla ricetta. Se il risultato porta un piano vero
 * (l'utente ha cambiato orari o temperature) si usa quello; altrimenti si
 * ricostruisce dalla configurazione, così anche la scheda della ricetta
 * selezionata mostra i due W invece di un testo fisso.
 */
export function consiglioForzaRicetta(
  ricetta: RicettaConfig,
  piano?: PianoBiga | null,
): ConsiglioForza | null {
  if (ricetta.famiglia === 'diretto') return null;

  let pianoUsato = piano ?? null;
  if (!pianoUsato) {
    const ore = oreDellaConfig(ricetta);
    if (ore === null) return null;
    const biga = ricetta.motoreBiga;
    pianoUsato = pianoMotore({
      temperatura: biga?.temperatura ?? 20,
      temperaturaFrigo: biga?.temperaturaFrigo ?? 4,
      oreTotali: ore,
    });
  }

  return consiglioForza(
    pianoUsato,
    {
      idratazione: ricetta.idratazioneTotale * 100,
      sale: ricetta.percentualeSale * 100,
      olio: ricetta.percentualeOlio * 100,
    },
    ricetta.quotaFarinaBiga ?? 1,
  );
}
