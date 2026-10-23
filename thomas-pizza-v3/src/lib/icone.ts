import type { TipoIngrediente } from '../types';

/*
 * Icone minime degli ingredienti, disegnate su una griglia 24 × 24.
 * La stessa geometria serve al sito, al JPG (canvas) e al PDF (vettoriale):
 * qui ci sono solo i contorni, i colori li decide chi disegna.
 */

export interface Punto {
  x: number;
  y: number;
}

export interface Polilinea {
  punti: Punto[];
  chiusa: boolean;
}

export interface Cerchio {
  cx: number;
  cy: number;
  r: number;
}

export interface ContorniIcona {
  polilinee: Polilinea[];
  cerchi: Cerchio[];
}

type Forma =
  | { tipo: 'traccia'; d: string }
  | { tipo: 'cerchio'; cx: number; cy: number; r: number };

/** Lato della griglia su cui sono disegnate tutte le icone. */
export const LATO_ICONA = 24;

/** Passi usati per trasformare le curve in segmenti (invisibili a queste misure). */
const PASSI_CURVA = 16;
const PASSI_QUADRATICA = 12;

const ICONE: Record<TipoIngrediente, readonly Forma[]> = {
  // Spiga di grano.
  farina: [
    { tipo: 'traccia', d: 'M12 20.8V5.4' },
    { tipo: 'traccia', d: 'M12 16.4L16.2 13.4' },
    { tipo: 'traccia', d: 'M12 16.4L7.8 13.4' },
    { tipo: 'traccia', d: 'M12 12.8L15.8 9.9' },
    { tipo: 'traccia', d: 'M12 12.8L8.2 9.9' },
    { tipo: 'traccia', d: 'M12 9.2L15 6.5' },
    { tipo: 'traccia', d: 'M12 9.2L9 6.5' },
  ],
  // Goccia.
  acqua: [
    {
      tipo: 'traccia',
      d: 'M12 3.4C14.9 7.2 17 9.9 17 12.6C17 16.9 14.8 20.4 12 20.4C9.2 20.4 7 16.9 7 12.6C7 9.9 9.1 7.2 12 3.4Z',
    },
  ],
  // Granuli che lievitano.
  lievito: [
    { tipo: 'cerchio', cx: 9.1, cy: 10.2, r: 2.4 },
    { tipo: 'cerchio', cx: 15.6, cy: 8.7, r: 1.7 },
    { tipo: 'cerchio', cx: 13.9, cy: 15.9, r: 2.1 },
    { tipo: 'cerchio', cx: 7.9, cy: 16.4, r: 1.2 },
  ],
  // Cucchiaino inclinato.
  malto: [
    {
      tipo: 'traccia',
      d: 'M4.8 15.2C4.8 17.4 7.1 19.2 10 19.2C12.9 19.2 15.2 17.4 15.2 15.2C15.2 13 12.9 11.2 10 11.2C7.1 11.2 4.8 13 4.8 15.2Z',
    },
    { tipo: 'traccia', d: 'M13.4 13.2C15.2 11.4 17.2 9.4 19 7.4' },
  ],
  // Saliera.
  sale: [
    { tipo: 'traccia', d: 'M8.8 5.6H15.2V8.4H8.8Z' },
    { tipo: 'traccia', d: 'M8.4 8.4H15.6L16.6 18C16.7 19.4 15.6 20.6 14.2 20.6H9.8C8.4 20.6 7.3 19.4 7.4 18L8.4 8.4Z' },
    { tipo: 'cerchio', cx: 10.9, cy: 7, r: 0.6 },
    { tipo: 'cerchio', cx: 13.1, cy: 7, r: 0.6 },
  ],
  // Bottiglia.
  olio: [
    {
      tipo: 'traccia',
      d: 'M10 3.4H14V6.9L15.6 9.4V20.6H8.4V9.4L10 6.9V3.4Z',
    },
    { tipo: 'traccia', d: 'M10 6.9H14' },
  ],
  // Cella di favo.
  miele: [
    {
      tipo: 'traccia',
      d: 'M12 3.6L18.2 7.2V14.4L12 18L5.8 14.4V7.2L12 3.6Z',
    },
    { tipo: 'traccia', d: 'M12 8L15.2 9.9V13.7L12 15.6L8.8 13.7V9.9L12 8Z' },
  ],
};

function numeri(testo: string): number[] {
  return (testo.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
}

function puntoCubico(
  partenza: Punto,
  controllo1: Punto,
  controllo2: Punto,
  arrivo: Punto,
  t: number,
): Punto {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * partenza.x + b * controllo1.x + c * controllo2.x + d * arrivo.x,
    y: a * partenza.y + b * controllo1.y + c * controllo2.y + d * arrivo.y,
  };
}

function puntoQuadratico(
  partenza: Punto,
  controllo: Punto,
  arrivo: Punto,
  t: number,
): Punto {
  const u = 1 - t;
  return {
    x: u * u * partenza.x + 2 * u * t * controllo.x + t * t * arrivo.x,
    y: u * u * partenza.y + 2 * u * t * controllo.y + t * t * arrivo.y,
  };
}

/** Converte una traccia SVG (M, L, H, V, C, Q, Z assoluti) in segmenti. */
function analizzaTraccia(d: string): Polilinea[] {
  const comandi = d.match(/[MLCQHVZ][^MLCQHVZ]*/gi) ?? [];
  const polilinee: Polilinea[] = [];
  let corrente: Punto[] = [];
  let posizione: Punto = { x: 0, y: 0 };

  const concludi = (chiusa: boolean) => {
    if (corrente.length > 1) polilinee.push({ punti: corrente, chiusa });
    corrente = [];
  };

  for (const comando of comandi) {
    const lettera = comando[0].toUpperCase();
    const valori = numeri(comando.slice(1));

    switch (lettera) {
      case 'M': {
        concludi(false);
        posizione = { x: valori[0], y: valori[1] };
        corrente = [posizione];
        break;
      }
      case 'L': {
        posizione = { x: valori[0], y: valori[1] };
        corrente.push(posizione);
        break;
      }
      case 'H': {
        posizione = { x: valori[0], y: posizione.y };
        corrente.push(posizione);
        break;
      }
      case 'V': {
        posizione = { x: posizione.x, y: valori[0] };
        corrente.push(posizione);
        break;
      }
      case 'C': {
        const [x1, y1, x2, y2, x, y] = valori;
        const controllo1 = { x: x1, y: y1 };
        const controllo2 = { x: x2, y: y2 };
        const arrivo = { x, y };
        for (let passo = 1; passo <= PASSI_CURVA; passo += 1) {
          corrente.push(
            puntoCubico(
              posizione,
              controllo1,
              controllo2,
              arrivo,
              passo / PASSI_CURVA,
            ),
          );
        }
        posizione = arrivo;
        break;
      }
      case 'Q': {
        const [x1, y1, x, y] = valori;
        const controllo = { x: x1, y: y1 };
        const arrivo = { x, y };
        for (let passo = 1; passo <= PASSI_QUADRATICA; passo += 1) {
          corrente.push(
            puntoQuadratico(
              posizione,
              controllo,
              arrivo,
              passo / PASSI_QUADRATICA,
            ),
          );
        }
        posizione = arrivo;
        break;
      }
      case 'Z': {
        concludi(true);
        break;
      }
    }
  }

  concludi(false);
  return polilinee;
}

const cache = new Map<TipoIngrediente, ContorniIcona>();

/** Contorni pronti da disegnare, sempre dentro la griglia 24 × 24. */
export function contorniIcona(tipo: TipoIngrediente): ContorniIcona {
  const salvata = cache.get(tipo);
  if (salvata) return salvata;

  const contorni: ContorniIcona = { polilinee: [], cerchi: [] };
  for (const forma of ICONE[tipo]) {
    if (forma.tipo === 'traccia') {
      contorni.polilinee.push(...analizzaTraccia(forma.d));
    } else {
      contorni.cerchi.push({ cx: forma.cx, cy: forma.cy, r: forma.r });
    }
  }

  cache.set(tipo, contorni);
  return contorni;
}

function arrotonda(valore: number): number {
  return Math.round(valore * 100) / 100;
}

/** Percorso SVG di una polilinea, utile al componente React. */
export function percorsoPolilinea(polilinea: Polilinea): string {
  const punti = polilinea.punti
    .map((punto, indice) => {
      const comando = indice === 0 ? 'M' : 'L';
      return `${comando} ${arrotonda(punto.x)} ${arrotonda(punto.y)}`;
    })
    .join(' ');
  return polilinea.chiusa ? `${punti} Z` : punti;
}

/** Strumenti minimi condivisi da canvas e PDF. */
export interface StrumentiIcona {
  polilinea: (punti: Punto[], chiusa: boolean) => void;
  cerchio: (cerchio: Cerchio) => void;
}

export function disegnaIcona(
  tipo: TipoIngrediente,
  strumenti: StrumentiIcona,
): void {
  const { polilinee, cerchi } = contorniIcona(tipo);
  for (const polilinea of polilinee) {
    strumenti.polilinea(polilinea.punti, polilinea.chiusa);
  }
  for (const cerchio of cerchi) {
    strumenti.cerchio(cerchio);
  }
}
