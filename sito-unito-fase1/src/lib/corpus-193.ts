/*
 * IL CORPUS DELLE 193
 * -------------------
 * Le ricette italiane dirette raccolte per tarare il modello. Stanno in
 * `artifacts/calcolatori/ricette-italiane.json`, fuori dall'app: servono ai
 * test e agli script, non al sito.
 *
 * Il dataset non ha un campo «prefermento»: si escludono le ricette che lo
 * dichiarano nel nome. È un'euristica, ma meglio che trattare una biga come
 * impasto diretto.
 *
 * Questo modulo esiste per non avere due copie della stessa lettura: lo usano
 * sia `scripts/confronto-193.ts` sia `corpus-193.test.ts`.
 */
import grezze from '../../../artifacts/calcolatori/ricette-italiane.json';
import type { InputCalcolo, Modello, Ramo } from '../types';

interface Ricetta {
  nome: string;
  tipo: string;
  farina_g: string | number;
  idro: string | number;
  lievito_fresco_g: string | number;
  ore_ta: string | number | null;
  ore_frigo: string | number | null;
  t_amb: string | number | null;
  t_frigo: string | number | null;
  url: string;
}

export const PREFERMENTO = /biga|poolish|preferment|impasto doppio|doppio impasto|madre|liquido/i;

export interface RicettaDiretta {
  nome: string;
  tipo: string;
  ramo: Ramo;
  idratazione: number;
  farinaG: number;
  lievitoG: number;
  oreTa: number;
  oreFrigo: number;
  ta: number;
  tc: number;
  /** Dose dichiarata dalla ricetta, in percentuale sulla farina. */
  reale: number;
}

function numero(valore: string | number | null | undefined, difetto: number | null = null): number | null {
  if (valore === null || valore === undefined) return difetto;
  if (typeof valore === 'number') return valore;
  const testo = valore.trim().replace(/\s/g, '').replace(',', '.');
  if (!testo) return difetto;
  const n = Number(testo);
  return Number.isFinite(n) ? n : difetto;
}

export function ramoDi(tipo: string): Ramo {
  if (tipo === 'teglia' || tipo === 'pala') return 'teglia';
  if (tipo === 'contemporanea') return 'contemporanea';
  return 'verace';
}

/** Le ricette dirette utilizzabili: farina, lievito e idratazione dichiarati. */
export function caricaCorpus(): RicettaDiretta[] {
  const ricette = grezze as Ricetta[];
  const dirette: RicettaDiretta[] = [];

  for (const r of ricette) {
    if (PREFERMENTO.test(r.nome ?? '')) continue;
    const farinaG = numero(r.farina_g);
    const lievitoG = numero(r.lievito_fresco_g);
    const idratazione = numero(r.idro);
    if (!farinaG || farinaG <= 0 || !lievitoG || lievitoG <= 0 || !idratazione || idratazione <= 0) {
      continue;
    }

    dirette.push({
      nome: r.nome ?? '',
      tipo: r.tipo,
      ramo: ramoDi(r.tipo),
      idratazione,
      farinaG,
      lievitoG,
      oreTa: numero(r.ore_ta, 0) ?? 0,
      oreFrigo: numero(r.ore_frigo, 0) ?? 0,
      ta: numero(r.t_amb, 22) ?? 22,
      tc: numero(r.t_frigo, 4) ?? 4,
      reale: (100 * lievitoG) / farinaG,
    });
  }

  return dirette;
}

/**
 * Le righe identiche — stessa farina, stesso lievito, stessi tempi — sono la
 * stessa ricetta ripubblicata su più pagine: contarle tutte gonfia il gruppo che
 * insiste di più senza aggiungere una prova. Si tiene la prima.
 */
export function deduplica(righe: readonly RicettaDiretta[]): RicettaDiretta[] {
  const viste = new Set<string>();
  const uniche: RicettaDiretta[] = [];

  for (const riga of righe) {
    // Tutte le quantità dichiarate entrano nella chiave: due ricette con gli
    // stessi grammi ma idratazione diversa sono due ricette, non una copia.
    const chiave = [
      riga.farinaG,
      riga.lievitoG,
      riga.idratazione,
      riga.oreTa,
      riga.oreFrigo,
    ].join('|');
    if (viste.has(chiave)) continue;
    viste.add(chiave);
    uniche.push(riga);
  }

  return uniche;
}

export function inputCorpus(r: RicettaDiretta, modello: Modello): InputCalcolo {
  return {
    tipo: r.ramo,
    ramo: r.ramo,
    idratazione: r.idratazione,
    sale: 2.5,
    olio: 0,
    malto: 0,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'farina',
    numeroPanetti: 6,
    pesoPanettoG: 250,
    farinaG: r.farinaG,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: {
      oreTotali: r.oreTa + r.oreFrigo,
      oreFrigo: r.oreFrigo,
      oreTaPrima: 0,
      oreTaDopo: r.oreTa,
      ta: r.ta,
      tc: r.tc,
    },
    staglio: 'prima',
    modello,
    temperaturaImpasto: r.ta,
    temperaturaFarina: r.ta,
    riscaldamento: 0,
    correzioneLievito: 0,
  };
}
