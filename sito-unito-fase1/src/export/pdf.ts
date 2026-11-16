import { adattamentoForza } from '../lib/calcolo';
import { grammiLievito } from '../lib/numeri';
import { STILE_FOGLIO } from './stile-foglio';
import { FIRMA_FOGLIO, TITOLI_GRAFICI, indicatoriFoglio } from './foglio';
import type { DatiFoglio, VoceDose } from './foglio';
import type { TipoIngrediente } from '../vecchio/types';
import { LATO_ICONA, disegnaIcona } from '../vecchio/lib/icone';

/*
 * PDF VETTORIALE DEL FOGLIO
 * -------------------------
 * Il documento è scritto a mano, senza librerie, con i font standard PDF
 * (Helvetica e Times): così il testo resta selezionabile, cercabile e leggibile
 * dagli screen reader, e il file pesa pochi kilobyte.
 *
 * Le larghezze dei caratteri sono quelle dei font AFM: servono per allineare a
 * destra i numeri e per andare a capo senza sbordare. Sono dati, non stime, e
 * i test controllano che ogni tabella abbia i 95 caratteri stampabili.
 */

/** A4 per il foglio da stampare, formato telefono per leggerlo a schermo. */
const A4 = { larghezza: 595.28, altezza: 841.89, margine: 44 };
const TELEFONO = { larghezza: 360, altezza: 780, margine: 26 };

let PAGINA = A4;
let LARGHEZZA_UTILE = PAGINA.larghezza - PAGINA.margine * 2;
let FONDO_PAGINA = PAGINA.altezza - 30;

/**
 * «Ottimizza per smartphone»: pagina stretta e alta, come un foglio da
telefono, così il testo resta grande senza zoom. Il disegno è lo stesso: si
adattano solo larghezza utile, margini e interruzioni di pagina.
 */
function impostaFormato(stretto: boolean): void {
  PAGINA = stretto ? TELEFONO : A4;
  LARGHEZZA_UTILE = PAGINA.larghezza - PAGINA.margine * 2;
  FONDO_PAGINA = PAGINA.altezza - 30;
}

type NomeFont = 'F1' | 'F2' | 'F3' | 'F4';

type Colore = readonly [number, number, number];

const BASE_FONT: Record<NomeFont, string> = {
  F1: 'Helvetica',
  F2: 'Helvetica-Bold',
  F3: 'Times-Roman',
  F4: 'Times-Bold',
};

/** Larghezze AFM dei caratteri 32-126, in millesimi di em. */
const LARGHEZZE: Record<NomeFont, readonly number[]> = {
  F1: testoLarghezze(`
    278 278 355 556 556 889 667 191 333 333 389 584 278 333 278 278
    556 556 556 556 556 556 556 556 556 556 278 278 584 584 584 556
    1015 667 667 722 722 667 611 778 722 278 500 667 556 833 722 778
    667 778 722 667 611 722 667 944 667 667 611 278 278 278 469 556
    333 556 556 500 556 556 278 556 556 222 222 500 222 833 556 556
    556 556 333 500 278 556 500 722 500 500 500 334 260 334 584
  `),
  F2: testoLarghezze(`
    278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278
    556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611
    975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778
    667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556
    333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611
    611 611 389 556 333 611 556 778 556 556 500 389 280 389 584
  `),
  F3: testoLarghezze(`
    250 333 408 500 500 833 778 180 333 333 500 564 250 333 250 278
    500 500 500 500 500 500 500 500 500 500 278 278 564 564 564 444
    921 722 667 667 722 611 556 722 722 333 389 722 611 889 722 722
    556 722 667 556 611 722 722 944 722 722 611 333 278 333 469 500
    333 444 500 444 500 444 333 500 500 278 278 500 278 778 500 500
    500 500 333 389 278 500 500 722 500 500 444 480 200 480 541
  `),
  F4: testoLarghezze(`
    250 333 555 500 500 1000 833 278 333 333 500 570 250 333 250 278
    500 500 500 500 500 500 500 500 500 500 333 333 570 570 570 500
    930 722 667 722 722 667 611 778 778 389 500 778 667 944 722 778
    611 778 722 556 667 722 722 1000 722 722 667 333 278 333 581 500
    333 500 556 444 556 444 333 500 556 278 333 556 278 833 556 500
    556 556 444 389 333 556 500 722 500 500 444 394 220 394 520
  `),
};

function testoLarghezze(testo: string): readonly number[] {
  return testo.trim().split(/\s+/).map(Number);
}

/** Lettere accentate e simboli: per la larghezza valgono come la base. */
const BASE_LETTERA: Record<string, string> = {
  à: 'a',
  á: 'a',
  è: 'e',
  é: 'e',
  ì: 'i',
  í: 'i',
  ò: 'o',
  ó: 'o',
  ù: 'u',
  ú: 'u',
  À: 'A',
  È: 'E',
  É: 'E',
  Ì: 'I',
  Ò: 'O',
  Ù: 'U',
  '°': 'o',
  '·': '.',
  '×': 'x',
  '−': '-',
  '–': '-',
  '—': '-',
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '«': '<',
  '»': '>',
  '…': '.',
  '≈': '~',
  '±': '+',
  '€': 'E',
  '≥': '>',
  '≤': '<',
  '•': '.',
};

/** Caratteri fuori ASCII stampabile, codificati in WinAnsi. */
const WINANSI: Record<string, number> = {
  à: 0xe0,
  á: 0xe1,
  è: 0xe8,
  é: 0xe9,
  ì: 0xec,
  í: 0xed,
  ò: 0xf2,
  ó: 0xf3,
  ù: 0xf9,
  ú: 0xfa,
  À: 0xc0,
  È: 0xc8,
  É: 0xc9,
  Ì: 0xcc,
  Ò: 0xd2,
  Ù: 0xd9,
  '°': 0xb0,
  '·': 0xb7,
  '×': 0xd7,
  '−': 0x2d,
  '–': 0x96,
  '—': 0x97,
  '’': 0x92,
  '‘': 0x91,
  '“': 0x93,
  '”': 0x94,
  '«': 0xab,
  '»': 0xbb,
  '…': 0x85,
  '≈': 0xbb,
  '±': 0xb1,
  '€': 0x80,
  '≥': 0x3e,
  '≤': 0x3c,
  '•': 0x95,
};

function colore(esadecimale: string): Colore {
  const valore = Number.parseInt(esadecimale.replace('#', ''), 16);
  return [
    Number((((valore >> 16) & 255) / 255).toFixed(3)),
    Number((((valore >> 8) & 255) / 255).toFixed(3)),
    Number(((valore & 255) / 255).toFixed(3)),
  ];
}

const TESTO = colore(STILE_FOGLIO.testo);
const TENUE = colore(STILE_FOGLIO.tenue);
const ORO = colore(STILE_FOGLIO.accento);
const ORO_SCURO = colore(STILE_FOGLIO.accentoScuro);
const BORDO = colore(STILE_FOGLIO.bordo);
const SUPERFICIE = colore(STILE_FOGLIO.scheda);
const PANNA = colore('#efe4c8');
const FRIGO = colore('#efeae0');

/** Larghezza di un testo in punti PDF. */
export function misura(testo: string, font: NomeFont, dimensione: number): number {
  const tabella = LARGHEZZE[font];
  let totale = 0;

  for (const carattere of testo) {
    const codice = carattere.codePointAt(0) ?? 63;
    const base = BASE_LETTERA[carattere];
    const indice =
      codice >= 32 && codice <= 126
        ? codice - 32
        : base
          ? (base.codePointAt(0) ?? 110) - 32
          : 110 - 32;

    totale += tabella[indice] ?? 500;
  }

  return (totale * dimensione) / 1000;
}

/** Spezza il testo in righe che stanno nella larghezza data. */
export function dividiInRighe(
  testo: string,
  font: NomeFont,
  dimensione: number,
  larghezzaMassima: number,
): string[] {
  const parole = testo.split(/\s+/).filter(Boolean);
  const righe: string[] = [];
  let corrente = '';

  for (const parola of parole) {
    const prova = corrente ? `${corrente} ${parola}` : parola;
    if (!corrente || misura(prova, font, dimensione) <= larghezzaMassima) {
      corrente = prova;
    } else {
      righe.push(corrente);
      corrente = parola;
    }
  }
  if (corrente) righe.push(corrente);

  return righe;
}

/** Byte WinAnsi con le parentesi e le barre già protette. */
function codifica(testo: string): Uint8Array {
  const byte: number[] = [];

  for (const carattere of testo) {
    const codice = carattere.codePointAt(0) ?? 63;
    const valore =
      codice >= 32 && codice <= 126 ? codice : (WINANSI[carattere] ?? 63);

    if (valore === 0x28 || valore === 0x29 || valore === 0x5c) byte.push(0x5c);
    byte.push(valore);
  }

  return Uint8Array.from(byte);
}

function numero(valore: number): string {
  return valore.toLocaleString('it-IT', { maximumFractionDigits: 1 });
}

interface OpzioniTesto {
  font?: NomeFont;
  dimensione?: number;
  colore?: Colore;
  allineamento?: 'sinistra' | 'destra' | 'centro';
}

interface OpzioniRettangolo {
  riempimento?: Colore;
  bordo?: Colore;
}

interface Punto {
  x: number;
  y: number;
}

function unisci(parti: readonly Uint8Array[], lunghezza: number): Uint8Array {
  const totale = new Uint8Array(lunghezza);
  let cursore = 0;

  for (const parte of parti) {
    totale.set(parte, cursore);
    cursore += parte.length;
  }

  return totale;
}

/**
 * Byte di un JPEG dentro un data URL.
 *
 * Il PDF sa leggere il JPEG così com'è — lo dichiara /DCTDecode — quindi non
 * c'è niente da ricodificare: si copiano i byte e si dichiarano le misure.
 */
export function byteDelJpeg(datiUrl: string): Uint8Array {
  const virgola = datiUrl.indexOf(',');
  const base64 = (virgola >= 0 ? datiUrl.slice(virgola + 1) : datiUrl).replace(/\s+/g, '');
  const binario = atob(base64);
  const byte = new Uint8Array(binario.length);

  for (let indice = 0; indice < binario.length; indice += 1) {
    byte[indice] = binario.charCodeAt(indice);
  }

  return byte;
}

interface ImmaginePronta {
  nome: string;
  chiave: 'forza' | 'attivita';
  byte: Uint8Array;
  larghezza: number;
  altezza: number;
}

/** Costruisce il PDF completo del foglio, in vettoriale. */
export function creaPdf(dati: DatiFoglio, stretto = false): Uint8Array {
  impostaFormato(stretto);
  // Ogni facciata ha il suo flusso: il procedimento delle ricette non sta in
  // una pagina sola, quindi il documento si impagina mentre si scrive.
  let pezzi: Uint8Array[] = [];
  const pagine: Uint8Array[][] = [];

  // I grafici arrivano già disegnati dalla schermata: qui si contano soltanto.
  const immagini: ImmaginePronta[] = (
    [
      ['forza', 'Im1'],
      ['attivita', 'Im2'],
    ] as const
  )
    .map(([chiave, nome]): ImmaginePronta | null => {
      const immagine = dati.grafici?.[chiave];
      if (!immagine) return null;
      return {
        nome,
        chiave,
        byte: byteDelJpeg(immagine.datiUrl),
        larghezza: immagine.larghezza,
        altezza: immagine.altezza,
      };
    })
    .filter((voce): voce is ImmaginePronta => voce !== null);

  const aggiungi = (dato: string | Uint8Array): void => {
    pezzi.push(typeof dato === 'string' ? new TextEncoder().encode(dato) : dato);
  };

  /** Coordinata PDF: l'origine è in basso a sinistra. */
  const alto = (ySuperiore: number): number => PAGINA.altezza - ySuperiore;

  /** Scrive una riga di testo e restituisce la larghezza occupata. */
  const testo = (
    x: number,
    ySuperiore: number,
    contenuto: string,
    opzioni: OpzioniTesto = {},
  ): number => {
    const font = opzioni.font ?? 'F1';
    const dimensione = opzioni.dimensione ?? 10;
    const inchiostro = opzioni.colore ?? TESTO;
    const larghezza = misura(contenuto, font, dimensione);

    let partenza = x;
    if (opzioni.allineamento === 'destra') partenza = x - larghezza;
    else if (opzioni.allineamento === 'centro') partenza = x - larghezza / 2;

    aggiungi(
      `BT /${font} ${dimensione} Tf ${inchiostro.join(' ')} rg ` +
        `${partenza.toFixed(2)} ${alto(ySuperiore).toFixed(2)} Td (`,
    );
    aggiungi(codifica(contenuto));
    aggiungi(') Tj ET\n');

    return larghezza;
  };

  const rettangolo = (
    x: number,
    ySuperiore: number,
    larghezza: number,
    altezza: number,
    opzioni: OpzioniRettangolo = {},
  ): void => {
    const y = alto(ySuperiore + altezza);
    if (opzioni.riempimento) {
      aggiungi(
        `${opzioni.riempimento.join(' ')} rg ${x.toFixed(2)} ${y.toFixed(2)} ` +
          `${larghezza.toFixed(2)} ${altezza.toFixed(2)} re f\n`,
      );
    }
    if (opzioni.bordo) {
      aggiungi(
        `${opzioni.bordo.join(' ')} RG 0.7 w ${x.toFixed(2)} ${y.toFixed(2)} ` +
          `${larghezza.toFixed(2)} ${altezza.toFixed(2)} re S\n`,
      );
    }
  };

  const scheda = (
    x: number, cima: number, larghezza: number, altezza: number, fondo = SUPERFICIE,
  ): Uint8Array => {
    const basso = alto(cima + altezza);
    const altoScheda = alto(cima);
    const destra = x + larghezza;
    const r = Math.min(7, altezza / 2, larghezza / 2);
    const k = r * 0.5523;
    return new TextEncoder().encode(
      `q ${fondo.join(' ')} rg ${BORDO.join(' ')} RG 0.55 w ` +
      `${x + r} ${basso} m ${destra - r} ${basso} l ` +
      `${destra - r + k} ${basso} ${destra} ${basso + r - k} ${destra} ${basso + r} c ` +
      `${destra} ${altoScheda - r} l ${destra} ${altoScheda - r + k} ${destra - r + k} ${altoScheda} ${destra - r} ${altoScheda} c ` +
      `${x + r} ${altoScheda} l ${x + r - k} ${altoScheda} ${x} ${altoScheda - r + k} ${x} ${altoScheda - r} c ` +
      `${x} ${basso + r} l ${x} ${basso + r - k} ${x + r - k} ${basso} ${x + r} ${basso} c h B Q\n`,
    );
  };

  const linea = (da: Punto, a: Punto, inchiostro: Colore = BORDO, spessore = 0.7): void => {
    aggiungi(
      `${inchiostro.join(' ')} RG ${spessore} w ` +
        `${da.x.toFixed(2)} ${alto(da.y).toFixed(2)} m ` +
        `${a.x.toFixed(2)} ${alto(a.y).toFixed(2)} l S\n`,
    );
  };

  /** Icona dell'ingrediente in vettoriale, sulla griglia 24 × 24. */
  const iconaPdf = (
    tipo: TipoIngrediente,
    x: number,
    ySuperiore: number,
    lato: number,
  ): void => {
    const scala = lato / LATO_ICONA;
    const inchiostro = ORO_SCURO.join(' ');
    const k = 0.5523;

    disegnaIcona(tipo, {
      polilinea: (punti, chiusa) => {
        let percorso = '';
        punti.forEach((punto, indice) => {
          const px = x + punto.x * scala;
          const py = alto(ySuperiore + punto.y * scala);
          percorso += `${px.toFixed(2)} ${py.toFixed(2)} ${indice === 0 ? 'm' : 'l'} `;
        });
        aggiungi(`${inchiostro} RG 0.8 w ${percorso}${chiusa ? 'h ' : ''}S\n`);
      },
      cerchio: (cerchio) => {
        const cx = x + cerchio.cx * scala;
        const cy = alto(ySuperiore + cerchio.cy * scala);
        const r = cerchio.r * scala;
        aggiungi(
          `${inchiostro} RG 0.8 w ${(cx + r).toFixed(2)} ${cy.toFixed(2)} m ` +
            `${(cx + r).toFixed(2)} ${(cy + k * r).toFixed(2)} ${(cx + k * r).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c ` +
            `${(cx - k * r).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k * r).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c ` +
            `${(cx - r).toFixed(2)} ${(cy - k * r).toFixed(2)} ${(cx - k * r).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c ` +
            `${(cx + k * r).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k * r).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c h S\n`,
        );
      },
    });
  };

  const sinistra = PAGINA.margine;
  const destra = PAGINA.larghezza - PAGINA.margine;
  let y = PAGINA.margine;
  const inizioContinuazione = PAGINA.margine + 25;

  let riquadro: { y: number; indice: number } | null = null;
  const iniziaRiquadro = () => {
    riquadro = { y, indice: pezzi.length };
    y += 7;
  };
  const chiudiRiquadro = () => {
    if (!riquadro) return;
    pezzi.splice(riquadro.indice, 0, scheda(
      sinistra - 7, riquadro.y, LARGHEZZA_UTILE + 14, y - riquadro.y + 3,
    ));
    riquadro = null;
  };

  /** Apre una facciata nuova, con l'intestazione di continuazione. */
  const nuovaPagina = (): void => {
    const continuaRiquadro = riquadro !== null;
    chiudiRiquadro();
    pagine.push(pezzi);
    pezzi = [];
    y = PAGINA.margine + 6;
    testo(sinistra, y, 'PizzaMetria', { font: 'F2', dimensione: 6.6, colore: ORO });
    testo(destra, y, dati.titolo, {
      dimensione: 6.6,
      colore: TENUE,
      allineamento: 'destra',
    });
    y += 5;
    linea({ x: sinistra, y }, { x: destra, y });
    y += 14;
    if (continuaRiquadro) iniziaRiquadro();
  };

  /** Salta alla facciata seguente quando il blocco non ci sta. */
  const assicuraSpazio = (altezza: number): void => {
    if (y + altezza > FONDO_PAGINA) nuovaPagina();
  };

  // Se un paragrafo eccede anche una pagina intera, lascia al flusso
  // per riga il compito di dividerlo. Con un titolo, riserva almeno la prima riga.
  const tieniInsieme = (altezza: number, minimo = 0): void => {
    const spazioPagina = FONDO_PAGINA - inizioContinuazione;
    const spazio = altezza <= spazioPagina ? altezza : minimo;
    if (spazio > 0) assicuraSpazio(spazio);
  };

  // Intestazione
  testo(sinistra, y + 7, 'PizzaMetria', { font: 'F2', dimensione: 7.6, colore: ORO });
  testo(destra, y + 7, dati.occhiello ?? 'Calcola la tua pizza', {
    font: 'F2',
    dimensione: 7.6,
    colore: TENUE,
    allineamento: 'destra',
  });
  // Filo d'oro sotto il marchio, come nel foglio JPG.
  rettangolo(sinistra, y + 10, 18, 1.6, { riempimento: ORO });
  y += 24;

  const righeTitolo = dividiInRighe(dati.titolo, 'F2', 21, LARGHEZZA_UTILE);
  righeTitolo.forEach((riga, i) => {
    testo(sinistra, y + 16 + i * 24, riga, { font: 'F2', dimensione: 21 });
  });
  const larghezzaTitolo = misura(righeTitolo[0] ?? '', 'F2', 21);

  // Pillola del lievito accanto al titolo: è la firma del foglio JPG.
  const etichettaTipo = dati.tipoLievito.replace(/^Lievito\s+/i, '').toUpperCase();
  const larghezzaBadge = misura(etichettaTipo, 'F2', 6.6) + 10;
  if (!dati.soloProgramma && righeTitolo.length === 1 && larghezzaTitolo + 12 + larghezzaBadge <= LARGHEZZA_UTILE) {
    const xBadge = destra - larghezzaBadge;
    rettangolo(xBadge, y + 3, larghezzaBadge, 11.5, {
      riempimento: [0.96, 0.93, 0.87] as const,
      bordo: ORO,
    });
    testo(xBadge + larghezzaBadge / 2, y + 10.6, etichettaTipo, {
      font: 'F2',
      dimensione: 6.6,
      colore: ORO_SCURO,
      allineamento: 'centro',
    });
  }
  y += 22 + (righeTitolo.length - 1) * 24;

  const descrizione = dati.intestazionePdf ? dati.intestazionePdf.descrizione ?? '' : dati.sottotitolo;
  const righeSottotitolo = dividiInRighe(descrizione, 'F1', 9.4, LARGHEZZA_UTILE);
  righeSottotitolo.forEach((riga, indice) => {
    testo(sinistra, y + 10 + indice * 11.5, riga, { dimensione: 9.4, colore: TENUE });
  });
  y += righeSottotitolo.length * 11.5 + 6;

  if (dati.generatoIl) {
    testo(sinistra, y + 6, dati.generatoIl, { dimensione: 7.2, colore: TENUE });
    y += 12;
  }

  linea({ x: sinistra, y }, { x: destra, y });
  y += 14;

  const formati = dati.formati?.voci.filter(({ etichetta }) => etichetta !== 'Peso complessivo');
  const resa = dati.intestazionePdf?.resa;
  const haResa = Boolean(formati?.length || resa);
  if (haResa) {
    iniziaRiquadro();
    testo(sinistra, y + 6, formati?.length ? 'Divisione per formato' : 'RESA', {
      font: 'F2', dimensione: 8.6, colore: ORO_SCURO,
    });
    y += 12;
    if (formati?.length) {
      const spazioColonne = 8;
      const larghezzaTesti = LARGHEZZA_UTILE - spazioColonne;
      for (const { etichetta, valore } of formati) {
        const larghezzaNome = misura(etichetta, 'F2', 8.5);
        const larghezzaValore = misura(valore, 'F1', 8.5);
        const entraSuUnaRiga = larghezzaNome + larghezzaValore <= larghezzaTesti;
        const larghezzaColonnaValore = LARGHEZZA_UTILE * 0.48;
        const nomi = entraSuUnaRiga
          ? [etichetta]
          : dividiInRighe(etichetta, 'F2', 8.5, larghezzaTesti - larghezzaColonnaValore);
        const valori = entraSuUnaRiga
          ? [valore]
          : dividiInRighe(valore, 'F1', 8.5, larghezzaColonnaValore);
        const altezza = Math.max(nomi.length, valori.length) * 11 + 2;
        assicuraSpazio(altezza + 3);
        nomi.forEach((nome, i) => testo(sinistra, y + 8 + 11 * i, nome, {
          font: 'F2', dimensione: 8.5,
        }));
        valori.forEach((riga, i) => testo(destra, y + 8 + 11 * i, riga, {
          dimensione: 8.5, colore: TENUE, allineamento: 'destra',
        }));
        y += altezza;
      }
    } else if (resa) {
      for (const riga of dividiInRighe(resa, 'F2', 9.2, LARGHEZZA_UTILE)) {
        assicuraSpazio(16);
        testo(sinistra, y + 8, riga, { font: 'F2', dimensione: 9.2 });
        y += 11;
      }
    }
    chiudiRiquadro();
    y += 9;
  }

  /** «% 62,3 sulla farina totale», come nella tabella del foglio JPG. */
  const percentualeDose = (dose: VoceDose): string | null =>
    typeof dose.percentuale === 'number'
      ? `% ${numero(dose.percentuale)}${dose.base ? ` sulla ${dose.base}` : ''}`
      : null;

  /** Una riga ingrediente: nome, percentuale e grammi, con paginazione. */
  const rigaDose = (dose: VoceDose, separatore: boolean, riserva = 0): void => {
    const percentuale = percentualeDose(dose);
    const larghezzaGrammi = 70;
    const xPercentuale = destra - larghezzaGrammi - 6;
    const righeNome = dividiInRighe(
      dose.nome,
      'F1',
      10,
      Math.max(70, LARGHEZZA_UTILE - larghezzaGrammi - 118),
    );
    const righePercentuale = percentuale
      ? dividiInRighe(percentuale, 'F1', 7.4, 112)
      : [];
    const righe = Math.max(righeNome.length, righePercentuale.length, 1);
    const altezza = righe * 11 + 3 + (dose.nota ? 10 : 0);

    assicuraSpazio(altezza + 4 + riserva);

    const base = y + 9;
    let xNome = sinistra;
    if (dose.tipo) {
      iconaPdf(dose.tipo, sinistra, y + 1, 9);
      xNome = sinistra + 14;
    }
    righeNome.forEach((riga, indice) => {
      testo(xNome, base + indice * 11, riga, { dimensione: 10 });
    });
    if (dose.nota) {
      testo(xNome, base + righeNome.length * 11, dose.nota, { dimensione: 7.8, colore: TENUE });
    }
    righePercentuale.forEach((riga, indice) => {
      testo(xPercentuale, base + indice * 8, riga, {
        dimensione: 7.4,
        colore: TENUE,
        allineamento: 'destra',
      });
    });
    testo(destra, base, `${dose.tipo === 'lievito' ? grammiLievito(dose.grammi) : numero(dose.grammi)} g`, {
      font: 'F4',
      dimensione: 10.4,
      allineamento: 'destra',
    });

    y += altezza;
    if (separatore) linea({ x: sinistra, y: y - 3 }, { x: destra, y: y - 3 });
  };

  const indicatori = indicatoriFoglio(dati);
  if (indicatori.length === 3) {
    assicuraSpazio(41);
    const spazio = 7;
    const lato = (LARGHEZZA_UTILE - 2 * spazio) / 3;
    indicatori.forEach(({ etichetta, valore }, i) => {
      const x = sinistra + i * (lato + spazio);
      aggiungi(scheda(x, y, lato, 36, i === 0 ? colore(STILE_FOGLIO.indicatore) : SUPERFICIE));
      testo(x + 8, y + 12, etichetta.toUpperCase(), { font: 'F2', dimensione: 6.6, colore: TENUE });
      testo(x + 8, y + 27, valore, { font: 'F2', dimensione: 12, colore: i === 0 ? ORO_SCURO : TESTO });
    });
    y += 41;
  }

  const parametriRicetta = dati.fasi?.length
    ? dati.riepilogo?.find(({ titolo }) => titolo === 'Parametri della ricetta')
    : undefined;
  const parametriEssenziali = parametriRicetta?.voci.filter(({ etichetta }) => {
    return etichetta === 'Farina' || etichetta === 'Autolisi'
      || (etichetta === 'Maturazione della biga' && !dati.marcia?.length && !dati.fasi?.some(({ avviso }) => avviso));
  }) ?? [];
  for (const { etichetta, valore, valorePdf } of parametriEssenziali) {
    const descrizione = valorePdf ?? valore;
    const testoParametro = /^(?:Farina\s|Biga:)/i.test(descrizione) && etichetta === 'Farina'
      ? descrizione
      : `${etichetta} · ${descrizione}`;
    const righe = testoParametro.split('\n').flatMap((riga) =>
      dividiInRighe(riga, 'F1', 8.7, LARGHEZZA_UTILE),
    );
    assicuraSpazio(righe.length * 12);
    for (const riga of righe) {
      testo(sinistra, y + 9, riga, { dimensione: 8.7, colore: TENUE });
      y += 12;
    }
  }
  if (parametriEssenziali.length) y += 8;

  if (!dati.soloProgramma) {
    // Dosi: le fasi delle ricette oppure l'elenco piatto del calcolatore libero.
    const fasi = dati.fasi ?? [];
    assicuraSpazio(24);
    // Titolo unico per tutte le dosi: le fasi delle ricette restano come
    // etichette più piccole dentro la stessa sezione.
    testo(sinistra, y + 8, 'INGREDIENTI', {
      font: 'F4',
      dimensione: 10.4,
      colore: ORO_SCURO,
    });
    y += 15;

    if (fasi.length > 0) {
      for (const [indiceFase, fase] of fasi.entries()) {
        assicuraSpazio(42);
        iniziaRiquadro();
        testo(sinistra, y + 8, fase.titolo.toUpperCase(), {
          font: 'F4',
          dimensione: 8.6,
          colore: ORO_SCURO,
        });
        y += 12;
        linea({ x: sinistra, y }, { x: destra, y });
        y += 4;

        if (fase.nota) {
          dividiInRighe(fase.nota, 'F1', 7.6, LARGHEZZA_UTILE).forEach((riga) => {
            assicuraSpazio(10);
            testo(sinistra, y + 6, riga, { dimensione: 7.6, colore: TENUE });
            y += 9;
          });
          y += 2;
        }

        if (fase.avviso) {
          const righeAvviso = dividiInRighe(fase.avviso, 'F2', 7.6, LARGHEZZA_UTILE - 14);
          const altezza = righeAvviso.length * 9 + 8;
          assicuraSpazio(altezza + 6);
          rettangolo(sinistra, y, LARGHEZZA_UTILE, altezza, {
            riempimento: [0.96, 0.93, 0.87] as const,
          });
          righeAvviso.forEach((riga, indice) => {
            testo(sinistra + 7, y + 12 + indice * 9, riga, {
              font: 'F2',
              dimensione: 7.6,
              colore: ORO_SCURO,
            });
          });
          y += altezza + 5;
        }

        fase.voci.forEach((dose, indice) => {
          const ultima = indice === fase.voci.length - 1;
          const riserva = ultima
            ? 8 + (fase.totale ? 16 : 0) + (indiceFase === fasi.length - 1 ? 29 : 0)
            : 0;
          rigaDose(dose, !ultima, riserva);
        });

        linea({ x: sinistra, y }, { x: destra, y });
        y += 8;

        if (fase.totale) {
          assicuraSpazio(16);
          testo(sinistra, y + 8, fase.totale.nome, { dimensione: 9.6, colore: TENUE });
          testo(destra, y + 8, `${numero(fase.totale.grammi)} g`, {
            font: 'F4',
            dimensione: 10.4,
            colore: ORO_SCURO,
            allineamento: 'destra',
          });
          y += 16;
        }

        chiudiRiquadro();
        y += 7;
      }
    } else {
      const dosi = dati.dosi ?? [];
      if (dosi.length > 0) iniziaRiquadro();
      dosi.forEach((dose, indice) => {
        const ultima = indice === dosi.length - 1;
        rigaDose(dose, !ultima, ultima ? 30 : 0);
      });
      chiudiRiquadro();
      y += 8;
    }

    assicuraSpazio(22);
    linea({ x: sinistra, y }, { x: destra, y });
    y += 13;
    testo(sinistra, y, 'Peso impasto', { font: 'F2', dimensione: 10.5 });
    testo(destra, y, `${numero(dati.totaleG)} g`, {
      font: 'F4',
      dimensione: 14,
      colore: ORO_SCURO,
      allineamento: 'destra',
    });
    y += 15;
  }

  for (const gruppo of dati.riepilogo ?? []) {
    if (gruppo === parametriRicetta) continue;
    const voci = gruppo.voci.filter(({ etichetta }) => {
      if (gruppo.titolo === 'Quantità') {
        const duplicato = haResa
          ? ['Numero di panetti', 'Peso di ciascun panetto', 'Numero di teglie', 'Dimensioni della teglia', 'Impasto per teglia', 'Panetti da', 'Panetti interi', 'Impasto residuo'].includes(etichetta)
          : ['Numero di panetti', 'Peso di ciascun panetto'].includes(etichetta);
        return !duplicato && (!indicatori.length || !['Farina totale', 'Peso impasto'].includes(etichetta));
      }
      return true;
    });
    if (gruppo.titolo === 'Quantità' && formati?.length) continue;
    if (!voci.length) continue;

    assicuraSpazio(45);
    testo(sinistra, y + 9, gruppo.titolo.toUpperCase(), {
      font: 'F2', dimensione: 9.3, colore: ORO_SCURO,
    });
    y += 17;
    const spazio = 7;
    const mezza = (LARGHEZZA_UTILE - spazio) / 2;
    const disegnaRiga = (riga: typeof voci, larghezza: number) => {
      const celle = riga.map((voce) => ({
        etichetta: voce.etichetta,
        righe: (voce.valorePdf ?? voce.valore).split('\n').flatMap((testo) =>
          dividiInRighe(testo, 'F1', 9.2, larghezza - 18),
        ),
      }));
      const altezza = 26 + Math.max(...celle.map(({ righe }) => righe.length)) * 12;
      assicuraSpazio(altezza + 7);
      celle.forEach(({ etichetta, righe }, i) => {
        const x = sinistra + i * (larghezza + spazio);
        aggiungi(scheda(x, y, larghezza, altezza));
        testo(x + 9, y + 13, etichetta, { font: 'F2', dimensione: 7, colore: TENUE });
        righe.forEach((riga, j) => {
          testo(x + 9, y + 26 + j * 12, riga, { dimensione: 9.2 });
        });
      });
      y += altezza + 7;
    };
    const brevi = [];
    for (const voce of voci) {
      const valore = voce.valorePdf ?? voce.valore;
      if (valore.includes('\n') || misura(voce.etichetta, 'F2', 7) > mezza - 18
        || misura(valore, 'F1', 9.2) > mezza - 18) {
        if (brevi.length) disegnaRiga(brevi.splice(0), mezza);
        disegnaRiga([voce], LARGHEZZA_UTILE);
      } else {
        brevi.push(voce);
        if (brevi.length === 2) disegnaRiga(brevi.splice(0), mezza);
      }
    }
    if (brevi.length) disegnaRiga(brevi, mezza);
    y += 7;
  }

  const larghezzaOrario = 66;
  const larghezzaAzione = LARGHEZZA_UTILE - larghezzaOrario;
  const misuraMarcia = (passi: DatiFoglio['passi']) => passi.map((passo) => {
    if (!passo.orario) return null;
    const titolo = dividiInRighe(passo.titolo, 'F2', 9.2, larghezzaAzione);
    const nota = [passo.istruzione, passo.nota].flatMap((testo) =>
      testo ? dividiInRighe(testo, 'F1', 7.8, larghezzaAzione) : [],
    );
    return { titolo, nota, altezza: Math.max(29, 10 + titolo.length * 11 + nota.length * 9.5) };
  });
  const tabellaDiMarcia = dati.passi.some((passo) => passo.orario);

  function disegnaPassi(passi = dati.passi, titolo = tabellaDiMarcia ? 'TABELLA DI MARCIA' : 'PROCEDIMENTO') {
    if (passi.length === 0) return;
    const righeMarcia = misuraMarcia(passi);
    assicuraSpazio(25 + (righeMarcia[0]?.altezza ?? 16));
    const marcia = righeMarcia.some(Boolean);
    if (marcia) iniziaRiquadro();
    testo(
      sinistra,
      y + 6,
      titolo,
      { font: 'F4', dimensione: 10.4, colore: ORO_SCURO },
    );
    y += 18;

    passi.forEach((passo, indice) => {
      const riga = righeMarcia[indice];
      if (passo.orario && riga) {
        assicuraSpazio(riga.altezza);
        const azione = sinistra + larghezzaOrario;
        testo(sinistra, y + 9, passo.orario.ora, { font: 'F2', dimensione: 9.2, colore: ORO_SCURO });
        testo(sinistra, y + 20, passo.orario.giorno, { dimensione: 7.8, colore: TENUE });
        riga.titolo.forEach((testoRiga, i) => {
          testo(azione, y + 9 + i * 11, testoRiga, { font: 'F2', dimensione: 9.2 });
        });
        riga.nota.forEach((testoRiga, i) => {
          testo(azione, y + 9 + riga.titolo.length * 11 + i * 9.5, testoRiga, {
            dimensione: 7.8,
            colore: TENUE,
          });
        });
        y += riga.altezza;
        if (righeMarcia[indice + 1]) {
          linea({ x: sinistra, y: y - 4 }, { x: sinistra + LARGHEZZA_UTILE, y: y - 4 });
        }
        return;
      }

      const riepilogo = [passo.quando, passo.nota].filter(Boolean).join(' · ');
      const righeTitolo = dividiInRighe(passo.titolo, 'F2', 9.2, LARGHEZZA_UTILE - 12);

      const altezzaTitolo = righeTitolo.length * 11 + 4;
      const primoParagrafo = passo.paragrafi?.[0];
      const altezzaPrimo = riepilogo
        ? dividiInRighe(riepilogo, 'F1', 7.8, LARGHEZZA_UTILE - 12).length * 9 + 2
        : primoParagrafo
          ? dividiInRighe(primoParagrafo, 'F1', 8, LARGHEZZA_UTILE - 12).length * 9.6 + 2
          : 0;
      tieniInsieme(altezzaTitolo + Math.max(11, altezzaPrimo), altezzaTitolo + 11);

      rettangolo(sinistra, y + 3, 3.4, 3.4, { riempimento: ORO });
      righeTitolo.forEach((riga, indice) => {
        testo(sinistra + 10, y + 7 + indice * 11, riga, { font: 'F2', dimensione: 9.2 });
      });
      y += righeTitolo.length * 11 + 4;

      if (riepilogo) {
        const righe = dividiInRighe(riepilogo, 'F1', 7.8, LARGHEZZA_UTILE - 12);
        tieniInsieme(righe.length * 9 + 2);
        righe.forEach((riga) => {
          assicuraSpazio(11);
          testo(sinistra + 10, y + 7, riga, { dimensione: 7.8, colore: TENUE });
          y += 9;
        });
        y += 2;
      }

      for (const paragrafo of passo.paragrafi ?? []) {
        const righe = dividiInRighe(paragrafo, 'F1', 8, LARGHEZZA_UTILE - 12);
        tieniInsieme(righe.length * 9.6 + 2);
        righe.forEach((riga) => {
          assicuraSpazio(11);
          testo(sinistra + 10, y + 7, riga, { dimensione: 8 });
          y += 9.6;
        });
        y += 2;
      }

      for (const voce of passo.elenco ?? []) {
        const righe = dividiInRighe(voce, 'F1', 8, LARGHEZZA_UTILE - 22);
        tieniInsieme(righe.length * 9.6 + 2);
        righe.forEach((riga, indice) => {
          assicuraSpazio(11);
          if (indice === 0) {
            testo(sinistra + 10, y + 7, '•', { dimensione: 8, colore: ORO_SCURO });
          }
          testo(sinistra + 20, y + 7, riga, { dimensione: 8, colore: TENUE });
          y += 9.6;
        });
      }

      for (const voce of passo.voci ?? []) {
        const righeVoce = dividiInRighe(voce.titolo, 'F2', 8.6, LARGHEZZA_UTILE - 22);
        const altezzaVoce = righeVoce.length * 10 + 5;
        const primo = dividiInRighe(voce.paragrafi[0] ?? '', 'F1', 8, LARGHEZZA_UTILE - 22);
        tieniInsieme(altezzaVoce + Math.max(11, primo.length * 9.6 + 2), altezzaVoce + 11);
        y += 2;
        righeVoce.forEach((riga, indice) => {
          if (indice === 0) {
            testo(sinistra + 10, y + 7, '•', { dimensione: 8, colore: ORO_SCURO });
          }
          testo(sinistra + 20, y + 7 + indice * 10, riga, {
            font: 'F2',
            dimensione: 8.6,
          });
        });
        y += righeVoce.length * 10 + 3;

        for (const paragrafo of voce.paragrafi) {
          const righe = dividiInRighe(paragrafo, 'F1', 8, LARGHEZZA_UTILE - 22);
          tieniInsieme(righe.length * 9.6 + 2);
          righe.forEach((riga) => {
            assicuraSpazio(11);
            testo(sinistra + 20, y + 7, riga, { dimensione: 8, colore: TENUE });
            y += 9.6;
          });
        }
      }

      y += 8;
    });
    if (marcia) chiudiRiquadro();
  }

  if (tabellaDiMarcia) {
    disegnaPassi();
    y += 10;
  }
  if (dati.marcia?.length) {
    disegnaPassi(dati.marcia, 'TABELLA DI MARCIA DELLA BIGA');
    y += 10;
  }

  // Forza della farina: la dichiara il calcolatore libero, non le ricette.
  const forza = dati.forza;
  if (forza) {
    assicuraSpazio(90);
    testo(sinistra, y + 6, 'FORZA DELLA FARINA', {
      font: 'F4',
      dimensione: 10.4,
      colore: ORO_SCURO,
    });
    y += 14;

    const righeForza = dividiInRighe(forza.testo, 'F1', 7.2, LARGHEZZA_UTILE - 20);
    // Riquadro compatto: il numero del mix e la riga che lo spiega, niente
    // spazio sprecato attorno. La spiegazione resta piccola: deve accompagnare
    // il numero, non rubargli la scena.
    const altezzaForza = 26 + righeForza.length * 8.2;

    rettangolo(sinistra, y, LARGHEZZA_UTILE, altezzaForza, {
      riempimento: SUPERFICIE,
      bordo: BORDO,
    });
    testo(
      sinistra + 9,
      y + 9,
      `W consigliato ${forza.consigliata} · fascia tollerata ${forza.finestra}`,
      { font: 'F2', dimensione: 6.8, colore: TENUE },
    );
    testo(
      sinistra + 9,
      y + 21,
      forza.efficace === null
        ? 'W non dichiarato'
        : `Il mix è a W ${Math.round(forza.efficace)}`,
      { font: 'F4', dimensione: 11.5, colore: ORO_SCURO },
    );
    righeForza.forEach((riga, indice) => {
      testo(sinistra + 9, y + 30 + indice * 8.2, riga, { dimensione: 7.2, colore: TENUE });
    });

    y += altezzaForza + 10;
  }

  /*
   * GRAFICI
   * -------
   * I due grafici della schermata, uno sotto l'altro, con la legenda a lato:
   * ogni voce porta il suo campione di colore, così sulla carta si capisce
   * cosa si sta guardando.
   */
  const larghezzaImmagine = Math.min(LARGHEZZA_UTILE * 0.82, 380);
  // Proporzione vera del disegno (520×232): il raster non va schiacciato.
  const altezzaImmagine = larghezzaImmagine * (232 / 520);

  type VoceGrafico = {
    colore: Colore;
    testo: string;
    simbolo?: 'linea' | 'tratteggio' | 'punto';
  };

  const puntoGrafico = (x: number, y: number, r: number, colore: Colore) => {
    const k = r * 0.5523;
    const h = alto(y);
    aggiungi(
      `q ${colore.join(' ')} rg 1 1 1 RG 0.85 w ${x + r} ${h} m ` +
      `${x + r} ${h + k} ${x + k} ${h + r} ${x} ${h + r} c ` +
      `${x - k} ${h + r} ${x - r} ${h + k} ${x - r} ${h} c ` +
      `${x - r} ${h - k} ${x - k} ${h - r} ${x} ${h - r} c ` +
      `${x + k} ${h - r} ${x + r} ${h - k} ${x + r} ${h} c B Q\n`,
    );
  };

  /** Quante righe occupa la legenda disegnata in orizzontale. */
  const righeLegenda = (
    voci: readonly { testo: string }[],
    larghezza = LARGHEZZA_UTILE,
  ): number => {
    const spazio = 14;
    let x = sinistra;
    let righe = 1;
    for (const voce of voci) {
      const larghezzaVoce = 14 + misura(voce.testo, 'F1', 8) + spazio;
      if (x > sinistra && x + larghezzaVoce > sinistra + larghezza) {
        x = sinistra;
        righe += 1;
      }
      x += larghezzaVoce;
    }
    return righe;
  };

  /** Voci di legenda una accanto all'altra, con a capo quando serve. */
  const disegnaLegenda = (
    voci: readonly VoceGrafico[],
    yInizio: number,
    xInizio = sinistra,
    larghezza = LARGHEZZA_UTILE,
  ): number => {
    const interlinea = 10.4;
    const spazio = 14;
    let x = xInizio;
    let riga = yInizio;
    for (const voce of voci) {
      const larghezzaVoce = 14 + misura(voce.testo, 'F1', 8) + spazio;
      if (x > xInizio && x + larghezzaVoce > xInizio + larghezza) {
        x = xInizio;
        riga += interlinea;
      }
      if (voce.simbolo === 'punto') {
        puntoGrafico(x + 5, riga + 3, 3.1, voce.colore);
      } else if (voce.simbolo) {
        aggiungi(voce.simbolo === 'tratteggio' ? 'q [2 1.5] 0 d\n' : 'q\n');
        linea({ x, y: riga + 3 }, { x: x + 10, y: riga + 3 }, voce.colore, 1.5);
        aggiungi('Q\n');
      } else {
        rettangolo(x + 1, riga, 8, 6, { riempimento: voce.colore, bordo: BORDO });
      }
      testo(x + 14, riga + 5, voce.testo, { dimensione: 8, colore: TESTO });
      x += larghezzaVoce;
    }
    return riga + interlinea - yInizio;
  };
  /** Legenda incolonnata a destra del disegno: voci una sotto l'altra. */
  const disegnaLegendaColonna = (
    voci: readonly { colore: Colore; testo: string }[],
    x: number,
    yInizio: number,
    larghezza: number,
  ): number => {
    let riga = yInizio;
    for (const voce of voci) {
      rettangolo(x, riga, 5.6, 5.6, { riempimento: voce.colore });
      const righeVoce = dividiInRighe(voce.testo, 'F1', 8, larghezza - 9);
      righeVoce.forEach((linea, indice) => {
        testo(x + 9, riga + 4.8 + indice * 10.4, linea, { dimensione: 8, colore: TENUE });
      });
      riga += righeVoce.length * 10.4 + 4;
    }
    return riga - yInizio;
  };

  const altezzaLegendaColonna = (
    voci: readonly { testo: string }[],
    larghezza: number,
  ): number =>
    voci.reduce(
      (somma, voce) => somma + dividiInRighe(voce.testo, 'F1', 8, larghezza - 9).length * 10.4 + 4,
      0,
    );

  const forzaVettoriale = forza && !immagini.some((immagine) => immagine.chiave === 'forza');
  const attivitaVettoriale = dati.curva !== undefined
    && !immagini.some((immagine) => immagine.chiave === 'attivita');

  /*
   * Un grafico sotto l'altro a larghezza piena, con la legenda in colonna a
   * destra: il disegno resta grande (affiancati diventava la metà) e la legenda
   * non ruba righe sotto, quindi la sezione non si allunga troppo.
   */
  const colonnaLegenda = Math.min(120, Math.max(88, Math.round(LARGHEZZA_UTILE * 0.3)));
  const larghezzaDisegno = Math.min(LARGHEZZA_UTILE - colonnaLegenda - 12, 380);
  const altezzaDisegno = larghezzaDisegno * (232 / 520);

  const intestazioneGrafici = () => {
    testo(sinistra, y + 6, 'GRAFICI', { font: 'F4', dimensione: 10.4, colore: ORO_SCURO });
    y += 14;
  };

  if (immagini.length > 0 || forzaVettoriale) {
    if (!forzaVettoriale || !stretto) {
      assicuraSpazio(forzaVettoriale ? 247 : 14 + altezzaDisegno + 34);
      intestazioneGrafici();
    }

    const legenda: Record<'forza' | 'attivita', readonly { colore: Colore; testo: string }[]> = {
      forza: [
        { colore: PANNA as Colore, testo: forzaVettoriale ? 'fascia tollerata' : 'zona consigliata per queste ore' },
        {
          colore: TESTO as Colore,
          testo: forza ? `W consigliato ${forza.consigliata}` : 'forza non dichiarata',
        },
        {
          colore: ORO as Colore,
          testo:
            forza?.efficace == null
              ? 'il tuo mix, W non dichiarato'
              : `il tuo mix, W ${Math.round(forza.efficace)}`,
        },
      ],
      attivita: [
        { colore: PANNA as Colore, testo: 'attività del lievito' },
        { colore: TESTO as Colore, testo: 'temperatura impasto, tratteggiata' },
        { colore: FRIGO as Colore, testo: 'ore in frigorifero' },
      ],
    };

    if (forzaVettoriale) {
      const valori = [forza.minima, forza.massima, forza.consigliata, forza.efficace ?? forza.consigliata];
      const respiro = Math.max(20, (Math.max(...valori) - Math.min(...valori)) * 0.4);
      const minimo = Math.max(0, Math.floor((Math.min(...valori) - respiro) / 25) * 25);
      const massimo = Math.ceil((Math.max(...valori) + respiro) / 25) * 25;
      let altezza = stretto ? 102 : 124;
      const zona = colore('#ddc6aa');
      const fascia = colore('#f0e4d5');
      const voci: VoceGrafico[] = [
        ...(forza.zonaSicura ? [{ colore: zona, testo: 'Zona consigliata' }] : []),
        { colore: fascia, testo: 'Fascia tollerata' },
        { colore: TESTO, testo: `W consigliato ${forza.consigliata}`, simbolo: 'tratteggio' },
        {
          colore: ORO_SCURO,
          testo: forza.efficace === null ? 'Mix senza W' : `Mix W ${Math.round(forza.efficace)}`,
          simbolo: 'punto',
        },
      ];
      const altezzaLegenda = righeLegenda(voci) * 10.4;
      if (stretto) {
        // Titolo della sezione (14), padding (7), titolo e asse Y (30),
        // asse X (37) e spazio sotto la legenda e il bordo (3 + 3).
        const contorno = 14 + 7 + 30 + 37 + 3 + 3 + altezzaLegenda;
        const disponibile = FONDO_PAGINA - y - contorno;
        // Nel primo foglio il disegno può abbassarsi leggermente; assi,
        // legenda e larghezza mantengono le dimensioni originali.
        if (pagine.length === 0 && disponibile >= 72) {
          altezza = Math.min(altezza, disponibile);
        }
        assicuraSpazio(altezza + contorno);
        intestazioneGrafici();
      } else {
        assicuraSpazio(altezza + altezzaLegenda + 80);
      }
      iniziaRiquadro();
      const x = (w: number) => sinistra + (w - minimo) / (massimo - minimo) * LARGHEZZA_UTILE;
      testo(sinistra, y + 7, TITOLI_GRAFICI.forza, { font: 'F2', dimensione: 10.2, colore: TESTO });
      testo(sinistra, y + 22, 'Compatibilità stimata', { dimensione: 8.5, colore: TENUE });
      const cima = y + 30;
      const base = cima + altezza;
      rettangolo(sinistra, cima, LARGHEZZA_UTILE, altezza, { riempimento: [1, 1, 1] });
      const fasce = forza.zonaSicura
        ? { sicura: forza.zonaSicura, tollerata: [forza.minima, forza.massima] as const }
        : undefined;
      const quotaW = (w: number) => adattamentoForza(w, forza.consigliata, fasce);
      if (fasce) {
        const curvaForza = Array.from({ length: 151 }, (_, i) => {
          const w = minimo + (massimo - minimo) * i / 150;
          return `${x(w).toFixed(2)} ${alto(base - quotaW(w) * altezza).toFixed(2)} ${i === 0 ? 'm' : 'l'}`;
        }).join(' ');
        // Le sfumature sono aree vettoriali ritagliate sotto la stessa curva.
        aggiungi(`q ${curvaForza} ${destra} ${alto(base)} l ${sinistra} ${alto(base)} l h W n\n`);
        rettangolo(sinistra, cima, LARGHEZZA_UTILE, altezza, { riempimento: fascia });
        const [da, a] = fasce.sicura;
        rettangolo(x(da), cima, x(a) - x(da), altezza, { riempimento: zona });
        aggiungi(`Q\n${ORO_SCURO.join(' ')} RG 1.55 w ${curvaForza} S\n`);
      } else {
        rettangolo(x(forza.minima), cima, x(forza.massima) - x(forza.minima), altezza, { riempimento: fascia });
      }
      const passo = 25 * Math.max(1, Math.ceil((massimo - minimo) / 125));
      for (let w = minimo; w <= massimo; w += passo) {
        linea({ x: x(w), y: base }, { x: x(w), y: base + 4 }, TENUE);
        testo(x(w), base + 14, String(w), { dimensione: 8.5, colore: TESTO, allineamento: 'centro' });
      }
      linea({ x: sinistra, y: base }, { x: destra, y: base });
      aggiungi('q [3 2] 0 d\n');
      linea({ x: x(forza.consigliata), y: cima }, { x: x(forza.consigliata), y: base }, TESTO, 1.25);
      aggiungi('Q\n');
      if (forza.efficace !== null) {
        const yMix = fasce ? base - quotaW(forza.efficace) * altezza : cima + 6;
        linea({ x: x(forza.efficace), y: yMix }, { x: x(forza.efficace), y: base }, ORO_SCURO, 1.25);
        puntoGrafico(x(forza.efficace), yMix, 3.8, ORO_SCURO);
      }
      testo((sinistra + destra) / 2, base + 29, 'Forza della farina (W)', {
        dimensione: 8.5, colore: TENUE, allineamento: 'centro',
      });
      y = base + 37 + disegnaLegenda(voci, base + 37) + 3;
      chiudiRiquadro();
      y += 10;
    }

    if (immagini.length === 2) {
      immagini.forEach((immagine) => {
        const altezzaLegenda = altezzaLegendaColonna(legenda[immagine.chiave], colonnaLegenda);
        const altezzo = Math.max(altezzaDisegno, altezzaLegenda);
        assicuraSpazio(10 + altezzo + 8);
        testo(sinistra, y + 5, TITOLI_GRAFICI[immagine.chiave], {
          font: 'F2',
          dimensione: 7.4,
          colore: ORO_SCURO,
        });
        const cima = y + 10;
        aggiungi(
          `q ${larghezzaDisegno.toFixed(2)} 0 0 ${altezzaDisegno.toFixed(2)} ` +
            `${sinistra.toFixed(2)} ${alto(cima + altezzaDisegno).toFixed(2)} cm /${immagine.nome} Do Q\n`,
        );
        disegnaLegendaColonna(
          legenda[immagine.chiave],
          sinistra + larghezzaDisegno + 12,
          cima + 2,
          colonnaLegenda,
        );
        y = cima + altezzo + 8;
      });
    } else {
      immagini.forEach((immagine) => {
      // Caption, disegno, legenda e margine: se non ci stanno tutti, la pagina
      // nuova si apre qui, altrimenti il grafico finiva sotto il bordo.
      const ingombro =
        10 + altezzaImmagine + 4 + righeLegenda(legenda[immagine.chiave]) * 10.4 + 6;
      assicuraSpazio(ingombro);
      testo(sinistra, y + 5, TITOLI_GRAFICI[immagine.chiave], {
        font: 'F2',
        dimensione: 7.4,
        colore: ORO_SCURO,
      });
      const cima = y + 10;
      aggiungi(
        `q ${larghezzaImmagine.toFixed(2)} 0 0 ${altezzaImmagine.toFixed(2)} ` +
          `${sinistra.toFixed(2)} ${alto(cima + altezzaImmagine).toFixed(2)} cm /${immagine.nome} Do Q\n`,
      );

      // Legenda sotto il disegno, in riga: i colori restano leggibili e il
      // grafico non deve dividere la larghezza con una colonna di testo.
        const altezzaLegenda = disegnaLegenda(
          legenda[immagine.chiave],
          cima + altezzaImmagine + 4,
        );
        y = cima + altezzaImmagine + 4 + altezzaLegenda + 8;
      });
    }
    y += 4;
  }

  // Le ricette non hanno curva né grafici: la sezione non compare affatto.
  if (attivitaVettoriale) {
  assicuraSpazio(stretto ? 174 : 194);
  iniziaRiquadro();
  // Grafico dell'attività
  const titoloAttivita = dati.curva?.some((punto) => punto.temperatura !== undefined)
    ? TITOLI_GRAFICI.attivita.toUpperCase() : 'ATTIVITÀ DEL LIEVITO';
  testo(sinistra, y + 6, titoloAttivita, { font: 'F4', dimensione: 10.4, colore: ORO_SCURO });
  y += 16;

  const curva = dati.curva ?? [];
  const fasce = dati.fasce ?? [];
  const oreTotali = dati.oreTotali ?? curva[curva.length - 1]?.ora ?? 0;

  const altezzaGrafico = stretto ? 118 : 138;

  if (curva.length > 1) {
    const base = y + altezzaGrafico;
    const tetto = y + 4;
    const temperature = curva.flatMap((punto) => punto.temperatura === undefined ? [] : [punto.temperatura]);
    const margineTemperature = temperature.length === curva.length ? 29 : 0;
    const massimo = Math.max(1, ...curva.map((punto) => punto.attivita));
    const ascissa = (ora: number): number =>
      sinistra + margineTemperature + (Math.max(0, Math.min(ora, oreTotali)) / (oreTotali || 1)) * (LARGHEZZA_UTILE - margineTemperature);
    const ordinata = (attivita: number): number =>
      base - (attivita / massimo) * (base - tetto);

    rettangolo(ascissa(0), tetto, destra - ascissa(0), base - tetto, { riempimento: [1, 1, 1] });
    const coloreFrigo = colore('#ede8e1');
    // Fascia del frigorifero, sotto la curva.
    fasce
      .filter((fascia) => fascia.inFrigo)
      .forEach((fascia) => {
        rettangolo(
          ascissa(fascia.da),
          tetto,
          Math.max(1, ascissa(fascia.a) - ascissa(fascia.da)),
          base - tetto,
          { riempimento: coloreFrigo },
        );
        if (ascissa(fascia.a) - ascissa(fascia.da) >= 40) {
          testo((ascissa(fascia.da) + ascissa(fascia.a)) / 2, tetto + 11, 'FRIGO', {
            font: 'F2', dimensione: 7.1, colore: TENUE, allineamento: 'centro',
          });
        }
      });
    [0.25, 0.5, 0.75].forEach((quota) => {
      const yGriglia = tetto + (base - tetto) * quota;
      linea({ x: ascissa(0), y: yGriglia }, { x: destra, y: yGriglia }, BORDO, 0.4);
    });

    // Area sotto la curva, poi la spezzata.
    let area = `${ascissa(curva[0].ora).toFixed(2)} ${alto(base).toFixed(2)} m `;
    for (const punto of curva) {
      area += `${ascissa(punto.ora).toFixed(2)} ${alto(ordinata(punto.attivita)).toFixed(2)} l `;
    }
    area += `${ascissa(curva[curva.length - 1].ora).toFixed(2)} ${alto(base).toFixed(2)} l f\n`;
    aggiungi(`${PANNA.join(' ')} rg ${area}`);

    let spezzata = '';
    curva.forEach((punto, indice) => {
      spezzata += `${ascissa(punto.ora).toFixed(2)} ${alto(ordinata(punto.attivita)).toFixed(2)} ${
        indice === 0 ? 'm' : 'l'
      } `;
    });
    aggiungi(`${ORO_SCURO.join(' ')} RG 1.9 w ${spezzata}S\n`);

    if (margineTemperature > 0) {
      const minima = Math.min(...temperature);
      const massima = Math.max(...temperature);
      const intervallo = Math.max(massima - minima, 0.5);
      const percorso = curva.map((punto, i) => {
        const temperatura = temperature[i];
        const quota = (temperatura - minima) / intervallo;
        return `${ascissa(punto.ora).toFixed(2)} ${alto(base - quota * (base - tetto)).toFixed(2)} ${i === 0 ? 'm' : 'l'}`;
      }).join(' ');
      aggiungi(`q [3 2] 0 d ${TESTO.join(' ')} RG 1.5 w ${percorso} S Q\n`);
      testo(sinistra, base, `${numero(minima)} °C`, { dimensione: 8.5, colore: TESTO });
      if (massima > minima) {
        testo(sinistra, tetto + 4, `${numero(massima)} °C`, { dimensione: 8.5, colore: TESTO });
      }
    }

    linea({ x: sinistra, y: base }, { x: destra, y: base }, BORDO, 0.7);

    [0, 0.25, 0.5, 0.75, 1].forEach((quota) => {
      const ora = oreTotali * quota;
      const x = ascissa(ora);
      linea({ x, y: base }, { x, y: base + 4 }, TENUE);
      testo(x, base + 15, `${numero(ora)} h`, {
        dimensione: 8.5, colore: TESTO, allineamento: quota === 1 ? 'destra' : 'centro',
      });
    });
    const voci: VoceGrafico[] = [{ colore: ORO_SCURO, testo: 'Attività del lievito', simbolo: 'linea' }];
    if (margineTemperature > 0) {
      voci.push({ colore: TESTO, testo: 'Temperatura impasto', simbolo: 'tratteggio' });
    }
    if (fasce.some(({ inFrigo }) => inFrigo)) {
      voci.push({ colore: coloreFrigo, testo: 'frigorifero' });
    }
    y = base + 23 + disegnaLegenda(voci, base + 23);

  } else {
    testo(sinistra, y + 10, 'Nessuna curva da disegnare.', { dimensione: 8, colore: TENUE });
  }
  chiudiRiquadro();
  y += 12;
  }

  if (!tabellaDiMarcia) disegnaPassi();

  // Note: come è stato calcolato il foglio libero, i consigli nelle ricette.
  // Si leggono come un elenco: un pallino, righe più alte e un po' d'aria fra
  // una voce e l'altra, come nella scheda a schermo.
  if (dati.note.length > 0) {
    assicuraSpazio(38);
    testo(sinistra, y + 6, dati.noteTitolo ?? 'NOTA', {
      font: 'F4',
      dimensione: 10.4,
      colore: ORO_SCURO,
    });
    y += 19;

    dati.note.forEach((nota, indice) => {
      if (indice > 0) y += 6;
      const righe = dividiInRighe(nota, 'F1', 8.2, LARGHEZZA_UTILE - 10);
      tieniInsieme(righe.length * 10.6 + 2);
      righe.forEach((riga, posizione) => {
        assicuraSpazio(12);
        if (posizione === 0) {
          testo(sinistra + 1, y + 7, '•', { dimensione: 8.2, colore: ORO_SCURO });
        }
        testo(sinistra + 10, y + 7, riga, { dimensione: 8.2, colore: TENUE });
        y += 10.6;
      });
    });
    y += 2;
  }

  // Ultima facciata, poi il piede su ognuna: la ricetta può essere lunga.
  pagine.push(pezzi);

  const flusso = (parti: Uint8Array[]): Uint8Array =>
    unisci(
      parti,
      parti.reduce((somma, parte) => somma + parte.length, 0),
    );

  const flussi = pagine.map(flusso);
  const firma = dati.firma ?? FIRMA_FOGLIO;

  flussi.forEach((_contenuto, indice) => {
    // Il piede si aggiunge al flusso della facciata, non lo sostituisce.
    pezzi = pagine[indice];
    const base = FONDO_PAGINA + 4;
    linea({ x: sinistra, y: base }, { x: destra, y: base });

    if (flussi.length === 1) {
      testo(PAGINA.larghezza / 2, base + 10, firma, {
        dimensione: 6.8,
        colore: TENUE,
        allineamento: 'centro',
      });
    } else {
      testo(sinistra, base + 10, firma, { dimensione: 6.6, colore: TENUE });
      testo(destra, base + 10, `Pagina ${indice + 1} di ${flussi.length}`, {
        dimensione: 6.6,
        colore: TENUE,
        allineamento: 'destra',
      });
    }

    flussi[indice] = flusso(pezzi);
  });

  // Struttura del documento
  const uscita: Uint8Array[] = [];
  let cursore = 0;
  const posizioni: number[] = [];

  const scrivi = (dato: string | Uint8Array): void => {
    const byte = typeof dato === 'string' ? new TextEncoder().encode(dato) : dato;
    uscita.push(byte);
    cursore += byte.length;
  };

  const oggetto = (indice: number, corpo: string): void => {
    posizioni[indice] = cursore;
    scrivi(`${indice} 0 obj\n${corpo}\nendobj\n`);
  };

  scrivi('%PDF-1.4\n');

  // La prima facciata resta agli oggetti 3 e 4; le eventuali altre vengono
  // dopo font e immagini, così il foglio di una pagina sola non cambia.
  const baseExtra = 8 + immagini.length;
  const extra = flussi.slice(1).map((_pagina, indice) => baseExtra + indice * 2 + 1);

  oggetto(1, '<< /Type /Catalog /Pages 2 0 R >>');
  oggetto(
    2,
    `<< /Type /Pages /Kids [${[3, ...extra]
      .map((numeroPagina) => `${numeroPagina} 0 R`)
      .join(' ')}] /Count ${flussi.length} >>`,
  );
  /*
   * Le immagini vanno dichiarate in ogni facciata, non solo nella prima: il
   * grafico può cadere sulla seconda, e un `/Im2 Do` senza la voce in
   * `/XObject` non disegna niente (il lettore non sa che immagine è).
   */
  const risorse =
    '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> ' +
    (immagini.length > 0
      ? `/XObject << ${immagini
          .map((immagine, indice) => `/${immagine.nome} ${9 + indice} 0 R`)
          .join(' ')} >> `
      : '') +
    '>> ';

  oggetto(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.larghezza} ${PAGINA.altezza}] ` +
      risorse +
      '/Contents 4 0 R >>',
  );

  posizioni[4] = cursore;
  scrivi('4 0 obj\n');
  scrivi(`<< /Length ${flussi[0].length} >>\nstream\n`);
  scrivi(flussi[0]);
  scrivi('\nendstream\nendobj\n');

  (Object.keys(BASE_FONT) as NomeFont[]).forEach((nome, indice) => {
    oggetto(
      5 + indice,
      `<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT[nome]} ` +
        '/Encoding /WinAnsiEncoding >>',
    );
  });

  // Immagini: JPEG incapsulati così come sono, dopo i font.
  immagini.forEach((immagine, indice) => {
    const numeroImmagine = 9 + indice;
    posizioni[numeroImmagine] = cursore;
    scrivi(
      `${numeroImmagine} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${immagine.larghezza} ` +
        `/Height ${immagine.altezza} /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${immagine.byte.length} >>\nstream\n`,
    );
    scrivi(immagine.byte);
    scrivi('\nendstream\nendobj\n');
  });

  // Facciate successive: stesse risorse della prima, grafici compresi.
  extra.forEach((numeroPagina, indice) => {
    oggetto(
      numeroPagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.larghezza} ${PAGINA.altezza}] ` +
        risorse +
        `/Contents ${numeroPagina + 1} 0 R >>`,
    );
    posizioni[numeroPagina + 1] = cursore;
    scrivi(`${numeroPagina + 1} 0 obj\n`);
    scrivi(`<< /Length ${flussi[indice + 1].length} >>\nstream\n`);
    scrivi(flussi[indice + 1]);
    scrivi('\nendstream\nendobj\n');
  });

  const totaleOggetti = baseExtra + (flussi.length - 1) * 2;
  const inizioXref = cursore;
  scrivi(`xref\n0 ${totaleOggetti + 1}\n0000000000 65535 f \n`);
  for (let indice = 1; indice <= totaleOggetti; indice += 1) {
    scrivi(`${String(posizioni[indice]).padStart(10, '0')} 00000 n \n`);
  }
  scrivi(
    `trailer\n<< /Size ${totaleOggetti + 1} /Root 1 0 R >>\nstartxref\n${inizioXref}\n%%EOF\n`,
  );

  return unisci(uscita, cursore);
}

/**
 * Costruisce il foglio in PDF vettoriale: A4, oppure stretto per il telefono.
 * Restituisce il file e non lo scarica: chi lo riceve decide se mostrarlo o
 * salvarlo (vedi la card «La tua ricetta»).
 */
export function pdfBlob(dati: DatiFoglio, stretto = false): Blob {
  const pdf = creaPdf(dati, stretto);
  const buffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;

  return new Blob([buffer], { type: 'application/pdf' });
}
