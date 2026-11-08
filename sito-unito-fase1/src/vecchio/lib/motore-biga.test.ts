import { describe, expect, it } from 'vitest';
import {
  FRIGO,
  OLTRE_MODELLO,
  correzioneFreddo,
  finestra,
  finestraPro,
  idrPerDurata,
  maturazione,
  oltreModello,
  oreDecimali,
  pesoFrigo,
  piano,
} from './motore-biga';

describe('motore della biga: le misure dell’app di riferimento', () => {
  // I quattro punti della versione in uso, con il margine dichiarato di 8 minuti.
  it.each([
    [16, 50, 18, 1],
    [16, 42, 21, 41],
    [20, 41, 17, 54],
    [12, 56, 22, 1],
  ])('a %s °C e %s %% la biga matura in %s h %s min', (T, idr, ore, minuti) => {
    const m = maturazione(T, idr);
    // Scarto dichiarato dal motore: entro 8 minuti su questi quattro punti.
    expect(Math.abs(m.ore * 60 + m.minuti - (ore * 60 + minuti))).toBeLessThanOrEqual(8);
  });

  it('sotto i 16 °C aggiunge la correzione empirica, sopra non la tocca', () => {
    expect(correzioneFreddo(12)).toBeGreaterThan(0);
    expect(correzioneFreddo(16)).toBe(0);
    expect(correzioneFreddo(22)).toBe(0);
  });

  it('più idratazione accorcia la maturazione, più freddo la allunga', () => {
    expect(oreDecimali(60, 20)).toBeLessThan(oreDecimali(40, 20));
    expect(oreDecimali(50, 16)).toBeGreaterThan(oreDecimali(50, 22));
  });

  it('l’idratazione inversa riporta alle stesse ore', () => {
    const idr = idrPerDurata(20, 18);
    expect(oreDecimali(idr, 20)).toBeCloseTo(18, 0);
  });

  it('la finestra PRO sta dentro la finestra dell’idratazione', () => {
    const pro = finestraPro(19);
    const base = finestra(19);
    expect(pro.min).toBeLessThan(pro.max);
    // La banda ±20 % stringe il minimo; il massimo resta quello del 40 %,
    // perché a 19 °C la finestra dell'idratazione è già più corta di 19,8 h.
    expect(pro.min).toBeCloseTo(13.2, 1);
    expect(pro.max).toBeCloseTo(Math.min(base.max, 19.8), 6);
    expect(pro.max).toBeLessThanOrEqual(base.max + 1e-9);
  });

  it('sopra i 27 °C il modello si ferma invece di estrapolare', () => {
    expect(oltreModello(OLTRE_MODELLO)).toBe(false);
    expect(oltreModello(OLTRE_MODELLO + 0.1)).toBe(true);
    expect(piano({ temperatura: 28, oreTotali: 20 }).stato).toBe('oltre-modello');
  });
});

describe('motore della biga: il piano con il frigo', () => {
  it('dentro la finestra non entra il frigo', () => {
    const p = piano({ temperatura: 20, oreTotali: 18 });
    expect(p.stato).toBe('ok');
    expect(p.oreFrigo).toBe(0);
    expect(p.dentroFinestra).toBe(true);
  });

  it('oltre la finestra la biga va tutta in frigo, al 55 %', () => {
    const p = piano({ temperatura: 21, oreTotali: 24 });
    expect(p.stato).toBe('ok');
    // Nessun ibrido: 24 ore sono 24 ore di frigorifero, non una parte in
    // ambiente e il resto al freddo.
    expect(p.oreAmbiente).toBe(0);
    expect(p.oreFrigo).toBeCloseTo(24, 6);
    expect(p.idratazione).toBe(55);
    // La finestra dell'ambiente non si stampa: la riga sopra dice già
    // «24 h a 4 °C», e il numero della finestra a quel punto confondeva.
    expect(p.avviso).toBeUndefined();
  });

  it('dentro la finestra l’attesa resta tutta in ambiente', () => {
    const p = piano({ temperatura: 21, oreTotali: 16 });
    expect(p.oreAmbiente).toBeCloseTo(16, 6);
    expect(p.oreFrigo).toBe(0);
  });

  it('un’attesa corta non si può inventare', () => {
    const p = piano({ temperatura: 20, oreTotali: 3 });
    expect(p.stato).toBe('troppo-corto');
    expect(p.consiglio).toContain('troppo breve');
  });

  it('oltre il tetto del frigo dice il massimo raggiungibile', () => {
    const p = piano({ temperatura: 20, oreTotali: 72 });
    expect(p.stato).toBe('troppo-lungo');
    expect(p.oreFrigo).toBeLessThanOrEqual(FRIGO.massimoOre);
    expect(p.consiglio).toContain('Nemmeno il frigo basta');
  });

  it('la biga che passa dal frigo resta al 55 % di idratazione', () => {
    const p = piano({ temperatura: 21, oreTotali: 24 });
    expect(p.oreFrigo).toBeGreaterThan(1);
    expect(p.idratazione).toBe(55);
  });

  it('senza frigo l’idratazione segue la durata, non il 55 %', () => {
    const p = piano({ temperatura: 21, oreTotali: 16 });
    expect(p.oreFrigo).toBe(0);
    expect(p.idratazione).toBeLessThan(55);
    expect(p.idratazione).toBeGreaterThanOrEqual(40);
  });

  it('un’ora di frigo vale meno di un’ora in ambiente', () => {
    const p = piano({ temperatura: 20, temperaturaFrigo: 4, oreTotali: 24 });
    expect(p.peso).toBeCloseTo(pesoFrigo(20, 4), 6);
    expect(p.peso).toBeLessThan(1);
  });
});
