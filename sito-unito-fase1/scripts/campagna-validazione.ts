import { writeFileSync } from 'node:fs';
import {
  FASCE,
  PESO_FRIGO_FERM,
  PESO_FRIGO_W,
  RICETTE_12,
  SOGLIE,
  calcolaMiniRicetta,
  intervalloDose,
  pesiFusione,
  pesiInParole,
} from '../src/lib/miniricette';
import type { Fascia, Formato12 } from '../src/lib/miniricette';

/*
 * CAMPAGNA DI VALIDAZIONE POST-CORREZIONE
 * 120 casi (10 per mini-ricetta), con confronto prima/dopo rispetto alla
 * campagna del 5 novembre. Non modifica il modello: misura e scrive in files/.
 */

type Ricetta = 'teglia' | 'verace' | 'contemporanea';
const RICETTE: Ricetta[] = ['teglia', 'verace', 'contemporanea'];

const MASSE: Record<Ricetta, number[]> = {
  teglia: [660, 900, 1200],
  verace: [1000, 1500],
  contemporanea: [1120, 1680],
};

const FORMATI: Record<Ricetta, Formato12[]> = {
  teglia: ['teglia', 'pala'],
  verace: ['tonda', 'pala'],
  contemporanea: ['tonda', 'pala'],
};

/** Ancore del W prima della correzione 3. */
const ANCORE_W_PRIMA: Record<Ricetta, readonly number[]> = {
  teglia: [268, 285, 295, 325, 348],
  verace: [205, 248, 270, 296, 320],
  contemporanea: [249, 267, 287, 317, 340],
};

const FONTE: Record<Ricetta, string> = {
  teglia: 'Pizza Romana 2–10 g fresco/kg · pratica 24 h frigo 0,3–0,4%',
  verace: 'AVPN 0,1–3 g/litro (≈0,02–0,18%) · pratica 8–24 h 0,1–0,3%',
  contemporanea: 'AVPN · pratica 24 h frigo 0,2–0,4% a 75% di idratazione',
};

/** Finestra pratica per fascia del lievito, in % di fresco sulla farina. */
const FINESTRE: Record<Ricetta, readonly (readonly [number, number])[]> = {
  teglia: [[0.5, 2.5], [0.3, 1.0], [0.12, 0.5], [0.04, 0.25]],
  verace: [[0.1, 1.2], [0.03, 0.4], [0.015, 0.25], [0.005, 0.15]],
  contemporanea: [[0.15, 1.3], [0.05, 0.45], [0.02, 0.25], [0.008, 0.15]],
};

/** Correzione 4: la teglia che matura in frigo ha una finestra propria. */
const FINESTRA_TEGLIA_FRIGO: readonly [number, number] = [0.2, 0.45];
/**
 * Raffinamento approvato: la finestra con frigo vale solo per gli impasti lunghi.
 * La sola quota di frigo non basta: media-08 e media-09 stanno al 69–71% di frigo ma a
 * 13,7–14,7 h equivalenti, e restano nella finestra ordinaria della fascia media.
 */
const SOGLIA_EQ_FRIGO = 16;

const H_PRIMA = [0, 1, 2, 3, 4, 6, 8];
const H_FRIGO = [0, 2, 4, 8, 12, 16, 20, 24, 30, 36, 40, 44];
const H_DOPO = [0.5, 1, 2, 3, 4, 6];
const TA = [18, 20, 23, 26];
const TC = [2, 4, 6];

interface Profilo {
  hPrima: number;
  hFrigo: number;
  hDopo: number;
  ta: number;
  tc: number;
}

interface Variante {
  di: number;
  sale: number;
  olio: number;
  massa: 'rif' | 'alta' | 'bassa';
  formato: 0 | 1;
}

const VARIANTI: Variante[] = [
  { di: 0, sale: -1, olio: -1, massa: 'rif', formato: 0 },
  { di: 4, sale: -1, olio: -1, massa: 'rif', formato: 0 },
  { di: -4, sale: -1, olio: -1, massa: 'rif', formato: 0 },
  { di: 0, sale: 2.0, olio: -1, massa: 'rif', formato: 0 },
  { di: 0, sale: 3.0, olio: -1, massa: 'rif', formato: 0 },
  { di: 0, sale: -1, olio: 2, massa: 'rif', formato: 0 },
  { di: 0, sale: -1, olio: -1, massa: 'alta', formato: 0 },
  { di: 0, sale: -1, olio: -1, massa: 'bassa', formato: 0 },
  { di: 0, sale: -1, olio: -1, massa: 'rif', formato: 1 },
  { di: 5, sale: 2.2, olio: 1, massa: 'alta', formato: 0 },
];

function centro(b: number): number {
  return Math.sqrt(SOGLIE[b] * SOGLIE[b + 1]);
}

function curvaBanda(valori: readonly number[], b: number, x: number): number {
  const lo = SOGLIE[b];
  const hi = SOGLIE[b + 1];
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return valori[b] + (valori[b + 1] - valori[b]) * t;
}

function doseCurva(ricetta: Ricetta, x: number): number {
  const ric = RICETTE_12[ricetta];
  const pesi = pesiFusione(x);
  let dose = 0;
  FASCE.forEach((_, b) => {
    dose += pesi[b] * ric.ancoraD[b] * Math.pow(x / centro(b), -ric.esponenteDose);
  });
  return dose;
}

function wCurva(ricetta: Ricetta, x: number, ancore: readonly number[] = RICETTE_12[ricetta].ancoraW): number {
  const pesi = pesiFusione(x);
  let w = 0;
  FASCE.forEach((_, b) => {
    w += pesi[b] * curvaBanda(ancore, b, x);
  });
  return w;
}

function correzioni(ricetta: Ricetta, idro: number, sale: number, olio: number, formato: Formato12): number {
  const ric = RICETTE_12[ricetta];
  const kIdro = Math.pow(idro / ric.idroRif, -1.2);
  const kSale = (1.172 - 0.0655 * sale) / (1.172 - 0.0655 * 2.5);
  const kOlio = 1 / (1 + 0.05 * olio);
  const kFormato = { teglia: 1.0, tonda: 0.95, pala: 1.0, focaccia: 1.1 }[formato] /
    { teglia: 1.0, tonda: 0.95, pala: 1.0, focaccia: 1.1 }[ric.formato];
  return kIdro * kSale * kOlio * kFormato;
}

/** Quota di ore equivalenti passate in cella sul totale. */
function quotaFrigo(iFerm: number, iMat: number): number {
  const freddo = (iMat - iFerm) / (PESO_FRIGO_W - PESO_FRIGO_FERM);
  if (freddo <= 0) return 0;
  const ambiente = iFerm - PESO_FRIGO_FERM * freddo;
  return freddo / (ambiente + freddo);
}

interface Caso {
  id: string;
  ricetta: Ricetta;
  fascia: Fascia;
  profilo: Profilo;
  idro: number;
  sale: number;
  olio: number;
  massa: number;
  formato: Formato12;
  esito: ReturnType<typeof calcolaMiniRicetta>;
}

function costruisci(ricetta: Ricetta, fascia: Fascia, profilo: Profilo, variante: Variante, indice: number): Caso | null {
  const ric = RICETTE_12[ricetta];
  const masse = MASSE[ricetta];
  const massa = variante.massa === 'alta' ? masse[masse.length - 1] : variante.massa === 'bassa' ? masse[0] : masse[Math.min(1, masse.length - 1)];
  const idro = ric.idroRif + variante.di;
  const sale = variante.sale > 0 ? variante.sale : ric.sale;
  const olio = variante.olio >= 0 ? variante.olio : ric.olio;
  const formato = FORMATI[ricetta][variante.formato];
  const esito = calcolaMiniRicetta({ ricetta, ...profilo, t0: 21, idro, sale, olio, massa, formato });
  if (esito.fasciaW !== fascia || esito.fuoriDominio) return null;
  return {
    id: `${ricetta}-${fascia}-${String(indice + 1).padStart(2, '0')}`,
    ricetta,
    fascia,
    profilo,
    idro,
    sale,
    olio,
    massa,
    formato,
    esito,
  };
}

function selezionaCasi(ricetta: Ricetta, fascia: Fascia): Caso[] {
  const b = FASCE.indexOf(fascia);
  const lo = SOGLIE[b];
  const hi = SOGLIE[b + 1];
  const obiettivi: number[] = [];
  for (let k = 0; k < 10; k += 1) {
    const t = 0.02 + (0.96 * k) / 9;
    obiettivi.push(Math.exp(Math.log(lo) * (1 - t) + Math.log(hi) * t));
  }

  const ric = RICETTE_12[ricetta];
  const massaRif = MASSE[ricetta][Math.min(1, MASSE[ricetta].length - 1)];
  const candidati: { profilo: Profilo; iMat: number; iFerm: number }[] = [];
  for (const hPrima of H_PRIMA) {
    for (const hFrigo of H_FRIGO) {
      for (const hDopo of H_DOPO) {
        for (const ta of TA) {
          for (const tc of TC) {
            const profilo = { hPrima, hFrigo, hDopo, ta, tc };
            const esito = calcolaMiniRicetta({
              ricetta,
              ...profilo,
              t0: 21,
              idro: ric.idroRif,
              sale: ric.sale,
              olio: ric.olio,
              massa: massaRif,
            });
            if (esito.fasciaW === fascia && !esito.fuoriDominio) {
              candidati.push({ profilo, iMat: esito.iMat, iFerm: esito.iFerm });
            }
          }
        }
      }
    }
  }

  candidati.sort((a, c) => a.iFerm - c.iFerm);
  const conQuintile = candidati.map((c, i) => ({ ...c, q: Math.min(4, Math.floor((i * 5) / candidati.length)) }));

  const usati = new Set<string>();
  const casi: Caso[] = [];

  obiettivi.forEach((obiettivo, indice) => {
    const preferiti = conQuintile.filter((c) => c.q === indice % 5);
    const pool = preferiti.length >= 20 ? preferiti : conQuintile;
    const ordinati = [...pool].sort(
      (a, c) => Math.abs(Math.log(a.iMat / obiettivo)) - Math.abs(Math.log(c.iMat / obiettivo)),
    );
    for (const candidato of ordinati) {
      const chiave = JSON.stringify(candidato.profilo);
      if (usati.has(chiave)) continue;
      for (const offset of [0, 1, -1, 2, -2, 3, -3, 4]) {
        const variante = VARIANTI[(indice + offset + VARIANTI.length) % VARIANTI.length];
        const caso = costruisci(ricetta, fascia, candidato.profilo, variante, indice);
        if (caso) {
          usati.add(chiave);
          casi.push(caso);
          return;
        }
      }
    }
  });

  return casi;
}

interface Giudizio {
  esito: 'ok' | 'dubbio' | 'non accettabile';
  nota: string;
  finestra: readonly [number, number];
  etichetta: string;
}

function giudizioPratico(ricetta: Ricetta, fascia: Fascia, percentuale: number, shareFrigo: number, iMat: number): Giudizio {
  const b = FASCE.indexOf(fascia);
  const conFrigo = ricetta === 'teglia' && fascia === 'media' && shareFrigo > 0 && iMat > SOGLIA_EQ_FRIGO;
  const finestra = conFrigo ? FINESTRA_TEGLIA_FRIGO : FINESTRE[ricetta][b];
  const testoFinestra = `${finestra[0].toFixed(2).replace('.', ',')}–${finestra[1].toFixed(2).replace('.', ',')}%`;
  const etichetta = conFrigo ? `${testoFinestra} (con frigo)` : testoFinestra;
  const [lo, hi] = finestra;
  if (percentuale >= lo && percentuale <= hi) return { esito: 'ok', nota: '', finestra, etichetta };
  if (percentuale < lo) {
    const fattore = lo / percentuale;
    return {
      esito: fattore <= 1.5 ? 'dubbio' : 'non accettabile',
      nota: `sotto ${etichetta} (${fattore.toFixed(1).replace('.', ',')}× il minimo)`,
      finestra,
      etichetta,
    };
  }
  const fattore = percentuale / hi;
  return {
    esito: fattore <= 1.5 ? 'dubbio' : 'non accettabile',
    nota: `sopra ${etichetta} (${fattore.toFixed(1).replace('.', ',')}× il massimo)`,
    finestra,
    etichetta,
  };
}

const numero = (v: number, c = 1): string => v.toFixed(c).replace('.', ',');

const tutti: Caso[] = [];
for (const ricetta of RICETTE) {
  for (const fascia of FASCE) {
    tutti.push(...selezionaCasi(ricetta, fascia));
  }
}

const righe: string[] = [
  'id;ricetta;mini_ricetta_W;banda_dose;prima_h;frigo_h;dopo_h;ta_C;tc_C;idro_pct;sale_pct;olio_pct;massa_g;formato;indice_ferm_h;indice_mat_h;pesi_lievito;W;fascia_dichiarata;fascia_effettiva;dose_g_kg;intervallo_g_kg;percentuale_fresco;lievito_g;finestra_usata;fonte;W_in_fascia;dose_su_curva;dose_in_intervallo;causa_fuori_intervallo;giudizio;nota;W_prima;intervallo_prima;coerenza_prima;giudizio_prima;anomalia_prima',
];

const perMini: Record<string, Caso[]> = {};
const wFuori: string[] = [];
const curvaRotta: string[] = [];
const fuoriIntervallo: string[] = [];
const nonAccettabili: string[] = [];
const dubbi: string[] = [];
const anomaliePrima: string[] = [];
let casiCambiatiW = 0;

for (const caso of tutti) {
  const esito = caso.esito;
  const b = FASCE.indexOf(esito.fasciaLievito);
  const [loD, hiD] = intervalloDose(caso.ricetta, b, esito.fattoreDose);
  const kTotale = correzioni(caso.ricetta, caso.idro, caso.sale, caso.olio, caso.formato);
  const doseBase = esito.doseGkg / kTotale;
  const attesa = doseCurva(caso.ricetta, esito.iFerm);
  const scartoCurva = Math.abs(doseBase - attesa) / attesa;
  const wInFascia = esito.w >= esito.fasciaEffettiva[0] && esito.w <= esito.fasciaEffettiva[1];
  const aperto = esito.iFerm < SOGLIE[0];
  const doseInIntervallo = aperto ? esito.doseGkg >= hiD - 0.051 : esito.doseGkg >= loD - 0.051 && esito.doseGkg <= hiD + 0.051;
  const share = quotaFrigo(esito.iFerm, esito.iMat);
  const giudizio = giudizioPratico(caso.ricetta, esito.fasciaLievito, esito.percentuale, share, esito.iMat);

  // --- stato prima della correzione ---
  const wPrima = Math.min(380, Math.max(150, Math.round(wCurva(caso.ricetta, esito.iMat, ANCORE_W_PRIMA[caso.ricetta]) + esito.affinamento)));
  const [loPrima, hiPrima] = intervalloDose(caso.ricetta, b);
  const wInFasciaPrima = wPrima >= esito.fasciaEffettiva[0] && wPrima <= esito.fasciaEffettiva[1];
  const doseInIntervalloPrima = esito.doseGkg >= loPrima - 0.051 && esito.doseGkg <= hiPrima + 0.051;
  const giudizioPrimaBase = giudizioPratico(caso.ricetta, esito.fasciaLievito, esito.percentuale, 0, 0);
  const anomalie: string[] = [];
  if (!wInFasciaPrima) anomalie.push('W');
  if (!doseInIntervalloPrima) anomalie.push('intervallo');
  if (giudizioPrimaBase.esito !== 'ok') anomalie.push('plausibilità');
  if (anomalie.length) {
    anomaliePrima.push(
      `${caso.id}: ${anomalie.join('+')} — W ${wPrima} in ${esito.fasciaEffettiva.join('–')}, dose ${esito.doseGkg.toFixed(2)} in ${loPrima}–${hiPrima}, ${esito.percentuale.toFixed(3)}% ${giudizioPrimaBase.nota}`,
    );
  }
  if (wPrima !== esito.w) casiCambiatiW += 1;

  let causa = '';
  if (!doseInIntervallo) {
    if (aperto) causa = 'pavimento: intervallo aperto sotto 4 h eq';
    else if (esito.iFerm > SOGLIE[b + 1]) causa = 'indice sopra la banda';
    else if (Math.abs(kTotale - 1) > 0.02) causa = `correzioni del caso (×${kTotale.toFixed(2)})`;
    else causa = 'fusione al bordo';
    fuoriIntervallo.push(`${caso.id}: ${esito.doseGkg.toFixed(2)} fuori da ${loD}–${hiD} (iFerm ${esito.iFerm.toFixed(2)}, ${causa})`);
  }
  if (!wInFascia) wFuori.push(`${caso.id}: W ${esito.w} fuori da ${esito.fasciaEffettiva.join('–')}`);
  if (scartoCurva > 1e-6) curvaRotta.push(`${caso.id}: ${doseBase.toFixed(3)} invece di ${attesa.toFixed(3)}`);
  if (giudizio.esito === 'non accettabile') nonAccettabili.push(`${caso.id} (${esito.fasciaLievito}): ${numero(esito.percentuale, 3)}% — ${giudizio.nota}`);
  if (giudizio.esito === 'dubbio') dubbi.push(`${caso.id} (${esito.fasciaLievito}): ${numero(esito.percentuale, 3)}% — ${giudizio.nota}`);

  const chiave = `${caso.ricetta}/${caso.fascia}`;
  (perMini[chiave] ??= []).push(caso);

  righe.push(
    [
      caso.id,
      caso.ricetta,
      caso.fascia,
      esito.fasciaLievito,
      numero(caso.profilo.hPrima, 1),
      numero(caso.profilo.hFrigo, 1),
      numero(caso.profilo.hDopo, 1),
      numero(caso.profilo.ta, 0),
      numero(caso.profilo.tc, 0),
      numero(caso.idro, 1),
      numero(caso.sale, 2),
      numero(caso.olio, 1),
      numero(caso.massa, 0),
      caso.formato,
      numero(esito.iFerm, 2),
      numero(esito.iMat, 2),
      pesiInParole(esito.pesiLievito),
      numero(esito.w, 0),
      `${esito.fasciaDichiarata[0]}–${esito.fasciaDichiarata[1]}`,
      `${esito.fasciaEffettiva[0]}–${esito.fasciaEffettiva[1]}`,
      numero(esito.doseGkg, 2),
      `${numero(loD, 1)}–${numero(hiD, 1)}`,
      numero(esito.percentuale, 3),
      numero(esito.lievitoG, 2),
      giudizio.etichetta,
      FONTE[caso.ricetta],
      wInFascia ? 'sì' : 'NO',
      scartoCurva < 1e-6 ? 'sì' : 'NO',
      doseInIntervallo ? 'sì' : 'NO',
      causa,
      giudizio.esito,
      giudizio.nota,
      numero(wPrima, 0),
      `${numero(loPrima, 1)}–${numero(hiPrima, 1)}`,
      wInFasciaPrima ? 'sì' : 'NO',
      giudizioPrimaBase.esito,
      anomalie.length ? anomalie.join('+') : '',
    ].join(';'),
  );
}

const bordi: string[] = [];
for (const ricetta of RICETTE) {
  for (const x of [8, 16, 24]) {
    const passo = 1e-6;
    const dPrima = doseCurva(ricetta, x - passo);
    const dDopo = doseCurva(ricetta, x + passo);
    const wPrima = wCurva(ricetta, x - passo);
    const wDopo = wCurva(ricetta, x + passo);
    bordi.push(
      `${ricetta} a ${x} h eq: dose ${(((dDopo - dPrima) / ((dPrima + dDopo) / 2)) * 100).toFixed(4)}% · W ${(wDopo - wPrima).toFixed(4)}`,
    );
  }
}

let saltoDoseMax = 0;
let saltoWMax = 0;
for (const ricetta of RICETTE) {
  for (let x = 3; x <= 47.99; x += 0.01) {
    const d1 = doseCurva(ricetta, x);
    const d2 = doseCurva(ricetta, x + 0.01);
    saltoDoseMax = Math.max(saltoDoseMax, (Math.abs(d2 - d1) / d1) * 100);
    saltoWMax = Math.max(saltoWMax, Math.abs(wCurva(ricetta, x + 0.01) - wCurva(ricetta, x)));
  }
}

const sintesi: string[] = [];
for (const ricetta of RICETTE) {
  for (const fascia of FASCE) {
    const casi = perMini[`${ricetta}/${fascia}`] ?? [];
    if (!casi.length) {
      sintesi.push(`${ricetta}/${fascia}: NESSUN CASO`);
      continue;
    }
    const p = casi.map((c) => c.esito.percentuale);
    const w = casi.map((c) => c.esito.w);
    const d = casi.map((c) => c.esito.doseGkg);
    const f = casi.map((c) => c.esito.iFerm);
    const m = casi.map((c) => c.esito.iMat);
    const conteggi = casi.reduce<Record<string, number>>((acc, c) => {
      const g = giudizioPratico(c.ricetta, c.esito.fasciaLievito, c.esito.percentuale, quotaFrigo(c.esito.iFerm, c.esito.iMat), c.esito.iMat).esito;
      acc[g] = (acc[g] ?? 0) + 1;
      return acc;
    }, {});
    sintesi.push(
      `${ricetta}/${fascia}: n=${casi.length} · iFerm ${Math.min(...f).toFixed(1)}–${Math.max(...f).toFixed(1)} · iMat ${Math.min(...m).toFixed(1)}–${Math.max(...m).toFixed(1)} · % fresco ${Math.min(...p).toFixed(3)}–${Math.max(...p).toFixed(3)} · dose ${Math.min(...d).toFixed(2)}–${Math.max(...d).toFixed(2)} g/kg · W ${Math.min(...w)}–${Math.max(...w)} · ok ${conteggi.ok ?? 0} / dubbi ${conteggi.dubbio ?? 0} / no ${conteggi['non accettabile'] ?? 0}`,
    );
  }
}

const testo = [
  `Casi: ${tutti.length}`,
  '',
  'SINTESI PER MINI-RICETTA (DOPO)',
  ...sintesi,
  '',
  `ANOMALIE PRIMA DELLA CORREZIONE (${anomaliePrima.length})`,
  ...anomaliePrima,
  '',
  `W CAMBIATO DALLA CORREZIONE 3: ${casiCambiatiW} casi su ${tutti.length}`,
  '',
  `W FUORI DALLA FASCIA (${wFuori.length})`,
  ...wFuori,
  '',
  `DOSE NON SULLA CURVA (${curvaRotta.length})`,
  ...curvaRotta,
  '',
  `DOSE FUORI DALL'INTERVALLO STAMPATO (${fuoriIntervallo.length})`,
  ...fuoriIntervallo,
  '',
  `NON ACCETTABILI (${nonAccettabili.length})`,
  ...nonAccettabili,
  '',
  `DUBBI (${dubbi.length})`,
  ...dubbi,
  '',
  'SALTI AI BORDI',
  ...bordi,
  `Passo massimo per 0,01 h eq: dose ${saltoDoseMax.toFixed(4)}% · W ${saltoWMax.toFixed(4)}`,
].join('\n');

console.log(testo);

writeFileSync('../files/validazione-post-ricalibrazione-casi.csv', righe.join('\n') + '\n', 'utf8');
writeFileSync('../files/validazione-post-ricalibrazione-sintesi.txt', testo + '\n', 'utf8');
