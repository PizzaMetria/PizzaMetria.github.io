import { describe, expect, it } from 'vitest';
import { costanteTempo, profiloTermico } from './inerzia';
import type { IngressiInerzia } from './inerzia';
import { fattoreTemperatura } from './fermentazione';
import type { ParametriTempo } from '../types';

/*
 * L'inerzia termica non è un coefficiente da fittare: viene dalla geometria.
 * Qui si controlla che il modello si comporti come la fisica impone — massa
 * più grande, risposta più lenta — e che continui a dare i conti di prima dove
 * l'inerzia non ha nulla da dire.
 */

const TEMPI: ParametriTempo = {
  oreTotali: 24,
  oreFrigo: 18,
  oreTaPrima: 2,
  oreTaDopo: 4,
  ta: 20,
  tc: 4,
};

const INGRESSI: IngressiInerzia = {
  pesoPezzoG: 250,
  pesoImpastoG: 1500,
  formaInFrigo: 'panetto',
  formaInAppretto: 'panetto',
  temperaturaIniziale: 24,
};

describe('costante di tempo', () => {
  it('un panetto da 250 g si porta in temperatura in circa due ore', () => {
    const tau = costanteTempo(250, 'panetto');
    expect(tau).toBeGreaterThan(1.4);
    expect(tau).toBeLessThan(2.3);
  });

  it('una massa unica da 1,5 kg è molto più lenta', () => {
    const massa = costanteTempo(1500, 'massa');
    const panetto = costanteTempo(250, 'panetto');
    expect(massa).toBeGreaterThan(2.8);
    expect(massa).toBeLessThan(4.5);
    expect(massa).toBeGreaterThan(panetto * 1.5);
  });

  it('cresce con la massa, ma meno che in proporzione', () => {
    const piccolo = costanteTempo(250, 'panetto');
    const doppio = costanteTempo(500, 'panetto');
    const rapporto = doppio / piccolo;

    // La lunghezza caratteristica va con la radice cubica del volume.
    expect(rapporto).toBeGreaterThan(1.2);
    expect(rapporto).toBeLessThan(1.35);
  });
});

describe('profilo termico', () => {
  it('senza scambi di temperatura il conto è quello di prima', () => {
    const profilo = profiloTermico(
      { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 20, tc: 4 },
      { ...INGRESSI, temperaturaIniziale: 20 },
    );

    // Impasto a 20 °C in una stanza a 20 °C: l'inerzia non ha nulla da fare.
    expect(profilo.oreEquivalenti).toBeCloseTo(24, 6);
    expect(profilo.oreSenzaInerzia).toBeCloseTo(24, 6);
  });

  it('partendo più caldo dell’ambiente matura più ore equivalenti', () => {
    const profilo = profiloTermico(
      { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 20, tc: 4 },
      { ...INGRESSI, temperaturaIniziale: 24 },
    );

    expect(profilo.oreEquivalenti).toBeGreaterThan(24);
    // Un grado di troppo per poche ore non può valere il doppio.
    expect(profilo.oreEquivalenti).toBeLessThan(26);
  });

  it('in frigorifero conta più ore di quante ne dica la temperatura del frigo', () => {
    const profilo = profiloTermico(TEMPI, INGRESSI);

    // Entra a 21 °C e scende piano: le prime ore in cella non sono a 4 °C.
    expect(profilo.equivalenti.inFrigo).toBeGreaterThan(18 * fattoreTemperatura(4));
    expect(profilo.oreSenzaInerzia).toBeCloseTo(
      2 * fattoreTemperatura(20) + 18 * fattoreTemperatura(4) + 4 * fattoreTemperatura(20),
      6,
    );
  });

  it('con poco appretto il totale sale sopra il modello a scalini', () => {
    // Mezz'ora di appretto non basta a recuperare: l'impasto entra caldo in
    // frigo, ne esce freddo e resta freddo fino all'infornata.
    const profilo = profiloTermico(
      { ...TEMPI, oreTotali: 20.5, oreTaDopo: 0.5 },
      INGRESSI,
    );

    expect(profilo.oreEquivalenti).toBeGreaterThan(profilo.oreSenzaInerzia + 1);
  });

  it('con un appretto lungo il totale può invece scendere', () => {
    // Il ritmo cresce più che linearmente con la temperatura: le ore spese a
    // riscaldarsi costano più di quanto renda l'ingresso in frigo ancora caldo.
    const profilo = profiloTermico(TEMPI, INGRESSI);

    expect(profilo.oreEquivalenti).toBeLessThan(profilo.oreSenzaInerzia);
  });

  it('la temperatura non salta al cambio di fase', () => {
    const profilo = profiloTermico(TEMPI, INGRESSI);
    let saltoMassimo = 0;

    for (let indice = 1; indice < profilo.curva.length; indice += 1) {
      saltoMassimo = Math.max(
        saltoMassimo,
        Math.abs(profilo.curva[indice].temperatura - profilo.curva[indice - 1].temperatura),
      );
    }

    // Cinque minuti di curva: nessun punto può fare un gradino.
    expect(saltoMassimo).toBeLessThan(1);
    expect(profilo.curva[0].temperatura).toBe(24);
  });

  it('scende verso il frigo e risale verso la stanza', () => {
    const profilo = profiloTermico(TEMPI, INGRESSI);
    const temperature = profilo.curva.map((punto) => punto.temperatura);

    const minimo = Math.min(...temperature);
    expect(minimo).toBeGreaterThan(4);
    expect(minimo).toBeLessThan(21);
    expect(profilo.temperaturaUscitaFrigo).not.toBeNull();
    expect(profilo.temperaturaUscitaFrigo ?? 0).toBeLessThan(24);
    expect(profilo.temperaturaUscitaFrigo ?? 0).toBeGreaterThan(4);
  });

  it('la massa unica in frigo fermenta più dei panetti', () => {
    const panetti = profiloTermico(TEMPI, { ...INGRESSI, formaInFrigo: 'panetto' });
    const massa = profiloTermico(TEMPI, { ...INGRESSI, formaInFrigo: 'massa' });

    expect(massa.equivalenti.inFrigo).toBeGreaterThan(panetti.equivalenti.inFrigo);
    expect(massa.oreEquivalenti).toBeGreaterThan(panetti.oreEquivalenti);
  });

  it('un frigo più freddo toglie ore equivalenti', () => {
    const mite = profiloTermico({ ...TEMPI, tc: 8 }, INGRESSI);
    const gelido = profiloTermico({ ...TEMPI, tc: 2 }, INGRESSI);

    expect(gelido.oreEquivalenti).toBeLessThan(mite.oreEquivalenti);
    expect(gelido.equivalenti.inFrigo).toBeLessThan(mite.equivalenti.inFrigo);
  });

  it('le fasce coprono esattamente le ore del profilo', () => {
    const profilo = profiloTermico(TEMPI, INGRESSI);
    const totale = profilo.fasce.reduce((somma, fascia) => somma + (fascia.a - fascia.da), 0);

    expect(totale).toBeCloseTo(24, 6);
    expect(profilo.fasce.filter((fascia) => fascia.inFrigo)).toHaveLength(1);
  });
});
