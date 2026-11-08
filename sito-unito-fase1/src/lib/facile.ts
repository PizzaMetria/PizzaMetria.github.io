/*
 * RIPARTIZIONE DELLA MODALITÀ FACILE
 * ----------------------------------
 * La regola decisa: le ore fuori dal frigorifero si dividono a metà fra prima e
 * dopo, perché il modello conta le due metà quasi allo stesso modo e il 50/50 è
 * la scelta che non gonfia né sgonfia il totale.
 *
 * Il 50/50 da solo però non basta: con poco tempo a disposizione darebbe un
 * appretto troppo corto, e i panetti entrerebbero in forno freddi. Per questo
 * valgono due minimi — un'ora di puntata prima del frigo e tre ore di appretto
 * dopo — e il resto si divide a metà. La regola completa è:
 *
 * 1. le ore fuori frigo sono il 30% del tempo, ma mai meno di 4 e mai più di 8;
 * 2. le due metà sono uguali, salvo che l'appretto scenda sotto le 3 ore: in quel
 *    caso si spostano ore dalla puntata all'appretto;
 * 3. se in questo modo il frigo resterebbe sotto le 5 ore, tanto vale non usarlo.
 *
 * Tutto si arrotonda alla mezz'ora: gli orari della tabella di marcia devono
 * tornare con i numeri, e un quarto d'ora inventato è peggio di mezzo ora
 * dichiarata.
 */

/** Minimo di puntata prima del frigorifero, in ore. */
export const MIN_PRIMA = 1;
/** Minimo di appretto dopo il frigorifero, in ore. */
export const MIN_DOPO = 3;
/** Ore fuori frigo minime e massime. */
export const FUORI_MINIMO = 4;
export const FUORI_MASSIMO = 8;
/** Sotto queste ore in frigo non vale la pena accendere il frigo. */
export const FRIGO_MINIMO = 5;
/** Quota del tempo totale che si passa fuori dal frigo. */
export const QUOTA_FUORI = 0.3;

export interface RipartizioneFacile {
  conFrigo: boolean;
  oreFrigo: number;
  orePrima: number;
  oreDopo: number;
}

/** Arrotonda alla mezz'ora, mai sotto zero. */
function mezzeOre(ore: number): number {
  return Math.round(Math.max(0, ore) * 2) / 2;
}

function limita(valore: number, minimo: number, massimo: number): number {
  return Math.min(massimo, Math.max(minimo, valore));
}

/** Divide il tempo a disposizione fra puntata, frigo e appretto. */
export function ripartizioneFacile(oreTotali: number, vuoleFrigo = true): RipartizioneFacile {
  const totale = mezzeOre(oreTotali);
  const senzaFrigo = (): RipartizioneFacile => ({
    conFrigo: false,
    oreFrigo: 0,
    orePrima: 0,
    oreDopo: totale,
  });

  if (!vuoleFrigo) return senzaFrigo();

  const fuori = mezzeOre(limita(totale * QUOTA_FUORI, FUORI_MINIMO, FUORI_MASSIMO));
  let dopo = mezzeOre(Math.max(MIN_DOPO, fuori / 2));
  dopo = Math.min(dopo, fuori - MIN_PRIMA);

  let prima = mezzeOre(fuori - dopo);
  if (prima < MIN_PRIMA) {
    prima = MIN_PRIMA;
    dopo = fuori - prima;
  }

  const frigo = mezzeOre(totale - fuori);
  if (frigo < FRIGO_MINIMO) return senzaFrigo();

  return { conFrigo: true, oreFrigo: frigo, orePrima: prima, oreDopo: dopo };
}
