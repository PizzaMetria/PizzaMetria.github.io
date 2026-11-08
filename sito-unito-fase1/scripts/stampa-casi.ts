import { FASCE, calcolaMiniRicetta, intervalloDose } from '../src/lib/miniricette';
import type { Fascia } from '../src/lib/miniricette';

const CASI = [
  { id: 'teglia breve', ricetta: 'teglia' as const, massa: 660, farina: 366, idro: 75, sale: 2.5, olio: 2, p: { hPrima: 6, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'teglia media', ricetta: 'teglia' as const, massa: 660, farina: 366, idro: 75, sale: 2.5, olio: 2, p: { hPrima: 12, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'teglia lunga', ricetta: 'teglia' as const, massa: 660, farina: 366, idro: 75, sale: 2.5, olio: 2, p: { hPrima: 2, hFrigo: 18, hDopo: 4 }, ta: 20, tc: 4 },
  { id: 'teglia molto', ricetta: 'teglia' as const, massa: 660, farina: 366, idro: 75, sale: 2.5, olio: 2, p: { hPrima: 1, hFrigo: 44, hDopo: 3 }, ta: 20, tc: 4 },
  { id: 'verace breve', ricetta: 'verace' as const, massa: 750, farina: 456, idro: 62, sale: 2.6, olio: 0, p: { hPrima: 6, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'verace media', ricetta: 'verace' as const, massa: 750, farina: 456, idro: 62, sale: 2.6, olio: 0, p: { hPrima: 12, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'verace lunga', ricetta: 'verace' as const, massa: 750, farina: 456, idro: 62, sale: 2.6, olio: 0, p: { hPrima: 4, hFrigo: 20.5, hDopo: 4.2 }, ta: 20, tc: 4 },
  { id: 'verace molto', ricetta: 'verace' as const, massa: 750, farina: 456, idro: 62, sale: 2.6, olio: 0, p: { hPrima: 2, hFrigo: 44, hDopo: 3 }, ta: 20, tc: 4 },
  { id: 'contemporanea breve', ricetta: 'contemporanea' as const, massa: 840, farina: 473, idro: 75, sale: 2.4, olio: 1, p: { hPrima: 6, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'contemporanea media', ricetta: 'contemporanea' as const, massa: 840, farina: 473, idro: 75, sale: 2.4, olio: 1, p: { hPrima: 12, hFrigo: 0, hDopo: 0 }, ta: 20, tc: 4 },
  { id: 'contemporanea lunga', ricetta: 'contemporanea' as const, massa: 840, farina: 473, idro: 75, sale: 2.4, olio: 1, p: { hPrima: 4, hFrigo: 20.5, hDopo: 4.2 }, ta: 20, tc: 4 },
  { id: 'contemporanea molto', ricetta: 'contemporanea' as const, massa: 840, farina: 473, idro: 75, sale: 2.4, olio: 1, p: { hPrima: 2, hFrigo: 44, hDopo: 3 }, ta: 20, tc: 4 },
  { id: 'UI teglia obbligatorio', ricetta: 'teglia' as const, massa: 660, farina: 366, idro: 75, sale: 2.5, olio: 2, p: { hPrima: 2, hFrigo: 18, hDopo: 4 }, ta: 20, tc: 4 },
  { id: 'UI verace 912 g', ricetta: 'verace' as const, massa: 1502, farina: 912, idro: 62, sale: 2.52, olio: 0, p: { hPrima: 2, hFrigo: 7.5, hDopo: 3.8 }, ta: 20, tc: 4 },
  { id: 'UI contemp 946 g', ricetta: 'contemporanea' as const, massa: 1684, farina: 946, idro: 75.05, sale: 2.54, olio: 0, p: { hPrima: 2, hFrigo: 18, hDopo: 4 }, ta: 20, tc: 4 },
  { id: 'UI coda lunga teglia', ricetta: 'teglia' as const, massa: 900, farina: 500, idro: 80, sale: 2.2, olio: 1, p: { hPrima: 8, hFrigo: 20, hDopo: 4 }, ta: 23, tc: 2 },
  { id: 'UI coda lunga contemp', ricetta: 'contemporanea' as const, massa: 1680, farina: 950, idro: 80, sale: 2.2, olio: 1, p: { hPrima: 4, hFrigo: 18, hDopo: 2 }, ta: 23, tc: 4 },
  { id: 'UI coda lunga verace', ricetta: 'verace' as const, massa: 1500, farina: 900, idro: 66, sale: 2.3, olio: 0, p: { hPrima: 4, hFrigo: 20, hDopo: 3 }, ta: 23, tc: 4 },
];

const F: Fascia[] = FASCE.slice();
for (const caso of CASI) {
  const r = calcolaMiniRicetta({ ricetta: caso.ricetta, ...caso.p, ta: caso.ta, tc: caso.tc, t0: 21, idro: caso.idro, sale: caso.sale, olio: caso.olio, massa: caso.massa, farina: caso.farina });
  const b = F.indexOf(r.fasciaLievito);
  const [lo, hi] = intervalloDose(caso.ricetta, b, r.fattoreDose);
  const dentro = r.w >= r.fasciaEffettiva[0] && r.w <= r.fasciaEffettiva[1];
  console.log(
    `${caso.id}: iFerm ${r.iFerm.toFixed(2)} · iMat ${r.iMat.toFixed(2)} · W ${r.w} in ${r.fasciaEffettiva.join('–')} ${dentro ? 'ok' : 'FUORI'} · ${r.fasciaLievito} · ${r.doseGkg.toFixed(2)} g/kg [${lo}–${hi}] · ${r.lievitoG.toFixed(2)} g · k ${r.fattoreDose.toFixed(3)}`,
  );
}
