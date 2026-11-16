import { STILE_FOGLIO } from './stile-foglio';
import { dataUrlABlob } from '../lib/download';
import { grammiLievito } from '../lib/numeri';
import type { TipoIngrediente } from '../vecchio/types';
import { LATO_ICONA, disegnaIcona } from '../vecchio/lib/icone';

/*
 * FOGLIO DEL RISULTATO
 * --------------------
 * Un solo disegno, due formati: il JPG esce da qui, il PDF incapsula lo stesso
 * foglio (vedi ./pdf.ts). La tavolozza è quella chiara delle esportazioni del
 * sito — crema, oro, serif — così il foglio si stampa senza sprecare inchiostro
 * e resta riconoscibile.
 *
 * Lo usano sia il calcolatore libero sia le ricette di casa: cambiano i
 * contenuti (dosi piatte oppure fasi, riepilogo tecnico, procedimento), mai il
 * disegno.
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
  intestazionePdf?: { descrizione?: string; resa?: string };
  tipoLievito: string;
  /** Etichetta del primo riquadro, quando il tipo di impasto non è il lievito. */
  etichettaLievito?: string;
  lievitoG: number;
  lievitoNota: string;
  /** Dosi piatte del calcolatore libero; nelle ricette si usano le fasi. */
  dosi?: readonly VoceDose[];
  /** Grammi di farina del primo riquadro. */
  farinaG?: number;
  idratazione?: number;
  /** Ingredienti divisi per fase, come nelle ricette con biga o autolisi. */
  fasi?: readonly FaseFoglio[];
  /** Riepilogo tecnico delle ricette: parametri e quantità. */
  riepilogo?: readonly GruppoFoglio[];
  formati?: GruppoFoglio;
  totaleG: number;
  totaleNota: string;
  forza?: {
    consigliata: number;
    efficace: number | null;
    finestra: string;
    /** Estremi numerici della finestra: servono al grafico del PDF. */
    minima: number;
    massima: number;
    zonaSicura?: readonly [number, number];
    testo: string;
  };
  passi: readonly PassoFoglio[];
  note: readonly string[];
  /** Titolo della sezione delle note: «CONSIGLI» nelle ricette. */
  noteTitolo?: string;
  /** Testo in alto a destra: «Calcola la tua pizza» se non indicato. */
  occhiello?: string;
  /** Piede del foglio, uguale su tutte le pagine del PDF. */
  firma?: string;
  /** Riga discreta sotto il sottotitolo, per la data di generazione. */
  generatoIl?: string;
  /** Curva dell'attività: resta il ripiego vettoriale del PDF, il JPG la ignora. */
  curva?: readonly { ora: number; attivita: number; temperatura?: number }[];
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

/** Gli stessi tre indicatori del riepilogo della ricetta. */
export function indicatoriFoglio(dati: DatiFoglio) {
  if (dati.soloProgramma || dati.farinaG === undefined || dati.idratazione === undefined) {
    return [];
  }
  return [
    { etichetta: 'Farina totale', valore: `${numero(dati.farinaG)} g` },
    { etichetta: 'Peso impasto', valore: `${numero(dati.totaleG)} g` },
    { etichetta: 'Idratazione', valore: `${numero(dati.idratazione)}%` },
  ];
}

const LARGHEZZA = 1240;
const MARGINE = 84;

/**
 * Risoluzione del JPG: una sola per tutto il sito. Prima il calcolatore
 * esportava a 1 e le ricette a 1,5, quindi lo stesso foglio usciva con due
 * definizioni diverse.
 */
export const SCALA_JPG = 1.5;

const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';
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

const COLORI = {
  sfondo: '#ffffff',
  superficie: STILE_FOGLIO.scheda,
  testo: STILE_FOGLIO.testo,
  tenue: STILE_FOGLIO.tenue,
  oro: STILE_FOGLIO.accento,
  oroScuro: STILE_FOGLIO.accentoScuro,
  /** Velo della pillola del lievito, come nel JPG del vecchio sito. */
  oroVelo: STILE_FOGLIO.indicatore,
  bordo: STILE_FOGLIO.bordo,
} as const;

function font(peso: number, dimensione: number, famiglia = SANS): string {
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

function linea(
  ctx: CanvasRenderingContext2D,
  da: number,
  y: number,
  a: number,
  colore: string,
): void {
  ctx.strokeStyle = colore;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(da, y);
  ctx.lineTo(a, y);
  ctx.stroke();
}

function rettangolo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  larghezza: number,
  altezza: number,
  raggio = 18,
  fondo: string = COLORI.superficie,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, larghezza, altezza, raggio);
  ctx.fillStyle = fondo;
  ctx.fill();
  ctx.strokeStyle = COLORI.bordo;
  ctx.lineWidth = 1.5;
  ctx.stroke();
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

function paragrafo(
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
  const righe = dividiRighe(ctx, testo, fontTesto, larghezzaMassima);
  righe.forEach((riga, indice) => {
    scrivi(ctx, riga, x, superiore + dimensione + indice * interlinea, fontTesto, colore);
  });
  return superiore + righe.length * interlinea;
}

function numero(valore: number): string {
  return valore.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

/** «% 62,3 sulla farina totale», oppure null se la dose non ha percentuale. */
function testoPercentuale(dose: VoceDose): string | null {
  if (typeof dose.percentuale !== 'number') return null;
  const cifre = dose.percentuale >= 10 ? 1 : 2;
  const valore = dose.percentuale.toLocaleString('it-IT', {
    minimumFractionDigits: cifre,
    maximumFractionDigits: cifre,
  });
  return `% ${valore}${dose.base ? ` sulla ${dose.base}` : ''}`;
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
  ctx.lineWidth = 1.6;
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

function titoloSezione(
  ctx: CanvasRenderingContext2D,
  testo: string,
  y: number,
  dimensione = 30,
): number {
  // Serif dorato e filo sotto, la firma dei titoli del foglio vecchio.
  scrivi(ctx, testo, MARGINE, y + dimensione * 0.78, font(700, dimensione), COLORI.oroScuro);
  ctx.fillStyle = COLORI.oro;
  ctx.fillRect(MARGINE, y + dimensione * 1.04, 54, 2);
  return y + dimensione + 22;
}

/**
 * Disegna il foglio. `scala` serve solo alla stampa: a 1,5 la pagina A4 esce a
 * circa 240 dpi invece di 160, e il testo resta leggibile senza ingrandire.
 */
export function disegnaFoglio(dati: DatiFoglio, scala = 1, stretto = false): HTMLCanvasElement {
  // Il foglio normale è largo 1240 px; la versione per smartphone è più
  // stretta, così sul telefono si legge a piena larghezza senza zoom.
  const larghezza = stretto ? 900 : LARGHEZZA;
  const interno = larghezza - MARGINE * 2;
  const tela = document.createElement('canvas');
  tela.width = Math.round(larghezza * scala);
  // Altezza generosa: il foglio viene ritagliato sull'ultima riga disegnata.
  // Serve spazio anche per il procedimento completo delle ricette.
  tela.height = Math.round(5400 * scala);

  const ctx = tela.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponibile per l’esportazione.');

  ctx.scale(scala, scala);


  let y = MARGINE;

  // Occhiello
  scrivi(ctx, 'PizzaMetria', MARGINE, y + 16, font(700, 18), COLORI.oro);
  scrivi(
    ctx,
    dati.occhiello ?? 'Calcola la tua pizza',
    larghezza - MARGINE,
    y + 16,
    font(600, 18),
    COLORI.tenue,
    'right',
  );
  y += 30;
  ctx.fillStyle = COLORI.oro;
  ctx.fillRect(MARGINE, y, 54, 3);
  y += 32;

  // Titolo, con la pillola del lievito a destra come nel foglio vecchio.
  const misuraTitolo = stretto ? 44 : 52;
  const fontTitolo = font(750, misuraTitolo);
  const righeTitolo = dividiRighe(ctx, dati.titolo, fontTitolo, interno);
  ctx.font = fontTitolo;
  righeTitolo.forEach((riga, i) => {
    scrivi(ctx, riga, MARGINE, y + 50 + i * (misuraTitolo + 5), fontTitolo, COLORI.testo);
  });
  const etichettaTipo = dati.tipoLievito.replace(/^Lievito\s+/i, '').toUpperCase();
  const fontBadge = font(700, 16);
  const larghezzaBadge = Math.ceil(ctx.measureText(etichettaTipo).width) + 24;
  ctx.font = fontTitolo;
  if (!dati.soloProgramma && righeTitolo.length === 1 && ctx.measureText(dati.titolo).width + 16 + larghezzaBadge <= interno) {
    const xBadge = larghezza - MARGINE - larghezzaBadge;
    ctx.beginPath();
    ctx.roundRect(xBadge, y + 22, larghezzaBadge, 34, 17);
    ctx.fillStyle = COLORI.oroVelo;
    ctx.fill();
    ctx.strokeStyle = COLORI.oro;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    scrivi(
      ctx,
      etichettaTipo,
      xBadge + larghezzaBadge / 2,
      y + 45,
      fontBadge,
      COLORI.oroScuro,
      'center',
    );
  }
  y += 80 + (righeTitolo.length - 1) * (misuraTitolo + 5);
  y = paragrafo(ctx, dati.sottotitolo, MARGINE, y, interno, font(400, 24), 24, COLORI.tenue, 33);

  // Data di generazione: discreta, come nell'intestazione della ricetta.
  if (dati.generatoIl) {
    y += 6;
    scrivi(ctx, dati.generatoIl, MARGINE, y + 16, font(400, 18), COLORI.tenue);
    y += 20;
  }

  y += 24;
  linea(ctx, MARGINE, y, larghezza - MARGINE, COLORI.bordo);
  y += 40;

  // Riepilogo tecnico delle ricette: due gruppi, senza riquadri.
  for (const gruppo of dati.riepilogo ?? []) {
    scrivi(
      ctx,
      gruppo.titolo.toUpperCase(),
      MARGINE,
      y + 18,
      font(600, 18, SERIF),
      COLORI.oroScuro,
    );
    linea(ctx, MARGINE, y + 30, larghezza - MARGINE, COLORI.bordo);
    y += 34;

    gruppo.voci.forEach((voce, indice) => {
      const fontEtichetta = font(400, 18);
      const fontValore = font(400, 21, SERIF);
      const spazioColonne = 18;
      ctx.font = fontEtichetta;
      const larghezzaEtichetta = ctx.measureText(voce.etichetta).width;
      ctx.font = fontValore;
      const larghezzaValore = ctx.measureText(voce.valore).width;
      const entraSuUnaRiga = larghezzaEtichetta + spazioColonne + larghezzaValore <= interno;
      const larghezzaColonnaValore = interno * 0.52;
      const righeEtichetta = entraSuUnaRiga
        ? [voce.etichetta]
        : dividiRighe(ctx, voce.etichetta, fontEtichetta, interno - spazioColonne - larghezzaColonnaValore);
      const righeValore = entraSuUnaRiga
        ? [voce.valore]
        : dividiRighe(ctx, voce.valore, fontValore, larghezzaColonnaValore);
      const numeroRighe = Math.max(righeEtichetta.length, righeValore.length, 1);
      const altezza = 42 + (numeroRighe - 1) * 26;
      const primaBase = y + 21 + 21 * 0.35 - ((numeroRighe - 1) * 26) / 2;

      righeEtichetta.forEach((riga, posizione) => {
        scrivi(ctx, riga, MARGINE, primaBase + posizione * 26, fontEtichetta, COLORI.tenue);
      });
      righeValore.forEach((riga, posizione) => {
        scrivi(
          ctx,
          riga,
          larghezza - MARGINE,
          primaBase + posizione * 26,
          fontValore,
          COLORI.testo,
          'right',
        );
      });

      if (indice < gruppo.voci.length - 1) {
        linea(ctx, MARGINE, y + altezza - 1, larghezza - MARGINE, COLORI.bordo);
      }
      y += altezza;
    });

    y += 28;
  }

  // Dosi: fasi della ricetta oppure elenco piatto del calcolatore libero.
  const scriviDose = (dose: VoceDose, separatore: boolean): void => {
    const xNome = MARGINE + (dose.tipo ? 38 : 0);
    const spazioTesto = larghezza - MARGINE - xNome - 145;
    const fontNome = font(600, 25);
    const fontDettaglio = font(400, 18);
    const nomi = dividiRighe(ctx, dose.nome, fontNome, spazioTesto);
    const dettagli = [testoPercentuale(dose), dose.nota].flatMap((dettaglio) =>
      dettaglio ? dividiRighe(ctx, dettaglio, fontDettaglio, spazioTesto) : [],
    );
    const altezzaRiga = 30 + nomi.length * 28 + dettagli.length * 23;
    if (dose.tipo) icona(ctx, dose.tipo, MARGINE, y + 12, 26);
    nomi.forEach((riga, i) => scrivi(ctx, riga, xNome, y + 32 + i * 28, fontNome, COLORI.testo));
    dettagli.forEach((riga, i) => {
      scrivi(ctx, riga, xNome, y + 27 + nomi.length * 28 + i * 23, fontDettaglio, COLORI.tenue);
    });
    scrivi(
      ctx,
      `${dose.tipo === 'lievito' ? grammiLievito(dose.grammi) : numero(dose.grammi)} g`,
      larghezza - MARGINE,
      y + 37,
      font(600, 25),
      COLORI.testo,
      'right',
    );
    if (separatore) linea(ctx, MARGINE, y + altezzaRiga, larghezza - MARGINE, COLORI.bordo);
    y += altezzaRiga;
  };

  const sfondoScheda = (inizio: number, fine: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    rettangolo(ctx, MARGINE - 20, inizio, interno + 40, fine - inizio, 22);
    ctx.restore();
  };

  const indicatori = indicatoriFoglio(dati);
  if (indicatori.length === 3) {
    const spazio = 14;
    const lato = (interno - 2 * spazio) / 3;
    indicatori.forEach(({ etichetta, valore }, i) => {
      const x = MARGINE + i * (lato + spazio);
      rettangolo(ctx, x, y, lato, 88, 18, i === 0 ? COLORI.oroVelo : COLORI.superficie);
      scrivi(ctx, etichetta.toUpperCase(), x + 16, y + 29, font(600, 15), COLORI.tenue);
      scrivi(ctx, valore, x + 16, y + 65, font(700, 28), i === 0 ? COLORI.oroScuro : COLORI.testo);
    });
    y += 111;
  }

  const fasi = dati.fasi ?? [];
  // Un titolo solo per tutte le dosi; le fasi delle ricette restano come
  // etichette più piccole dentro la stessa sezione.
  if (!dati.soloProgramma) {
    y = titoloSezione(ctx, 'Ingredienti', y);
    if (fasi.length > 0) {
      for (const fase of fasi) {
        const inizio = y - 3;
        scrivi(ctx, fase.titolo, MARGINE, y + 26, font(700, 23), COLORI.oroScuro);
        y += 38;

        if (fase.nota) {
          const righeNota = dividiRighe(ctx, fase.nota, font(400, 20), interno);
          righeNota.forEach((riga, indice) => {
            scrivi(ctx, riga, MARGINE, y + 18 + indice * 26, font(400, 20), COLORI.tenue);
          });
          y += righeNota.length * 26 + 12;
        }

        if (fase.avviso) {
          const righeAvviso = dividiRighe(ctx, fase.avviso, font(600, 20), interno - 44);
          const altezza = righeAvviso.length * 28 + 30;
          rettangolo(ctx, MARGINE, y, interno, altezza, 14);
          righeAvviso.forEach((riga, indice) => {
            scrivi(ctx, riga, MARGINE + 22, y + 32 + indice * 28, font(600, 20), COLORI.oroScuro);
          });
          y += altezza + 20;
        }

        fase.voci.forEach((dose, indice) => {
          scriviDose(dose, indice < fase.voci.length - 1);
        });

        linea(ctx, MARGINE, y, larghezza - MARGINE, COLORI.bordo);
        y += 14;

        if (fase.totale) {
          scrivi(ctx, fase.totale.nome, MARGINE, y + 32, font(500, 24), COLORI.tenue);
          scrivi(
            ctx,
            `${numero(fase.totale.grammi)} g`,
            larghezza - MARGINE,
            y + 32,
            font(600, 25),
            COLORI.oroScuro,
            'right',
          );
          y += 56;
        }

        sfondoScheda(inizio, y + 5);
        y += 34;
      }
    } else {
      const inizio = y;
      const dosi = dati.dosi ?? [];
      dosi.forEach((dose, indice) => scriviDose(dose, indice < dosi.length - 1));
      if (dosi.length) {
        sfondoScheda(inizio, y + 10);
        y += 36;
      }
    }

    if (indicatori.length === 0) {
      // Totale dell'impasto: chiude la tabella in entrambi i casi.
      linea(ctx, MARGINE, y, larghezza - MARGINE, COLORI.bordo);
      y += 14;
      scrivi(ctx, 'Peso impasto', MARGINE, y + 32, font(700, 26), COLORI.testo);
      scrivi(
        ctx,
        `${numero(dati.totaleG)} g`,
        larghezza - MARGINE,
        y + 34,
        font(600, 34, SERIF),
        COLORI.oroScuro,
        'right',
      );
      y += 58 + 40;

    }
  }

  // Tabella di marcia (calcolatore) oppure procedimento (ricette): una riga
  // per fase con orario, temperatura e durata.
  if (dati.passi.length > 0) {
    const titolo =
      dati.passi.some((passo) => passo.orario) ? 'Tabella di marcia' : 'PROCEDIMENTO';
    y = titoloSezione(ctx, titolo, y);

    for (const passo of dati.passi) {
      const inizio = y;
      ctx.fillStyle = COLORI.oro;
      ctx.fillRect(MARGINE, y + 9, 4, 4);
      scrivi(ctx, passo.titolo, MARGINE + 12, y + 22, font(600, 20), COLORI.testo);
      y += 30;

      if (passo.orario) {
        const dettaglio = [passo.orario.ora, passo.orario.giorno, passo.nota].filter(Boolean).join(' · ');
        y = paragrafo(ctx, dettaglio, MARGINE + 12, y, interno - 12, font(400, 17), 17, COLORI.tenue, 23);
        sfondoScheda(inizio - 1, y + 4);
      } else {
        for (const testoPasso of passo.paragrafi ?? []) {
          y = paragrafo(
            ctx,
            testoPasso,
            MARGINE + 12,
            y,
            interno - 12,
            font(400, 17),
            17,
            COLORI.tenue,
            23,
          );
          y += 6;
        }
        for (const voce of passo.elenco ?? []) {
          y = paragrafo(
            ctx,
            `•  ${voce}`,
            MARGINE + 12,
            y,
            interno - 12,
            font(400, 17),
            17,
            COLORI.tenue,
            23,
          );
        }
        for (const voce of passo.voci ?? []) {
          scrivi(ctx, `•  ${voce.titolo}`, MARGINE + 12, y + 20, font(600, 17), COLORI.testo);
          y += 26;
          for (const testoVoce of voce.paragrafi) {
            y = paragrafo(
              ctx,
              testoVoce,
              MARGINE + 26,
              y,
              interno - 26,
              font(400, 16),
              16,
              COLORI.tenue,
              22,
            );
            y += 4;
          }
        }
      }
      y += 16;
    }
  }

  // Nota: nel calcolatore resta solo la riga sulle dosi che sono stime.
  if (dati.noteTitolo === 'NOTA' && dati.note.length > 0) {
    y = titoloSezione(ctx, 'Nota', y);
    for (const nota of dati.note) {
      y = paragrafo(
        ctx,
        `•  ${nota}`,
        MARGINE,
        y,
        interno,
        font(400, 17),
        17,
        COLORI.tenue,
        23,
      );
    }
  }

  y += 24;
  linea(ctx, MARGINE, y, larghezza - MARGINE, COLORI.bordo);
  scrivi(
    ctx,
    dati.firma ?? FIRMA_FOGLIO,
    larghezza / 2,
    y + 30,
    font(400, 17),
    COLORI.tenue,
    'center',
  );
  y += 54;

  // Ritaglio sull'altezza usata: niente banda vuota in fondo al JPG.
  const altezza = Math.ceil(y + MARGINE * 0.5);
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
 * Disegna il foglio come JPG: dosi e tabella di marcia, quando disponibile.
 * Restituisce il file senza scaricarlo, come il PDF.
 */
export async function jpgBlob(
  dati: DatiFoglio,
  scala = SCALA_JPG,
  stretto = false,
): Promise<Blob> {
  const marcia = (dati.marcia ?? dati.passi)
    .filter((passo) => passo.orario)
    .map(({ titolo, quando, orario, istruzione, nota }) => ({
      titolo,
      quando,
      orario,
      nota: [istruzione, nota].filter(Boolean).join(' · '),
    }));
  const tela = disegnaFoglio(
    { ...dati, riepilogo: dati.formati ? [dati.formati] : undefined, passi: marcia, note: [] },
    scala,
    stretto,
  );
  return dataUrlABlob(tela.toDataURL('image/jpeg', 0.92), 'image/jpeg');
}
