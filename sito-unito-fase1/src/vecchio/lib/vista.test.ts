import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  RICETTA_TUTTOFARE,
  RICETTE,
} from '../config/ricette';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerProdotti,
  calcolaPerTeglie,
} from './calcolo';
import { creaVistaRicetta } from './vista';

describe('vista Pizza in teglia con biga', () => {
  const vista = creaVistaRicetta(
    calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, { tipoLievito: 'fresco', autolisi: false }),
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
    expect(vista.fasi[0].voci.map(({ etichetta, valore, tipo }) => ({ etichetta, valore, tipo }))).toEqual([
      { etichetta: 'Farina', valore: '850 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '468 g', tipo: 'acqua' },
      { etichetta: 'Lievito di birra fresco', valore: '8,5 g', tipo: 'lievito' },
    ]);
    expect(vista.fasi[0].totale).toEqual({
      etichetta: 'Totale biga pronta',
      valore: '1.326 g',
    });
    expect(vista.fasi[1].voci.map(({ etichetta, valore, tipo }) => ({ etichetta, valore, tipo }))).toEqual([
      { etichetta: 'Farina', valore: '150 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '333 g', tipo: 'acqua' },
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
        { etichetta: 'Idratazione della biga', valore: '55%' },
        { etichetta: 'Farina', valore: '00 forte, W 300–320' },
        { etichetta: 'Malto', valore: '2% della farina della biga' },
        { etichetta: 'Autolisi', valore: 'Non attiva' },
        {
          etichetta: 'Maturazione della biga',
          valore: '24 h a 4 °C',
        },
        { etichetta: 'Temperatura di chiusura', valore: '25 °C' },
      ]),
    );
    expect(vista.chiarimenti).toEqual([]);
  });

  it('non mostra più la nota sull’olio e il peso teorico', () => {
    expect(vista.noteEssenziali).toEqual([]);
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
    expect(vista.fasi[1].voci.map(({ etichetta, valore, tipo }) => ({ etichetta, valore, tipo }))).toEqual([
      { etichetta: 'Farina', valore: '150 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '83 g', tipo: 'acqua' },
    ]);
    expect(vista.fasi[2].voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua restante',
      valore: '250 g',
      tipo: 'acqua',
    }));
    expect(vista.parametri).toContainEqual(expect.objectContaining({
      etichetta: 'Autolisi',
      valore: 'Attiva',
    }));
  });
});

describe('vista Trancio Milanese', () => {
  const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2);
  const vista = creaVistaRicetta(risultato, RICETTA_TRANCIO);

  it('mostra resa con peso per teglia e tre indicatori', () => {
    expect(vista.resa).toBe(
      '2 teglie da 30 × 40 cm · 650 g di impasto per teglia',
    );
    expect(vista.statistiche).toEqual([
      { etichetta: 'Farina totale', valore: '750 g' },
      { etichetta: 'Peso teorico totale', valore: '1.300 g' },
      { etichetta: 'Idratazione', valore: '60%' },
    ]);
    expect(vista.dettagli).toEqual([]);
    // La nota sull'olio per ungere non compare più nel tab «Risultato».
    expect(vista.noteEssenziali).toEqual([]);
    expect(vista.note.join(' ')).not.toContain('Olio per ungere');
    expect(vista.chiarimenti.join(' ')).not.toContain('Olio per ungere');
  });

  it('usa un’unica fase Impasto e le dosi della farina debole', () => {
    expect(vista.fasi).toHaveLength(1);
    expect(vista.fasi[0].titolo).toBe('Impasto');
    expect(vista.fasi[0].voci.map(({ etichetta, valore, tipo }) => ({ etichetta, valore, tipo }))).toEqual([
      { etichetta: 'Farina debole', valore: '750 g', tipo: 'farina' },
      { etichetta: 'Acqua', valore: '450 g', tipo: 'acqua' },
      { etichetta: 'Lievito di birra fresco', valore: '12,0 g', tipo: 'lievito' },
      { etichetta: 'Malto diastasico', valore: '8,0 g', tipo: 'malto' },
      { etichetta: 'Miele', valore: '20 g', tipo: 'miele' },
      { etichetta: 'Sale', valore: '16 g', tipo: 'sale' },
      { etichetta: 'Olio extravergine', valore: '44 g', tipo: 'olio' },
    ]);
    expect(vista.parametri).toContainEqual(expect.objectContaining({
      etichetta: 'Farina',
      valore: 'Farina debole, indicativamente W 180–220',
    }));
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
    expect(vista.fasi[1].voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua',
      valore: '138 g',
      tipo: 'acqua',
    }));
    expect(vista.fasi[2].voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua restante',
      valore: '220 g',
      tipo: 'acqua',
    }));
    expect(vista.fasi[2].voci).toContainEqual(expect.objectContaining({
      etichetta: 'Malto diastasico',
      valore: '15,0 g',
      tipo: 'malto',
    }));
    expect(vista.parametri).toContainEqual(expect.objectContaining({
      etichetta: 'Malto',
      valore: '2% della farina della biga',
    }));
    expect(vista.noteEssenziali).toEqual([]);
    expect(vista.fasi[2].avviso).toContain('tutta la biga');
  });

  it('mostra l’autolisi attiva, facoltativa e i tempi aggiornati', () => {
    expect(vista.parametri).toContainEqual(expect.objectContaining({
      etichetta: 'Autolisi',
      valore: 'Attiva',
    }));
    expect(vista.parametri).toContainEqual(expect.objectContaining({
      etichetta: 'Maturazione della biga',
      valore: '24 h a 4 °C',
    }));
    expect(vista.parametri).not.toContainEqual(
      expect.objectContaining({ etichetta: 'Temperatura di chiusura' }),
    );

    const tempi = RICETTA_CANOTTO.tempiETemperature;
    expect(tempi).toContainEqual({
      etichetta: 'Autolisi',
      valore: 'La sera prima, fino al momento dell’impastamento finale',
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

    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua',
      valore: '188 g',
      tipo: 'acqua',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua',
      valore: '63 g',
      tipo: 'acqua',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Acqua restante',
      valore: '100 g',
      tipo: 'acqua',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Lievito di birra fresco',
      valore: '3,4 g',
      tipo: 'lievito',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Malto diastasico',
      valore: '6,8 g',
      tipo: 'malto',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Sale',
      valore: '14 g',
      tipo: 'sale',
    }));
    expect(voci).toContainEqual(expect.objectContaining({
      etichetta: 'Olio extravergine',
      valore: '9,1 g',
      tipo: 'olio',
    }));
  });
});

describe('riepilogo tecnico delle esportazioni', () => {
  const vista = creaVistaRicetta(
    calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2),
    RICETTA_TRANCIO,
  );

  it('separa i parametri della ricetta dalle quantità esportate', () => {
    expect(vista.riepilogoTecnico.map((gruppo) => gruppo.titolo)).toEqual([
      'Parametri della ricetta',
      'Quantità',
    ]);
  });

  it('riporta i parametri del Trancio con la base di calcolo', () => {
    expect(vista.riepilogoTecnico[0].voci).toEqual([
      {
        etichetta: 'Farina',
        valore: 'Farina debole, indicativamente W 180–220',
      },
      { etichetta: 'Idratazione', valore: '60% sulla farina totale' },
      { etichetta: 'Lievito di birra fresco', valore: '1,6% sulla farina totale' },
      { etichetta: 'Malto diastasico', valore: '1,07% sulla farina totale' },
      { etichetta: 'Miele', valore: '2,67% sulla farina totale' },
      { etichetta: 'Sale', valore: '2,13% sulla farina totale' },
      { etichetta: 'Olio extravergine', valore: '5,87% sulla farina totale' },
    ]);
  });

  it('riporta numero, dimensioni e pesi della specifica esportazione', () => {
    expect(vista.riepilogoTecnico[1].voci).toEqual([
      { etichetta: 'Numero di teglie', valore: '2' },
      { etichetta: 'Dimensioni della teglia', valore: '30 × 40 cm' },
      { etichetta: 'Impasto per teglia', valore: '650 g' },
      { etichetta: 'Farina totale', valore: '750 g' },
      { etichetta: 'Peso teorico totale', valore: '1.300 g' },
    ]);
  });

  it('per la teglia con biga mostra percentuali e basi della biga', () => {
    const parametri = creaVistaRicetta(
      calcolaPerTeglie(RICETTA_TEGLIA_BIGA, 30, 40, 1),
      RICETTA_TEGLIA_BIGA,
    ).riepilogoTecnico[0].voci;

    expect(parametri).toEqual(
      expect.arrayContaining([
        { etichetta: 'Farina nella biga', valore: '85% sulla farina totale' },
        {
          etichetta: 'Idratazione della biga',
          valore: '55% sulla farina della biga',
        },
        { etichetta: 'Idratazione', valore: '80% sulla farina totale' },
        {
          etichetta: 'Lievito di birra fresco',
          valore: '1% sulla farina della biga',
        },
        { etichetta: 'Autolisi', valore: 'Attivata' },
        {
          etichetta: 'Farina dell’autolisi',
          valore: '15% sulla farina totale',
        },
        {
          etichetta: 'Idratazione dell’autolisi',
          valore: '55% sulla farina dell’autolisi',
        },
        {
          etichetta: 'Malto diastasico',
          valore: '2% sulla farina della biga',
        },
        { etichetta: 'Sale', valore: '3% sulla farina totale' },
        { etichetta: 'Olio extravergine', valore: '4% sulla farina totale' },
      ]),
    );
  });

  it('senza autolisi dichiara lo stato e omette le percentuali della fase', () => {
    const parametri = creaVistaRicetta(
      calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, {
        tipoLievito: 'fresco',
        autolisi: false,
      }),
      RICETTA_TEGLIA_BIGA,
    ).riepilogoTecnico[0].voci;
    const etichette = parametri.map((voce) => voce.etichetta);

    expect(parametri).toContainEqual({
      etichetta: 'Autolisi',
      valore: 'Non attivata',
    });
    expect(etichette).not.toContain('Farina dell’autolisi');
    expect(etichette).not.toContain('Idratazione dell’autolisi');
  });

  it('per il Canotto senza autolisi riporta lo stato reale', () => {
    const parametri = creaVistaRicetta(
      calcolaPerPanetti(RICETTA_CANOTTO, 3, 280, {
        tipoLievito: 'secco',
        autolisi: false,
      }),
      RICETTA_CANOTTO,
    ).riepilogoTecnico[0].voci;

    expect(parametri).toContainEqual({
      etichetta: 'Autolisi',
      valore: 'Non attivata',
    });
    expect(parametri).toContainEqual({
      etichetta: 'Lievito di birra secco',
      valore: '0,6% sulla farina della biga',
    });
  });

  it('accompagna ogni percentuale con la base di calcolo', () => {
    const scenari = [
      creaVistaRicetta(calcolaPerTeglie(RICETTA_TEGLIA_BIGA, 30, 40, 1), RICETTA_TEGLIA_BIGA),
      creaVistaRicetta(calcolaPerPanetti(RICETTA_CANOTTO, 4, 250), RICETTA_CANOTTO),
      creaVistaRicetta(calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1), RICETTA_TRANCIO),
      creaVistaRicetta(
        calcolaPerProdotti(RICETTA_TUTTOFARE, [
          { id: 'focacce', quantita: 1, pesoG: 200 },
        ]),
        RICETTA_TUTTOFARE,
      ),
    ];

    for (const scenario of scenari) {
      for (const voce of scenario.riepilogoTecnico[0].voci) {
        // Le descrizioni della farina possono citare percentuali di proteine:
        // qui interessano solo le percentuali degli ingredienti.
        if (voce.valore.includes(' sulla farina ')) {
          expect(voce.valore).toMatch(
            /% sulla farina (totale|della biga|dell’autolisi)$/,
          );
        }
      }
    }

    expect(scenari.map((scenario) => scenario.descrizione)).toEqual(
      RICETTE.map((ricetta) => ricetta.descrizione),
    );
  });

  it('mostra le quantità dei panetti e della farina con i valori correnti', () => {
    const panetti = creaVistaRicetta(
      calcolaPerPanetti(RICETTA_CANOTTO, 3, 280),
      RICETTA_CANOTTO,
    ).riepilogoTecnico[1].voci;

    expect(panetti.slice(0, 2)).toEqual([
      { etichetta: 'Numero di panetti', valore: '3' },
      { etichetta: 'Peso di ciascun panetto', valore: '280 g' },
    ]);
    expect(panetti.slice(-2).map((voce) => voce.etichetta)).toEqual([
      'Farina totale',
      'Peso teorico totale',
    ]);

    const daFarina = creaVistaRicetta(
      calcolaPerFarina(RICETTA_TRANCIO, 0.75, null, undefined, {
        latoA: 30,
        latoB: 40,
      }),
      RICETTA_TRANCIO,
    ).riepilogoTecnico[1].voci;

    expect(daFarina).toContainEqual({ etichetta: 'Farina totale', valore: '750 g' });
    expect(daFarina).toContainEqual({
      etichetta: 'Teglie intere (stima)',
      valore: '2',
    });
  });
});

describe('vista autolisi', () => {
  it('esprime l’acqua dell’autolisi come percentuale della farina dell’autolisi', () => {
    const autolisi = creaVistaRicetta(
      calcolaPerFarina(RICETTA_TEGLIA_BIGA, 0.8, null, {
        tipoLievito: 'fresco',
        autolisi: true,
      }),
      RICETTA_TEGLIA_BIGA,
    );
    const voceAcqua = autolisi.fasi
      .find((fase) => fase.titolo.toLowerCase().includes('autolisi'))
      ?.voci.find((voce) => voce.tipo === 'acqua');

    // La percentuale è riferita alla farina dell’autolisi, non alla farina totale.
    expect(voceAcqua?.basePercentuale).toBe('farina dell’autolisi');
    expect(voceAcqua?.percentuale).toBeCloseTo(0.55, 5);
  });
});
