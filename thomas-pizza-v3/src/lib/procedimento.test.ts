import { describe, expect, it } from 'vitest';
import {
  RICETTE,
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
} from '../config/ricette';
import { calcolaPerFarina, calcolaPerPanetti } from './calcolo';
import { formattaGrammiIngrediente } from './formato';
import { componiProcedimento } from './procedimento';
import { grammiDi } from './vista';

function testoProcedimento(
  passi: ReturnType<typeof componiProcedimento>,
): string {
  return passi
    .flatMap((passo) => [passo.titolo, ...passo.paragrafi])
    .join(' ');
}

describe('procedimento della Canotto', () => {
  it('inserisce le dosi effettive del calcolo e lo staglio richiesto', () => {
    const risultato = calcolaPerPanetti(RICETTA_CANOTTO, 4, 280);
    const passi = componiProcedimento(RICETTA_CANOTTO, risultato);
    const testo = testoProcedimento(passi);

    expect(testo).not.toContain('{');
    expect(testo).toContain('Forma 4 panetti da 280 g.');
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-biga'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-biga'), 'acqua'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'lievito'), 'lievito'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-autolisi'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-autolisi'), 'acqua'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-finale'), 'acqua'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(risultato.acquaTotaleG, 'acqua'),
    );
    expect(testo).toContain('già compresa nell’acqua totale');
  });

  it('senza autolisi impasta la farina del rinfresco con la biga', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1, null, {
      tipoLievito: 'fresco',
      autolisi: false,
    });
    const passi = componiProcedimento(RICETTA_CANOTTO, risultato);
    const testo = testoProcedimento(passi);

    expect(passi.map((passo) => passo.titolo)).not.toContain(
      'Prepara l’autolisi',
    );
    expect(passi.map((passo) => passo.titolo)).toContain(
      'Impasta la biga con la farina',
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-rinfresco'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-finale'), 'acqua'),
    );
    expect(testo).not.toContain('{');
  });

  it('per farina senza pezzatura usa la formulazione generica', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    );

    expect(testo).toContain(
      'Dividi l’impasto nella pezzatura desiderata e forma i panetti.',
    );
    expect(testo).not.toContain('Forma 0 panetti');
    expect(testo).not.toContain('{');
  });

  it('per farina con pezzatura riporta i panetti interi e il residuo', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1, 280);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    );

    expect(testo).toContain('Forma 6 panetti da 280 g.');
    expect(testo).toContain('porzione più piccola');
    expect(testo).not.toContain('pezzatura desiderata');
  });

  it('non introduce obblighi di raddoppio o timer di frigorifero', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    ).toLowerCase();

    expect(testo).toContain('senza aspettare obbligatoriamente il raddoppio');
    expect(testo).not.toContain('12 ore');
    expect(testo).not.toContain('24 ore in frigorifero');
    expect(testo).not.toContain('48 ore');
  });
});

describe('testi pubblici delle ricette', () => {
  it('non espone note interne, appunti o dati mancanti', () => {
    const testo = JSON.stringify(
      RICETTE.map((ricetta) => ({
        nome: ricetta.nome,
        descrizione: ricetta.descrizione,
        tempi: ricetta.tempiETemperature,
        procedimento: ricetta.procedimento,
        note: ricetta.note,
        condimenti: ricetta.condimentiFacoltativi,
      })),
    ).toLowerCase();

    for (const espressione of [
      'appunti',
      'non specificat',
      'non viene',
      'normalizzat',
      'informazioni non specificate',
      'istruzioni per lo sviluppatore',
    ]) {
      expect(testo, espressione).not.toContain(espressione);
    }
  });

  it('descrive il malto delle ricette con biga sulla farina della biga', () => {
    const testoTeglia = JSON.stringify({
      descrizione: RICETTA_TEGLIA_BIGA.descrizione,
      note: RICETTA_TEGLIA_BIGA.note,
      tempi: RICETTA_TEGLIA_BIGA.tempiETemperature,
    });
    const testoCanotto = JSON.stringify({
      descrizione: RICETTA_CANOTTO.descrizione,
      note: RICETTA_CANOTTO.note,
      tempi: RICETTA_CANOTTO.tempiETemperature,
    });

    expect(testoTeglia).toContain('2% della farina della biga');
    expect(testoTeglia).not.toContain('2% della farina totale');
    expect(testoCanotto).toContain('2% della farina della biga');
    expect(testoCanotto).not.toContain('1% della farina totale');
  });

  it('allinea gli avvisi della biga senza riposo a temperatura ambiente', () => {
    const bigaTeglia = RICETTA_TEGLIA_BIGA.fasi.find((fase) => fase.id === 'biga');

    expect(bigaTeglia?.avviso).toBe(
      'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C.',
    );
    expect(RICETTA_TEGLIA_BIGA.tempiETemperature).toContainEqual({
      etichetta: 'Biga',
      valore: 'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C',
    });
    expect(RICETTA_CANOTTO.fasi[0].avviso).toBe(
      'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C.',
    );
    expect(RICETTA_TEGLIA_BIGA.tips.join(' ')).not.toContain('30 minuti');
    expect(RICETTA_CANOTTO.tips.join(' ')).not.toContain('30 minuti');
  });

  it('usa 4 °C per biga e panetti e temperatura ambiente per l’autolisi', () => {
    const testo = JSON.stringify({
      tempi: RICETTA_CANOTTO.tempiETemperature,
      procedimento: RICETTA_CANOTTO.procedimento,
      note: RICETTA_CANOTTO.note,
    });

    expect(RICETTA_CANOTTO.temperaturaConservazioneBiga).toBe(4);
    expect(testo).toContain('24 ore a 4 °C');
    expect(testo).toContain(
      'Facoltativa: la sera prima, a temperatura ambiente per tutta la notte',
    );
    expect(testo).toContain('panetti in frigorifero a 4 °C');
    expect(testo).not.toContain('La sera prima, in frigorifero');
    expect(testo).not.toContain('temperatura ambiente; durata');
  });
});

describe('procedimento della pizza in teglia con biga', () => {
  it('senza autolisi non mostra passi né segnaposto dell’autolisi', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1);
    const passi = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato);
    const testo = testoProcedimento(passi);

    expect(passi.map((passo) => passo.titolo)).not.toContain(
      'Prepara l’autolisi',
    );
    expect(testo).toContain('Rinfresca l’impasto');
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-rinfresco'), 'farina'),
    );
    expect(testo).not.toContain('{');
  });

  it('non presenta i 20 minuti a temperatura ambiente come passaggio obbligatorio', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_TEGLIA_BIGA, risultato),
    );

    expect(testo).toContain(
      'La temperatura della biga a fine impasto deve essere circa 25 °C',
    );
    expect(testo).toContain('in frigorifero a 4 °C per circa 24 ore');
    expect(testo).not.toContain('20 minuti a temperatura ambiente');
  });

  it('con autolisi mostra i passi dedicati e le dosi effettive', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, {
      tipoLievito: 'fresco',
      autolisi: true,
    });
    const passi = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato);
    const testo = testoProcedimento(passi);

    expect(passi.map((passo) => passo.titolo)).toContain('Prepara l’autolisi');
    expect(passi.map((passo) => passo.titolo)).toContain('Completa l’impasto');
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-autolisi'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-finale'), 'acqua'),
    );
    expect(testo).not.toContain('{');
  });
});
