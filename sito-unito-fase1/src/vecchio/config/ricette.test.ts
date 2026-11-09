import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_PREDEFINITA,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  RICETTA_TUTTOFARE,
  RICETTE,
  TIP_AUTOLISI,
  trovaRicetta,
} from './ricette';
import { parametriScheda, sottotitoloRicetta, tipoImpasto } from '../lib/vista';
import { calcolaBigaSola } from '../lib/biga-sola';
import { calcolaPerPanetti } from '../lib/calcolo';
import { componiProcedimento } from '../lib/procedimento';

function voce(ricetta: typeof RICETTA_TEGLIA_BIGA, etichetta: string) {
  return ricetta.tempiETemperature.find((voce) => voce.etichetta === etichetta);
}

describe('tempi e temperature della pizza in teglia con biga', () => {
  it('indica chiusura e frigorifero senza «circa»', () => {
    const biga = voce(RICETTA_TEGLIA_BIGA, 'Biga');

    expect(biga?.valore).toBe(
      'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C',
    );
    expect(biga?.valore).not.toContain('circa');
  });

  it('non ripete la chiusura della biga come voce separata', () => {
    const etichette = RICETTA_TEGLIA_BIGA.tempiETemperature.map(
      (voce) => voce.etichetta,
    );

    expect(etichette).not.toContain('Chiusura della biga');
    expect(etichette).toContain('Biga');
  });

  it('lascia invariata la teglia di riferimento', () => {
    expect(voce(RICETTA_TEGLIA_BIGA, 'Teglia di riferimento')).toEqual({
      etichetta: 'Teglia di riferimento',
      valore: '40 × 30 cm · 710 g di impasto',
    });
  });

  it('descrive la prima cottura nel forno F1 P134H con resistenze coerenti', () => {
    const cottura = voce(RICETTA_TEGLIA_BIGA, 'Cottura');

    expect(cottura?.valore).toBe(
      'Prima cottura — forno F1 P134H, pietra refrattaria',
    );
    expect(cottura?.paragrafi).toEqual([
      'Preriscaldamento: preriscalda il forno a 300 °C con entrambe le resistenze.',
      'Prima fase: inforna la teglia con la resistenza superiore spenta e quella inferiore impostata a 270 °C. Cuoci per 5 minuti.',
      'Seconda fase: prosegui per altri 7 minuti, impostando la resistenza superiore a 250 °C per la pizza rossa oppure a 230 °C per la pizza bianca. Per quest’ultima, limita l’accensione della resistenza superiore a una sola volta.',
      'Sforna e fai raffreddare la base su una griglia.',
    ]);
    expect(cottura?.elenco).toBeUndefined();
    expect((cottura?.paragrafi ?? []).join(' ')).not.toMatch(
      /cielo|platea|sopra|sotto/,
    );
  });

  it('non estende la cottura della teglia alla Canotto', () => {
    const testoCanotto = JSON.stringify({
      tempi: RICETTA_CANOTTO.tempiETemperature,
      procedimento: RICETTA_CANOTTO.procedimento,
      tips: RICETTA_CANOTTO.tips,
    });

    expect(testoCanotto).not.toContain('P134H');
    expect(testoCanotto).not.toContain('pietra refrattaria');
    expect(voce(RICETTA_CANOTTO, 'Cottura pizza')?.valore).toBe(
      '400 °C cielo · 350 °C platea · circa 2 minuti + 30 secondi a bocca di forno',
    );
  });
});

describe('descrizioni dei prodotti', () => {
  it('usa le descrizioni approvate, un’unica fonte per home e esportazioni', () => {
    expect(RICETTA_TEGLIA_BIGA.descrizione).toBe(
      'Una base croccante e un interno leggero e arioso, con un’alveolatura aperta e irregolare.',
    );
    expect(RICETTA_CANOTTO.descrizione).toBe(
      'Un cornicione alto, soffice e alveolato racchiude un centro sottile: una pizza che si riconosce dal suo bordo generoso.',
    );
    expect(RICETTA_TRANCIO.descrizione).toBe(
      'Alto e morbido, con una mollica dall’alveolatura più fitta e uniforme e un fondo croccante dorato.',
    );
    expect(trovaRicetta(RICETTA_TEGLIA_BIGA.id).descrizione).toBe(
      RICETTA_TEGLIA_BIGA.descrizione,
    );
    expect(RICETTA_PREDEFINITA.descrizione).toBe(
      RICETTA_TEGLIA_BIGA.descrizione,
    );
  });

  it('non lascia nelle descrizioni i dati tecnici spostati nel riepilogo', () => {
    for (const ricetta of RICETTE) {
      expect(ricetta.descrizione).not.toMatch(/%|idratazione|autolisi|biga|W \d/i);
    }
  });

  it('usa i titoli aggiornati delle quattro ricette, prima le bighe', () => {
    expect(RICETTE.map((ricetta) => ricetta.nome)).toEqual([
      'Pizza in Teglia con biga',
      'Pizza Contemporanea con biga',
      'Trancio Milanese',
      'Impasto Tuttofare',
    ]);
  });

  it('usa lo stesso titolo e sottotitolo in elenco e nel riquadro della ricetta', () => {
    for (const ricetta of RICETTE) {
      // Elenco «Scegli la ricetta» e riquadro «Ricetta selezionata» leggono
      // dagli stessi campi: il testo non può divergere.
      expect(sottotitoloRicetta(ricetta)).toBe(
        ricetta.sottotitolo ?? ricetta.descrizione,
      );
      expect(sottotitoloRicetta(ricetta).length).toBeGreaterThan(0);
    }
  });
});

describe('procedimento e modalità della pizza in teglia con biga', () => {
  it('descrive la cottura nel forno F1 e il passaggio nel forno di casa', () => {
    const testo = JSON.stringify(RICETTA_TEGLIA_BIGA.procedimento);

    expect(testo).toContain('forno F1 P134H');
    expect(testo).toContain('modalità statica al massimo');
    expect(testo).not.toContain('massima temperatura');
    expect(testo).not.toContain('in due fasi');
  });

  it('conserva la stesura in teglia', () => {
    const titoli = RICETTA_TEGLIA_BIGA.procedimento.map((passo) => passo.titolo);

    expect(titoli).toContain('Stesura e preparazione della teglia');
  });

  it('permette di scegliere la misura della teglia', () => {
    expect(RICETTA_TEGLIA_BIGA.modalita).toContain('teglie');
    expect(RICETTA_TEGLIA_BIGA.tegliaRiferimento).toEqual({
      latoA: 30,
      latoB: 40,
    });
    expect(RICETTA_TEGLIA_BIGA.pesoImpastoTegliaG).toBe(710);
  });

  it('non estende le teglie alle ricette che non le prevedono', () => {
    expect(RICETTA_CANOTTO.modalita).not.toContain('teglie');
    expect(RICETTA_CANOTTO.tegliaRiferimento).toBeUndefined();
  });
});

describe('Tips & Tricks condivisi dalle ricette con biga', () => {
  it('usa il consiglio sull’autolisi in entrambe le ricette', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      expect(ricetta.tips).toContain(TIP_AUTOLISI);
    }
  });

  it('non duplica i consigli né lascia le versioni precedenti', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const testo = ricetta.tips.join('\n');

      expect(ricetta.tips.filter((tip) => tip === TIP_AUTOLISI)).toHaveLength(
        1,
      );
      expect(testo).not.toContain('lasciata 20 minuti a temperatura ambiente');
      expect(testo).not.toContain(
        'avvio di circa 30 minuti a temperatura ambiente, poi conservala',
      );
      expect(testo).not.toContain(
        'serve a idratare la farina del rinfresco prima dell’impastamento finale',
      );
      expect(testo).not.toContain(
        'prepara la sera precedente la farina del rinfresco',
      );
    }
  });

  it('non rende obbligatoria l’autolisi e non impone la sera prima', () => {
    expect(TIP_AUTOLISI).toContain('L’autolisi è opzionale');
    expect(TIP_AUTOLISI).toContain('mezz’ora prima del rinfresco');
    expect(TIP_AUTOLISI).toContain('anche la sera precedente');
    expect(TIP_AUTOLISI).not.toContain('tutta la notte');
  });

  it('spiega la temperatura di chiusura con il prefermento freddo', () => {
    const testo = RICETTA_TEGLIA_BIGA.tips.join(' ');

    expect(testo).toContain('prefermento freddo');
    expect(testo).toContain('acqua tiepida o calda nel rinfresco');
    expect(testo).toContain('22–23 °C');
    expect(testo).not.toContain('riparte con difficoltà');
  });

  it('mantiene i consigli del Trancio Milanese separati da quelli con biga', () => {
    const testo = RICETTA_TRANCIO.tips.join('\n');

    expect(RICETTA_TRANCIO.tips).not.toContain(TIP_AUTOLISI);
    expect(testo).toContain('aggiungi l’ultima parte d’acqua molto lentamente');
    expect(testo).toContain('Salamino piccante (pizza diavola)');
    expect(testo).toContain('prima di infornare');
    expect(testo).not.toContain('aggiungila dopo i primi 10 minuti');
  });
});

describe('correzioni della versione 5.4', () => {
  it('usa i consigli richiesti per il Trancio Milanese, senza la nota mozzarella', () => {
    const tips = RICETTA_TRANCIO.tips;

    expect(tips).toContain(
      'Per un impasto diretto al 60% di idratazione è adatta una farina debole, indicativamente W 180–220: garantisce morbidezza e non serve una farina forte.',
    );
    expect(tips).toContain(
      'Con una farina debole, aggiungi l’ultima parte d’acqua molto lentamente, lasciando che venga assorbita prima di versarne altra. Se l’impasto perde forza, evita di insistere con lavorazioni prolungate.',
    );
    expect(tips).toContain(
      'Salamino piccante (pizza diavola): se vuoi preparare una pizza con il salamino piccante, taglialo molto sottile e distribuiscilo direttamente sulla salsa prima di infornare. In questo modo cuoce insieme alla pizza fin dall’inizio, rilasciando meglio il suo gusto piccante.',
    );
    expect(tips).toContain(
      'Tieni in considerazione che il lievito secco tende a partire più lentamente rispetto al lievito fresco.',
    );

    const testo = tips.join(' ').toLowerCase();
    expect(testo).not.toContain('mozzarella');
    expect(testo).not.toContain('considera tempi di lievitazione più lunghi');
  });

  it('espone i contenuti richiesti dal riquadro dell’Impasto Tuttofare', () => {
    expect(RICETTA_TUTTOFARE.nome).toBe('Impasto Tuttofare');
    // Nessun sottotitolo: in «Scegli la ricetta» e in «Ricetta selezionata»
    // compare la stessa descrizione completa.
    expect(RICETTA_TUTTOFARE.sottotitolo).toBeUndefined();
    expect(sottotitoloRicetta(RICETTA_TUTTOFARE)).toBe(
      'Un unico impasto per focacce, pizzette, panini e bauletti. Scegli i formati, combina le quantità e calcola tutte le dosi in un’unica volta.',
    );
    expect(RICETTA_TUTTOFARE.farinaScheda).toBe('Farina forte W 280');
    expect(RICETTA_TUTTOFARE.notaScheda).toBe(
      'Impasto pratico e flessibile: pronto in circa 3 ore, oppure preparalo in anticipo e conservalo in frigo per il giorno successivo.',
    );
    expect(RICETTA_TUTTOFARE.tips).toContain(
      'Utilizza una farina forte, indicativamente W 280 e con almeno il 12% di proteine.',
    );

    const scheda = parametriScheda(RICETTA_TUTTOFARE);
    expect(scheda).toContainEqual({
      etichetta: 'Farina',
      valore: 'Farina forte W 280',
    });
    expect(scheda).toContainEqual({ etichetta: 'Formati', valore: '5' });
    expect(scheda).toContainEqual({
      etichetta: 'Idratazione',
      valore: '60%',
    });
  });

  it('deriva il badge del tipo di impasto dalla famiglia della ricetta', () => {
    expect(tipoImpasto(RICETTA_TEGLIA_BIGA)).toBe('Indiretto');
    expect(tipoImpasto(RICETTA_CANOTTO)).toBe('Indiretto');
    expect(tipoImpasto(RICETTA_TRANCIO)).toBe('Diretto');
    expect(tipoImpasto(RICETTA_TUTTOFARE)).toBe('Diretto');
  });
});

describe('testi aggiornati di biga e calcolatore', () => {
  const configBiga = () =>
    calcolaBigaSola({
      farinaKg: 1,
      temperatura: 21,
      temperaturaFrigo: 4,
      ore: 24,
      lievito: 'fresco',
    }).config;

  it('descrive la biga come prefermento che matura', () => {
    expect(configBiga().descrizione).toBe(
      'Solo prefermento: farina, acqua e lievito. L’idratazione varia in base a tempi e temperature, per avere sempre un prefermento maturo.',
    );
  });

  it('chiude la biga in ermetico e non la fa tornare a temperatura ambiente', () => {
    const passo = configBiga().procedimento.find(
      (voce) => voce.titolo === 'Lascia maturare',
    );
    const testo = passo?.paragrafi.join(' ') ?? '';

    expect(testo).toContain(
      'Chiudi la biga in un contenitore ermetico e lasciala maturare',
    );
    expect(testo).toContain('usala direttamente nell’impasto finale');
    expect(testo).not.toContain('formano profumo e forza');
  });

  it('toglie dal procedimento della ricetta la frase sul motore', () => {
    const risultato = calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710);
    const testo = componiProcedimento(RICETTA_TEGLIA_BIGA, risultato)
      .flatMap((passo) => passo.paragrafi)
      .join(' ');

    expect(testo).not.toContain('la decide il motore con l’attesa scelta');
    expect(testo).toContain('di idratazione)');
  });

  it('scrive W 280 senza simbolo di potenza', () => {
    expect(RICETTA_TUTTOFARE.farinaScheda).toBe('Farina forte W 280');
    expect(RICETTA_TUTTOFARE.tips.join(' ')).not.toContain('≥');
  });
});
