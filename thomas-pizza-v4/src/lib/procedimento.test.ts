import { describe, expect, it } from 'vitest';
import {
  RICETTE,
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
} from '../config/ricette';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerTeglie,
} from './calcolo';
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
    expect(testo).toContain(
      'Dividilo quindi in 4 porzioni da circa 280 g ciascuna e forma i panetti.',
    );
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
      'Aggiungi il malto, il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben sviluppato.',
    );
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
      'Completa l’impasto (rinfresco)',
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
      'Dividilo quindi nelle porzioni previste e forma i panetti.',
    );
    expect(testo).not.toContain('0 porzioni');
    expect(testo).not.toContain('{');
  });

  it('per farina con pezzatura riporta i panetti interi e il residuo', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1, 280);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    );

    expect(testo).toContain(
      'Dividilo quindi in 6 porzioni da circa 280 g ciascuna e forma i panetti.',
    );
    expect(testo).not.toContain('porzioni previste');
    expect(testo).not.toContain('0 porzioni');
  });

  it('non introduce obblighi di raddoppio o timer di frigorifero', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    ).toLowerCase();

    expect(testo).toContain(
      'quando iniziano a crescere e a rilassarsi',
    );
    expect(testo).not.toContain('raddoppio');
    expect(testo).not.toContain('12 ore');
    expect(testo).not.toContain('24 ore in frigorifero');
    expect(testo).not.toContain('48 ore');
  });
});

describe('uniformità dei testi tra le ricette', () => {
  it('usa lo stesso testo per “Prepara l’autolisi” in entrambe le ricette con biga', () => {
    const autolisiTeglia = RICETTA_TEGLIA_BIGA.procedimento.find(
      (passo) => passo.titolo === 'Prepara l’autolisi',
    );
    const autolisiCanotto = RICETTA_CANOTTO.procedimento.find(
      (passo) => passo.titolo === 'Prepara l’autolisi',
    );

    expect(autolisiTeglia?.paragrafi).toEqual(autolisiCanotto?.paragrafi);
    expect(JSON.stringify(autolisiTeglia)).not.toMatch(/frigorifero|tutta la notte/i);
  });

  it('usa lo stesso titolo per l’impastamento finale e per l’appretto', () => {
    const titoliTeglia = RICETTA_TEGLIA_BIGA.procedimento.map((passo) => passo.titolo);
    const titoliCanotto = RICETTA_CANOTTO.procedimento.map((passo) => passo.titolo);

    expect(titoliTeglia).toContain('Completa l’impasto (rinfresco)');
    expect(titoliCanotto).toContain('Completa l’impasto (rinfresco)');
    expect(titoliTeglia).toContain('Seconda lievitazione (appretto)');
    expect(titoliCanotto).toContain('Seconda lievitazione (appretto)');
  });
});

describe('procedimento del Trancio Milanese', () => {
  const numero = (testo: string, espressione: RegExp): number =>
    Number(
      (espressione.exec(testo)?.[1] ?? '')
        .replace(/\./g, '')
        .replace(',', '.'),
    );

  it('con una teglia non divide l’impasto e lo lascia riposare sul piano', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1);
    const passi = componiProcedimento(RICETTA_TRANCIO, risultato);
    const testo = testoProcedimento(passi);

    expect(testo).not.toContain('Dividi l’impasto in');
    expect(testo).toContain('Ungi leggermente il piano di lavoro');
    expect(testo).toContain('Ungi bene la teglia.');
    expect(testo).not.toContain('{');
    expect(testo).not.toContain('riposo direttamente in teglia');
  });

  it('con più teglie divide dopo le pieghe e solo prima della lievitazione', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 3);
    const passi = componiProcedimento(RICETTA_TRANCIO, risultato);
    const testo = testoProcedimento(passi);
    const stesura = passi.find((passo) => passo.titolo === 'Stesura in teglia');

    expect(testo).toContain('Dividi l’impasto in 3 porzioni da circa');
    expect(testo).toContain('Ungi bene le teglie.');
    expect(stesura?.paragrafi.join(' ')).not.toContain('Dividi l’impasto');
  });

  it('separa l’acqua in 8/9 iniziali e il resto finale', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_TRANCIO, risultato),
    );

    expect(risultato.acquaTotaleG).toBeCloseTo(225, 6);
    expect(testo).toContain('in 200 g di acqua fredda');
    expect(testo).toContain('i restanti 25 g di acqua');
    expect(testo).toContain('aggiungi il sale e incorpora l’olio in tre riprese');
    expect(testo).not.toContain('struttura');
  });

  it('mantiene coerente la somma dell’acqua con altre dimensioni e più teglie', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 40, 60, 2);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_TRANCIO, risultato),
    );
    const iniziale = numero(testo, /in ([\d.,]+) g di acqua fredda/);
    const finale = numero(testo, /restanti ([\d.,]+) g di acqua/);

    expect(iniziale).toBeGreaterThan(0);
    expect(finale).toBeGreaterThan(0);
    expect(iniziale + finale).toBe(Math.round(risultato.acquaTotaleG));
    expect(testo).toContain('in 2 porzioni da circa');
  });

  it('non cita prodotti, proteine o la vecchia farina', () => {
    const testo = JSON.stringify(RICETTA_TRANCIO).toLowerCase();

    expect(testo).not.toContain('belbake');
    expect(testo).not.toContain('proteine');
    expect(testo).not.toContain('180–220');
    expect(testo).not.toContain('della prova');
    expect(testo).toContain('w 150–180');
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
      'La sera prima, fino al momento dell’impastamento finale',
    );
    expect(testo).toContain('trasferiscili in frigorifero a 4 °C');
    expect(testo).not.toContain('La sera prima, in frigorifero');
    expect(testo).not.toContain('temperatura ambiente; durata');
  });
});

describe('procedimento della pizza in teglia con biga', () => {
  it('senza autolisi non mostra passi né segnaposto dell’autolisi', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, { tipoLievito: 'fresco', autolisi: false });
    const passi = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato);
    const testo = testoProcedimento(passi);

    expect(passi.map((passo) => passo.titolo)).not.toContain(
      'Prepara l’autolisi',
    );
    expect(testo).toContain('Completa l’impasto (rinfresco)');
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-rinfresco'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-rinfresco'), 'acqua'),
    );
    expect(testo).not.toContain('(0 g)');
    expect(testo).toContain('scegliendone la temperatura in base a quella dell’ambiente e degli ingredienti');
    expect(testo).toContain('temperatura finale dell’impasto: circa 22–23 °C');
    expect(testo).not.toContain('preferendo acqua tiepida durante i mesi freddi');
    expect(testo).not.toContain('{');
  });

  it('non presenta i 20 minuti a temperatura ambiente come passaggio obbligatorio', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, { tipoLievito: 'fresco', autolisi: false });
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
    expect(passi.map((passo) => passo.titolo)).toContain(
      'Completa l’impasto (rinfresco)',
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'farina-autolisi'), 'farina'),
    );
    expect(testo).toContain(
      formattaGrammiIngrediente(grammiDi(risultato, 'acqua-finale'), 'acqua'),
    );
    expect(testo).not.toContain('{');
  });

  it('descrive puntata, staglio, appretto e le due cotture', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, { tipoLievito: 'fresco', autolisi: false });
    const passi = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato);
    const titoli = passi.map((passo) => passo.titolo);
    const testo = testoProcedimento(passi);

    expect(titoli).toEqual([
      'Prepara la biga',
      'Completa l’impasto (rinfresco)',
      'Rigenero, pieghe e puntata in massa',
      'Staglio e formatura dei panetti',
      'Seconda lievitazione (appretto)',
      'Stesura e preparazione della teglia',
      'Prima cottura — forno F1 P134H, pietra refrattaria',
      'Seconda cottura e farcitura',
    ]);
    expect(testo).toContain('circa 22–23 °C');
    expect(testo).toContain(
      'con la resistenza superiore spenta e quella inferiore impostata a 270 °C',
    );
    expect(testo).toContain('resistenza superiore a 250 °C per la pizza rossa');
    expect(testo).toContain('oppure a 230 °C per la pizza bianca');
    expect(testo).not.toContain('cielo');
    expect(testo).not.toContain('platea');
    expect(testo).not.toContain('sopra');
    expect(testo).not.toContain('sotto');
    expect(testo).toContain('fino a triplicare il volume');
    expect(testo).toContain('modalità statica al massimo');
    expect(testo).not.toContain('spezzetta');
    expect(testo).not.toContain('{');
  });
});
