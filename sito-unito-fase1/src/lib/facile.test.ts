import { describe, expect, it } from 'vitest';
import { MIN_DOPO, MIN_PRIMA, ripartizioneFacile } from './facile';

describe('ripartizione della modalità facile', () => {
  it('divide a metà le ore fuori frigo quando ce n’è abbastanza', () => {
    // 24 ore: 7 fuori frigo si dividono 3,5 e 3,5, il resto in frigo.
    expect(ripartizioneFacile(24)).toEqual({
      conFrigo: true,
      oreFrigo: 17,
      orePrima: 3.5,
      oreDopo: 3.5,
    });
  });

  it('rispetta i due minimi sui tempi corti', () => {
    // 12 ore: 4 fuori frigo, ma l’appretto non scende sotto le 3 ore.
    const rip = ripartizioneFacile(12);
    expect(rip.conFrigo).toBe(true);
    expect(rip.oreFrigo).toBe(8);
    expect(rip.orePrima).toBe(1);
    expect(rip.oreDopo).toBe(3);
  });

  it('non usa il frigo quando resterebbe troppo poco', () => {
    expect(ripartizioneFacile(8)).toEqual({
      conFrigo: false,
      oreFrigo: 0,
      orePrima: 0,
      oreDopo: 8,
    });
    expect(ripartizioneFacile(16, false).conFrigo).toBe(false);
  });

  it('non supera le 8 ore fuori frigo nemmeno sulle maturazioni lunghe', () => {
    const rip = ripartizioneFacile(48);
    expect(rip.oreFrigo).toBe(40);
    expect(rip.orePrima + rip.oreDopo).toBe(8);
  });

  it('somma sempre al tempo a disposizione', () => {
    for (let ore = 1; ore <= 120; ore += 0.5) {
      const rip = ripartizioneFacile(ore);
      expect(rip.oreFrigo + rip.orePrima + rip.oreDopo).toBeCloseTo(Math.round(ore * 2) / 2, 6);
      if (rip.conFrigo) {
        expect(rip.orePrima).toBeGreaterThanOrEqual(MIN_PRIMA);
        expect(rip.oreDopo).toBeGreaterThanOrEqual(MIN_DOPO);
      }
    }
  });
});
