/**
 * INTERVALLI DI IDRATAZIONE SICURA
 * --------------------------------
 * Ogni voce del sito ha un intervallo in cui la sua ricetta è pensata: fuori
 * da lì il calcolo resta valido — la dose di lievito e il W non cambiano di una
 * virgola — ma la gestione dell'impasto non è più quella per cui la ricetta è
 * tarata. Il sito lo dice con un avviso breve, senza bloccare niente.
 *
 * Gli intervalli sono dati di interfaccia, non di calcolo: vivono qui e non nel
 * motore, così nessuna formula dipende da questo file.
 *
 * Riferimenti delle idratazioni di lavoro (il centro di ogni intervallo):
 * - verace 62%, contemporanea 75%, teglia 75% (config/impasti.ts);
 * - teglia con biga 80%, Trancio 60%, contemporanea con biga 77%,
 *   Impasto Tuttofare 60% (vecchio/config/ricette.ts);
 * - biga 55% (la decide il motore, non l'utente).
 */

export interface IntervalloIdratazione {
  min: number;
  max: number;
}

export interface AvvisoIdratazione {
  livello: 'attenzione';
  /** Testo breve e non allarmista, mostrato sotto il campo. */
  testo: string;
  /** Voce a cui si riferisce l'avviso. */
  ricetta: string;
  idratazione: number;
  range: IntervalloIdratazione;
}

interface VoceIdratazione {
  range: IntervalloIdratazione;
  /** Messaggio sopra il massimo. */
  alto: string;
  /** Messaggio sotto il minimo. */
  basso: string;
}

/** L'id della sola biga: nel sito è una voce a sé, non una pizza. */
export const ID_BIGA = 'biga';

const VOCI: Record<string, VoceIdratazione> = {
  verace: {
    range: { min: 58, max: 65 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Verace. Puoi proseguire, ma presta maggiore attenzione alla lavorazione dell’impasto.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Verace. Puoi proseguire, ma presta maggiore attenzione alla stesura, perché l’impasto resta molto sodo.',
  },
  contemporanea: {
    range: { min: 65, max: 78 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Contemporanea. Puoi proseguire, ma presta maggiore attenzione alla forza della farina e alla gestione dell’impasto.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Contemporanea. Puoi proseguire, ma presta maggiore attenzione alla formatura dei panetti, perché il cornicione resta più basso.',
  },
  teglia: {
    range: { min: 70, max: 85 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Teglia. Puoi proseguire, ma presta maggiore attenzione alla forza della farina (W 350 o più) e alla gestione dell’impasto.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Teglia. Puoi proseguire, ma presta maggiore attenzione alla lievitazione in teglia, perché la mollica resta più compatta.',
  },
  'pizza-teglia-biga-85': {
    // Il tetto copre con margine l'idratazione di lavoro (80%): una ricetta non
    // deve mai avvisare sul proprio valore di default.
    range: { min: 70, max: 88 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Teglia con biga. Puoi proseguire, ma presta maggiore attenzione alla forza della farina e alla gestione dell’impasto.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Teglia con biga. Puoi proseguire, ma presta maggiore attenzione alla lievitazione in teglia, perché la mollica resta compatta.',
  },
  'trancio-milanese': {
    range: { min: 55, max: 65 },
    alto:
      'Idratazione superiore all’intervallo consigliato per il Trancio. Puoi proseguire, ma presta maggiore attenzione alla cottura in teglia, perché la base fatica a restare croccante.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per il Trancio. Puoi proseguire, ma presta maggiore attenzione alla stesura, perché l’impasto resta sodo.',
  },
  'pizza-contemporanea-con-biga-77': {
    range: { min: 68, max: 80 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Contemporanea con biga. Puoi proseguire, ma presta maggiore attenzione alla forza della farina e alla gestione dell’impasto.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Contemporanea con biga. Puoi proseguire, ma presta maggiore attenzione alla formatura, perché il cornicione resta più basso del previsto.',
  },
  'diretto-tuttofare': {
    range: { min: 55, max: 65 },
    alto:
      'Idratazione superiore all’intervallo consigliato per l’Impasto Tuttofare. Puoi proseguire, ma presta maggiore attenzione alla formatura dei pezzi piccoli, che faticano a tenere la forma.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per l’Impasto Tuttofare. Puoi proseguire, ma presta maggiore attenzione alla lievitazione delle focacce, che restano poco alveolate.',
  },
  [ID_BIGA]: {
    range: { min: 45, max: 60 },
    alto:
      'Idratazione superiore all’intervallo consigliato per la Biga. Puoi proseguire, ma presta maggiore attenzione alla maturazione del prefermento, che tende a collassare.',
    basso:
      'Idratazione inferiore all’intervallo consigliato per la Biga. Puoi proseguire, ma presta maggiore attenzione alla maturazione del prefermento, che resta farinoso.',
  },
};

/**
 * Dove l'avviso è attivo. Le ricette di casa sono «semi-fisse»: i loro numeri
 * sono un caso canonico già bilanciato, non un consiglio da correggere, quindi
 * non si avvisa — si allarga l'intervallo e si lascia il calcolo com'è. La biga
 * non ha un campo idratazione: la decide il motore. Restano attive le tre
 * dirette, dove l'idratazione la sceglie chi impasta.
 */
const VOCI_CON_AVVISO = new Set(['verace', 'contemporanea', 'teglia']);

/** Vero quando per quella voce l'avviso di idratazione è attivo. */
export function avvisoAttivo(ricettaId: string): boolean {
  return VOCI_CON_AVVISO.has(ricettaId);
}

/** Tutte le voci con il loro intervallo: serve all'audit e ai test. */
export function elencoRange(): { id: string; range: IntervalloIdratazione }[] {
  return Object.entries(VOCI).map(([id, voce]) => ({ id, range: voce.range }));
}

/** L'intervallo sicuro di una voce, null se la voce non ne ha uno. */
export function rangeSicuro(ricettaId: string): IntervalloIdratazione | null {
  return VOCI[ricettaId]?.range ?? null;
}

/** «Intervallo consigliato: 58–65%.» Da mettere sotto l'avviso. */
export function testoSicurezza(ricettaId: string): string | null {
  const range = rangeSicuro(ricettaId);
  return range ? `Intervallo consigliato: ${range.min}–${range.max}%.` : null;
}

/**
 * L'avviso da mostrare, oppure null quando l'idratazione sta nell'intervallo.
 * Non blocca il calcolo: dice soltanto che si sta uscendo dal terreno della
 * ricetta.
 */
export function avvisoIdratazione(
  ricettaId: string,
  idratazione: number | null | undefined,
): AvvisoIdratazione | null {
  const voce = VOCI[ricettaId];
  if (!voce || !VOCI_CON_AVVISO.has(ricettaId)) return null;
  if (typeof idratazione !== 'number' || !Number.isFinite(idratazione)) return null;
  if (idratazione >= voce.range.min && idratazione <= voce.range.max) return null;

  return {
    livello: 'attenzione',
    testo: idratazione > voce.range.max ? voce.alto : voce.basso,
    ricetta: ricettaId,
    idratazione,
    range: voce.range,
  };
}
