import { TempoAmbienteBiga } from './components/TempoAmbienteBiga';
import { FormCalcolo } from './components/FormCalcolo';
import { RICETTE } from './config/ricette';
import { caricaStato } from './lib/persistenza';
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

  it('la sola biga ha due passi: dosi e tempi insieme, poi l’impasto', () => {
    telefono();
    const html = renderToStaticMarkup(<CalcolatoreBiga />);
    vi.unstubAllGlobals();

    const testo = html.replace(/<!-- -->/g, '');

    expect(testo).toContain('Passo 1 di 2');
    expect(testo).toContain('Dosi e tempi');
    // Temperatura e orari stanno nello stesso passo: il cambio si vede subito.
    expect(testo).toContain('Temperatura ambiente');
    expect(testo).toContain('Quando ti serve la biga?');
    // Il risultato arriva nel passo dopo.
    expect(testo).not.toContain('Farina totale');
  });
});

describe('comandi del modulo nel percorso guidato', () => {
  for (const ricetta of RICETTE) {
    it(`mostra il comando di calcolo solo nella barra dei passi per ${ricetta.nome}`, () => {
      const stato = caricaStato(null).ricette[ricetta.id];
      const props = {
        ricetta, modalita: stato.modalita, opzioni: stato.opzioni,
        valori: stato.valori, parametri: stato.parametri, personalizzata: false,
        errori: {}, erroreGenerale: null,
        onCambiaModalita() {}, onCambiaOpzione() {}, onCambiaCampo() {},
        onCambiaParametro() {}, onRipristinaParametri() {}, onCalcola() {},
      };
      const dosi = renderToStaticMarkup(<FormCalcolo {...props} sezione="dosi" />);
      expect(dosi).not.toContain('>Risultato</button>');
      const personalizza = renderToStaticMarkup(<FormCalcolo {...props} sezione="personalizza"
        navigazioneRisultato={() => <nav>Comando nella barra</nav>} />);
      expect(personalizza).not.toContain('>Risultato</button>');
      expect(personalizza.indexOf('</form>')).toBeLessThan(personalizza.indexOf('<nav>'));
      const desktop = renderToStaticMarkup(<FormCalcolo {...props} sezione="tutto" />);
      expect(desktop).toContain('>Risultato</button>');
    });
  }
});


it('mostra ore e istante sincronizzati nello stesso controllo della biga', () => {
  const html = renderToStaticMarkup(<TempoAmbienteBiga id="prova-tempo"
    inizio="2026-11-21T08:00" fine="2026-11-22T08:00" ore="12"
    onChange={() => {}} />);
  expect(html).toContain('Tempo a temperatura ambiente');
  expect(html).toContain('Metti in frigorifero');
  expect(html).toContain('value="2026-11-21T20:00"');
  expect(html).toContain('value="12"');
});
