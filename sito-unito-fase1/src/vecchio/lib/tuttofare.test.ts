import { describe, expect, it } from 'vitest';
import {
  PRODOTTI_TUTTOFARE,
  RICETTA_TUTTOFARE,
  tipsRicetta,
} from '../config/ricette';
import {
  calcolaPerFarina,
  calcolaPerProdotti,
  pesoDaDimensione,
  type RigaProdottoCalcolo,
} from './calcolo';
import { creaVistaRicetta } from './vista';
import { componiProcedimento } from './procedimento';
import { validaModalitaProdotti } from './validazione';
import { valoriIniziali } from './persistenza';

function righe(
  valori: Partial<Record<string, [number, number]>>,
): RigaProdottoCalcolo[] {
  return PRODOTTI_TUTTOFARE.map((prodotto) => {
    const [quantita, pesoG] = valori[prodotto.id] ?? [0, prodotto.pesoBaseG];
    return { id: prodotto.id, quantita, pesoG };
  });
}

function grammiDi(risultato: ReturnType<typeof calcolaPerProdotti>, chiave: string) {
  return (
    risultato.ingredienti.find((voce) => voce.chiave === chiave)?.grammi ?? 0
  );
}

describe('Impasto Tuttofare — formula', () => {
  it('usa le percentuali fissate sulla farina', () => {
    const risultato = calcolaPerProdotti(RICETTA_TUTTOFARE, righe({ focacce: [1, 200] }));
    const farina = risultato.farinaTotaleG;

    expect(grammiDi(risultato, 'acqua')).toBeCloseTo(farina * 0.6, 6);
    expect(grammiDi(risultato, 'lievito')).toBeCloseTo(farina * 0.02, 6);
    expect(grammiDi(risultato, 'zucchero')).toBeCloseTo(farina * 0.04, 6);
    expect(grammiDi(risultato, 'sale')).toBeCloseTo(farina * 0.022, 6);
    expect(grammiDi(risultato, 'olio')).toBeCloseTo(farina * 0.07, 6);
  });

  it('non prevede biga, autolisi o malto e non è personalizzabile', () => {
    const risultato = calcolaPerProdotti(RICETTA_TUTTOFARE, righe({ focacce: [1, 200] }));
    const chiavi = risultato.ingredienti.map((voce) => voce.chiave);

    expect(chiavi).not.toContain('malto');
    expect(chiavi).not.toContain('miele');
    expect(chiavi).not.toContain('farina-biga');
    expect(risultato.fasi.map((fase) => fase.id)).toEqual(['impasto']);
    expect(RICETTA_TUTTOFARE.senzaPersonalizzazione).toBe(true);
    // Prodotti e Farina: il calcolatore misto si può configurare nei due modi.
    expect(RICETTA_TUTTOFARE.modalita).toEqual(['prodotti', 'farina']);
  });

  it('pesa 1.752 g per kg di farina con lievito fresco e 1.740 g con secco', () => {
    const fresco = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ focacce: [1, 200] }),
      { tipoLievito: 'fresco', autolisi: false },
    );
    const secco = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ focacce: [1, 200] }),
      { tipoLievito: 'secco', autolisi: false },
    );

    expect(fresco.pesoImpastoG / fresco.farinaTotaleG).toBeCloseTo(1.752, 6);
    expect(secco.pesoImpastoG / secco.farinaTotaleG).toBeCloseTo(1.74, 6);
    expect(grammiDi(fresco, 'lievito')).toBeCloseTo(
      fresco.farinaTotaleG * 0.02,
      6,
    );
    // 20 g di fresco e 8 g di secco istantaneo per kg di farina: fattore 0,4.
    expect(grammiDi(secco, 'lievito')).toBeCloseTo(
      secco.farinaTotaleG * 0.008,
      6,
    );
  });
});

describe('Impasto Tuttofare — calcolatore misto', () => {
  const misto: Partial<Record<string, [number, number]>> = {
    bauletti: [1, 500],
    panini: [5, 90],
    pizzette: [1, 50],
    focacce: [1, 200],
  };

  it('somma i subtotali dell’esempio da 1.200 g in un unico impasto', () => {
    const risultato = calcolaPerProdotti(RICETTA_TUTTOFARE, righe(misto));

    expect(risultato.pesoProdottiG).toBe(1200);
    expect(risultato.prodotti).toHaveLength(4);
    expect(risultato.prodotti?.map((prodotto) => prodotto.subtotaleG)).toEqual([
      50, 450, 200, 500,
    ]);
    // Un'unica tabella ingredienti: la somma torna il peso richiesto.
    expect(risultato.pesoImpastoG).toBeCloseTo(1200, 6);
  });

  it('ricalcola la farina cambiando lievito e mantiene il peso richiesto', () => {
    const fresco = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe(misto),
      { tipoLievito: 'fresco', autolisi: false },
    );
    const secco = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe(misto),
      { tipoLievito: 'secco', autolisi: false },
    );

    expect(fresco.farinaTotaleG).toBeCloseTo(1200 / 1.752, 6);
    expect(secco.farinaTotaleG).toBeCloseTo(1200 / 1.74, 6);
    expect(secco.farinaTotaleG).toBeGreaterThan(fresco.farinaTotaleG);
    expect(secco.pesoImpastoG).toBeCloseTo(1200, 6);
  });

  it('esclude le righe a zero e accetta pesi modificati', () => {
    const risultato = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ panini: [2, 120] }),
    );

    expect(risultato.prodotti).toHaveLength(1);
    expect(risultato.prodotti?.[0]).toMatchObject({
      id: 'panini',
      quantita: 2,
      pesoG: 120,
      subtotaleG: 240,
    });
    expect(risultato.pesoProdottiG).toBe(240);
  });

  it('rifiuta un calcolo senza prodotti scelti', () => {
    expect(() => calcolaPerProdotti(RICETTA_TUTTOFARE, righe({}))).toThrow(
      /almeno un prodotto/i,
    );
  });

  it('chiede almeno un prodotto e segnala i pesi non validi', () => {
    const vuoto = validaModalitaProdotti(
      PRODOTTI_TUTTOFARE.map((prodotto) => ({
        id: prodotto.id,
        quantita: '0',
        peso: String(prodotto.pesoBaseG),
      })),
    );
    expect(vuoto.valori).toBeNull();
    expect(Object.keys(vuoto.errori)).toContain('prodotti');

    const pesoNonValido = validaModalitaProdotti(
      PRODOTTI_TUTTOFARE.map((prodotto) => ({
        id: prodotto.id,
        quantita: prodotto.id === 'panini' ? '2' : '0',
        peso: prodotto.id === 'panini' ? '0' : String(prodotto.pesoBaseG),
      })),
    );
    expect(pesoNonValido.valori).toBeNull();
    expect(Object.keys(pesoNonValido.errori)).toContain('prodotto-panini');
  });

  it('formatta la resa con formati e peso complessivo', () => {
    const vista = creaVistaRicetta(
      calcolaPerProdotti(RICETTA_TUTTOFARE, righe(misto)),
      RICETTA_TUTTOFARE,
    );

    expect(vista.resa).toBe('4 formati · 1.200 g');
    expect(vista.nomeRicetta).toBe('Impasto Tuttofare');
    expect(vista.fasi).toHaveLength(1);
  });
});

describe('Impasto Tuttofare — modalità farina', () => {
  it('calcola l’impasto dalla farina e ripartisce tra i formati', () => {
    const risultato = calcolaPerFarina(RICETTA_TUTTOFARE, 1);
    const vista = creaVistaRicetta(risultato, RICETTA_TUTTOFARE);

    expect(risultato.modalita).toBe('farina');
    expect(risultato.farinaTotaleG).toBe(1000);
    expect(risultato.pesoImpastoG).toBeCloseTo(1752, 6);

    // Pezzature di riferimento in ordine di peso: pizzette 50 g, panini 90 g,
    // focaccia rotonda 200 g, bauletti 500 g, focaccia in teglia 530 g.
    expect(risultato.prodotti?.map((prodotto) => prodotto.quantita)).toEqual([
      35, 19, 8, 3, 3,
    ]);
    const perId = Object.fromEntries(
      (risultato.prodotti ?? []).map((prodotto) => [prodotto.id, prodotto]),
    );
    expect(perId.pizzette.residuoG).toBeCloseTo(2, 6);
    expect(perId.focacce.residuoG).toBeCloseTo(152, 6);
    expect(perId.bauletti.residuoG).toBeCloseTo(252, 6);
    expect(perId['focacce-teglia'].residuoG).toBeCloseTo(162, 6);

    expect(vista.resa).toBe('Dosi per 1 kg di farina · 1.752 g di impasto');
    expect(vista.ripartizione.map((voce) => voce.etichetta)).toEqual([
      'Pizzette',
      'Panini',
      'Focaccia rotonda',
      'Bauletti / pane in cassetta',
      'Focaccia in teglia',
    ]);
    expect(vista.ripartizione[0].valore).toBe('35 pezzi da 50 g · avanzo 2 g');
    expect(vista.riepilogoTecnico[1].voci[0]).toEqual({
      etichetta: 'Pizzette (indicativo)',
      valore: '35 pezzi da 50 g · avanzo 2 g',
    });
    expect(vista.chiarimenti.join(' ')).toContain(
      'la ripartizione tra i formati è indicativa',
    );
  });

  it('mostra tutti i formati e i consigli specifici partendo dalla farina', () => {
    const risultato = calcolaPerFarina(RICETTA_TUTTOFARE, 1);
    const passi = componiProcedimento(RICETTA_TUTTOFARE, risultato);
    const testo = passi.flatMap((passo) => passo.paragrafi).join(' ');

    // I formati stanno dentro il punto «Prodotti lievitati», come elenco
    // puntato, nell'ordine di infornata.
    const prodotti = passi.find(
      (passo) => passo.titolo === 'Prodotti lievitati',
    );
    expect(prodotti?.voci?.map((voce) => voce.titolo)).toEqual([
      'Panini',
      'Pizzette',
      'Bauletti / pane in cassetta',
      'Focacce',
    ]);

    expect(testo).not.toContain('{');
    expect(testo).toContain(
      'Dividi l’impasto secondo i formati che vuoi preparare: le pezzature di riferimento sono pizzetta 50 g, panino 90 g, focaccia rotonda 200 g, bauletto 500 g, focaccia in teglia 530 g.',
    );

    const tips = tipsRicetta(RICETTA_TUTTOFARE, risultato);
    expect(tips).toHaveLength(
      RICETTA_TUTTOFARE.tips.length + (RICETTA_TUTTOFARE.tipsProdotti?.length ?? 0),
    );
  });

  it('segnala i formati che l’impasto non copre', () => {
    const risultato = calcolaPerFarina(RICETTA_TUTTOFARE, 0.05);
    const vista = creaVistaRicetta(risultato, RICETTA_TUTTOFARE);
    const bauletti = vista.ripartizione.find(
      (voce) => voce.etichetta === 'Bauletti / pane in cassetta',
    );

    expect(bauletti?.valore).toContain('Impasto insufficiente');
  });
});

describe('Impasto Tuttofare — procedimento e consigli', () => {
  it('mostra solo le sezioni dei formati scelti', () => {
    const risultato = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ panini: [5, 90], focacce: [1, 200] }),
    );
    const passi = componiProcedimento(RICETTA_TUTTOFARE, risultato);
    const formati =
      passi
        .find((passo) => passo.titolo === 'Prodotti lievitati')
        ?.voci?.map((voce) => voce.titolo) ?? [];

    expect(formati).toEqual(['Panini', 'Focacce']);
  });

  it('raggruppa i formati nel punto «Prodotti lievitati», in ordine di infornata', () => {
    const risultato = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ pizzette: [2, 50], panini: [1, 90], focacce: [1, 200], bauletti: [1, 500] }),
    );
    const passi = componiProcedimento(RICETTA_TUTTOFARE, risultato);
    const lievitati = passi.find(
      (passo) => passo.titolo === 'Prodotti lievitati',
    );

    expect(lievitati?.paragrafi).toEqual([
      'Una volta lievitati, procedi nel seguente modo:',
    ]);
    expect(lievitati?.voci?.map((voce) => voce.titolo)).toEqual([
      'Panini',
      'Pizzette',
      'Bauletti / pane in cassetta',
      'Focacce',
    ]);
    // I formati non sono più punti numerati principali.
    expect(passi.map((passo) => passo.titolo)).toEqual([
      'Impasto',
      'Pieghe e riposo',
      'Divisione e formatura',
      'Prodotti lievitati',
    ]);

    const formatura = passi.find(
      (passo) => passo.titolo === 'Divisione e formatura',
    );
    expect(formatura?.paragrafi[1]).toBe(
      'Dopo la formatura, lascia lievitare per circa 1 ora – 1 ora e mezza a 28 °C.',
    );
    expect(formatura?.paragrafi.join(' ')).not.toMatch(/72%|umidità/i);
  });

  it('ricava il peso del pezzo dalla superficie di teglietta e stampo', () => {
    const focacce = PRODOTTI_TUTTOFARE.find((voce) => voce.id === 'focacce');
    const teglia = PRODOTTI_TUTTOFARE.find((voce) => voce.id === 'focacce-teglia');
    const bauletti = PRODOTTI_TUTTOFARE.find((voce) => voce.id === 'bauletti');
    const diametro = focacce?.dimensione;
    const stampo = bauletti?.dimensione;
    const tegliaFocaccia = teglia?.dimensione;

    expect(diametro && pesoDaDimensione(diametro, 24)).toBe(200);
    expect(diametro && pesoDaDimensione(diametro, 26)).toBe(235);
    expect(diametro && pesoDaDimensione(diametro, 12)).toBe(50);
    expect(stampo && pesoDaDimensione(stampo, 20, 10)).toBe(500);
    expect(stampo && pesoDaDimensione(stampo, 20, 12)).toBe(600);
    expect(stampo && pesoDaDimensione(stampo, 22, 10)).toBe(550);

    // Stessa focaccia, stessa altezza al cm²: 24 cm di cerchio = 200 g,
    // quindi una teglia 30 × 40 porta 530 g.
    expect(tegliaFocaccia && pesoDaDimensione(tegliaFocaccia, 30, 40)).toBe(530);
    expect(tegliaFocaccia && pesoDaDimensione(tegliaFocaccia, 35, 40)).toBe(620);
  });

  it('ordina i formati per peso crescente, da 50 g a 530 g', () => {
    expect(PRODOTTI_TUTTOFARE.map((prodotto) => prodotto.pesoBaseG)).toEqual([
      50, 90, 200, 500, 530,
    ]);
  });

  it('inserisce le quantità effettive e le pezzature nel testo', () => {
    const risultato = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ bauletti: [1, 500], panini: [5, 90] }),
    );
    const testo = componiProcedimento(RICETTA_TUTTOFARE, risultato)
      .flatMap((passo) => passo.paragrafi)
      .join(' ');

    // Nessun segnaposto irrisolto nei testi generati.
    expect(testo).not.toContain('{');
    expect(testo).toMatch(/\d+ pezzi da 90 g/);
    expect(testo).toMatch(/\d+ pezzo da 500 g/);
  });

  it('aggiunge i consigli specifici solo per i formati scelti', () => {
    const risultato = calcolaPerProdotti(
      RICETTA_TUTTOFARE,
      righe({ bauletti: [1, 500] }),
    );
    const tips = tipsRicetta(RICETTA_TUTTOFARE, risultato);
    const comuni = tipsRicetta(RICETTA_TUTTOFARE, null);

    expect(tips.length).toBeGreaterThan(comuni.length);
    expect(tips.join(' ')).toContain('Per il bauletto');
    expect(tips.join(' ')).toContain('500 g');

    // Il consiglio delle pizzette (carta forno) vive nel procedimento, non nei
    // Tips: non deve essere ripetuto.
    const soloPizzette = tipsRicetta(
      RICETTA_TUTTOFARE,
      calcolaPerProdotti(RICETTA_TUTTOFARE, righe({ pizzette: [6, 50] })),
    );
    expect(soloPizzette.join(' ')).not.toContain('Carta forno');
    expect(soloPizzette).toHaveLength(comuni.length);
  });

  it('non promette durate di conservazione in frigorifero', () => {
    const testo = [
      ...RICETTA_TUTTOFARE.tips,
      ...(RICETTA_TUTTOFARE.tipsProdotti ?? []).map((tip) => tip.testo),
    ]
      .join(' ')
      .toLowerCase();

    expect(testo).not.toMatch(/3–4 giorni|4 giorni|giorni in frigorifero/);
    expect(testo).not.toContain('da verificare');
  });
});

describe('focacce del calcolatore misto', () => {
  function voceFocacce(valori: Partial<Record<string, [number, number]>>) {
    const risultato = calcolaPerProdotti(RICETTA_TUTTOFARE, righe(valori));
    return componiProcedimento(RICETTA_TUTTOFARE, risultato)
      .find((passo) => passo.titolo === 'Prodotti lievitati')
      ?.voci?.find((voce) => voce.titolo === 'Focacce');
  }

  it('ha due voci: focaccia rotonda e focaccia in teglia', () => {
    const rotonda = PRODOTTI_TUTTOFARE.find((voce) => voce.id === 'focacce');
    const teglia = PRODOTTI_TUTTOFARE.find(
      (voce) => voce.id === 'focacce-teglia',
    );

    expect(rotonda?.nome).toBe('Focaccia rotonda');
    expect(teglia?.nome).toBe('Focaccia in teglia');
    expect(teglia?.nota).toContain('30 × 40');
  });

  it('tiene lo stesso spessore della tonda da 24 cm', () => {
    const rotonda = PRODOTTI_TUTTOFARE.find((voce) => voce.id === 'focacce');
    const teglia = PRODOTTI_TUTTOFARE.find(
      (voce) => voce.id === 'focacce-teglia',
    );

    expect(rotonda?.dimensione && pesoDaDimensione(rotonda.dimensione, 24)).toBe(
      200,
    );
    expect(teglia?.dimensione && pesoDaDimensione(teglia.dimensione, 30, 40)).toBe(
      530,
    );
  });

  it('usa lo stesso procedimento per la tonda e per la teglia', () => {
    const tonda = voceFocacce({ focacce: [1, 200] });
    const teglia = voceFocacce({ 'focacce-teglia': [1, 530] });

    expect(tonda?.paragrafi.length).toBeGreaterThan(0);
    expect(teglia?.paragrafi).toEqual(tonda?.paragrafi);
  });

  it('non ha più riferimento dinamico, pomodorini premuti e pezzatura base', () => {
    const testo =
      voceFocacce({
        focacce: [1, 200],
        'focacce-teglia': [1, 530],
      })?.paragrafi.join(' ') ?? '';

    expect(testo).not.toContain('Riferimento dinamico');
    expect(testo).not.toContain('Premi i pomodorini');
    expect(testo).not.toContain('alla pezzatura base');
    expect(testo).not.toContain('Controlla superficie e fondo');
    expect(testo).toContain('Sforna');
  });

  it('non mostra il punto focacce se non è scelto nessun formato', () => {
    expect(voceFocacce({ panini: [1, 90] })).toBeUndefined();
  });

  it('parte con tutti i formati a zero', () => {
    const prodotti = valoriIniziali(RICETTA_TUTTOFARE.id).prodotti;
    const quantita = Object.values(prodotti).map((riga) => riga.quantita);

    expect(quantita).toHaveLength(PRODOTTI_TUTTOFARE.length);
    expect(quantita.every((valore) => valore === '0')).toBe(true);
  });

  it('nasce con la teglia 30 × 40 e 530 g di impasto', () => {
    const teglia = PRODOTTI_TUTTOFARE.find(
      (voce) => voce.id === 'focacce-teglia',
    );

    expect(teglia?.pesoBaseG).toBe(530);
    expect(teglia?.dimensione?.baseA).toBe(30);
    expect(teglia?.dimensione?.baseB).toBe(40);
  });
});
