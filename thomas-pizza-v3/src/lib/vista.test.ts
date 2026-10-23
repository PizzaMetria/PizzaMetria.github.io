import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
} from '../config/ricette';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerTeglie,
} from './calcolo';
import { creaVistaRicetta } from './vista';

describe('vista Pizza in teglia con biga', () => {
  const vista = creaVistaRicetta(
    calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1),
    RICETTA_TEGLIA_BIGA,
  );

  it('formatta i totali in italiano senza ",0"', () => {
    expect(vista.statistiche[0]).toEqual({
      etichetta: 'Farina totale',
      valore: '1.000 g',
    });
    expect(vista.statistiche[1].valore).toBe('1.895,5 g');
    expect(vista.statistiche[2].valore).toBe('80%');
    expect(vista.resa).toBe('Dosi per 1 kg di farina');
  });

  it('mostra le fasi con le dosi arrotondate per ingrediente', () => {
    expect(vista.fasi.map((fase) => fase.titolo)).toEqual([
      'Biga',
      'Rinfresco',
    ]);
    expect(vista.fasi[0].voci).toEqual([
      { etichetta: 'Farina 00 forte', valore: '850 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '425 g', tipo: 'acqua' },
      { etichetta: 'Lievito di birra fresco', valore: '8,5 g', tipo: 'lievito' },
    ]);
    expect(vista.fasi[0].totale).toEqual({
      etichetta: 'Totale biga pronta',
      valore: '1.284 g',
    });
    expect(vista.fasi[1].voci).toEqual([
      { etichetta: 'Farina 00 forte', valore: '150 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '375 g', tipo: 'acqua' },
      { etichetta: 'Malto diastasico', valore: '17,0 g', tipo: 'malto' },
      { etichetta: 'Sale', valore: '30 g', tipo: 'sale' },
      { etichetta: 'Olio extravergine', valore: '40 g', tipo: 'olio' },
    ]);
    expect(vista.fasi[1].avviso).toContain('Aggiungi tutta la biga');
  });

  it('mostra i parametri e l’autolisi non attiva senza chiarimenti', () => {
    expect(vista.parametri).toEqual(
      expect.arrayContaining([
        { etichetta: 'Farina nella biga', valore: '85% della farina totale' },
        { etichetta: 'Idratazione della biga', valore: '50%' },
        { etichetta: 'Farina', valore: '00 forte, W 300–320' },
        { etichetta: 'Malto', valore: '2% della farina della biga' },
        { etichetta: 'Autolisi', valore: 'Non attiva' },
        { etichetta: 'Conservazione della biga', valore: '24 ore a 4 °C' },
        { etichetta: 'Temperatura di chiusura', valore: '25 °C' },
      ]),
    );
    expect(vista.chiarimenti).toEqual([]);
  });

  it('non mostra più la nota sull’olio e il peso teorico', () => {
    expect(vista.noteEssenziali).toEqual([]);
    expect(vista.notaPeso).toBe('');
    expect(vista.note.join(' ')).toContain(
      'Il malto diastasico è il 2% della farina della biga',
    );
    expect(vista.note.join(' ')).not.toContain('2% della farina totale');
  });

  it('mostra la resa per panetti', () => {
    const panetti = creaVistaRicetta(
      calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710),
      RICETTA_TEGLIA_BIGA,
    );
    expect(panetti.resa).toBe('3 panetti da 710 g');
    expect(panetti.statistiche).toHaveLength(3);
    expect(panetti.dettagli).toEqual([]);
  });
});

describe('vista autolisi facoltativa', () => {
  const vista = creaVistaRicetta(
    calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, {
      tipoLievito: 'fresco',
      autolisi: true,
    }),
    RICETTA_TEGLIA_BIGA,
  );

  it('mostra le tre fasi e l’acqua ripartita', () => {
    expect(vista.fasi.map((fase) => fase.titolo)).toEqual([
      'Biga',
      'Autolisi',
      'Impastamento finale',
    ]);
    expect(vista.fasi[1].voci).toEqual([
      { etichetta: 'Farina 00 forte', valore: '150 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '83 g', tipo: 'acqua' },
    ]);
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '293 g',
      tipo: 'acqua',
    });
    expect(vista.parametri).toContainEqual({
      etichetta: 'Autolisi',
      valore: 'Attiva',
    });
  });
});

describe('vista Trancio Milanese', () => {
  const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2);
  const vista = creaVistaRicetta(risultato, RICETTA_TRANCIO);

  it('mostra resa con peso per teglia e tre indicatori', () => {
    expect(vista.resa).toBe(
      '2 teglie da 30 × 40 cm · 649,5 g di impasto per teglia',
    );
    expect(vista.statistiche).toEqual([
      { etichetta: 'Farina totale', valore: '750 g' },
      { etichetta: 'Peso teorico totale', valore: '1.299 g' },
      { etichetta: 'Idratazione totale', valore: '60%' },
    ]);
    expect(vista.dettagli).toEqual([]);
    expect(vista.noteEssenziali).toEqual([
      'Olio per ungere teglia e piano di lavoro: q.b., escluso dalle dosi.',
    ]);
  });

  it('usa un’unica fase Impasto e le dosi della farina debole', () => {
    expect(vista.fasi).toHaveLength(1);
    expect(vista.fasi[0].titolo).toBe('Impasto');
    expect(vista.fasi[0].voci).toEqual([
      { etichetta: 'Farina debole', valore: '750 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '450 g', tipo: 'acqua' },
      { etichetta: 'Lievito di birra fresco', valore: '11,0 g', tipo: 'lievito' },
      { etichetta: 'Malto diastasico', valore: '8,0 g', tipo: 'malto' },
      { etichetta: 'Miele', valore: '20 g', tipo: 'miele' },
      { etichetta: 'Sale', valore: '16 g', tipo: 'sale' },
      { etichetta: 'Olio extravergine', valore: '44 g', tipo: 'olio' },
    ]);
    expect(vista.parametri).toContainEqual({
      etichetta: 'Farina',
      valore: 'debole, W 180–220',
    });
  });

  it('mostra la resa per farina e la stima facoltativa', () => {
    const daFarina = creaVistaRicetta(
      calcolaPerFarina(RICETTA_TRANCIO, 0.375, null, undefined, {
        latoA: 30,
        latoB: 40,
      }),
      RICETTA_TRANCIO,
    );
    expect(daFarina.resa).toBe('Dosi per 0,375 kg di farina');
    expect(daFarina.dettagli).toContainEqual({
      etichetta: 'Teglie intere (stima)',
      valore: '1',
    });
  });
});

describe('vista Canotto', () => {
  const vista = creaVistaRicetta(
    calcolaPerFarina(RICETTA_CANOTTO, 1),
    RICETTA_CANOTTO,
  );

  it('mostra le tre fasi con acqua ripartita', () => {
    expect(vista.fasi.map((fase) => fase.titolo)).toEqual([
      'Biga',
      'Autolisi',
      'Impastamento finale',
    ]);
    expect(vista.fasi[1].voci).toContainEqual({
      etichetta: 'Acqua',
      valore: '138 g',
      tipo: 'acqua',
    });
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '220 g',
      tipo: 'acqua',
    });
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Malto diastasico',
      valore: '15,0 g',
      tipo: 'malto',
    });
    expect(vista.parametri).toContainEqual({
      etichetta: 'Malto',
      valore: '2% della farina della biga',
    });
    expect(vista.noteEssenziali).toEqual([]);
    expect(vista.fasi[2].avviso).toContain('tutta la biga');
  });

  it('mostra l’autolisi attiva, facoltativa e i tempi aggiornati', () => {
    expect(vista.parametri).toContainEqual({
      etichetta: 'Autolisi',
      valore: 'Attiva',
    });
    expect(vista.parametri).toContainEqual({
      etichetta: 'Conservazione della biga',
      valore: '24 ore a 4 °C',
    });
    expect(vista.parametri).not.toContainEqual(
      expect.objectContaining({ etichetta: 'Temperatura di chiusura' }),
    );

    const tempi = RICETTA_CANOTTO.tempiETemperature;
    expect(tempi).toContainEqual({
      etichetta: 'Autolisi',
      valore:
        'Facoltativa: la sera prima, a temperatura ambiente per tutta la notte',
    });
    expect(tempi).toContainEqual({
      etichetta: 'Puntata',
      valore: 'Poco meno di 30 minuti',
    });
    expect(tempi).toContainEqual({
      etichetta: 'Cottura pizza',
      valore:
        '400 °C cielo · 350 °C platea · circa 2 minuti + 30 secondi a bocca di forno',
    });
  });

  it('applica gli arrotondamenti sui tre panetti da 280 g', () => {
    const panetti = creaVistaRicetta(
      calcolaPerPanetti(RICETTA_CANOTTO, 3, 280),
      RICETTA_CANOTTO,
    );
    const voci = panetti.fasi.flatMap((fase) => fase.voci);

    expect(voci).toContainEqual({
      etichetta: 'Acqua',
      valore: '188 g',
      tipo: 'acqua',
    });
    expect(voci).toContainEqual({
      etichetta: 'Acqua',
      valore: '63 g',
      tipo: 'acqua',
    });
    expect(voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '100 g',
      tipo: 'acqua',
    });
    expect(voci).toContainEqual({
      etichetta: 'Lievito di birra fresco',
      valore: '3,4 g',
      tipo: 'lievito',
    });
    expect(voci).toContainEqual({
      etichetta: 'Malto diastasico',
      valore: '6,8 g',
      tipo: 'malto',
    });
    expect(voci).toContainEqual({
      etichetta: 'Sale',
      valore: '14 g',
      tipo: 'sale',
    });
    expect(voci).toContainEqual({
      etichetta: 'Olio extravergine',
      valore: '9,1 g',
      tipo: 'olio',
    });
  });
});
