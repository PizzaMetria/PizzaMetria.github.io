import { describe, expect, it } from 'vitest';
import { risolviTema, temaOpposto } from './tema';

describe('tema dell’interfaccia', () => {
  it('rispetta la scelta salvata, anche quando il sistema preferisce altro', () => {
    expect(risolviTema('chiaro', false)).toBe('chiaro');
    expect(risolviTema('scuro', true)).toBe('scuro');
  });

  it('usa la preferenza di sistema quando non c’è una scelta', () => {
    expect(risolviTema(null, true)).toBe('chiaro');
    expect(risolviTema(null, false)).toBe('scuro');
  });

  it('ignora valori salvati non validi', () => {
    expect(risolviTema('arancio', false)).toBe('scuro');
    expect(risolviTema('', true)).toBe('chiaro');
    expect(risolviTema(undefined, false)).toBe('scuro');
  });

  it('alterna i due temi', () => {
    expect(temaOpposto('chiaro')).toBe('scuro');
    expect(temaOpposto('scuro')).toBe('chiaro');
  });
});
