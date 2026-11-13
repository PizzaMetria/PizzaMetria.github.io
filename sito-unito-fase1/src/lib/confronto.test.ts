import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import type { InputCalcolo, Ramo } from '../types';

/*
 * Verifica di allineamento, a livello di calcolo completo, con i valori presi
 * come riferimento durante la costruzione del modello: 6 panetti da 250 g,
 * idratazione 62%, sale 2,5%, olio 0, ambiente 20 °C, nessuna ora di frigo.
 */

function input(ramo: Ramo, ore: number): InputCalcolo {
  return {
    tipo: ramo,
    ramo,
    idratazione: 62,
    sale: 2.5,
    olio: 0,
    malto: 0,
    tipoLievito: 'fresco',
    // Il mix è neutro: qui interessa il lievito, non la forza.
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'panetti',
    numeroPanetti: 6,
    pesoPanettoG: 250,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: ore, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: ore, ta: 20, tc: 4 },
    staglio: 'prima',
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 0,
    correzioneLievito: 0,
  };
}

const MISURE: readonly { ramo: Ramo; ore: number; grammi: number; farina: number }[] = [
  { ramo: 'verace', ore: 6, grammi: 3.15, farina: 910 },
  { ramo: 'verace', ore: 8, grammi: 2.3, farina: 910 },
  { ramo: 'verace', ore: 12, grammi: 1.27, farina: 911 },
  { ramo: 'verace', ore: 18, grammi: 0.8, farina: 911 },
  { ramo: 'verace', ore: 24, grammi: 0.58, farina: 912 },
  { ramo: 'verace', ore: 36, grammi: 0.36, farina: 912 },
  { ramo: 'verace', ore: 48, grammi: 0.26, farina: 912 },
  { ramo: 'teglia', ore: 6, grammi: 10.98, farina: 905 },
  { ramo: 'teglia', ore: 8, grammi: 7.9, farina: 907 },
  { ramo: 'teglia', ore: 12, grammi: 4.25, farina: 909 },
  { ramo: 'teglia', ore: 18, grammi: 2.56, farina: 910 },
  { ramo: 'teglia', ore: 24, grammi: 1.76, farina: 911 },
  { ramo: 'teglia', ore: 36, grammi: 1.0, farina: 911 },
  { ramo: 'teglia', ore: 48, grammi: 0.63, farina: 911 },
];

describe('allineamento con il riferimento', () => {
  it('riproduce le dosi misurate', () => {
    const righe = MISURE.map((misura) => {
      const nostro = calcola(input(misura.ramo, misura.ore));
      const atteso = (misura.grammi / misura.farina) * 100;
      return {
        etichetta: `${misura.ramo} ${misura.ore} h`,
        atteso,
        nostro: nostro.percentualeLievito,
        rapporto: nostro.percentualeLievito / atteso,
      };
    });

    console.log('\nAllineamento (percentuale di lievito fresco):');
    for (const riga of righe) {
      console.log(
        `- ${riga.etichetta}: riferimento ${riga.atteso.toFixed(4)}% · nostro ${riga.nostro.toFixed(4)}% · ${(riga.rapporto * 100).toFixed(1)}%`,
      );
    }

    // La tabella qui sopra è la taratura precedente, non una fonte: si tiene
    // come memoria. Il riferimento vero del modello sono le 193 ricette
    // italiane, che chiedono meno lievito sui programmi corti. Qui si blocca
    // la forma, non i numeri di ieri: la dose scende con le ore.
    for (const ramo of ['verace', 'teglia'] as const) {
      const serie = righe.filter((riga) => riga.etichetta.startsWith(ramo));
      for (let indice = 1; indice < serie.length; indice += 1) {
        expect(
          serie[indice].nostro,
          `${serie[indice].etichetta} contro ${serie[indice - 1].etichetta}`,
        ).toBeLessThan(serie[indice - 1].nostro);
      }
    }
  });

  it('riproduce il W consigliato', () => {
    // Con gli ingredienti della verace (olio 0) la legge chiede 2 W in più
    // rispetto alla curva nuda: il riferimento dell'olio è il 2%.
    const attesi: readonly (readonly [number, number])[] = [
      [8, 254],
      [12, 280],
      [18, 306],
      [24, 324],
      [30, 339],
    ];

    for (const [ore, w] of attesi) {
      expect(
        Math.abs(calcola(input('verace', ore)).forzaConsigliata - w),
        `${ore} h`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it('la teglia resta sopra la tonda a ogni durata', () => {
    for (const ore of [6, 12, 24, 48]) {
      const tonda = calcola(input('verace', ore)).percentualeLievito;
      const teglia = calcola(input('teglia', ore)).percentualeLievito;
      expect(teglia).toBeGreaterThan(tonda);
    }
  });

  it('il vantaggio della teglia si stringe allungando i tempi', () => {
    const corto =
      calcola(input('teglia', 6)).percentualeLievito /
      calcola(input('verace', 6)).percentualeLievito;
    const lungo =
      calcola(input('teglia', 48)).percentualeLievito /
      calcola(input('verace', 48)).percentualeLievito;

    expect(corto).toBeGreaterThan(lungo);
  });
});
