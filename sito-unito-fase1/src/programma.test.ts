import { describe, expect, it } from 'vitest';
import { eNotte, orarioBreve } from './App';

/*
 * La segnalazione notturna del Programma: fra mezzanotte e le 7 il sito lo
 * dice, senza cambiare niente da solo.
 */
describe('programma in orologio', () => {
  it('segna come notte le ore prima delle 7 e non le altre', () => {
    expect(eNotte(new Date(2026, 0, 3, 2, 0))).toBe(true);
    expect(eNotte(new Date(2026, 0, 3, 4, 30))).toBe(true);
    expect(eNotte(new Date(2026, 0, 3, 7, 0))).toBe(false);
    expect(eNotte(new Date(2026, 0, 3, 21, 0))).toBe(false);
  });

  it('scrive giorno corto e ora a due cifre', () => {
    // 3 gennaio 2026 è un sabato.
    expect(orarioBreve(new Date(2026, 0, 3, 2, 0))).toBe('sab 02:00');
    expect(orarioBreve(new Date(2026, 0, 3, 21, 5))).toBe('sab 21:05');
  });
});
