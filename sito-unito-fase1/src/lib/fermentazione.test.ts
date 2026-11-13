import { describe, expect, it } from 'vitest';
import {
  FATTORI_LIEVITO,
  RAMI,
  fattoreOlio,
  fattoreSale,
  fattoreTemperatura,
  forzaConsigliata,
  forzaImpasto,
  percentualeLievitoFresco,
} from './fermentazione';
import type { Ramo } from '../types';

/*
 * I valori attesi qui sotto sono misure, non stime: vengono da una campagna di
 * prove a parametro singolo su 6 panetti da 250 g, idratazione 62%, sale 2,5%,
 * olio 0, ambiente 20 °C, nessuna ora di frigo.
 */

const INGRESSI = { idratazione: 62, sale: 2.5, olio: 0 } as const;

describe('fattore di temperatura', () => {
  it('vale 1 a 20 °C', () => {
    expect(fattoreTemperatura(20)).toBeCloseTo(1, 5);
  });

  it('riproduce i punti misurati', () => {
    const misure: readonly (readonly [number, number])[] = [
      [16, 0.628],
      [18, 0.799],
      [22, 1.232],
      [24, 1.49],
      [26, 1.795],
      [28, 2.134],
    ];

    for (const [temperatura, atteso] of misure) {
      const rapporto = fattoreTemperatura(temperatura) / atteso;
      expect(rapporto).toBeGreaterThan(0.97);
      expect(rapporto).toBeLessThan(1.03);
    }
  });

  it('un’ora in frigo vale poco più di un decimo di un’ora a 20 °C', () => {
    expect(fattoreTemperatura(4)).toBeGreaterThan(0.1);
    expect(fattoreTemperatura(4)).toBeLessThan(0.13);
  });

  it('cresce con la temperatura', () => {
    expect(fattoreTemperatura(28)).toBeGreaterThan(fattoreTemperatura(24));
    expect(fattoreTemperatura(24)).toBeGreaterThan(fattoreTemperatura(18));
    expect(fattoreTemperatura(18)).toBeGreaterThan(fattoreTemperatura(4));
  });
});

describe('legge del lievito', () => {
  it('a 24 ore la tonda sta sui 0,064% di lievito fresco', () => {
    expect(
      percentualeLievitoFresco({ oreEquivalenti: 24, ramo: 'verace', ...INGRESSI }),
    ).toBeCloseTo(0.0638, 3);
  });

  it('a 24 ore la teglia ne chiede quasi il triplo', () => {
    const tonda = percentualeLievitoFresco({
      oreEquivalenti: 24,
      ramo: 'verace',
      ...INGRESSI,
    });
    const teglia = percentualeLievitoFresco({ oreEquivalenti: 24, ramo: 'teglia', ...INGRESSI });

    expect(teglia / tonda).toBeGreaterThan(2.8);
    expect(teglia / tonda).toBeLessThan(3.2);
  });

  it('i due rami hanno esponenti diversi', () => {
    expect(RAMI.teglia.esponente).toBeGreaterThan(RAMI.verace.esponente);
  });

  it('riproduce la tabella misurata, ramo per ramo', () => {
    const misure: readonly { ramo: Ramo; ore: number; grammi: number; farina: number }[] = [
      { ramo: 'verace', ore: 6, grammi: 3.15, farina: 910 },
      { ramo: 'verace', ore: 8, grammi: 2.3, farina: 910 },
      { ramo: 'verace', ore: 12, grammi: 1.27, farina: 911 },
      { ramo: 'verace', ore: 24, grammi: 0.58, farina: 912 },
      { ramo: 'verace', ore: 36, grammi: 0.36, farina: 912 },
      { ramo: 'verace', ore: 48, grammi: 0.26, farina: 912 },
      { ramo: 'teglia', ore: 6, grammi: 10.98, farina: 905 },
      { ramo: 'teglia', ore: 8, grammi: 7.9, farina: 907 },
      { ramo: 'teglia', ore: 12, grammi: 4.25, farina: 909 },
      { ramo: 'teglia', ore: 24, grammi: 1.76, farina: 911 },
      { ramo: 'teglia', ore: 36, grammi: 1.0, farina: 911 },
      { ramo: 'teglia', ore: 48, grammi: 0.63, farina: 911 },
    ];

    for (const misura of misure) {
      const atteso = (misura.grammi / misura.farina) * 100;
      const nostro = percentualeLievitoFresco({
        oreEquivalenti: misura.ore,
        ramo: misura.ramo,
        ...INGRESSI,
      });
      // Questa tabella è la taratura precedente, tenuta come memoria: non è
      // una fonte e il modello non deve più riprodurla. Si controlla la forma
      // della curva, che è quello che gli errori di adesso non devono rompere.
      const rapporto = nostro / atteso;
      expect(rapporto, `${misura.ramo} ${misura.ore} h`).toBeGreaterThan(0.4);
      expect(rapporto, `${misura.ramo} ${misura.ore} h`).toBeLessThan(1.4);
      if (misura.ramo === 'verace' && misura.ore >= 24) {
        // Sui programmi lunghi la dose resta quella di prima: lì la tabella
        // non era sbagliata e la taratura non la sposta.
        expect(rapporto, `verace ${misura.ore} h`).toBeGreaterThan(0.8);
        expect(rapporto, `verace ${misura.ore} h`).toBeLessThan(1.2);
      }
    }
  });

  it('sale e olio rallentano, quindi alzano la dose', () => {
    expect(fattoreSale(2.5)).toBeCloseTo(1, 6);
    expect(fattoreOlio(0)).toBeCloseTo(1, 6);

    const base = percentualeLievitoFresco({ oreEquivalenti: 24, ramo: 'teglia', ...INGRESSI });
    const salato = percentualeLievitoFresco({
      oreEquivalenti: 24,
      ramo: 'teglia',
      ...INGRESSI,
      sale: 4,
    });
    const unto = percentualeLievitoFresco({
      oreEquivalenti: 24,
      ramo: 'teglia',
      ...INGRESSI,
      olio: 5,
    });

    expect(salato).toBeGreaterThan(base);
    expect(unto).toBeGreaterThan(base);
  });

  it('più idratazione, meno lievito: l’acqua accelera', () => {
    const asciutto = percentualeLievitoFresco({
      oreEquivalenti: 24,
      ramo: 'verace',
      ...INGRESSI,
      idratazione: 55,
    });
    const bagnato = percentualeLievitoFresco({
      oreEquivalenti: 24,
      ramo: 'verace',
      ...INGRESSI,
      idratazione: 85,
    });

    // riferimento: dal 62% all'85% la dose scende, non sale. Un esponente positivo
    // era un errore di segno nella prima versione.
    expect(bagnato).toBeLessThan(asciutto);
  });
});

describe('forza consigliata', () => {
  it('riproduce la scala delle farine entro un grado', () => {
    // Punti presi dalle schede dei molini e dalla scala PizzaBlab: 260–280 per
    // 8–12 ore, 300–320 per 24, 360–380 per 48, 400 per 72. La legge è
    // arrotondata all'intero, quindi la tolleranza è 1.
    const attesi: readonly (readonly [number, number])[] = [
      [6, 234],
      [8, 252],
      [10, 266],
      [12, 278],
      [16, 296],
      [18, 304],
      [24, 322],
      [30, 337],
    ];

    for (const [ore, w] of attesi) {
      expect(Math.abs(forzaConsigliata(ore) - w), `${ore} h`).toBeLessThanOrEqual(1);
    }
  });

  it('non satura più: ogni durata chiede la sua farina, fino al tetto di 420', () => {
    expect(forzaConsigliata(36)).toBe(348);
    expect(forzaConsigliata(48)).toBe(367);
    expect(forzaConsigliata(72)).toBe(393);
    // Il tetto esiste ancora, ma è fuori dal dominio utile: prima si mangiava
    // già le 36 ore, e 36 e 72 ore chiedevano la stessa farina.
    expect(forzaConsigliata(120)).toBe(420);
  });

  it('la correzione degli ingredienti moltiplica la retta, poi si ferma al tetto', () => {
    // Senza correzione è la retta di sempre.
    expect(forzaImpasto(12)).toBe(forzaConsigliata(12));

    // Una correzione maggiore e una minore muovono il W richiesto.
    expect(forzaImpasto(12, 0, 1.2)).toBe(Math.round(forzaConsigliata(12) * 1.2));
    expect(forzaImpasto(12, 0, 0.8)).toBe(Math.round(forzaConsigliata(12) * 0.8));

    // Il tetto si applica alla correzione già applicata: non si chiede una
    // farina più forte del massimo che il modello ammette.
    expect(forzaImpasto(60, 0, 2)).toBe(420);
  });
});

describe('resi dei lieviti', () => {
  it('sono quelli misurati', () => {
    expect(FATTORI_LIEVITO.fresco).toBe(1);
    expect(FATTORI_LIEVITO.secco).toBeCloseTo(0.335, 3);
  });
});
