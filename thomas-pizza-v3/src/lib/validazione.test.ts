import { describe, expect, it } from 'vitest';
import {
  leggiIntero,
  leggiNumeroDecimale,
  validaModalitaFarina,
  validaModalitaPanetti,
  validaModalitaTeglie,
  validaStimaTeglia,
} from './validazione';

describe('lettura dei numeri', () => {
  it('accetta virgola e punto come separatore decimale', () => {
    expect(leggiNumeroDecimale('280')).toBe(280);
    expect(leggiNumeroDecimale('280,5')).toBe(280.5);
    expect(leggiNumeroDecimale('280.5')).toBe(280.5);
    expect(leggiNumeroDecimale('0,375')).toBe(0.375);
    expect(leggiNumeroDecimale(' 1,25 ')).toBe(1.25);
  });

  it('rifiuta input parzialmente numerici o ambigui', () => {
    for (const grezzo of [
      '',
      '   ',
      '280abc',
      'abc',
      '1,2,3',
      '1.2.3',
      '1e3',
      'NaN',
      'Infinity',
      '-5',
      '+5',
      '1 000',
      ',',
      '.',
    ]) {
      expect(leggiNumeroDecimale(grezzo), grezzo).toBeNull();
    }
  });

  it('legge solo interi quando richiesto', () => {
    expect(leggiIntero('6')).toBe(6);
    expect(leggiIntero('6,0')).toBe(6);
    expect(leggiIntero('6,5')).toBeNull();
  });
});

describe('validazione per panetti', () => {
  it('accetta valori validi e decimali', () => {
    expect(validaModalitaPanetti('3', '710').valori).toEqual({
      numeroPanetti: 3,
      pesoPanetto: 710,
    });
    expect(validaModalitaPanetti('4', '280,5').valori?.pesoPanetto).toBe(280.5);
  });

  it('segnala campi vuoti, non interi e fuori limite', () => {
    const vuoto = validaModalitaPanetti('', '');
    expect(vuoto.errori.numeroPanetti).toMatch(/Inserisci il numero/);
    expect(vuoto.errori.pesoPanetto).toMatch(/Inserisci il peso/);
    expect(validaModalitaPanetti('6,5', '280').errori.numeroPanetti).toMatch(
      /intero/,
    );
    expect(validaModalitaPanetti('0', '280').errori.numeroPanetti).toMatch(
      /maggiore di zero/,
    );
    expect(validaModalitaPanetti('6', '280abc').errori.pesoPanetto).toBeTruthy();
    expect(validaModalitaPanetti('1001', '280').errori.numeroPanetti).toBeTruthy();
  });
});

describe('validazione per farina', () => {
  it('accetta farina e peso panetto facoltativo', () => {
    expect(validaModalitaFarina('1', '').valori).toEqual({
      farinaKg: 1,
      pesoPanettoG: null,
    });
    expect(validaModalitaFarina('0,375', '280').valori).toEqual({
      farinaKg: 0.375,
      pesoPanettoG: 280,
    });
  });

  it('rifiuta farina o peso panetto non validi', () => {
    expect(validaModalitaFarina('', '').errori.farinaKg).toMatch(
      /Inserisci la quantità/,
    );
    expect(validaModalitaFarina('0', '').errori.farinaKg).toMatch(
      /maggiore di zero/,
    );
    expect(validaModalitaFarina('1kg', '').errori.farinaKg).toBeTruthy();
    expect(validaModalitaFarina('1', '280abc').errori.pesoPanetto).toBeTruthy();
  });

  it('valida soltanto i campi della modalità attiva', () => {
    expect(validaModalitaPanetti('6', '280').errori.farinaKg).toBeUndefined();
    expect(validaModalitaFarina('1', '').errori.numeroPanetti).toBeUndefined();
  });
});

describe('validazione per teglie', () => {
  it('accetta lati rettangolari e numero intero', () => {
    expect(validaModalitaTeglie('30', '40', '1').valori).toEqual({
      latoA: 30,
      latoB: 40,
      numeroTeglie: 1,
    });
    expect(validaModalitaTeglie('25,5', '35.5', '3').valori).toEqual({
      latoA: 25.5,
      latoB: 35.5,
      numeroTeglie: 3,
    });
  });

  it('rifiuta lati vuoti, non numerici o non positivi', () => {
    expect(validaModalitaTeglie('', '40', '1').errori.latoA).toMatch(
      /Inserisci la misura/,
    );
    expect(validaModalitaTeglie('30abc', '40', '1').errori.latoA).toBeTruthy();
    expect(validaModalitaTeglie('0', '40', '1').errori.latoA).toMatch(
      /maggiore di zero/,
    );
    expect(validaModalitaTeglie('501', '40', '1').errori.latoA).toBeTruthy();
  });

  it('rifiuta un numero di teglie non intero, zero o fuori limite', () => {
    expect(validaModalitaTeglie('30', '40', '1,5').errori.numeroTeglie).toMatch(
      /intero/,
    );
    expect(validaModalitaTeglie('30', '40', '0').errori.numeroTeglie).toMatch(
      /maggiore di zero/,
    );
    expect(validaModalitaTeglie('30', '40', '101').errori.numeroTeglie).toBeTruthy();
  });
});

describe('stima facoltativa delle teglie', () => {
  it('accetta entrambi i campi vuoti', () => {
    expect(validaStimaTeglia('', '').valori).toBeNull();
    expect(validaStimaTeglia('', '').errori).toEqual({});
  });

  it('rifiuta un solo lato compilato', () => {
    const esito = validaStimaTeglia('30', '');
    expect(esito.valori).toBeNull();
    expect(esito.errori.latoB).toMatch(/entrambi i lati/);
  });

  it('accetta due lati validi e rifiuta quelli non validi', () => {
    expect(validaStimaTeglia('30', '40').valori).toEqual({
      latoA: 30,
      latoB: 40,
    });
    expect(validaStimaTeglia('trenta', '40').errori.latoA).toBeTruthy();
  });
});
