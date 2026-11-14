import { dataUrlABlob } from '../lib/download';
import { grammiLievito } from '../lib/numeri';
import { MARCHIO_CERCHI, MARCHIO_PIENI, MARCHIO_SPESSORE, MARCHIO_TRATTI, MARCHIO_VIEWBOX } from './marchio';
import type { TipoIngrediente } from '../vecchio/types';
import { LATO_ICONA, disegnaIcona } from '../vecchio/lib/icone';

/*
 * FOGLIO DEL RISULTATO (JPG)
 * --------------------------
 * Il JPG è la versione da guardare e condividere, non da stampare: una scheda
 * compatta con dosi, resa e i numeri che contano, senza procedimento. Il PDF
 * (vedi ./pdf.ts) resta il foglio completo.
 *
 * Il disegno è quello del sito: fondo crema, schede bianche arrotondate con
 * un'ombra calda, pastiglie color latte tostato. Lo usano sia il calcolatore
 * libero sia le ricette di casa: cambiano i contenuti, mai il disegno.
 *
 * Il disegno è lineare: le schede e le pastiglie vengono dipinte *dietro* al
 * loro contenuto (`destination-over`), così l'altezza non va calcolata prima e
 * il codice resta leggibile come il foglio che descrive.
 */

export interface VoceDose {
  nome: string;
  grammi: number;
  nota?: string;
  /** Icona dell'ingrediente, disegnata accanto alla dose. */
  tipo?: TipoIngrediente;
  /** Percentuale sulla farina. */
  percentuale?: number;
  /** Base della percentuale: «farina totale», «farina della biga». */
  base?: string;
}

/** Una fase degli ingredienti: biga, autolisi, rinfresco, impasto. */
export interface FaseFoglio {
  titolo: string;
  nota?: string;
  /** Indicazione evidenziata sopra le dosi della fase. */
  avviso?: string;
  voci: readonly VoceDose[];
  /** Totale della fase: non va sommato di nuovo all'impasto. */
  totale?: { nome: string; grammi: number };
}

/** Gruppo del riepilogo tecnico: etichetta a sinistra, valore a destra. */
export interface GruppoFoglio {
  titolo: string;
  voci: readonly { etichetta: string; valore: string; valorePdf?: string }[];
}

export interface PassoFoglio {
  /** Quando avviene il passo; vuoto nelle ricette, dove è un'azione. */
  quando: string;
  orario?: { ora: string; giorno: string };
  istruzione?: string;
  titolo: string;
  nota: string;
  /** Testo esteso del passo: il procedimento delle ricette. */
  paragrafi?: readonly string[];
  elenco?: readonly string[];
  /** Sotto-voci rientrate, con titolo e paragrafi. */
  voci?: readonly { titolo: string; paragrafi: readonly string[] }[];
}

/** Un grafico già disegnato, pronto per essere incapsulato nel PDF. */
export interface ImmagineFoglio {
  /** JPEG in data URL. */
  datiUrl: string;
  larghezza: number;
  altezza: number;
}

export interface DatiFoglio {
  marcia?: readonly PassoFoglio[];
  soloProgramma?: boolean;
  titolo: string;
  sottotitolo: string;
  tipoLievito: string;
  /** Etichetta del primo riquadro, quando il tipo di impasto non è il lievito. */
  etichettaLievito?: string;
  lievitoG: number;
  lievitoNota: string;
  /** Dosi piatte del calcolatore libero; nelle ricette si usano le fasi. */
  dosi?: readonly VoceDose[];
  /** Grammi di farina del primo riquadro. */
  farinaG?: number;
  /** Ingredienti divisi per fase, come nelle ricette con biga o autolisi. */
  fasi?: readonly FaseFoglio[];
  /** Riepilogo tecnico delle ricette: parametri e quantità. */
  riepilogo?: readonly GruppoFoglio[];
  totaleG: number;
  totaleNota: string;
  forza?: {
    consigliata: number;
    efficace: number | null;
    finestra: string;
    /** Estremi numerici della finestra: servono al grafico del PDF. */
    minima: number;
    massima: number;
    testo: string;
  };
  passi: readonly PassoFoglio[];
  note: readonly string[];
  /** Titolo della sezione delle note: «CONSIGLI» nelle ricette. */
  noteTitolo?: string;
  /** Testo in alto a destra: «CALCOLATORE LIBERO» se non indicato. */
  occhiello?: string;
  /** Piede del foglio, uguale su tutte le pagine del PDF. */
  firma?: string;
  /** Riga discreta sotto il sottotitolo, per la data di generazione. */
  generatoIl?: string;
  /** Curva dell'attività: resta il ripiego vettoriale del PDF, il JPG la ignora. */
  curva?: readonly { ora: number; attivita: number }[];
  fasce?: readonly { da: number; a: number; inFrigo: boolean }[];
  oreTotali?: number;
  /**
   * I due grafici della schermata, rasterizzati al momento dell'esportazione:
   * il PDF li usa al posto del disegno vettoriale, che resta come ripiego.
   */
  grafici?: {
    forza?: ImmagineFoglio | null;
    attivita?: ImmagineFoglio | null;
  };
}

/** Larghezza della scheda: un formato verticale comodo da condividere. */
const LARGHEZZA = 1080;
const MARGINE = 64;
/** Padding interno delle schede. */
const PAD = 30;
const RAGGIO = 26;

/**
 * Risoluzione del JPG: una sola per tutto il sito. Prima il calcolatore
 * esportava a 1 e le ricette a 1,5, quindi lo stesso foglio usciva con due
 * definizioni diverse.
 */
export const SCALA_JPG = 1.5;

const SANS =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Didascalie e legenda dei grafici: le stesse parole nel JPG e nel PDF. */
export const TITOLI_GRAFICI: Record<'forza' | 'attivita', string> = {
  forza: 'Zona di forza richiesta e mix',
  attivita: 'Attività del lievito e temperatura',
};

/** Piede del foglio: uno solo per tutto il sito, in ogni PDF e in ogni JPG. */
export const FIRMA_FOGLIO =
  'PizzaMetria · tutte le dosi restano nel tuo browser';

/* La tavolozza è quella dei token del sito (`src/index.css`). */
const COLORI = {
  sfondo: '#f5f1ea',
  carta: '#ffffff',
  crema: '#faf6ef',
  testo: '#3a342c',
  testoScuro: '#57504a',
  tenue: '#7a7064',
  oro: '#b99b77',
  oroScuro: '#8a6d4e',
  bordo: '#e4dcce',
  ombra: 'rgba(138, 109, 78, 0.13)',
} as const;

function font(peso: number, dimensione: number): string {
  return `${peso} ${dimensione}px ${SANS}`;
}

/** Numeri all'italiana, con il punto delle migliaia scritto qui. */
function numero(valore: number): string {
  const arrotondato = Math.round(valore * 10) / 10;
  const [intero, decimale] = arrotondato.toFixed(1).replace(/\.0$/, '').split('.');
  const raggruppato = intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimale ? `${raggruppato},${decimale}` : raggruppato;
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

/** Etichette piccole in maiuscolo, con lo spazio fra le lettere del sito. */
function scriviSpaziato(
  ctx: CanvasRenderingContext2D,
  testo: string,
  x: number,
  lineaBase: number,
  dimensione: number,
  colore: string,
  spaziatura = 1.6,
): number {
  ctx.font = font(700, dimensione);
  ctx.fillStyle = colore;
  ctx.textAlign = 'left';
  let cursore = x;
  for (const carattere of testo) {
    ctx.fillText(carattere, cursore, lineaBase);
    cursore += ctx.measureText(carattere).width + spaziatura;
  }
  return cursore - x - spaziatura;
}

function dividiRighe(
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
  return righe;
}

/** «75,0% sulla farina totale», oppure null se la dose non ha percentuale. */
function testoPercentuale(dose: VoceDose): string | null {
  if (typeof dose.percentuale !== 'number') return null;
  const cifre = dose.percentuale >= 10 ? 1 : 2;
  const valore = dose.percentuale.toLocaleString('it-IT', {
    minimumFractionDigits: cifre,
    maximumFractionDigits: cifre,
  });
  return `${valore}%${dose.base ? ` sulla ${dose.base}` : ''}`;
}

/** Icona dell'ingrediente sulla griglia 24 × 24, come nel PDF. */
function icona(
  ctx: CanvasRenderingContext2D,
  tipo: TipoIngrediente,
  x: number,
  ySuperiore: number,
  lato: number,
): void {
  const scala = lato / LATO_ICONA;
  ctx.strokeStyle = COLORI.oroScuro;
  ctx.lineWidth = 2;
  disegnaIcona(tipo, {
    polilinea: (punti, chiusa) => {
      ctx.beginPath();
      punti.forEach((punto, indice) => {
        const px = x + punto.x * scala;
        const py = ySuperiore + punto.y * scala;
        if (indice === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      if (chiusa) ctx.closePath();
      ctx.stroke();
    },
    cerchio: (cerchio) => {
      ctx.beginPath();
      ctx.arc(
        x + cerchio.cx * scala,
        ySuperiore + cerchio.cy * scala,
        cerchio.r * scala,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    },
  });
}

/** Un valore del riepilogo tecnico, cercato per etichetta. */
function valoreRiepilogo(dati: DatiFoglio, etichetta: string): string | null {
  const cercata = etichetta.toLocaleLowerCase('it-IT');
  for (const gruppo of dati.riepilogo ?? []) {
    for (const voce of gruppo.voci) {
      if (voce.etichetta.toLocaleLowerCase('it-IT') === cercata) return voce.valore;
    }
  }
  return null;
}

/**
 * Disegna il foglio compatto. `scala` serve alla definizione del file: a 1,5 la
 * scheda esce a 1620 px di larghezza, nitida anche ingrandita.
 */
export function disegnaFoglio(
  dati: DatiFoglio,
  scala = 1,
  stretto = false,
): HTMLCanvasElement {
  const larghezza = stretto ? 820 : LARGHEZZA;
  const margine = stretto ? 44 : MARGINE;
  const interno = larghezza - margine * 2;
  const pad = stretto ? 24 : PAD;

  const tela = document.createElement('canvas');
  tela.width = Math.round(larghezza * scala);
  // Altezza generosa: la scheda viene ritagliata sull'ultima riga disegnata.
  tela.height = Math.round(2600 * scala);

  const ctx = tela.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile per l’esportazione.');

  ctx.scale(scala, scala);
  ctx.textBaseline = 'alphabetic';

  /** Dipinge dietro a quello che c'è già: schede, pastiglie, riquadri. */
  const dietro = (disegno: () => void): void => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    disegno();
    ctx.restore();
  };

  const scheda = (): void =>
    dietro(() => {
      // Con `destination-over` l'ultimo disegno finisce più sotto: prima la
      // carta, poi l'ombra, che così resta dietro alla scheda invece di
      // velarla di grigio.
      ctx.fillStyle = COLORI.carta;
      ctx.strokeStyle = COLORI.bordo;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(margine, telaY, interno, altezzaScheda, RAGGIO);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = COLORI.ombra;
      ctx.beginPath();
      ctx.roundRect(margine, telaY + 5, interno, altezzaScheda, RAGGIO);
      ctx.fill();
    });

  // La scheda corrente: si apre con `apriScheda`, si chiude con `chiudiScheda`.
  let telaY = 0;
  let altezzaScheda = 0;

  const apriScheda = (y: number): void => {
    telaY = y;
    altezzaScheda = 0;
  };

  const chiudiScheda = (yFondo: number): void => {
    altezzaScheda = yFondo - telaY;
    scheda();
  };

  const pastiglia = (
    x: number,
    y: number,
    altezza: number,
    testo: string,
    dimensione = 15,
  ): number => {
    ctx.font = font(700, dimensione);
    const larghezzaPastiglia = ctx.measureText(testo).width + dimensione * 1.9;
    scrivi(ctx, testo, x + larghezzaPastiglia / 2, y + altezza / 2 + dimensione * 0.36, font(700, dimensione), COLORI.oroScuro, 'center');
    dietro(() => {
      ctx.fillStyle = COLORI.crema;
      ctx.strokeStyle = COLORI.bordo;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, larghezzaPastiglia, altezza, altezza / 2);
      ctx.fill();
      ctx.stroke();
    });
    return larghezzaPastiglia;
  };

  /**
   * Marchio: il trancio graduato della home (`src/components/Marchio.tsx`),
   * dentro il tondo di carta della testata. I tracciati sono gli stessi del
   * componente, quindi il foglio non ha un logo suo.
   */
  const marchio = (x: number, y: number, lato: number): void => {
    const cx = x + lato / 2;
    const cy = y + lato / 2;
    const raggio = lato / 2 - 1;

    dietro(() => {
      ctx.fillStyle = COLORI.carta;
      ctx.strokeStyle = COLORI.bordo;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, raggio, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const vista = MARCHIO_VIEWBOX;
    const scala = (lato * 0.66) / Math.max(vista.larghezza, vista.altezza);

    ctx.save();
    ctx.translate(
      x + (lato - vista.larghezza * scala) / 2 - vista.x * scala,
      y + (lato - vista.altezza * scala) / 2 - vista.y * scala,
    );
    ctx.scale(scala, scala);
    ctx.fillStyle = COLORI.oro;
    ctx.strokeStyle = COLORI.oro;
    ctx.lineWidth = MARCHIO_SPESSORE;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    for (const percorso of MARCHIO_PIENI) ctx.fill(new Path2D(percorso));
    for (const segno of MARCHIO_CERCHI) {
      ctx.beginPath();
      ctx.arc(segno.cx, segno.cy, segno.r, 0, Math.PI * 2);
      if (segno.tratto) ctx.stroke();
      else ctx.fill();
    }
    for (const percorso of MARCHIO_TRATTI) ctx.stroke(new Path2D(percorso));

    ctx.restore();
  };

  let y = margine;

  // Testata del marchio, come in cima alle pagine del sito.
  marchio(margine, y, stretto ? 52 : 58);
  scrivi(
    ctx,
    'PizzaMetria',
    margine + (stretto ? 64 : 72),
    y + (stretto ? 24 : 27),
    font(800, stretto ? 24 : 27),
    COLORI.testo,
  );
  scriviSpaziato(
    ctx,
    'IL CALCOLATORE DI IMPASTI',
    margine + (stretto ? 65 : 73),
    y + (stretto ? 41 : 46),
    stretto ? 9 : 10,
    COLORI.oroScuro,
  );

  const occhiello = dati.occhiello ?? 'CALCOLATORE LIBERO';
  ctx.font = font(700, stretto ? 10 : 11);
  const larghezzaOcchiello = ctx.measureText(occhiello).width + 30;
  pastiglia(larghezza - margine - larghezzaOcchiello, y + 13, stretto ? 28 : 32, occhiello, stretto ? 10 : 11);

  y += stretto ? 60 : 66;
  ctx.strokeStyle = COLORI.bordo;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margine, y);
  ctx.lineTo(larghezza - margine, y);
  ctx.stroke();
  y += stretto ? 30 : 36;

  // Apertura: filo d'oro, titolo, sottotitolo, pastiglia del tipo.
  ctx.fillStyle = COLORI.oro;
  ctx.beginPath();
  ctx.roundRect(margine, y, 44, 5, 2.5);
  ctx.fill();
  y += stretto ? 26 : 32;

  const dimensioneTitolo = stretto ? 38 : 46;
  const interlineaTitolo = dimensioneTitolo * 1.14;
  const righeTitolo = dividiRighe(ctx, dati.titolo, font(800, dimensioneTitolo), interno);
  righeTitolo.forEach((riga, indice) => {
    scrivi(
      ctx,
      riga,
      margine,
      y + dimensioneTitolo * 0.78 + indice * interlineaTitolo,
      font(800, dimensioneTitolo),
      COLORI.testo,
    );
  });
  y += righeTitolo.length * interlineaTitolo + 2;

  const dimensioneSotto = stretto ? 19 : 21;
  const interlineaSotto = dimensioneSotto * 1.42;
  const righeSotto = dividiRighe(ctx, dati.sottotitolo, font(400, dimensioneSotto), interno);
  righeSotto.forEach((riga, indice) => {
    scrivi(
      ctx,
      riga,
      margine,
      y + dimensioneSotto * 0.8 + indice * interlineaSotto,
      font(400, dimensioneSotto),
      COLORI.tenue,
    );
  });
  y += righeSotto.length * interlineaSotto + (stretto ? 18 : 22);

  const larghezzaTipo = pastiglia(
    margine,
    y,
    stretto ? 30 : 34,
    dati.tipoLievito.toLocaleUpperCase('it-IT'),
    stretto ? 11 : 12,
  );
  if (dati.generatoIl) {
    scrivi(
      ctx,
      dati.generatoIl,
      margine + larghezzaTipo + 18,
      y + (stretto ? 21 : 23),
      font(400, stretto ? 14 : 15),
      COLORI.tenue,
    );
  }
  y += (stretto ? 30 : 34) + (stretto ? 26 : 30);

  /* ---------------------------- DOSI E RESA ---------------------------- */
  apriScheda(y);
  let c = y + pad;

  scrivi(ctx, 'Dosi e resa', margine + pad, c + (stretto ? 24 : 27), font(800, stretto ? 25 : 28), COLORI.testo);
  c += stretto ? 46 : 52;

  // Riquadro della resa: il dato che si cerca per primo.
  const altezzaResa = stretto ? 86 : 96;
  const righeResa = dividiRighe(ctx, dati.totaleNota, font(800, stretto ? 26 : 29), interno - pad * 2 - 40);
  const altezzaRiquadro = altezzaResa + Math.max(0, righeResa.length - 1) * 34;

  scriviSpaziato(ctx, 'RESA', margine + pad + 20, c + 34, stretto ? 10 : 11, COLORI.oroScuro);
  righeResa.forEach((riga, indice) => {
    scrivi(
      ctx,
      riga,
      margine + pad + 20,
      c + 74 + indice * 34,
      font(800, stretto ? 26 : 29),
      COLORI.testo,
    );
  });
  dietro(() => {
    ctx.fillStyle = COLORI.crema;
    ctx.strokeStyle = COLORI.bordo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(margine + pad, c, interno - pad * 2, altezzaRiquadro, stretto ? 16 : 20);
    ctx.fill();
    ctx.stroke();
  });
  c += altezzaRiquadro + (stretto ? 26 : 30);

  const fasi = dati.fasi ?? [];
  const disegnaDose = (dose: VoceDose, separatore: boolean, fine: number): void => {
    const altezzaRiga = dose.nota ? (stretto ? 68 : 74) : stretto ? 50 : 56;
    let xNome = margine + pad;
    if (dose.tipo) {
      icona(ctx, dose.tipo, margine + pad, c + (stretto ? 10 : 12), stretto ? 24 : 27);
      xNome = margine + pad + (stretto ? 36 : 40);
    }
    scrivi(ctx, dose.nome, xNome, c + (stretto ? 34 : 38), font(500, stretto ? 21 : 23), COLORI.testo);
    if (dose.nota) {
      scrivi(ctx, dose.nota, xNome, c + (stretto ? 56 : 62), font(400, stretto ? 16 : 17), COLORI.tenue);
    }
    const percentuale = testoPercentuale(dose);
    if (percentuale) {
      scrivi(
        ctx,
        percentuale,
        fine - (stretto ? 120 : 140),
        c + (stretto ? 34 : 38),
        font(400, stretto ? 15 : 17),
        COLORI.tenue,
        'right',
      );
    }
    scrivi(
      ctx,
      `${dose.tipo === 'lievito' ? grammiLievito(dose.grammi) : numero(dose.grammi)} g`,
      fine,
      c + (stretto ? 34 : 38),
      font(700, stretto ? 22 : 24),
      COLORI.testo,
      'right',
    );
    if (separatore) {
      ctx.strokeStyle = COLORI.bordo;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margine + pad, c + altezzaRiga - 3);
      ctx.lineTo(fine, c + altezzaRiga - 3);
      ctx.stroke();
    }
    c += altezzaRiga;
  };

  const fine = larghezza - margine - pad;

  if (fasi.length > 0) {
    fasi.forEach((fase, indiceFase) => {
      if (indiceFase > 0) c += stretto ? 22 : 26;

      const larghezzaEtichetta = scriviSpaziato(
        ctx,
        fase.titolo.toLocaleUpperCase('it-IT'),
        margine + pad,
        c + 16,
        stretto ? 11 : 12,
        COLORI.oroScuro,
      );
      ctx.strokeStyle = COLORI.bordo;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(margine + pad + larghezzaEtichetta + 14, c + 12);
      ctx.lineTo(fine, c + 12);
      ctx.stroke();
      c += stretto ? 26 : 30;

      if (fase.nota) {
        const righeNota = dividiRighe(ctx, fase.nota, font(400, stretto ? 15 : 17), interno - pad * 2);
        righeNota.forEach((riga, indice) => {
          scrivi(ctx, riga, margine + pad, c + 15 + indice * 23, font(400, stretto ? 15 : 17), COLORI.tenue);
        });
        c += righeNota.length * 23 + 8;
      }

      if (fase.avviso) {
        const righeAvviso = dividiRighe(ctx, fase.avviso, font(700, stretto ? 15 : 16), interno - pad * 2 - 32);
        const altezzaAvviso = righeAvviso.length * 22 + 20;
        righeAvviso.forEach((riga, indice) => {
          scrivi(
            ctx,
            riga,
            margine + pad + 16,
            c + 26 + indice * 22,
            font(700, stretto ? 15 : 16),
            COLORI.oroScuro,
          );
        });
        dietro(() => {
          ctx.fillStyle = COLORI.crema;
          ctx.strokeStyle = COLORI.bordo;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(margine + pad, c, interno - pad * 2, altezzaAvviso, 12);
          ctx.fill();
          ctx.stroke();
        });
        c += altezzaAvviso + 14;
      }

      fase.voci.forEach((dose, indice) => {
        disegnaDose(dose, indice < fase.voci.length - 1, fine);
      });

      if (fase.totale) {
        c += stretto ? 10 : 12;
        scrivi(ctx, fase.totale.nome, margine + pad, c + 26, font(500, stretto ? 19 : 21), COLORI.tenue);
        scrivi(
          ctx,
          `${numero(fase.totale.grammi)} g`,
          fine,
          c + 26,
          font(700, stretto ? 21 : 23),
          COLORI.oroScuro,
          'right',
        );
        c += 40;
      }
    });
  } else {
    const dosi = dati.dosi ?? [];
    dosi.forEach((dose, indice) => disegnaDose(dose, indice < dosi.length - 1, fine));
  }

  // Fascia dell'impasto: l'ultimo numero della scheda, in grande.
  c += stretto ? 16 : 20;
  const altezzaFascia = stretto ? 72 : 82;
  scrivi(ctx, 'Peso impasto', margine + pad + 20, c + (stretto ? 44 : 50), font(700, stretto ? 19 : 21), COLORI.testo);
  scrivi(
    ctx,
    `${numero(dati.totaleG)} g`,
    fine - 20,
    c + (stretto ? 47 : 53),
    font(800, stretto ? 30 : 33),
    COLORI.oroScuro,
    'right',
  );
  dietro(() => {
    ctx.fillStyle = COLORI.crema;
    ctx.strokeStyle = COLORI.bordo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(margine + pad, c, interno - pad * 2, altezzaFascia, 16);
    ctx.fill();
    ctx.stroke();
  });
  c += altezzaFascia + pad;
  chiudiScheda(c);
  y = c + (stretto ? 22 : 26);

  /* -------------------------- TABELLA DI MARCIA -------------------------- */
  const marcia = dati.passi.filter((passo) => passo.orario);
  const mostraMarcia = marcia.length > 0 && marcia.length <= 6 && marcia.length === dati.passi.length;

  if (mostraMarcia) {
    apriScheda(y);
    c = y + pad;
    scrivi(ctx, 'Tabella di marcia', margine + pad, c + 24, font(800, stretto ? 23 : 26), COLORI.testo);
    c += stretto ? 42 : 48;

    marcia.forEach((passo, indice) => {
      const xAzione = margine + pad + (stretto ? 74 : 84);
      const larghezzaAzione = fine - xAzione;
      const nota = [passo.istruzione, passo.nota].filter(Boolean).join(' ');
      const righeNota = nota
        ? dividiRighe(ctx, nota, font(400, stretto ? 15 : 16), larghezzaAzione)
        : [];
      const altezzaRiga = Math.max(stretto ? 54 : 60, 26 + righeNota.length * 21 + 14);

      if (passo.orario) {
        scrivi(ctx, passo.orario.ora, margine + pad, c + 24, font(700, stretto ? 19 : 21), COLORI.oroScuro);
        scrivi(ctx, passo.orario.giorno, margine + pad, c + 44, font(400, stretto ? 14 : 15), COLORI.tenue);
      }
      scrivi(ctx, passo.titolo, xAzione, c + 24, font(700, stretto ? 19 : 21), COLORI.testo);
      righeNota.forEach((riga, posizione) => {
        scrivi(
          ctx,
          riga,
          xAzione,
          c + 47 + posizione * 21,
          font(400, stretto ? 15 : 16),
          COLORI.tenue,
        );
      });

      if (indice < marcia.length - 1) {
        ctx.strokeStyle = COLORI.bordo;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(margine + pad, c + altezzaRiga - 4);
        ctx.lineTo(fine, c + altezzaRiga - 4);
        ctx.stroke();
      }
      c += altezzaRiga;
    });

    c += pad - 6;
    chiudiScheda(c);
    y = c + (stretto ? 22 : 26);
  }

  /* ------------------------------- IN BREVE ------------------------------ */
  const idratazione = valoreRiepilogo(dati, 'Idratazione');
  const sale = valoreRiepilogo(dati, 'Sale');
  const voci: { etichetta: string; valore: string }[] = [
    {
      etichetta: 'Lievito',
      valore: `${dati.lievitoG > 0 ? grammiLievito(dati.lievitoG) : '—'} g`,
    },
  ];
  if (idratazione) {
    const percentuale = idratazione.match(/^\s*\d+(?:[.,]\d+)?\s*%/);
    voci.push({
      etichetta: 'Idratazione',
      valore: percentuale ? percentuale[0].replace(/\s+/g, '') : idratazione,
    });
  }
  if (dati.forza) {
    voci.push({
      etichetta: 'Forza',
      valore: `W ${Math.round(dati.forza.efficace ?? dati.forza.consigliata)}`,
    });
  } else if (sale) {
    // Sul telefono la pastiglia è stretta: del sale basta la percentuale.
    const percentuale = sale.match(/^\s*\d+(?:[.,]\d+)?\s*%/);
    voci.push({
      etichetta: 'Sale',
      valore: stretto && percentuale ? percentuale[0].replace(/\s+/g, '') : sale.replace(/\s+/g, ' '),
    });
  }

  if (voci.length >= 2) {
    apriScheda(y);
    c = y + pad;
    scrivi(ctx, 'In breve', margine + pad, c + 22, font(800, stretto ? 21 : 23), COLORI.testo);
    c += stretto ? 38 : 44;

    const distanza = 14;
    const larghezzaVoce = (interno - pad * 2 - distanza * (voci.length - 1)) / voci.length;
    const altezzaVoce = stretto ? 74 : 82;
    voci.forEach((voce, indice) => {
      const x = margine + pad + indice * (larghezzaVoce + distanza);
      scriviSpaziato(
        ctx,
        voce.etichetta.toLocaleUpperCase('it-IT'),
        x + 16,
        c + 28,
        stretto ? 9 : 10,
        COLORI.oroScuro,
      );
      // Il valore si rimpicciolisce solo se serve a restare dentro la pastiglia.
      let dimensioneValore = stretto ? 22 : 24;
      const disponibile = larghezzaVoce - 32;
      while (dimensioneValore > 13) {
        ctx.font = font(700, dimensioneValore);
        if (ctx.measureText(voce.valore).width <= disponibile) break;
        dimensioneValore -= 1;
      }
      scrivi(ctx, voce.valore, x + 16, c + (stretto ? 60 : 64), font(700, dimensioneValore), COLORI.testo);
      dietro(() => {
        ctx.fillStyle = COLORI.crema;
        ctx.strokeStyle = COLORI.bordo;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, c, larghezzaVoce, altezzaVoce, 14);
        ctx.fill();
        ctx.stroke();
      });
    });

    c += altezzaVoce + pad - 4;
    chiudiScheda(c);
    y = c + (stretto ? 22 : 26);
  }

  /* -------------------------------- PIEDE ------------------------------- */
  y += stretto ? 4 : 6;
  scrivi(
    ctx,
    dati.firma ?? FIRMA_FOGLIO,
    larghezza / 2,
    y + 20,
    font(400, stretto ? 13 : 14),
    COLORI.tenue,
    'center',
  );
  y += 34;

  // Ritaglio sull'altezza usata: niente banda vuota in fondo al JPG.
  const altezza = Math.ceil(y + margine * 0.6);
  const finale = document.createElement('canvas');
  finale.width = Math.round(larghezza * scala);
  finale.height = Math.round(altezza * scala);

  const contestoFinale = finale.getContext('2d');
  if (!contestoFinale) throw new Error('Canvas non disponibile per l’esportazione.');

  contestoFinale.fillStyle = COLORI.sfondo;
  contestoFinale.fillRect(0, 0, finale.width, finale.height);
  contestoFinale.drawImage(tela, 0, 0);

  return finale;
}

/**
 * Disegna il foglio come JPG: dosi, resa e i numeri in breve, senza procedimento.
 * Restituisce il file senza scaricarlo, come il PDF.
 */
export async function jpgBlob(
  dati: DatiFoglio,
  scala = SCALA_JPG,
  stretto = false,
): Promise<Blob> {
  const tela = disegnaFoglio(dati, scala, stretto);
  return dataUrlABlob(tela.toDataURL('image/jpeg', 0.92), 'image/jpeg');
}
