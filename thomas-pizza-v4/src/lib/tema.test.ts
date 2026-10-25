import { describe, expect, it } from 'vitest';
import { TEMA_PREDEFINITO, risolviTema, temaOpposto } from './tema';

describe('tema dell’interfaccia', () => {
  it('apre in modalità scura al primo accesso', () => {
    expect(TEMA_PREDEFINITO).toBe('scuro');
    expect(risolviTema(null)).toBe('scuro');
    expect(risolviTema(undefined)).toBe('scuro');
    expect(risolviTema('')).toBe('scuro');
  });

  it('rispetta la scelta salvata dall’utente', () => {
    expect(risolviTema('chiaro')).toBe('chiaro');
    expect(risolviTema('scuro')).toBe('scuro');
  });

  it('ignora valori salvati non validi', () => {
    expect(risolviTema('arancio')).toBe('scuro');
    expect(risolviTema('light')).toBe('scuro');
  });

  it('alterna i due temi', () => {
    expect(temaOpposto('chiaro')).toBe('scuro');
    expect(temaOpposto('scuro')).toBe('chiaro');
  });
});
