/*
 * L'EXPORT DEL CALCOLATORE DIRETTO
 * -------------------------------
 * Due stati soli:
 *  - dati puliti: il risultato a schermo è quello del modulo, il foglio si
 *    compone e il PDF si genera;
 *  - dati cambiati e non ricalcolati: l'export si blocca, perché il foglio
 *    prenderebbe i grammi dal risultato vecchio e il nome del lievito dal modulo
 *    nuovo (un PDF «secco» con i grammi del fresco).
 *
 * Il JPG non si prova qui: passa dal canvas, che in Node non esiste. Il foglio
 * che riceve è lo stesso oggetto del PDF, quindi la parte che conta — coerenza e
 * blocco — è coperta.
 */
import { describe, expect, it } from 'vitest';
import { calcola } from '../lib/calcolo';
import { NOMI_LIEVITO } from '../lib/fermentazione';
import { MESSAGGIO_DATI_CAMBIATI, bloccoExport } from './blocco';
import { foglioDiretto, type IngressiFoglioDiretto } from './foglio-diretto';
import { creaPdf } from './pdf';
import type { InputCalcolo, RisultatoCalcolo, TipoLievito } from '../types';

function caso(tipoLievito: TipoLievito = 'fresco'): InputCalcolo {
  return {
    tipo: 'teglia',
    ramo: 'teglia',
    idratazione: 75,
    sale: 2.5,
    olio: 2,
    malto: 1,
    tipoLievito,
    farine: [
      { quota: 100, w: 300 },
      { quota: 0, w: null },
      { quota: 0, w: null },
    ],
    modalita: 'farina',
    numeroPanetti: null,
    pesoPanettoG: null,
    farinaG: null,
    formaTeglia: 'rettangolare',
    latoA: 30,
    latoB: 40,
    diametro: 32,
    numeroTeglie: 1,
    grammiPerCm2: 0.55,
    tempi: { oreTotali: 24, oreFrigo: 18, oreTaPrima: 2, oreTaDopo: 4, ta: 20, tc: 4 },
    staglio: 'prima',
    modello: 'termico',
    temperaturaImpasto: 20,
    temperaturaFarina: 20,
    riscaldamento: 0,
    correzioneLievito: 0,
  };
}

function foglioDi(risultato: RisultatoCalcolo, tipoLievito: TipoLievito = 'fresco') {
  const ingressi: IngressiFoglioDiretto = {
    risultato,
    nome: 'Teglia 30 × 40',
    tonda: false,
    idratazioneScritta: '75',
    idratazioneConfig: 75,
    tipoLievito,
  };
  return foglioDiretto(ingressi);
}

describe('export del calcolatore diretto', () => {
  it('con i dati puliti il foglio torna i numeri del risultato e il PDF si genera', () => {
    const risultato = calcola(caso('fresco'));

    // Stesso oggetto: nessun blocco.
    expect(bloccoExport(risultato, risultato)).toBeNull();

    const foglio = foglioDi(risultato);
    const lievito = foglio.dosi!.find((dose) => dose.tipo === 'lievito');

    expect(lievito).toBeDefined();
    expect(lievito!.grammi).toBeCloseTo(risultato.lievitoG, 6);
    expect(lievito!.percentuale).toBeCloseTo(risultato.percentualeLievito, 6);
    expect(foglio.tipoLievito).toBe(NOMI_LIEVITO.fresco);
    expect(foglio.lievitoG).toBeCloseTo(risultato.lievitoG, 6);
    expect(foglio.totaleG).toBeCloseTo(risultato.pesoImpastoG, 6);
    expect(foglio.passi.length).toBe(risultato.passi.length);
    expect(foglio.passi.map((passo) => passo.titolo)).toEqual([
      'Prepara l’impasto',
      'Metti l’impasto in frigorifero',
      'Tira fuori l’impasto dal frigorifero',
      'Stendi e inforna',
    ]);
    expect(foglio.passi[0].istruzione).toBe('Chiudi l’impasto a 20 °C.');
    expect(foglio.passi[1].orario?.ora).toMatch(/^\d{2}:\d{2}$/);
    expect(foglio.passi[1].nota).toContain('18 ore a 4 °C');

    // Il PDF vero, non solo il foglio: intestazione %PDF.
    const pdf = creaPdf(foglio);
    expect(String.fromCharCode(...pdf.slice(0, 4))).toBe('%PDF');
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });

  it('con i dati cambiati l’export si blocca e il foglio resta del risultato vecchio', () => {
    const vecchio = calcola(caso('fresco'));
    const nuovo = calcola(caso('secco'));

    // Due oggetti diversi: il modulo non è più quello del risultato a schermo.
    expect(vecchio).not.toBe(nuovo);
    expect(bloccoExport(vecchio, nuovo)).toBe(MESSAGGIO_DATI_CAMBIATI);

    // Ed è il motivo per cui si blocca: il foglio del vecchio risultato dice
    // «fresco» con i grammi del fresco, non con quelli del secco.
    const foglio = foglioDi(vecchio, 'fresco');
    expect(foglio.tipoLievito).toBe(NOMI_LIEVITO.fresco);
    expect(foglio.lievitoG).toBeCloseTo(vecchio.lievitoG, 6);
    expect(foglio.lievitoG).not.toBeCloseTo(nuovo.lievitoG, 6);

    // Dopo il ricalcolo si torna a esportare: il risultato nuovo è quello del modulo.
    expect(bloccoExport(nuovo, nuovo)).toBeNull();
    expect(foglioDi(nuovo, 'secco').tipoLievito).toBe(NOMI_LIEVITO.secco);
  });

  it('senza nessun calcolo non c’è niente da bloccare', () => {
    expect(bloccoExport(null, calcola(caso()))).toBeNull();
    expect(bloccoExport(undefined, null)).toBeNull();
  });
});
