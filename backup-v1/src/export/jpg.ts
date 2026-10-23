import type { RicettaConfig, RisultatoCalcolo } from '../types';
import { creaVistaRicetta } from '../lib/vista';
import { dataUrlABlob, scaricaBlob } from '../lib/download';
import {
  LARGHEZZA_LAYOUT_ESPORT,
  MARCHIO,
  SCALA_JPG,
} from './costanti';

const LARGHEZZA = LARGHEZZA_LAYOUT_ESPORT;
const MARGINE = 72;
const INTERNO = LARGHEZZA - MARGINE * 2;
/** Righe alte e ariose: il JPG resta verticale anche con poche dosi. */
const ALTEZZA_RIGA = 74;
const ALTEZZA_TITOLO_FASE = 44;
const SPAZIO_FASE = 28;

const FONT_SISTEMA =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const COLORI = {
  inchiostro: '#2a211c',
  tenue: '#67584e',
  terracotta: '#b4452b',
  bordo: '#e9dcd0',
  bianco: '#ffffff',
} as const;

function font(peso: number, dimensione: number): string {
  return `${peso} ${dimensione}px ${FONT_SISTEMA}`;
}

function scrivi(
  ctx: CanvasRenderingContext2D,
  testo: string,
  x: number,
  lineaBase: number,
  fontTesto: string,
  colore: string,
  allineamento: CanvasTextAlign = 'left',
): void {
  ctx.font = fontTesto;
  ctx.fillStyle = colore;
  ctx.textAlign = allineamento;
  ctx.fillText(testo, x, lineaBase);
  ctx.textAlign = 'left';
}

function dividiInRighe(
  ctx: CanvasRenderingContext2D,
  testo: string,
  fontTesto: string,
  larghezzaMassima: number,
): string[] {
  ctx.font = fontTesto;
  const parole = testo.split(/\s+/).filter(Boolean);
  const righe: string[] = [];
  let corrente = '';

  for (const parola of parole) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (!corrente || ctx.measureText(prova).width <= larghezzaMassima) {
      corrente = prova;
    } else {
      righe.push(corrente);
      corrente = parola;
    }
  }
  if (corrente) righe.push(corrente);

  return righe.flatMap((riga) => {
    if (ctx.measureText(riga).width <= larghezzaMassima) return [riga];
    const pezzi: string[] = [];
    let pezzo = '';
    for (const carattere of riga) {
      const prova = pezzo + carattere;
      if (pezzo && ctx.measureText(prova).width > larghezzaMassima) {
        pezzi.push(pezzo);
        pezzo = carattere;
      } else {
        pezzo = prova;
      }
    }
    if (pezzo) pezzi.push(pezzo);
    return pezzi;
  });
}

function blocco(
  ctx: CanvasRenderingContext2D,
  testo: string,
  x: number,
  superiore: number,
  larghezzaMassima: number,
  fontTesto: string,
  dimensione: number,
  colore: string,
  interlinea: number,
): number {
  const righe = dividiInRighe(ctx, testo, fontTesto, larghezzaMassima);
  righe.forEach((riga, indice) => {
    scrivi(
      ctx,
      riga,
      x,
      superiore + dimensione + indice * interlinea,
      fontTesto,
      colore,
    );
  });
  return superiore + righe.length * interlinea;
}

function linea(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y: number,
  x2: number,
): void {
  ctx.beginPath();
  ctx.strokeStyle = COLORI.bordo;
  ctx.lineWidth = 1;
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
}

/**
 * Layout dedicato al JPG: solo ricetta, resa e dosi.
 * Viene eseguito due volte (misura e disegno) e resta sincrono, così il
 * download parte nello stesso gesto utente anche su Safari e iOS.
 */
function disegnaDosi(
  ctx: CanvasRenderingContext2D,
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
): number {
  const vista = creaVistaRicetta(risultato, ricetta);
  let y = MARGINE;

  scrivi(
    ctx,
    MARCHIO.toUpperCase(),
    MARGINE,
    y + 14,
    font(700, 14),
    COLORI.terracotta,
  );
  y += 34;

  y = blocco(
    ctx,
    vista.nomeRicetta,
    MARGINE,
    y,
    INTERNO,
    font(700, 34),
    34,
    COLORI.inchiostro,
    40,
  );
  y += 6;
  y = blocco(
    ctx,
    vista.resa,
    MARGINE,
    y,
    INTERNO,
    font(500, 16),
    16,
    COLORI.tenue,
    22,
  );
  y += 20;

  ctx.fillStyle = COLORI.terracotta;
  ctx.fillRect(MARGINE, y, INTERNO, 3);
  y += 34;

  vista.fasi.forEach((fase) => {
    scrivi(ctx, fase.titolo, MARGINE, y + 24, font(700, 22), COLORI.inchiostro);
    y += ALTEZZA_TITOLO_FASE;

    fase.voci.forEach((voce, indice) => {
      scrivi(
        ctx,
        voce.etichetta,
        MARGINE,
        y + ALTEZZA_RIGA / 2 + 7,
        font(400, 16),
        COLORI.inchiostro,
      );
      scrivi(
        ctx,
        voce.valore,
        LARGHEZZA - MARGINE,
        y + ALTEZZA_RIGA / 2 + 7,
        font(700, 18),
        COLORI.inchiostro,
        'right',
      );
      if (indice < fase.voci.length - 1) {
        linea(ctx, MARGINE, y + ALTEZZA_RIGA - 1, LARGHEZZA - MARGINE);
      }
      y += ALTEZZA_RIGA;
    });

    y += SPAZIO_FASE;
  });

  return y + MARGINE - SPAZIO_FASE;
}

function creaCanvasMisura(): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA;
  canvas.height = 10;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas non disponibile in questo browser.');
  }
  return ctx;
}

/** Genera il data URL JPEG completo, senza operazioni asincrone. */
export function generaJpgRicetta(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
): string {
  const misura = creaCanvasMisura();
  const altezzaLogica = Math.ceil(disegnaDosi(misura, risultato, ricetta));

  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA * SCALA_JPG;
  canvas.height = Math.ceil(altezzaLogica * SCALA_JPG);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas non disponibile in questo browser.');
  }

  ctx.scale(SCALA_JPG, SCALA_JPG);
  ctx.fillStyle = COLORI.bianco;
  ctx.fillRect(0, 0, LARGHEZZA, altezzaLogica);
  disegnaDosi(ctx, risultato, ricetta);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  if (!dataUrl.startsWith('data:image/jpeg;base64,') || dataUrl.length < 4000) {
    throw new Error('Il browser non ha prodotto un JPG valido.');
  }
  return dataUrl;
}

/** Genera e scarica il JPG dentro lo stesso gesto utente del pulsante. */
export function esportaRicettaJpg(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  nomeFile: string,
): void {
  const blob = dataUrlABlob(generaJpgRicetta(risultato, ricetta), 'image/jpeg');
  if (blob.size < 1024) {
    throw new Error('Il file JPG generato è vuoto.');
  }
  scaricaBlob(blob, nomeFile);
}
