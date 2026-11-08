import { describe, expect, it } from 'vitest';
import baselineRaw from '../../scripts/baseline-fase1.json?raw';
import { CASI, calcolaCaso, estraiValori } from './casi-fase1';

/*
 * Invarianza della Fase 1: sugli stessi input, ingredienti, dosi di lievito,
 * W consigliato, ore equivalenti e profili termici devono restare quelli
 * registrati prima delle modifiche (scripts/baseline-fase1.json).
 *
 * I cambiamenti attesi sono altri: finestra stampata, suggerimenti di miscela,
 * messaggi e avvisi. Qui non compaiono, di proposito.
 */

interface VoceBaseline {
  id: string;
  valori: ReturnType<typeof estraiValori>;
}

const baseline = JSON.parse(baselineRaw) as VoceBaseline[];

describe('fase 1 · invarianza del motore', () => {
  it('la baseline copre tutti i casi fissi', () => {
    expect(baseline).toHaveLength(CASI.length);
    expect(baseline.map((voce) => voce.id)).toEqual(CASI.map((caso) => caso.id));
  });

  it('ingredienti, dosi, W, ore equivalenti e profili non cambiano', () => {
    for (const voce of baseline) {
      const caso = CASI.find((candidato) => candidato.id === voce.id);
      expect(caso, voce.id).toBeDefined();
      if (!caso) continue;
      expect(estraiValori(calcolaCaso(caso)), voce.id).toEqual(voce.valori);
    }
  });
});
