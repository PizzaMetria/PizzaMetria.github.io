import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const asset = (await readdir(new URL('assets/', dist))).sort().map((nome) => `./assets/${nome}`);
const pdf = asset.filter((nome) => /\/(?:PaginePdf-|pdf-|pdf\.worker\.min-)/.test(nome));
for (const prefisso of ['PaginePdf-', 'pdf-', 'pdf.worker.min-']) {
  if (!pdf.some((nome) => nome.startsWith(`./assets/${prefisso}`))) {
    throw new Error(`Asset PDF mancante nella build: ${prefisso}`);
  }
}

const urlWorker = new URL('sw.js', dist);
const worker = await readFile(urlWorker, 'utf8');
const hash = createHash('sha256').update(worker);
const radice = (await readdir(dist, { withFileTypes: true }))
  .filter((voce) => voce.isFile() && voce.name !== 'sw.js')
  .map((voce) => `./${voce.name}`).sort();
for (const nome of [...radice, ...asset]) {
  hash.update(nome).update(await readFile(new URL(nome, dist)));
}
const configurazione = {
  versione: hash.digest('hex').slice(0, 16),
  sito: asset.filter((nome) => !pdf.includes(nome)),
  pdf,
};
await writeFile(urlWorker, worker.replace(
  'const BUILD = null;',
  `const BUILD = ${JSON.stringify(configurazione)};`,
));
