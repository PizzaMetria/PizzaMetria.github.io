/*
 * SERVICE WORKER DI PIZZAMETRIA
 * -----------------------------
 * Serve a due cose: rendere il sito installabile da Chrome e lasciarlo
 * funzionare quando la rete manca. La copia è prima di tutto locale — il
 * guscio (pagina, manifest, icone) resta in cache dall'installazione, i file
 * compilati hanno un nome diverso a ogni versione e quindi si possono tenere
 * in cache senza rischiare di mostrare una versione vecchia.
 *
 * Le pagine si chiedono sempre alla rete: quando esce una versione nuova la si
 * vede subito, e se la rete non c'è si apre l'ultima copia salvata.
 *
 * I pacchetti .apk non entrano mai in cache: sono grandi e non servono per
 * far funzionare il sito.
 */

// Il build sostituisce questa riga con la versione e gli asset effettivi.
const BUILD = null;
const CACHE = `pizzametria-${BUILD?.versione ?? 'dev'}`;
const CACHE_PDF = `${CACHE}-pdf`;
const ASSET_PDF = new Set((BUILD?.pdf ?? []).map(
  (nome) => new URL(nome, self.registration.scope).href,
));
/** Tutte le cache del progetto cominciano così: le altre non si toccano. */
const PREFISSO = 'pizzametria-';

const GUSCIO = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([...GUSCIO, ...(BUILD?.sito ?? [])]))
      .then(async () => {
        if (!BUILD?.pdf.length) return;
        // La mancata disponibilità del PDF non impedisce l'installazione del sito.
        try {
          const cachePdf = await caches.open(CACHE_PDF);
          await cachePdf.addAll(BUILD.pdf);
        } catch {
          // Gli asset restano recuperabili alla prima apertura online.
        }
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chiavi) =>
        Promise.all(
          chiavi
            // Solo le versioni vecchie di questo progetto: un'altra app sulla
            // stessa origine ha diritto alla sua cache.
            .filter((chiave) => chiave.startsWith(PREFISSO) && chiave !== CACHE && chiave !== CACHE_PDF)
            .map((chiave) => caches.delete(chiave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;
  // I pacchetti da scaricare non si mettono in cache.
  if (url.pathname.includes('/apk/')) return;

  // Pagine: prima la rete, la copia salvata solo se la rete non risponde.
  if (richiesta.mode === 'navigate') {
    evento.respondWith(
      fetch(richiesta)
        .then((risposta) => {
          // Solo una pagina vera va in cache. Un 503 di manutenzione o un errore
          // del server, salvato sotto index.html, resterebbe servito per sempre
          // ogni volta che l'utente apre l'app senza rete: da fuori sembrerebbe
          // un sito rotto, e nessuno saprebbe che basta aspettare.
          const html = (risposta.headers.get('content-type') ?? '').includes('text/html');
          if (risposta.ok && risposta.type === 'basic' && html) {
            const copia = risposta.clone();
            evento.waitUntil(
              caches.open(CACHE).then((cache) => cache.put('./index.html', copia)),
            );
          }
          return risposta;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // File: prima la copia locale (i nomi cambiano a ogni versione), poi la rete.
  evento.respondWith(
    caches.match(richiesta).then(
      (trovata) =>
        trovata ??
        fetch(richiesta).then((risposta) => {
          if (risposta.ok && risposta.type === 'basic') {
            const copia = risposta.clone();
            const nomeCache = ASSET_PDF.has(url.href) ? CACHE_PDF : CACHE;
            evento.waitUntil(caches.open(nomeCache).then((cache) => cache.put(richiesta, copia)));
          }
          return risposta;
        }),
    ),
  );
});
