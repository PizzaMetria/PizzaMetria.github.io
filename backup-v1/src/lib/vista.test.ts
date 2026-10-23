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
    expect(vista.statistiche[1].valore).toBe('1.898,5 g');
    expect(vista.statistiche[2].valore).toBe('80%');
    expect(vista.resa).toBe('Dosi per 1 kg di farina');
  });

  it('mostra le fasi con le dosi arrotondate per ingrediente', () => {
    expect(vista.fasi.map((fase) => fase.titolo)).toEqual([
      'Biga',
      'Rinfresco',
    ]);
    expect(vista.fasi[0].voci).toEqual([
      { etichetta: 'Farina 00 forte', valore: '850 g' },
      { etichetta: 'Acqua', valore: '425 g' },
      { etichetta: 'Lievito di birra fresco', valore: '8,5 g' },
    ]);
    expect(vista.fasi[0].totale).toEqual({
      etichetta: 'Totale biga pronta',
      valore: '1.283,5 g',
    });
    expect(vista.fasi[1].voci).toEqual([
      { etichetta: 'Farina 00 forte', valore: '150 g' },
      { etichetta: 'Acqua', valore: '375 g' },
      { etichetta: 'Malto diastasico', valore: '20,0 g' },
      { etichetta: 'Sale', valore: '30 g' },
      { etichetta: 'Olio extravergine', valore: '40 g' },
    ]);
    expect(vista.fasi[1].avviso).toContain('Aggiungi tutta la biga');
  });

  it('mostra i parametri, l’autolisi non attiva e i chiarimenti', () => {
    expect(vista.parametri).toEqual(
      expect.arrayContaining([
        { etichetta: 'Farina nella biga', valore: '85% della farina totale' },
        { etichetta: 'Idratazione della biga', valore: '50%' },
        { etichetta: 'Farina', valore: '00 forte, W 300–320' },
        { etichetta: 'Autolisi', valore: 'Non attiva' },
        { etichetta: 'Conservazione della biga', valore: '24 ore a 4 °C' },
        { etichetta: 'Temperatura di chiusura', valore: '25 °C' },
      ]),
    );
    expect(vista.chiarimenti[0]).toContain(
      'Biga 85% indica la quota di farina totale utilizzata nella biga.',
    );
  });

  it('mostra la resa per panetti', () => {
    const panetti = creaVistaRicetta(
      calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710),
      RICETTA_TEGLIA_BIGA,
    );
    expect(panetti.resa).toBe('3 panetti da 710 g');
    expect(panetti.dettagli).toContainEqual({
      etichetta: 'Numero di panetti',
      valore: '3',
    });
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
      { etichetta: 'Farina 00 forte', valore: '150 g' },
      { etichetta: 'Acqua', valore: '83 g' },
    ]);
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '293 g',
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

  it('mostra resa, peso per teglia e superficie', () => {
    expect(vista.resa).toBe('2 teglie da 30 × 40 cm');
    expect(vista.statistiche[0]).toEqual({
      etichetta: 'Farina totale',
      valore: '750 g',
    });
    expect(vista.statistiche).toContainEqual({
      etichetta: 'Peso per teglia',
      valore: '649,5 g',
    });
    expect(vista.dettagli).toContainEqual({
      etichetta: 'Dimensioni della teglia',
      valore: '30 × 40 cm',
    });
    expect(vista.dettagli).toContainEqual({
      etichetta: 'Numero di teglie',
      valore: '2',
    });
  });

  it('usa un’unica fase Impasto e le dosi della farina debole', () => {
    expect(vista.fasi).toHaveLength(1);
    expect(vista.fasi[0].titolo).toBe('Impasto');
    expect(vista.fasi[0].voci).toEqual([
      { etichetta: 'Farina debole', valore: '750 g' },
      { etichetta: 'Acqua', valore: '450 g' },
      { etichetta: 'Lievito di birra fresco', valore: '11,0 g' },
      { etichetta: 'Malto diastasico', valore: '8,0 g' },
      { etichetta: 'Miele', valore: '20 g' },
      { etichetta: 'Sale', valore: '16 g' },
      { etichetta: 'Olio extravergine', valore: '44 g' },
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
    });
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '220 g',
    });
    expect(vista.fasi[2].voci).toContainEqual({
      etichetta: 'Malto diastasico',
      valore: '10,0 g',
    });
    expect(vista.fasi[2].avviso).toContain('tutta la biga');
  });

  it('mostra l’autolisi inclusa e i tempi aggiornati', () => {
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
      valore: 'La sera prima, a temperatura ambiente per tutta la notte',
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

    expect(voci).toContainEqual({ etichetta: 'Acqua', valore: '189 g' });
    expect(voci).toContainEqual({ etichetta: 'Acqua', valore: '63 g' });
    expect(voci).toContainEqual({
      etichetta: 'Acqua restante',
      valore: '101 g',
    });
    expect(voci).toContainEqual({
      etichetta: 'Lievito di birra fresco',
      valore: '3,4 g',
    });
    expect(voci).toContainEqual({
      etichetta: 'Malto diastasico',
      valore: '4,6 g',
    });
    expect(voci).toContainEqual({ etichetta: 'Sale', valore: '14 g' });
    expect(voci).toContainEqual({ etichetta: 'Olio extravergine', valore: '9,1 g' });
  });
});
