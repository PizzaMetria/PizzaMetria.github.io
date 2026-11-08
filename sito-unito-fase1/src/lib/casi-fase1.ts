import { calcola } from './calcolo';
import type { InputCalcolo, Modello, Ramo, RisultatoCalcolo } from '../types';

/*
 * Casi fissi della Fase 1: servono alla baseline numerica e al test di
 * invarianza. Coprono le tre ricette, i due motori e quattro programmi,
 * più alcuni mix di farine (compreso uno con W mancante).
 */

function tempi(oreTotali: number, oreFrigo: number): InputCalcolo['tempi'] {
  return {
    oreTotali,
    oreFrigo,
    oreTaPrima: 0,
    oreTaDopo: oreTotali - oreFrigo,
    ta: 20,
    tc: 4,
  };
}

function caso(
  ramo: Ramo,
  modello: Modello,
  programma: InputCalcolo['tempi'],
  patch: Partial<InputCalcolo> = {},
): InputCalcolo {
  const ricetta =
    ramo === 'teglia'
      ? { tipo: 'teglia' as const, idratazione: 70, sale: 2.5, olio: 2, malto: 1 }
      : ramo === 'contemporanea'
        ? { tipo: 'contemporanea' as const, idratazione: 75, sale: 2.5, olio: 0, malto: 0 }
        : { tipo: 'verace' as const, idratazione: 62, sale: 2.5, olio: 0, malto: 0 };

  return {
    tipo: ricetta.tipo,
    ramo,
    idratazione: ricetta.idratazione,
    sale: ricetta.sale,
    olio: ricetta.olio,
    malto: ricetta.malto,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: ramo === 'teglia' ? 'farina' : 'panetti',
    numeroPanetti: ramo === 'teglia' ? null : 6,
    pesoPanettoG: ramo === 'teglia' ? null : ramo === 'contemporanea' ? 280 : 250,
    farinaG: ramo === 'teglia' ? 1000 : null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: programma,
    staglio: 'prima',
    modello,
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 8,
    correzioneLievito: 0,
    ...patch,
  };
}

const RAMI: readonly Ramo[] = ['verace', 'contemporanea', 'teglia'];
const MODELLI: readonly Modello[] = ['nuovo', 'vecchio'];
const PROGRAMMI: readonly { id: string; tempi: InputCalcolo['tempi'] }[] = [
  { id: '8h', tempi: tempi(8, 0) },
  { id: '24h', tempi: tempi(24, 0) },
  { id: '48h-24frigo', tempi: tempi(48, 24) },
  { id: '72h-48frigo', tempi: tempi(72, 48) },
];

export const DATA_FISSA = new Date('2026-01-01T00:00:00.000Z');

export interface CasoFase1 {
  id: string;
  input: InputCalcolo;
}

export const CASI: readonly CasoFase1[] = [
  ...RAMI.flatMap((ramo) =>
    MODELLI.flatMap((modello) =>
      PROGRAMMI.map((programma) => ({
        id: `${ramo}/${modello}/${programma.id}`,
        input: caso(ramo, modello, programma.tempi),
      })),
    ),
  ),
  {
    id: 'mix/200-400-25-75',
    input: caso('verace', 'nuovo', tempi(24, 0), {
      farine: [
        { quota: 75, w: 200 },
        { quota: 25, w: 400 },
        { quota: 0, w: null },
      ],
    }),
  },
  {
    id: 'mix/150-350-50-50',
    input: caso('verace', 'nuovo', tempi(24, 0), {
      farine: [
        { quota: 50, w: 150 },
        { quota: 50, w: 350 },
        { quota: 0, w: null },
      ],
    }),
  },
  {
    id: 'mix/200-300-400',
    input: caso('verace', 'nuovo', tempi(24, 0), {
      farine: [
        { quota: 40, w: 200 },
        { quota: 40, w: 300 },
        { quota: 20, w: 400 },
      ],
    }),
  },
  {
    id: 'mix/250-260',
    input: caso('verace', 'nuovo', tempi(24, 0), {
      farine: [
        { quota: 50, w: 250 },
        { quota: 50, w: 260 },
        { quota: 0, w: null },
      ],
    }),
  },
  {
    id: 'mix/senza-w',
    input: caso('verace', 'nuovo', tempi(24, 0), {
      farine: [
        { quota: 70, w: 300 },
        { quota: 30, w: null },
        { quota: 0, w: null },
      ],
    }),
  },
  {
    id: 'lievito/vecchio-dose-alta',
    input: caso('verace', 'vecchio', tempi(4, 0), { correzioneLievito: 50 }),
  },
];

/** I numeri che la Fase 1 non deve muovere. */
export function estraiValori(r: RisultatoCalcolo) {
  return {
    farinaG: r.farinaG,
    acquaG: r.acquaG,
    saleG: r.saleG,
    olioG: r.olioG,
    maltoG: r.maltoG,
    lievitoG: r.lievitoG,
    lievitoFrescoG: r.lievitoFrescoG,
    percentualeLievito: r.percentualeLievito,
    pesoImpastoG: r.pesoImpastoG,
    numeroPezzi: r.numeroPezzi,
    pesoPerPezzoG: r.pesoPerPezzoG,
    forzaConsigliata: r.forzaConsigliata,
    oreEquivalenti: r.oreEquivalenti,
    oreEquivalentiSenzaInerzia: r.oreEquivalentiSenzaInerzia,
    oreEquivalentiInFrigo: r.oreEquivalentiInFrigo,
    costanteTempoOre: r.costanteTempoOre,
    temperaturaUscitaFrigo: r.temperaturaUscitaFrigo,
    temperaturaAcqua: r.temperaturaAcqua,
    lievitoPerKgFarina: r.lievitoPerKgFarina,
    wEquivalente: r.wEquivalente,
    wEfficace: r.wEfficace,
    curva: r.curva.map((p) => [
      Number(p.ora.toFixed(6)),
      Number(p.temperatura.toFixed(6)),
      Number(p.attivita.toFixed(9)),
    ]),
    fasce: r.fasce.map((f) => [f.da, f.a, f.nome, f.inFrigo] as const),
  };
}

export function calcolaCaso(casoFase1: CasoFase1): RisultatoCalcolo {
  return calcola(casoFase1.input, DATA_FISSA);
}
