import { describe, expect, it } from 'vitest';
import { creaPdf, dividiInRighe, misura } from './pdf';
import { nomeFoglio } from './nomeFile';
import type { DatiFoglio } from './foglio';
import { datiFoglioRicetta } from '../vecchio/export/foglio-ricetta';
import { RICETTA_TEGLIA_BIGA } from '../vecchio/config/ricette';
import { calcolaPerPanetti } from '../vecchio/lib/calcolo';

function dati(): DatiFoglio {
  return {
    titolo: 'Pizza tonda verace',
    sottotitolo: '62% di idratazione · 6 panetti da 250 g',
    tipoLievito: 'Lievito fresco',
    lievitoG: 0.58,
    lievitoNota: '0,06% sulla farina · 0,6 g per kg',
    dosi: [
      { nome: 'Farina', grammi: 912, percentuale: 100 },
      { nome: 'Acqua', grammi: 565, percentuale: 62, nota: '18 °C consigliati' },
      { nome: 'Sale', grammi: 23, percentuale: 2.5 },
      { nome: 'Lievito fresco', grammi: 0.58, percentuale: 0.064 },
    ],
    totaleG: 1500,
    totaleNota: '6 panetti da 250 g',
    forza: {
      consigliata: 302,
      efficace: 300,
      finestra: '272–378',
      minima: 272,
      massima: 378,
      testo: 'Forza in linea. Il mix è a W 300, dentro la finestra per queste ore.',
    },
    passi: [
      { quando: 'mer 29 ott, 21:00', titolo: 'Impasto pronto', nota: 'Puntata a 20 °C per 2 ore.' },
      { quando: 'gio 30 ott, 19:00', titolo: 'Pronto da infornare', nota: 'Panetti in appretto.' },
    ],
    note: ['22 ore equivalenti a 20 °C.', 'Le dosi sono stime.'],
    curva: [
      { ora: 0, attivita: 1 },
      { ora: 2, attivita: 1 },
      { ora: 2, attivita: 0.115 },
      { ora: 20, attivita: 0.115 },
    ],
    fasce: [
      { da: 0, a: 2, inFrigo: false },
      { da: 2, a: 20, inFrigo: true },
    ],
    oreTotali: 20,
  };
}

const vuoto = { ...dati(), curva: [], fasce: [], oreTotali: 0 };

// Un JPEG finto basta: il PDF non lo decodifica, lo incapsula e basta.
const conGrafici = {
  ...dati(),
  grafici: {
    forza: { datiUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', larghezza: 800, altezza: 240 },
    attivita: { datiUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', larghezza: 800, altezza: 240 },
  },
};

describe('PDF ottimizzato per smartphone', () => {
  it('esce in formato telefono, non in A4', () => {
    const stretto = new TextDecoder('latin1').decode(creaPdf(dati(), true));
    expect(stretto).toContain('/MediaBox [0 0 360 780]');
    expect(stretto).toContain('Farina');
    // Senza il flag resta il foglio A4 da stampare.
    expect(new TextDecoder('latin1').decode(creaPdf(dati()))).toContain('/MediaBox [0 0 595.28 841.89]');
  });
});

const pdf = creaPdf(dati());
// latin1 mappa un carattere per byte: gli indici coincidono con gli offset.
const testo = new TextDecoder('latin1').decode(pdf);

describe('PDF vettoriale del foglio', () => {
  it('è un PDF completo di una pagina', () => {
    expect(testo.startsWith('%PDF-1.4')).toBe(true);
    expect(testo.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(testo).toContain('/Type /Catalog');
    expect(testo).toContain('/Type /Page');
    expect(testo).toContain('/Count 1');
    expect(testo).toContain('/MediaBox [0 0 595.28 841.89]');
  });

  it('usa font standard, quindi il testo resta selezionabile', () => {
    expect(testo).toContain('/BaseFont /Helvetica ');
    expect(testo).toContain('/BaseFont /Helvetica-Bold');
    expect(testo).toContain('/BaseFont /Times-Bold');
    expect(testo).toContain('/Encoding /WinAnsiEncoding');
    expect(testo).toContain('/Subtype /Type1');
  });

  it('scrive i contenuti come testo, non come immagine', () => {
    expect(testo).not.toContain('/DCTDecode');
    expect(testo).not.toContain('/Subtype /Image');
    expect(testo).toContain('(Pizza tonda verace) Tj');
    expect(testo).toContain('(912 g) Tj');
    expect(testo).toContain('(Impasto totale) Tj');
    expect(testo).toContain('(Lievito fresco) Tj');
  });

  it('codifica le accentate e i simboli in WinAnsi', () => {
    expect(testo).toContain('(ATTIVIT\u00c0 DEL LIEVITO) Tj');
    expect(testo).toContain('(NOTA) Tj');

    // ≥, ≤ e il punto elenco hanno un byte proprio in WinAnsi: senza la
    // mappa uscirebbero come punti interrogativi.
    const simboli = new TextDecoder('latin1').decode(
      creaPdf({ ...dati(), titolo: 'W ≥ 280 ≤ 300 •' }),
    );
    // TextDecoder('latin1') segue Windows-1252: il byte 0x95 torna «•».
    expect(simboli).toContain('(W > 280 < 300 •) Tj');
  });

  it('disegna il grafico come tracciati vettoriali', () => {
    // La spezzata ha un punto per ogni cambio di fase.
    const segmenti = testo.match(/ l /g) ?? [];
    expect(segmenti.length).toBeGreaterThan(4);
    // L'area sotto la curva è un riempimento, non un'immagine.
    expect(testo).toMatch(/rg [\d.]+ [\d.]+ m /);
    expect(testo).toContain('(frigorifero) Tj');
    expect(testo).toContain('(0 h) Tj');
    expect(testo).toContain('(20 h) Tj');
  });

  it('non disegna il grafico quando la curva è vuota', () => {
    const senzaCurva = new TextDecoder('latin1').decode(creaPdf(vuoto));
    expect(senzaCurva).toContain('(Nessuna curva da disegnare.) Tj');
    expect(senzaCurva).not.toContain('(frigorifero) Tj');
  });

  it('incapsula i grafici come JPEG, senza ricodificarli', () => {
    const con = new TextDecoder('latin1').decode(creaPdf(conGrafici));

    expect(con).toContain('/Subtype /Image');
    expect(con).toContain('/Filter /DCTDecode');
    expect(con).toContain('/XObject << /Im1 9 0 R /Im2 10 0 R >>');
    expect(con).toContain('/Width 800 /Height 240');
    expect(con).toContain('/Im1 Do');
    expect(con).toContain('/Im2 Do');
    // Con le immagini il disegno vettoriale non viene più fatto.
    expect(con).not.toContain('(ATTIVITÀ DEL LIEVITO) Tj');
  });

  it('mantiene i grafici anche quando la tabella di marcia occupa la pagina', () => {
    const passi = Array.from({ length: 18 }, () => ({
      quando: '', orario: { ora: '20:00', giorno: 'ven 13 nov' },
      titolo: 'Prepara l’impasto', nota: 'Puntata a 20 °C per 4 ore.',
    }));
    const pdf = new TextDecoder('latin1').decode(creaPdf({ ...conGrafici, passi }, true));
    expect(pdf).toContain('/Im1 Do');
    expect(pdf).toContain('/Im2 Do');
  });

  it('disegna la forza anche quando manca il JPEG e conserva la curva', () => {
    expect(testo).toContain('(Zona di forza richiesta e mix) Tj');
    expect(testo).toContain('(ATTIVITÀ DEL LIEVITO) Tj');
  });

  it('sotto i grafici mette didascalia e legenda dei colori', () => {
    const con = new TextDecoder('latin1').decode(creaPdf(conGrafici));

    expect(con).toContain('(Zona di forza richiesta e mix) Tj');
    expect(con).toContain('(Attività del lievito e temperatura) Tj');
    // Le voci di legenda, ognuna col suo campione di colore.
    expect(con).toContain('(zona consigliata per queste ore) Tj');
    expect(con).toContain('(il tuo mix, W 300) Tj');
    expect(con).toContain('(temperatura impasto, tratteggiata) Tj');
  });

  it('firma il foglio con il marchio scritto per esteso', () => {
    expect(testo).toContain('(PizzaMetria) Tj');
    expect(testo).not.toContain('PIZZAMETRIA');
  });

  it('dichiara offset reali nella tabella xref', () => {
    const inizioXref = Number(
      testo.slice(testo.lastIndexOf('startxref') + 'startxref'.length).trim().split(/\s/)[0],
    );

    expect(testo.startsWith('xref', inizioXref)).toBe(true);

    const voci = testo
      .slice(inizioXref)
      .split('\n')
      .map((riga) => riga.trim())
      .filter((riga) => /^\d{10} 00000 n$/.test(riga));

    expect(voci).toHaveLength(8);

    voci.forEach((voce, indice) => {
      const offset = Number(voce.slice(0, 10));
      expect(testo.startsWith(`${indice + 1} 0 obj`, offset)).toBe(true);
    });
  });

  it('conta anche gli oggetti immagine nell’xref', () => {
    const con = new TextDecoder('latin1').decode(creaPdf(conGrafici));
    const inizioXref = Number(
      con.slice(con.lastIndexOf('startxref') + 'startxref'.length).trim().split(/\s/)[0],
    );
    const voci = con
      .slice(inizioXref)
      .split('\n')
      .map((riga) => riga.trim())
      .filter((riga) => /^\d{10} 00000 n$/.test(riga));

    expect(voci).toHaveLength(10);
    expect(con).toContain('/Size 11');
    voci.forEach((voce, indice) => {
      const offset = Number(voce.slice(0, 10));
      expect(con.startsWith(`${indice + 1} 0 obj`, offset)).toBe(true);
    });
  });

  it('dichiara la lunghezza giusta del flusso di contenuto', () => {
    const dichiarata = Number(testo.match(/<< \/Length (\d+) >>/)?.[1] ?? 0);
    const inizio = testo.indexOf('stream\n') + 'stream\n'.length;
    const fine = testo.indexOf('\nendstream', inizio);

    expect(dichiarata).toBe(fine - inizio);
  });
});

describe('PDF di una ricetta lunga', () => {
  it('impagina il procedimento su più facciate senza perdere i passi', () => {
    const paragrafo =
      'Impasta con calma e lascia riposare l’impasto coperto, finché non diventa liscio ed elastico.';
    const lungo: DatiFoglio = {
      ...dati(),
      passi: Array.from({ length: 6 }, (_voce, indice) => ({
        quando: '',
        titolo: `Passo ${indice + 1}`,
        nota: '',
        paragrafi: Array.from({ length: 6 }, () => paragrafo),
      })),
      note: [],
    };

    const documento = new TextDecoder('latin1').decode(creaPdf(lungo));

    expect(documento).toMatch(/\/Count [2-9]/);
    expect(documento).toContain('(Passo 6) Tj');
    expect(documento).toContain('(Pagina 2 di ');
  });
});

describe('misura del testo', () => {
  it('usa le larghezze dei font standard', () => {
    // Helvetica: 'i' vale 222 millesimi di em.
    expect(misura('i', 'F1', 1000)).toBeCloseTo(222, 6);
    expect(misura('iiii', 'F1', 1000)).toBeCloseTo(888, 6);
    // Times-Bold: 'M' vale 944.
    expect(misura('M', 'F4', 1000)).toBeCloseTo(944, 6);
  });

  it('tratta le accentate come la lettera base', () => {
    expect(misura('à', 'F1', 1000)).toBeCloseTo(misura('a', 'F1', 1000), 6);
  });

  it('spezza le righe senza superare la larghezza', () => {
    const righe = dividiInRighe(
      'Il mix è a W 300, dentro la finestra per queste ore di maturazione.',
      'F1',
      9,
      120,
    );

    expect(righe.length).toBeGreaterThan(2);
    for (const riga of righe) {
      expect(misura(riga, 'F1', 9)).toBeLessThanOrEqual(120);
    }
    expect(righe.join(' ')).toBe(
      'Il mix è a W 300, dentro la finestra per queste ore di maturazione.',
    );
  });
});

describe('nome del file esportato', () => {
  it('usa lo slug dell’impasto, il giorno e l’ora', () => {
    expect(nomeFoglio('verace', 'pdf', new Date(2026, 9, 29, 18, 40))).toBe(
      'pizzametria-tonda-verace-2026-10-29-1840.pdf',
    );
    expect(nomeFoglio('contemporanea', 'jpg', new Date(2026, 0, 5, 7, 3))).toBe(
      'pizzametria-tonda-contemporanea-2026-01-05-0703.jpg',
    );
    expect(nomeFoglio('teglia', 'pdf', new Date(2026, 11, 31, 23, 59))).toBe(
      'pizzametria-teglia-2026-12-31-2359.pdf',
    );
  });

  it('non riusa lo stesso nome per due esportazioni dello stesso giorno', () => {
    const mattina = nomeFoglio('verace', 'pdf', new Date(2026, 9, 29, 8, 15));
    const sera = nomeFoglio('verace', 'pdf', new Date(2026, 9, 29, 21, 30));

    expect(mattina).not.toBe(sera);
  });
});

function datiNota(): DatiFoglio {
  return {
    titolo: 'Pizza tonda verace',
    sottotitolo: '62% di idratazione · 6 panetti da 250 g',
    tipoLievito: 'Lievito fresco',
    lievitoG: 0.58,
    lievitoNota: '0,06% sulla farina',
    dosi: [
      { nome: 'Farina', tipo: 'farina', grammi: 912, percentuale: 100 },
      { nome: 'Acqua', tipo: 'acqua', grammi: 565, percentuale: 62, nota: '18 °C consigliati' },
      { nome: 'Lievito fresco', tipo: 'lievito', grammi: 0.58, percentuale: 0.064 },
    ],
    totaleG: 1500,
    totaleNota: '6 panetti da 250 g',
    passi: [
      {
        quando: '',
        orario: { ora: '19:55', giorno: 'lun 9 nov' },
        titolo: 'Prepara l’impasto',
        istruzione: 'Chiudi l’impasto a 21 °C.',
        nota: 'Puntata a 20 °C per 3,5 ore.',
      },
    ],
    note: [
      'Le dosi sono stime: la prima pizza serve a correggere la dose, non il contrario.',
    ],
    noteTitolo: 'NOTA',
  };
}

const testoPdf = (pdf: Uint8Array) => new TextDecoder('latin1').decode(pdf);

describe('foglio aggiornato', () => {
  it('ha un titolo unico «Ingredienti», senza i tre riquadri in testa', () => {
    const pdf = testoPdf(creaPdf(datiNota()));

    expect(pdf).toContain('(INGREDIENTI) Tj');
    expect(pdf).not.toContain('(DOSI) Tj');
    expect(pdf).not.toContain('(IMPASTO TOTALE) Tj');
    expect(pdf).not.toContain('(FARINA) Tj');
  });

  it('stampa la tabella di marcia come una riga per fase', () => {
    const pdf = testoPdf(creaPdf(datiNota()));

    expect(pdf).toContain('(TABELLA DI MARCIA) Tj');
    expect(pdf.indexOf('(TABELLA DI MARCIA) Tj')).toBeGreaterThan(pdf.indexOf('(Impasto totale) Tj'));
    expect(pdf.indexOf('(TABELLA DI MARCIA) Tj')).toBeLessThan(pdf.indexOf('(NOTA) Tj'));
    expect(pdf).toContain('(19:55) Tj');
    expect(pdf).toContain('(lun 9 nov) Tj');
    expect(pdf).toContain('Chiudi l’impasto a 21 °C.');
    expect(pdf.indexOf('Chiudi l’impasto a 21 °C.')).toBeLessThan(pdf.indexOf('20 °C per 3,5 ore.'));
    expect(pdf).toContain('20 °C per 3,5 ore.');
  });

  it('chiama «Procedimento» la sezione dei passi delle ricette', () => {
    const risultato = calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710);
    const pdf = testoPdf(
      creaPdf(datiFoglioRicetta(risultato, RICETTA_TEGLIA_BIGA)),
    );

    expect(pdf).toContain('(PROCEDIMENTO) Tj');
    expect(pdf).not.toContain('(TABELLA DI MARCIA) Tj');
  });

  it('stampa la temperatura consigliata nella voce Acqua prima del totale', () => {
    const pdf = testoPdf(creaPdf(datiNota()));
    const nota = '(18 °C consigliati) Tj';
    expect(pdf).toContain(nota);
    expect(pdf.indexOf(nota)).toBeGreaterThan(pdf.indexOf('(Acqua) Tj'));
    expect(pdf.indexOf(nota)).toBeLessThan(pdf.indexOf('(Impasto totale) Tj'));
  });

  it('sotto il titolo NOTA lascia solo la riga sulle dosi stimate', () => {
    const pdf = testoPdf(creaPdf(datiNota()));

    expect(pdf).toContain('(NOTA) Tj');
    expect(pdf).not.toContain('COME È STATO CALCOLATO');
    expect(pdf).toContain('Le dosi sono stime');
  });

  it('disegna le icone degli ingredienti anche nel foglio vettoriale', () => {
    expect(testoPdf(creaPdf(datiNota()))).toContain(' RG 0.8 w ');
  });
});
