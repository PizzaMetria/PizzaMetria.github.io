import { describe, expect, it } from 'vitest';
import { SOGLIE, calcolaMiniRicetta } from './miniricette';
import type { Ramo } from '../types';

/**
 * Sotto le 4 ore equivalenti il motore predefinito restituiva il pavimento di
 * 0,1 g/kg: i pesi di fusione andavano tutti a zero, la dose diventava 0 e il
 * taglio la fermava. Il risultato era che a 2 ore si metteva meno lievito che
 * a 4, contro la fisica e contro le ricette.
 *
 * Questi test tengono ferma la proprietà che deve valere sempre: meno tempo,
 * mai meno lievito. Se un giorno si cambiano le ancore o le soglie, qui si
 * rompe qualcosa prima che lo faccia l'utente.
 */
const RAMI: readonly Ramo[] = ['verace', 'contemporanea', 'teglia'];

function dose(ricetta: Ramo, ore: number): number {
  return calcolaMiniRicetta({
    ricetta,
    hPrima: ore,
    hFrigo: 0,
    hDopo: 0,
    ta: 20,
    tc: 4,
    t0: 20,
    idro: ricetta === 'verace' ? 62 : ricetta === 'contemporanea' ? 75 : 80,
    sale: 2.5,
    olio: ricetta === 'teglia' ? 2 : 0,
    massa: ricetta === 'teglia' ? 660 : 250,
  }).doseGkg;
}

describe('dose sui programmi molto brevi', () => {
  it('non risale mai quando il tempo scende', () => {
    const ore = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 12, 18, 24, 36, 48, 72];

    for (const ricetta of RAMI) {
      let precedente = Number.POSITIVE_INFINITY;
      for (const h of ore) {
        const valore = dose(ricetta, h);
        expect(
          valore,
          `${ricetta} a ${h} h: ${valore.toFixed(2)} g/kg dopo ${precedente.toFixed(2)}`,
        ).toBeLessThanOrEqual(precedente + 1e-9);
        precedente = valore;
      }
    }
  });

  it('sotto la prima soglia non finisce sul pavimento di 0,1 g/kg', () => {
    for (const ricetta of RAMI) {
      for (const h of [0.5, 1, 2, 2.5, 3, 3.9]) {
        expect(dose(ricetta, h), `${ricetta} a ${h} h`).toBeGreaterThan(0.2);
      }
    }
  });

  it('a metà della prima soglia chiede più lievito che alla soglia intera', () => {
    for (const ricetta of RAMI) {
      expect(dose(ricetta, SOGLIE[0] / 2)).toBeGreaterThan(dose(ricetta, SOGLIE[0]));
    }
  });

  it('resta dentro il tetto dichiarato della scheda', () => {
    for (const ricetta of RAMI) {
      for (const h of [0.5, 1, 2]) {
        expect(dose(ricetta, h), `${ricetta} a ${h} h`).toBeLessThanOrEqual(30);
      }
    }
  });
});
