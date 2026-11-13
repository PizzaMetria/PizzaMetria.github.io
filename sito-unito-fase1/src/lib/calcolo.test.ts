import { describe, expect, it } from 'vitest';
import {
  adattamentoForza,
  areaTeglia,
  calcola,
  fasceForza,
  finestraForza,
  forzaEfficace,
  giudizioForza,
  oreEquivalenti,
  quotaFarinaForte,
  temperaturaAcqua,
  wEquivalente,
} from './calcolo';
import { forzaConsigliata, oreMassimePerForza } from './fermentazione';
import type { InputCalcolo } from '../types';

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
    // La campagna di riferimento è stata fatta a 20 °C costanti, impasto
    // compreso: con l'inerzia il dato conta, perché l'impasto si scalda o si
    // raffredda inseguendo la stanza invece di esserci già.
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 8,
    correzioneLievito: 0,
    ...patch,
  };
}

const TELEGIA: Partial<InputCalcolo> = {
  tipo: 'teglia',
  ramo: 'teglia',
  idratazione: 70,
  sale: 2.5,
  olio: 2,
  malto: 1,
};

describe('ore equivalenti', () => {
  it('conta le ore a 20 °C come sono', () => {
    expect(
      oreEquivalenti({ oreTotali: 8, oreFrigo: 0, oreTaPrima: 8, oreTaDopo: 0, ta: 20, tc: 4 }),
    ).toBeCloseTo(8, 6);
  });

  it('un’ora di frigo pesa circa un nono di un’ora a 20 °C', () => {
    const eq = oreEquivalenti({
      oreTotali: 10,
      oreFrigo: 10,
      oreTaPrima: 0,
      oreTaDopo: 0,
      ta: 20,
      tc: 4,
    });
    expect(eq).toBeGreaterThan(1.0);
    expect(eq).toBeLessThan(1.4);
  });

  it('somma le fasi a temperature diverse', () => {
    const eq = oreEquivalenti({
      oreTotali: 24,
      oreFrigo: 20,
      oreTaPrima: 2,
      oreTaDopo: 2,
      ta: 20,
      tc: 4,
    });
    // 2 + 2 ore a 20 °C, 20 ore a 4 °C.
    expect(eq).toBeCloseTo(4 + 20 * 0.115, 0);
  });

  it('a 26 °C il tempo corre più che a 20 °C', () => {
    const caldo = oreEquivalenti({
      oreTotali: 24,
      oreFrigo: 0,
      oreTaPrima: 0,
      oreTaDopo: 24,
      ta: 26,
      tc: 4,
    });
    expect(caldo).toBeGreaterThan(40);
  });
});

describe('mix di farine', () => {
  it('pesa le quote', () => {
    expect(
      wEquivalente([
        { quota: 50, w: 300 },
        { quota: 50, w: 200 },
        { quota: 0, w: null },
      ]),
    ).toBeCloseTo(250, 6);
  });

  it('ignora le farine senza W', () => {
    expect(
      wEquivalente([
        { quota: 70, w: 300 },
        { quota: 30, w: null },
        { quota: 0, w: null },
      ]),
    ).toBeCloseTo(300, 6);
  });

  it('restituisce null se nessuno dichiara il W', () => {
    expect(
      wEquivalente([
        { quota: 100, w: null },
        { quota: 0, w: null },
        { quota: 0, w: null },
      ]),
    ).toBeNull();
  });
});

describe('giudizio sulla forza', () => {
  it('usa una finestra asimmetrica: la debolezza pesa più dell’eccesso', () => {
    expect(giudizioForza(300, 300)).toBe('ottima');
    expect(giudizioForza(320, 300)).toBe('ottima');
    // Sopra il 15% resta tollerabile: si recupera allungando la maturazione.
    expect(giudizioForza(340, 300)).toBe('ottima');
    // Oltre il 125% il mix è fuori: prima la tolleranza arrivava al 145%.
    expect(giudizioForza(360, 300)).toBe('accettabile');
    expect(giudizioForza(390, 300)).toBe('distante');
    expect(giudizioForza(460, 300)).toBe('distante');

    // Sotto il 90% inizia il problema vero.
    expect(giudizioForza(270, 300)).toBe('ottima');
    expect(giudizioForza(262, 300)).toBe('accettabile');
    expect(giudizioForza(200, 300)).toBe('distante');
  });

  it('la finestra si allarga verso l’alto, non verso il basso', () => {
    const { minima, massima } = finestraForza(302);
    expect(minima).toBe(257);
    expect(massima).toBe(378);
    expect(302 - minima).toBeLessThan(massima - 302);
  });
});

describe('forza del mix', () => {
  it('con una farina sola il W efficace è quello dichiarato', () => {
    expect(
      forzaEfficace([
        { quota: 100, w: 300 },
        { quota: 0, w: null },
        { quota: 0, w: null },
      ]),
    ).toBeCloseTo(300, 6);
  });

  it('su un mix eterogeneo sta sotto la media pesata', () => {
    // Media 200, scarto quadratico 50: il W efficace scende a 175.
    expect(
      forzaEfficace([
        { quota: 50, w: 250 },
        { quota: 50, w: 150 },
        { quota: 0, w: null },
      ]),
    ).toBeCloseTo(175, 6);
  });

  it('con un solo W dichiarato non penalizza nulla', () => {
    expect(
      forzaEfficace([
        { quota: 60, w: 280 },
        { quota: 40, w: null },
        { quota: 0, w: null },
      ]),
    ).toBeCloseTo(280, 6);
  });

  it('senza W restituisce null', () => {
    expect(
      forzaEfficace([
        { quota: 100, w: null },
        { quota: 0, w: null },
        { quota: 0, w: null },
      ]),
    ).toBeNull();
  });

  it('le ore massime sono l’inversa della retta della forza', () => {
    for (const ore of [6, 12, 24, 30]) {
      expect(oreMassimePerForza(forzaConsigliata(ore))).toBeCloseTo(ore, 0);
    }
  });

  it('calcola quanta farina forte serve per arrivare al W voluto', () => {
    const quota = quotaFarinaForte(
      [
        { quota: 50, w: 150 },
        { quota: 50, w: 350 },
        { quota: 0, w: null },
      ],
      300,
    );

    expect(quota).not.toBeNull();
    expect(quota?.forte).toBe(350);
    expect(quota?.debole).toBe(150);
    expect(quota?.quota).toBeCloseTo(75, 6);
  });

  it('non propone quote impossibili o inutili', () => {
    // Il W voluto è oltre la farina più forte: nessuna quota basta.
    expect(
      quotaFarinaForte(
        [
          { quota: 50, w: 150 },
          { quota: 50, w: 250 },
          { quota: 0, w: null },
        ],
        340,
      ),
    ).toBeNull();

    // Farine troppo simili: il consiglio non aggiungerebbe nulla.
    expect(
      quotaFarinaForte(
        [
          { quota: 50, w: 250 },
          { quota: 50, w: 260 },
          { quota: 0, w: null },
        ],
        255,
      ),
    ).toBeNull();
  });

  it('il calcolo completo porta W efficace, finestra, ore massime e consiglio', () => {
    const risultato = calcola(
      inputBase({
        farine: [
          { quota: 50, w: 150 },
          { quota: 50, w: 350 },
          { quota: 0, w: null },
        ],
      }),
    );

    expect(risultato.forzaConsigliata).toBe(324);
    expect(risultato.wEquivalente).toBeCloseTo(250, 6);
    expect(risultato.wEfficace).toBeCloseTo(200, 6);
    expect(risultato.forzaMinima).toBe(275);
    expect(risultato.forzaMassima).toBe(405);
    expect(risultato.giudizioForza).toBe('distante');
    // Inversa della legge logaritmica: exp((200 − 119) / 64) = 3,5 ore.
    expect(risultato.oreMassime).toBeCloseTo(3.55, 1);
    expect(risultato.suggerimentoForza).toContain('Sotto la fascia tollerata');
    expect(risultato.avvisi.length).toBeGreaterThan(0);
  });
});

describe('temperatura dell’acqua', () => {
  it('applica la formula 3 × obiettivo − ambiente − farina − impastatrice', () => {
    expect(temperaturaAcqua(24, 20, 20, 8)).toBe(24);
  });

  it('chiede acqua più fredda quando l’ambiente è caldo', () => {
    expect(temperaturaAcqua(24, 30, 20, 8)).toBeLessThan(temperaturaAcqua(24, 20, 20, 8));
  });
});

describe('area della teglia', () => {
  it('calcola il rettangolo', () => {
    expect(areaTeglia('rettangolare', 30, 40, 32)).toBe(1200);
  });

  it('calcola il cerchio', () => {
    expect(areaTeglia('tonda', 30, 40, 24)).toBeCloseTo(452.4, 1);
  });
});

describe('calcolo completo', () => {
  it('rispetta il peso dell’impasto partendo dai panetti', () => {
    const risultato = calcola(inputBase());
    const somma =
      risultato.farinaG +
      risultato.acquaG +
      risultato.saleG +
      risultato.olioG +
      risultato.maltoG +
      risultato.lievitoG;

    expect(risultato.pesoImpastoG).toBeCloseTo(somma, 0);
    expect(risultato.pesoImpastoG).toBeGreaterThan(1490);
    expect(risultato.pesoImpastoG).toBeLessThan(1510);
    expect(risultato.numeroPezzi).toBe(6);
  });

  it('sulla tonda a 24 ore dà 0,58 g di lievito fresco', () => {
    const risultato = calcola(inputBase());
    // 0,58 g di fresco su 912 g di farina, cioè 0,064%.
    expect(risultato.percentualeLievito).toBeCloseTo(0.064, 3);
    expect(risultato.lievitoG).toBeCloseTo(0.6, 1);
  });

  it('sulla teglia a 24 ore chiede circa tre volte la tonda', () => {
    const tonda = calcola(inputBase());
    const teglia = calcola(inputBase(TELEGIA));
    expect(teglia.percentualeLievito / tonda.percentualeLievito).toBeGreaterThan(2.5);
  });

  it('calcola la teglia dall’area e dallo spessore', () => {
    const risultato = calcola(inputBase(TELEGIA));
    expect(risultato.areaTegliaCm2).toBe(1200);
    expect(risultato.pesoImpastoG).toBeGreaterThan(650);
    expect(risultato.pesoImpastoG).toBeLessThan(672);
    expect(risultato.farinaG).toBeGreaterThan(370);
    expect(risultato.farinaG).toBeLessThan(382);
    expect(risultato.olioG).toBeGreaterThan(0);
  });

  it('converte fra fresco e secco in bustina', () => {
    const fresco = calcola(inputBase({ tipoLievito: 'fresco' }));
    const secco = calcola(inputBase({ tipoLievito: 'secco' }));

    expect(secco.lievitoG).toBeLessThan(fresco.lievitoG);
    // La percentuale passa dal arrotondamento della dose: la resa è 0,335.
    expect(secco.lievitoG / fresco.lievitoG).toBeCloseTo(0.335, 1);
    // La dose in fresco resta la stessa: cambia solo come si legge.
    expect(secco.lievitoFrescoG).toBeCloseTo(fresco.lievitoG, 1);
  });

  it('serve più lievito con il frigo a parità di ore totali', () => {
    const tuttoTa = calcola(inputBase());
    const conFrigo = calcola(
      inputBase({
        tempi: { oreTotali: 24, oreFrigo: 20, oreTaPrima: 2, oreTaDopo: 2, ta: 20, tc: 4 },
      }),
    );

    expect(conFrigo.percentualeLievito).toBeGreaterThan(tuttoTa.percentualeLievito);
    expect(conFrigo.oreEquivalenti).toBeLessThan(tuttoTa.oreEquivalenti);
  });

  it('applica la correzione manuale del lievito', () => {
    const base = calcola(inputBase());
    const piu = calcola(inputBase({ correzioneLievito: 20 }));
    const meno = calcola(inputBase({ correzioneLievito: -20 }));

    expect(piu.percentualeLievito / base.percentualeLievito).toBeCloseTo(1.2, 2);
    expect(meno.percentualeLievito / base.percentualeLievito).toBeCloseTo(0.8, 2);
  });

  it('suggerisce la temperatura dell’acqua', () => {
    expect(calcola(inputBase({ temperaturaImpasto: 24 })).temperaturaAcqua).toBeCloseTo(24, 5);
  });

  it('calcola i panetti interi partendo dalla farina', () => {
    const risultato = calcola(
      inputBase({ modalita: 'farina', farinaG: 1000, numeroPanetti: null }),
    );

    expect(risultato.farinaG).toBe(1000);
    expect(risultato.pesoImpastoG).toBeGreaterThan(1640);
    expect(risultato.pesoImpastoG).toBeLessThan(1660);
    expect(risultato.numeroPezzi).toBe(6);
    expect(risultato.residuoG).not.toBeNull();
  });

  it('espone il W consigliato e il giudizio del mix', () => {
    const risultato = calcola(
      inputBase({
        farine: [
          { quota: 50, w: 300 },
          { quota: 50, w: 300 },
          { quota: 0, w: null },
        ],
      }),
    );

    expect(risultato.forzaConsigliata).toBe(324);
    expect(risultato.wEquivalente).toBeCloseTo(300, 6);
    expect(risultato.giudizioForza).toBe('ottima');
  });

  it('costruisce la curva e le fasce del grafico', () => {
    const risultato = calcola(
      inputBase({
        tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 2, oreTaDopo: 4, ta: 20, tc: 4 },
      }),
    );

    expect(risultato.fasce).toHaveLength(3);
    expect(risultato.fasce[1].inFrigo).toBe(true);
    expect(risultato.curva.length).toBeGreaterThan(3);

    // Con l'inerzia la temperatura non salta a 4 °C: scende lungo una curva,
    // quindi il tratto freddo si riconosce dall'attività, non dal valore esatto.
    const temperature = risultato.curva.map((punto) => punto.temperatura);
    const attivita = risultato.curva.map((punto) => punto.attivita);
    expect(Math.min(...temperature)).toBeGreaterThan(4);
    expect(Math.min(...attivita)).toBeLessThan(0.2);
  });

  it('non segnala nulla su un impasto ordinario', () => {
    expect(calcola(inputBase()).avvisi).toHaveLength(0);
  });

  it('avverte quando il mix è troppo debole per le ore richieste', () => {
    const risultato = calcola(
      inputBase({
        farine: [
          { quota: 100, w: 180 },
          { quota: 0, w: null },
          { quota: 0, w: null },
        ],
      }),
    );

    expect(risultato.giudizioForza).toBe('distante');
    expect(risultato.avvisi.length).toBeGreaterThan(0);
  });

  it('avverte quando l’acqua dovrebbe essere troppo fredda', () => {
    const risultato = calcola(
      inputBase({
        temperaturaFarina: 30,
        riscaldamento: 15,
        tempi: { oreTotali: 24, oreFrigo: 0, oreTaPrima: 0, oreTaDopo: 24, ta: 30, tc: 4 },
      }),
    );

    expect(risultato.temperaturaAcqua).toBeLessThan(4);
    expect(risultato.avvisi.length).toBeGreaterThan(0);
  });
});

describe('il W consigliato segue gli ingredienti', () => {
  // Per un periodo il W è stato indipendente da acqua, sale e olio: su un solo
  // riferimento non si vedeva effetto. Le schede dei molini dicono il
  // contrario — Rachello chiede 300–350 oltre il 75% e 260–320 al 62%, il
  // disciplinare romano dà 260–350 per impasti al 70–80% — e non perché
  // l'acqua acceleri il lievito (Le-Bail 2010: fra 56 e 60% la cinetica non si
  // muove), ma perché più acqua chiede più tenuta.
  it('più acqua, più forza richiesta: +2,4 W per punto sopra il 62%', () => {
    expect(calcola(inputBase()).forzaConsigliata).toBe(324);
    expect(calcola(inputBase({ idratazione: 70 })).forzaConsigliata).toBe(344);
    expect(calcola(inputBase({ idratazione: 55 })).forzaConsigliata).toBe(308);
    expect(calcola(inputBase({ idratazione: 100 })).forzaConsigliata).toBe(416);
  });

  it('il sale alza la forza richiesta, l’olio la abbassa, il malto non entra', () => {
    expect(calcola(inputBase({ sale: 4 })).forzaConsigliata).toBe(327);
    expect(calcola(inputBase({ olio: 5 })).forzaConsigliata).toBe(319);
    expect(calcola(inputBase({ malto: 3 })).forzaConsigliata).toBe(324);
  });

  it('un mix da 300 resta adatto al 45% e al 62%, non al 100%', () => {
    const farine = [
      { quota: 100, w: 300 },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ];
    for (const idratazione of [45, 62]) {
      const risultato = calcola(inputBase({ farine, idratazione }));
      expect(risultato.giudizioForza, String(idratazione)).toBe('ottima');
    }
    // Al 100% la legge chiede W 416: un mix da 300 è fuori fascia, e va detto.
    expect(calcola(inputBase({ farine, idratazione: 100 })).giudizioForza).toBe('distante');
  });
});

describe('il grafico della zona di forza', () => {
  it('la zona sicura è la stessa del giudizio, la tollerata la stessa della finestra', () => {
    const { sicura, tollerata } = fasceForza(302);

    expect(giudizioForza(sicura[0], 302)).toBe('ottima');
    // I bordi sono interi e il confronto avviene sui gradi interi: un grado
    // oltre la zona consigliata è già tollerato, uno oltre la tollerata no.
    expect(giudizioForza(sicura[1] + 1, 302)).toBe('accettabile');
    expect(giudizioForza(tollerata[1] + 1, 302)).toBe('distante');

    // La finestra stampata nella card *è* la fascia tollerata.
    expect(finestraForza(302).minima).toBe(tollerata[0]);
    expect(finestraForza(302).massima).toBe(tollerata[1]);
  });

  it('la curva ha il vetto sulla zona sicura e scende verso zero', () => {
    // Vetto: dentro la zona l’altezza è 1.
    expect(adattamentoForza(302, 302)).toBe(1);
    expect(adattamentoForza(347, 302)).toBe(1);

    // Spalla tollerata: si scende, ma non a zero.
    const spalla = adattamentoForza(360, 302);
    expect(spalla).toBeLessThan(1);
    expect(spalla).toBeGreaterThan(0.8);

    // Oltre la tolleranza la curva cade, monotona su entrambi i lati.
    expect(adattamentoForza(390, 302)).toBeLessThan(0.6);
    expect(adattamentoForza(390, 302)).toBeGreaterThan(adattamentoForza(405, 302));
    expect(adattamentoForza(470, 302)).toBeLessThan(0.2);
    expect(adattamentoForza(240, 302)).toBeGreaterThan(adattamentoForza(230, 302));
    expect(adattamentoForza(150, 302)).toBeLessThan(0.2);
    expect(adattamentoForza(500, 302)).toBeLessThan(0.2);
  });
});
