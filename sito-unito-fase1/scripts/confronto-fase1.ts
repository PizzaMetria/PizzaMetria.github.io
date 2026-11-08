import { calcola, consiglioForza, fasceForza, finestraForza, giudizioForza } from '../src/lib/calcolo';
import type { Farina, InputCalcolo } from '../src/types';

function input(farine: Farina[], ore = 24): InputCalcolo {
  return {
    tipo: 'verace', ramo: 'verace', idratazione: 62, sale: 2.5, olio: 0, malto: 0,
    tipoLievito: 'fresco', farine,
    modalita: 'panetti', numeroPanetti: 6, pesoPanettoG: 250, farinaG: null,
    formaTeglia: 'rettangolare', latoA: 30, latoB: 40, diametro: 32, numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: ore, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: ore, ta: 20, tc: 4 },
    staglio: 'prima', temperaturaImpasto: 20, temperaturaFarina: 20, riscaldamento: 8,
    correzioneLievito: 0,
  };
}

const vecchiaFinestra = (w: number) => `${Math.round(w * 0.9)}–${Math.round(w * 1.25)}`;

console.log('W | finestra vecchia | finestra nuova | zona consigliata');
for (const w of [209, 250, 302, 365]) {
  const f = finestraForza(w);
  const s = fasceForza(w).sicura;
  console.log(`${w} | ${vecchiaFinestra(w)} | ${f.minima}–${f.massima} | ${s[0]}–${s[1]}`);
}

console.log('\nMIX | W cons | giudizio | consiglio proposto');
for (const [etichetta, farine] of [
  ['200/400 25-75', [{ quota: 75, w: 200 }, { quota: 25, w: 400 }, { quota: 0, w: null }]],
  ['150/350 50-50', [{ quota: 50, w: 150 }, { quota: 50, w: 350 }, { quota: 0, w: null }]],
  ['200/300/400', [{ quota: 40, w: 200 }, { quota: 40, w: 300 }, { quota: 20, w: 400 }]],
  ['180 singola', [{ quota: 100, w: 180 }, { quota: 0, w: null }, { quota: 0, w: null }]],
  ['480 singola', [{ quota: 100, w: 480 }, { quota: 0, w: null }, { quota: 0, w: null }]],
] as const) {
  const r = calcola(input(farine as Farina[]));
  console.log(`${etichetta} | ${r.forzaConsigliata} | ${r.giudizioForza} | ${r.suggerimentoForza ?? '—'}`);
}

console.log('\nCambi di giudizio dovuti solo all arrotondamento dei bordi:');
let diversi = 0;
let confronti = 0;
for (let cons = 100; cons <= 365; cons += 1) {
  for (let w = 60; w <= 520; w += 0.5) {
    const vecchio = w >= cons * 0.9 && w <= cons * 1.15
      ? 'ottima'
      : w >= cons * 0.85 && w <= cons * 1.25
        ? 'accettabile'
        : 'distante';
    confronti += 1;
    if (vecchio !== giudizioForza(w, cons)) diversi += 1;
  }
}
console.log(`${diversi} su ${confronti} (${((diversi / confronti) * 100).toFixed(2)}%)`);

console.log('\nCaso senza quota valida:');
console.log(consiglioForza([{ quota: 50, w: 150 }, { quota: 50, w: 250 }, { quota: 0, w: null }], 150, 400, finestraForza(400)));
