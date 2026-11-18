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
const BUILD = {"versione":"01d4f38d4dfefe2c","sito":["./assets/index-CWgWwVlX.js","./assets/index-jl-0MIUF.css","./assets/inter-variable-Dx4kXJAl.woff2","./assets/playfair-display-variable-BOwq7MWX.woff2","./assets/playfair-display-variable-italic-DmbndNpe.woff2","./assets/tinos-bold-qGf2y18O.woff2","./assets/tinos-regular-rilFpyjL.woff2"],"pdf":["./assets/PaginePdf-Cj9GJehR.js","./assets/pdf-DSvrOA1G.js","./assets/pdf.worker.min-B5Yc7dP4.mjs"]};
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
  './privacy.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll([...GUSCIO, ...(BUILD?.sito ?? [])]);

    // L'impronta della password va salvata subito: al primo avvio il sito la
    // chiede prima che il worker controlli la pagina, quindi quella copia non
    // passerebbe di qui. Senza queste righe chi installa l'app e passa in
    // modalità aereo senza ricaricare resta fuori.
    // Se il file manca l'installazione non deve fallire: il sito è aperto e
    // l'impronta arriva alla prima apertura online.
    try {
      await cache.addAll(['./accesso.json']);
    } catch {
      // Nessun file di accesso da salvare.
    }

    if (!BUILD?.pdf.length) return;
    // La mancata disponibilità del PDF non impedisce l'installazione del sito.
    try {
      const cachePdf = await caches.open(CACHE_PDF);
      await cachePdf.addAll(BUILD.pdf);
    } catch {
      // Gli asset restano recuperabili alla prima apertura online.
    }
  })());
});

self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'ATTIVA_AGGIORNAMENTO') evento.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    // Una scheda aperta può ancora chiedere i chunk della build precedente.
    // Se ci sono finestre, rimanda la pulizia alla prossima attivazione senza schede.
    const finestre = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (!finestre.length) {
      const chiavi = await caches.keys();
      await Promise.all(chiavi
        .filter((chiave) => chiave.startsWith(PREFISSO) && chiave !== CACHE && chiave !== CACHE_PDF)
        .map((chiave) => caches.delete(chiave)));
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;
  // I pacchetti da scaricare non si mettono in cache.
  if (url.pathname.includes('/apk/') || url.pathname.includes('/files/')) return;

  // La password si cambia senza ricostruire il sito: il file di accesso si
  // chiede sempre alla rete, e la copia salvata serve quando la rete manca o
  // quando il server risponde con un errore (per esempio un 503 di troppo).
  // In quel caso vale l'ultima impronta buona: senza questa seconda chance un
  // errore del server chiuderebbe fuori anche chi ha già la copia in cache.
  if (url.pathname.endsWith('/accesso.json')) {
    evento.respondWith((async () => {
      let risposta;
      try {
        risposta = await fetch(richiesta, { cache: 'no-store' });
      } catch {
        // Rete assente: si prova la copia salvata.
      }
      if (risposta?.ok && risposta.type === 'basic') {
        const copia = risposta.clone();
        evento.waitUntil(caches.open(CACHE).then((cache) => cache.put(richiesta, copia)));
        return risposta;
      }
      const trovata = await caches.match(richiesta);
      if (trovata) return trovata;
      // Niente copia: passa l'errore, così la pagina mostra «Riprova».
      return risposta ?? Response.error();
    })());
    return;
  }

  // Pagine: prima la rete, la copia salvata solo se la rete non risponde.
  if (richiesta.mode === 'navigate') {
    // La home e index.html sono lo stesso documento. Le altre pagine
    // conservano una chiave propria, anche quando sono aperte dal menu.
    const scope = new URL(self.registration.scope);
    const pagina = url.pathname === scope.pathname
      ? new URL('index.html', scope).href
      : url.origin + url.pathname;
    evento.respondWith(
      fetch(richiesta)
        .then((risposta) => {
          // Una risposta di errore non sostituisce l’ultima copia valida.
          const html = (risposta.headers.get('content-type') ?? '').includes('text/html');
          if (risposta.ok && risposta.type === 'basic' && html) {
            const copia = risposta.clone();
            evento.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(pagina, copia)),
            );
          }
          return risposta;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (await cache.match(pagina)) ?? Response.error();
        }),
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
