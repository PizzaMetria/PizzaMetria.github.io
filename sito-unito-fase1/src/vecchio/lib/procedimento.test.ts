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
      'Unisci tutta la biga e tutta l’autolisi all’acqua restante',
    );
    expect(testo).toContain(
      'Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione.',
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

  it('descrive l’appretto sullo sviluppo dei panetti, senza timer di frigorifero', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    ).toLowerCase();

    expect(testo).toContain('finché non aumentano di volume');
    expect(testo).toContain('indicativamente fino a circa il raddoppio');
    expect(testo).toContain('trasferiscili in frigorifero a 4 °c');
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
    expect(titoliTeglia).toContain('Fuori dal frigorifero / Appretto');
    expect(titoliCanotto).toContain('Fuori dal frigorifero / Appretto');
  });
});

describe('procedimento del Trancio Milanese', () => {
  const numero = (testo: string, espressione: RegExp): number =>
    Number(
      (espressione.exec(testo)?.[1] ?? '')
        .replace(/\./g, '')
        .replace(',', '.'),
    );

  it('riporta le dosi dinamiche di lievito, malto, miele, acqua e olio', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1);
    const passi = componiProcedimento(RICETTA_TRANCIO, risultato);
    const testo = testoProcedimento(passi);

    expect(risultato.acquaTotaleG).toBeCloseTo(225, 6);
    expect(testo).toContain('in 200 g di acqua');
    expect(testo).toContain('i restanti 25 g di acqua');

    // L'olio non ha una dose unica nel testo: entra solo nelle tre riprese.
    for (const [chiave, tipo] of [
      ['lievito', 'lievito'],
      ['malto', 'malto'],
      ['miele', 'miele'],
      ['sale', 'farina'],
    ] as const) {
      expect(testo, chiave).toContain(
        formattaGrammiIngrediente(grammiDi(risultato, chiave), tipo),
      );
    }

    // Le tre riprese dell'olio tornano il totale mostrato.
    const riprese = /olio in tre riprese \(([\d.,]+) g, ([\d.,]+) g e ([\d.,]+) g\)/.exec(
      testo,
    );
    expect(riprese).not.toBeNull();
    expect(
      numero(testo, /olio in tre riprese \(([\d.,]+) g/) +
        numero(testo, /, ([\d.,]+) g e/) +
        numero(testo, / e ([\d.,]+) g\)/),
    ).toBe(Math.round(grammiDi(risultato, 'olio')));
    expect(testo).not.toContain('{');
  });

  it('prevede 10 minuti di riposo dopo l’impastatura, non 10–15 dopo l’acqua', () => {
    const testo = testoProcedimento(
      componiProcedimento(
        RICETTA_TRANCIO,
        calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1),
      ),
    );

    expect(testo).not.toContain('spegni la macchina');
    expect(testo).not.toContain('lascia riposare l’impasto per 10–15 minuti');
    expect(testo).toContain(
      'Terminata l’impastatura, lascia riposare l’impasto per 10 minuti prima di passare alle pieghe.',
    );
    expect(testo).toContain(
      'La temperatura dell’acqua si regola in pratica: usa acqua più calda se farina e ingredienti sono freddi, acqua più fresca in estate o con l’ambiente caldo.',
    );
  });

  it('anticipa lo staglio per più teglie, prima della prima lievitazione', () => {
    const passi = componiProcedimento(
      RICETTA_TRANCIO,
      calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2),
    );
    const pieghe =
      passi
        .find((passo) => passo.titolo === 'Pieghe e riposo in teglia')
        ?.paragrafi.join(' ') ?? '';

    expect(pieghe).toContain('Dividi l’impasto in 2 porzioni da');
    expect(pieghe).toContain('una per teglia');
    // Lo staglio precede l'ingresso in teglia, quindi il riposo iniziale.
    expect(pieghe.indexOf('Dividi l’impasto')).toBeLessThan(
      pieghe.indexOf('Ungi leggermente la teglia'),
    );
  });

  it('usa i testi richiesti per pieghe, stesura, appretto e cottura', () => {
    const passi = componiProcedimento(
      RICETTA_TRANCIO,
      calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 1),
    );
    const passiTitoli = passi.map((passo) => passo.titolo);
    const paragrafi = (titolo: string) =>
      passi.find((passo) => passo.titolo === titolo)?.paragrafi.join(' ') ?? '';

    expect(passiTitoli).toEqual([
      'Impasto',
      'Pieghe e riposo in teglia',
      'Stesura in teglia',
      'Appretto e condimento',
      'Cottura nel forno F1 P134H',
    ]);

    const pieghe = paragrafi('Pieghe e riposo in teglia');
    expect(pieghe).toContain(
      'Togli l’impasto dall’impastatrice ed esegui un giro di pieghe solo per compattarlo, senza chiudere eccessivamente il panetto.',
    );
    expect(pieghe).toContain('Lascia riposare altri 10–15 minuti.');
    expect(pieghe).toContain(
      'L’impasto corrisponde a una porzione unica da 650 g: formala in un unico panetto.',
    );
    expect(pieghe).toContain('Ungi leggermente la teglia');
    expect(pieghe).not.toContain('20–30 minuti');
    expect(pieghe).not.toContain('chiudendo bene il panetto');

    expect(paragrafi('Stesura in teglia')).toBe(
      'Capovolgi il panetto: la parte che durante il riposo era rivolta verso l’alto deve andare a contatto con il fondo. Allargalo delicatamente in due o tre riprese, con brevi pause tra una e l’altra per permettergli di rilassarsi.',
    );

    const appretto = passi.find((passo) => passo.titolo === 'Appretto e condimento');
    expect(appretto?.paragrafi).toEqual([
      'Dopo la stesura, lascia lievitare l’impasto in teglia al caldo per circa 1 ora e mezza – 2 ore, coprendolo adeguatamente (ad esempio con un’altra teglia capovolta o un ulteriore velo d’olio in superficie) per evitare che si secchi. Successivamente, distribuisci la salsa e lascia riposare l’impasto per almeno altri 30 minuti. Nel frattempo, procedi con il preriscaldamento del forno.',
    ]);

    const cottura = paragrafi('Cottura nel forno F1 P134H');
    expect(cottura).toContain(
      'Preriscalda il forno impostando sia la platea (resistenza inferiore) che il cielo (resistenza superiore) a 300 °C.',
    );
    expect(cottura).toContain(
      'regola la temperatura a circa 250 °C sulla platea e tra 250 °C e 270 °C sul cielo',
    );
    expect(cottura).toContain(
      'aggiungendo la mozzarella o altri condimenti, se la pizza li prevede.',
    );
  });

  it('mantiene coerente la somma dell’acqua con altre dimensioni e più teglie', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 40, 60, 2);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_TRANCIO, risultato),
    );
    const iniziale = numero(testo, /in ([\d.,]+) g di acqua/);
    const finale = numero(testo, /restanti ([\d.,]+) g di acqua/);

    expect(risultato.farinaTotaleG).toBeCloseTo(1500, 6);
    expect(iniziale).toBeGreaterThan(0);
    expect(finale).toBeGreaterThan(0);
    expect(iniziale + finale).toBe(Math.round(risultato.acquaTotaleG));
  });

  it('non cita prodotti, proteine o la vecchia farina', () => {
    const testo = JSON.stringify(RICETTA_TRANCIO).toLowerCase();

    expect(testo).not.toContain('belbake');
    expect(testo).not.toContain('proteine');
    expect(testo).not.toContain('150–180');
    expect(testo).not.toContain('della prova');
    expect(testo).toContain('w 180–220');
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
      'La temperatura della biga a fine impasto deve essere di circa 25 °C',
    );
    expect(testo).toContain('matura 24 h a 4 °C');
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
      'Staglio / Formazione panetti',
      'Fuori dal frigorifero / Appretto',
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

describe('correzioni della versione 5.2', () => {
  const passiCanotto = (autolisi: boolean) =>
    componiProcedimento(
      RICETTA_CANOTTO,
      calcolaPerFarina(RICETTA_CANOTTO, 1, null, {
        tipoLievito: 'fresco',
        autolisi,
      }),
    );

  it('usa “Prima di impastare” come etichetta dell’autolisi nelle ricette con biga', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const autolisi = ricetta.fasi.find((fase) => fase.id === 'autolisi');
      expect(autolisi?.nota).toBe('Prima di impastare');
    }

    const etichette = JSON.stringify([RICETTA_TEGLIA_BIGA.fasi, RICETTA_CANOTTO.fasi]);
    expect(etichette).not.toContain('Facoltativa');
    expect(etichette).not.toContain('La sera prima');
  });

  it('prepara la biga con la stessa formulazione e le dosi dinamiche', () => {
    const bigaTeglia = RICETTA_TEGLIA_BIGA.procedimento.find(
      (passo) => passo.titolo === 'Prepara la biga',
    );
    const bigaCanotto = RICETTA_CANOTTO.procedimento.find(
      (passo) => passo.titolo === 'Prepara la biga',
    );
    expect(bigaTeglia?.paragrafi).toEqual(bigaCanotto?.paragrafi);

    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    );

    for (const chiave of ['farina-biga', 'acqua-biga', 'lievito'] as const) {
      const tipo = chiave === 'acqua-biga' ? 'acqua' : chiave === 'lievito' ? 'lievito' : 'farina';
      expect(testo).toContain(
        `da ${formattaGrammiIngrediente(grammiDi(risultato, chiave), tipo)}`,
      );
    }
    expect(testo).toContain('Il composto deve risultare grezzo ma uniforme');
    expect(testo).toContain('matura 24 h a 4 °C');
  });

  it('mostra un solo punto per il rinfresco e cita l’autolisi solo se attiva', () => {
    const conAutolisi = passiCanotto(true);
    const senzaAutolisi = passiCanotto(false);

    for (const passi of [conAutolisi, senzaAutolisi]) {
      expect(
        passi.filter((passo) => passo.titolo === 'Completa l’impasto (rinfresco)'),
      ).toHaveLength(1);
    }

    expect(testoProcedimento(conAutolisi)).toContain('tutta l’autolisi');
    expect(testoProcedimento(senzaAutolisi)).not.toContain('autolisi');
    expect(testoProcedimento(senzaAutolisi)).toContain('circa 15 minuti come riferimento');
    expect(testoProcedimento(senzaAutolisi)).toContain(
      'l’acqua indicata è già compresa nell’acqua totale',
    );
  });

  it('descrive la prima lievitazione con il riferimento di circa 30 minuti', () => {
    const risultato = calcolaPerPanetti(RICETTA_CANOTTO, 4, 280);
    const testo = testoProcedimento(
      componiProcedimento(RICETTA_CANOTTO, risultato),
    );

    expect(testo).toContain(
      'per il tempo necessario ad avviare la fermentazione (circa 30 minuti)',
    );
    expect(testo).toContain(
      'Dividilo quindi in 4 porzioni da circa 280 g ciascuna e forma i panetti.',
    );
  });

  it('prepara i panetti e il forno con 30–45 minuti di anticipo', () => {
    const testo = testoProcedimento(passiCanotto(true));

    expect(testo).toContain(
      'Togli i panetti dal frigorifero 30–45 minuti prima della stesura',
    );
    expect(testo).toContain('Preriscalda il forno con l’anticipo necessario.');
  });

  it('cuoce la pizza contemporanea senza riferimenti alla pala e senza frase finale', () => {
    const testo = testoProcedimento(passiCanotto(true));

    expect(testo).toContain('circa 400 °C di cielo e 350 °C di platea');
    expect(testo).toContain('Completa a bocca di forno la cottura per circa 30 secondi');
    expect(testo).not.toContain('pala');
    expect(testo).not.toContain('Tempi e temperature sono indicativi');
    expect(testo).not.toContain('Variante: basi da farcire');
  });

  it('sposta la variante delle basi da farcire nei Tips & Tricks', () => {
    expect(
      RICETTA_CANOTTO.procedimento.some((passo) =>
        passo.titolo.startsWith('Variante'),
      ),
    ).toBe(false);
    expect(JSON.stringify(RICETTA_CANOTTO.procedimento)).not.toContain(
      'stampo in alluminio',
    );
    expect(
      RICETTA_CANOTTO.tips.some((tip) => tip.startsWith('Basi da farcire:')),
    ).toBe(true);
  });

  it('aggiorna la cottura del Trancio e sostituisce la nota mozzarella con il salamino', () => {
    const cottura = RICETTA_TRANCIO.procedimento.find(
      (passo) => passo.titolo === 'Cottura nel forno F1 P134H',
    );
    const testo = (cottura?.paragrafi ?? []).join(' ');

    expect(testo).toContain(
      'Cuoci per circa 10 minuti, controllando il fondo e la superficie.',
    );
    expect(testo).toContain('ruotando la teglia di 180°');
    expect(testo).toContain(
      'aggiungendo la mozzarella o altri condimenti, se la pizza li prevede',
    );

    const tips = RICETTA_TRANCIO.tips.join(' ');
    expect(tips).not.toContain('aggiungila dopo i primi 10 minuti');
    expect(tips).toContain('Salamino piccante (pizza diavola)');
  });
});
