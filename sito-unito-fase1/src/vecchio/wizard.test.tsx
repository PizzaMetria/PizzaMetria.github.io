import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { CalcolatoreBiga } from './components/CalcolatoreBiga';

/*
 * Il percorso guidato non è più solo del calcolatore nuovo: anche le ricette di
 * «Le mie ricette» si aprono una scheda per volta sul telefono, con gli stessi
 * nomi dei passi (dosi, personalizzazione, impasto).
 */
function telefono() {
  vi.stubGlobal('window', {
    matchMedia: () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }),
    localStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
    addEventListener() {},
    removeEventListener() {},
  });
}

describe('percorso guidato delle ricette', () => {
  it('sul telefono parte dalla ricetta e mostra un passo per volta', () => {
    telefono();
    const html = renderToStaticMarkup(<App senzaSelettore senzaTestata />);
    vi.unstubAllGlobals();

    // React separa testo ed espressioni con dei commenti: si tolgono.
    const testo = html.replace(/<!-- -->/g, '');

    // Quattro passi: ricetta, dosi, personalizzazione, risultato.
    expect(testo).toContain('Passo 1 di 4');
    expect(testo).toContain('La ricetta');
    // Il resto non è in pagina finché non ci si arriva.
    expect(testo).not.toContain('Scegli le dosi');
    expect(testo).not.toContain('Personalizza la ricetta');
    expect(testo).not.toContain('Calcola impasto');
  });

  it('la sola biga ha gli stessi passi: dosi, tempi, impasto', () => {
    telefono();
    const html = renderToStaticMarkup(<CalcolatoreBiga />);
    vi.unstubAllGlobals();

    const testo = html.replace(/<!-- -->/g, '');

    expect(testo).toContain('Passo 1 di 3');
    expect(testo).toContain('Scegli le dosi');
    expect(testo).toContain('Temperatura ambiente');
    // I tempi e il risultato arrivano nei passi successivi.
    expect(testo).not.toContain('Biga pronta il');
    expect(testo).not.toContain('Farina totale');
  });
});
