#!/usr/bin/env node
/*
 * Interroga riferimento e stampa la dose per la geometria indicata.
 *
 *   node docs/riferimento/misura.mjs <pezzi> <g/pezzo> <ore> <oreFrigo> <idro> <sale%> <olio%> <pNapol>
 *
 * Esempio, la verace: node docs/riferimento/misura.mjs 3 250 28.7 20.5 62 2.5 0 1
 * Senza argomenti usa la verace.
 *
 * La percentuale si ricava dai grammi (lievito / farina): il campo 8 della
 * risposta è arrotondato a due decimali e a queste dosi mente di proposito.
 */

const argomenti = process.argv.slice(2).map(Number);
const [pezzi, grammi, ore, frigo, idro, sale, olio, napoletana] = [
  ...argomenti,
  ...[3, 250, 28.7, 20.5, 62, 2.5, 0, 1].slice(argomenti.length),
];

const gPerLitro = (percentuale) => ((percentuale * 10) / (idro / 100)).toFixed(1);

const url =
  'https://www.sito di riferimento/calcola.php' +
  '?impBase=1&lievitoLdb=1&percAcqua=1&LM=0&BIGA=0&tipoLdb=0' +
  `&pNapol=${napoletana}&text1=${pezzi}&text2=${grammi}&text3=${idro}` +
  `&textA=${gPerLitro(sale)}&textB=${gPerLitro(olio)}` +
  `&textC=${ore}&textD=${frigo}&text4=20&text5=4&text6=0&ult_calc=0`;

const risposta = await fetch(url).then((r) => r.text());
const campi = risposta.replace(/^\uFEFF/, '').split('-');

const farina = Number(campi[1]);
const lievito = Number(campi[5]);
const w = Number(campi[8]);
const percentuale = (lievito / farina) * 100;

console.log(
  `riferimento · ${pezzi} × ${grammi} g · ${ore} h (${frigo} in frigo) · ${idro}% · sale ${sale}% · olio ${olio}%`,
);
console.log(
  `farina ${farina} g · lievito ${lievito} g · ${percentuale.toFixed(4)}% · W ${w}`,
);
console.log(
  `controllo: campi 12-13 = ${campi[11]}-${campi[12]} (36% e 50,4% della massa, non una finestra)`,
);
