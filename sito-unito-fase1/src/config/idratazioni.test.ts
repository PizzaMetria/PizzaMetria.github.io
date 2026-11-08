import { describe, expect, it } from 'vitest';
import {
  ID_BIGA,
  avvisoAttivo,
  avvisoIdratazione,
  elencoRange,
  rangeSicuro,
  testoSicurezza,
} from './idratazioni';
import { IMPASTI } from './impasti';
import { RICETTE } from '../vecchio/config/ricette';

/*
 * La regola è una sola: l'intervallo sicuro deve contenere SEMPRE il valore di
 * default della ricetta. I default non sono scritti a mano qui: si leggono dai
 * due file di configurazione, così se domani cambia un default il test lo vede
 * subito invece di lasciar passare un avviso sul valore di partenza.
 */
const DEFAULTS: Record<string, number> = {
  ...Object.fromEntries(IMPASTI.map((impasto) => [impasto.id, impasto.idratazione])),
  ...Object.fromEntries(
    RICETTE.map((ricetta) => [ricetta.id, Math.round(ricetta.idratazioneTotale * 100)]),
  ),
  [ID_BIGA]: 55,
};

const TUTTE = Object.keys(DEFAULTS);

describe('intervalli di idratazione sicura', () => {
  it('copre tutte e otto le voci del sito', () => {
    expect(elencoRange().map((voce) => voce.id).sort()).toEqual([...TUTTE].sort());
    expect(TUTTE).toHaveLength(8);
  });

  it('nessun default cade fuori dall’intervallo', () => {
    for (const id of TUTTE) {
      const range = rangeSicuro(id);
      expect(range, id).not.toBeNull();
      expect(DEFAULTS[id], id).toBeGreaterThanOrEqual(range!.min);
      expect(DEFAULTS[id], id).toBeLessThanOrEqual(range!.max);
    }
  });

  it('nessun default fa scattare l’avviso', () => {
    for (const id of TUTTE) {
      expect(avvisoIdratazione(id, DEFAULTS[id]), id).toBeNull();
    }
  });

  it('avvisa solo sulle tre dirette', () => {
    expect(avvisoAttivo('verace')).toBe(true);
    expect(avvisoAttivo('contemporanea')).toBe(true);
    expect(avvisoAttivo('teglia')).toBe(true);
    for (const ricetta of RICETTE) {
      expect(avvisoAttivo(ricetta.id), ricetta.id).toBe(false);
    }
    expect(avvisoAttivo(ID_BIGA)).toBe(false);
  });

  it('le ricette di casa non avvisano nemmeno molto fuori range', () => {
    for (const ricetta of RICETTE) {
      expect(avvisoIdratazione(ricetta.id, 100), ricetta.id).toBeNull();
      expect(avvisoIdratazione(ricetta.id, 40), ricetta.id).toBeNull();
    }
    expect(avvisoIdratazione(ID_BIGA, 90)).toBeNull();
  });

  it('la teglia con biga ha il tetto sopra il proprio default', () => {
    const range = rangeSicuro('pizza-teglia-biga-85')!;
    expect(range).toEqual({ min: 70, max: 88 });
    expect(DEFAULTS['pizza-teglia-biga-85']).toBeLessThan(range.max);
  });

  it('sulle dirette non avvisa sui confini e avvisa appena fuori', () => {
    for (const id of ['verace', 'contemporanea', 'teglia']) {
      const range = rangeSicuro(id)!;
      expect(avvisoIdratazione(id, range.min), id).toBeNull();
      expect(avvisoIdratazione(id, range.max), id).toBeNull();
      expect(avvisoIdratazione(id, range.max + 1), id).not.toBeNull();
      expect(avvisoIdratazione(id, range.min - 1), id).not.toBeNull();
    }

    const alto = avvisoIdratazione('verace', 66);
    expect(alto?.testo).toContain('Idratazione superiore all’intervallo consigliato per la Verace');
    expect(alto?.range).toEqual({ min: 58, max: 65 });

    const basso = avvisoIdratazione('verace', 57);
    expect(basso?.testo).toContain('Idratazione inferiore all’intervallo consigliato per la Verace');
  });

  it('non avvisa se l’idratazione non è un numero o la voce è sconosciuta', () => {
    expect(avvisoIdratazione('verace', null)).toBeNull();
    expect(avvisoIdratazione('verace', undefined)).toBeNull();
    expect(avvisoIdratazione('verace', Number.NaN)).toBeNull();
    expect(avvisoIdratazione('ricetta-inesistente', 90)).toBeNull();
    expect(rangeSicuro('ricetta-inesistente')).toBeNull();
    expect(testoSicurezza('ricetta-inesistente')).toBeNull();
    expect(avvisoAttivo('ricetta-inesistente')).toBe(false);
  });

  it('scrive l’intervallo consigliato in italiano', () => {
    expect(testoSicurezza('contemporanea')).toBe('Intervallo consigliato: 65–78%.');
  });
});
