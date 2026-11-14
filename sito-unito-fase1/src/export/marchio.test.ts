import { describe, expect, it } from 'vitest';
import componente from '../components/Marchio.tsx?raw';
import {
  MARCHIO_CERCHI,
  MARCHIO_PIENI,
  MARCHIO_SPESSORE,
  MARCHIO_TRATTI,
  MARCHIO_VIEWBOX,
} from './marchio';

/**
 * Il marchio dei fogli è lo stesso della home: se il componente cambia, il PDF
 * e il JPG devono cambiare con lui. Questo test legge il componente vero e non
 * una copia, così la divergenza si vede subito.
 */
const percorsi = [...componente.matchAll(/d="([^"]+)"/g)].map((trovato) => trovato[1]);
const cerchi = [...componente.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"([^/>]*)\/>/g)];

describe('marchio dei fogli', () => {
  it('riporta gli stessi tracciati del componente della home', () => {
    expect(new Set(percorsi)).toEqual(new Set([...MARCHIO_PIENI, ...MARCHIO_TRATTI]));
    expect(MARCHIO_PIENI).toHaveLength(1);
    expect(MARCHIO_TRATTI).toHaveLength(2);
  });

  it('riporta gli stessi cerchi, a filo e pieni', () => {
    expect(cerchi).toHaveLength(MARCHIO_CERCHI.length);
    cerchi.forEach(([, cx, cy, r, resto], indice) => {
      expect(MARCHIO_CERCHI[indice]).toEqual({
        cx: Number(cx),
        cy: Number(cy),
        r: Number(r),
        tratto: resto.includes('stroke="currentColor"'),
      });
    });
  });

  it('usa il viewBox e lo spessore del componente', () => {
    const viewBox = componente.match(/viewBox="([\d.\s]+)"/g)?.at(-1) ?? '';
    const [x, y, larghezza, altezza] = viewBox
      .replace('viewBox="', '')
      .replace('"', '')
      .split(' ')
      .map(Number);

    expect(MARCHIO_VIEWBOX).toEqual({ x, y, larghezza, altezza });
    expect(MARCHIO_SPESSORE).toBe(1.612);
    expect(componente).toContain(`strokeWidth="${MARCHIO_SPESSORE}"`);
  });
});
