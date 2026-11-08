#!/usr/bin/env node
/*
 * CONFRONTO FRA I TRE MOTORI — script di report
 * ---------------------------------------------
 * Riproduce in un unico posto i numeri del confronto fra:
 *   1. motore vecchio (emulazione del calcolatore precedente);
 *   2. motore nuovo senza inerzia (le ore equivalenti lette a scalini);
 *   3. motore nuovo con inerzia (il motore del sito).
 *
 * Perché esiste questo file: il confronto va rifatto ogni volta che si tocca
 * una costante, e rifarlo a mano è il modo più rapido per sbagliare. Le
 * formule sono ricopiate da src/lib (fermentazione.ts, inerzia.ts, vecchio.ts):
 * se cambiano là, vanno riportate qui. Il motore che conta resta quello in
 * src/lib, e i test lo verificano; questo script serve a leggere i tre lati
 * dello stesso caso.
 *
 * Uso: node scripts/confronto-motori.mjs
 */

const NUOVO = { a: -2.843854, b: 0.175803, c: -0.00168741 };
const VECCHIO = { a: -2.64024655, b: 0.15789607, c: -0.00140871 };

const limita = (valore, min, max) => Math.min(max, Math.max(min, valore));

const ritmoNuovo = (t) => {
  const x = limita(t, -2, 42);
  return Math.exp(NUOVO.a + NUOVO.b * x + NUOVO.c * x * x);
};
const NORMALE_20 = ritmoNuovo(20);
const fattoreNuovo = (t) => {
  const normalizzato = ritmoNuovo(t) / NORMALE_20;
  if (limita(t, -2, 42) <= 38) return normalizzato;
  return normalizzato * (1 - 0.04 * (limita(t, -2, 42) - 38) ** 1.5);
};
const ritmoVecchio = (t) => {
  const x = limita(t, -5, 40);
  return Math.exp(VECCHIO.a + VECCHIO.b * x + VECCHIO.c * x * x);
};

const RAMI = {
  verace: { K: 2.8656, E: 1.1978, h: -1.2 },
  contemporanea: { K: 2.99, E: 1.225, h: -0.3 },
  teglia: { K: 14.0668, E: 1.3589, h: -1.2 },
};
const RAMI_VECCHIO = {
  verace: { K: 3.9635, E: 1.2506, h: -1.2 },
  contemporanea: { K: 3.9635, E: 1.2506, h: -1.2 },
  teglia: { K: 11.755, E: 1.2059, h: -1.2 },
};

const fattoreSale = (s) =>
  (1.172 - 0.0655 * limita(s, 0, 8)) / (1.172 - 0.0655 * 2.5);
const fattoreOlio = (o) => 1 / (1 + 0.05 * limita(o, 0, 10));

function dose(tabellone, ramo, oreEq, idr, s, o) {
  const r = tabellone[ramo];
  const valore =
    (r.K * Math.pow(Math.max(oreEq, 0.5), -r.E) * Math.pow(limita(idr, 40, 100) / 62, r.h)) /
    (fattoreSale(s) * fattoreOlio(o));
  return limita(valore, 0.015, 3);
}

const forzaNuovo = (eq, frigo) =>
  Math.min(365, Math.round(162.657 + 5.8044 * Math.max(0, eq) + 2 * Math.max(0, frigo)));
// Da quando il W è a due orologi, anche il motore predefinito usa la stessa
// legge: cambia solo il modo di contare le ore equivalenti.
const forzaVecchio = (eq, frigo) => forzaNuovo(eq, frigo);

function tau(massa, forma) {
  const volume = massa / 1000 / 1100;
  const k = forma === 'panetto' ? 0.35 : 0.5;
  const raggio = Math.cbrt(volume / (2 * Math.PI * k));
  return (1100 * 3400 * ((k * raggio) / (1 + 2 * k))) / 5.5 / 3600;
}

function eqConInerzia(t, forma, massa, t0) {
  const fasi = [];
  if (t.prima > 0) fasi.push([t.prima, t.ta]);
  if (t.frigo > 0) fasi.push([t.frigo, t.tc]);
  if (t.dopo > 0) fasi.push([t.dopo, t.ta]);

  let temperatura = t0;
  let eq = 0;
  for (const [ore, ambiente] of fasi) {
    const passi = Math.max(1, Math.round(ore * 60));
    const dt = ore / passi;
    const decadimento = Math.exp(-dt / Math.max(tau(massa, forma), 1e-3));
    for (let i = 0; i < passi; i += 1) {
      const dopo = ambiente + (temperatura - ambiente) * decadimento;
      eq += ((fattoreNuovo(temperatura) + fattoreNuovo(dopo)) / 2) * dt;
      temperatura = dopo;
    }
  }
  return eq;
}

function eqVecchio(t, t0) {
  const fasi = [];
  if (t.prima > 0) fasi.push([t.prima, t.ta, false]);
  if (t.frigo > 0) fasi.push([t.frigo, t.tc, true]);
  if (t.dopo > 0) fasi.push([t.dopo, t.ta, false]);

  let temperatura = t0;
  let eq = 0;
  for (let indice = 0; indice < fasi.length; indice += 1) {
    const [ore, ambiente, inFrigo] = fasi[indice];
    const dopoFrigo = !inFrigo && t.frigo > 0 && indice === fasi.length - 1 && t.dopo > 0;
    const costante = inFrigo ? 2.3 : dopoFrigo ? 0.39 : 3;
    const passi = Math.max(1, Math.round(ore * 60));
    const dt = ore / passi;
    const decadimento = Math.exp(-dt / costante);
    for (let i = 0; i < passi; i += 1) {
      const dopo = ambiente + (temperatura - ambiente) * decadimento;
      eq += ((ritmoVecchio(temperatura) + ritmoVecchio(dopo)) / 2) * dt;
      temperatura = dopo;
    }
  }
  return eq;
}

const eqSenzaInerzia = (t) =>
  t.prima * fattoreNuovo(t.ta) + t.frigo * fattoreNuovo(t.tc) + t.dopo * fattoreNuovo(t.ta);

const CASI = [
  { nome: 'verace 8 h a 20 °C', ramo: 'verace', idr: 62, sale: 2.5, olio: 0, malto: 0, pezzi: 6, peso: 250, forma: 'panetto', tempi: { prima: 0, frigo: 0, dopo: 8, ta: 20, tc: 4 } },
  { nome: 'contemporanea 1+18+5 (75%)', ramo: 'contemporanea', idr: 75, sale: 2.5, olio: 0, malto: 0, pezzi: 6, peso: 280, forma: 'panetto', tempi: { prima: 1, frigo: 18, dopo: 5, ta: 20, tc: 4 } },
  { nome: 'contemporanea 4+12+1 (70%)', ramo: 'contemporanea', idr: 70, sale: 2.5, olio: 0, malto: 0, pezzi: 3, peso: 280, forma: 'panetto', tempi: { prima: 4, frigo: 12, dopo: 1, ta: 20, tc: 4 } },
  { nome: 'teglia 30×40 · 6 h (70%)', ramo: 'teglia', idr: 70, sale: 2.5, olio: 2, malto: 1, pezzi: 1, peso: 660, forma: 'massa', tempi: { prima: 0, frigo: 0, dopo: 6, ta: 20, tc: 4 } },
  { nome: 'contemporanea 1+48+6 (65%)', ramo: 'contemporanea', idr: 65, sale: 2.5, olio: 0, malto: 0, pezzi: 6, peso: 280, forma: 'panetto', tempi: { prima: 1, frigo: 48, dopo: 6, ta: 20, tc: 4 } },
  { nome: 'verace 24 h a 20 °C', ramo: 'verace', idr: 62, sale: 2.5, olio: 0, malto: 0, pezzi: 6, peso: 250, forma: 'panetto', tempi: { prima: 0, frigo: 0, dopo: 24, ta: 20, tc: 4 } },
  { nome: 'teglia 24 h frigo + 2 h (70%)', ramo: 'teglia', idr: 70, sale: 2.5, olio: 2, malto: 1, pezzi: 1, peso: 660, forma: 'massa', tempi: { prima: 0, frigo: 24, dopo: 2, ta: 20, tc: 4 } },
];

const T0 = 21;
const righe = [];

for (const caso of CASI) {
  const impasto = caso.pezzi * caso.peso;
  const denominatore = 1 + (caso.idr + caso.sale + caso.olio + caso.malto) / 100;
  const farina = Math.round(impasto / denominatore);
  const totale = caso.tempi.prima + caso.tempi.frigo + caso.tempi.dopo;

  const eqV = eqVecchio(caso.tempi, T0);
  const eqS = eqSenzaInerzia(caso.tempi);
  const eqI = eqConInerzia(caso.tempi, caso.forma, caso.peso, T0);

  const dV = dose(RAMI_VECCHIO, caso.ramo, eqV, caso.idr, caso.sale, caso.olio);
  const dS = dose(RAMI, caso.ramo, eqS, caso.idr, caso.sale, caso.olio);
  const dI = dose(RAMI, caso.ramo, eqI, caso.idr, caso.sale, caso.olio);

  // Il W del motore vecchio usa le SUE ore equivalenti e le ore di frigo reali,
  // non le ore totali: la legge è quella a due orologi.
  righe.push({ caso, farina, eqV, eqS, eqI, dV, dS, dI, wV: forzaVecchio(eqV, caso.tempi.frigo), wS: forzaNuovo(eqS, caso.tempi.frigo), wI: forzaNuovo(eqI, caso.tempi.frigo) });
}

const cella = (eq, d, farina, w) =>
  `${eq.toFixed(2)} h · ${(d * 10).toFixed(2)} g/kg · ${((d * farina) / 100).toFixed(2)} g · W ${w}`;

// Ore equivalenti con quattro decimali: servono a ricostruire a mano i W della
// tabella quando due valori cadono vicini a un arrotondamento.
if (process.argv.includes('--dettaglio')) {
  for (const r of righe) {
    console.log(
      `${r.caso.nome}: eq ${r.eqV.toFixed(4)} · frigo ${r.caso.tempi.frigo} h → W ${r.wV}`,
    );
  }
}

console.log('| caso | vecchio | nuovo senza inerzia | nuovo con inerzia |');
console.log('|---|---|---|---|');
for (const r of righe) {
  console.log(`| ${r.caso.nome} | ${cella(r.eqV, r.dV, r.farina, r.wV)} | ${cella(r.eqS, r.dS, r.farina, r.wS)} | ${cella(r.eqI, r.dI, r.farina, r.wI)} |`);
}

console.log('\n## Scarto massimo fra i tre motori sullo stesso caso');
for (const r of righe) {
  const dosi = [r.dV, r.dS, r.dI];
  const scarto = (Math.max(...dosi) / Math.min(...dosi) - 1) * 100;
  console.log(`- ${r.caso.nome}: ${scarto.toFixed(0)}%`);
}

// --- Sensibilità: portare il caso 2 a 1,50 g senza toccare il caso 1 ---
const caso1 = righe[1];
const caso2 = righe[2];
const attuale2 = (caso2.dI * caso2.farina) / 100;
const obiettivo = 1.5;
const k = obiettivo / attuale2;
const K = RAMI.contemporanea.K * k;

console.log('\n## Caso 2 verso 1,50 g');
console.log(`- attuale: ${attuale2.toFixed(2)} g (${(caso2.dI * 10).toFixed(2)} g/kg)`);
console.log(`- per arrivare a ${obiettivo.toFixed(2)} g serve K = ${K.toFixed(3)} (adesso ${RAMI.contemporanea.K}), cioè +${((k - 1) * 100).toFixed(1)}%`);
console.log(`- il caso 1 passerebbe da ${((caso1.dI * caso1.farina) / 100).toFixed(2)} g a ${((caso1.dI * k * caso1.farina) / 100).toFixed(2)} g (${(caso1.dI * k * 10).toFixed(2)} g/kg)`);
console.log(`- lo scarto dal riferimento sulla contemporanea passerebbe da +15,9% a +${((1.159 * k - 1) * 100).toFixed(1)}%`);
console.log(`- differenza di ore equivalenti fra i due casi: ${(((caso1.eqI - caso2.eqI) / caso2.eqI) * 100).toFixed(1)}%`);

const rapportoAttuale = Math.pow(70 / 75, RAMI.contemporanea.h);
const hNecessario = Math.log(rapportoAttuale * k) / Math.log(70 / 75);
const EAttuale = Math.pow(caso2.eqI / caso1.eqI, -RAMI.contemporanea.E);
// Il rapporto di ore è < 1, quindi il logaritmo cambia segno: si prende il
// valore assoluto, che è l'esponente che servirebbe.
const ENecessario = Math.abs(Math.log(EAttuale * k) / Math.log(caso2.eqI / caso1.eqI));
console.log(`- per muovere SOLO il caso 2 servirebbe h = ${hNecessario.toFixed(2)} (adesso -0,30, misurato -1,20)`);
console.log(`- oppure E = ${ENecessario.toFixed(2)} (adesso 1,225)`);

// --- Teglia: proposta di calibrazione separata (non applicata) ---
const tegliaFrigo = righe[6];
const c = (8.33 - tegliaFrigo.eqI) / 24;
console.log('\n## Teglia e Bonci');
console.log(`- 24 h in frigo: ${(tegliaFrigo.dI * 10).toFixed(2)} g/kg · Bonci 7,5 · riferimento interpolato ~14,8`);
console.log(`- per arrivare a 7,5 servirebbe contare le ore di frigo anche nella dose: eq' = eq + ${c.toFixed(3)} · oreFrigo`);
const eqPrima = tegliaFrigo.eqI + c * 24;
const dPrima = dose(RAMI, 'teglia', eqPrima, 70, 2.5, 2) * 10;
console.log(`- controllo: 24 h frigo → eq' ${eqPrima.toFixed(2)} → ${dPrima.toFixed(2)} g/kg (Bonci 7,5)`);
const seiOre = righe[3];
console.log(`- controllo: 6 h a temperatura ambiente → invariato ${(seiOre.dI * 10).toFixed(2)} g/kg (riferimento 12,1)`);
