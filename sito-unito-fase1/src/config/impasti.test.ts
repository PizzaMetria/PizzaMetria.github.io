import { describe, expect, it } from 'vitest';
import { IMPASTI, LIMITI, problemaOreTotali } from './impasti';

/*
 * Il committente ha deciso che una ricetta sotto le quattro ore non ha senso:
 * il limite vale per tutti e tre gli impasti diretti e per tutti i motori,
 * perché sta nella validazione, non nelle formule.
 */
describe('le quattro ore minime', () => {
  it('sotto le quattro ore il calcolo si ferma', () => {
    expect(problemaOreTotali(3.9)).toContain('4 ore');
    expect(problemaOreTotali(0.5)).toContain('4 ore');
  });

  it('da quattro ore in su non c’è nessun avviso', () => {
    expect(problemaOreTotali(4)).toBeNull();
    expect(problemaOreTotali(24)).toBeNull();
    expect(problemaOreTotali(72)).toBeNull();
  });

  it('oltre i tre giorni avvisa invece di calcolare', () => {
    expect(problemaOreTotali(73)).toContain('72 ore');
  });

  it('vale per i tre impasti diretti, senza eccezioni per stile', () => {
    expect(IMPASTI.map((impasto) => impasto.id).sort()).toEqual([
      'contemporanea',
      'teglia',
      'verace',
    ]);
    // La regola non prende l'impasto come parametro: se un giorno servisse un
    // minimo diverso per uno stile, questo test non compilerebbe più.
    expect(problemaOreTotali.length).toBe(1);
    expect(LIMITI.oreTotali.min).toBe(4);
  });
});
