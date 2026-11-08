import { describe, expect, it } from 'vitest';
import { MARGINE_FASCE_MINI, calcola } from './calcolo';
import { IMPASTI } from '../config/impasti';
import type { InputCalcolo, Modello } from '../types';

/*
 * IL MOTORE PREDEFINITO
 * ---------------------
 * Il sito parte dal modello a 12 mini-ricette: W e dose mostrati devono essere
 * quelli delle mini-ricette, non quelli del conteggio termico. Questi test
 * passano dalla funzione che usa l'interfaccia, non dal modulo del modello, così
 * controllano il percorso vero; il vecchio motore deve restare leggibile come
 * fallback, con le dosi di prima.
 *
 * Caso di riferimento: teglia 30×40, 660 g di impasto, 75% di idratazione,
 * 2 + 18 + 4 ore. Il modello lo legge a 17,34 ore di maturazione (fascia
 * lunga), quindi W 300 nella fascia 280–320 e 4,64 g/kg di lievito.
 */

function caso(modello: Modello, patch: Partial<InputCalcolo> = {}): InputCalcolo {
  return {
    tipo: 'teglia',
    ramo: 'teglia',
    idratazione: 75,
    sale: 2.5,
    olio: 2,
    malto: 1,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'farina',
    numeroPanetti: null,
    pesoPanettoG: null,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 2, oreTaDopo: 4, ta: 20, tc: 4 },
    staglio: 'prima',
    modello,
    temperaturaImpasto: 21,
    temperaturaFarina: 20,
    riscaldamento: 8,
    correzioneLievito: 0,
    ...patch,
  };
}

/** Una tonda sulla sua ricetta: farina, idratazione e condimenti di riferimento. */
function tonda(ramo: 'verace' | 'contemporanea', tempi: InputCalcolo['tempi']): InputCalcolo {
  const ricetta =
    ramo === 'verace'
      ? { farinaG: 456, idro: 62, sale: 2.6, olio: 0 }
      : { farinaG: 473, idro: 75, sale: 2.4, olio: 1 };

  return caso('miniRicette', {
    tipo: ramo,
    ramo,
    idratazione: ricetta.idro,
    sale: ricetta.sale,
    olio: ricetta.olio,
    malto: 0,
    farinaG: ricetta.farinaG,
    pesoPanettoG: ramo === 'verace' ? 250 : 280,
    tempi,
  });
}

describe('motore predefinito: modello a 12 mini-ricette', () => {
  const r = calcola(caso('miniRicette'));

  it('legge la teglia del caso di riferimento con W 300 in 280–320', () => {
    expect(r.modello).toBe('miniRicette');
    expect(r.forzaConsigliata).toBe(300);
    expect(r.miniRicetta.w).toBe(300);
    expect(r.miniRicetta.fasciaEffettiva).toEqual([280, 320]);
    expect(r.miniRicetta.fasciaW).toBe('lunga');
  });

  it('porta la dose delle mini-ricette, non quella del motore termico', () => {
    // 4,64 g/kg su ~365,7 g di farina.
    expect(r.miniRicetta.doseGkg).toBeCloseTo(4.64, 2);
    expect(r.lievitoG).toBeCloseTo(1.7, 2);
    expect(r.lievitoPerKgFarina).toBeCloseTo(4.64, 1);
    // Lo stesso impasto, letto dal motore termico, chiede 3,00 g: se i due
    // numeri coincidessero, il predefinito non starebbe usando il modello.
    expect(r.lievitoG).not.toBeCloseTo(r.confronto.lievitoNuovoG, 1);
  });

  it('mostra le ore del suo indice di maturazione, non quelle dell’inerzia', () => {
    expect(r.oreEquivalenti).toBeCloseTo(r.miniRicetta.iMat, 6);
    expect(r.oreEquivalenti).not.toBeCloseTo(r.confronto.oreEquivalentiNuovo, 1);
  });

  it('non applica il taglio del motore termico alla dose del modello', () => {
    expect(r.limiteLievito).toBeNull();
  });
});

describe('le forbici del W sono la fascia del caso, non una percentuale', () => {
  it('il caso di riferimento dà 280–320 consigliata e 270–330 tollerata', () => {
    const r = calcola(caso('miniRicette'));

    expect([r.zonaMinima, r.zonaMassima]).toEqual([280, 320]);
    expect([r.forzaMinima, r.forzaMassima]).toEqual([270, 330]);
    // Le vecchie forbici percentuali (0,85–1,25 del punto) sarebbero 255–375:
    // il doppio dell'ampiezza della mini-ricetta.
    expect([r.forzaMinima, r.forzaMassima]).not.toEqual([255, 375]);
  });

  it('verace e contemporanea mostrano la loro mini-ricetta, non il ±15%', () => {
    const verace = calcola(
      tonda('verace', { oreTotali: 13.3, oreFrigo: 7.5, oreTaPrima: 2, oreTaDopo: 3.8, ta: 20, tc: 4 }),
    );
    expect([verace.zonaMinima, verace.zonaMassima]).toEqual(verace.miniRicetta.fasciaEffettiva);
    expect([verace.forzaMinima, verace.forzaMassima]).toEqual([
      verace.miniRicetta.fasciaEffettiva[0] - MARGINE_FASCE_MINI,
      verace.miniRicetta.fasciaEffettiva[1] + MARGINE_FASCE_MINI,
    ]);

    const contemporanea = calcola(
      tonda('contemporanea', { oreTotali: 24, oreFrigo: 18, oreTaPrima: 2, oreTaDopo: 4, ta: 20, tc: 4 }),
    );
    expect([contemporanea.zonaMinima, contemporanea.zonaMassima]).toEqual(
      contemporanea.miniRicetta.fasciaEffettiva,
    );
  });

  it('i due motori termici tengono le forbici percentuali di sempre', () => {
    const nuovo = calcola(caso('nuovo'));
    const vecchio = calcola(caso('vecchio'));

    // 241 · 0,90–1,15 = 217–277; 241 · 0,85–1,25 = 205–301.
    expect([nuovo.zonaMinima, nuovo.zonaMassima]).toEqual([217, 277]);
    expect([nuovo.forzaMinima, nuovo.forzaMassima]).toEqual([205, 301]);
    expect(vecchio.forzaMinima).toBe(Math.round(vecchio.forzaConsigliata * 0.85));
  });
});

describe('valori di partenza della teglia', () => {
  const teglia = IMPASTI.find((impasto) => impasto.id === 'teglia');

  it('parte al 75% con olio 2% e malto 1%', () => {
    expect(teglia?.idratazione).toBe(75);
    expect(teglia?.olio).toBe(2);
    expect(teglia?.malto).toBe(1);
  });

  it('con quei valori il programma di partenza dà 300 in 280–320', () => {
    const r = calcola(
      caso('miniRicette', {
        idratazione: teglia!.idratazione,
        sale: teglia!.sale,
        olio: teglia!.olio,
        malto: teglia!.malto,
      }),
    );

    expect(r.forzaConsigliata).toBe(300);
    expect(r.miniRicetta.fasciaEffettiva).toEqual([280, 320]);
  });

  it('al 70% lo stesso programma chiedeva 288: è il motivo del 75%', () => {
    expect(calcola(caso('miniRicette', { idratazione: 70 })).forzaConsigliata).toBe(288);
  });
});

describe('il motore vecchio resta un fallback selezionabile', () => {
  it('torna le dosi del calcolatore precedente sullo stesso impasto', () => {
    const vecchio = calcola(caso('vecchio'));
    expect(vecchio.modello).toBe('vecchio');
    expect(vecchio.forzaConsigliata).toBe(251);
    expect(vecchio.lievitoG).toBeCloseTo(2.64, 2);
  });

  it('l’inerzia termica resta leggibile', () => {
    const nuovo = calcola(caso('nuovo'));
    expect(nuovo.modello).toBe('nuovo');
    expect(nuovo.forzaConsigliata).toBe(241);
  });

  it('senza modello dichiarato il calcolo resta quello termico di prima', () => {
    const senzaModello = calcola({ ...caso('nuovo'), modello: undefined });
    expect(senzaModello.modello).toBe('nuovo');
    expect(senzaModello.forzaConsigliata).toBe(241);
  });
});
