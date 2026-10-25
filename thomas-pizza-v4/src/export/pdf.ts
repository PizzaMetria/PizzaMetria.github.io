import { jsPDF } from 'jspdf';
import type {
  PassoProcedimento,
  RicettaConfig,
  RisultatoCalcolo,
  TipoIngrediente,
} from '../types';
import type {
  FaseVista,
  GruppoRiepilogo,
  VistaRicetta,
} from '../lib/vista';
import { creaVistaRicetta } from '../lib/vista';
import { LATO_ICONA, disegnaIcona } from '../lib/icone';
import { componiProcedimento } from '../lib/procedimento';
import { formattaDataOra, formattaGrammiIngrediente, formattaPercentuale } from '../lib/formato';
import { scaricaBlob } from '../lib/download';
import { MARCHIO } from './costanti';

type RGB = readonly [number, number, number];

const A4: { larghezza: number; altezza: number } = { larghezza: 210, altezza: 297 };
const SMART: { larghezza: number; altezza: number } = { larghezza: 105, altezza: 297 };
let formatoAttivo = A4;
let MARGINE = 16;
let LARGHEZZA_CONTENUTO = formatoAttivo.larghezza - MARGINE * 2;
let FONDO_CONTENUTO = 270;
let ALTEZZA_RIGA = 7.8;
let INTERLINEA_RIGA = 4.4;
let layoutSmartphone = false;
function impostaLayout(smartphone: boolean): void {
  layoutSmartphone = smartphone;
  formatoAttivo = smartphone ? SMART : A4;
  MARGINE = smartphone ? 8 : 16;
  LARGHEZZA_CONTENUTO = formatoAttivo.larghezza - MARGINE * 2;
  FONDO_CONTENUTO = smartphone ? 274 : 270;
  // Una sola riga per ingrediente: nome, percentuale e quantità affiancati.
  ALTEZZA_RIGA = smartphone ? 10.6 : 8.4;
  INTERLINEA_RIGA = smartphone ? 4.6 : 4.3;
}

/** Corpo dei testi nelle righe degli ingredienti, in punti. */
const FONT_NOME = 9.6;
const FONT_PERCENTUALE = 7.4;
const FONT_QUANTITA = 9.6;
/** Spazio fra nome, percentuale e quantità, in millimetri. */
const SPAZIO_COLONNE = 4;

/*
 * Esportazioni chiare: fondo crema, testo inchiostro e oro scuro per leggere
 * bene anche a stampa, mantenendo titoli serif e accenti del sito.
 */
const SFONDO: RGB = [245, 239, 228];
const SUPERFICIE: RGB = [255, 253, 248];
const INCHIOSTRO: RGB = [35, 38, 42];
const TENUE: RGB = [107, 98, 87];
const ORO: RGB = [184, 148, 40];
const ORO_SCURO: RGB = [122, 92, 16];
const BORDO: RGB = [224, 214, 199];
const ORO_VELO: RGB = [243, 233, 214];

function testo(doc: jsPDF, colore: RGB): void {
  doc.setTextColor(colore[0], colore[1], colore[2]);
}

function riempimento(doc: jsPDF, colore: RGB): void {
  doc.setFillColor(colore[0], colore[1], colore[2]);
}

function tratto(doc: jsPDF, colore: RGB): void {
  doc.setDrawColor(colore[0], colore[1], colore[2]);
}

/** Lato e spazio dell'icona accanto all'ingrediente, in millimetri. */
const LATO_ICONA_RIGA = 4.6;
const SPAZIO_ICONA = 6.8;

/** Icona vettoriale dell'ingrediente, ripresa dalla stessa geometria del sito. */
function iconaIngrediente(
  doc: jsPDF,
  tipo: TipoIngrediente,
  x: number,
  centro: number,
): void {
  const scala = LATO_ICONA_RIGA / LATO_ICONA;
  const alto = centro - LATO_ICONA_RIGA / 2;

  tratto(doc, ORO_SCURO);
  doc.setLineWidth(0.26);
  doc.setLineJoin('round');
  doc.setLineCap('round');

  disegnaIcona(tipo, {
    polilinea: (punti, chiusa) => {
      if (punti.length < 2) return;
      const assoluti = punti.map(
        (punto) => [x + punto.x * scala, alto + punto.y * scala] as const,
      );
      const segmenti = assoluti.slice(1).map((punto, indice) => [
        punto[0] - assoluti[indice][0],
        punto[1] - assoluti[indice][1],
      ]);
      doc.lines(
        segmenti,
        assoluti[0][0],
        assoluti[0][1],
        [1, 1],
        'S',
        chiusa,
      );
    },
    cerchio: ({ cx, cy, r }) => {
      doc.circle(x + cx * scala, alto + cy * scala, r * scala, 'S');
    },
  });
}

/** Testo della colonna percentuale, base di riferimento compresa. */
function testoPercentuale(opzioni: {
  percentuale?: number;
  basePercentuale?: string;
}): string | null {
  if (typeof opzioni.percentuale !== 'number' || !opzioni.basePercentuale) {
    return null;
  }
  return `${formattaPercentuale(opzioni.percentuale)} sulla ${opzioni.basePercentuale}`;
}

interface ColonneIngredienti {
  /** Larghezza disponibile per il nome, icona esclusa. */
  nome: number;
  /** Coordinata a cui allineare a destra la percentuale. */
  xPercentuale: number;
  /** Coordinata a cui allineare a destra la quantità. */
  xQuantita: number;
}

class ScrittorePdf {
  readonly documento: jsPDF;
  private y = MARGINE;
  private readonly titolo: string;
  /** Sezione ingredienti aperta: se la pagina cambia, viene segnalato. */
  private sezioneAttiva: string | null = null;
  private colonne: ColonneIngredienti = {
    nome: LARGHEZZA_CONTENUTO,
    xPercentuale: MARGINE + LARGHEZZA_CONTENUTO,
    xQuantita: MARGINE + LARGHEZZA_CONTENUTO,
  };

  constructor(titolo: string, vista: VistaRicetta) {
    this.titolo = titolo;
    this.documento = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: formatoAttivo === A4 ? 'a4' : [SMART.larghezza, SMART.altezza],
      compress: true,
    });
    this.sfondoPagina();
    this.colonne = this.misuraColonne(vista);
  }

  /**
   * Le tre colonne degli ingredienti (nome, percentuale, quantità) sono
   * misurate sui contenuti reali, così nulla si sovrappone anche con nomi
   * lunghi o quantità a tre cifre.
   */
  private misuraColonne(vista: VistaRicetta): ColonneIngredienti {
    const doc = this.documento;
    const testi = vista.fasi.flatMap((fase) => [
      ...fase.voci,
      ...(fase.totale ? [fase.totale] : []),
    ]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_QUANTITA);
    const larghezzaQuantita = Math.max(
      0,
      ...testi.map((voce) => doc.getTextWidth(voce.valore)),
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_PERCENTUALE);
    const larghezzaPercentuale = Math.max(
      0,
      ...testi.map((voce) =>
        typeof voce.percentuale === 'number' && voce.basePercentuale
          ? doc.getTextWidth(testoPercentuale(voce) ?? '')
          : 0,
      ),
    );

    const xQuantita = MARGINE + LARGHEZZA_CONTENUTO;
    const xPercentuale =
      xQuantita - larghezzaQuantita - SPAZIO_COLONNE;
    const sinistraNome = MARGINE + SPAZIO_ICONA;
    const nome = Math.max(
      layoutSmartphone ? 26 : 60,
      xPercentuale - larghezzaPercentuale - SPAZIO_COLONNE * 2 - sinistraNome,
    );

    return { nome, xPercentuale, xQuantita };
  }

  /** Ogni pagina nasce scura: il contenuto viene disegnato sopra. */
  private sfondoPagina(): void {
    const doc = this.documento;
    riempimento(doc, SFONDO);
    doc.rect(0, 0, formatoAttivo.larghezza, formatoAttivo.altezza, 'F');
  }

  private nuovaPagina(): void {
    const doc = this.documento;
    doc.addPage();
    this.y = layoutSmartphone ? 24 : 30;
    this.sfondoPagina();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    doc.setCharSpace(0);
    testo(doc, TENUE);
    doc.text(this.titolo, MARGINE, 15);
    doc.text(MARCHIO, formatoAttivo.larghezza - MARGINE, 15, {
      align: 'right',
    });
    tratto(doc, BORDO);
    doc.setLineWidth(0.3);
    doc.line(MARGINE, 18, formatoAttivo.larghezza - MARGINE, 18);

    // Una sezione ingredienti che continua dopo l'interruzione di pagina
    // resta riconoscibile: niente righe orfane senza contesto.
    if (this.sezioneAttiva) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      testo(doc, ORO_SCURO);
      doc.text(`${this.sezioneAttiva} (continua)`, MARGINE, 25.5);
      this.y = 31.5;
    }
  }

  private assicuraSpazio(altezza: number): void {
    if (this.y + altezza > FONDO_CONTENUTO) {
      this.nuovaPagina();
    }
  }

  private righeTitoloSezione(titolo: string): string[] {
    const doc = this.documento;
    doc.setFont('times', 'bold');
    doc.setFontSize(layoutSmartphone ? 12.5 : 11.5);
    doc.setCharSpace(1);
    return doc.splitTextToSize(
      titolo.toUpperCase(),
      LARGHEZZA_CONTENUTO - 7,
    ) as string[];
  }

  private righeNotaSezione(nota: string): string[] {
    const doc = this.documento;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layoutSmartphone ? 9 : 8.1);
    return doc.splitTextToSize(
      nota,
      LARGHEZZA_CONTENUTO - 7,
    ) as string[];
  }

  private altezzaTitoloSezione(titolo: string, nota?: string): number {
    const righeTitolo = this.righeTitoloSezione(titolo);
    const righeNota = nota ? this.righeNotaSezione(nota) : [];
    return (
      3 +
      (righeTitolo.length - 1) * 5.2 +
      (righeNota.length > 0 ? 4.2 + (righeNota.length - 1) * 3.7 : 0) +
      6
    );
  }

  /** Titolo su una riga dedicata, nota eventuale sotto e separatore pulito. */
  private titoloSezione(titolo: string, nota?: string): void {
    const doc = this.documento;
    this.y += 3;

    const righeTitolo = this.righeTitoloSezione(titolo);
    const base = this.y;

    riempimento(doc, ORO);
    doc.roundedRect(MARGINE, base - 3.4, 1.8, 5, 0.9, 0.9, 'F');

    testo(doc, ORO_SCURO);
    righeTitolo.forEach((riga, indice) => {
      doc.text(riga, MARGINE + 4.5, base + indice * 5.2);
    });
    doc.setCharSpace(0);

    let fondo = base + (righeTitolo.length - 1) * 5.2;

    if (nota) {
      const righeNota = this.righeNotaSezione(nota);
      fondo += 4.2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.1);
      testo(doc, TENUE);
      righeNota.forEach((riga, indice) => {
        doc.text(riga, MARGINE + 4.5, fondo + indice * 3.7);
      });
      fondo += (righeNota.length - 1) * 3.7;
    }

    const linea = fondo + 2.7;
    tratto(doc, BORDO);
    doc.setLineWidth(0.3);
    doc.line(MARGINE, linea, formatoAttivo.larghezza - MARGINE, linea);
    this.y = linea + 3.3;
  }

  intestazione(data: Date, vista: VistaRicetta): void {
    const doc = this.documento;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(layoutSmartphone ? 8 : 9);
    doc.setCharSpace(layoutSmartphone ? 0.1 : 0.8);
    testo(doc, ORO_SCURO);
    doc.text(MARCHIO.toUpperCase(), MARGINE, 15);
    doc.setCharSpace(0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layoutSmartphone ? 8 : 8.2);
    testo(doc, TENUE);
    doc.text(`Generata il ${formattaDataOra(data)}`, formatoAttivo.larghezza - MARGINE, 15, {
      align: 'right',
    });

    tratto(doc, BORDO);
    doc.setLineWidth(0.4);
    doc.line(MARGINE, layoutSmartphone ? 18 : 24, formatoAttivo.larghezza - MARGINE, layoutSmartphone ? 18 : 24);

    doc.setFont('times', 'bold');
    doc.setFontSize(layoutSmartphone ? 16 : 19);
    testo(doc, INCHIOSTRO);
    const righeTitolo = doc.splitTextToSize(
      this.titolo,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    let y = layoutSmartphone ? 27 : 33.4;
    for (const riga of righeTitolo) {
      doc.text(riga, MARGINE, y);
      y += 7.8;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layoutSmartphone ? 10 : 9.2);
    testo(doc, TENUE);
    const righeDescrizione = doc.splitTextToSize(
      vista.descrizione,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    for (const riga of righeDescrizione) {
      doc.text(riga, MARGINE, y);
      y += layoutSmartphone ? 5 : 4.3;
    }

    this.y = y + 3;
  }

  /** Altezza e righe di un gruppo del riepilogo tecnico. */
  private layoutGruppoRiepilogo(gruppo: GruppoRiepilogo): {
    righe: { etichetta: string[]; altezza: number }[];
    altezza: number;
  } {
    const doc = this.documento;
    const padding = 5.5;
    const spazio = 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(FONT_QUANTITA);
    const larghezzaValore = Math.max(
      0,
      ...gruppo.voci.map((voce) => doc.getTextWidth(voce.valore)),
    );
    // L'etichetta usa tutto lo spazio che resta accanto al valore: nessuna
    // sovrapposizione e nessun testo tagliato.
    const larghezzaEtichetta = Math.max(
      30,
      LARGHEZZA_CONTENUTO - padding * 2 - larghezzaValore - spazio,
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    const righe = gruppo.voci.map((voce) => {
      const linee = doc.splitTextToSize(
        voce.etichetta,
        larghezzaEtichetta,
      ) as string[];
      return { etichetta: linee, altezza: 4.9 + (linee.length - 1) * 3.4 };
    });

    // Il fondo si misura dall'ultima linea di testo, non dall'altezza
    // dell'ultima riga: nessuno spazio vuoto in coda al riquadro.
    const ultima = righe[righe.length - 1];
    const altezza =
      13.4 +
      righe
        .slice(0, -1)
        .reduce((totale, riga) => totale + riga.altezza, 0) +
      (ultima.etichetta.length - 1) * 3.4 +
      4.2;

    return { righe, altezza };
  }

  /** Gruppo del riepilogo: titolo, righe etichetta/valore e divisori. */
  private gruppoRiepilogo(gruppo: GruppoRiepilogo): void {
    const doc = this.documento;
    const { righe, altezza } = this.layoutGruppoRiepilogo(gruppo);

    this.assicuraSpazio(altezza + 3);
    const alto = this.y;

    riempimento(doc, SUPERFICIE);
    tratto(doc, BORDO);
    doc.setLineWidth(0.3);
    doc.roundedRect(
      MARGINE,
      alto,
      LARGHEZZA_CONTENUTO,
      altezza,
      2.5,
      2.5,
      'FD',
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setCharSpace(0.7);
    testo(doc, ORO_SCURO);
    doc.text(gruppo.titolo.toUpperCase(), MARGINE + 5.5, alto + 6.4);
    doc.setCharSpace(0);

    tratto(doc, BORDO);
    doc.setLineWidth(0.2);
    doc.line(
      MARGINE + 5,
      alto + 8.6,
      MARGINE + LARGHEZZA_CONTENUTO - 5,
      alto + 8.6,
    );

    let y = alto + 13.4;

    righe.forEach((riga, indice) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setCharSpace(0);
      testo(doc, TENUE);
      riga.etichetta.forEach((linea, posizione) => {
        doc.text(linea, MARGINE + 5.5, y + posizione * 3.4);
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_QUANTITA);
      testo(doc, INCHIOSTRO);
      doc.text(
        gruppo.voci[indice].valore,
        MARGINE + LARGHEZZA_CONTENUTO - 5.5,
        y,
        { align: 'right' },
      );

      if (indice < righe.length - 1) {
        tratto(doc, BORDO);
        doc.setLineWidth(0.2);
        doc.line(
          MARGINE + 5,
          y + riga.altezza - 1.6,
          MARGINE + LARGHEZZA_CONTENUTO - 5,
          y + riga.altezza - 1.6,
        );
      }

      y += riga.altezza;
    });

    this.y = alto + altezza + 4;
  }

  /** Riepilogo tecnico: parametri della ricetta e quantità dell'esportazione. */
  riepilogoTecnico(gruppi: GruppoRiepilogo[]): void {
    if (gruppi.length === 0) return;

    this.sezione('Riepilogo');
    for (const gruppo of gruppi) {
      this.gruppoRiepilogo(gruppo);
    }
  }

  sezione(titolo: string): void {
    this.assicuraSpazio(this.altezzaTitoloSezione(titolo) + 8);
    this.titoloSezione(titolo);
  }

  /** Evita di lasciare il titolo di sezione da solo in fondo alla pagina. */
  sezioneConContenuto(titolo: string, altezzaContenuto: number): void {
    this.assicuraSpazio(
      this.altezzaTitoloSezione(titolo) + altezzaContenuto,
    );
    this.titoloSezione(titolo);
  }

  /**
   * Riga ingrediente: nome, percentuale e quantità sulla stessa riga, in
   * colonne allineate. Il nome può andare a capo, la riga si allunga di
   * conseguenza e il separatore resta sempre sotto il testo.
   */
  riga(
    etichetta: string,
    valore: string,
    opzioni: {
      grassetto?: boolean;
      separatore?: boolean;
      tipo?: TipoIngrediente;
      percentuale?: number;
      basePercentuale?: string;
    } = {},
  ): void {
    const doc = this.documento;
    const percentuale = testoPercentuale(opzioni);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_NOME);
    doc.setCharSpace(0);
    const righeEtichetta = doc.splitTextToSize(
      etichetta,
      this.colonne.nome,
    ) as string[];
    const numeroRighe = Math.max(1, righeEtichetta.length);
    const altezza =
      ALTEZZA_RIGA + (numeroRighe - 1) * INTERLINEA_RIGA;

    this.assicuraSpazio(altezza + 2);
    const base = this.y;

    if (opzioni.tipo) {
      iconaIngrediente(doc, opzioni.tipo, MARGINE + 0.4, base - 1.1);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_NOME);
    testo(doc, TENUE);
    righeEtichetta.forEach((riga, indice) => {
      doc.text(
        riga,
        MARGINE + (opzioni.tipo ? SPAZIO_ICONA : 0),
        base + indice * INTERLINEA_RIGA,
      );
    });

    if (percentuale) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_PERCENTUALE);
      testo(doc, TENUE);
      doc.text(percentuale, this.colonne.xPercentuale, base, {
        align: 'right',
      });
    }

    doc.setFont('helvetica', opzioni.grassetto === false ? 'normal' : 'bold');
    doc.setFontSize(FONT_QUANTITA);
    testo(doc, INCHIOSTRO);
    doc.text(valore, this.colonne.xQuantita, base, { align: 'right' });

    if (opzioni.separatore !== false) {
      const linea = base + (numeroRighe - 1) * INTERLINEA_RIGA + 2.4;
      tratto(doc, BORDO);
      doc.setLineWidth(0.2);
      doc.line(MARGINE, linea, MARGINE + LARGHEZZA_CONTENUTO, linea);
    }

    this.y = base + altezza;
  }

  private righeAvviso(messaggio: string): string[] {
    const doc = this.documento;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    return doc.splitTextToSize(
      messaggio,
      LARGHEZZA_CONTENUTO - 12,
    ) as string[];
  }

  avviso(messaggio: string): void {
    const doc = this.documento;
    const righe = this.righeAvviso(messaggio);
    const altezza = righe.length * 4.2 + 7;
    this.assicuraSpazio(altezza + 4);

    const alto = this.y - 2.5;
    riempimento(doc, ORO_VELO);
    doc.roundedRect(MARGINE, alto, LARGHEZZA_CONTENUTO, altezza, 2, 2, 'F');
    riempimento(doc, ORO);
    doc.rect(MARGINE, alto, 1.6, altezza, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    testo(doc, ORO_SCURO);
    let y = alto + 5;
    for (const riga of righe) {
      doc.text(riga, MARGINE + 6, y);
      y += 4.2;
    }

    this.y = alto + altezza + 4.5;
  }

  /** Altezza di una riga ingrediente, comprese le eventuali righe del nome. */
  private altezzaRigaIngrediente(etichetta: string): number {
    const doc = this.documento;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_NOME);
    const righe = doc.splitTextToSize(
      etichetta,
      this.colonne.nome,
    ) as string[];
    return ALTEZZA_RIGA + (Math.max(1, righe.length) - 1) * INTERLINEA_RIGA;
  }

  fase(fase: FaseVista): void {
    const altezzaTitolo = this.altezzaTitoloSezione(fase.titolo, fase.nota);
    const altezzaVoci = fase.voci.reduce(
      (totale, voce) => totale + this.altezzaRigaIngrediente(voce.etichetta),
      0,
    );
    const altezzaTotale = fase.totale
      ? this.altezzaRigaIngrediente(fase.totale.etichetta)
      : 0;
    const altezzaCompleta = altezzaTitolo + altezzaVoci + altezzaTotale + 2;

    // Una fase breve resta intera sulla stessa pagina, con un margine in
    // fondo: niente ingredienti separati dal proprio totale. Se non ci sta,
    // resta il titolo con almeno due righe e il resto prosegue dopo.
    this.assicuraSpazio(
      altezzaCompleta <= (layoutSmartphone ? 130 : 105)
        ? altezzaCompleta
        : altezzaTitolo + ALTEZZA_RIGA * 2,
    );
    this.titoloSezione(fase.titolo, fase.nota);
    this.sezioneAttiva = fase.titolo.toUpperCase();

    fase.voci.forEach((voce, indice) => {
      // L'ultimo ingrediente e il totale restano insieme: il totale non
      // finisce da solo in cima alla pagina seguente.
      if (indice === fase.voci.length - 1 && fase.totale) {
        this.assicuraSpazio(
          this.altezzaRigaIngrediente(voce.etichetta) +
            this.altezzaRigaIngrediente(fase.totale.etichetta) +
            2,
        );
      }
      this.riga(voce.etichetta, voce.valore, {
        tipo: voce.tipo,
        percentuale: voce.percentuale,
        basePercentuale: voce.basePercentuale,
      });
    });

    if (fase.totale) {
      this.riga(fase.totale.etichetta, fase.totale.valore, {
        grassetto: false,
        separatore: false,
      });
    }

    this.sezioneAttiva = null;
    this.y += 1;
  }

  notaAcqua(risultato: RisultatoCalcolo): void {
    if (risultato.acquaFinaleG === undefined) {
      return;
    }

    const doc = this.documento;
    const messaggio = `Acqua dell’ultima fase ${formattaGrammiIngrediente(
      risultato.acquaFinaleG,
      'acqua',
    )}, già compresa nei ${formattaGrammiIngrediente(
      risultato.acquaTotaleG,
      'acqua',
    )} totali.`;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);
    const righe = doc.splitTextToSize(
      messaggio,
      LARGHEZZA_CONTENUTO,
    ) as string[];

    this.assicuraSpazio(righe.length * 3.9 + 4);
    for (const riga of righe) {
      // Il cambio pagina installa un font piccolo: ogni riga ristampa il suo.
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);
      testo(doc, TENUE);
      doc.text(riga, MARGINE, this.y);
      this.y += 3.9;
    }
    this.y += 2.5;
  }

  /** Altezza che il paragrafo occuperà, utile per non spezzarlo male. */
  altezzaParagrafo(messaggio: string): number {
    const doc = this.documento;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layoutSmartphone ? 10.5 : 9.2);
    const righe = doc.splitTextToSize(
      messaggio,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    return righe.length * (layoutSmartphone ? 5 : 4.2) + 1.2;
  }

  paragrafo(
    messaggio: string,
    opzioni: {
      dimensione?: number;
      interlinea?: number;
      colore?: RGB;
      grassetto?: boolean;
      spazioDopo?: number;
      rientro?: number;
    } = {},
  ): void {
    const doc = this.documento;
    const dimensione = opzioni.dimensione ?? (layoutSmartphone ? 10.5 : 9.2);
    const interlinea = opzioni.interlinea ?? (layoutSmartphone ? 5 : 4.2);
    doc.setFont('helvetica', opzioni.grassetto ? 'bold' : 'normal');
    doc.setFontSize(dimensione);
    testo(doc, opzioni.colore ?? INCHIOSTRO);

    const rientro = opzioni.rientro ?? 0;
    const righe = doc.splitTextToSize(
      messaggio,
      LARGHEZZA_CONTENUTO - rientro,
    ) as string[];

    if (righe.length === 0) return;

    const altezza = righe.length * interlinea;

    // Un paragrafo corto si sposta per intero sulla pagina seguente:
    // una frase non resta tagliata su due pagine. Quelli lunghi si spezzano,
    // ma sempre con almeno due righe insieme.
    if (altezza <= 30) {
      this.assicuraSpazio(altezza);
    } else if (righe.length > 1) {
      this.assicuraSpazio(interlinea * 2);
    }

    for (const riga of righe) {
      this.assicuraSpazio(interlinea + 1);
      // Il cambio pagina installa un font piccolo: ogni riga ristampa il suo.
      doc.setFont('helvetica', opzioni.grassetto ? 'bold' : 'normal');
      doc.setFontSize(dimensione);
      testo(doc, opzioni.colore ?? INCHIOSTRO);
      doc.text(riga, MARGINE + rientro, this.y);
      this.y += interlinea;
    }
    this.y += opzioni.spazioDopo ?? 1.2;
  }

  private altezzaPasso(passo: PassoProcedimento): number {
    const doc = this.documento;

    doc.setFont('times', 'bold');
    doc.setFontSize(layoutSmartphone ? 12.5 : 12);
    const righeTitolo = doc.splitTextToSize(
      passo.titolo,
      LARGHEZZA_CONTENUTO - (layoutSmartphone ? 11 : 11),
    ) as string[];

    let altezza = 2 + (righeTitolo.length - 1) * 5.2 + 6 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layoutSmartphone ? 10.5 : 9.2);
    for (const paragrafo of passo.paragrafi) {
      const righe = doc.splitTextToSize(
        paragrafo,
        LARGHEZZA_CONTENUTO - 9.5,
      ) as string[];
      altezza += righe.length * 4.2 + 1.2;
    }

    return altezza;
  }

  passo(numero: number, passo: PassoProcedimento): void {
    const doc = this.documento;

    doc.setFont('times', 'bold');
    doc.setFontSize(layoutSmartphone ? 12.5 : 12);
    const righeTitolo = doc.splitTextToSize(
      passo.titolo,
      LARGHEZZA_CONTENUTO - (layoutSmartphone ? 11 : 11),
    ) as string[];
    const altezzaTitolo = (righeTitolo.length - 1) * 5.2;

    // I passi brevi non vengono mai spezzati tra due pagine.
    const altezzaCompleta = this.altezzaPasso(passo);
    this.assicuraSpazio(
      altezzaCompleta <= (layoutSmartphone ? 125 : 75) ? altezzaCompleta : altezzaTitolo + 14,
    );
    this.y += 2;

    const base = this.y;
    riempimento(doc, ORO_SCURO);
    doc.circle(MARGINE + 3.2, base - 1.2, 3.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(SUPERFICIE[0], SUPERFICIE[1], SUPERFICIE[2]);
    doc.text(String(numero), MARGINE + 3.2, base + 0.1, {
      align: 'center',
    });

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    testo(doc, INCHIOSTRO);
    righeTitolo.forEach((riga, indice) => {
      doc.text(riga, MARGINE + 9.5, base + indice * 5.2);
    });
    this.y = base + altezzaTitolo + 6;

    for (const paragrafo of passo.paragrafi) {
      this.paragrafo(paragrafo, { rientro: 9.5 });
    }

    if (passo.elenco) {
      for (const voce of passo.elenco) {
        this.assicuraSpazio(6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(layoutSmartphone ? 10 : 9.3);
        testo(doc, ORO_SCURO);
        doc.text('•', MARGINE + 10.5, this.y);
        this.paragrafo(voce, { rientro: 15 });
      }
    }
    this.y += 1.5;
  }

  footer(): void {
    const doc = this.documento;
    const pagine = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= pagine; pagina += 1) {
      doc.setPage(pagina);
      tratto(doc, BORDO);
      doc.setLineWidth(0.3);
      const yFooter = formatoAttivo.altezza - 18;
      doc.line(MARGINE, yFooter, formatoAttivo.larghezza - MARGINE, yFooter);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setCharSpace(0);
      testo(doc, TENUE);
      const yFooterTesto = formatoAttivo.altezza - 13;
      doc.text(`${MARCHIO} · ricetta`, MARGINE, yFooterTesto);
      doc.text(`Pagina ${pagina} di ${pagine}`, formatoAttivo.larghezza - MARGINE, yFooterTesto, {
        align: 'right',
      });
    }
  }
}

/** Crea il documento PDF A4, multipagina e con testo selezionabile. */
export function creaPdfRicetta(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  data: Date,
  smartphone = false,
): jsPDF {
  impostaLayout(smartphone);
  const vista = creaVistaRicetta(risultato, ricetta);
  const scrittore = new ScrittorePdf(vista.nomeRicetta, vista);

  scrittore.documento.setProperties({
    title: `${vista.nomeRicetta} - ricetta`,
    subject: `Ricetta ${vista.nomeRicetta}`,
    author: MARCHIO,
    creator: MARCHIO,
    keywords: `pizza, impasto, ${ricetta.id}, ricetta`,
  });

  scrittore.intestazione(data, vista);
  scrittore.riepilogoTecnico(vista.riepilogoTecnico);
  // La nota sull'acqua resta accanto al riepilogo: non finisce mai da sola
  // in cima alla pagina seguente, staccata dalla tabella degli ingredienti.
  scrittore.notaAcqua(risultato);

  if (vista.fasi.length === 1) {
    scrittore.sezioneConContenuto('Ingredienti', ALTEZZA_RIGA * 2);
    const fase = vista.fasi[0];
    if (fase.avviso) scrittore.avviso(fase.avviso);
    for (const voce of fase.voci) {
      scrittore.riga(voce.etichetta, voce.valore, { tipo: voce.tipo, percentuale: voce.percentuale, basePercentuale: voce.basePercentuale });
    }
  } else {
    for (const fase of vista.fasi) {
      scrittore.fase(fase);
    }
  }

  scrittore.sezioneConContenuto('Procedimento', 20);
  componiProcedimento(ricetta, risultato).forEach((passo, indice) => {
    scrittore.passo(indice + 1, passo);
  });

  if (ricetta.tips.length > 0) {
    // La sezione Tips si sposta intera sulla pagina seguente: evita pagine
    // quasi vuote con solo l'ultima riga di un consiglio.
    const altezzaTips = ricetta.tips.reduce(
      (totale, tip) => totale + scrittore.altezzaParagrafo(`• ${tip}`),
      0,
    );
    scrittore.sezioneConContenuto('Tips & Tricks', altezzaTips);
    for (const tip of ricetta.tips) {
      scrittore.paragrafo(`• ${tip}`, { colore: TENUE });
    }
  }

  scrittore.footer();
  return scrittore.documento;
}

/** Genera e scarica il PDF con il nome file indicato. */
export function esportaRicettaPdf(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  data: Date,
  nomeFile: string,
  smartphone = false,
): void {
  const documento = creaPdfRicetta(risultato, ricetta, data, smartphone);
  const blob = documento.output('blob');
  scaricaBlob(blob, nomeFile);
}
