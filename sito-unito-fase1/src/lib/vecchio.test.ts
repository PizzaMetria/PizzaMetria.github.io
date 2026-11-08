import { describe, expect, it } from 'vitest';
import { forzaVecchio, percentualeLievitoVecchio, profiloVecchio } from './vecchio';

/*
 * I valori attesi vengono da otto calcoli eseguiti davvero sul calcolatore
 * precedente: 6 panetti da 250 g, 62% di idratazione, 2,5% di sale, niente
 * olio, ambiente 20 °C, frigo 4 °C, lievito istantaneo, impasto a 24 °C.
 */

const FARINA_G = 1500 / 1.645;

interface Caso {
  nome: string;
  totale: number;
  frigo: number;
  oreEquivalenti: number;
  lievitoG: number;
  w: number;
}

const CASI: readonly Caso[] = [
  { nome: '24 h senza frigo', totale: 24, frigo: 0, oreEquivalenti: 25.32, lievitoG: 0.19, w: 302 },
  { nome: '8 h senza frigo', totale: 8, frigo: 0, oreEquivalenti: 8.69, lievitoG: 0.77, w: 208 },
  { nome: '22 h · 16 in frigo', totale: 22, frigo: 16, oreEquivalenti: 9.61, lievitoG: 0.71, w: 238 },
  { nome: '30 h · 18 in frigo', totale: 30, frigo: 18, oreEquivalenti: 14.39, lievitoG: 0.43, w: 272 },
  { nome: '46 h · 40 in frigo', totale: 46, frigo: 40, oreEquivalenti: 12.47, lievitoG: 0.63, w: 290 },
  { nome: '12 h · 8 in frigo', totale: 12, frigo: 8, oreEquivalenti: 6.57, lievitoG: 1.06, w: 208 },
  { nome: '20 h · 10 in frigo', totale: 20, frigo: 10, oreEquivalenti: 12.03, lievitoG: 0.50, w: 244 },
  { nome: '40 h · 32 in frigo', totale: 40, frigo: 32, oreEquivalenti: 13.53, lievitoG: 0.51, w: 284 },
];

function leggi(caso: Caso) {
  // Sul calcolatore precedente la ripartizione è fissa: un'ora prima del frigo,
  // il resto dopo. La calibrazione è tarata su questo programma.
  const prima = caso.frigo > 0 ? 1 : caso.totale;
  const dopo = caso.frigo > 0 ? caso.totale - 1 - caso.frigo : 0;

  const profilo = profiloVecchio(
    {
      oreTotali: caso.totale,
      oreFrigo: caso.frigo,
      oreTaPrima: prima,
      oreTaDopo: dopo,
      ta: 20,
      tc: 4,
    },
    { temperaturaIniziale: 24 },
  );

  const percentuale = percentualeLievitoVecchio({
    oreEquivalenti: profilo.oreEquivalenti,
    ramo: 'verace',
    idratazione: 62,
    sale: 2.5,
    olio: 0,
  });

  return {
    oreEquivalenti: profilo.oreEquivalenti,
    lievitoG: (FARINA_G * percentuale * 0.335) / 100,
    w: forzaVecchio(profilo.oreEquivalenti, caso.totale),
  };
}

describe('emulazione del vecchio calcolatore', () => {
  it.each(CASI)('riproduce le ore equivalenti di $nome', (caso) => {
    const letto = leggi(caso);
    expect(letto.oreEquivalenti).toBeGreaterThan(caso.oreEquivalenti * 0.93);
    expect(letto.oreEquivalenti).toBeLessThan(caso.oreEquivalenti * 1.07);
  });

  it.each(CASI)('riproduce la forza consigliata di $nome', (caso) => {
    const letto = leggi(caso);
    expect(Math.abs(letto.w - caso.w)).toBeLessThanOrEqual(Math.max(2, caso.w * 0.02));
  });

  it('riproduce la dose di lievito entro il 20%', () => {
    for (const caso of CASI) {
      const letto = leggi(caso);
      const scarto = letto.lievitoG / caso.lievitoG - 1;
      expect(Math.abs(scarto)).toBeLessThan(0.2);
    }
  });

  it('tratta il frigo come una fase lenta ma non ferma', () => {
    const profilo = profiloVecchio(
      { oreTotali: 22, oreFrigo: 16, oreTaPrima: 1, oreTaDopo: 5, ta: 20, tc: 4 },
      { temperaturaIniziale: 24 },
    );

    expect(profilo.oreEquivalentiInFrigo).toBeGreaterThan(0);
    expect(profilo.temperaturaUscitaFrigo).not.toBeNull();
    // All'uscita dal frigo il vecchio modello è già quasi a temperatura ambiente.
    expect(profilo.temperaturaUscitaFrigo ?? 0).toBeLessThan(6);
  });

  it('non dipende dal peso del pezzo', () => {
    const tempi = {
      oreTotali: 22,
      oreFrigo: 16,
      oreTaPrima: 1,
      oreTaDopo: 5,
      ta: 20,
      tc: 4,
    } as const;

    const piccolo = profiloVecchio(tempi, { temperaturaIniziale: 24 });
    const grande = profiloVecchio({ ...tempi }, { temperaturaIniziale: 24 });

    expect(piccolo.oreEquivalenti).toBeCloseTo(grande.oreEquivalenti, 6);
  });
});

describe('ramo teglia del vecchio calcolatore', () => {
  // Sette dosi lette sul riferimento con una teglia sola da 750 g, 62% di idratazione,
  // 2,5% di sale, senza olio, dalle 12 alle 48 ore. È la geometria della teglia:
  // lì il pezzo unico vale più lievito di tre panetti con la stessa farina.
  const MISURE: readonly (readonly [number, number])[] = [
    [9.11, 0.7974],
    [9.7, 0.7621],
    [10.235, 0.7181],
    [10.761, 0.6784],
    [11.378, 0.6344],
    [12.336, 0.5727],
    [13.91, 0.4813],
  ];

  it('riproduce le dosi misurate entro il 4%', () => {
    for (const [oreEquivalenti, atteso] of MISURE) {
      const nostro = percentualeLievitoVecchio({
        oreEquivalenti,
        ramo: 'teglia',
        idratazione: 62,
        sale: 2.5,
        olio: 0,
      });
      const scarto = nostro / atteso - 1;
      expect(Math.abs(scarto), `${oreEquivalenti} ore equivalenti`).toBeLessThan(0.04);
    }
  });
});
