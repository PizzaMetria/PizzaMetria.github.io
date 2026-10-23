import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  TIP_AUTOLISI,
  TIP_RIPOSO_BIGA,
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

describe('Tips & Tricks condivisi dalle ricette con biga', () => {
  it('usa il consiglio sul riposo iniziale in entrambe le ricette', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      expect(ricetta.tips).toContain(TIP_RIPOSO_BIGA);
      expect(ricetta.tips).toContain(TIP_AUTOLISI);
    }
  });

  it('non duplica i consigli né lascia le versioni precedenti', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const testo = ricetta.tips.join('\n');

      expect(
        ricetta.tips.filter((tip) => tip === TIP_RIPOSO_BIGA),
      ).toHaveLength(1);
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

  it('presenta il riposo come riferimento e non come obbligo', () => {
    expect(TIP_RIPOSO_BIGA).toContain('indicativamente 30 minuti');
    expect(TIP_RIPOSO_BIGA).toContain('piccole dosi di biga');
    expect(TIP_RIPOSO_BIGA).not.toContain('obbligatori');
  });

  it('non rende obbligatoria l’autolisi e non impone la sera prima', () => {
    expect(TIP_AUTOLISI).toContain('L’autolisi è opzionale');
    expect(TIP_AUTOLISI).toContain('mezz’ora prima del rinfresco');
    expect(TIP_AUTOLISI).toContain('anche la sera precedente');
    expect(TIP_AUTOLISI).not.toContain('tutta la notte');
  });

  it('lascia invariati i consigli del Trancio Milanese', () => {
    expect(RICETTA_TRANCIO.tips).toHaveLength(2);
    expect(RICETTA_TRANCIO.tips).not.toContain(TIP_RIPOSO_BIGA);
    expect(RICETTA_TRANCIO.tips).not.toContain(TIP_AUTOLISI);
  });
});
