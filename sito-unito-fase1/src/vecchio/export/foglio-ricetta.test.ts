import { describe, expect, it } from 'vitest';
import { RICETTA_TEGLIA_BIGA, tipsRicetta } from '../config/ricette';
import { calcolaPerPanetti } from '../lib/calcolo';
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
    expect(pdf).toContain('(LE MIE RICETTE) Tj');
    expect(pdf).toContain('(PARAMETRI DELLA RICETTA) Tj');
    expect(pdf).toContain('(PROCEDIMENTO) Tj');
    expect(pdf).toContain('(CONSIGLI) Tj');
    expect(pdf).toContain('(Impasto totale) Tj');
    // Il procedimento completo non sta in una facciata sola.
    expect(pdf).toMatch(/\/Count [2-9]/);
    expect(pdf).toContain('(Pagina 1 di ');
  });
});
