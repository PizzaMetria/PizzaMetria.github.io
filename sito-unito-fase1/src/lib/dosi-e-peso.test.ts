/*
 * QUATTRO DIFETTI, QUATTRO PROVE
 * ------------------------------
 * 1. Il peso obiettivo si raggiunge anche col lievito secco: il lievito nel
 *    denominatore deve essere quello **scelto**, non sempre il fresco.
 * 2. Una dose sotto il centesimo di grammo si legge «< 0,01»: la dose esatta
 *    arriva intatta fino alla formattazione.
 * 3. Il peso del pezzo è quello che si forma, non il totale diviso per i pezzi
 *    (che si porta dentro la farina avanzata).
 * 4. Il W del mix non si calcola se una farina usata non ha il W: niente media
 *    sulla parte nota spacciata per il mix intero.
 */
import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import { grammiLievito } from './numeri';
import type { Farina, InputCalcolo, TipoLievito } from '../types';

function base(tipoLievito: TipoLievito = 'fresco'): InputCalcolo {
  return {
    tipo: 'teglia',
    ramo: 'teglia',
    idratazione: 75,
    sale: 2.5,
    olio: 2,
    malto: 1,
    tipoLievito,
    farine: [
      { quota: 100, w: 300 },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'panetti',
    numeroPanetti: 1,
    pesoPanettoG: 660,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 2, oreTaDopo: 4, ta: 20, tc: 4 },
    staglio: 'prima',
    modello: 'termico',
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 0,
    correzioneLievito: 0,
  };
}

describe('bilancio di massa', () => {
  it('la teglia da 660 g chiude a 660 con il fresco e con il secco', () => {
    const fresco = calcola(base('fresco'));
    const secco = calcola(base('secco'));

    expect(fresco.pesoImpastoG).toBeCloseTo(660, 6);
    expect(secco.pesoImpastoG).toBeCloseTo(660, 6);
    // Col secco la farina sale di poco: il lievito pesa un terzo, quindi resta
    // più spazio per la farina a parità di peso totale.
    expect(secco.farinaG).toBeGreaterThan(fresco.farinaG);
    expect(secco.lievitoG).toBeLessThan(fresco.lievitoG);
    // Il rapporto è un terzo circa: non esatto, perché col secco cambia anche
    // la farina di un decimo di punto.
    expect(secco.lievitoG / fresco.lievitoG).toBeCloseTo(0.335, 2);
  });

  it('anche i panetti chiudono al peso chiesto, col fresco e col secco', () => {
    for (const tipoLievito of ['fresco', 'secco'] as TipoLievito[]) {
      const r = calcola({
        ...base(tipoLievito),
        tipo: 'verace',
        ramo: 'verace',
        modalita: 'panetti',
        numeroPanetti: 6,
        pesoPanettoG: 250,
      });
      expect(r.pesoImpastoG).toBeCloseTo(1500, 6);
      // Ogni panetto è quello chiesto, non la media col residuo.
      expect(r.pesoPerPezzoG).toBeCloseTo(250, 6);
    }
  });
});

describe('dosi piccole', () => {
  it('una dose sotto il centesimo si legge «< 0,01», non zero', () => {
    // 100 g di farina, secco, 72 ore: la dose scende sotto i 5 milligrammi.
    const r = calcola({
      ...base('secco'),
      tipo: 'verace',
      ramo: 'verace',
      modalita: 'farina',
      numeroPanetti: null,
      pesoPanettoG: null,
      farinaG: 0.1,
      tempi: { oreTotali: 72, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 72, ta: 30, tc: 4 },
    });

    expect(r.lievitoG).toBeGreaterThan(0);
    expect(r.lievitoG).toBeLessThan(0.01);
    expect(grammiLievito(r.lievitoG)).toBe('< 0,01');
  });
});

describe('peso del pezzo con la farina che avanza', () => {
  it('resta il panetto chiesto, non il totale diviso per i pezzi', () => {
    const r = calcola({
      ...base(),
      tipo: 'verace',
      ramo: 'verace',
      modalita: 'farina',
      numeroPanetti: 6,
      pesoPanettoG: 250,
      farinaG: 1.2,
    });

    expect(r.residuoG).not.toBeNull();
    expect(r.residuoG!).toBeGreaterThan(0);
    // Con il residuo dentro, totale/pezzi sarebbe più grande di 250.
    expect(r.pesoPerPezzoG).toBeCloseTo(250, 6);
  });
});

describe('W del mix', () => {
  const mix = (farine: Farina[]): InputCalcolo => ({ ...base(), farine });

  it('con una farina senza W non è calcolabile, e lo dice', () => {
    const r = calcola(mix([{ quota: 1, w: 300 }, { quota: 99, w: null }, { quota: 0, w: null }]));

    expect(r.wEquivalente).toBeNull();
    expect(r.wEfficace).toBeNull();
    expect(r.giudizioForza).toBeNull();
    expect(r.wIncompleto).toBe(true);
  });

  it('con tutte le quote coperte torna a calcolarlo', () => {
    const r = calcola(mix([{ quota: 60, w: 300 }, { quota: 40, w: 240 }, { quota: 0, w: null }]));

    expect(r.wIncompleto).toBe(false);
    expect(r.wEquivalente).not.toBeNull();
    expect(r.wEfficace).not.toBeNull();
    expect(r.giudizioForza).not.toBeNull();
  });

  it('una riga a quota zero senza W non blocca il conto', () => {
    const r = calcola(mix([{ quota: 100, w: 300 }, { quota: 0, w: null }, { quota: 0, w: null }]));

    expect(r.wIncompleto).toBe(false);
    expect(r.wEfficace).toBeCloseTo(300, 6);
  });
});
