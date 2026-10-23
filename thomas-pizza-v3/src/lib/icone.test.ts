import { describe, expect, it } from 'vitest';
import type { TipoIngrediente } from '../types';
import {
  LATO_ICONA,
  contorniIcona,
  disegnaIcona,
  percorsoPolilinea,
} from './icone';

const TIPI: TipoIngrediente[] = [
  'farina',
  'acqua',
  'lievito',
  'malto',
  'sale',
  'olio',
  'miele',
];

describe('icone degli ingredienti', () => {
  it('disegna qualcosa per ogni tipo di ingrediente', () => {
    for (const tipo of TIPI) {
      const { polilinee, cerchi } = contorniIcona(tipo);
      expect(polilinee.length + cerchi.length).toBeGreaterThan(0);
      for (const polilinea of polilinee) {
        expect(polilinea.punti.length).toBeGreaterThan(1);
      }
    }
  });

  it('resta dentro la griglia 24 × 24', () => {
    for (const tipo of TIPI) {
      const { polilinee, cerchi } = contorniIcona(tipo);

      for (const { punti } of polilinee) {
        for (const punto of punti) {
          expect(punto.x).toBeGreaterThanOrEqual(0);
          expect(punto.x).toBeLessThanOrEqual(LATO_ICONA);
          expect(punto.y).toBeGreaterThanOrEqual(0);
          expect(punto.y).toBeLessThanOrEqual(LATO_ICONA);
        }
      }

      for (const cerchio of cerchi) {
        expect(cerchio.cx - cerchio.r).toBeGreaterThanOrEqual(0);
        expect(cerchio.cx + cerchio.r).toBeLessThanOrEqual(LATO_ICONA);
        expect(cerchio.cy - cerchio.r).toBeGreaterThanOrEqual(0);
        expect(cerchio.cy + cerchio.r).toBeLessThanOrEqual(LATO_ICONA);
      }
    }
  });

  it('legge anche i tratti orizzontali e verticali', () => {
    const { polilinee, cerchi } = contorniIcona('olio');
    expect(cerchi).toHaveLength(0);
    const collo = polilinee[1].punti;
    expect(collo).toHaveLength(2);
    expect(collo[0].y).toBeCloseTo(6.9, 2);
    expect(collo[1].x).toBeCloseTo(14, 2);
  });

  it('converte le curve in un contorno continuo', () => {
    const { polilinee } = contorniIcona('acqua');
    expect(polilinee).toHaveLength(1);
    expect(polilinee[0].chiusa).toBe(true);
    // 2 curve cubiche + tratti iniziali: molti punti, tutti distinti.
    expect(polilinee[0].punti.length).toBeGreaterThan(20);
  });

  it('genera un percorso SVG valido e chiude le forme', () => {
    const { polilinee } = contorniIcona('sale');
    const percorso = percorsoPolilinea(polilinee[0]);
    expect(percorso).toMatch(/^M [\d.]+ [\d.]+ L /);
    expect(percorso.endsWith(' Z')).toBe(true);
  });

  it('passa i contorni agli strumenti di disegno', () => {
    const chiamate: string[] = [];
    disegnaIcona('lievito', {
      polilinea: () => chiamate.push('polilinea'),
      cerchio: () => chiamate.push('cerchio'),
    });
    expect(chiamate).toEqual(['cerchio', 'cerchio', 'cerchio', 'cerchio']);

    const tracce: string[] = [];
    disegnaIcona('acqua', {
      polilinea: () => tracce.push('polilinea'),
      cerchio: () => tracce.push('cerchio'),
    });
    expect(tracce).toEqual(['polilinea']);
  });
});
