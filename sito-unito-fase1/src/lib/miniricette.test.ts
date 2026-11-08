import { describe, expect, it } from 'vitest';
import {
  FASCE,
  RICETTE_12,
  SOGLIE,
  calcolaMiniRicetta,
  intervalloDose,
  pesiFusione,
} from './miniricette';
import type { Fascia, InputMiniRicetta } from './miniricette';
import type { Ramo } from '../types';

/*
 * REGRESSIONE DEL MODELLO A 12 MINI-RICETTE
 * -----------------------------------------
 * W e fasce vengono dai tre CSV validati (`simulazioni.csv`, `range_w.csv`,
 * `range_lievito.csv`) e non si muovono. Le dosi sono state ricalibrate dopo la
 * verifica di coerenza delle ancore: le quattro dosi di centro di una ricetta
 * ora stanno su una legge sola (esponente 1,36 / 1,20 / 1,22) e l'intervallo
 * stampato è quello della banda. Se questi numeri cambiano senza una
 * ricalibrazione dichiarata, il codice si è allontanato dal modello.
 */

interface CasoCanonico {
  id: string;
  ricetta: Ramo;
  programma: Pick<InputMiniRicetta, 'hPrima' | 'hFrigo' | 'hDopo'>;
  massa: number;
  farina: number;
  idro: number;
  sale: number;
  olio: number;
  w: number;
  fasciaEff: readonly [number, number];
  fasciaDich: readonly [number, number];
  iFerm: number;
  iMat: number;
  dose: number;
  lievito: number;
  miniW: Fascia;
  miniLievito: Fascia;
}

const CANONICI: readonly CasoCanonico[] = [
  {
    id: 'tg-breve',
    ricetta: 'teglia',
    programma: { hPrima: 6, hFrigo: 0, hDopo: 0 },
    massa: 660,
    farina: 366,
    idro: 75,
    sale: 2.5,
    olio: 2,
    w: 277,
    fasciaEff: [250, 295],
    fasciaDich: [250, 295],
    iFerm: 6.12,
    iMat: 6.12,
    dose: 7.7,
    lievito: 2.82,
    miniW: 'breve',
    miniLievito: 'breve',
  },
  {
    id: 'tg-media',
    ricetta: 'teglia',
    programma: { hPrima: 12, hFrigo: 0, hDopo: 0 },
    massa: 660,
    farina: 366,
    idro: 75,
    sale: 2.5,
    olio: 2,
    w: 291,
    fasciaEff: [275, 315],
    fasciaDich: [275, 315],
    iFerm: 12.13,
    iMat: 12.13,
    dose: 3.04,
    lievito: 1.11,
    miniW: 'media',
    miniLievito: 'media',
  },
  {
    id: 'tg-lunga',
    ricetta: 'teglia',
    programma: { hPrima: 2, hFrigo: 18, hDopo: 4 },
    massa: 660,
    farina: 366,
    idro: 75,
    sale: 2.5,
    olio: 2,
    w: 300,
    fasciaEff: [280, 320],
    fasciaDich: [280, 320],
    iFerm: 8.88,
    iMat: 17.34,
    dose: 4.64,
    lievito: 1.7,
    miniW: 'lunga',
    miniLievito: 'media',
  },
  {
    id: 'tg-molto',
    ricetta: 'teglia',
    programma: { hPrima: 1, hFrigo: 44, hDopo: 3 },
    massa: 660,
    farina: 366,
    idro: 75,
    sale: 2.5,
    olio: 2,
    w: 331,
    fasciaEff: [320, 350],
    fasciaDich: [320, 350],
    iFerm: 12.97,
    iMat: 33.65,
    dose: 2.77,
    lievito: 1.01,
    miniW: 'molto',
    miniLievito: 'media',
  },
  {
    id: 'vc-breve',
    ricetta: 'verace',
    programma: { hPrima: 6, hFrigo: 0, hDopo: 0 },
    massa: 750,
    farina: 456,
    idro: 62,
    sale: 2.6,
    olio: 0,
    w: 225,
    fasciaEff: [192, 247],
    fasciaDich: [195, 250],
    iFerm: 6.13,
    iMat: 6.13,
    dose: 2.8,
    lievito: 1.28,
    miniW: 'breve',
    miniLievito: 'breve',
  },
  {
    id: 'vc-media',
    ricetta: 'verace',
    programma: { hPrima: 12, hFrigo: 0, hDopo: 0 },
    massa: 750,
    farina: 456,
    idro: 62,
    sale: 2.6,
    olio: 0,
    w: 257,
    fasciaEff: [237, 272],
    fasciaDich: [240, 275],
    iFerm: 12.14,
    iMat: 12.14,
    dose: 1.23,
    lievito: 0.56,
    miniW: 'media',
    miniLievito: 'media',
  },
  {
    id: 'vc-lunga',
    ricetta: 'verace',
    programma: { hPrima: 4, hFrigo: 20.5, hDopo: 4.2 },
    massa: 750,
    farina: 456,
    idro: 62,
    sale: 2.6,
    olio: 0,
    w: 284,
    fasciaEff: [262, 297],
    fasciaDich: [265, 300],
    iFerm: 11.58,
    iMat: 21.22,
    dose: 1.3,
    lievito: 0.59,
    miniW: 'lunga',
    miniLievito: 'media',
  },
  {
    id: 'vc-molto',
    ricetta: 'verace',
    programma: { hPrima: 2, hFrigo: 44, hDopo: 3 },
    massa: 750,
    farina: 456,
    idro: 62,
    sale: 2.6,
    olio: 0,
    w: 304,
    fasciaEff: [292, 327],
    fasciaDich: [295, 330],
    iFerm: 13.96,
    iMat: 34.64,
    dose: 1.04,
    lievito: 0.48,
    miniW: 'molto',
    miniLievito: 'media',
  },
  {
    id: 'ct-breve',
    ricetta: 'contemporanea',
    programma: { hPrima: 6, hFrigo: 0, hDopo: 0 },
    massa: 840,
    farina: 473,
    idro: 75,
    sale: 2.4,
    olio: 1,
    w: 256,
    fasciaEff: [239, 274],
    fasciaDich: [242, 277],
    iFerm: 6.14,
    iMat: 6.14,
    dose: 3.04,
    lievito: 1.44,
    miniW: 'breve',
    miniLievito: 'breve',
  },
  {
    id: 'ct-media',
    ricetta: 'contemporanea',
    programma: { hPrima: 12, hFrigo: 0, hDopo: 0 },
    massa: 840,
    farina: 473,
    idro: 75,
    sale: 2.4,
    olio: 1,
    w: 275,
    fasciaEff: [259, 289],
    fasciaDich: [262, 292],
    iFerm: 12.15,
    iMat: 12.15,
    dose: 1.33,
    lievito: 0.63,
    miniW: 'media',
    miniLievito: 'media',
  },
  {
    id: 'ct-lunga',
    ricetta: 'contemporanea',
    programma: { hPrima: 4, hFrigo: 20.5, hDopo: 4.2 },
    massa: 840,
    farina: 473,
    idro: 75,
    sale: 2.4,
    olio: 1,
    w: 301,
    fasciaEff: [269, 309],
    fasciaDich: [272, 312],
    iFerm: 11.52,
    iMat: 21.16,
    dose: 1.42,
    lievito: 0.67,
    miniW: 'lunga',
    miniLievito: 'media',
  },
  {
    id: 'ct-molto',
    ricetta: 'contemporanea',
    programma: { hPrima: 2, hFrigo: 44, hDopo: 3 },
    massa: 840,
    farina: 473,
    idro: 75,
    sale: 2.4,
    olio: 1,
    w: 322,
    fasciaEff: [309, 339],
    fasciaDich: [312, 342],
    iFerm: 13.91,
    iMat: 34.59,
    dose: 1.12,
    lievito: 0.53,
    miniW: 'molto',
    miniLievito: 'media',
  },
];

const base = (caso: CasoCanonico): InputMiniRicetta => ({
  ricetta: caso.ricetta,
  ...caso.programma,
  ta: 20,
  tc: 4,
  t0: 21,
  idro: caso.idro,
  sale: caso.sale,
  olio: caso.olio,
  massa: caso.massa,
  farina: caso.farina,
});

/** La teglia di riferimento, con il programma che si vuole. */
function teglia(programma: Pick<InputMiniRicetta, 'hPrima' | 'hFrigo' | 'hDopo'>, patch: Partial<InputMiniRicetta> = {}) {
  return calcolaMiniRicetta({
    ricetta: 'teglia',
    ...programma,
    ta: 20,
    tc: 4,
    t0: 21,
    idro: 75,
    sale: 2.5,
    olio: 2,
    massa: 660,
    farina: 366,
    ...patch,
  });
}

/** W in funzione delle sole ore a 20 °C: serve ai test di fusione. */
function wDaOre(ore: number): number {
  return teglia({ hPrima: ore, hFrigo: 0, hDopo: 0 }).w;
}

describe('le 12 mini-ricette canoniche', () => {
  for (const caso of CANONICI) {
    it(`${caso.id}: W, fascia, indici, dose e mini-ricette dei CSV`, () => {
      const esito = calcolaMiniRicetta(base(caso));
      const etichetta = caso.id;

      expect(esito.w, etichetta).toBe(caso.w);
      expect(esito.fasciaEffettiva, etichetta).toEqual(caso.fasciaEff);
      expect(esito.fasciaDichiarata, etichetta).toEqual(caso.fasciaDich);
      expect(esito.iFerm, etichetta).toBeCloseTo(caso.iFerm, 1);
      expect(esito.iMat, etichetta).toBeCloseTo(caso.iMat, 1);
      expect(Math.round(esito.doseGkg * 100) / 100, etichetta).toBeCloseTo(caso.dose, 2);
      expect(Math.round(esito.lievitoG * 100) / 100, etichetta).toBeCloseTo(caso.lievito, 2);
      expect(esito.fasciaW, etichetta).toBe(caso.miniW);
      expect(esito.fasciaLievito, etichetta).toBe(caso.miniLievito);
      expect(esito.fuoriDominio, `${etichetta}: nessun avviso atteso`).toBe(false);
    });
  }
});

describe('caso obbligatorio: teglia 30×40, 660 g, 75%, 2+18+4', () => {
  it('dà W 300 nella fascia 280–320', () => {
    const esito = teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 });

    expect(esito.w).toBe(300);
    expect(esito.fasciaEffettiva).toEqual([280, 320]);
    expect(esito.fasciaDichiarata).toEqual([280, 320]);
    expect(esito.fasciaW).toBe('lunga');
  });

  it('legge il lievito sulla fascia media e il W sulla lunga', () => {
    const esito = teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 });

    expect(esito.iFerm).toBeCloseTo(8.88, 2);
    expect(esito.iMat).toBeCloseTo(17.34, 2);
    expect(esito.fasciaLievito).toBe('media');
    expect(esito.fasciaW).toBe('lunga');
    // La fusione sul W: quasi tutta la lunga, un pizzico di media.
    expect(Math.round(esito.pesiW[1] * 100)).toBe(5);
    expect(Math.round(esito.pesiW[2] * 100)).toBe(95);
  });

  it('dosa 4,64 g/kg, cioè 1,70 g su 366 g di farina', () => {
    const esito = teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 });

    expect(Math.round(esito.doseGkg * 100) / 100).toBe(4.64);
    expect(Math.round(esito.lievitoG * 100) / 100).toBe(1.7);
  });
});

describe('fusione morbida fra mini-ricette', () => {
  it('i pesi sommano a 1 e al massimo due fasce concorrono', () => {
    for (let x = 3.5; x <= 48.5; x += 0.25) {
      const pesi = pesiFusione(x);
      const somma = pesi.reduce((totale, peso) => totale + peso, 0);
      expect(somma).toBeCloseTo(1, 9);
      expect(pesi.filter((peso) => peso > 0).length).toBeLessThanOrEqual(2);
    }
  });

  it('sul bordo 8,13 i pesi sono 46/54', () => {
    const pesi = pesiFusione(8.13);
    expect(Math.round(pesi[0] * 100)).toBe(46);
    expect(Math.round(pesi[1] * 100)).toBe(54);
  });

  it('i bordi valgono lo stesso numero da entrambe le fasce', () => {
    expect(wDaOre(8)).toBe(285);
    expect(wDaOre(16)).toBe(296);
    expect(wDaOre(24)).toBe(320);
    expect(wDaOre(48)).toBe(348);
  });

  it('la curva è continua: nessun gradino oltre 1 W per 0,01 ore', () => {
    let precedente = wDaOre(4);
    for (let x = 4.01; x <= 48.001; x += 0.01) {
      const attuale = wDaOre(x);
      expect(Math.abs(attuale - precedente), `${x.toFixed(2)} h`).toBeLessThanOrEqual(1);
      precedente = attuale;
    }
  });

  it('la curva non torna indietro', () => {
    let precedente = wDaOre(4);
    for (let x = 4.5; x <= 48; x += 0.5) {
      const attuale = wDaOre(x);
      expect(attuale, `${x} h`).toBeGreaterThanOrEqual(precedente);
      precedente = attuale;
    }
  });

  it('fra le 8 e le 16 ore equivalenti la dose si muove senza salti', () => {
    let precedente = teglia({ hPrima: 8, hFrigo: 0, hDopo: 0 }).doseGkg;
    for (let x = 8.01; x <= 16.001; x += 0.01) {
      const attuale = teglia({ hPrima: x, hFrigo: 0, hDopo: 0 }).doseGkg;
      expect(Math.abs(attuale - precedente), `${x.toFixed(2)} h`).toBeLessThanOrEqual(0.02);
      precedente = attuale;
    }
  });
});

describe('affinamento dentro il range', () => {
  it('idratazione 60 → 90% porta la teglia lunga da 266 a 334', () => {
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { idro: 60 }).w).toBe(266);
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { idro: 90 }).w).toBe(334);
  });

  it('massa 400 → 1.320 g porta il W da 304 a 294', () => {
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { massa: 400 }).w).toBe(304);
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { massa: 1320 }).w).toBe(294);
  });

  it('cella, sale e olio spostano il punto come nei CSV', () => {
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { tc: 2 }).w).toBe(295);
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { sale: 3.5 }).w).toBe(302);
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { olio: 6 }).w).toBe(304);
  });

  it('le ore di frigo spostano la mini-ricetta selezionata', () => {
    // Programmi della serie «frigo» dei CSV: 2 ore di puntata, poi la cella.
    expect(teglia({ hPrima: 20, hFrigo: 0, hDopo: 0 }).w).toBe(308);
    expect(teglia({ hPrima: 2, hFrigo: 12, hDopo: 4 }).w).toBe(292);
    expect(teglia({ hPrima: 2, hFrigo: 24, hDopo: 4 }).w).toBe(313);
  });

  it('focaccia e pala hanno il loro fattore di formato', () => {
    expect(
      teglia({ hPrima: 1, hFrigo: 24, hDopo: 3 }, { formato: 'focaccia', idro: 80, massa: 1200 }).w,
    ).toBe(330);
    expect(teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, { formato: 'pala', idro: 70, massa: 250 }).w).toBe(
      304,
    );
  });

  it('fascia dichiarata e fascia effettiva coincidono sulla teglia e no sulla verace', () => {
    const tg = teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 });
    expect(tg.fasciaDichiarata).toEqual(tg.fasciaEffettiva);

    const vc = calcolaMiniRicetta(base(CANONICI[4]));
    expect(vc.fasciaDichiarata).toEqual([195, 250]);
    expect(vc.fasciaEffettiva).toEqual([192, 247]);
  });
});

describe('avvisi fuori dominio', () => {
  const avvisi = (patch: Partial<InputMiniRicetta>) =>
    teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 }, patch).avvisi.join(' | ');

  it('segnala l’idratazione fuori intervallo', () => {
    expect(avvisi({ idro: 95 })).toMatch(/Idratazione 95%/);
  });

  it('segnala la cella che non è fredda', () => {
    expect(avvisi({ tc: 10 })).toMatch(/Cella a 10 °C/);
  });

  it('segnala l’ambiente fuori intervallo', () => {
    expect(avvisi({ ta: 12 })).toMatch(/Ambiente a 12 °C/);
  });

  it('segnala la maturazione troppo corta', () => {
    const esito = teglia({ hPrima: 2, hFrigo: 0, hDopo: 0 });
    expect(esito.fuoriDominio).toBe(true);
    expect(esito.avvisi.join(' ')).toMatch(/3 ore equivalenti/);
  });

  it('segnala l’appretto mancante dopo il frigo', () => {
    expect(avvisi({ hPrima: 2, hFrigo: 18, hDopo: 0 })).toMatch(/risalita dopo il frigo/);
  });

  it('senza fuori dominio la lista resta vuota', () => {
    const esito = teglia({ hPrima: 2, hFrigo: 18, hDopo: 4 });
    expect(esito.avvisi).toEqual([]);
  });
});

describe('coerenza con i range dichiarati nei CSV', () => {
  it('le 12 fasce dichiarate sono quelle di range_w.csv', () => {
    expect(RICETTE_12.teglia.rangeW).toEqual([
      [250, 295],
      [275, 315],
      [280, 320],
      [320, 350],
    ]);
    expect(RICETTE_12.verace.rangeW).toEqual([
      [195, 250],
      [240, 275],
      [265, 300],
      [295, 330],
    ]);
    expect(RICETTE_12.contemporanea.rangeW).toEqual([
      [242, 277],
      [262, 292],
      [272, 312],
      [312, 342],
    ]);
  });

  it('le quattro dosi di centro stanno su una legge sola, per ogni ricetta', () => {
    for (const chiave of ['teglia', 'verace', 'contemporanea'] as const) {
      const ric = RICETTE_12[chiave];
      for (let b = 0; b < 4; b += 1) {
        const centro = Math.sqrt(SOGLIE[b] * SOGLIE[b + 1]);
        const centroBreve = Math.sqrt(SOGLIE[0] * SOGLIE[1]);
        const dallaLegge =
          ric.ancoraD[0] * Math.pow(centro / centroBreve, -ric.esponenteDose);
        // L'ancora della fascia è, a meno dell'arrotondamento, la legge
        // valutata al suo centro. Senza questo, la fusione ai bordi inventa.
        expect(dallaLegge, `${chiave} fascia ${b}`).toBeCloseTo(ric.ancoraD[b], 1);
      }
    }
  });

  it('l’intervallo di una fascia va dalla dose al bordo alto a quella al bordo basso', () => {
    for (const chiave of ['teglia', 'verace', 'contemporanea'] as const) {
      for (let b = 0; b < 4; b += 1) {
        const [lo, hi] = intervalloDose(chiave, b);
        expect(lo, `${chiave} ${b}`).toBeGreaterThan(0);
        expect(lo, `${chiave} ${b}`).toBeLessThan(hi);
      }
    }
  });

  it('la dose del caso cade sempre dentro l’intervallo della sua fascia', () => {
    for (const caso of CANONICI) {
      const esito = calcolaMiniRicetta(base(caso));
      const b = FASCE.indexOf(esito.fasciaLievito);
      const [lo, hi] = intervalloDose(caso.ricetta, b);

      expect(esito.doseGkg, caso.id).toBeGreaterThanOrEqual(lo);
      expect(esito.doseGkg, caso.id).toBeLessThanOrEqual(hi);
    }
  });

  it('le ancore della teglia sono quelle approvate, con il caso a 300 fermo', () => {
    // Correzione 3: ancora delle 24 h allineata alla fascia dichiarata (320),
    // 16 h a 296 perché il caso obbligatorio (iMat 17,34) resti a W 300.
    expect(RICETTE_12.teglia.ancoraW).toEqual([268, 285, 296, 320, 348]);
    expect(RICETTE_12.contemporanea.ancoraW).toEqual([249, 267, 288, 312, 340]);
    expect(FASCE).toEqual(['breve', 'media', 'lunga', 'molto']);
  });

  it('l’intervallo stampato segue il fattore di correzione del caso', () => {
    // Fattore 0,5 per non finire nella rarefazione dei decimi: i due estremi
    // devono dimezzarsi con il fattore applicato alla dose.
    for (const chiave of ['teglia', 'verace', 'contemporanea'] as const) {
      for (let b = 0; b < 4; b += 1) {
        const [loBase, hiBase] = intervalloDose(chiave, b);
        const [loMeta, hiMeta] = intervalloDose(chiave, b, 0.5);
        expect(loMeta, `${chiave} ${b}`).toBeLessThan(loBase);
        expect(hiMeta, `${chiave} ${b}`).toBeLessThan(hiBase);
        expect(hiMeta, `${chiave} ${b}`).toBeCloseTo(hiBase / 2, 0);
      }
    }
  });

  it('con la correzione del caso la dose resta dentro l’intervallo anche al bordo', () => {
    // Teglia alta idratazione in coda alla fascia media: prima la dose usciva
    // dall’intervallo perché l’intervallo era calcolato a idratazione di riferimento.
    const esito = teglia({ hPrima: 8, hFrigo: 8, hDopo: 4 }, { idro: 85, sale: 2.2, olio: 1 });
    const b = FASCE.indexOf(esito.fasciaLievito);
    const [lo, hi] = intervalloDose(esito.ricetta, b, esito.fattoreDose);
    expect(esito.doseGkg).toBeGreaterThanOrEqual(lo - 0.05);
    expect(esito.doseGkg).toBeLessThanOrEqual(hi + 0.05);
  });

  it('sotto le 4 ore equivalenti la dose è un minimo, non un punto della banda', () => {
    const esito = teglia({ hPrima: 0, hFrigo: 4, hDopo: 3 }, { ta: 23, tc: 2 });
    expect(esito.iFerm).toBeLessThan(SOGLIE[0]);
    const b = FASCE.indexOf(esito.fasciaLievito);
    const [, hi] = intervalloDose(esito.ricetta, b, esito.fattoreDose);
    // La scheda stampa «≥ hi»: il numero non può stare sotto il bordo alto.
    expect(esito.doseGkg).toBeGreaterThanOrEqual(hi - 0.05);
  });
});
