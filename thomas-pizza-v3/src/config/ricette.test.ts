import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  TIP_AUTOLISI,
} from './ricette';

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

  it('descrive la cottura nel forno F1 P134H in paragrafi ed elenco', () => {
    const cottura = voce(RICETTA_TEGLIA_BIGA, 'Cottura');

    expect(cottura?.valore).toBe(
      'Cottura nel forno F1 P134H con pietra refrattaria.',
    );
    expect(cottura?.paragrafi).toEqual([
      'Preriscalda il forno impostando entrambe le resistenze, superiore e inferiore, a 300 °C.',
      'Inforna e cuoci per i primi 5 minuti con la resistenza superiore spenta e quella inferiore impostata a 270 °C.',
      'Prosegui per altri 7 minuti, mantenendo la resistenza inferiore a 270 °C e impostando quella superiore:',
    ]);
    expect(cottura?.elenco).toEqual([
      'a 250 °C per la pizza rossa',
      'a 230 °C per la pizza bianca, limitandoti a una sola accensione della resistenza superiore',
    ]);
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

  it('lascia invariati i consigli del Trancio Milanese', () => {
    expect(RICETTA_TRANCIO.tips).toHaveLength(2);
    expect(RICETTA_TRANCIO.tips).not.toContain(TIP_AUTOLISI);
  });
});
