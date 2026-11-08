import { describe, expect, it } from 'vitest';
import { creaVistaRicetta } from './vista';
import { creaNomeFile } from './nomeFile';
import { calcolaBigaSola, oreAttesa, oreTraDate } from './biga-sola';

const base = {
  farinaKg: 1,
  temperatura: 21,
  temperaturaFrigo: 4,
  ore: 24,
  lievito: 'fresco' as const,
};

describe('attesa fra due orari', () => {
  it('conta le ore e passa al giorno dopo', () => {
    expect(oreAttesa('08:00', '20:00')).toBe(12);
    expect(oreAttesa('20:00', '08:00')).toBe(12);
    expect(oreAttesa('08:00', '08:00')).toBe(24);
  });

  it('restituisce null con un orario illeggibile', () => {
    expect(oreAttesa('', '08:00')).toBeNull();
    expect(oreAttesa('08:00', 'domani')).toBeNull();
  });
});

describe('attesa fra due date', () => {
  it('conta anche i giorni', () => {
    expect(oreTraDate('2026-11-02T08:00', '2026-11-03T08:00')).toBeCloseTo(
      24,
      6,
    );
    expect(oreTraDate('2026-11-02T20:00', '2026-11-04T08:00')).toBeCloseTo(
      36,
      6,
    );
  });

  it('rifiuta una fine prima dell’inizio e i testi illeggibili', () => {
    expect(oreTraDate('2026-11-03T08:00', '2026-11-02T08:00')).toBeNull();
    expect(oreTraDate('', '2026-11-02T08:00')).toBeNull();
  });
});

describe('calcolo della sola biga', () => {
  const { risultato, config, piano } = calcolaBigaSola(base);

  it('usa farina, acqua e lievito e nient’altro', () => {
    expect(risultato.ingredienti.map((voce) => voce.chiave)).toEqual([
      'farina-biga',
      'acqua-biga',
      'lievito',
    ]);
    expect(risultato.farinaTotaleG).toBeCloseTo(1000, 9);
    expect(risultato.acquaTotaleG).toBeCloseTo(1000 * (piano.idratazione / 100), 9);
    expect(risultato.pesoImpastoG).toBeCloseTo(
      1000 + risultato.acquaTotaleG + 10,
      9,
    );
  });

  it('con 24 h a 21 °C va tutta in frigorifero, al 55 %', () => {
    // Le 24 ore classiche sono tutte a 4 °C: il rallentamento lo fa il freddo,
    // non un pezzo in ambiente e il resto al frigo. L'idratazione resta 55 %.
    expect(piano.idratazione).toBe(55);
    expect(piano.oreAmbiente).toBe(0);
    expect(piano.oreFrigo).toBeCloseTo(24, 6);
  });

  it('converte il lievito secco in 0,6 del fresco', () => {
    const secco = calcolaBigaSola({ ...base, lievito: 'secco' });
    expect(secco.risultato.ingredienti[2].grammi).toBeCloseTo(6, 9);
    expect(secco.risultato.ingredienti[2].etichetta).toBe(
      'Lievito di birra secco',
    );
  });

  it('il riepilogo non ripete quote che non esistono', () => {
    const voci = creaVistaRicetta(risultato, config).riepilogoTecnico[0].voci;
    const etichette = voci.map((voce) => voce.etichetta);

    expect(etichette).toContain('Idratazione della biga');
    expect(etichette).toContain('Maturazione della biga');
    expect(etichette).not.toContain('Farina nella biga');
    expect(etichette).not.toContain('Autolisi');
    expect(etichette).not.toContain('Idratazione totale');
  });

  it('nomina il file come le altre ricette', () => {
    const nome = creaNomeFile(risultato, config, new Date(2026, 10, 2), 'pdf');
    expect(nome).toBe('biga-1kg-farina-2026-11-02.pdf');
  });
});
