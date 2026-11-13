import { describe, expect, it } from 'vitest';
import { calcola } from './calcolo';
import { forzaVecchio, profiloVecchio } from './vecchio';
import type { InputCalcolo, Modello, TipoImpasto } from '../types';

/*
 * Confronto con il riferimento (sito di riferimento, calcola.php), misurato il
 * 3 novembre 2026 con gli stessi ingredienti e la stessa geometria delle nostre
 * ricette. Non sono valori presi da un libro: sono le risposte dello strumento
 * con cui ci confrontiamo, quindi un test che passa qui dice che le dosi sono
 * allineate, non solo coerenti con se stesse.
 *
 * Due cose da sapere se un giorno i numeri vanno rifatti:
 * - Il riferimento non conosce il malto, quindi la teglia si confronta in percentuale
 *   sulla farina e non in grammi;
 * - Il riferimento carica la dose quando il pezzo è unico (+12% da tre panetti a un
 *   pezzo solo con la stessa farina): per questo il ramo teglia è tarato su una
 *   teglia sola e la tonda su tre panetti.
 */

interface Ricetta {
  nome: string;
  tipo: TipoImpasto;
  idratazione: number;
  olio: number;
  malto: number;
  panetti: number;
  pesoPanettoG: number;
  /** Percentuale di lievito fresco sulla farina, letta sul riferimento. */
  percentualeRiferimento: number;
  /** W consigliato dal riferimento, dove lo confrontiamo. */
  wRiferimento: number;
}

const RICETTE: readonly Ricetta[] = [
  {
    nome: 'verace 3 × 250 g',
    tipo: 'verace',
    idratazione: 62,
    olio: 0,
    malto: 0,
    panetti: 3,
    pesoPanettoG: 250,
    percentualeRiferimento: 0.189,
    wRiferimento: 258,
  },
  {
    nome: 'contemporanea 3 × 280 g',
    tipo: 'contemporanea',
    idratazione: 75,
    olio: 0,
    malto: 0,
    panetti: 3,
    pesoPanettoG: 280,
    percentualeRiferimento: 0.1501,
    wRiferimento: 258,
  },
  {
    nome: 'teglia 30 × 40',
    tipo: 'teglia',
    idratazione: 70,
    olio: 2,
    malto: 1,
    panetti: 1,
    pesoPanettoG: 660,
    percentualeRiferimento: 0.5915,
    wRiferimento: 254,
  },
];

function input(ricetta: Ricetta, modello: Modello): InputCalcolo {
  return {
    tipo: ricetta.tipo,
    ramo: ricetta.tipo,
    idratazione: ricetta.idratazione,
    sale: 2.5,
    olio: ricetta.olio,
    malto: ricetta.malto,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'panetti',
    numeroPanetti: ricetta.panetti,
    pesoPanettoG: ricetta.pesoPanettoG,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    // 4 h prima, 20,5 h in frigo, 4,2 h dopo: il programma del PDF.
    tempi: { oreTotali: 28.7, oreFrigo: 20.5, oreTaPrima: 4, oreTaDopo: 4.2, ta: 20, tc: 4 },
    staglio: 'prima',
    modello,
    temperaturaImpasto: 21,
    temperaturaFarina: 20,
    riscaldamento: 8,
    correzioneLievito: 0,
  };
}

describe('confronto con il riferimento', () => {
  it('modello vecchio: le tre dosi stanno entro il 5%', () => {
    for (const ricetta of RICETTE) {
      const risultato = calcola(input(ricetta, 'vecchio'));
      const scarto = risultato.percentualeLievito / ricetta.percentualeRiferimento - 1;
      expect(
        Math.abs(scarto),
        `vecchio · ${ricetta.nome}: ${(scarto * 100).toFixed(1)}% contro il riferimento`,
      ).toBeLessThan(0.05);
    }
  });

  // Il «riferimento» è un altro calcolatore: non è una fonte ammessa, quindi il
  // modello nuovo non lo insegue più. Ci si allinea, con una forchetta larga,
  // perché due strumenti che sbagliano in direzioni opposte non devono
  // sembrare d'accordo. I valori veri li dà il corpus delle 193 ricette
  // (verace 8 h 0,28%, teglia 6 h 0,79%).
  it('modello nuovo: resta vicino al riferimento, senza inseguirlo', () => {
    const forchette: Record<string, readonly [number, number]> = {
      verace: [0.9, 1.35],
      teglia: [0.6, 1.1],
    };
    for (const ricetta of RICETTE.filter((voce) => voce.tipo !== 'contemporanea')) {
      const risultato = calcola(input(ricetta, 'nuovo'));
      const rapporto = risultato.percentualeLievito / ricetta.percentualeRiferimento;
      const [minimo, massimo] = forchette[ricetta.tipo] ?? [0.5, 1.5];
      expect(
        rapporto,
        `nuovo · ${ricetta.nome}: ${rapporto.toFixed(2)}× il riferimento`,
      ).toBeGreaterThan(minimo);
      expect(rapporto).toBeLessThan(massimo);
    }
  });

  it('modello nuovo: la contemporanea sta sopra riferimento, e di proposito', () => {
    const ricetta = RICETTE.find((voce) => voce.tipo === 'contemporanea');
    if (!ricetta) throw new Error('Ricetta contemporanea mancante.');

    const scarto =
      calcola(input(ricetta, 'nuovo')).percentualeLievito / ricetta.percentualeRiferimento - 1;

    expect(
      scarto,
      `contemporanea contro il riferimento: ${(scarto * 100).toFixed(1)}%`,
    ).toBeGreaterThan(0.1);
    expect(scarto).toBeLessThan(0.22);
  });

  // Il W mostrato dal motore predefinito non è più quello storico: entrambi i
  // motori usano la legge a due orologi. L'emulazione resta, ma come
  // documentazione — e si continua a verificare che riproduca riferimento, perché è
  // l'unica prova che la sua retta era davvero quella del calcolatore vecchio.
  it('l’emulazione storica del W riproduce ancora riferimento entro il 3%', () => {
    for (const ricetta of RICETTE) {
      const tempi = input(ricetta, 'vecchio').tempi;
      const profilo = profiloVecchio(tempi, { temperaturaIniziale: 21 });
      const emulato = forzaVecchio(profilo.oreEquivalenti, tempi.oreTotali);

      expect(
        Math.abs(emulato - ricetta.wRiferimento),
        `${ricetta.nome}: emulazione ${emulato} contro ${ricetta.wRiferimento}`,
      ).toBeLessThanOrEqual(3);
    }
  });

  it('i due motori chiedono la farina con la stessa legge, a due orologi', () => {
    for (const ricetta of RICETTE) {
      for (const modello of ['vecchio', 'nuovo'] as const) {
        const dati = input(ricetta, modello);
        const risultato = calcola(dati);
        // La legge, riscritta qui per esteso: se cambia nel modulo, questo test
        // se ne accorge invece di ripeterla per fede.
        const atteso = Math.min(
          420,
          Math.round(
            119 +
              64 * Math.log(risultato.oreEquivalenti + 0.155 * dati.tempi.oreFrigo) +
              2.4 * (dati.idratazione - 62) +
              2 * (dati.sale - 2.5) -
              1 * (dati.olio - 2),
          ),
        );

        expect(
          risultato.forzaConsigliata,
          `${modello} · ${ricetta.nome}: ${risultato.forzaConsigliata} contro ${atteso}`,
        ).toBe(atteso);
      }
    }
  });

  // Resta aperto il W del modello a inerzia: sulla verace dà 219 contro 258
  // (−15%), perché la sua retta è tarata su un asse di ore equivalenti diverso.

  // Il W del modello a inerzia invece non torna: sulla verace dà 219 contro 258
  // (−15%), ed è il punto aperto della retta della forza. Qui non si asserisce
  // per non fissare un errore; quando la retta sarà rifatta, il test va esteso.
});
