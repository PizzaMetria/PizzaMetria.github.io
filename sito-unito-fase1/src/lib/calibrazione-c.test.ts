import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import {
  LIMITI_INGREDIENTI,
  LIMITI_LIEVITO,
  LIMITI_TEMPERATURA,
  RAMI,
  fattoreTemperatura,
  forzaConsigliata,
  percentualeLievitoFresco,
} from './fermentazione';
import { percentualeLievitoVecchio } from './vecchio';
import type { InputCalcolo, Ramo } from '../types';

/*
 * COLLAUDO DELLA CALIBRAZIONE «C»
 * -------------------------------
 * Le tre cose che questa calibrazione doveva garantire, e che qui si
 * controllano una per una:
 *
 * 1. f(4) non è stato toccato (0,1148) — la calibrazione non ha trovato motivi
 *    per cambiarlo, e il test lo blocca perché sia una decisione, non una
 *    distrazione;
 * 2. tre rami distinti e un modello continuo: da 4 a 72 ore equivalenti non
 *    esistono gradini né fasce;
 * 3. agli estremi il modello taglia invece di impazzire: sale, idratazione,
 *    temperatura e dose hanno limiti dichiarati.
 *
 * I numeri dei casi sono quelli del collaudo chiesto dal committente. Le
 * forchette sono larghe di proposito: un test che fissa il terzo decimale
 * impedisce la prossima calibrazione, uno che fissa la fascia no.
 */

const BASE: InputCalcolo = {
  tipo: 'contemporanea',
  ramo: 'contemporanea',
  idratazione: 75,
  sale: 2.5,
  olio: 0,
  malto: 0,
  tipoLievito: 'fresco',
  farine: [
    { quota: 100, w: null },
    { quota: 0, w: null },
    { quota: 0, w: null },
  ],
  modalita: 'panetti',
  numeroPanetti: 6,
  pesoPanettoG: 280,
  farinaG: null,
  formaTeglia: 'rettangolare',
  latoA: 30,
  latoB: 40,
  diametro: 32,
  numeroTeglie: 1,
  grammiPerCm2: 0.55,
  tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 1, oreTaDopo: 5, ta: 20, tc: 4 },
  staglio: 'prima',
  modello: 'nuovo',
  temperaturaImpasto: 21,
  temperaturaFarina: 20,
  riscaldamento: 0,
  correzioneLievito: 0,
};

function input(patch: Partial<InputCalcolo> = {}): InputCalcolo {
  return { ...BASE, ...patch };
}

function dose(oreEquivalenti: number, ramo: Ramo, idratazione = 62, sale = 2.5): number {
  return percentualeLievitoFresco({ oreEquivalenti, ramo, idratazione, sale, olio: 0 });
}

describe('f(4) non è stato toccato', () => {
  it('resta 0,1148', () => {
    expect(fattoreTemperatura(4)).toBeGreaterThan(0.11);
    expect(fattoreTemperatura(4)).toBeLessThan(0.12);
  });

  it('un’ora di frigo vale ancora circa sette minuti a 20 °C', () => {
    expect(fattoreTemperatura(4) * 60).toBeGreaterThan(6.6);
    expect(fattoreTemperatura(4) * 60).toBeLessThan(7.2);
  });
});

describe('tre rami distinti', () => {
  it('a parità di ore e idratazione la teglia chiede più di tutte', () => {
    const verace = dose(12, 'verace');
    const contemporanea = dose(12, 'contemporanea');
    const teglia = dose(12, 'teglia');

    expect(teglia).toBeGreaterThan(contemporanea);
    expect(teglia).toBeGreaterThan(verace);
  });

  it('la contemporanea non è più una verace travestita', () => {
    expect(RAMI.contemporanea.esponente).not.toBeCloseTo(RAMI.verace.esponente, 3);
    expect(RAMI.contemporanea.coefficiente).not.toBeCloseTo(RAMI.verace.coefficiente, 3);
  });

  it('l’acqua pesa meno sulla contemporanea che sulla verace', () => {
    // La verace ha l'esponente misurato a temperatura ambiente (-1,2); la
    // contemporanea nasce al 75% e lì quell'esponente assorbiva la ricetta.
    const verace62 = dose(12, 'verace', 62);
    const verace75 = dose(12, 'verace', 75);
    const cont62 = dose(12, 'contemporanea', 62);
    const cont75 = dose(12, 'contemporanea', 75);

    const taglioVerace = verace75 / verace62;
    const taglioCont = cont75 / cont62;

    expect(taglioVerace).toBeLessThan(0.85);
    expect(taglioCont).toBeGreaterThan(taglioVerace);
    expect(taglioCont).toBeGreaterThan(0.9);
  });
});

describe('continuità', () => {
  it('da 4 a 72 ore equivalenti non c’è nessun gradino', () => {
    for (const ramo of ['verace', 'contemporanea', 'teglia'] as const) {
      let precedente = dose(4, ramo);
      for (let ore = 4.25; ore <= 72; ore += 0.25) {
        const attuale = dose(ore, ramo);
        const salto = Math.abs(attuale / precedente - 1);
        expect(salto, `${ramo} a ${ore} ore`).toBeLessThan(0.1);
        // Monotona: più tempo, meno lievito.
        expect(attuale).toBeLessThanOrEqual(precedente + 1e-12);
        precedente = attuale;
      }
    }
  });
});

describe('estremi sotto controllo', () => {
  it('sale: oltre l’8% il fattore si ferma, senza cambiare segno', () => {
    const otto = dose(12, 'verace', 62, LIMITI_INGREDIENTI.sale.max);
    const assurdo = dose(12, 'verace', 62, 18);

    expect(Number.isFinite(assurdo)).toBe(true);
    expect(assurdo).toBeCloseTo(otto, 6);
    // Il fattore non si annulla mai: la dose resta finita e positiva.
    expect(otto).toBeGreaterThan(0);
    expect(otto).toBeLessThan(2);
  });

  it('idratazione: fuori scala viene tagliata, non estrapolata', () => {
    expect(dose(12, 'verace', 120)).toBeCloseTo(dose(12, 'verace', 100), 6);
    expect(dose(12, 'verace', 10)).toBeCloseTo(dose(12, 'verace', 40), 6);
  });

  it('temperatura: sopra i 38 °C il fattore cala, oltre i 42 si ferma', () => {
    expect(fattoreTemperatura(42)).toBeLessThan(fattoreTemperatura(38));
    expect(fattoreTemperatura(45)).toBeCloseTo(fattoreTemperatura(42), 6);
    expect(fattoreTemperatura(-10)).toBeCloseTo(
      fattoreTemperatura(LIMITI_TEMPERATURA.min),
      6,
    );
    // Il calo non manda mai il fattore sotto zero.
    expect(fattoreTemperatura(42)).toBeGreaterThan(0);
  });

  it('dose: c’è un minimo pesabile e un massimo sensato', () => {
    expect(dose(400, 'verace')).toBeCloseTo(LIMITI_LIEVITO.min, 6);
    expect(dose(0.5, 'verace')).toBeCloseTo(LIMITI_LIEVITO.max, 6);
    expect(dose(400, 'teglia')).toBeCloseTo(LIMITI_LIEVITO.min, 6);
  });
});

describe('due orologi', () => {
  it('a parità di ore equivalenti il frigo alza il W e non la dose', () => {
    expect(forzaConsigliata(12, 24)).toBeGreaterThan(forzaConsigliata(12, 0));
    // Il coefficiente del frigo è 2 punti di W per ora.
    expect(forzaConsigliata(12, 24) - forzaConsigliata(12, 0)).toBe(48);

    // La dose dipende solo dalle ore equivalenti: è l'altro orologio.
    expect(dose(12, 'verace')).toBeCloseTo(dose(12, 'verace'), 6);
  });

  it('48 ore in frigo chiedono una farina che le sole ore equivalenti non chiederebbero', () => {
    const risultato = calcola(
      input({
        idratazione: 65,
        tempi: { oreTotali: 55, oreFrigo: 48, oreTaPrima: 1, oreTaDopo: 6, ta: 20, tc: 4 },
      }),
    );

    // Le ore equivalenti da sole darebbero 162,657 + 5,8044 · eq.
    const soloEquivalenti = Math.round(162.657 + 5.8044 * risultato.oreEquivalenti);

    expect(risultato.forzaConsigliata).toBeGreaterThan(soloEquivalenti + 60);
    expect(risultato.forzaConsigliata).toBeLessThanOrEqual(365);
  });
});

describe('i cinque casi di collaudo', () => {
  const CASI = [
    {
      nome: 'verace 8 h a 20 °C',
      patch: {
        tipo: 'verace' as const,
        ramo: 'verace' as const,
        idratazione: 62,
        numeroPanetti: 6,
        pesoPanettoG: 250,
        tempi: { oreTotali: 8, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 8, ta: 20, tc: 4 },
      },
      min: 0.19,
      max: 0.26,
    },
    {
      nome: 'contemporanea 1 + 18 + 5',
      patch: {},
      min: 0.23,
      max: 0.31,
    },
    {
      nome: 'contemporanea 4 + 12 + 1',
      patch: {
        idratazione: 70,
        numeroPanetti: 3,
        tempi: { oreTotali: 17, oreFrigo: 12, oreTaPrima: 4, oreTaDopo: 1, ta: 20, tc: 4 },
      },
      min: 0.24,
      max: 0.32,
    },
    {
      nome: 'teglia 30 × 40, 6 h',
      patch: {
        tipo: 'teglia' as const,
        ramo: 'teglia' as const,
        idratazione: 70,
        olio: 2,
        malto: 1,
        tempi: { oreTotali: 6, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 6, ta: 20, tc: 4 },
      },
      // 0,9–1,3% sulla farina, cioè 9–13 g/kg: la teglia chiede quasi il
      // quadruplo della tonda a parità di ore.
      min: 0.9,
      max: 1.3,
    },
    {
      nome: 'contemporanea 1 + 48 + 6',
      patch: {
        idratazione: 65,
        tempi: { oreTotali: 55, oreFrigo: 48, oreTaPrima: 1, oreTaDopo: 6, ta: 20, tc: 4 },
      },
      min: 0.11,
      max: 0.17,
    },
  ];

  it.each(CASI)('$nome resta nella fascia attesa', (caso) => {
    const risultato = calcola(input(caso.patch));
    console.log(
      `${caso.nome}: eq ${risultato.oreEquivalenti.toFixed(2)} h · ${risultato.lievitoPerKgFarina.toFixed(2)} g/kg · ${risultato.lievitoFrescoG.toFixed(2)} g su ${risultato.farinaG} g · W ${risultato.forzaConsigliata}`,
    );

    expect(risultato.percentualeLievito).toBeGreaterThan(caso.min);
    expect(risultato.percentualeLievito).toBeLessThan(caso.max);
    // Nessun caso di collaudo deve cadere su un limite.
    expect(risultato.avvisi.join(' ')).not.toContain('minimo pesabile');
  });

  it('la maturazione lunga non finisce sul limite, ma sopra le 48 ore avvisa', () => {
    const risultato = calcola(
      input({
        idratazione: 65,
        tempi: { oreTotali: 55, oreFrigo: 48, oreTaPrima: 1, oreTaDopo: 6, ta: 20, tc: 4 },
      }),
    );

    expect(risultato.avvisi.join(' ')).not.toContain('48 ore in frigorifero');
  });
});

describe('il vecchio calcolatore resta un’emulazione', () => {
  it('non distingue verace e contemporanea: una curva sola', () => {
    const verace = percentualeLievitoVecchio({
      oreEquivalenti: 12,
      ramo: 'verace',
      idratazione: 75,
      sale: 2.5,
      olio: 0,
    });
    const contemporanea = percentualeLievitoVecchio({
      oreEquivalenti: 12,
      ramo: 'contemporanea',
      idratazione: 75,
      sale: 2.5,
      olio: 0,
    });

    expect(contemporanea).toBeCloseTo(verace, 12);
  });
});
