import { describe, expect, it } from 'vitest';
import codice from '../public/sw.js?raw';

/**
 * Prove di regressione sul ramo `accesso.json` del service worker.
 *
 * Il worker non gira in Node: qui se ne esegue il sorgente vero (quello che la
 * build pubblica, con dentro la versione e gli asset) dentro una finta
 * `self`, con `fetch` e `caches` finti. Serve a fissare la regola: la risposta
 * della rete vale solo se è buona, altrimenti si usa l'ultima copia salvata.
 */

type RispostaFinta = {
  ok: boolean;
  status: number;
  type: string;
  corpo: string;
  headers: { get: (nome: string) => string };
  clone: () => RispostaFinta;
};

function risposta(status: number, corpo: string): RispostaFinta {
  return {
    ok: status >= 200 && status < 300,
    status,
    type: 'basic',
    corpo,
    headers: { get: () => 'application/json' },
    clone: () => risposta(status, corpo),
  };
}

const ORIGINE = 'https://example.test';
const FILE_ACCESSO = `${ORIGINE}/accesso.json`;

/** La chiave di una cache può essere una richiesta o un indirizzo già pronto. */
type Chiave = { url: string } | string;

function indirizzo(chiave: Chiave): string {
  return typeof chiave === 'string' ? chiave : chiave.url;
}

/** Cache finta: una mappa url → risposta, più le scritture fatte dal worker. */
function cacheFinta(voci: Record<string, RispostaFinta>) {
  const mappa = new Map(Object.entries(voci));
  const scritture: string[] = [];
  const api = {
    open: async () => ({
      addAll: async (elenco: string[]) => {
        for (const nome of elenco) mappa.set(new URL(nome, `${ORIGINE}/`).href, risposta(200, 'precache'));
      },
      put: async (chiave: Chiave, rispostaNuova: RispostaFinta) => {
        scritture.push(indirizzo(chiave));
        mappa.set(indirizzo(chiave), rispostaNuova);
      },
      match: async (chiave: Chiave) => mappa.get(indirizzo(chiave)),
    }),
    match: async (chiave: Chiave) => mappa.get(indirizzo(chiave)),
    keys: async () => ['pizzametria-prova'],
    delete: async () => true,
  };
  return { api, scritture };
}

/** Una pagina HTML, con l'indirizzo finale e il segno del reindirizzamento. */
function paginaHtml(
  corpo: string,
  extra: { url?: string; redirected?: boolean } = {},
): RispostaFinta & { url?: string; redirected?: boolean } {
  const crea = (): RispostaFinta & { url?: string; redirected?: boolean } => ({
    ok: true,
    status: 200,
    type: 'basic',
    corpo,
    headers: { get: () => 'text/html' },
    url: extra.url,
    redirected: extra.redirected ?? false,
    clone: () => crea(),
  });
  return crea();
}

type Rete = (richiesta: { url: string }) => Promise<RispostaFinta>;

function avviaWorker(rete: Rete, voci: Record<string, RispostaFinta>) {
  const gestori: Record<string, (evento: unknown) => void> = {};
  const cache = cacheFinta(voci);
  const self = {
    location: { origin: ORIGINE },
    registration: { scope: `${ORIGINE}/` },
    clients: { matchAll: async () => [], claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (tipo: string, gestore: (evento: unknown) => void) => {
      gestori[tipo] = gestore;
    },
  };

  const avvia = new Function('self', 'caches', 'fetch', 'Response', codice) as (
    ...argomenti: unknown[]
  ) => void;
  avvia(self, cache.api, rete, { error: () => risposta(0, 'errore') });
  return { gestori, cache };
}

async function eseguiSw({ rete, voci }: { rete: Rete; voci?: Record<string, RispostaFinta> }) {
  const { gestori, cache } = avviaWorker(rete, voci ?? {});

  const attese: Promise<unknown>[] = [];
  let promessa: Promise<RispostaFinta> | undefined;
  gestori.fetch({
    request: { method: 'GET', url: FILE_ACCESSO, mode: 'cors' },
    respondWith: (valore: Promise<RispostaFinta>) => {
      promessa = valore;
    },
    waitUntil: (valore: Promise<unknown>) => attese.push(valore),
  });
  if (!promessa) throw new Error('il worker non ha risposto alla richiesta di accesso.json');
  const esito = await promessa;
  await Promise.all(attese);
  return { esito, scritture: cache.scritture };
}

/** Esegue una navigazione sul worker già avviato. */
async function naviga(
  gestori: Record<string, (evento: unknown) => void>,
  url: string,
): Promise<RispostaFinta> {
  const attese: Promise<unknown>[] = [];
  let promessa: Promise<RispostaFinta> | undefined;
  (gestori.fetch as (evento: unknown) => void)({
    request: { method: 'GET', url, mode: 'navigate' },
    respondWith: (valore: Promise<RispostaFinta>) => {
      promessa = valore;
    },
    waitUntil: (valore: Promise<unknown>) => attese.push(valore),
  });
  if (!promessa) throw new Error('il worker non ha risposto alla navigazione');
  const esito = await promessa;
  await Promise.all(attese);
  return esito;
}

const copiaSalvata = { [FILE_ACCESSO]: risposta(200, 'salvata') };

describe('service worker · accesso.json', () => {
  it('con un 503 del server usa la copia salvata', async () => {
    const { esito } = await eseguiSw({ rete: async () => risposta(503, '{}'), voci: copiaSalvata });
    expect(esito.status).toBe(200);
    expect(esito.corpo).toBe('salvata');
  });

  it('senza rete usa la copia salvata', async () => {
    const { esito } = await eseguiSw({
      rete: async () => {
        throw new Error('offline');
      },
      voci: copiaSalvata,
    });
    expect(esito.status).toBe(200);
    expect(esito.corpo).toBe('salvata');
  });

  it('con un 503 e nessuna copia lascia passare l’errore', async () => {
    const { esito } = await eseguiSw({ rete: async () => risposta(503, '{}') });
    expect(esito.status).toBe(503);
  });

  it('con un 200 risponde dalla rete e aggiorna la copia', async () => {
    const { esito, scritture } = await eseguiSw({
      rete: async () => risposta(200, 'nuova'),
      voci: { [FILE_ACCESSO]: risposta(200, 'vecchia') },
    });
    expect(esito.corpo).toBe('nuova');
    expect(scritture).toContain(FILE_ACCESSO);
  });
});

describe('service worker · pagine reindirizzate', () => {
  const INFORMATIVA = `${ORIGINE}/privacy.html`;
  const FINALE = `${ORIGINE}/privacy`;

  it('salva anche l’indirizzo finale, così si apre senza rete', async () => {
    let online = true;
    const { gestori, cache } = avviaWorker(async () => {
      if (!online) throw new Error('offline');
      return paginaHtml('informativa', { url: FINALE, redirected: true });
    }, {});

    const primo = await naviga(gestori, INFORMATIVA);
    expect(primo.corpo).toBe('informativa');
    expect(cache.scritture).toEqual(expect.arrayContaining([INFORMATIVA, FINALE]));

    online = false;
    const secondo = await naviga(gestori, FINALE);
    expect(secondo.corpo).toBe('informativa');
  });

  it('senza reindirizzamento salva una chiave sola', async () => {
    const { gestori, cache } = avviaWorker(async () => paginaHtml('informativa'), {});

    await naviga(gestori, INFORMATIVA);

    expect(cache.scritture).toEqual([INFORMATIVA]);
  });
});
