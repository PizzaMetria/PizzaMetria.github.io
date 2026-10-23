import { jsPDF } from 'jspdf';
import type {
  PassoProcedimento,
  RicettaConfig,
  RisultatoCalcolo,
} from '../types';
import type { FaseVista, VoceVista, VistaRicetta } from '../lib/vista';
import { creaVistaRicetta } from '../lib/vista';
import { componiProcedimento } from '../lib/procedimento';
import { formattaDataOra, formattaGrammiIngrediente } from '../lib/formato';
import { scaricaBlob } from '../lib/download';
import { MARCHIO } from './costanti';

type RGB = readonly [number, number, number];

const A4 = { larghezza: 210, altezza: 297 } as const;
const MARGINE = 16;
const LARGHEZZA_CONTENUTO = A4.larghezza - MARGINE * 2;
/** Il contenuto si ferma prima della linea del piè di pagina. */
const FONDO_CONTENUTO = 270;
const ALTEZZA_RIGA = 7.4;

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

class ScrittorePdf {
  readonly documento: jsPDF;
  private y = MARGINE;
  private readonly titolo: string;

  constructor(titolo: string) {
    this.titolo = titolo;
    this.documento = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });
    this.sfondoPagina();
  }

  /** Ogni pagina nasce scura: il contenuto viene disegnato sopra. */
  private sfondoPagina(): void {
    const doc = this.documento;
    riempimento(doc, SFONDO);
    doc.rect(0, 0, A4.larghezza, A4.altezza, 'F');
  }

  private nuovaPagina(): void {
    const doc = this.documento;
    doc.addPage();
    this.y = 30;
    this.sfondoPagina();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.6);
    testo(doc, TENUE);
    doc.text(this.titolo, MARGINE, 20);
    doc.text(MARCHIO, A4.larghezza - MARGINE, 20, {
      align: 'right',
    });
    tratto(doc, BORDO);
    doc.setLineWidth(0.3);
    doc.line(MARGINE, 23, A4.larghezza - MARGINE, 23);
  }

  private assicuraSpazio(altezza: number): void {
    if (this.y + altezza > FONDO_CONTENUTO) {
      this.nuovaPagina();
    }
  }

  private righeTitoloSezione(titolo: string): string[] {
    const doc = this.documento;
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.setCharSpace(1);
    return doc.splitTextToSize(
      titolo.toUpperCase(),
      LARGHEZZA_CONTENUTO - 7,
    ) as string[];
  }

  private righeNotaSezione(nota: string): string[] {
    const doc = this.documento;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
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
    doc.line(MARGINE, linea, A4.larghezza - MARGINE, linea);
    this.y = linea + 3.3;
  }

  intestazione(data: Date, vista: VistaRicetta): void {
    const doc = this.documento;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setCharSpace(0.8);
    testo(doc, ORO_SCURO);
    doc.text(MARCHIO.toUpperCase(), MARGINE, 20);
    doc.setCharSpace(0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    testo(doc, TENUE);
    doc.text(`Generata il ${formattaDataOra(data)}`, A4.larghezza - MARGINE, 20, {
      align: 'right',
    });

    tratto(doc, BORDO);
    doc.setLineWidth(0.4);
    doc.line(MARGINE, 24, A4.larghezza - MARGINE, 24);

    doc.setFont('times', 'bold');
    doc.setFontSize(19);
    testo(doc, INCHIOSTRO);
    const righeTitolo = doc.splitTextToSize(
      this.titolo,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    let y = 33.4;
    for (const riga of righeTitolo) {
      doc.text(riga, MARGINE, y);
      y += 7.8;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    testo(doc, TENUE);
    const righeDescrizione = doc.splitTextToSize(
      vista.descrizione,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    for (const riga of righeDescrizione) {
      doc.text(riga, MARGINE, y);
      y += 4.3;
    }

    y += 0.8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.6);
    testo(doc, ORO_SCURO);
    const righeResa = doc.splitTextToSize(
      `${vista.modalitaEtichetta} · ${vista.resa}`,
      LARGHEZZA_CONTENUTO,
    ) as string[];
    for (const riga of righeResa) {
      doc.text(riga, MARGINE, y);
      y += 4.4;
    }

    this.y = y + 3;
  }

  /** Riepilogo compatto: una riga per tre valori, griglia 2 × 2 per quattro. */
  riepilogo(voci: VoceVista[]): void {
    if (voci.length === 0) return;

    const doc = this.documento;
    const colonne = voci.length <= 3 ? voci.length : 2;
    const righe = Math.ceil(voci.length / colonne);
    const altezzaCella = 12.3;
    const altezza = righe * altezzaCella + 4;

    this.assicuraSpazio(altezza + 4);
    const alto = this.y;
    const larghezzaColonna = LARGHEZZA_CONTENUTO / colonne;

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

    voci.forEach((voce, indice) => {
      const colonna = indice % colonne;
      const riga = Math.floor(indice / colonne);
      const x = MARGINE + 5.5 + colonna * larghezzaColonna;
      const base = alto + 6.2 + riga * altezzaCella;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setCharSpace(0.25);
      testo(doc, TENUE);
      doc.text(voce.etichetta.toUpperCase(), x, base);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setCharSpace(0);
      testo(doc, INCHIOSTRO);
      doc.text(voce.valore, x, base + 4.6);
    });

    this.y = alto + altezza + 3.5;
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

  riga(
    etichetta: string,
    valore: string,
    opzioni: { grassetto?: boolean; separatore?: boolean } = {},
  ): void {
    const doc = this.documento;
    this.assicuraSpazio(ALTEZZA_RIGA + 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.6);
    testo(doc, TENUE);
    doc.text(etichetta, MARGINE, this.y);

    doc.setFont('helvetica', opzioni.grassetto === false ? 'normal' : 'bold');
    testo(doc, INCHIOSTRO);
    doc.text(valore, A4.larghezza - MARGINE, this.y, { align: 'right' });

    if (opzioni.separatore !== false) {
      tratto(doc, BORDO);
      doc.setLineWidth(0.2);
      doc.line(MARGINE, this.y + 2.2, A4.larghezza - MARGINE, this.y + 2.2);
    }

    this.y += ALTEZZA_RIGA;
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
    const altezza = righe.length * 4.2 + 6;
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

  fase(fase: FaseVista): void {
    const altezzaTitolo = this.altezzaTitoloSezione(fase.titolo, fase.nota);
    const altezzaBlocco =
      altezzaTitolo +
      fase.voci.length * ALTEZZA_RIGA +
      (fase.totale ? ALTEZZA_RIGA : 0) +
      3;

    if (altezzaBlocco < 190) {
      this.assicuraSpazio(altezzaBlocco);
    } else {
      this.assicuraSpazio(altezzaTitolo + ALTEZZA_RIGA * 2);
    }

    this.titoloSezione(fase.titolo, fase.nota);

    for (const voce of fase.voci) {
      this.riga(voce.etichetta, voce.valore);
    }

    if (fase.totale) {
      this.riga(fase.totale.etichetta, fase.totale.valore, {
        grassetto: false,
        separatore: false,
      });
    }

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
    testo(doc, TENUE);
    for (const riga of righe) {
      doc.text(riga, MARGINE, this.y);
      this.y += 3.9;
    }
    this.y += 2.5;
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
    const dimensione = opzioni.dimensione ?? 9.2;
    const interlinea = opzioni.interlinea ?? 4.2;
    doc.setFont('helvetica', opzioni.grassetto ? 'bold' : 'normal');
    doc.setFontSize(dimensione);
    testo(doc, opzioni.colore ?? INCHIOSTRO);

    const rientro = opzioni.rientro ?? 0;
    const righe = doc.splitTextToSize(
      messaggio,
      LARGHEZZA_CONTENUTO - rientro,
    ) as string[];

    if (righe.length === 0) return;

    // Evita di lasciare una sola riga orfana in fondo alla pagina.
    if (righe.length > 1) {
      this.assicuraSpazio(interlinea * 2);
    }

    for (const riga of righe) {
      this.assicuraSpazio(interlinea + 1);
      doc.text(riga, MARGINE + rientro, this.y);
      this.y += interlinea;
    }
    this.y += opzioni.spazioDopo ?? 1.2;
  }

  private altezzaPasso(passo: PassoProcedimento): number {
    const doc = this.documento;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const righeTitolo = doc.splitTextToSize(
      passo.titolo,
      LARGHEZZA_CONTENUTO - 11,
    ) as string[];

    let altezza = 2 + (righeTitolo.length - 1) * 5.2 + 6 + 1.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
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
    doc.setFontSize(12);
    const righeTitolo = doc.splitTextToSize(
      passo.titolo,
      LARGHEZZA_CONTENUTO - 11,
    ) as string[];
    const altezzaTitolo = (righeTitolo.length - 1) * 5.2;

    // I passi brevi non vengono mai spezzati tra due pagine.
    const altezzaCompleta = this.altezzaPasso(passo);
    this.assicuraSpazio(
      altezzaCompleta <= 75 ? altezzaCompleta : altezzaTitolo + 14,
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
        doc.setFontSize(9.3);
        testo(doc, ORO_SCURO);
        doc.text('•', MARGINE + 10.5, this.y);
        this.paragrafo(voce, { rientro: 15 });
      }
    }
    this.y += 1.5;
  }

  condimenti(ricetta: RicettaConfig): void {
    if (!ricetta.condimentiFacoltativi?.length) return;
    this.sezioneConContenuto('Condimenti facoltativi', 14);
    this.paragrafo(
      `${ricetta.condimentiFacoltativi.join(
        ', ',
      )}: q.b. Non sono quantificati e non sono compresi nel peso teorico dell’impasto.`,
      { colore: TENUE },
    );
  }

  footer(): void {
    const doc = this.documento;
    const pagine = doc.getNumberOfPages();

    for (let pagina = 1; pagina <= pagine; pagina += 1) {
      doc.setPage(pagina);
      tratto(doc, BORDO);
      doc.setLineWidth(0.3);
      doc.line(MARGINE, 279, A4.larghezza - MARGINE, 279);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      testo(doc, TENUE);
      doc.text(`${MARCHIO} · ricetta`, MARGINE, 284);
      doc.text(`Pagina ${pagina} di ${pagine}`, A4.larghezza - MARGINE, 284, {
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
): jsPDF {
  const vista = creaVistaRicetta(risultato, ricetta);
  const scrittore = new ScrittorePdf(vista.nomeRicetta);

  scrittore.documento.setProperties({
    title: `${vista.nomeRicetta} - ricetta`,
    subject: `Ricetta ${vista.nomeRicetta}`,
    author: MARCHIO,
    creator: MARCHIO,
    keywords: `pizza, impasto, ${ricetta.id}, ricetta`,
  });

  scrittore.intestazione(data, vista);
  scrittore.riepilogo(vista.statistiche);

  if (vista.fasi.length === 1) {
    scrittore.sezioneConContenuto('Ingredienti', ALTEZZA_RIGA * 2);
    const fase = vista.fasi[0];
    if (fase.avviso) scrittore.avviso(fase.avviso);
    for (const voce of fase.voci) {
      scrittore.riga(voce.etichetta, voce.valore);
    }
  } else {
    for (const fase of vista.fasi) {
      scrittore.fase(fase);
    }
  }

  scrittore.notaAcqua(risultato);
  scrittore.condimenti(ricetta);

  scrittore.sezioneConContenuto('Procedimento', 20);
  componiProcedimento(ricetta, risultato).forEach((passo, indice) => {
    scrittore.passo(indice + 1, passo);
  });

  if (ricetta.tips.length > 0) {
    scrittore.sezioneConContenuto('Tips & Tricks', 14);
    for (const tip of ricetta.tips) {
      scrittore.paragrafo(`• ${tip}`, { colore: TENUE });
    }
  }

  scrittore.sezioneConContenuto('Note', 14);
  for (const nota of [...vista.note, vista.notaPeso]) {
    scrittore.paragrafo(nota, { colore: TENUE });
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
): void {
  const documento = creaPdfRicetta(risultato, ricetta, data);
  const blob = documento.output('blob');
  scaricaBlob(blob, nomeFile);
}
