import { grammiLievito } from '../lib/numeri';
import { MARCHIO_CERCHI, MARCHIO_PIENI, MARCHIO_SPESSORE, MARCHIO_TRATTI, MARCHIO_VIEWBOX } from './marchio';
import { FIRMA_FOGLIO, TITOLI_GRAFICI } from './foglio';
import type { DatiFoglio, FaseFoglio, PassoFoglio, VoceDose } from './foglio';
import type { TipoIngrediente } from '../vecchio/types';
import { LATO_ICONA, disegnaIcona } from '../vecchio/lib/icone';

export type ComandoMarchio = { tipo: 'm' | 'l' | 'c' | 'z'; valori: number[] };

/**
 * Legge il `d` di un tracciato SVG e lo porta in comandi assoluti, quelli che
 * il PDF sa riscrivere (`m`, `l`, `c`, `h`). Il marchio della home è fatto così.
 */
export function leggiPercorso(d: string): ComandoMarchio[] {
  const gettoni = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  const comandi: ComandoMarchio[] = [];
  let comando = 'm';
  let relativo = true;
  // Solo il primo gruppo dopo una `m` apre un sottotracciato: gli altri sono
  // lineto (come dopo una `l`), altrimenti il disegno si spezza in pezzi chiusi.
  let apre = true;
  let x = 0;
  let y = 0;
  let partenzaX = 0;
  let partenzaY = 0;
  let i = 0;

  while (i < gettoni.length) {
    if (/^[a-zA-Z]$/.test(gettoni[i])) {
      comando = gettoni[i].toLowerCase();
      relativo = gettoni[i] === comando;
      apre = true;
      i += 1;
      if (comando === 'z') {
        comandi.push({ tipo: 'z', valori: [] });
        x = partenzaX;
        y = partenzaY;
        continue;
      }
      continue;
    }

    if (comando === 'c') {
      const punti = gettoni
        .slice(i, i + 6)
        .map(Number)
        .map((valore, indice) =>
          relativo ? (indice % 2 === 0 ? x + valore : y + valore) : valore,
        );
      i += 6;
      comandi.push({ tipo: 'c', valori: punti });
      x = punti[4];
      y = punti[5];
      apre = false;
      continue;
    }

    const puntoX = relativo ? x + Number(gettoni[i]) : Number(gettoni[i]);
    const puntoY = relativo ? y + Number(gettoni[i + 1]) : Number(gettoni[i + 1]);
    i += 2;
    const inizio = comando === 'm' && apre;
    comandi.push({ tipo: inizio ? 'm' : 'l', valori: [puntoX, puntoY] });
    if (inizio) {
      partenzaX = puntoX;
      partenzaY = puntoY;
    }
    apre = false;
    x = puntoX;
    y = puntoY;
  }

  return comandi;
}

/** I tracciati del marchio già convertiti: si legge il SVG una volta sola. */
const PERCORSI_MARCHIO = {
  pieni: MARCHIO_PIENI.map(leggiPercorso),
  tratti: MARCHIO_TRATTI.map(leggiPercorso),
};

/*
 * PDF VETTORIALE DEL FOGLIO
 * -------------------------
 * Il documento è scritto a mano, senza librerie, con i font standard PDF
 * (Helvetica e Helvetica-Bold): così il testo resta selezionabile, cercabile e
 * leggibile dagli screen reader, e il file pesa pochi kilobyte.
 *
 * Il disegno è quello del sito: fondo crema, schede bianche arrotondate con
 * un'ombra calda, titoli in grassetto, pastiglie e fili color latte tostato.
 * Non è una fotografia della pagina — è la stessa grammatica visiva, ridotta a
 * ciò che una stampa A4 deve dire: dosi, tempi, procedimento.
 *
 * Le larghezze dei caratteri sono quelle dei font AFM: servono per allineare a
 * destra i numeri e per andare a capo senza sbordare. Sono dati, non stime.
 */

/** A4 per il foglio da stampare, formato telefono per leggerlo a schermo. */
const A4 = { larghezza: 595.28, altezza: 841.89, margine: 40 };
const TELEFONO = { larghezza: 360, altezza: 780, margine: 22 };

let PAGINA = A4;

/** Spazio che il piede si tiene in fondo a ogni facciata. */
const PEDE = 54;

/**
 * «Ottimizza per smartphone»: pagina stretta e alta, come un foglio da
 * telefono, così il testo resta grande senza zoom. Il disegno è lo stesso: si
 * adattano solo larghezza utile, margini e interruzioni di pagina.
 */
function impostaFormato(stretto: boolean): void {
  PAGINA = stretto ? TELEFONO : A4;
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

/* La tavolozza è quella dei token del sito (`src/index.css`): crema, carta,
 * inchiostro charcoal, latte tostato. */
const CREMA = colore('#f5f1ea');
const CARTA = colore('#ffffff');
const CARTA_CREMA = colore('#faf6ef');
const INCHIOSTRO = colore('#3a342c');
const TENUE = colore('#7a7064');
const INCHIOSTRO_TENUE = colore('#57504a');
const BORDO = colore('#e4dcce');
const ACCENTO = colore('#b99b77');
const ACCENTO_SCURO = colore('#8a6d4e');
const VELO = colore('#f2e8da');
const OMBRA = colore('#eae0cf');
const PANNA = colore('#f2e8da');
const PANNA_CHIARA = colore('#f8f3ea');
const FRIGO = colore('#efe9de');

/** Larghezza di un testo in punti PDF. */
export function misura(
  testo: string,
  font: NomeFont,
  dimensione: number,
  spaziatura = 0,
): number {
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

  const caratteri = [...testo].length;
  const spazio = caratteri > 1 ? spaziatura * (caratteri - 1) : 0;

  return (totale * dimensione) / 1000 + spazio;
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

/**
 * Numeri all'italiana, con il punto delle migliaia scritto qui: `toLocaleString`
 * non raggruppa su tutte le piattaforme e il foglio finiva con «2850 g» accanto
 * a «2.850 g» arrivato dai dati.
 */
function numero(valore: number): string {
  const arrotondato = Math.round(valore * 10) / 10;
  const [intero, decimale] = arrotondato.toFixed(1).replace(/\.0$/, '').split('.');
  const raggruppato = intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimale ? `${raggruppato},${decimale}` : raggruppato;
}

interface OpzioniTesto {
  font?: NomeFont;
  dimensione?: number;
  colore?: Colore;
  allineamento?: 'sinistra' | 'destra' | 'centro';
  /** Spazio fra le lettere, per le etichette piccole in maiuscolo. */
  spaziatura?: number;
}

interface OpzioniRettangolo {
  riempimento?: Colore;
  bordo?: Colore;
  spessore?: number;
}

interface Punto {
  x: number;
  y: number;
}

/** Un pezzo di scheda: altezza nota e disegno a una coordinata data. */
interface Blocco {
  altezza: number;
  disegna: (ySuperiore: number) => void;
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

/** Si scrive con la maiuscola iniziale: i titoli delle schede non sono urli. */
function frase(testo: string): string {
  const maiuscolo = testo === testo.toUpperCase();
  if (!maiuscolo) return testo;
  const minuscolo = testo.toLocaleLowerCase('it-IT');
  return minuscolo.charAt(0).toLocaleUpperCase('it-IT') + minuscolo.slice(1);
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
    const inchiostro = opzioni.colore ?? INCHIOSTRO;
    const spaziatura = opzioni.spaziatura ?? 0;
    const larghezza = misura(contenuto, font, dimensione, spaziatura);

    let partenza = x;
    if (opzioni.allineamento === 'destra') partenza = x - larghezza;
    else if (opzioni.allineamento === 'centro') partenza = x - larghezza / 2;

    aggiungi(
      `BT /${font} ${dimensione} Tf ${spaziatura.toFixed(2)} Tc ` +
        `${inchiostro.join(' ')} rg ` +
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
        `${opzioni.bordo.join(' ')} RG ${(opzioni.spessore ?? 0.7).toFixed(2)} w ` +
          `${x.toFixed(2)} ${y.toFixed(2)} ` +
          `${larghezza.toFixed(2)} ${altezza.toFixed(2)} re S\n`,
      );
    }
  };

  /** Percorso di un rettangolo con gli angoli morbidi, come le schede del sito. */
  const percorsoArrotondato = (
    x: number,
    ySuperiore: number,
    larghezza: number,
    altezza: number,
    raggio: number,
  ): string => {
    const x1 = x + larghezza;
    const basso = alto(ySuperiore + altezza);
    const sommo = alto(ySuperiore);
    const r = Math.max(0, Math.min(raggio, larghezza / 2, altezza / 2));
    const k = 0.5523 * r;
    const n = (valore: number) => valore.toFixed(2);

    return (
      `${n(x + r)} ${n(basso)} m ` +
      `${n(x1 - r)} ${n(basso)} l ` +
      `${n(x1 - r + k)} ${n(basso)} ${n(x1)} ${n(basso + r - k)} ${n(x1)} ${n(basso + r)} c ` +
      `${n(x1)} ${n(sommo - r)} l ` +
      `${n(x1)} ${n(sommo - r + k)} ${n(x1 - r + k)} ${n(sommo)} ${n(x1 - r)} ${n(sommo)} c ` +
      `${n(x + r)} ${n(sommo)} l ` +
      `${n(x + r - k)} ${n(sommo)} ${n(x)} ${n(sommo - r + k)} ${n(x)} ${n(sommo - r)} c ` +
      `${n(x)} ${n(basso + r)} l ` +
      `${n(x)} ${n(basso + r - k)} ${n(x + r - k)} ${n(basso)} ${n(x + r)} ${n(basso)} c h`
    );
  };

  const arrotondato = (
    x: number,
    ySuperiore: number,
    larghezza: number,
    altezza: number,
    raggio: number,
    opzioni: OpzioniRettangolo = {},
  ): void => {
    const percorso = percorsoArrotondato(x, ySuperiore, larghezza, altezza, raggio);
    if (opzioni.riempimento && opzioni.bordo) {
      // `B` riempie e contorna: prima si impostano entrambi i colori.
      aggiungi(
        `${opzioni.riempimento.join(' ')} rg ${opzioni.bordo.join(' ')} RG ` +
          `${(opzioni.spessore ?? 0.8).toFixed(2)} w ${percorso} B\n`,
      );
    } else if (opzioni.riempimento) {
      aggiungi(`${opzioni.riempimento.join(' ')} rg ${percorso} f\n`);
    } else if (opzioni.bordo) {
      aggiungi(
        `${opzioni.bordo.join(' ')} RG ${(opzioni.spessore ?? 0.8).toFixed(2)} w ${percorso} S\n`,
      );
    }
  };

  /** Cerchio pieno o in filo, usato dal marchio e dai numeri dei passi. */
  const cerchio = (
    cx: number,
    cy: number,
    raggio: number,
    opzioni: OpzioniRettangolo = {},
  ): void => {
    const k = 0.5523 * raggio;
    const n = (valore: number) => valore.toFixed(2);
    const percorso =
      `${n(cx + raggio)} ${n(cy)} m ` +
      `${n(cx + raggio)} ${n(cy + k)} ${n(cx + k)} ${n(cy + raggio)} ${n(cx)} ${n(cy + raggio)} c ` +
      `${n(cx - k)} ${n(cy + raggio)} ${n(cx - raggio)} ${n(cy + k)} ${n(cx - raggio)} ${n(cy)} c ` +
      `${n(cx - raggio)} ${n(cy - k)} ${n(cx - k)} ${n(cy - raggio)} ${n(cx)} ${n(cy - raggio)} c ` +
      `${n(cx + k)} ${n(cy - raggio)} ${n(cx + raggio)} ${n(cy - k)} ${n(cx + raggio)} ${n(cy)} c h`;

    if (opzioni.riempimento) aggiungi(`${opzioni.riempimento.join(' ')} rg ${percorso} f\n`);
    if (opzioni.bordo) {
      aggiungi(
        `${opzioni.bordo.join(' ')} RG ${(opzioni.spessore ?? 0.8).toFixed(2)} w ${percorso} S\n`,
      );
    }
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
    const inchiostro = ACCENTO_SCURO.join(' ');
    const k = 0.5523;

    disegnaIcona(tipo, {
      polilinea: (punti, chiusa) => {
        let percorso = '';
        punti.forEach((punto, indice) => {
          const px = x + punto.x * scala;
          const py = alto(ySuperiore + punto.y * scala);
          percorso += `${px.toFixed(2)} ${py.toFixed(2)} ${indice === 0 ? 'm' : 'l'} `;
        });
        aggiungi(`${inchiostro} RG 0.85 w ${percorso}${chiusa ? 'h ' : ''}S\n`);
      },
      cerchio: (cerchioIcona) => {
        const cx = x + cerchioIcona.cx * scala;
        const cy = alto(ySuperiore + cerchioIcona.cy * scala);
        const r = cerchioIcona.r * scala;
        aggiungi(
          `${inchiostro} RG 0.85 w ${(cx + r).toFixed(2)} ${cy.toFixed(2)} m ` +
            `${(cx + r).toFixed(2)} ${(cy + k * r).toFixed(2)} ${(cx + k * r).toFixed(2)} ${(cy + r).toFixed(2)} ${cx.toFixed(2)} ${(cy + r).toFixed(2)} c ` +
            `${(cx - k * r).toFixed(2)} ${(cy + r).toFixed(2)} ${(cx - r).toFixed(2)} ${(cy + k * r).toFixed(2)} ${(cx - r).toFixed(2)} ${cy.toFixed(2)} c ` +
            `${(cx - r).toFixed(2)} ${(cy - k * r).toFixed(2)} ${(cx - k * r).toFixed(2)} ${(cy - r).toFixed(2)} ${cx.toFixed(2)} ${(cy - r).toFixed(2)} c ` +
            `${(cx + k * r).toFixed(2)} ${(cy - r).toFixed(2)} ${(cx + r).toFixed(2)} ${(cy - k * r).toFixed(2)} ${(cx + r).toFixed(2)} ${cy.toFixed(2)} c h S\n`,
        );
      },
    });
  };

  /**
   * Marchio: il trancio graduato della home (`src/components/Marchio.tsx`),
   * dentro il tondo di carta della testata. I tracciati sono gli stessi del
   * componente, quindi il foglio non ha un logo suo.
   */
  const marchio = (x: number, ySuperiore: number, lato: number): void => {
    const cx = x + lato / 2;
    const cyPagina = ySuperiore + lato / 2;
    const cy = alto(cyPagina);
    const raggio = lato / 2 - 0.5;

    cerchio(cx, cy, raggio, { riempimento: CARTA, bordo: BORDO, spessore: 0.8 });

    const vista = MARCHIO_VIEWBOX;
    const scala = (lato * 0.66) / Math.max(vista.larghezza, vista.altezza);
    const sinistra = x + (lato - vista.larghezza * scala) / 2;
    const sopra = ySuperiore + (lato - vista.altezza * scala) / 2;
    const puntoX = (valore: number) => sinistra + (valore - vista.x) * scala;
    const puntoY = (valore: number) => sopra + (valore - vista.y) * scala;
    const X = (valore: number) => puntoX(valore).toFixed(2);
    const Y = (valore: number) => alto(puntoY(valore)).toFixed(2);

    const traccia = (comandi: readonly ComandoMarchio[]): string =>
      comandi
        .map(({ tipo, valori }) => {
          if (tipo === 'z') return 'h';
          if (tipo === 'c') {
            return `${X(valori[0])} ${Y(valori[1])} ${X(valori[2])} ${Y(valori[3])} ${X(valori[4])} ${Y(valori[5])} c`;
          }
          return `${X(valori[0])} ${Y(valori[1])} ${tipo}`;
        })
        .join(' ');

    for (const percorso of PERCORSI_MARCHIO.pieni) {
      aggiungi(`${ACCENTO.join(' ')} rg ${traccia(percorso)} f\n`);
    }
    for (const segno of MARCHIO_CERCHI) {
      cerchio(puntoX(segno.cx), alto(puntoY(segno.cy)), segno.r * scala, {
        ...(segno.tratto
          ? { bordo: ACCENTO, spessore: MARCHIO_SPESSORE * scala }
          : { riempimento: ACCENTO }),
      });
    }
    for (const percorso of PERCORSI_MARCHIO.tratti) {
      aggiungi(
        `${ACCENTO.join(' ')} RG ${(MARCHIO_SPESSORE * scala).toFixed(2)} w 1 j 1 J ${traccia(percorso)} S\n`,
      );
    }
  };

  /** Pastiglia con testo in maiuscolo: gruppo, tipo di impasto, totali. */
  const pastiglia = (
    x: number,
    ySuperiore: number,
    larghezza: number,
    altezza: number,
    contenuto: string,
    opzioni: { pieno?: boolean; dimensione?: number } = {},
  ): void => {
    arrotondato(x, ySuperiore, larghezza, altezza, altezza / 2, {
      riempimento: opzioni.pieno ? VELO : CARTA_CREMA,
      bordo: opzioni.pieno ? undefined : BORDO,
      spessore: 0.6,
    });
    const dimensione = opzioni.dimensione ?? 6.4;
    testo(x + larghezza / 2, ySuperiore + altezza / 2 + dimensione * 0.36, contenuto, {
      font: 'F2',
      dimensione,
      colore: ACCENTO_SCURO,
      allineamento: 'centro',
      spaziatura: 0.7,
    });
  };

  const sinistra = PAGINA.margine;
  const destra = PAGINA.larghezza - PAGINA.margine;
  const larghezzaUtile = destra - sinistra;
  const FONDO = PAGINA.altezza - PEDE;

  /* Misure delle schede: valgono per A4 e per il formato telefono. */
  const PAD = stretto ? 12 : 15;
  const PAD_VERT = stretto ? 9 : 11;
  const RAGGIO = stretto ? 9 : 11;
  const TITOLO_SCHEDA = 22;
  const DISTANZA = 9;

  const interno = sinistra + PAD;
  const largoInterno = larghezzaUtile - PAD * 2;
  const fineInterno = destra - PAD;

  let y = PAGINA.margine;

  const sfondoPagina = (): void => {
    aggiungi(
      `${CREMA.join(' ')} rg 0 0 ${PAGINA.larghezza.toFixed(2)} ` +
        `${PAGINA.altezza.toFixed(2)} re f\n`,
    );
  };

  /** Apre una facciata nuova, con la testata ridotta di continuazione. */
  const nuovaPagina = (): void => {
    pagine.push(pezzi);
    pezzi = [];
    sfondoPagina();
    y = PAGINA.margine;
    marchio(sinistra, y + 1, stretto ? 15 : 17);
    testo(sinistra + (stretto ? 20 : 23), y + 9, 'PizzaMetria', {
      font: 'F2',
      dimensione: 8.6,
      colore: INCHIOSTRO,
    });
    testo(destra, y + 9, dati.titolo, {
      dimensione: 7.4,
      colore: TENUE,
      allineamento: 'destra',
    });
    linea({ x: sinistra, y: y + 23 }, { x: destra, y: y + 23 }, BORDO, 0.6);
    y += 33;
  };

  // Prima facciata: fondo crema e testata completa con il marchio.
  sfondoPagina();
  marchio(sinistra, y, stretto ? 27 : 30);
  testo(sinistra + (stretto ? 34 : 39), y + 12.5, 'PizzaMetria', {
    font: 'F2',
    dimensione: stretto ? 13.5 : 15,
    colore: INCHIOSTRO,
  });
  testo(sinistra + (stretto ? 34.5 : 39.5), y + 23.5, 'IL CALCOLATORE DI IMPASTI', {
    font: 'F2',
    dimensione: 5.9,
    colore: ACCENTO_SCURO,
    spaziatura: 0.9,
  });

  // Gruppo della ricetta: la pastiglia che sul sito sta nella testata.
  const occhiello = dati.occhiello ?? 'CALCOLATORE LIBERO';
  const larghezzaOcchiello = misura(occhiello, 'F2', 5.8, 0.7) + 17;
  pastiglia(destra - larghezzaOcchiello, y + 7.5, larghezzaOcchiello, 16, occhiello, {
    dimensione: 6.2,
  });

  // Il filo passa sotto al marchio, non attraverso: come nella testata del sito.
  y += stretto ? 33 : 37;
  linea({ x: sinistra, y }, { x: destra, y }, BORDO, 0.6);
  y += stretto ? 9 : 16;

  // Apertura: filo d'oro, titolo grande, sottotitolo, pastiglia del tipo.
  rettangolo(sinistra, y, 24, 2.6, { riempimento: ACCENTO });
  y += stretto ? 8 : 11;

  const dimensioneTitolo = stretto ? 21.5 : 24;
  const interlineaTitolo = dimensioneTitolo * 1.16;
  const righeTitolo = dividiInRighe(dati.titolo, 'F2', dimensioneTitolo, larghezzaUtile);
  righeTitolo.forEach((riga, indice) => {
    testo(sinistra, y + dimensioneTitolo * 0.8 + indice * interlineaTitolo, riga, {
      font: 'F2',
      dimensione: dimensioneTitolo,
      colore: INCHIOSTRO,
      spaziatura: -0.3,
    });
  });
  y += righeTitolo.length * interlineaTitolo - dimensioneTitolo * 0.2 + 6;

  const dimensioneSotto = stretto ? 9.2 : 9.8;
  const interlineaSotto = dimensioneSotto * 1.42;
  const righeSotto = dividiInRighe(dati.sottotitolo, 'F1', dimensioneSotto, larghezzaUtile);
  righeSotto.forEach((riga, indice) => {
    testo(sinistra, y + dimensioneSotto * 0.8 + indice * interlineaSotto, riga, {
      dimensione: dimensioneSotto,
      colore: TENUE,
    });
  });
  y += righeSotto.length * interlineaSotto + 8;

  const etichettaTipo = dati.tipoLievito;
  const larghezzaTipo = misura(etichettaTipo.toUpperCase(), 'F2', 6.7, 0.7) + 18;
  pastiglia(sinistra, y, larghezzaTipo, 16, etichettaTipo.toUpperCase(), {
    dimensione: 6.7,
  });
  if (dati.generatoIl) {
    testo(sinistra + larghezzaTipo + 10, y + 11, dati.generatoIl, {
      dimensione: 7.4,
      colore: TENUE,
    });
  }
  y += 16 + (stretto ? 14 : 17);

  /* ---------------------------------------------------------------- *
   * BLOCCHI: ogni pezzo conosce la sua altezza, così l'impaginazione
   * sa dove spezzare la scheda senza lasciare buchi in fondo pagina.
   * ---------------------------------------------------------------- */

  /** Righe di un paragrafo, una per blocco: si spezzano fra le facciate. */
  const paragrafo = (
    contenuto: string,
    opzioni: {
      x?: number;
      larghezza?: number;
      dimensione: number;
      colore?: Colore;
      interlinea?: number;
      font?: NomeFont;
    },
  ): Blocco[] => {
    const x = opzioni.x ?? interno;
    const larghezza = opzioni.larghezza ?? largoInterno;
    const dimensione = opzioni.dimensione;
    const interlinea = opzioni.interlinea ?? dimensione * 1.38;
    const righe = dividiInRighe(contenuto, opzioni.font ?? 'F1', dimensione, larghezza);

    // Il paragrafo è un blocco unico: va a capo fra una facciata e l'altra
    // solo intero, così non si legge una frase tagliata.
    return [
      {
        altezza: righe.length * interlinea,
        disegna: (top: number) => {
          righe.forEach((riga, indice) => {
            testo(x, top + dimensione * 0.8 + indice * interlinea, riga, {
              font: opzioni.font ?? 'F1',
              dimensione,
              colore: opzioni.colore ?? INCHIOSTRO,
            });
          });
        },
      },
    ];
  };

  /** Più blocchi che restano insieme: il titolo non si separa dal suo testo. */
  const uniti = (blocchi: Blocco[]): Blocco => ({
    altezza: blocchi.reduce((somma, blocco) => somma + blocco.altezza, 0),
    disegna: (top: number) => {
      let cursore = top;
      blocchi.forEach((blocco) => {
        blocco.disegna(cursore);
        cursore += blocco.altezza;
      });
    },
  });

  const spazio = (altezza: number): Blocco => ({ altezza, disegna: () => {} });

  /** Percentuale della dose, con la sua base: «75% sulla farina totale». */
  const percentualeDose = (dose: VoceDose): string | null => {
    if (typeof dose.percentuale !== 'number') return null;
    const decimili = dose.percentuale >= 10 ? 1 : 2;
    const valore = dose.percentuale.toLocaleString('it-IT', {
      maximumFractionDigits: decimili,
    });
    return `${valore}%${dose.base ? ` sulla ${dose.base}` : ''}`;
  };

  const grammi = (dose: VoceDose): string =>
    dose.tipo === 'lievito' ? grammiLievito(dose.grammi) : numero(dose.grammi);

  /** Una riga ingrediente: icona, nome, percentuale, grammi. */
  const bloccoDose = (dose: VoceDose, separatore: boolean): Blocco => {
    const colonnaGrammi = 62;
    const xNome = interno + (dose.tipo ? 16 : 0);
    const percentuale = percentualeDose(dose);
    const dimensioneNome = stretto ? 10 : 10.5;

    /*
     * Sul telefono la percentuale scende sotto il nome, come nelle schede del
     * sito: a 360 punti una colonna in mezzo al nome lo spezzerebbe.
     */
    if (stretto) {
      const righeNome = dividiInRighe(
        dose.nome,
        'F1',
        dimensioneNome,
        Math.max(60, largoInterno - colonnaGrammi - 10 - (dose.tipo ? 16 : 0)),
      );
      const righeSecondarie = (percentuale ? 1 : 0) + (dose.nota ? 1 : 0);
      const altezza = righeNome.length * 11 + righeSecondarie * 9.8 + 8;

      return {
        altezza,
        disegna: (top: number) => {
          if (dose.tipo) iconaPdf(dose.tipo, interno, top + 3.5, 10.5);
          righeNome.forEach((riga, indice) => {
            testo(xNome, top + 9.4 + indice * 11, riga, {
              dimensione: dimensioneNome,
              colore: INCHIOSTRO,
            });
          });
          testo(fineInterno, top + 9.8, `${grammi(dose)} g`, {
            font: 'F2',
            dimensione: 11,
            colore: INCHIOSTRO,
            allineamento: 'destra',
          });
          let base = top + 9.2 + righeNome.length * 10.6;
          if (percentuale) {
            testo(xNome, base, percentuale, { dimensione: 7.6, colore: TENUE });
            base += 9.6;
          }
          if (dose.nota) {
            testo(xNome, base, dose.nota, { dimensione: 7.6, colore: TENUE });
          }
          if (separatore) {
            linea(
              { x: interno, y: top + altezza - 4 },
              { x: fineInterno, y: top + altezza - 4 },
              BORDO,
              0.5,
            );
          }
        },
      };
    }

    const righeNome = dividiInRighe(
      dose.nome,
      'F1',
      dimensioneNome,
      Math.max(60, largoInterno - colonnaGrammi - 96 - (dose.tipo ? 16 : 0)),
    );
    const righePercentuale = percentuale
      ? dividiInRighe(percentuale, 'F1', 7.6, 97)
      : [];
    const righe = Math.max(righeNome.length, righePercentuale.length, 1);
    const altezza = righe * 11 + (dose.nota ? 9.8 : 0) + 8;

    return {
      altezza,
      disegna: (top: number) => {
        if (dose.tipo) iconaPdf(dose.tipo, interno, top + 3.5, 10.5);
        righeNome.forEach((riga, indice) => {
          testo(xNome, top + 9.4 + indice * 11, riga, {
            dimensione: dimensioneNome,
            colore: INCHIOSTRO,
          });
        });
        if (dose.nota) {
          testo(xNome, top + 9.4 + righeNome.length * 11, dose.nota, {
            dimensione: 7.6,
            colore: TENUE,
          });
        }
        righePercentuale.forEach((riga, indice) => {
          testo(fineInterno - colonnaGrammi - 8, top + 8.8 + indice * 8.6, riga, {
            dimensione: 7.4,
            colore: TENUE,
            allineamento: 'destra',
          });
        });
        testo(fineInterno, top + 9.8, `${grammi(dose)} g`, {
          font: 'F2',
          dimensione: 11,
          colore: INCHIOSTRO,
          allineamento: 'destra',
        });
        if (separatore) {
          linea(
            { x: interno, y: top + altezza - 4 },
            { x: fineInterno, y: top + altezza - 4 },
            BORDO,
            0.5,
          );
        }
      },
    };
  };

  /** Intestazione di fase: etichetta piccola in maiuscolo e filo. */
  const bloccoFase = (fase: FaseFoglio, prima: boolean): Blocco[] => {
    const out: Blocco[] = [];
    if (!prima) out.push(spazio(stretto ? 8 : 12));

    out.push({
      altezza: stretto ? 12 : 13,
      disegna: (top: number) => {
        const etichetta = fase.titolo.toUpperCase();
        const larghezza = testo(interno, top + 8.6, etichetta, {
          font: 'F2',
          dimensione: 7.8,
          colore: ACCENTO_SCURO,
          spaziatura: 0.8,
        });
        const partenza = interno + larghezza + 7;
        if (partenza < fineInterno - 8) {
          linea({ x: partenza, y: top + 5.6 }, { x: fineInterno, y: top + 5.6 }, BORDO, 0.5);
        }
      },
    });

    if (fase.nota) {
      out.push(...paragrafo(fase.nota, { dimensione: 8, colore: TENUE }));
      out.push(spazio(3));
    }

    if (fase.avviso) {
      const righe = dividiInRighe(fase.avviso, 'F2', 7.2, largoInterno - 14);
      const altezza = righe.length * 9 + 8;
      out.push({
        altezza: altezza + 7,
        disegna: (top: number) => {
          arrotondato(interno, top, largoInterno, altezza, 6, {
            riempimento: CARTA_CREMA,
            bordo: BORDO,
            spessore: 0.5,
          });
          righe.forEach((riga, indice) => {
            testo(interno + 7, top + 11.4 + indice * 9, riga, {
              font: 'F2',
              dimensione: 7.8,
              colore: ACCENTO_SCURO,
            });
          });
        },
      });
    }

    out.push(spazio(2));
    return out;
  };

  /** Totale della fase: non va sommato di nuovo all'impasto. */
  const bloccoTotaleFase = (totale: { nome: string; grammi: number }): Blocco => ({
    altezza: 19,
    disegna: (top: number) => {
      testo(interno, top + 10.4, totale.nome, { dimensione: 9.2, colore: TENUE });
      testo(fineInterno, top + 10.6, `${numero(totale.grammi)} g`, {
        font: 'F2',
        dimensione: 10.4,
        colore: ACCENTO_SCURO,
        allineamento: 'destra',
      });
    },
  });

  /** Riquadro della resa: il dato che si cerca per primo. */
  const bloccoResa = (): Blocco => {
    const righe = dividiInRighe(dati.totaleNota, 'F2', stretto ? 11.4 : 12.4, largoInterno - 24);
    const altezza = (stretto ? 9 : 11) + (stretto ? 6 : 7) + righe.length * 14 + (stretto ? 8 : 9);
    return {
      altezza: altezza + (stretto ? 6 : 8),
      disegna: (top: number) => {
        arrotondato(interno, top, largoInterno, altezza, 9, {
          riempimento: CARTA_CREMA,
          bordo: BORDO,
          spessore: 0.6,
        });
        testo(interno + 12, top + 14, 'RESA', {
          font: 'F2',
          dimensione: 6.9,
          colore: ACCENTO_SCURO,
          spaziatura: 0.8,
        });
        righe.forEach((riga, indice) => {
          testo(interno + 12, top + 30 + indice * 14, riga, {
            font: 'F2',
            dimensione: stretto ? 12.2 : 13.4,
            colore: INCHIOSTRO,
          });
        });
      },
    };
  };

  /** Fascia dell'impasto: l'ultimo numero della scheda, in grande. */
  const bloccoImpastoTotale = (): Blocco => {
    const altezza = stretto ? 32 : 35;
    return {
      altezza: altezza + (stretto ? 6 : 8),
      disegna: (top: number) => {
        arrotondato(interno, top, largoInterno, altezza, 9, {
          riempimento: CARTA_CREMA,
          bordo: BORDO,
          spessore: 0.6,
        });
        testo(interno + 12, top + 21.5, 'Peso impasto', {
          font: 'F2',
          dimensione: stretto ? 10 : 10.6,
          colore: INCHIOSTRO,
        });
        testo(fineInterno - 12, top + 24, `${numero(dati.totaleG)} g`, {
          font: 'F2',
          dimensione: stretto ? 15.5 : 17.5,
          colore: ACCENTO_SCURO,
          allineamento: 'destra',
        });
      },
    };
  };

  /** Riga del riepilogo tecnico: etichetta a sinistra, valore a destra. */
  const bloccoRiepilogo = (
    voce: { etichetta: string; valore: string; valorePdf?: string },
    separatore: boolean,
  ): Blocco => {
    const valore = voce.valorePdf ?? voce.valore;
    const larghezzaValore = largoInterno * 0.55;
    const righeEtichetta = dividiInRighe(
      voce.etichetta,
      'F1',
      8.5,
      largoInterno - larghezzaValore - 12,
    );
    const righeValore = dividiInRighe(valore, 'F2', 9.2, larghezzaValore);

    // Un valore lungo non si allinea a destra: va a capo sotto l'etichetta,
    // come le note del sito, invece di diventare un blocco giustificato a caso.
    if (righeValore.length > 1) {
      const righeTesto = dividiInRighe(valore, 'F1', 8.8, largoInterno);
      return {
        altezza: 12 + righeTesto.length * 11.4 + 6,
        disegna: (top: number) => {
          testo(interno, top + 9, voce.etichetta, { dimensione: 8.5, colore: TENUE });
          righeTesto.forEach((riga, indice) => {
            testo(interno, top + 21.5 + indice * 11.8, riga, {
              dimensione: 8.8,
              colore: INCHIOSTRO,
            });
          });
          if (separatore) {
            const fondo = top + 12 + righeTesto.length * 11.4 + 2;
            linea({ x: interno, y: fondo }, { x: fineInterno, y: fondo }, BORDO, 0.5);
          }
        },
      };
    }

    const righe = Math.max(righeEtichetta.length, righeValore.length, 1);
    const altezza = righe * 11 + 7;

    return {
      altezza,
      disegna: (top: number) => {
        righeEtichetta.forEach((riga, indice) => {
          testo(interno, top + 9 + indice * 11, riga, { dimensione: 8.5, colore: TENUE });
        });
        righeValore.forEach((riga, indice) => {
          testo(fineInterno, top + 9 + indice * 11, riga, {
            font: 'F2',
            dimensione: 9.2,
            colore: INCHIOSTRO,
            allineamento: 'destra',
          });
        });
        if (separatore) {
          linea(
            { x: interno, y: top + altezza - 4 },
            { x: fineInterno, y: top + altezza - 4 },
            BORDO,
            0.5,
          );
        }
      },
    };
  };

  /** Riga della tabella di marcia: ora a sinistra, azione a destra. */
  const bloccoMarcia = (passo: PassoFoglio, separatore: boolean): Blocco => {
    const larghezzaOra = 52;
    const xAzione = interno + larghezzaOra;
    const larghezzaAzione = largoInterno - larghezzaOra;
    const righeTitolo = dividiInRighe(passo.titolo, 'F2', 10, larghezzaAzione);
    const righeNota = [passo.istruzione, passo.nota].flatMap((testo) =>
      testo ? dividiInRighe(testo, 'F1', 8, larghezzaAzione) : [],
    );
    const altezza = Math.max(36, 10 + righeTitolo.length * 11.6 + righeNota.length * 9.8 + 6);

    return {
      altezza,
      disegna: (top: number) => {
        if (passo.orario) {
          testo(interno, top + 10, passo.orario.ora, {
            font: 'F2',
            dimensione: 10,
            colore: ACCENTO_SCURO,
          });
          testo(interno, top + 20, passo.orario.giorno, {
            dimensione: 7.6,
            colore: TENUE,
          });
        }
        righeTitolo.forEach((riga, indice) => {
          testo(xAzione, top + 10.4 + indice * 11.6, riga, {
            font: 'F2',
            dimensione: 10,
            colore: INCHIOSTRO,
          });
        });
        righeNota.forEach((riga, indice) => {
          testo(xAzione, top + 10.4 + righeTitolo.length * 11.6 + indice * 9.8, riga, {
            dimensione: 8,
            colore: TENUE,
          });
        });
        if (separatore) {
          linea(
            { x: interno, y: top + altezza - 4 },
            { x: fineInterno, y: top + altezza - 4 },
            BORDO,
            0.5,
          );
        }
      },
    };
  };

  /** Passo del procedimento: numero nel tondo, titolo, testi rientrati. */
  const blocchiPasso = (passo: PassoFoglio, indice: number, primo: boolean): Blocco[] => {
    const out: Blocco[] = [];
    if (!primo) out.push(spazio(stretto ? 10 : 13));

    const rientro = 20;
    const larghezza = largoInterno - rientro;
    const righeTitolo = dividiInRighe(passo.titolo, 'F2', stretto ? 10 : 10.5, larghezza);

    const intestazione: Blocco = {
      altezza: righeTitolo.length * 12.4 + 2,
      disegna: (top: number) => {
        cerchio(interno + 6.5, alto(top + 7), 6.5, { riempimento: VELO });
        testo(interno + 6.5, top + 9.4, String(indice + 1), {
          font: 'F2',
          dimensione: 7.2,
          colore: ACCENTO_SCURO,
          allineamento: 'centro',
        });
        righeTitolo.forEach((riga, posizione) => {
          testo(interno + rientro, top + 10.4 + posizione * 12.4, riga, {
            font: 'F2',
            dimensione: stretto ? 10 : 10.5,
            colore: INCHIOSTRO,
          });
        });
      },
    };

    const paragrafi = passo.paragrafi ?? [];
    const stileParagrafo = {
      x: interno + rientro,
      larghezza,
      dimensione: 8.9,
      colore: INCHIOSTRO_TENUE,
    };

    if (paragrafi.length > 0) {
      // Il numero e il titolo non restano mai soli in fondo alla facciata.
      out.push(uniti([intestazione, ...paragrafo(paragrafi[0], stileParagrafo), spazio(2)]));
      for (const testoParagrafo of paragrafi.slice(1)) {
        out.push(...paragrafo(testoParagrafo, stileParagrafo));
        out.push(spazio(2));
      }
    } else {
      out.push(intestazione);
      out.push(spazio(2));
    }

    for (const voce of passo.elenco ?? []) {
      const righe = dividiInRighe(voce, 'F1', 8.9, larghezza - 9);
      righe.forEach((riga, posizione) => {
        out.push({
          altezza: 10.8,
          disegna: (top: number) => {
            if (posizione === 0) {
              testo(interno + rientro, top + 7.4, '•', {
                dimensione: 8.9,
                colore: ACCENTO_SCURO,
              });
            }
            testo(interno + rientro + 9, top + 7.4, riga, {
              dimensione: 8.9,
              colore: INCHIOSTRO_TENUE,
            });
          },
        });
      });
      out.push(spazio(1));
    }

    for (const voce of passo.voci ?? []) {
      out.push(spazio(4));
      out.push({
        altezza: 13,
        disegna: (top: number) => {
          testo(interno + rientro + 9, top + 9, voce.titolo, {
            font: 'F2',
            dimensione: 8.9,
            colore: INCHIOSTRO,
          });
          testo(interno + rientro, top + 9, '•', {
            dimensione: 8.9,
            colore: ACCENTO_SCURO,
          });
        },
      });
      for (const testoVoce of voce.paragrafi) {
        out.push(
          ...paragrafo(testoVoce, {
            x: interno + rientro + 9,
            larghezza: larghezza - 9,
            dimensione: 8.1,
            colore: INCHIOSTRO_TENUE,
          }),
        );
      }
    }

    return out;
  };

  /** Voce dei consigli: pallino d'oro e testo. */
  const blocchiNota = (nota: string, prima: boolean): Blocco[] => {
    const out: Blocco[] = prima ? [] : [spazio(7)];
    const righe = dividiInRighe(nota, 'F1', 8.8, largoInterno - 10);
    out.push({
      altezza: righe.length * 11,
      disegna: (top: number) => {
        righe.forEach((riga, indice) => {
          const base = top + 7.6 + indice * 11;
          if (indice === 0) {
            testo(interno, base, '•', { dimensione: 8.8, colore: ACCENTO });
          }
          testo(interno + 10, base, riga, {
            dimensione: 8.8,
            colore: INCHIOSTRO_TENUE,
          });
        });
      },
    });
    return out;
  };

  /** Didascalia dei grafici: una riga di campioni di colore, sotto il disegno. */
  const bloccoLegenda = (
    voci: readonly { colore: Colore; testo: string }[],
  ): Blocco => {
    const righe: { voci: { colore: Colore; testo: string; larghezza: number }[] }[] = [];
    let corrente: { colore: Colore; testo: string; larghezza: number }[] = [];
    let occupato = 0;

    for (const voce of voci) {
      const larghezza = 9 + misura(voce.testo, 'F1', 6.6) + 13;
      if (corrente.length > 0 && occupato + larghezza > largoInterno) {
        righe.push({ voci: corrente });
        corrente = [];
        occupato = 0;
      }
      corrente.push({ ...voce, larghezza });
      occupato += larghezza;
    }
    if (corrente.length > 0) righe.push({ voci: corrente });

    return {
      altezza: 5 + righe.length * 11,
      disegna: (top: number) => {
        righe.forEach((riga, indice) => {
          let x = interno;
          for (const voce of riga.voci) {
            arrotondato(x, top + 4 + indice * 11, 4.6, 4.6, 1.4, {
              riempimento: voce.colore,
              bordo: BORDO,
              spessore: 0.3,
            });
            testo(x + 8, top + 8 + indice * 11, voce.testo, {
              dimensione: 7.1,
              colore: TENUE,
            });
            x += voce.larghezza;
          }
        });
      },
    };
  };

  /**
   * Grafico della schermata con la legenda **alla sua sinistra**: sul foglio
   * la legenda sta in colonna, non in una riga sotto il disegno, così il
   * grafico resta largo e le voci non si accavallano.
   */
  const bloccoGraficoConLegenda = (
    immagine: ImmaginePronta,
    voci: readonly { colore: Colore; testo: string }[],
  ): Blocco => {
    const colonna = 84;
    const distanza = 8;
    const larghezzaImmagine = largoInterno - colonna - distanza;
    const altezzaImmagine = (larghezzaImmagine * immagine.altezza) / immagine.larghezza;
    const dimensione = 6.5;
    const interlinea = 8.2;

    const vociConRighe = voci.map((voce) => ({
      ...voce,
      righe: dividiInRighe(voce.testo, 'F1', dimensione, colonna - 8),
    }));
    const altezzaLegenda = vociConRighe.reduce(
      (somma, voce) => somma + voce.righe.length * interlinea + 4,
      0,
    );
    const altezza = Math.max(altezzaImmagine, altezzaLegenda);

    return {
      altezza: altezza + 2,
      disegna: (top: number) => {
        let cursore = top + Math.max(0, (altezza - altezzaLegenda) / 2) + 1;
        for (const voce of vociConRighe) {
          arrotondato(interno, cursore, 4.6, 4.6, 1.4, {
            riempimento: voce.colore,
            bordo: BORDO,
            spessore: 0.3,
          });
          voce.righe.forEach((riga, indice) => {
            testo(interno + 8, cursore + 3.8 + indice * interlinea, riga, {
              dimensione,
              colore: INCHIOSTRO_TENUE,
            });
          });
          cursore += voce.righe.length * interlinea + 4;
        }

        const cima = top + (altezza - altezzaImmagine) / 2;
        aggiungi(
          `q ${larghezzaImmagine.toFixed(2)} 0 0 ${altezzaImmagine.toFixed(2)} ` +
            `${(interno + colonna + distanza).toFixed(2)} ${alto(cima + altezzaImmagine).toFixed(2)} cm ` +
            `/${immagine.nome} Do Q\n`,
        );
      },
    };
  };

  // Il disegno vettoriale della forza resta il ripiego quando manca il JPEG.
  const blocchiGraficoForza = (forza: NonNullable<DatiFoglio['forza']>): Blocco[] => {
    const altezza = 48;
    const valori = [forza.minima, forza.massima, forza.consigliata, forza.efficace ?? forza.consigliata];
    const minimo = Math.min(...valori) - 20;
    const massimo = Math.max(...valori) + 20;
    const ascissa = (valore: number): number =>
      interno + ((valore - minimo) / (massimo - minimo)) * largoInterno;

    return [
      {
        altezza: altezza + 16,
        disegna: (top: number) => {
          arrotondato(ascissa(forza.minima), top + 8, ascissa(forza.massima) - ascissa(forza.minima), 16, 5, {
            riempimento: PANNA,
          });
          linea({ x: interno, y: top + 26 }, { x: fineInterno, y: top + 26 }, BORDO, 0.6);
          linea({ x: ascissa(forza.consigliata), y: top + 4 }, { x: ascissa(forza.consigliata), y: top + 26 }, INCHIOSTRO, 0.9);
          if (forza.efficace !== null) {
            linea({ x: ascissa(forza.efficace), y: top + 19 }, { x: ascissa(forza.efficace), y: top + 33 }, ACCENTO, 2.2);
          }
          testo(interno, top + 42, `${forza.minima}`, { dimensione: 6.9, colore: TENUE });
          testo(fineInterno, top + 42, `${forza.massima}`, {
            dimensione: 6.9,
            colore: TENUE,
            allineamento: 'destra',
          });
        },
      },
    ];
  };

  // Attività del lievito e temperatura, disegnate a tracciati.
  const blocchiGraficoAttivita = (): Blocco[] => {
    const curva = dati.curva ?? [];
    const fasce = dati.fasce ?? [];
    const oreTotali = dati.oreTotali ?? curva[curva.length - 1]?.ora ?? 0;
    if (curva.length < 2) {
      return [
        {
          altezza: 20,
          disegna: (top: number) =>
            testo(interno, top + 10, 'Nessuna curva da disegnare.', {
              dimensione: 8,
              colore: TENUE,
            }),
        },
      ];
    }

    const altezza = 70;
    const massimo = Math.max(1, ...curva.map((punto) => punto.attivita));
    const ascissa = (ora: number): number =>
      interno + (Math.max(0, Math.min(ora, oreTotali)) / (oreTotali || 1)) * largoInterno;

    return [
      {
        altezza: altezza + 16,
        disegna: (top: number) => {
          const tetto = top + 6;
          const base = top + altezza;

          for (const fascia of fasce.filter((voce) => voce.inFrigo)) {
            rettangolo(
              ascissa(fascia.da),
              tetto,
              Math.max(1, ascissa(fascia.a) - ascissa(fascia.da)),
              base - tetto,
              { riempimento: FRIGO },
            );
          }

          let area = `${ascissa(curva[0].ora).toFixed(2)} ${alto(base).toFixed(2)} m `;
          for (const punto of curva) {
            const valore = base - (punto.attivita / massimo) * (base - tetto);
            area += `${ascissa(punto.ora).toFixed(2)} ${alto(valore).toFixed(2)} l `;
          }
          area += `${ascissa(curva[curva.length - 1].ora).toFixed(2)} ${alto(base).toFixed(2)} l f\n`;
          aggiungi(`${PANNA.join(' ')} rg ${area}`);

          let spezzata = '';
          curva.forEach((punto, indice) => {
            const valore = base - (punto.attivita / massimo) * (base - tetto);
            spezzata += `${ascissa(punto.ora).toFixed(2)} ${alto(valore).toFixed(2)} ${
              indice === 0 ? 'm' : 'l'
            } `;
          });
          aggiungi(`${ACCENTO_SCURO.join(' ')} RG 1.4 w ${spezzata}S\n`);

          linea({ x: interno, y: base }, { x: fineInterno, y: base }, BORDO, 0.6);

          // La fascia del frigorifero si etichetta sopra la curva.
          const frigo = fasce.find((fascia) => fascia.inFrigo);
          if (frigo) {
            const centro = (ascissa(frigo.da) + ascissa(frigo.a)) / 2;
            testo(centro, tetto + 8, 'frigorifero', {
              dimensione: 6.9,
              colore: TENUE,
              allineamento: 'centro',
            });
          }

          testo(interno, base + 11, '0 h', { dimensione: 7.2, colore: TENUE });
          testo(fineInterno, base + 11, `${numero(oreTotali)} h`, {
            dimensione: 7.2,
            colore: TENUE,
            allineamento: 'destra',
          });
        },
      },
    ];
  };

  /* ---------------------------------------------------------------- *
   * IMPAGINAZIONE: le schede si misurano prima di essere disegnate,
   * così una scheda non si apre in fondo alla pagina per sbordare.
   * ---------------------------------------------------------------- */

  const disegnaScheda = (top: number, altezza: number): void => {
    arrotondato(sinistra, top + 1.8, larghezzaUtile, altezza, RAGGIO, {
      riempimento: OMBRA,
    });
    arrotondato(sinistra, top, larghezzaUtile, altezza, RAGGIO, {
      riempimento: CARTA,
      bordo: BORDO,
      spessore: 0.8,
    });
  };

  const impagina = (
    titolo: string | undefined,
    blocchi: Blocco[],
    notaTitolo?: string,
  ): void => {
    const contenuto = blocchi.filter((blocco) => blocco.altezza > 0);
    if (contenuto.length === 0) return;

    const altezzaTitolo = titolo ? TITOLO_SCHEDA : 2;
    const somma = contenuto.reduce((totale, blocco) => totale + blocco.altezza, 0);
    const totale = PAD_VERT * 2 + altezzaTitolo + somma;

    const disegna = (
      top: number,
      altezza: number,
      pezziScheda: Blocco[],
      continua = false,
    ): void => {
      disegnaScheda(top, altezza);
      if (titolo && !continua) {
        testo(interno, top + PAD_VERT + 11, frase(titolo), {
          font: 'F2',
          dimensione: stretto ? 12.2 : 13.2,
          colore: INCHIOSTRO,
          spaziatura: -0.15,
        });
        if (notaTitolo) {
          testo(fineInterno, top + PAD_VERT + 10.4, notaTitolo, {
            dimensione: 7.2,
            colore: TENUE,
            allineamento: 'destra',
          });
        }
      }
      let cursore = top + PAD_VERT + (continua ? 0 : altezzaTitolo);
      pezziScheda.forEach((blocco) => {
        blocco.disegna(cursore);
        cursore += blocco.altezza;
      });
    };

    const disponibile = FONDO - y;
    if (totale <= disponibile) {
      disegna(y, totale, contenuto);
      y += totale + DISTANZA;
      return;
    }

    const altezzaPagina = FONDO - PAGINA.margine;
    // Una scheda lunga si allunga sullo spazio che resta, invece di lasciarlo
    // vuoto e ricominciare in una facciata nuova; una scheda corta si sposta
    // intera, perché spezzare una tabella di cinque righe non aiuta nessuno.
    const lunga = totale > altezzaPagina * 0.5 || (contenuto.length >= 8 && disponibile > 160);
    if (!lunga) {
      nuovaPagina();
      disegna(y, totale, contenuto);
      y += totale + DISTANZA;
      return;
    }
    // Scheda più alta di una facciata: si spezza in più riquadri. Il titolo
    // resta solo sul primo: le facciate seguenti continuano la scheda senza
    // ripetere il nome della sezione.
    let indice = 0;
    let primaParte = true;
    while (indice < contenuto.length) {
      const testata = primaParte ? altezzaTitolo : 0;
      // Quattro punti di guardia: l'ultima riga non deve toccare il bordo.
      const spazioUtile = FONDO - y - PAD_VERT * 2 - testata - 4;
      if (spazioUtile < 60) {
        nuovaPagina();
        continue;
      }

      let sommaPezzo = 0;
      let fine = indice;
      while (
        fine < contenuto.length &&
        sommaPezzo + contenuto[fine].altezza <= spazioUtile
      ) {
        sommaPezzo += contenuto[fine].altezza;
        fine += 1;
      }
      if (fine === indice) {
        sommaPezzo = contenuto[indice].altezza;
        fine = indice + 1;
      }

      const altezzaPezzo = PAD_VERT * 2 + testata + sommaPezzo;
      disegna(y, altezzaPezzo, contenuto.slice(indice, fine), !primaParte);
      y += altezzaPezzo + DISTANZA;
      indice = fine;
      primaParte = false;
      if (indice < contenuto.length) nuovaPagina();
    }
  };

  /* ------------------------------ SCHEDE ------------------------------ */

  if (!dati.soloProgramma) {
    const blocchi: Blocco[] = [bloccoResa()];
    const fasi = dati.fasi ?? [];

    if (fasi.length > 0) {
      fasi.forEach((fase, indiceFase) => {
        blocchi.push(...bloccoFase(fase, indiceFase === 0));
        fase.voci.forEach((dose, indiceDose) => {
          blocchi.push(bloccoDose(dose, indiceDose < fase.voci.length - 1));
        });
        if (fase.totale) blocchi.push(bloccoTotaleFase(fase.totale));
      });
    } else {
      const dosi = dati.dosi ?? [];
      blocchi.push(spazio(6));
      dosi.forEach((dose, indice) => {
        blocchi.push(bloccoDose(dose, indice < dosi.length - 1));
      });
    }

    blocchi.push(spazio(4));
    blocchi.push(bloccoImpastoTotale());

    impagina('Dosi e resa', blocchi);
  }

  for (const gruppo of dati.riepilogo ?? []) {
    const blocchi = gruppo.voci.flatMap((voce, indice) => [
      bloccoRiepilogo(voce, indice < gruppo.voci.length - 1),
    ]);
    impagina(gruppo.titolo, blocchi);
  }

  // La marcia della biga viene prima: è il calendario che precede il lavoro.
  if (dati.marcia?.length) {
    const marcia = dati.marcia;
    impagina(
      'Tabella di marcia della biga',
      marcia.flatMap((passo, indice) => [bloccoMarcia(passo, indice < marcia.length - 1)]),
    );
  }

  const tabellaDiMarcia = dati.passi.some((passo) => passo.orario);
  if (dati.passi.length > 0) {
    const titolo = tabellaDiMarcia ? 'Tabella di marcia' : 'Procedimento';
    impagina(
      titolo,
      tabellaDiMarcia
        ? dati.passi.flatMap((passo, indice) => [
            bloccoMarcia(passo, indice < dati.passi.length - 1),
          ])
        : dati.passi.flatMap((passo, indice) => blocchiPasso(passo, indice, indice === 0)),
    );
  }

  /* Grafici: la zona di forza e l'attività del lievito, con la legenda. */
  const forza = dati.forza;
  const forzaImmagine = immagini.find((immagine) => immagine.chiave === 'forza');
  const attivitaImmagine = immagini.find((immagine) => immagine.chiave === 'attivita');
  const grafici: Blocco[] = [];

  if (forzaImmagine) {
    grafici.push(...paragrafo(TITOLI_GRAFICI.forza, {
      dimensione: 7.4,
      colore: ACCENTO_SCURO,
      font: 'F2',
    }));
    grafici.push(
      bloccoGraficoConLegenda(forzaImmagine, [
        { colore: PANNA, testo: 'zona consigliata per queste ore' },
        { colore: PANNA_CHIARA, testo: 'fascia tollerata' },
        {
          colore: INCHIOSTRO,
          testo: forza ? `serve W ${forza.consigliata}` : 'forza non dichiarata',
        },
        {
          colore: ACCENTO,
          testo:
            forza?.efficace == null
              ? 'il tuo mix, W non dichiarato'
              : `il tuo mix, W ${Math.round(forza.efficace)}`,
        },
      ]),
    );
  } else if (forza) {
    grafici.push(...paragrafo(TITOLI_GRAFICI.forza, {
      dimensione: 7.4,
      colore: ACCENTO_SCURO,
      font: 'F2',
    }));
    grafici.push(...blocchiGraficoForza(forza));
    grafici.push(
      bloccoLegenda([
        { colore: PANNA, testo: 'fascia tollerata' },
        { colore: INCHIOSTRO, testo: `serve W ${forza.consigliata}` },
        {
          colore: ACCENTO,
          testo:
            forza.efficace == null
              ? 'il tuo mix, W non dichiarato'
              : `il tuo mix, W ${Math.round(forza.efficace)}`,
        },
      ]),
    );
  }

  if (attivitaImmagine) {
    grafici.push(spazio(forza || forzaImmagine ? 6 : 0));
    grafici.push(...paragrafo(TITOLI_GRAFICI.attivita, {
      dimensione: 7.4,
      colore: ACCENTO_SCURO,
      font: 'F2',
    }));
    grafici.push(
      bloccoGraficoConLegenda(attivitaImmagine, [
        { colore: PANNA, testo: 'attività del lievito' },
        { colore: INCHIOSTRO, testo: 'temperatura impasto, tratteggiata' },
        { colore: FRIGO, testo: 'ore in frigorifero' },
      ]),
    );
  } else if (dati.curva !== undefined) {
    grafici.push(spazio(forza || forzaImmagine ? 6 : 0));
    grafici.push(...paragrafo(TITOLI_GRAFICI.attivita, {
      dimensione: 7.4,
      colore: ACCENTO_SCURO,
      font: 'F2',
    }));
    grafici.push(...blocchiGraficoAttivita());
    grafici.push(
      bloccoLegenda([
        { colore: PANNA, testo: 'attività del lievito' },
        { colore: INCHIOSTRO, testo: 'temperatura impasto, tratteggiata' },
        { colore: FRIGO, testo: 'ore in frigorifero' },
      ]),
    );
  }

  if (grafici.length > 0) impagina('Grafici', grafici);

  if (dati.note.length > 0) {
    impagina(
      dati.noteTitolo ?? 'Nota',
      dati.note.flatMap((nota, indice) => blocchiNota(nota, indice === 0)),
    );
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
    const base = FONDO + 8;
    linea({ x: sinistra, y: base }, { x: destra, y: base }, BORDO, 0.5);

    if (flussi.length === 1) {
      testo(PAGINA.larghezza / 2, base + 11, firma, {
        dimensione: 6.9,
        colore: TENUE,
        allineamento: 'centro',
      });
    } else {
      testo(sinistra, base + 11, firma, { dimensione: 6.6, colore: TENUE });
      testo(destra, base + 11, `Pagina ${indice + 1} di ${flussi.length}`, {
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

  const risorseImmagini =
    immagini.length > 0
      ? `/XObject << ${immagini
          .map((immagine, indice) => `/${immagine.nome} ${9 + indice} 0 R`)
          .join(' ')} >> `
      : '';
  const risorseFont = '/Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> ';

  oggetto(1, '<< /Type /Catalog /Pages 2 0 R >>');
  oggetto(
    2,
    `<< /Type /Pages /Kids [${[3, ...extra]
      .map((numeroPagina) => `${numeroPagina} 0 R`)
      .join(' ')}] /Count ${flussi.length} >>`,
  );
  oggetto(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.larghezza} ${PAGINA.altezza}] ` +
      `/Resources << ${risorseFont}${risorseImmagini}>> ` +
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

  // Facciate successive: solo testo, con i font già dichiarati.
  extra.forEach((numeroPagina, indice) => {
    oggetto(
      numeroPagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.larghezza} ${PAGINA.altezza}] ` +
        `/Resources << ${risorseFont}${risorseImmagini}>> ` +
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
