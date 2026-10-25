import type {
  RicettaConfig,
  RisultatoCalcolo,
  TipoIngrediente,
} from '../types';
import { creaVistaRicetta, type GruppoRiepilogo } from '../lib/vista';
import { LATO_ICONA, disegnaIcona } from '../lib/icone';
import { dataUrlABlob, scaricaBlob } from '../lib/download';
import { formattaPercentuale } from '../lib/formato';
import {
  LARGHEZZA_LAYOUT_ESPORT,
  MARCHIO,
  SCALA_JPG,
} from './costanti';

let LARGHEZZA = LARGHEZZA_LAYOUT_ESPORT;
let MARGINE = 72;
let INTERNO = LARGHEZZA - MARGINE * 2;
/** Righe alte e ariose: il JPG resta verticale anche con poche dosi. */
let ALTEZZA_RIGA = 74;
const ALTEZZA_TITOLO_FASE = 52;
const SPAZIO_FASE = 30;
/** Icona dell'ingrediente e spazio prima dell'etichetta. */
let LATO_ICONA_RIGA = 30;
let SPAZIO_ICONA = 12;

const FONT_SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
const FONT_SANS =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/* Esportazioni chiare: stessa identità oro/serif, ma leggibili e stampabili. */
const COLORI = {
  sfondo: '#f5efe4',
  superficie: '#fffdf8',
  testo: '#23262a',
  tenue: '#6b6257',
  oro: '#b89428',
  oroChiaro: '#7a5c10',
  bordo: 'rgba(35, 38, 42, 0.12)',
  bianco: '#ffffff',
} as const;

function font(peso: number, dimensione: number, famiglia = FONT_SANS): string {
  return `${peso} ${dimensione}px ${famiglia}`;
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

/** Icona dell'ingrediente, in oro scuro e con lo stesso tratto del sito. */
function iconaIngrediente(
  ctx: CanvasRenderingContext2D,
  tipo: TipoIngrediente,
  x: number,
  y: number,
): void {
  const scala = LATO_ICONA_RIGA / LATO_ICONA;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scala, scala);
  ctx.strokeStyle = COLORI.oroChiaro;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  disegnaIcona(tipo, {
    polilinea: (punti, chiusa) => {
      ctx.beginPath();
      punti.forEach((punto, indice) => {
        if (indice === 0) ctx.moveTo(punto.x, punto.y);
        else ctx.lineTo(punto.x, punto.y);
      });
      if (chiusa) ctx.closePath();
      ctx.stroke();
    },
    cerchio: ({ cx, cy, r }) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    },
  });

  ctx.restore();
}

/** Testo della percentuale con la sua base di riferimento. */
function testoPercentuale(voce: {
  percentuale?: number;
  basePercentuale?: string;
}): string {
  return `${formattaPercentuale(voce.percentuale ?? 0)} sulla ${voce.basePercentuale}`;
}

/**
 * Riepilogo tecnico: parametri della ricetta e quantità di questa esportazione.
 * I valori arrivano dalla vista condivisa, quindi seguono la configurazione
 * scelta nel calcolatore.
 */
function disegnaRiepilogoTecnico(
  ctx: CanvasRenderingContext2D,
  gruppi: GruppoRiepilogo[],
  y: number,
  smartphone = false,
): number {
  const ETICHETTA_PX = 13;
  const VALORE_PX = smartphone ? 15 : 16;
  const INTERLINEA_ETICHETTA = 17;
  const ALTEZZA_RIGA_RIEPILOGO = 22;
  const PADDING = smartphone ? 18 : 22;

  scrivi(
    ctx,
    'RIEPILOGO',
    MARGINE,
    y + 12,
    font(700, 12),
    COLORI.oroChiaro,
  );
  y += 30;

  for (const gruppo of gruppi) {
    ctx.font = font(700, VALORE_PX);
    const larghezzaValore = Math.max(
      0,
      ...gruppo.voci.map((voce) => ctx.measureText(voce.valore).width),
    );
    const larghezzaEtichetta = Math.max(
      smartphone ? 150 : 210,
      INTERNO - PADDING * 2 - larghezzaValore - 24,
    );

    const righe = gruppo.voci.map((voce) => {
      const linee = dividiInRighe(
        ctx,
        voce.etichetta,
        font(400, ETICHETTA_PX),
        larghezzaEtichetta,
      );
      return {
        linee,
        altezza:
          ALTEZZA_RIGA_RIEPILOGO +
          (Math.max(1, linee.length) - 1) * INTERLINEA_ETICHETTA,
      };
    });

    const altezza =
      44 +
      righe.reduce((totale, riga) => totale + riga.altezza, 0) +
      (smartphone ? 8 : 10);
    const top = y;

    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(
        MARGINE - PADDING / 2,
        top,
        INTERNO + PADDING,
        altezza,
        14,
      );
    } else {
      ctx.rect(MARGINE - PADDING / 2, top, INTERNO + PADDING, altezza);
    }
    ctx.fillStyle = COLORI.superficie;
    ctx.fill();
    ctx.strokeStyle = 'rgba(184, 148, 40, 0.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    scrivi(
      ctx,
      gruppo.titolo,
      MARGINE,
      top + 26,
      font(600, smartphone ? 18 : 19, FONT_SERIF),
      COLORI.oroChiaro,
    );
    linea(ctx, MARGINE, top + 38, LARGHEZZA - MARGINE);

    let rigaY = top + 44;
    righe.forEach((riga, indice) => {
      const primaBase = rigaY + 16;

      riga.linee.forEach((lineaTesto, posizione) => {
        scrivi(
          ctx,
          lineaTesto,
          MARGINE,
          primaBase + posizione * INTERLINEA_ETICHETTA,
          font(400, ETICHETTA_PX),
          COLORI.tenue,
        );
      });

      scrivi(
        ctx,
        gruppo.voci[indice].valore,
        LARGHEZZA - MARGINE,
        primaBase,
        font(700, VALORE_PX),
        COLORI.testo,
        'right',
      );

      if (indice < righe.length - 1) {
        linea(ctx, MARGINE, rigaY + riga.altezza - 1, LARGHEZZA - MARGINE);
      }
      rigaY += riga.altezza;
    });

    y = top + altezza + (smartphone ? 18 : 22);
  }

  return y;
}

/**
 * Layout dedicato al JPG: ricetta, riepilogo tecnico e dosi.
 * Viene eseguito due volte (misura e disegno) e resta sincrono, così il
 * download parte nello stesso gesto utente anche su Safari e iOS.
 */
function disegnaDosi(
  ctx: CanvasRenderingContext2D,
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  smartphone = false,
): number {
  const vista = creaVistaRicetta(risultato, ricetta);
  const NOME_PX = 16;
  const PERCENTUALE_PX = smartphone ? 14 : 13;
  const QUANTITA_PX = smartphone ? 22 : 18;
  const INTERLINEA_NOME = smartphone ? 24 : 22;
  const SPAZIO_COLONNE_JPG = smartphone ? 12 : 16;
  let y = MARGINE;    scrivi(
      ctx,
      MARCHIO.toUpperCase(),
    MARGINE,
    y + 13,
    font(700, 13),
    COLORI.oroChiaro,
  );
  y += 30;

  // Filo d'oro che separa il marchio dal titolo.
  ctx.fillStyle = COLORI.oro;
  ctx.fillRect(MARGINE, y, 54, 3);
  y += 26;

  y = blocco(
    ctx,
    vista.nomeRicetta,
    MARGINE,
    y,
    INTERNO,
    font(600, smartphone ? 29 : 40, FONT_SERIF),
    smartphone ? 29 : 40,
    COLORI.testo,
    smartphone ? 35 : 46,
  );
  y += 6;
  y = blocco(
    ctx,
    vista.descrizione,
    MARGINE,
    y,
    INTERNO,
    font(400, smartphone ? 16 : 16),
    16,
    COLORI.tenue,
    22,
  );
  y += 26;

  y = disegnaRiepilogoTecnico(ctx, vista.riepilogoTecnico, y, smartphone);
  y += 6;

  ctx.fillStyle = COLORI.oro;
  ctx.fillRect(MARGINE, y, INTERNO, 2);
  y += 40;

  // Colonne misurate sui contenuti: nome, percentuale e quantità restano
  // sulla stessa riga senza sovrapporsi, anche con nomi o dosi lunghi.
  const testiVoce = vista.fasi.flatMap((fase) => fase.voci);
  const fontNome = font(400, NOME_PX);
  const fontPercentuale = font(400, PERCENTUALE_PX);
  const fontQuantita = font(700, QUANTITA_PX);

  ctx.font = fontQuantita;
  const larghezzaQuantita = Math.max(
    0,
    ...testiVoce.map((voce) => ctx.measureText(voce.valore).width),
  );
  ctx.font = fontPercentuale;
  const larghezzaPercentuale = Math.max(
    0,
    ...testiVoce.map((voce) =>
      voce.percentuale !== undefined
        ? ctx.measureText(testoPercentuale(voce)).width
        : 0,
    ),
  );

  const xQuantita = LARGHEZZA - MARGINE;
  const xPercentuale =
    xQuantita - larghezzaQuantita - SPAZIO_COLONNE_JPG;
  const nomeMassimo =
    xPercentuale - larghezzaPercentuale - SPAZIO_COLONNE_JPG -
    (MARGINE + LATO_ICONA_RIGA + SPAZIO_ICONA);

  vista.fasi.forEach((fase) => {
    scrivi(
      ctx,
      fase.titolo,
      MARGINE,
      y + 24,
      font(600, smartphone ? 21 : 25, FONT_SERIF),
      COLORI.oroChiaro,
    );
    y += ALTEZZA_TITOLO_FASE;
    fase.voci.forEach((voce, indice) => {
      const righeNome = dividiInRighe(
        ctx,
        voce.etichetta,
        fontNome,
        nomeMassimo,
      );
      const altezza =
        ALTEZZA_RIGA + (Math.max(1, righeNome.length) - 1) * INTERLINEA_NOME;
      const centro = y + altezza / 2;
      const primaBase =
        centro + NOME_PX * 0.35 -
        ((Math.max(1, righeNome.length) - 1) * INTERLINEA_NOME) / 2;

      if (voce.tipo) {
        iconaIngrediente(
          ctx,
          voce.tipo,
          MARGINE,
          centro - LATO_ICONA_RIGA / 2,
        );
      }

      righeNome.forEach((riga, indiceRiga) => {
        scrivi(
          ctx,
          riga,
          MARGINE + LATO_ICONA_RIGA + SPAZIO_ICONA,
          primaBase + indiceRiga * INTERLINEA_NOME,
          fontNome,
          COLORI.tenue,
        );
      });

      if (voce.percentuale !== undefined) {
        scrivi(
          ctx,
          testoPercentuale(voce),
          xPercentuale,
          primaBase,
          fontPercentuale,
          COLORI.tenue,
          'right',
        );
      }

      scrivi(
        ctx,
        voce.valore,
        xQuantita,
        primaBase,
        fontQuantita,
        COLORI.testo,
        'right',
      );

      if (indice < fase.voci.length - 1) {
        linea(ctx, MARGINE, y + altezza - 1, LARGHEZZA - MARGINE);
      }
      y += altezza;
    });

    if (fase.totale) {
      scrivi(
        ctx,
        fase.totale.etichetta,
        MARGINE,
        y + 16,
        font(400, 14),
        COLORI.tenue,
      );
      scrivi(
        ctx,
        fase.totale.valore,
        LARGHEZZA - MARGINE,
        y + 16,
        font(700, 15),
        COLORI.oroChiaro,
        'right',
      );
      y += 30;
    }

    y += SPAZIO_FASE;
  });

  // Nota di chiusura, discreta e coerente con la ricetta esportata.
  const nota = vista.notaPeso
    ? `${MARCHIO} · dosi in grammi. ${vista.notaPeso}`
    : `${MARCHIO} · dosi in grammi.`;
  y += 6;
  y = blocco(
    ctx,
    nota,
    MARGINE,
    y,
    INTERNO,
    font(400, 12),
    12,
    COLORI.tenue,
    18,
  );

  // Fondo reale del contenuto: il pannello e il margine inferiore si
  // dimensionano su questo, senza tagliare la nota di chiusura.
  return y + 8;
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
  smartphone = false,
): string {
  LARGHEZZA = smartphone ? 560 : LARGHEZZA_LAYOUT_ESPORT;
  MARGINE = smartphone ? 40 : 72;
  INTERNO = LARGHEZZA - MARGINE * 2;
  ALTEZZA_RIGA = smartphone ? 72 : 78;
  LATO_ICONA_RIGA = smartphone ? 24 : 30;
  SPAZIO_ICONA = smartphone ? 10 : 12;
  const misura = creaCanvasMisura();
  const fondoContenuto = Math.ceil(
    disegnaDosi(misura, risultato, ricetta, smartphone),
  );
  const altoPannello = smartphone ? 12 : 30;
  const bassoPannello = fondoContenuto + (smartphone ? 26 : 24);
  const altezzaLogica = bassoPannello + 26;

  const canvas = document.createElement('canvas');
  canvas.width = LARGHEZZA * SCALA_JPG;
  canvas.height = Math.ceil(altezzaLogica * SCALA_JPG);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas non disponibile in questo browser.');
  }

  ctx.scale(SCALA_JPG, SCALA_JPG);
  ctx.fillStyle = COLORI.sfondo;
  ctx.fillRect(0, 0, LARGHEZZA, altezzaLogica);

  // Pannello leggermente più chiaro, come le card del sito.
  const pannello = {
    x: MARGINE - 28,
    y: altoPannello,
    larghezza: INTERNO + 56,
    altezza: bassoPannello - altoPannello,
    raggio: 18,
  };
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(
      pannello.x,
      pannello.y,
      pannello.larghezza,
      pannello.altezza,
      pannello.raggio,
    );
  } else {
    ctx.rect(
      pannello.x,
      pannello.y,
      pannello.larghezza,
      pannello.altezza,
    );
  }
  ctx.fillStyle = COLORI.superficie;
  ctx.fill();
  ctx.strokeStyle = 'rgba(184, 148, 40, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  disegnaDosi(ctx, risultato, ricetta, smartphone);

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
  smartphone = false,
): void {
  const blob = dataUrlABlob(generaJpgRicetta(risultato, ricetta, smartphone), 'image/jpeg');
  if (blob.size < 1024) {
    throw new Error('Il file JPG generato è vuoto.');
  }
  scaricaBlob(blob, nomeFile);
}
