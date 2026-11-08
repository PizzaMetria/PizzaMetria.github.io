import { FIRMA_FOGLIO, TITOLI_GRAFICI } from './foglio';
import type { DatiFoglio, VoceDose } from './foglio';

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
};

function colore(esadecimale: string): Colore {
  const valore = Number.parseInt(esadecimale.replace('#', ''), 16);
  return [
    Number((((valore >> 16) & 255) / 255).toFixed(3)),
    Number((((valore >> 8) & 255) / 255).toFixed(3)),
    Number(((valore & 255) / 255).toFixed(3)),
  ];
}

const TESTO = colore('#23262a');
const TENUE = colore('#6b6257');
const ORO = colore('#b89428');
const ORO_SCURO = colore('#7a5c10');
const BORDO = colore('#d8d0c2');
const SUPERFICIE = colore('#fffdf8');
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

  const linea = (da: Punto, a: Punto, inchiostro: Colore = BORDO, spessore = 0.7): void => {
    aggiungi(
      `${inchiostro.join(' ')} RG ${spessore} w ` +
        `${da.x.toFixed(2)} ${alto(da.y).toFixed(2)} m ` +
        `${a.x.toFixed(2)} ${alto(a.y).toFixed(2)} l S\n`,
    );
  };

  const sinistra = PAGINA.margine;
  const destra = PAGINA.larghezza - PAGINA.margine;
  let y = PAGINA.margine;

  /** Apre una facciata nuova, con l'intestazione di continuazione. */
  const nuovaPagina = (): void => {
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
  };

  /** Salta alla facciata seguente quando il blocco non ci sta. */
  const assicuraSpazio = (altezza: number): void => {
    if (y + altezza > FONDO_PAGINA) nuovaPagina();
  };

  // Intestazione
  testo(sinistra, y + 7, 'PizzaMetria', { font: 'F2', dimensione: 7.6, colore: ORO });
  testo(destra, y + 7, dati.occhiello ?? 'CALCOLATORE LIBERO', {
    font: 'F2',
    dimensione: 7.6,
    colore: TENUE,
    allineamento: 'destra',
  });
  // Filo d'oro sotto il marchio, come nel foglio JPG.
  rettangolo(sinistra, y + 10, 18, 1.6, { riempimento: ORO });
  y += 24;

  const larghezzaTitolo = testo(sinistra, y + 16, dati.titolo, {
    font: 'F4',
    dimensione: 21,
  });

  // Pillola del lievito accanto al titolo: è la firma del foglio JPG.
  const etichettaTipo = dati.tipoLievito.replace(/^Lievito\s+/i, '').toUpperCase();
  const larghezzaBadge = misura(etichettaTipo, 'F2', 6.6) + 10;
  if (larghezzaTitolo + 12 + larghezzaBadge <= LARGHEZZA_UTILE) {
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
  y += 22;

  const righeSottotitolo = dividiInRighe(dati.sottotitolo, 'F1', 9.4, LARGHEZZA_UTILE);
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

  // Tre riquadri di apertura
  const spazioBox = 8;
  const larghezzaBox = (LARGHEZZA_UTILE - spazioBox * 2) / 3;
  const riquadri = [
    {
      etichetta: (dati.etichettaLievito ?? dati.tipoLievito).toUpperCase(),
      valore: numero(dati.lievitoG),
      nota: dati.lievitoNota,
    },
    {
      etichetta: 'FARINA',
      valore: numero(dati.farinaG ?? dati.dosi?.[0]?.grammi ?? 0),
      nota: dati.totaleNota,
    },
    { etichetta: 'IMPASTO TOTALE', valore: numero(dati.totaleG), nota: 'tutte le dosi insieme' },
  ];

  riquadri.forEach((riquadro, indice) => {
    const x = sinistra + indice * (larghezzaBox + spazioBox);
    rettangolo(x, y, larghezzaBox, 64, { riempimento: SUPERFICIE, bordo: BORDO });

    testo(x + 9, y + 12, riquadro.etichetta, { font: 'F2', dimensione: 6.6, colore: TENUE });

    const larghezzaValore = testo(x + 9, y + 33, riquadro.valore, {
      font: 'F4',
      dimensione: 19,
      colore: ORO_SCURO,
    });
    testo(x + 12 + larghezzaValore, y + 33, 'g', { dimensione: 9, colore: TENUE });

    const righeNota = dividiInRighe(riquadro.nota, 'F1', 6.4, larghezzaBox - 18).slice(0, 2);
    righeNota.forEach((riga, posizione) => {
      testo(x + 9, y + 45 + posizione * 8, riga, { dimensione: 6.4, colore: TENUE });
    });
  });
  y += 64 + 16;

  /** «% 62,3 sulla farina totale», come nella tabella del foglio JPG. */
  const percentualeDose = (dose: VoceDose): string | null =>
    typeof dose.percentuale === 'number'
      ? `% ${numero(dose.percentuale)}${dose.base ? ` sulla ${dose.base}` : ''}`
      : null;

  /** Una riga ingrediente: nome, percentuale e grammi, con paginazione. */
  const rigaDose = (dose: VoceDose, separatore: boolean): void => {
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
    const altezza = righe * 11 + 5;

    assicuraSpazio(altezza + 4);

    const base = y + 9;
    righeNome.forEach((riga, indice) => {
      testo(sinistra, base + indice * 11, riga, { dimensione: 10 });
    });
    righePercentuale.forEach((riga, indice) => {
      testo(xPercentuale, base + indice * 8, riga, {
        dimensione: 7.4,
        colore: TENUE,
        allineamento: 'destra',
      });
    });
    testo(destra, base, `${numero(dose.grammi)} g`, {
      font: 'F4',
      dimensione: 10.4,
      allineamento: 'destra',
    });

    y += altezza;
    if (separatore) linea({ x: sinistra, y: y - 3 }, { x: destra, y: y - 3 });
  };

  // Riepilogo tecnico delle ricette: etichetta a sinistra, valore a destra.
  for (const gruppo of dati.riepilogo ?? []) {
    assicuraSpazio(34);
    testo(sinistra, y + 8, gruppo.titolo.toUpperCase(), {
      font: 'F4',
      dimensione: 8.6,
      colore: ORO_SCURO,
    });
    y += 12;
    linea({ x: sinistra, y }, { x: destra, y });
    y += 8;

    gruppo.voci.forEach((voce, indice) => {
      const larghezzaValore = LARGHEZZA_UTILE * 0.52;
      const larghezzaEtichetta = LARGHEZZA_UTILE - larghezzaValore - 10;
      const righeEtichetta = dividiInRighe(voce.etichetta, 'F1', 8, larghezzaEtichetta);
      const righeValore = dividiInRighe(voce.valore, 'F3', 9.2, larghezzaValore);
      const righe = Math.max(righeEtichetta.length, righeValore.length, 1);
      const altezza = righe * 10 + 7;

      assicuraSpazio(altezza + 4);

      const base = y + 9;
      righeEtichetta.forEach((riga, posizione) => {
        testo(sinistra, base + posizione * 10, riga, { dimensione: 8, colore: TENUE });
      });
      righeValore.forEach((riga, posizione) => {
        testo(destra, base + posizione * 10, riga, {
          font: 'F3',
          dimensione: 9.2,
          allineamento: 'destra',
        });
      });

      y += altezza;
      if (indice < gruppo.voci.length - 1) {
        linea({ x: sinistra, y: y - 3 }, { x: destra, y: y - 3 });
      }
    });

    y += 12;
  }

  // Dosi: le fasi delle ricette oppure l'elenco piatto del calcolatore libero.
  const fasi = dati.fasi ?? [];
  if (fasi.length > 0) {
    for (const fase of fasi) {
      assicuraSpazio(34);
      testo(sinistra, y + 8, fase.titolo.toUpperCase(), {
        font: 'F4',
        dimensione: 10.4,
        colore: ORO_SCURO,
      });
      y += 15;

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
        y += altezza + 8;
      }

      fase.voci.forEach((dose, indice) => {
        rigaDose(dose, indice < fase.voci.length - 1);
      });

      linea({ x: sinistra, y }, { x: destra, y });
      y += 14;

      if (fase.totale) {
        assicuraSpazio(20);
        testo(sinistra, y + 8, fase.totale.nome, { dimensione: 9.6, colore: TENUE });
        testo(destra, y + 8, `${numero(fase.totale.grammi)} g`, {
          font: 'F4',
          dimensione: 10.4,
          colore: ORO_SCURO,
          allineamento: 'destra',
        });
        y += 18;
      }

      y += 12;
    }
  } else {
    testo(sinistra, y + 6, 'DOSI', { font: 'F4', dimensione: 10.4, colore: ORO_SCURO });
    y += 15;

    const dosi = dati.dosi ?? [];
    dosi.forEach((dose, indice) => rigaDose(dose, indice < dosi.length - 1));
  }

  assicuraSpazio(30);
  linea({ x: sinistra, y }, { x: destra, y });
  y += 15;
  testo(sinistra, y, 'Impasto totale', { font: 'F2', dimensione: 10.5 });
  testo(destra, y, `${numero(dati.totaleG)} g`, {
    font: 'F4',
    dimensione: 14,
    colore: ORO_SCURO,
    allineamento: 'destra',
  });
  y += 20;

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

    const righeForza = dividiInRighe(forza.testo, 'F1', 8.4, LARGHEZZA_UTILE - 20);
    const altezzaForza = 44 + righeForza.length * 10;

    rettangolo(sinistra, y, LARGHEZZA_UTILE, altezzaForza, {
      riempimento: SUPERFICIE,
      bordo: BORDO,
    });
    testo(
      sinistra + 10,
      y + 13,
      `Serve W ${forza.consigliata} · fascia tollerata ${forza.finestra}`,
      { font: 'F2', dimensione: 7.4, colore: TENUE },
    );
    testo(
      sinistra + 10,
      y + 32,
      forza.efficace === null
        ? 'W non dichiarato'
        : `Il mix è a W ${Math.round(forza.efficace)}`,
      { font: 'F4', dimensione: 14, colore: ORO_SCURO },
    );
    righeForza.forEach((riga, indice) => {
      testo(sinistra + 10, y + 44 + indice * 10, riga, { dimensione: 8.4, colore: TENUE });
    });

    y += altezzaForza + 14;
  }

  /*
   * GRAFICI
   * -------
   * I due grafici della schermata, uno sotto l'altro, con la legenda a lato:
   * ogni voce porta il suo campione di colore, così sulla carta si capisce
   * cosa si sta guardando.
   */
  const altezzaTabellaStima =
    16 +
    dati.passi.reduce((somma, passo) => {
      const righe = dividiInRighe(
        `${passo.quando} · ${passo.nota}`,
        'F1',
        7.8,
        LARGHEZZA_UTILE - 12,
      );
      return somma + 12 + righe.length * 9 + 6;
    }, 0);
  const altezzaNoteStima =
    16 +
    dati.note.reduce(
      (somma, nota) => somma + dividiInRighe(nota, 'F1', 7.4, LARGHEZZA_UTILE).length * 8.6,
      0,
    );

  const larghezzaLegenda = 148;
  const larghezzaImmagine = LARGHEZZA_UTILE - larghezzaLegenda - 10;
  const altezzaImmagine = larghezzaImmagine * 0.3;
  const altezzaBlocco = immagini.length * (7 + altezzaImmagine + 10);
  const conImmagini =
    immagini.length > 0 &&
    y + 14 + altezzaBlocco + 14 + altezzaTabellaStima + altezzaNoteStima + 10 <= FONDO_PAGINA;

  if (conImmagini) {
    testo(sinistra, y + 6, 'GRAFICI', { font: 'F4', dimensione: 10.4, colore: ORO_SCURO });
    y += 14;

    const legenda: Record<'forza' | 'attivita', readonly { colore: Colore; testo: string }[]> = {
      forza: [
        { colore: PANNA as Colore, testo: 'zona consigliata per queste ore' },
        {
          colore: TESTO as Colore,
          testo: forza ? `serve W ${forza.consigliata}` : 'forza non dichiarata',
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

    immagini.forEach((immagine) => {
      testo(sinistra, y + 5, TITOLI_GRAFICI[immagine.chiave], {
        font: 'F2',
        dimensione: 6.6,
        colore: ORO_SCURO,
      });
      const cima = y + 9;
      aggiungi(
        `q ${larghezzaImmagine.toFixed(2)} 0 0 ${altezzaImmagine.toFixed(2)} ` +
          `${sinistra.toFixed(2)} ${alto(cima + altezzaImmagine).toFixed(2)} cm /${immagine.nome} Do Q\n`,
      );

      // Legenda a lato dell’immagine: campione di colore più parola.
      const xLegenda = sinistra + larghezzaImmagine + 10;
      legenda[immagine.chiave].forEach((voce, indice) => {
        const yVoce = cima + 4 + indice * 8.6;
        rettangolo(xLegenda, yVoce, 4.2, 4.2, { riempimento: voce.colore });
        testo(xLegenda + 8, yVoce + 3.8, voce.testo, { dimensione: 6.2, colore: TENUE });
      });

      y = cima + altezzaImmagine + 10;
    });
    y += 4;
  }

  // Le ricette non hanno curva né grafici: la sezione non compare affatto.
  if (!conImmagini && dati.curva !== undefined) {
  // Grafico dell'attività
  testo(sinistra, y + 6, 'ATTIVITÀ DEL LIEVITO', { font: 'F4', dimensione: 10.4, colore: ORO_SCURO });
  y += 16;

  const curva = dati.curva ?? [];
  const fasce = dati.fasce ?? [];
  const oreTotali = dati.oreTotali ?? curva[curva.length - 1]?.ora ?? 0;

  // Le sezioni finali si misurano prima, per lasciare al grafico lo spazio che resta.
  const altezzaTabella =
    16 +
    dati.passi.reduce((somma, passo) => {
      const righe = dividiInRighe(
        `${passo.quando} · ${passo.nota}`,
        'F1',
        7.8,
        LARGHEZZA_UTILE - 12,
      );
      return somma + 12 + righe.length * 9 + 6;
    }, 0);
  const altezzaNote =
    16 +
    dati.note.reduce(
      (somma, nota) => somma + dividiInRighe(nota, 'F1', 7.4, LARGHEZZA_UTILE).length * 8.6,
      0,
    );

  const spazioGrafico = FONDO_PAGINA - y - altezzaTabella - altezzaNote - 12;
  const altezzaGrafico = Math.max(46, Math.min(78, spazioGrafico));

  if (curva.length > 1) {
    const base = y + altezzaGrafico;
    const tetto = y + 8;
    const massimo = Math.max(1, ...curva.map((punto) => punto.attivita));
    const ascissa = (ora: number): number =>
      sinistra + (Math.max(0, Math.min(ora, oreTotali)) / (oreTotali || 1)) * LARGHEZZA_UTILE;
    const ordinata = (attivita: number): number =>
      base - (attivita / massimo) * (base - tetto);

    // Fascia del frigorifero, sotto la curva.
    fasce
      .filter((fascia) => fascia.inFrigo)
      .forEach((fascia) => {
        rettangolo(
          ascissa(fascia.da),
          tetto,
          Math.max(1, ascissa(fascia.a) - ascissa(fascia.da)),
          base - tetto,
          { riempimento: FRIGO },
        );
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
    aggiungi(`${ORO.join(' ')} RG 1.3 w ${spezzata}S\n`);

    linea({ x: sinistra, y: base }, { x: destra, y: base }, BORDO, 0.7);

    testo(sinistra, base + 10, '0 h', { dimensione: 7, colore: TENUE });
    testo(destra, base + 10, `${numero(oreTotali)} h`, {
      dimensione: 7,
      colore: TENUE,
      allineamento: 'destra',
    });

    if (fasce.some((fascia) => fascia.inFrigo)) {
      rettangolo(sinistra + LARGHEZZA_UTILE / 2 - 26, base + 4, 7, 5, {
        riempimento: FRIGO,
        bordo: BORDO,
      });
      testo(sinistra + LARGHEZZA_UTILE / 2 - 15, base + 9, 'frigorifero', {
        dimensione: 7,
        colore: TENUE,
      });
    }

    testo(sinistra, y + 5, 'quanto matura in un’ora', { dimensione: 6.6, colore: TENUE });
  } else {
    testo(sinistra, y + 10, 'Nessuna curva da disegnare.', { dimensione: 8, colore: TENUE });
  }
  y += altezzaGrafico + 16;
  }

  // Tabella di marcia: nel calcolatore libero sono gli orari, nelle ricette i
  // passi del procedimento, con i loro paragrafi e i loro elenchi.
  if (dati.passi.length > 0) {
    assicuraSpazio(34);
    testo(sinistra, y + 6, 'TABELLA DI MARCIA', {
      font: 'F4',
      dimensione: 10.4,
      colore: ORO_SCURO,
    });
    y += 18;

    dati.passi.forEach((passo) => {
      const riepilogo = [passo.quando, passo.nota].filter(Boolean).join(' · ');
      const righeTitolo = dividiInRighe(passo.titolo, 'F2', 9.2, LARGHEZZA_UTILE - 12);

      assicuraSpazio(righeTitolo.length * 11 + 14);

      rettangolo(sinistra, y + 3, 3.4, 3.4, { riempimento: ORO });
      righeTitolo.forEach((riga, indice) => {
        testo(sinistra + 10, y + 7 + indice * 11, riga, { font: 'F2', dimensione: 9.2 });
      });
      y += righeTitolo.length * 11 + 4;

      if (riepilogo) {
        dividiInRighe(riepilogo, 'F1', 7.8, LARGHEZZA_UTILE - 12).forEach((riga) => {
          assicuraSpazio(11);
          testo(sinistra + 10, y + 7, riga, { dimensione: 7.8, colore: TENUE });
          y += 9;
        });
        y += 2;
      }

      for (const paragrafo of passo.paragrafi ?? []) {
        dividiInRighe(paragrafo, 'F1', 8, LARGHEZZA_UTILE - 12).forEach((riga) => {
          assicuraSpazio(11);
          testo(sinistra + 10, y + 7, riga, { dimensione: 8 });
          y += 9.6;
        });
        y += 2;
      }

      for (const voce of passo.elenco ?? []) {
        dividiInRighe(voce, 'F1', 8, LARGHEZZA_UTILE - 22).forEach((riga, indice) => {
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
        assicuraSpazio(righeVoce.length * 10 + 12);
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
          dividiInRighe(paragrafo, 'F1', 8, LARGHEZZA_UTILE - 22).forEach((riga) => {
            assicuraSpazio(11);
            testo(sinistra + 20, y + 7, riga, { dimensione: 8, colore: TENUE });
            y += 9.6;
          });
        }
      }

      y += 8;
    });
  }

  // Note: come è stato calcolato il foglio libero, i consigli nelle ricette.
  if (dati.note.length > 0) {
    assicuraSpazio(34);
    testo(sinistra, y + 6, dati.noteTitolo ?? 'COME È STATO CALCOLATO', {
      font: 'F4',
      dimensione: 10.4,
      colore: ORO_SCURO,
    });
    y += 15;

    dati.note.forEach((nota) => {
      dividiInRighe(nota, 'F1', 7.4, LARGHEZZA_UTILE).forEach((riga) => {
        assicuraSpazio(10);
        testo(sinistra, y + 6, riga, { dimensione: 7.4, colore: TENUE });
        y += 8.6;
      });
    });
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
  oggetto(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGINA.larghezza} ${PAGINA.altezza}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> ' +
      (immagini.length > 0
        ? `/XObject << ${immagini
            .map((immagine, indice) => `/${immagine.nome} ${9 + indice} 0 R`)
            .join(' ')} >> `
        : '') +
      '>> ' +
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
        '/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >> ' +
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
