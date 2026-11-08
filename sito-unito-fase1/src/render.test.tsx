import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

/*
 * Il calcolatore si disegna anche fuori dal browser: basta questo per sapere che
 * da desktop (dove non c'è percorso guidato) i tre riquadri della Modalità
 * Facile stanno in pagina e che i campi della Pro restano fuori.
 */
describe('schermata del calcolatore', () => {
  const html = renderToStaticMarkup(<App />);

  it('da desktop mette i tre riquadri della Facile in una pagina sola', () => {
    expect(html).toContain('Scegli le dosi');
    expect(html).toContain('Tempi e temperature');
    expect(html).toContain('Peso di ciascun panetto');
    expect(html).not.toContain('Passo 1 di 3');
  });

  it('non ha più il selettore del tema: la pelle è una sola', () => {
    // Una sola tavolozza, quella latte: niente interruttore chiaro/scuro.
    expect(html).not.toContain('Passa al tema');
    expect(html).toContain('Apri il menu');
  });

  it('mette le ore in fila: puntata, stagliare o no, frigo, appretto', () => {
    const puntata = html.indexOf('Puntata a temperatura ambiente');
    const domanda = html.indexOf('Quando fai i panetti?');
    const frigo = html.indexOf('Ore in frigo');
    const appretto = html.indexOf('Appretto a temperatura ambiente');

    expect(puntata).toBeGreaterThan(-1);
    expect(appretto).toBeGreaterThan(-1);
    // Se le ore bastano per il frigo, la domanda sta in mezzo e il frigo dopo.
    if (frigo > -1) {
      expect(puntata).toBeLessThan(domanda);
      expect(domanda).toBeLessThan(frigo);
      expect(frigo).toBeLessThan(appretto);
    }
  });

  it('segue le specifiche della Modalità Facile: nomi, staglio, frigo', () => {
    expect(html).toContain('Scegli come calcolare la tua ricetta');
    expect(html).not.toContain('Tre passi:');
    expect(html).toContain('Quando vuoi sfornare?');
    expect(html).toContain('Quando fai i panetti?');
    expect(html).toContain('Prima del frigo');
    expect(html).toContain('Dopo il frigo');
    expect(html).toContain('Maturazione in frigo');
    // Niente didascalie né sottotitoli fuorvianti.
    expect(html).not.toContain('Se non lo sai');
    expect(html).not.toContain('Frigo e tavolo, in pratica');
  });

  it('non mostra i campi della Modalità Pro', () => {
    expect(html).not.toContain('Idratazione');
    expect(html).not.toContain('Mix di farine');
    expect(html).not.toContain('Percentuali calcolate sulla farina');
  });
});

describe('schermata del calcolatore sul telefono', () => {
  it('passa al percorso guidato: un passo per volta', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
    });

    const html = renderToStaticMarkup(<App />);
    vi.unstubAllGlobals();

    // React separa testo ed espressioni con dei commenti: si tolgono.
    const testo = html.replace(/<!-- -->/g, '');

    expect(testo).toContain('Passo 1 di 3');
    expect(testo).toContain('Avanti');
    expect(testo).toContain('Peso di ciascun panetto');
    // Gli altri due passi non sono in pagina finché non ci si arriva.
    expect(html).not.toContain('Maturazione in frigo');
    expect(html).not.toContain('Il tuo impasto');
  });
});
