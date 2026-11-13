import { describe, expect, it } from 'vitest';
import {
  consiglioForza,
  consiglioForzaRicetta,
  ORE_DOPO_RINFRESCO,
  PESO_ORE_BIGA,
} from './forza-biga';
import { piano as pianoMotore } from './motore-biga';
import type { PianoBiga } from '../types';

/** Piano di una biga che sta tutta in ambiente, alla temperatura indicata. */
function bigaAmbiente(ore: number, temperatura = 20): PianoBiga {
  return pianoMotore({ temperatura, oreTotali: ore });
}

function bigaFrigo(ore: number, temperaturaFrigo = 4): PianoBiga {
  return pianoMotore({ temperatura: 20, temperaturaFrigo, oreTotali: ore });
}

/** Impasto di riferimento della campagna: 62%, senza sale né olio. */
const RICERCA = { idratazione: 62, sale: 0, olio: 0 };

describe('consiglio di forza della biga', () => {
  it('dà un W per la biga e uno più basso per il rinfresco', () => {
    const consiglio = consiglioForza(bigaAmbiente(24), RICERCA, 0.85);

    // 24 h × 1,8 = 43,2 ore equivalenti → 360 W, meno 3 W di sale e olio.
    expect(consiglio.biga).toBe(357);
    expect(consiglio.rinfresco).toBe(205);
    expect(consiglio.riga).toBe('Biga W 357 · rinfresco W 205');
  });

  it('con la biga al 100% non c’è una seconda farina', () => {
    const consiglio = consiglioForza(bigaAmbiente(24), RICERCA, 1);

    expect(consiglio.rinfresco).toBeNull();
    expect(consiglio.riga).toBe('Biga W 322–392');
  });

  it('la forbice è quella dell’errore tipico della legge', () => {
    const consiglio = consiglioForza(bigaAmbiente(12), RICERCA, 1);

    // 12 h × 1,8 = 21,6 ore equivalenti: W 313, con ±35 di forbice.
    expect(consiglio.biga).toBe(313);
    expect(consiglio.frase).toContain('W 278–348');
  });

  it('un’ora di biga pesa più di un’ora di impasto diretto', () => {
    const ore = 24;
    const consiglio = consiglioForza(bigaAmbiente(ore), RICERCA, 1);

    // La stessa legge senza il fattore della biga darebbe 322: a parità di ore
    // il prefermento chiede più forza dell'impasto diretto.
    expect(consiglio.biga).toBeGreaterThan(322);
    expect(PESO_ORE_BIGA * ore).toBeCloseTo(43.2, 6);
  });

  it('il freddo non sconta le ore della biga', () => {
    // Per il lievito un'ora a 4 °C vale sette minuti, per la farina no: le
    // schede dei molini chiedono lo stesso W per 24 ore, in ambiente o in cella.
    const inAmbiente = consiglioForza(bigaAmbiente(24), RICERCA, 1);
    const inFrigo = consiglioForza(bigaFrigo(24), RICERCA, 1);

    expect(inFrigo.biga).toBe(inAmbiente.biga);
  });

  it('riproduce le prescrizioni italiane per la biga', () => {
    // Confraternita: 12 h → W 320, 24 h → W 370. Lario Millenium: 18 h al 67%
    // → W 350. Tutte entro la forbice di ±35 W.
    const dodici = consiglioForza(bigaAmbiente(12), RICERCA, 1).biga;
    const ventiquattro = consiglioForza(bigaAmbiente(24), RICERCA, 1).biga;
    const lario = consiglioForza(
      bigaAmbiente(18),
      { idratazione: 67, sale: 0, olio: 0 },
      1,
    ).biga;

    expect(Math.abs(dodici - 320)).toBeLessThanOrEqual(35);
    expect(Math.abs(ventiquattro - 370)).toBeLessThanOrEqual(35);
    expect(Math.abs(lario - 350)).toBeLessThanOrEqual(35);
  });

  it('l’idratazione alta alza entrambe le farine', () => {
    const asciutta = consiglioForza(bigaAmbiente(24), { idratazione: 62, sale: 0, olio: 0 }, 0.85);
    const bagnata = consiglioForza(bigaAmbiente(24), { idratazione: 80, sale: 0, olio: 0 }, 0.85);

    expect(bagnata.biga - asciutta.biga).toBe(43); // 2,4 W per punto
    expect(bagnata.rinfresco! - asciutta.rinfresco!).toBe(43);
  });

  it('le ore dopo il rinfresco cambiano il W del rinfresco, non quello della biga', () => {
    const base = consiglioForza(bigaAmbiente(24), RICERCA, 0.85);
    const lunga = consiglioForza(bigaAmbiente(24), RICERCA, 0.85, 8);

    expect(lunga.rinfresco!).toBeGreaterThan(base.rinfresco!);
    expect(lunga.biga).toBe(base.biga);
  });
});

describe('consiglioForzaRicetta', () => {
  const ricettaBase = {
    id: 'prova',
    famiglia: 'biga-rinfresco' as const,
    idratazioneTotale: 0.8,
    percentualeSale: 0.03,
    percentualeOlio: 0.04,
    quotaFarinaBiga: 0.85,
    motoreBiga: { temperatura: 20, temperaturaFrigo: 4, ore: 24 },
  };

  it('ricostruisce il piano dalla configurazione', () => {
    const consiglio = consiglioForzaRicetta(ricettaBase as never);

    expect(consiglio).not.toBeNull();
    // 24 h di biga, 80% di idratazione, 3% di sale, 4% di olio.
    expect(consiglio!.biga).toBe(402);
    expect(consiglio!.rinfresco).toBe(250);
    expect(ORE_DOPO_RINFRESCO).toBe(4);
  });

  it('preferisce il piano vero del risultato, quando c’è', () => {
    const piano = pianoMotore({ temperatura: 20, oreTotali: 8 });
    const conPiano = consiglioForzaRicetta(ricettaBase as never, piano)!;
    const daConfig = consiglioForzaRicetta(ricettaBase as never)!;

    expect(conPiano.biga).toBeLessThan(daConfig.biga);
    // Il rinfresco non dipende dalle ore della biga: resta uguale.
    expect(conPiano.rinfresco).toBe(daConfig.rinfresco);
  });

  it('non dice nulla per un impasto diretto', () => {
    expect(
      consiglioForzaRicetta({ ...ricettaBase, famiglia: 'diretto' } as never),
    ).toBeNull();
  });
});
