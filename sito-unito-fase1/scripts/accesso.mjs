/**
 * Chiude la build di prova: tre passaggi, tutti qui, così lanciare
 * `npm run build:prova` produce esattamente ciò che si pubblica sul sito di
 * prova, senza ritocchi a mano.
 *
 *   1. pretende l'impronta della password in `.env.prova` (senza, la build
 *      uscirebbe aperta: meglio fermarsi che pubblicare un sito senza filtro);
 *   2. toglie da `dist/index.html` i due tag di Google e Cloudflare, perché il
 *      sito di prova non deve mandare statistiche né farsi indicizzare;
 *   3. scrive `dist/accesso.json` con l'impronta, avvolta in base64 con il
 *      prefisso `pm1:` così non si riconosce a occhio.
 *
 * L'impronta si cambia con:  npm run impronta -- "nuova password"
 */
import { readFile, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const env = new URL('../.env.prova', import.meta.url);

async function improntaDaEnv() {
  try {
    const testo = await readFile(env, 'utf8');
    const riga = testo.split('\n').find((l) => l.trim().startsWith('VITE_ACCESSO_HASH='));
    return riga ? riga.split('=').slice(1).join('=').trim() : '';
  } catch {
    return '';
  }
}

const impronta = process.argv[2]?.trim() || (await improntaDaEnv());

if (!impronta) {
  console.error(
    'Manca l\'impronta della password: aggiungi VITE_ACCESSO_HASH in sito-unito-fase1/.env.prova\n' +
      "(la stampa `npm run impronta -- \"la password\"`).\n" +
      'Per una build aperta usa `npm run build`.',
  );
  process.exit(1);
}

// 1. Via i due tag: il sito di prova non manda statistiche e non si fa indicizzare.
const pagina = new URL('index.html', dist);
const righe = (await readFile(pagina, 'utf8')).split('\n');
const tenute = righe.filter(
  (riga) => !riga.includes('google-site-verification') && !riga.includes('cloudflareinsights'),
);
const tolti = righe.length - tenute.length;
await writeFile(pagina, tenute.join('\n'), 'utf8');

// 2. Il file che il sito legge all'apertura.
await writeFile(
  new URL('accesso.json', dist),
  `${JSON.stringify({ impronta: Buffer.from(`pm1:${impronta}`, 'utf8').toString('base64') }, null, 2)}\n`,
  'utf8',
);

// 3. Il sito di prova non si fa scansionare: robots.txt chiude tutto e non
//    rimanda alla mappa del sito pubblico.
//
//    Attenzione al confine: `Disallow` toglie la scansione, non l'indirizzo dai
//    risultati — un link a questo sito può comunque farlo comparire. Per
//    escluderlo davvero servirebbe un `<meta name="robots" content="noindex">`
//    leggibile dal crawler, cioè l'opposto di `Disallow`: i due non si usano
//    insieme. Qui basta chiudere la porta, quindi niente meta.
await writeFile(
  new URL('robots.txt', dist),
  '# Sito di prova: scansione bloccata (Disallow non toglie l\'indirizzo dai risultati)\nUser-agent: *\nDisallow: /\n',
  'utf8',
);

console.log(`accesso.json: password richiesta · tag tolti: ${tolti} · robots: scansione bloccata`);
