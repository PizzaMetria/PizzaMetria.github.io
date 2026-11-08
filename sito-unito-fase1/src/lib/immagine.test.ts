import { afterEach, describe, expect, it, vi } from 'vitest';
import { rasterizzaSvg } from './immagine';

/*
 * I grafici uscivano neri perché il clone si portava dietro
 * `style="fill: var(--color-carta)"`: dentro l'SVG isolato la variabile non
 * esiste, la dichiarazione diventa invalida e il browser ripiega sul nero.
 *
 * Qui non c'è un browser, quindi si finge il minimo necesario: nodi con
 * attributi, stile calcolato e un serializzatore. Basta a controllare che
 * l'SVG che finisce nell'immagine non contenga più `var(…)` e che i colori
 * siano quelli chiari del foglio.
 */

class FalsoNodo {
  nome: string;
  attributi = new Map<string, string>();
  figli: FalsoNodo[] = [];
  stile: Record<string, string> = {};
  viewBox = { baseVal: { width: 320, height: 96 } };

  constructor(nome: string, attributi: Record<string, string> = {}) {
    this.nome = nome;
    for (const [chiave, valore] of Object.entries(attributi)) {
      this.attributi.set(chiave, valore);
    }
  }

  get firstChild(): FalsoNodo | null {
    return this.figli[0] ?? null;
  }

  setAttribute(nome: string, valore: string): void {
    this.attributi.set(nome, valore);
  }

  getAttribute(nome: string): string | null {
    return this.attributi.get(nome) ?? null;
  }

  removeAttribute(nome: string): void {
    this.attributi.delete(nome);
  }

  insertBefore(nodo: FalsoNodo, prima: FalsoNodo | null): void {
    const indice = prima ? this.figli.indexOf(prima) : -1;
    if (indice < 0) this.figli.unshift(nodo);
    else this.figli.splice(indice, 0, nodo);
  }

  cloneNode(): FalsoNodo {
    const copia = new FalsoNodo(this.nome, Object.fromEntries(this.attributi));
    copia.figli = this.figli.map((figlio) => figlio.cloneNode());
    copia.stile = { ...this.stile };
    return copia;
  }

  querySelectorAll(): FalsoNodo[] {
    const trovati: FalsoNodo[] = [];
    const visita = (nodo: FalsoNodo) => {
      for (const figlio of nodo.figli) {
        trovati.push(figlio);
        visita(figlio);
      }
    };
    visita(this);
    return trovati;
  }
}

function scriviNodo(nodo: FalsoNodo): string {
  const attributi = [...nodo.attributi].map(([nome, valore]) => ` ${nome}="${valore}"`).join('');
  if (nodo.figli.length === 0) return `<${nodo.nome}${attributi}/>`;
  return `<${nodo.nome}${attributi}>${nodo.figli.map(scriviNodo).join('')}</${nodo.nome}>`;
}

/** L'SVG della schermata: fondo frigo, area, linea dell'attività. */
function graficoFinto(): FalsoNodo {
  const svg = new FalsoNodo('svg', { class: 'h-28 w-full' });
  svg.stile = { fill: 'none', stroke: 'none', opacity: '1' };

  const fascia = new FalsoNodo('rect', { style: 'fill: var(--color-carta)' });
  fascia.stile = { fill: 'rgb(44, 48, 54)', stroke: 'none', 'stroke-width': '1px', opacity: '0.9' };

  const linea = new FalsoNodo('path', { d: 'M 0 0 L 320 96', fill: 'none' });
  linea.stile = { fill: 'none', stroke: 'rgb(212, 175, 55)', 'stroke-width': '2px' };

  svg.figli = [fascia, linea];
  return svg;
}

let serializzato = '';

afterEach(() => {
  vi.unstubAllGlobals();
  serializzato = '';
});

describe('rasterizzaSvg', () => {
  it('non lascia variabili CSS e usa la tavolozza chiara', async () => {
    const svg = graficoFinto();

    vi.stubGlobal('window', {
      getComputedStyle: (nodo: FalsoNodo) => ({
        getPropertyValue: (nome: string) => nodo.stile[nome] ?? '',
      }),
    });
    vi.stubGlobal('document', {
      createElementNS: (_ns: string, nome: string) => new FalsoNodo(nome, {}),
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
        toDataURL: () => 'data:image/jpeg;base64,AAAA',
      }),
    });
    vi.stubGlobal(
      'XMLSerializer',
      class {
        serializeToString(nodo: FalsoNodo): string {
          return scriviNodo(nodo);
        }
      },
    );
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(valore: string) {
          serializzato = decodeURIComponent(
            valore.replace('data:image/svg+xml;charset=utf-8,', ''),
          );
          this.onload?.();
        }
      },
    );

    const immagine = await rasterizzaSvg(svg as unknown as SVGSVGElement);

    expect(immagine).toEqual({ datiUrl: 'data:image/jpeg;base64,AAAA', larghezza: 800, altezza: 240 });
    // Il difetto dei grafici neri: nessuna var(--…) deve arrivare all'immagine.
    expect(serializzato).not.toContain('var(');
    expect(serializzato).not.toContain('style=');
    // Carta (#2c3036) e oro (#d4af37) diventano le tinte del foglio.
    expect(serializzato).toContain('fill="#efeae0"');
    expect(serializzato).toContain('stroke="#b89428"');
    // Il fondo del JPEG è dipinto per primo.
    expect(serializzato).toMatch(/^<svg[^>]*width="800"[^>]*><rect[^>]*fill="#fffdf8"\/>/);
  });
});
