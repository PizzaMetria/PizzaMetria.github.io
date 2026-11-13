/*
 * IL CORPUS ENTRA NEI TEST
 * ------------------------
 * Fino a ieri le ricette si controllavano a mano con
 * `npx vite-node scripts/confronto-193.ts`: se qualcuno toccava un coefficiente,
 * nessuno se ne accorgeva. Qui la taratura diventa una promessa verificata.
 *
 * Cosa si controlla: la mediana del rapporto modello/ricetta per ogni motore e
 * ogni stile, sulle righe uniche (le ricette ripubblicate contano una volta).
 * Se un coefficiente si muove, si muove anche la mediana e il test cade: è il
 * momento giusto per chiedersi se il cambiamento era voluto.
 *
 * Quando un cambio è voluto si aggiornano i numeri qui sotto **e** si rigenera
 * la forchetta con `npx vite-node scripts/bande-dosi.ts`.
 */
import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import { caricaCorpus, deduplica, inputCorpus } from './corpus-193';
import type { Modello, Ramo } from '../types';

interface Riferimento {
  mediana: number;
  /** Percentuale di ricette entro ±30% dalla dose del modello. */
  dentro: number;
}

const RIFERIMENTI: Record<string, Riferimento> = {
  'miniRicette/verace': { mediana: 0.78, dentro: 27 },
  'miniRicette/contemporanea': { mediana: 0.55, dentro: 23 },
  'miniRicette/teglia': { mediana: 0.97, dentro: 37 },
  'termico/verace': { mediana: 1.0, dentro: 31 },
  'termico/contemporanea': { mediana: 1.0, dentro: 19 },
  'termico/teglia': { mediana: 0.99, dentro: 42 },
  'nuovo/verace': { mediana: 0.95, dentro: 19 },
  'nuovo/contemporanea': { mediana: 0.55, dentro: 33 },
  'nuovo/teglia': { mediana: 1.41, dentro: 27 },
  'vecchio/verace': { mediana: 0.99, dentro: 27 },
  'vecchio/contemporanea': { mediana: 0.57, dentro: 19 },
  'vecchio/teglia': { mediana: 1.42, dentro: 36 },
};

/** Margine di oscillazione ammesso sulla mediana. */
const TOLLERANZA = 0.1;

const quantile = (valori: number[], p: number) => {
  const s = [...valori].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p))];
};

describe('corpus delle ricette italiane dirette', () => {
  const tutte = caricaCorpus();
  const corpus = deduplica(tutte);

  it('è quello su cui è tarato il modello', () => {
    expect(tutte).toHaveLength(193);
    // Tre righe sono la stessa ricetta ripubblicata: si contano una volta sola,
    // altrimenti il gruppo che insiste di più pesa più di quanto meriti.
    expect(corpus).toHaveLength(190);
  });

  for (const [chiave, riferimento] of Object.entries(RIFERIMENTI)) {
    const [modello, ramo] = chiave.split('/') as [Modello, Ramo];
    it(`${chiave} resta alla dose di oggi`, () => {
      const casi = corpus.filter((r) => r.ramo === ramo);
      expect(casi.length).toBeGreaterThan(20);

      const rapporto = casi.map(
        (r) => calcola(inputCorpus(r, modello)).percentualeLievito / r.reale,
      );
      const mediana = quantile(rapporto, 0.5);
      const dentro = rapporto.filter((x) => x >= 0.7 && x <= 1.3).length / rapporto.length;

      expect(Math.abs(mediana - riferimento.mediana)).toBeLessThan(TOLLERANZA);
      // La copertura può peggiorare di qualche punto, non crollare.
      expect(Math.round(dentro * 100)).toBeGreaterThanOrEqual(riferimento.dentro - 8);
    });
  }
});
