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
  it('deriva un fattore di peso pari a 1,8985 con lievito fresco', () => {
    const { fattorePeso, quotaFarinaRinfresco } = derivaRicetta(tegliaBiga);
    vicino(fattorePeso, 1.8985, 12);
    vicino(quotaFarinaRinfresco, 0.15, 12);
  });

  it('riduce il peso quando si usa il lievito secco', () => {
    const secco = derivaRicetta(tegliaBiga, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    vicino(secco.fattorePeso, 1.8985 - 8.5 * 0.4 / 1000, 12);
  });
});

describe('Pizza in teglia con biga — 1 kg di farina', () => {
  const risultato = calcolaPerFarina(tegliaBiga, 1);

  it('rispetta biga all’85%, idratazione 80% e malto al 2%', () => {
    vicino(grammiDi(risultato, 'farina-biga'), 850);
    vicino(grammiDi(risultato, 'acqua-biga'), 425);
    vicino(grammiDi(risultato, 'lievito'), 8.5);
    vicino(grammiDi(risultato, 'farina-rinfresco'), 150);
    vicino(grammiDi(risultato, 'acqua-rinfresco'), 375);
    vicino(grammiDi(risultato, 'malto'), 20);
    vicino(grammiDi(risultato, 'sale'), 30);
    vicino(grammiDi(risultato, 'olio'), 40);
    vicino(risultato.acquaTotaleG, 800);
    vicino(risultato.pesoImpastoG, 1898.5);
  });

  it('non ha fasi di autolisi quando è disattivata', () => {
    expect(risultato.fasi.map((fase) => fase.id)).toEqual([
      'biga',
      'rinfresco',
    ]);
    expect(risultato.pesoAutolisiG).toBeUndefined();
    expect(risultato.acquaFinaleG).toBe(375);
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
    vicino(grammiDi(conAutolisi, 'acqua-finale'), 292.5);
    vicino(conAutolisi.pesoAutolisiG ?? -1, 232.5);
  });

  it('mantiene acqua e peso totali invariati', () => {
    vicino(conAutolisi.acquaTotaleG, 800);
    vicino(conAutolisi.pesoImpastoG, 1898.5);
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
    vicino(risultato.pesoImpastoG, 1895.1);
    expect(
      risultato.ingredienti.find((voce) => voce.chiave === 'lievito')?.etichetta,
    ).toBe('Lievito di birra secco');
  });

  it('applica il fattore 0,67 al Trancio Milanese', () => {
    const risultato = calcolaPerFarina(trancio, 0.375, null, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    vicino(grammiDi(risultato, 'lievito'), 5.5 * 0.67);
    vicino(risultato.pesoImpastoG, 649.5 - 5.5 * 0.33);
  });

  it('applica il fattore 0,6 alla Canotto', () => {
    const risultato = calcolaPerFarina(canotto, 1, null, {
      tipoLievito: 'secco',
      autolisi: true,
    });
    vicino(grammiDi(risultato, 'lievito'), 7.5 * 0.6);
    vicino(risultato.pesoImpastoG, 1837.5 - 7.5 * 0.4);
  });
});

describe('Trancio Milanese — teglie', () => {
  it('una teglia 30 × 40 rispetta le dosi di riferimento', () => {
    const r = calcolaPerTeglie(trancio, 30, 40, 1);
    vicino(grammiDi(r, 'farina'), 375);
    vicino(grammiDi(r, 'acqua'), 225);
    vicino(grammiDi(r, 'lievito'), 5.5);
    vicino(grammiDi(r, 'malto'), 4);
    vicino(grammiDi(r, 'miele'), 10);
    vicino(grammiDi(r, 'sale'), 8);
    vicino(grammiDi(r, 'olio'), 22);
    vicino(r.pesoImpastoG, 649.5);
    expect(r.acquaTotaleG / r.farinaTotaleG).toBeCloseTo(0.6, 9);
  });

  it('due teglie raddoppiano dosi e peso', () => {
    const r = calcolaPerTeglie(trancio, 30, 40, 2);
    vicino(grammiDi(r, 'farina'), 750);
    vicino(grammiDi(r, 'lievito'), 11);
    vicino(r.pesoImpastoG, 1299);
    vicino(r.pesoPerTegliaG ?? -1, 649.5);
  });

  it('una teglia 40 × 60 equivale a due teglie di riferimento', () => {
    const r = calcolaPerTeglie(trancio, 40, 60, 1);
    vicino(r.farinaTotaleG, 750);
    vicino(r.pesoImpastoG, 1299);
  });

  it('accetta dimensioni rettangolari personalizzate', () => {
    const r = calcolaPerTeglie(trancio, 25, 35, 3);
    vicino(r.farinaTotaleG, 375 * ((25 * 35) / 1200) * 3);
  });
});

describe('Trancio Milanese — farina', () => {
  it('0,375 kg corrisponde esattamente alla ricetta base', () => {
    const r = calcolaPerFarina(trancio, 0.375);
    vicino(grammiDi(r, 'farina'), 375);
    vicino(r.pesoImpastoG, 649.5);
  });

  it('stima le teglie intere senza eccessi', () => {
    const r = calcolaPerFarina(trancio, 1, null, fresco, {
      latoA: 30,
      latoB: 40,
    });
    const stima = r.stimaTeglie;
    if (!stima) throw new Error('Stima mancante');
    expect(stima.intere).toBe(2);
    vicino(stima.pesoPerTegliaG, 649.5);
    vicino(stima.residuoG, r.pesoImpastoG - 2 * 649.5);
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
    vicino(grammiDi(r, 'malto'), 10);
    vicino(r.pesoImpastoG, 1837.5);
    vicino(r.fattorePeso, 1.8375, 12);
  });

  it('tre panetti da 280 g usano il fattore 1,8375', () => {
    const r = calcolaPerPanetti(canotto, 3, 280);
    vicino(r.pesoImpastoG, 840);
    vicino(r.farinaTotaleG, 840 / 1.8375);
    vicino(sommaIngredienti(r), 840, 9);
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

  it('l’autolisi resta obbligatoria anche se l’opzione è falsa', () => {
    const r = calcolaPerFarina(canotto, 1, null, {
      tipoLievito: 'fresco',
      autolisi: false,
    });
    expect(r.fasi.map((fase) => fase.id)).toContain('autolisi');
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
