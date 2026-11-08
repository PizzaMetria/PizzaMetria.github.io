import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  derivaRicetta,
  opzioniIniziali,
} from '../config/ricette';
import {
  calcolaDaFarinaTotale,
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerTeglie,
  sommaIngredienti,
} from './calcolo';
import { grammiDi } from './vista';

const tegliaBiga = RICETTA_TEGLIA_BIGA;
const trancio = RICETTA_TRANCIO;
const canotto = RICETTA_CANOTTO;

const fresco = opzioniIniziali(tegliaBiga);

function vicino(attuale: number, atteso: number, cifre = 9) {
  expect(attuale).toBeCloseTo(atteso, cifre);
}

describe('configurazione Pizza in teglia con biga', () => {
  it('deriva un fattore di peso pari a 1,8955 con lievito fresco', () => {
    const { fattorePeso, quotaFarinaRinfresco } = derivaRicetta(tegliaBiga);
    vicino(fattorePeso, 1.8955, 12);
    vicino(quotaFarinaRinfresco, 0.15, 12);
  });

  it('riduce il peso quando si usa il lievito secco', () => {
    const secco = derivaRicetta(tegliaBiga, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    vicino(secco.fattorePeso, 1.8955 - 8.5 * 0.4 / 1000, 12);
  });
});

describe('base di calcolo del malto', () => {
  it('usa la farina della biga, non quella totale', () => {
    const conTeglia = calcolaPerFarina(tegliaBiga, 1);
    vicino(grammiDi(conTeglia, 'malto'), 850 * 0.02);

    const conCanotto = calcolaPerFarina(canotto, 1);
    vicino(grammiDi(conCanotto, 'malto'), 750 * 0.02);
  });

  it('a farina totale fissata segue la quota di farina nella biga', () => {
    const meta = calcolaPerFarina(
      { ...tegliaBiga, quotaFarinaBiga: 0.5 },
      1,
    );
    vicino(grammiDi(meta, 'malto'), 1000 * 0.5 * 0.02);

    const tutta = calcolaPerFarina({ ...tegliaBiga, quotaFarinaBiga: 1 }, 1);
    vicino(grammiDi(tutta, 'malto'), 1000 * 0.02);
    vicino(grammiDi(tutta, 'malto'), 1000 * 0.02 * 1);
  });

  it('rispetta il peso richiesto con la nuova formula', () => {
    const r = calcolaPerPanetti(tegliaBiga, 3, 710);
    vicino(r.pesoImpastoG, 2130, 6);
    vicino(r.farinaTotaleG, 2130 / 1.8955, 9);
    vicino(
      grammiDi(r, 'malto'),
      r.farinaTotaleG * (tegliaBiga.quotaFarinaBiga ?? 0) * 0.02,
    );
  });

  it('non cambia il malto degli impasti diretti', () => {
    const r = calcolaPerTeglie(trancio, 30, 40, 1);
    vicino(grammiDi(r, 'malto'), 4);
  });
});

describe('Pizza in teglia con biga — 1 kg di farina', () => {
  const risultato = calcolaPerFarina(tegliaBiga, 1, null, { tipoLievito: 'fresco', autolisi: false });

  it('rispetta biga all’85%, idratazione 80% e malto al 2%', () => {
    vicino(grammiDi(risultato, 'farina-biga'), 850);
    // Il motore decide l'idratazione della biga: con 24 h a 21 °C, di cui una
    // parte in frigo, resta al 55 %.
    vicino(grammiDi(risultato, 'acqua-biga'), 467.5);
    vicino(grammiDi(risultato, 'lievito'), 8.5);
    vicino(grammiDi(risultato, 'farina-rinfresco'), 150);
    vicino(grammiDi(risultato, 'acqua-rinfresco'), 332.5);
    vicino(grammiDi(risultato, 'malto'), 17);
    vicino(grammiDi(risultato, 'sale'), 30);
    vicino(grammiDi(risultato, 'olio'), 40);
    vicino(risultato.acquaTotaleG, 800);
    vicino(risultato.pesoImpastoG, 1895.5);
  });

  it('l’ora in cui la biga è pronta decide l’attesa', () => {
    const conOrari = calcolaPerFarina(tegliaBiga, 1, null, {
      tipoLievito: 'fresco',
      autolisi: false,
      biga: {
        temperatura: 21,
        ore: 24,
        temperaturaFrigo: 4,
        oraImpasto: '08:00',
        oraPronta: '18:00',
      },
    });

    // Dieci ore, non le 24 salvate: comandano gli orari.
    expect(conOrari.pianoBiga?.oreTotali).toBeCloseTo(10, 6);
    expect(conOrari.pianoBiga?.idratazione).toBeGreaterThan(40);
  });

  it('non ha fasi di autolisi quando è disattivata', () => {
    expect(risultato.fasi.map((fase) => fase.id)).toEqual([
      'biga',
      'rinfresco',
    ]);
    expect(risultato.pesoAutolisiG).toBeUndefined();
    expect(risultato.acquaFinaleG).toBeCloseTo(332.5, 9);
  });

  it('calcola l’acqua del rinfresco come resto dell’acqua totale', () => {
    vicino(
      grammiDi(risultato, 'acqua-biga') + grammiDi(risultato, 'acqua-rinfresco'),
      risultato.acquaTotaleG,
    );
  });
});

describe('Pizza in teglia con biga — autolisi facoltativa', () => {
  const conAutolisi = calcolaPerFarina(tegliaBiga, 1, null, {
    tipoLievito: 'fresco',
    autolisi: true,
  });

  it('aggiunge biga, autolisi e impastamento finale', () => {
    expect(conAutolisi.fasi.map((fase) => fase.titolo)).toEqual([
      'Biga',
      'Autolisi',
      'Impastamento finale',
    ]);
    vicino(grammiDi(conAutolisi, 'farina-autolisi'), 150);
    vicino(grammiDi(conAutolisi, 'acqua-autolisi'), 82.5);
    vicino(grammiDi(conAutolisi, 'acqua-finale'), 250);
    vicino(conAutolisi.pesoAutolisiG ?? -1, 232.5);
  });

  it('mantiene acqua e peso totali invariati', () => {
    vicino(conAutolisi.acquaTotaleG, 800);
    vicino(conAutolisi.pesoImpastoG, 1895.5);
    vicino(
      grammiDi(conAutolisi, 'acqua-biga') +
        grammiDi(conAutolisi, 'acqua-autolisi') +
        grammiDi(conAutolisi, 'acqua-finale'),
      800,
    );
  });

  it('non conta biga e autolisi due volte', () => {
    const fasi =
      (conAutolisi.pesoBigaG ?? 0) +
      (conAutolisi.pesoAutolisiG ?? 0) +
      grammiDi(conAutolisi, 'acqua-finale') +
      grammiDi(conAutolisi, 'malto') +
      grammiDi(conAutolisi, 'sale') +
      grammiDi(conAutolisi, 'olio');
    vicino(conAutolisi.pesoImpastoG, fasi);
  });
});

describe('lievito secco', () => {
  it('applica il fattore 0,6 alla biga e mostra il peso reale', () => {
    const risultato = calcolaPerFarina(tegliaBiga, 1, null, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    vicino(grammiDi(risultato, 'lievito'), 5.1);
    vicino(risultato.pesoImpastoG, 1892.1);
    expect(
      risultato.ingredienti.find((voce) => voce.chiave === 'lievito')?.etichetta,
    ).toBe('Lievito di birra secco');
  });

  it('applica il fattore 0,67 al Trancio Milanese', () => {
    const risultato = calcolaPerFarina(trancio, 0.375, null, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    vicino(grammiDi(risultato, 'lievito'), 6 * 0.67);
    vicino(risultato.pesoImpastoG, 650 - 6 * 0.33);
  });

  it('applica il fattore 0,6 alla Canotto', () => {
    const risultato = calcolaPerFarina(canotto, 1, null, {
      tipoLievito: 'secco',
      autolisi: true,
    });
    vicino(grammiDi(risultato, 'lievito'), 7.5 * 0.6);
    vicino(risultato.pesoImpastoG, 1842.5 - 7.5 * 0.4);
  });
});

describe('Trancio Milanese — teglie', () => {
  it('una teglia 30 × 40 rispetta le dosi di riferimento', () => {
    const r = calcolaPerTeglie(trancio, 30, 40, 1);
    vicino(grammiDi(r, 'farina'), 375);
    vicino(grammiDi(r, 'acqua'), 225);
    vicino(grammiDi(r, 'lievito'), 6);
    vicino(grammiDi(r, 'malto'), 4);
    vicino(grammiDi(r, 'miele'), 10);
    vicino(grammiDi(r, 'sale'), 8);
    vicino(grammiDi(r, 'olio'), 22);
    vicino(r.pesoImpastoG, 650);
    expect(r.acquaTotaleG / r.farinaTotaleG).toBeCloseTo(0.6, 9);
  });

  it('due teglie raddoppiano dosi e peso', () => {
    const r = calcolaPerTeglie(trancio, 30, 40, 2);
    vicino(grammiDi(r, 'farina'), 750);
    vicino(grammiDi(r, 'lievito'), 12);
    vicino(r.pesoImpastoG, 1300);
    vicino(r.pesoPerTegliaG ?? -1, 650);
  });

  it('una teglia 40 × 60 equivale a due teglie di riferimento', () => {
    const r = calcolaPerTeglie(trancio, 40, 60, 1);
    vicino(r.farinaTotaleG, 750);
    vicino(r.pesoImpastoG, 1300);
  });

  it('accetta dimensioni rettangolari personalizzate', () => {
    const r = calcolaPerTeglie(trancio, 25, 35, 3);
    vicino(r.farinaTotaleG, 375 * ((25 * 35) / 1200) * 3);
  });
});

describe('Trancio Milanese — panetti', () => {
  it('ricava le dosi da numero e peso dei panetti', () => {
    const r = calcolaPerPanetti(trancio, 3, 300);

    vicino(r.pesoImpastoG, 900, 6);
    vicino(r.farinaTotaleG, 900 / (1.6 + 50 / 375), 6);
    vicino(grammiDi(r, 'sale'), r.farinaTotaleG * (8 / 375), 6);
    vicino(r.pesoPanettoG ?? -1, 300);
    expect(r.numeroPanetti).toBe(3);
  });

  it('resta coerente con il calcolo per teglie', () => {
    const panetti = calcolaPerPanetti(trancio, 4, 325);
    const teglie = calcolaPerTeglie(trancio, 30, 40, 2);

    vicino(panetti.farinaTotaleG, teglie.farinaTotaleG, 6);
    vicino(panetti.pesoImpastoG, teglie.pesoImpastoG, 6);
  });

  it('è disponibile fra le modalità, senza cambiare quella predefinita', () => {
    expect(RICETTA_TRANCIO.modalita).toContain('panetti');
    expect(RICETTA_TRANCIO.modalita[0]).toBe('teglie');
  });
});

describe('Trancio Milanese — farina', () => {
  it('0,375 kg corrisponde esattamente alla ricetta base', () => {
    const r = calcolaPerFarina(trancio, 0.375);
    vicino(grammiDi(r, 'farina'), 375);
    vicino(r.pesoImpastoG, 650);
  });

  it('stima le teglie intere senza eccessi', () => {
    const r = calcolaPerFarina(trancio, 1, null, fresco, {
      latoA: 30,
      latoB: 40,
    });
    const stima = r.stimaTeglie;
    if (!stima) throw new Error('Stima mancante');
    expect(stima.intere).toBe(2);
    vicino(stima.pesoPerTegliaG, 650);
    vicino(stima.residuoG, r.pesoImpastoG - 2 * 650);
  });

  it('senza dimensioni non produce una stima', () => {
    const r = calcolaPerFarina(trancio, 1);
    expect(r.stimaTeglie).toBeNull();
  });
});

describe('Canotto 77%', () => {
  it('1 kg di farina rispetta tutte le percentuali', () => {
    const r = calcolaPerFarina(canotto, 1);
    vicino(grammiDi(r, 'farina-biga'), 750);
    vicino(grammiDi(r, 'acqua-biga'), 412.5);
    vicino(grammiDi(r, 'lievito'), 7.5);
    vicino(grammiDi(r, 'farina-autolisi'), 250);
    vicino(grammiDi(r, 'acqua-autolisi'), 137.5);
    vicino(grammiDi(r, 'acqua-finale'), 220);
    vicino(r.acquaTotaleG, 770);
    vicino(grammiDi(r, 'olio'), 20);
    vicino(grammiDi(r, 'sale'), 30);
    vicino(grammiDi(r, 'malto'), 15);
    vicino(r.pesoImpastoG, 1842.5);
    vicino(r.fattorePeso, 1.8425, 12);
  });

  it('tre panetti da 280 g usano il fattore 1,8425', () => {
    const r = calcolaPerPanetti(canotto, 3, 280);
    vicino(r.pesoImpastoG, 840);
    vicino(r.farinaTotaleG, 840 / 1.8425);
    vicino(sommaIngredienti(r), 840, 9);
    vicino(
      grammiDi(r, 'malto'),
      r.farinaTotaleG * (canotto.quotaFarinaBiga ?? 0) * 0.02,
    );
  });

  it('riporta nelle fasi gli avvisi della configurazione', () => {
    const r = calcolaPerFarina(canotto, 1);
    expect(r.fasi[0].avviso).toBe(canotto.fasi[0].avviso);
    expect(r.fasi[0].avviso).toContain('4 °C');
    expect(r.fasi[2].avviso).toBe(canotto.fasi[2].avviso);
  });

  it('la somma delle acque è l’acqua totale', () => {
    const r = calcolaPerFarina(canotto, 2.2);
    vicino(
      grammiDi(r, 'acqua-biga') +
        grammiDi(r, 'acqua-autolisi') +
        grammiDi(r, 'acqua-finale'),
      r.acquaTotaleG,
    );
  });

  it('senza autolisi la farina del rinfresco entra nell’impasto finale', () => {
    const r = calcolaPerFarina(canotto, 1, null, {
      tipoLievito: 'fresco',
      autolisi: false,
    });
    expect(r.fasi.map((fase) => fase.id)).toEqual(['biga', 'finale']);
    expect(r.pesoAutolisiG).toBeUndefined();
    vicino(grammiDi(r, 'farina-rinfresco'), 250);
    vicino(grammiDi(r, 'acqua-finale'), 357.5);
    vicino(grammiDi(r, 'acqua-biga'), 412.5);
    vicino(r.acquaTotaleG, 770);
    vicino(r.pesoImpastoG, 1842.5);
  });

  it('con autolisi attiva mantiene la ripartizione della ricetta', () => {
    const r = calcolaPerFarina(canotto, 1, null, {
      tipoLievito: 'fresco',
      autolisi: true,
    });
    expect(r.fasi.map((fase) => fase.id)).toEqual([
      'biga',
      'autolisi',
      'finale',
    ]);
    vicino(grammiDi(r, 'farina-autolisi'), 250);
    vicino(grammiDi(r, 'acqua-autolisi'), 137.5);
    vicino(grammiDi(r, 'acqua-finale'), 220);
  });
});

describe('Pizza in teglia con biga — teglie', () => {
  it('usa un panetto da 710 g per la teglia 30 × 40', () => {
    const r = calcolaPerTeglie(tegliaBiga, 30, 40, 1);

    vicino(r.pesoImpastoG, 710, 6);
    vicino(r.pesoPerTegliaG ?? -1, 710, 6);
    vicino(r.farinaTotaleG, 710 / derivaRicetta(tegliaBiga).fattorePeso, 6);
  });

  it('scala con la superficie e con il numero di teglie', () => {
    const una = calcolaPerTeglie(tegliaBiga, 30, 40, 1);
    const grande = calcolaPerTeglie(tegliaBiga, 40, 60, 1);
    const tre = calcolaPerTeglie(tegliaBiga, 30, 40, 3);

    vicino(grande.pesoImpastoG, una.pesoImpastoG * 2, 6);
    vicino(tre.pesoImpastoG, 2130, 6);
    vicino(tre.pesoPerTegliaG ?? -1, 710, 6);
  });

  it('mantiene il peso per teglia anche con il lievito secco', () => {
    const secco = calcolaPerTeglie(tegliaBiga, 30, 40, 1, {
      tipoLievito: 'secco',
      autolisi: false,
    });

    vicino(secco.pesoImpastoG, 710, 6);
  });
});

describe('conversioni e protezioni', () => {
  it('la farina dei panetti ricostruisce gli stessi ingredienti', () => {
    const daPanetti = calcolaPerPanetti(tegliaBiga, 3, 710);
    const daFarina = calcolaPerFarina(tegliaBiga, daPanetti.farinaTotaleG / 1000);
    vicino(daFarina.farinaTotaleG, daPanetti.farinaTotaleG, 9);
    vicino(daFarina.pesoImpastoG, daPanetti.pesoImpastoG, 9);
    vicino(grammiDi(daFarina, 'sale'), grammiDi(daPanetti, 'sale'), 9);
  });

  it('calcolaDaFarinaTotale rifiuta i valori non validi', () => {
    expect(() => calcolaDaFarinaTotale(tegliaBiga, 0)).toThrow(RangeError);
  });

  it('non restituisce valori NaN o infiniti', () => {
    const r = calcolaPerFarina(tegliaBiga, 0.001);
    for (const ingrediente of r.ingredienti) {
      expect(Number.isFinite(ingrediente.grammi)).toBe(true);
    }
    expect(Number.isFinite(r.pesoImpastoG)).toBe(true);
  });

  it('rifiuta valori non validi', () => {
    expect(() => calcolaPerFarina(tegliaBiga, 0)).toThrow(RangeError);
    expect(() => calcolaPerFarina(tegliaBiga, -1)).toThrow(RangeError);
    expect(() => calcolaPerPanetti(tegliaBiga, 6.5, 280)).toThrow(RangeError);
    expect(() => calcolaPerPanetti(tegliaBiga, 6, 0)).toThrow(RangeError);
    expect(() => calcolaPerTeglie(trancio, 30, 40, 1.5)).toThrow(RangeError);
    expect(() => calcolaPerTeglie(trancio, 0, 40, 1)).toThrow(RangeError);
  });
});
