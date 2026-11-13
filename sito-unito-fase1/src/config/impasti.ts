import type { ConfigImpasto, ConfigSpessore } from '../types';

/**
 * Impasti diretti. I valori di partenza sono quelli classici: la verace sta
 * sul 62%, la contemporanea e la teglia sul 75% (alta idratazione), la teglia
 * con olio e un filo di malto.
 *
 * La teglia sta al 75% perché è l'idratazione a cui sono tarate le sue
 * mini-ricette: al 70% lo stesso programma 2+18+4 chiede W 288 invece di 300,
 * e la fascia della mini-ricetta non coinciderebbe più con il punto.
 *
 * Il campo `ramo` decide quale legge del lievito vale per quel formato: ogni
 * ricetta ha il suo, perché ognuna ha idratazione, pezzatura e programma suoi.
 * La teglia resta la più carica di lievito e con la dipendenza dal tempo più
 * marcata; la contemporanea sta in mezzo e usa un esponente dell'idratazione
 * più dolce della verace, che è quella misurata a temperatura ambiente.
 */
export const IMPASTI: readonly ConfigImpasto[] = [
  {
    id: 'verace',
    nome: 'Pizza tonda Verace',
    nomeBreve: 'Tonda verace',
    sottotitolo:
      'La classica pizza napoletana: idratazione contenuta, stesura facile, struttura soffice e scioglievole al morso.',
    idratazione: 62,
    sale: 2.5,
    olio: 0,
    malto: 0,
    pesoPanetto: 250,
    ramo: 'verace',
    tonda: true,
  },
  {
    id: 'contemporanea',
    nome: 'Pizza tonda Contemporanea',
    nomeBreve: 'Tonda contemporanea',
    sottotitolo:
      'Maggiore idratazione e lievitazione per ottenere un cornicione alto, alveolato e leggerissimo come una nuvola.',
    idratazione: 75,
    sale: 2.5,
    olio: 0,
    malto: 0,
    // La contemporanea è più idratata e sta su un cornicione più alto: il
    // panetto è più grande di quello della verace (280 contro 250 g).
    pesoPanetto: 280,
    ramo: 'contemporanea',
    tonda: true,
  },
  {
    id: 'teglia',
    nome: 'Pizza in Teglia',
    nomeBreve: 'In teglia',
    sottotitolo:
      'Base croccante, mollica soffice e ben sviluppata. Quantità d’impasto calcolata sulle dimensioni e lo spessore della tua teglia.',
    idratazione: 75,
    sale: 2.5,
    olio: 2,
    malto: 1,
    ramo: 'teglia',
    tonda: false,
  },
];

export function trovaImpasto(id: string): ConfigImpasto {
  return IMPASTI.find((impasto) => impasto.id === id) ?? IMPASTI[0];
}

/**
 * Grammi di impasto per cm² di teglia. Riferimenti pratici: una teglia
 * 30 × 40 cm con 0,55 g/cm² porta circa 660 g di impasto, cioè una pizza
 * alta e alveolata ma non esagerata.
 */
export const SPESSORI: readonly ConfigSpessore[] = [
  {
    id: 'bassa',
    nome: 'Bassa',
    nota: 'Teglia sottile, crosta croccante',
    grammiPerCm2: 0.42,
  },
  {
    id: 'media',
    nome: 'Media',
    nota: 'Altezza da pizzeria al taglio',
    grammiPerCm2: 0.55,
  },
  {
    id: 'alta',
    nome: 'Alta',
    nota: 'Pizza alta e alveolata',
    grammiPerCm2: 0.7,
  },
  {
    id: 'personalizzata',
    nome: 'Su misura',
    nota: 'Scegli tu i grammi per cm²',
    grammiPerCm2: 0.55,
  },
];

/** Limiti usati nella validazione dei campi. */
export const LIMITI = {
  idratazione: { min: 45, max: 100 },
  sale: { min: 0, max: 5 },
  olio: { min: 0, max: 20 },
  saleLitro: { min: 0, max: 80 },
  olioLitro: { min: 0, max: 80 },
  malto: { min: 0, max: 3 },
  forza: { min: 100, max: 500 },
  quota: { min: 0, max: 100 },
  panetti: { min: 1, max: 200 },
  pesoPanetto: { min: 80, max: 1200 },
  farina: { min: 0.1, max: 50 },
  lato: { min: 10, max: 200 },
  diametro: { min: 12, max: 80 },
  teglie: { min: 1, max: 20 },
  grammiCm2: { min: 0.2, max: 1.2 },
  oreFrigo: { min: 0, max: 96 },
  oreTaPrima: { min: 0, max: 24 },
  tc: { min: 1, max: 14 },
  ta: { min: 5, max: 40 },
  // Sotto le 4 ore il lievito necessario non è più una pizza a lievitazione;
  // oltre i tre giorni la stima perde senso anche con una farina fortissima.
  oreTotali: { min: 4, max: 72 },
  temperaturaImpasto: { min: 15, max: 32 },
  temperaturaFarina: { min: 5, max: 35 },
  riscaldamento: { min: 0, max: 20 },
  correzioneLievito: { min: -50, max: 50 },
} as const;

/**
 * Regola unica sulle ore totali, uguale per i tre impasti diretti: una pizza
 * che lievita meno di quattro ore non è una pizza a lievitazione, e oltre i
 * tre giorni la stima perde senso anche con una farina fortissima. Vive qui,
 * accanto ai limiti, perché non dipende dallo stile né dal motore: se un
 * giorno qualcuno volesse un minimo diverso per la teglia, dovrebbe cambiare
 * questa funzione e il suo test.
 */
export function problemaOreTotali(ore: number): string | null {
  if (ore < LIMITI.oreTotali.min) {
    return 'Meno di 4 ore non è una lievitazione: dà almeno 4 ore fra impasto e infornata.';
  }
  if (ore > LIMITI.oreTotali.max) {
    return 'Oltre 72 ore (tre giorni) la stima perde senso: accorcia i tempi.';
  }
  return null;
}
