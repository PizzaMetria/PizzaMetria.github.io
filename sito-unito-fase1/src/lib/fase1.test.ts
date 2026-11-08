import { describe, expect, it } from 'vitest';
import {
  calcola,
  consiglioForza,
  fasceForza,
  finestraForza,
  forzaEfficace,
  giudizioForza,
  suggerimentoMiscela,
} from './calcolo';
import { LIMITI_LIEVITO, limiteDose } from './fermentazione';
import { LIMITI_LIEVITO_VECCHIO } from './vecchio';
import type { Farina, InputCalcolo } from '../types';

/*
 * Fase 1: coerenza interna di fasce, consigli e messaggi. Questi test non
 * dicono nulla sulla validità panificatoria del modello: verificano solo che
 * ciò che il sito scrive sia coerente con ciò che calcola.
 */

function inputBase(patch: Partial<InputCalcolo> = {}): InputCalcolo {
  return {
    tipo: 'verace',
    ramo: 'verace',
    idratazione: 62,
    sale: 2.5,
    olio: 0,
    malto: 0,
    tipoLievito: 'fresco',
    farine: [
      { quota: 100, w: null },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'panetti',
    numeroPanetti: 6,
    pesoPanettoG: 250,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 20, tc: 4 },
    staglio: 'prima',
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 8,
    correzioneLievito: 0,
    ...patch,
  };
}

function mix(...voci: readonly [number, number][]): Farina[] {
  return voci.map(([quota, w]) => ({ quota, w }));
}

describe('fase 1 · fasce', () => {
  it('la finestra è la fascia tollerata, bordi interi inclusi', () => {
    for (const w of [150, 215, 250, 302, 365]) {
      const { tollerata } = fasceForza(w);
      expect(finestraForza(w)).toEqual({ minima: tollerata[0], massima: tollerata[1] });
      expect(Number.isInteger(tollerata[0])).toBe(true);
      expect(Number.isInteger(tollerata[1])).toBe(true);
    }
  });

  it('giudizio e fasce usano gli stessi bordi, senza contraddizioni', () => {
    for (const w of [150, 215, 250, 302, 365]) {
      const { sicura, tollerata } = fasceForza(w);
      expect(giudizioForza(sicura[0], w), `${w}`).toBe('ottima');
      expect(giudizioForza(sicura[1], w), `${w}`).toBe('ottima');
      expect(giudizioForza(sicura[1] + 1, w), `${w}`).toBe('accettabile');
      expect(giudizioForza(tollerata[0], w), `${w}`).toBe('accettabile');
      expect(giudizioForza(tollerata[1], w), `${w}`).toBe('accettabile');
      expect(giudizioForza(tollerata[1] + 1, w), `${w}`).toBe('distante');
    }
  });

  it('il calcolo espone zona consigliata e fascia tollerata distinte', () => {
    const r = calcola(inputBase({ farine: mix([100, 300]) }));
    const { sicura } = fasceForza(r.forzaConsigliata);
    expect(r.zonaMinima).toBe(sicura[0]);
    expect(r.zonaMassima).toBe(sicura[1]);
    expect(r.forzaMinima).toBe(finestraForza(r.forzaConsigliata).minima);
    expect(r.forzaMinima).toBeLessThan(r.zonaMinima);
    expect(r.zonaMassima).toBeLessThan(r.forzaMassima);
  });
});

describe('fase 1 · suggerimento di miscela', () => {
  it('il vecchio criterio a media lasciava il mix fuori fascia', () => {
    // 75% di W 200 e 25% di W 400: media 250, efficace 206,7.
    const efficace = forzaEfficace(mix([75, 200], [25, 400]));
    expect(efficace).not.toBeNull();
    expect(efficace ?? 0).toBeCloseTo(206.7, 1);
    expect(Math.round(efficace ?? 0)).toBeLessThan(finestraForza(250).minima);
  });

  it('la quota proposta sta dentro tutta la fascia tollerata', () => {
    const farine = mix([75, 200], [25, 400]);
    const suggerimento = suggerimentoMiscela(farine, 250);
    expect(suggerimento).not.toBeNull();
    if (!suggerimento) return;

    const somma = suggerimento.quote.reduce((totale, voce) => totale + voce.quota, 0);
    expect(somma).toBe(100);
    for (const voce of suggerimento.quote) {
      expect(Number.isInteger(voce.quota)).toBe(true);
      expect(voce.quota).toBeGreaterThanOrEqual(0);
    }

    // Ricalcolo sulle quote *proposte*, con la stessa formula della valutazione.
    const ricalcolato = forzaEfficace(
      suggerimento.quote.map((voce) => ({ quota: voce.quota, w: voce.w })),
    );
    expect(ricalcolato).not.toBeNull();
    const grado = Math.round(ricalcolato ?? 0);
    expect(grado).toBe(Math.round(suggerimento.wEfficace));
    expect(grado).toBeGreaterThanOrEqual(finestraForza(250).minima);
    expect(grado).toBeLessThanOrEqual(finestraForza(250).massima);
    expect(suggerimento.aumento).toBeGreaterThan(0);
  });

  it('con tre farine elenca tutte le quote finali', () => {
    const farine = mix([40, 200], [40, 300], [20, 400]);
    const suggerimento = suggerimentoMiscela(farine, 302);
    expect(suggerimento).not.toBeNull();
    if (!suggerimento) return;

    expect(suggerimento.quote).toHaveLength(3);
    expect(suggerimento.quote.reduce((totale, voce) => totale + voce.quota, 0)).toBe(100);
    // La più forte cresce, le altre si riducono: nessuna resta com'era.
    expect(suggerimento.quote.find((voce) => voce.w === 400)?.quota ?? 0).toBeGreaterThan(20);
    const grado = Math.round(suggerimento.wEfficace);
    expect(grado).toBeGreaterThanOrEqual(finestraForza(302).minima);
    expect(grado).toBeLessThanOrEqual(finestraForza(302).massima);
  });

  it('se l’obiettivo non è raggiungibile non propone percentuali', () => {
    const farine = mix([50, 150], [50, 250]);
    expect(suggerimentoMiscela(farine, 400)).toBeNull();
    const messaggio = consiglioForza(farine, 150, 400, finestraForza(400));
    expect(messaggio).toContain('non trova una quota');
  });

  it('dichiara quando qualche farina non ha il W', () => {
    const farine = mix([60, 200], [20, 400], [20, 0]);
    const conW = farine.map((farina) => (farina.quota === 20 && farina.w === 0 ? { ...farina, w: null } : farina));
    const suggerimento = suggerimentoMiscela(conW, 302);
    expect(suggerimento).not.toBeNull();
    expect(suggerimento?.parziale).toBe(true);
  });
});

describe('fase 1 · messaggi del consiglio', () => {
  it('sotto la fascia elenca tutte le quote e il W efficace ottenuto', () => {
    const farine = mix([50, 150], [50, 350]);
    const messaggio = consiglioForza(farine, 200, 302, finestraForza(302));
    expect(messaggio).toContain('Sotto la fascia tollerata');
    expect(messaggio).toContain('W 150 al');
    expect(messaggio).toContain('W 350 al');
    expect(messaggio).toContain('W efficace');
  });

  it('non promette una durata della farina', () => {
    const r = calcola(inputBase({ farine: mix([100, 180]) }));
    expect(r.suggerimentoForza).not.toBeNull();
    expect(r.suggerimentoForza ?? '').not.toContain('regge');
    expect(r.suggerimentoForza ?? '').not.toMatch(/ore equivalenti/i);
  });

  it('sopra la fascia non parla di cedimento', () => {
    const messaggio = consiglioForza(mix([100, 480]), 480, 302, finestraForza(302));
    expect(messaggio).toContain('Sopra la fascia tollerata');
    expect(messaggio).not.toContain('cedere');
    expect(messaggio).not.toContain('gommos');
  });
});

describe('fase 1 · avvisi sulla forza', () => {
  it('distingue sotto e sopra la fascia', () => {
    const debole = calcola(inputBase({ farine: mix([100, 180]) }));
    const forte = calcola(inputBase({ farine: mix([100, 480]) }));

    const avvisoDebole = debole.avvisi.find((a) => a.includes('fascia tollerata'));
    const avvisoForte = forte.avvisi.find((a) => a.includes('fascia tollerata'));

    expect(avvisoDebole).toContain('sotto la fascia tollerata');
    expect(avvisoForte).toContain('sopra la fascia tollerata');
    expect(avvisoForte).not.toContain('cedere');
  });
});

describe('fase 1 · limiti del lievito', () => {
  it('conosce i limiti del motore attivo', () => {
    expect(limiteDose(LIMITI_LIEVITO.min)).toBe('minimo');
    expect(limiteDose(LIMITI_LIEVITO.max)).toBe('massimo');
    // Sopra il tetto del modello nuovo la dose è oltre il limite, anche se il
    // taglio non è stato applicato a monte.
    expect(limiteDose(4)).toBe('massimo');
    expect(limiteDose(1, LIMITI_LIEVITO)).toBeNull();
    // Con il vecchio motore il 4% non è un taglio, e l'8% sì.
    expect(limiteDose(4, LIMITI_LIEVITO_VECCHIO)).toBeNull();
    expect(limiteDose(LIMITI_LIEVITO_VECCHIO.max, LIMITI_LIEVITO_VECCHIO)).toBe('massimo');
  });

  it('riporta il limite effettivamente applicato e lo dice nel messaggio', () => {
    const r = calcola(
      inputBase({
        tempi: { oreTotali: 72, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 72, ta: 40, tc: 4 },
      }),
    );

    expect(r.percentualeLievito).toBe(LIMITI_LIEVITO.min);
    expect(r.limiteLievito).toBe('minimo');
    const avviso = r.avvisi.find((a) => a.includes('minimo'));
    expect(avviso).toContain('0.015');
    expect(avviso).toContain('fermata');
  });

  it('non dichiara un taglio che il motore attivo non fa', () => {
    const nuovo = calcola(inputBase());
    expect(nuovo.limiteLievito).toBeNull();

    const vecchio = calcola(inputBase({ modello: 'vecchio' }));
    expect(vecchio.limiteLievito).toBeNull();
    const messaggio = vecchio.avvisi.find((a) => a.includes('fermata lì')) ?? '';
    expect(messaggio).not.toContain('3%');
  });
});
