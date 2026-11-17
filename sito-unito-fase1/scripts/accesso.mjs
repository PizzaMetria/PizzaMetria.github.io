/**
 * Chiude la build: scrive `dist/accesso.json` con l'impronta della password.
 *
 * `npm run build`         → build pubblica (GitHub Pages): solo accesso.json,
 *                           i due tag e robots.txt restano come sono.
 * `npm run build:prova`   → build di prova: in più toglie i due tag da
 *                           `index.html` e riscrive robots.txt in `Disallow: /`.
 *
 * L'impronta si prende, nell'ordine: dalla riga di comando, da `.env.prova`
 * (la copia personale) o da `.env.accesso` (quella versionata, così la build
 * resta riproducibile anche su una macchina senza `.env.prova`).
 *
 * L'impronta si cambia con:  npm run impronta -- "nuova password"
 */
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const prove = process.argv.includes('--prova');

async function daFile(nome) {
  try {
    const testo = await readFile(new URL(`../${nome}`, import.meta.url), 'utf8');
    const riga = testo.split('\n').find((l) => l.trim().startsWith('VITE_ACCESSO_HASH='));
    return riga ? riga.split('=').slice(1).join('=').trim() : '';
  } catch {
    return '';
  }
}

const argomento = process.argv.slice(2).find((a) => /^[0-9a-f]{64}$/.test(a)) ?? '';
const impronta = argomento || (await daFile('.env.prova')) || (await daFile('.env.accesso'));

if (!impronta) {
  console.error(
    'Manca l\'impronta della password: mettila in sito-unito-fase1/.env.accesso\n' +
      "(la stampa `npm run impronta -- \"la password\"`).",
  );
  process.exit(1);
}

// Il file che il sito legge all'apertura.
await writeFile(
  new URL('accesso.json', dist),
  `${JSON.stringify({ impronta: Buffer.from(`pm1:${impronta}`, 'utf8').toString('base64') }, null, 2)}\n`,
  'utf8',
);

if (!prove) {
  console.log('accesso.json: password richiesta · tag e robots invariati (build pubblica)');
  process.exit(0);
}

// 1. Via i due tag: il sito di prova non manda statistiche.
const pagina = new URL('index.html', dist);
const righe = (await readFile(pagina, 'utf8')).split('\n');
const tenute = righe.filter(
  (riga) => !riga.includes('google-site-verification') && !riga.includes('cloudflareinsights'),
);
const tolti = righe.length - tenute.length;
await writeFile(pagina, tenute.join('\n'), 'utf8');

// 2. Il sito di prova non si fa scansionare, e non rimanda alla mappa pubblica.
//    `Disallow` toglie la scansione, non l'indirizzo dai risultati: per
//    escluderlo davvero servirebbe un `<meta name="robots" content="noindex">`
//    leggibile dal crawler, cioè l'opposto di `Disallow`. Qui basta chiudere la
//    porta, quindi niente meta.
await writeFile(
  new URL('robots.txt', dist),
  '# Sito di prova: scansione bloccata (Disallow non toglie l\'indirizzo dai risultati)\nUser-agent: *\nDisallow: /\n',
  'utf8',
);

console.log(`accesso.json: password richiesta · tag tolti: ${tolti} · robots: scansione bloccata`);
