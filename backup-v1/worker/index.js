/**
 * Serve la build Vite dalla binding ASSETS.
 * Le asset mancanti restano 404; le rotte SPA ricadono su index.html.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const risposta = await env.ASSETS.fetch(request);

    if (risposta.status === 404) {
      if (request.method !== 'GET') return risposta;
      const accettaHtml = request.headers.get('Accept')?.includes('text/html');
      if (!accettaHtml || url.pathname.includes('.')) return risposta;
      return env.ASSETS.fetch(
        new Request(new URL('/index.html', url), request),
      );
    }

    // Con il fallback SPA attivo, un file statico assente può diventare
    // index.html con status 200: in quel caso ripristiniamo il 404 corretto.
    const estensione = url.pathname.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
    const tipo = risposta.headers.get('content-type') ?? '';
    if (
      estensione &&
      estensione !== 'html' &&
      tipo.includes('text/html')
    ) {
      return new Response('Risorsa non trovata.', {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }

    return risposta;
  },
};
