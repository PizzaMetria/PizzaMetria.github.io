import { describe, expect, it } from 'vitest';
import { RICETTA_CANOTTO, RICETTA_TEGLIA_BIGA, RICETTA_TUTTOFARE, PRODOTTI_TUTTOFARE, opzioniIniziali, tipsRicetta } from '../config/ricette';
import { calcolaPerFarina, calcolaPerPanetti, calcolaPerProdotti, calcolaPerTeglie } from '../lib/calcolo';
import { componiProcedimento } from '../lib/procedimento';
import { creaVistaRicetta } from '../lib/vista';
import { creaPdf } from '../../export/pdf';
import { datiFoglioRicetta } from './foglio-ricetta';

const risultato = calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710);
const dati = datiFoglioRicetta(
  risultato,
  RICETTA_TEGLIA_BIGA,
  new Date(2026, 10, 4, 9, 30),
);

describe('foglio della ricetta', () => {
  it('stampa le due scelte del rinfresco della Contemporanea dopo la formatura', () => {
    const ricetta = RICETTA_CANOTTO;
    const risultato = calcolaPerPanetti(ricetta, 3, 280);
    const foglio = datiFoglioRicetta(risultato, ricetta);
    const indice = foglio.passi.findIndex((passo) => passo.titolo === 'Lievitazione dei panetti');
    expect(indice).toBeGreaterThan(0);
    expect(foglio.passi[indice - 1].titolo).toContain('formatura dei panetti');
    expect(foglio.passi[indice].paragrafi).toEqual([
      expect.stringContaining('Rinfresco con farina debole'),
      expect.stringContaining('altre 24 ore'),
    ]);
    const pdf = new TextDecoder('latin1').decode(creaPdf(foglio));
    expect(pdf).toContain('Lievitazione dei panetti');
    expect(pdf).toContain('Rinfresco con farina debole');
    expect(pdf).toContain('Rinfresco con farina forte');
  });

  it('conserva le fasi, con dosi, percentuali e totali', () => {
    expect(dati.fasi).toHaveLength(risultato.fasi.length);
    expect(dati.fasi?.[0].voci.map((voce) => voce.grammi)).toEqual(
      risultato.fasi[0].voci.map((voce) => voce.grammi),
    );
    expect(dati.fasi?.[0].totale?.grammi).toBe(risultato.fasi[0].totale?.grammi);

    // Le percentuali arrivano sul cento, come quelle del calcolatore libero.
    const vista = creaVistaRicetta(risultato, RICETTA_TEGLIA_BIGA);
    const indiceFase = vista.fasi.findIndex((fase) =>
      fase.voci.some((voce) => typeof voce.percentuale === 'number'),
    );
    expect(indiceFase).toBeGreaterThan(-1);
    const voce = vista.fasi[indiceFase].voci.find(
      (ingrediente) => typeof ingrediente.percentuale === 'number',
    );
    expect(voce).toBeDefined();
    const sulFoglio = dati.fasi?.[indiceFase].voci.find(
      (dose) => dose.nome === voce?.etichetta,
    );
    expect(sulFoglio?.percentuale).toBeCloseTo((voce?.percentuale ?? 0) * 100, 9);
    expect(sulFoglio?.base).toBe(voce?.basePercentuale);
  });

  it('porta il riepilogo tecnico e i passi del procedimento', () => {
    expect(dati.riepilogo?.map((gruppo) => gruppo.titolo)).toEqual([
      'Parametri della ricetta',
      'Quantità',
    ]);
    expect(dati.riepilogo?.[0].voci.length).toBeGreaterThan(0);

    const passi = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato);
    expect(dati.passi).toHaveLength(passi.length);
    expect(dati.passi[0].titolo).toBe(passi[0].titolo);
    expect(dati.passi[0].paragrafi).toEqual(passi[0].paragrafi);
    expect(dati.passi[0].paragrafi?.length).toBeGreaterThan(0);
  });

  it('tiene i consigli, la farina e il lievito', () => {
    const tips = tipsRicetta(RICETTA_TEGLIA_BIGA, risultato);
    expect(dati.note).toEqual(expect.arrayContaining(tips));
    expect(dati.noteTitolo).toBe('CONSIGLI');
    expect(dati.farinaG).toBe(risultato.farinaTotaleG);
    expect(dati.lievitoG).toBeGreaterThan(0);
    expect(dati.etichettaLievito).toMatch(/lievito/i);
    expect(dati.generatoIl).toContain('2026');
    // Nessun grafico: le ricette non hanno curva né immagini da incapsulare.
    expect(dati.curva).toBeUndefined();
    expect(dati.forza).toBeUndefined();
  });

  it('il PDF della ricetta porta tutte le sezioni e va su più facciate', () => {
    const pdf = new TextDecoder('latin1').decode(creaPdf(dati));

    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('(Le mie ricette) Tj');
    expect(pdf).toContain('(PARAMETRI DELLA RICETTA) Tj');
    expect(pdf).toContain('(PROCEDIMENTO) Tj');
    expect(pdf).toContain('(CONSIGLI) Tj');
    expect(pdf).toContain('(Peso impasto) Tj');
    // Il procedimento completo non sta in una facciata sola.
    expect(pdf).toMatch(/\/Count [2-9]/);
    expect(pdf).toContain('(Pagina 1 di ');
  });
});

it.each([RICETTA_CANOTTO, RICETTA_TEGLIA_BIGA])('integra il piano misto nel PDF di $nome', (ricetta) => {
  const opzioni = opzioniIniziali(ricetta);
  const biga = {
    temperatura: 21, temperaturaFrigo: 4, ore: 24, oreAmbienteMisto: '12',
    oraImpasto: '2026-11-13T20:00', oraPronta: '2026-11-14T20:00',
  };
  const config = { ...ricetta, motoreBiga: biga };
  const risultato = calcolaPerPanetti(config, 3, 280, { ...opzioni, biga });
  expect(risultato.pianoBiga).toMatchObject({ oreAmbiente: 12, oreFrigo: 12 });
  expect(risultato.pesoImpastoG).toBeCloseTo(840);
  const foglio = datiFoglioRicetta(risultato, config);
  expect(foglio.marcia?.map((passo) => passo.orario?.ora)).toEqual(['20:00', '08:00']);
  expect(foglio.passi[0].titolo).toBe('Prepara la biga');
  const pdf = new TextDecoder('latin1').decode(creaPdf(foglio));
  expect(pdf).toContain('(PROCEDIMENTO) Tj');
  const marcia = '(TABELLA DI MARCIA DELLA BIGA) Tj';
  expect(pdf).toContain(marcia);
  expect(pdf.indexOf(marcia)).toBeGreaterThan(pdf.indexOf('(Peso impasto) Tj'));
  expect(pdf.indexOf(marcia)).toBeLessThan(pdf.indexOf('(PROCEDIMENTO) Tj'));
  expect(pdf).not.toContain('poi 24 ore in frigorifero');
  if (ricetta === RICETTA_TEGLIA_BIGA) {
    const mobile = new TextDecoder('latin1').decode(creaPdf(foglio, true));
    expect(mobile).toContain('(W 300–330) Tj');
  }
});

it('mantiene le misure accanto alle rispettive focacce nel PDF del Tuttofare', () => {
  const ricetta = RICETTA_TUTTOFARE;
  const risultato = calcolaPerProdotti(ricetta, [
    { id: 'pizzette', quantita: 4, pesoG: 50 },
    { id: 'focacce', quantita: 1, pesoG: 200, misura: 'diametro 24 cm' },
    { id: 'focacce-teglia', quantita: 1, pesoG: 665, misura: '30 × 50 cm' },
  ]);
  const pdf = new TextDecoder('latin1').decode(creaPdf(datiFoglioRicetta(risultato, ricetta)));
  expect(pdf).toContain('diametro 24 cm');
  expect(pdf).toContain('30 × 50 cm');
});


it('unisce numero e dimensioni delle teglie nello stesso riquadro del PDF', () => {
  for (const [numero, resa] of [[1, '1 teglia'], [2, '2 teglie']] as const) {
    const risultato = calcolaPerTeglie(RICETTA_TEGLIA_BIGA, 30, 40, numero);
    const pdf = new TextDecoder('latin1').decode(creaPdf(datiFoglioRicetta(risultato, RICETTA_TEGLIA_BIGA), true));
    expect(pdf).toContain(`(${resa} da 30 × 40 cm ·`);
    expect(pdf).toContain('(RESA) Tj');
    expect(pdf).not.toContain('(Numero di teglie) Tj');
    expect(pdf).not.toContain('(Dimensioni della teglia) Tj');
    expect(pdf).toContain('di impasto per teglia');
  }
});

it.each([false, true])('stampa tutti gli ingredienti e il totale in prima pagina (smartphone: %s)', (stretto) => {
  const misto = calcolaPerProdotti(RICETTA_TUTTOFARE, PRODOTTI_TUTTOFARE.map((prodotto) => ({
    id: prodotto.id,
    quantita: 3,
    pesoG: prodotto.pesoBaseG,
  })));
  for (const foglio of [
    datiFoglioRicetta(calcolaPerPanetti(RICETTA_CANOTTO, 3, 280), RICETTA_CANOTTO),
    datiFoglioRicetta(misto, RICETTA_TUTTOFARE),
  ]) {
    const pdf = new TextDecoder('latin1').decode(creaPdf(foglio, stretto));
    const prima = /\nstream\n([\s\S]*?)\nendstream/.exec(pdf)?.[1] ?? '';
    const titoloResa = foglio.formati ? '(Divisione per formato) Tj' : '(RESA) Tj';
    expect(prima).toContain(titoloResa);
    expect(prima).toContain('(INGREDIENTI) Tj');
    expect(prima).toContain('(Peso impasto) Tj');
    expect(prima.indexOf(titoloResa)).toBeLessThan(prima.indexOf('(INGREDIENTI) Tj'));
    expect(pdf.split(titoloResa)).toHaveLength(2);
    expect(pdf).not.toContain('(QUANTITÀ) Tj');
  }
});

it('usa tutta la riga per le misure della teglia nel PDF per smartphone', () => {
  const etichetta = 'Teglia rettangolare per focaccia (30 × 50 cm)';
  const valore = '2 × 665 g = 1.330 g';
  const pdf = new TextDecoder('latin1').decode(creaPdf({
    ...dati,
    formati: { titolo: 'Divisione per formato', voci: [{ etichetta, valore }] },
  }, true));

  expect(pdf).toContain('(Teglia rettangolare per focaccia \\(30 × 50 cm\\)) Tj');
  expect(pdf).toContain(`(${valore}) Tj`);
});

it('mostra i cinque formati della Tuttofare nel riquadro in entrambe le modalità', () => {
  const ricetta = RICETTA_TUTTOFARE;
  const prodotti = PRODOTTI_TUTTOFARE.map(({ id, pesoBaseG }) => ({
    id,
    quantita: 1,
    pesoG: pesoBaseG,
  }));

  for (const risultato of [
    calcolaPerFarina(ricetta, 1, null, undefined, null, prodotti),
    calcolaPerProdotti(ricetta, prodotti),
  ]) {
    const foglio = datiFoglioRicetta(risultato, ricetta);
    expect(foglio.sottotitolo).toBe(ricetta.descrizione);
    expect(foglio.intestazionePdf?.resa).toBeUndefined();
    expect(foglio.formati?.voci.filter(({ etichetta }) => !['Peso complessivo', 'Avanzo totale'].includes(etichetta))).toHaveLength(5);

    const pdf = new TextDecoder('latin1').decode(creaPdf(foglio));
    expect(pdf).toContain('(Divisione per formato) Tj');
    expect(pdf).not.toMatch(/\b\d+ format[oi]\b/);
  }
});
