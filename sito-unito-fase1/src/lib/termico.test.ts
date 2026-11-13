import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import { RAMI_TERMICO } from './fermentazione';
import type { InputCalcolo, Ramo } from '../types';

function input(modifiche: Partial<InputCalcolo> = {}): InputCalcolo {
  return {
    tipo: 'contemporanea',
    ramo: 'contemporanea',
    idratazione: 65,
    sale: 2.5,
    olio: 0,
    malto: 0,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'panetti',
    numeroPanetti: 6,
    pesoPanettoG: 280,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 1, oreTaDopo: 5, ta: 20, tc: 4 },
    staglio: 'prima',
    modello: 'termico',
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 0,
    correzioneLievito: 0,
    ...modifiche,
  };
}

describe('modello termico', () => {
  it('si dichiara con il suo nome', () => {
    expect(calcola(input()).modello).toBe('termico');
  });

  it('conta il frigo più dell’inerziale: stesso profilo, orologio del lievito doppio', () => {
    const risultato = calcola(input());
    expect(risultato.confronto.oreEquivalentiTermico).toBeGreaterThan(
      risultato.confronto.oreEquivalentiNuovo,
    );
    // 18 ore a 4 °C pesano 0,115 ore equivalenti l'una nel profilo: il Termico
    // le aggiunge una seconda volta, perché al lievito il frigo costa il doppio.
    expect(risultato.confronto.oreEquivalentiTermico - risultato.confronto.oreEquivalentiNuovo)
      .toBeCloseTo(18 * 0.115, 1);
  });

  it('senza frigo i due orologi coincidono', () => {
    const risultato = calcola(
      input({ tempi: { oreTotali: 12, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 12, ta: 20, tc: 4 } }),
    );
    expect(risultato.confronto.oreEquivalentiTermico).toBeCloseTo(
      risultato.confronto.oreEquivalentiNuovo,
      6,
    );
  });

  it('il W resta quello dell’inerziale', () => {
    const risultato = calcola(input());
    expect(risultato.confronto.forzaTermico).toBe(risultato.confronto.forzaNuovo);
    expect(risultato.oreEquivalenti).toBe(risultato.confronto.oreEquivalentiTermico);
  });

  it('la massa unica in frigo matura più dei panetti da 280 g', () => {
    const panetti = calcola(input({ staglio: 'prima', numeroPanetti: 36 }));
    const massa = calcola(
      input({ staglio: 'dopo', numeroPanetti: 36, farinaG: null, modalita: 'panetti' }),
    );
    // Un pezzo più grosso disperde meno calore per unità di massa: resta caldo
    // più a lungo, quindi matura di più e chiede meno lievito.
    expect(massa.confronto.oreEquivalentiTermico).toBeGreaterThan(
      panetti.confronto.oreEquivalentiTermico,
    );
    expect(massa.confronto.lievitoTermicoG).toBeLessThan(panetti.confronto.lievitoTermicoG);
  });

  it('cresce con la massa: 10 kg stanno in cella a lungo più di 1,7 kg', () => {
    const piccolo = calcola(input({ staglio: 'dopo', modalita: 'farina', farinaG: 1000 }));
    const grande = calcola(input({ staglio: 'dopo', modalita: 'farina', farinaG: 6000 }));
    expect(grande.costanteTempoOre).toBeGreaterThan(piccolo.costanteTempoOre);
    expect(grande.confronto.oreEquivalentiTermico).toBeGreaterThan(
      piccolo.confronto.oreEquivalentiTermico,
    );
  });

  it('la dose cala con le ore in tutti e tre i rami', () => {
    for (const ramo of ['verace', 'contemporanea', 'teglia'] as Ramo[]) {
      const dosi = [4, 8, 16, 24, 48].map((h) =>
        calcola(
          input({
            ramo,
            tipo: ramo,
            staglio: ramo === 'teglia' ? 'dopo' : 'prima',
            tempi: { oreTotali: h, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: h, ta: 20, tc: 4 },
          }),
        ).confronto.lievitoTermicoG,
      );
      for (let i = 1; i < dosi.length; i += 1) {
        expect(dosi[i], `${ramo}: ${dosi.join(' → ')}`).toBeLessThan(dosi[i - 1]);
      }
    }
  });

  it('la teglia chiede più della tonda a parità di ore', () => {
    const tonda = calcola(
      input({
        ramo: 'verace',
        tipo: 'verace',
        tempi: { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 20, tc: 4 },
      }),
    );
    const teglia = calcola(
      input({
        ramo: 'teglia',
        tipo: 'teglia',
        staglio: 'dopo',
        olio: 2,
        tempi: { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 20, tc: 4 },
      }),
    );
    expect(teglia.confronto.lievitoTermicoG / teglia.farinaG).toBeGreaterThan(
      (2 * tonda.confronto.lievitoTermicoG) / tonda.farinaG,
    );
  });

  it('i tre livelli stanno in ordine e l’esponente è uno solo', () => {
    expect(RAMI_TERMICO.verace.esponente).toBe(RAMI_TERMICO.teglia.esponente);
    expect(RAMI_TERMICO.verace.esponente).toBe(RAMI_TERMICO.contemporanea.esponente);
    expect(RAMI_TERMICO.teglia.coefficiente).toBeGreaterThan(
      RAMI_TERMICO.contemporanea.coefficiente,
    );
    expect(RAMI_TERMICO.contemporanea.coefficiente).toBeGreaterThan(
      RAMI_TERMICO.verace.coefficiente,
    );
  });

  it('lo staglio cambia il pezzo che va in cella, non il peso dell’impasto', () => {
    const prima = calcola(input({ staglio: 'prima' }));
    const dopo = calcola(input({ staglio: 'dopo' }));
    // La massa in cella cambia le ore equivalenti, quindi la dose e con lei la
    // farina: quello che resta fermo è il peso, perché è il dato di partenza.
    expect(prima.farinaG).not.toBeCloseTo(dopo.farinaG, 3);
    expect(prima.pesoImpastoG).toBeCloseTo(6 * 280, 6);
    expect(dopo.pesoImpastoG).toBeCloseTo(6 * 280, 6);
  });
});
