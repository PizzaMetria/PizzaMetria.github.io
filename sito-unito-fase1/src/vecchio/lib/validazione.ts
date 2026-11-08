import type { ErroriCampi } from '../types';

/** Limiti generosi che evitano risultati non rappresentabili. */
export const LIMITI = {
  maxPanetti: 1000,
  maxPesoPanettoG: 50_000,
  maxFarinaKg: 1000,
  maxLatoTegliaCm: 500,
  maxTeglie: 100,
  /** Tetto di sicurezza per i pezzi del calcolatore misto. */
  maxPezzi: 1000,
  /** Temperatura dell'ambiente per la maturazione della biga, in °C. */
  temperaturaBiga: { min: 8, max: 32 },
  /** Attesa della biga, in ore. */
  oreBiga: { min: 1, max: 72 },
  /** Temperatura del frigorifero, in °C. */
  frigoBiga: { min: 0, max: 12 },
} as const;

export const MESSAGGI = {
  numeroPanettiVuoto: 'Inserisci il numero di panetti.',
  numeroPanettiIntero: 'Il numero dei panetti deve essere un numero intero.',
  numeroPanettiNonValido: 'Inserisci un numero intero valido.',
  numeroPanettiZero: 'Il numero dei panetti deve essere maggiore di zero.',
  numeroPanettiMax: `Il numero massimo è ${LIMITI.maxPanetti} panetti.`,
  pesoPanettoVuoto: 'Inserisci il peso di ciascun panetto.',
  pesoPanettoNonValido: 'Inserisci un numero valido, ad esempio 280 o 280,5.',
  pesoPanettoZero: 'Il peso del panetto deve essere maggiore di zero.',
  pesoPanettoMax: 'Il peso massimo per panetto è 50.000 g.',
  farinaVuota: 'Inserisci la quantità di farina totale.',
  farinaNonValida: 'Inserisci un numero valido, ad esempio 1 o 1,25.',
  farinaZero: 'La quantità di farina deve essere maggiore di zero.',
  farinaMax: 'La quantità massima è 1.000 kg.',
  latoVuoto: 'Inserisci la misura del lato della teglia.',
  latoNonValido: 'Inserisci un numero valido, ad esempio 30 o 30,5.',
  latoZero: 'Il lato della teglia deve essere maggiore di zero.',
  latoMax: `Il lato massimo è ${LIMITI.maxLatoTegliaCm} cm.`,
  stimaEntrambi: 'Inserisci entrambi i lati oppure lascia vuoti entrambi i campi.',
  teglieVuote: 'Inserisci il numero di teglie.',
  teglieIntero: 'Il numero di teglie deve essere un numero intero.',
  teglieNonValido: 'Inserisci un numero intero valido.',
  teglieZero: 'Il numero di teglie deve essere maggiore di zero.',
  teglieMax: `Il numero massimo è ${LIMITI.maxTeglie} teglie.`,
  prodottiVuoti: 'Indica almeno un prodotto: inserisci la quantità di almeno un formato.',
  pezziNonValido: 'Inserisci un numero intero di pezzi, anche 0 per escluderlo.',
  pezziMax: `Il numero massimo è ${LIMITI.maxPezzi} pezzi per formato.`,
  pesoPezzoNonValido: 'Inserisci un peso valido, ad esempio 200 o 90,5.',
  pesoPezzoZero: 'Il peso del pezzo deve essere maggiore di zero.',
  pesoPezzoMax: 'Il peso massimo per pezzo è 50.000 g.',
} as const;

/**
 * Legge un numero scritto con virgola o punto.
 * Rifiuta stringhe parzialmente numeriche ("280abc"), separatori multipli,
 * notazione esponenziale, spazi interni e segni.
 */
export function leggiNumeroDecimale(grezzo: string): number | null {
  const testo = grezzo.trim();
  if (testo === '') return null;
  if (!/^(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(testo)) return null;

  const numero = Number(testo.replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

/** Legge un intero positivo/zero (la positività è validata a parte). */
export function leggiIntero(grezzo: string): number | null {
  const numero = leggiNumeroDecimale(grezzo);
  if (numero === null || !Number.isInteger(numero)) return null;
  return numero;
}

function leggiLato(
  grezzo: string,
  campo: 'latoA' | 'latoB',
  errori: ErroriCampi,
): number | null {
  const testo = grezzo.trim();
  if (testo === '') {
    errori[campo] = MESSAGGI.latoVuoto;
    return null;
  }
  const valore = leggiNumeroDecimale(testo);
  if (valore === null) {
    errori[campo] = MESSAGGI.latoNonValido;
    return null;
  }
  if (valore <= 0) {
    errori[campo] = MESSAGGI.latoZero;
    return null;
  }
  if (valore > LIMITI.maxLatoTegliaCm) {
    errori[campo] = MESSAGGI.latoMax;
    return null;
  }
  return valore;
}

export interface EsitoValidazionePanetti {
  valori: { numeroPanetti: number; pesoPanetto: number } | null;
  errori: ErroriCampi;
}

export function validaModalitaPanetti(
  numeroPanetti: string,
  pesoPanetto: string,
): EsitoValidazionePanetti {
  const errori: ErroriCampi = {};

  const panettiGrezzi = numeroPanetti.trim();
  let panetti: number | null = null;
  if (panettiGrezzi === '') {
    errori.numeroPanetti = MESSAGGI.numeroPanettiVuoto;
  } else {
    panetti = leggiIntero(panettiGrezzi);
    if (panetti === null) {
      const numero = leggiNumeroDecimale(panettiGrezzi);
      errori.numeroPanetti =
        numero === null
          ? MESSAGGI.numeroPanettiNonValido
          : MESSAGGI.numeroPanettiIntero;
    } else if (panetti <= 0) {
      errori.numeroPanetti = MESSAGGI.numeroPanettiZero;
    } else if (panetti > LIMITI.maxPanetti) {
      errori.numeroPanetti = MESSAGGI.numeroPanettiMax;
    }
  }

  const pesoGrezzo = pesoPanetto.trim();
  let peso: number | null = null;
  if (pesoGrezzo === '') {
    errori.pesoPanetto = MESSAGGI.pesoPanettoVuoto;
  } else {
    peso = leggiNumeroDecimale(pesoGrezzo);
    if (peso === null) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoNonValido;
    } else if (peso <= 0) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoZero;
    } else if (peso > LIMITI.maxPesoPanettoG) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoMax;
    }
  }

  if (Object.keys(errori).length > 0 || panetti === null || peso === null) {
    return { valori: null, errori };
  }

  return { valori: { numeroPanetti: panetti, pesoPanetto: peso }, errori };
}

export interface EsitoValidazioneFarina {
  valori: { farinaKg: number; pesoPanettoG: number | null } | null;
  errori: ErroriCampi;
}

export function validaModalitaFarina(
  farinaKg: string,
  pesoPanetto: string,
): EsitoValidazioneFarina {
  const errori: ErroriCampi = {};

  const farinaGrezza = farinaKg.trim();
  let farina: number | null = null;
  if (farinaGrezza === '') {
    errori.farinaKg = MESSAGGI.farinaVuota;
  } else {
    farina = leggiNumeroDecimale(farinaGrezza);
    if (farina === null) {
      errori.farinaKg = MESSAGGI.farinaNonValida;
    } else if (farina <= 0) {
      errori.farinaKg = MESSAGGI.farinaZero;
    } else if (farina > LIMITI.maxFarinaKg) {
      errori.farinaKg = MESSAGGI.farinaMax;
    }
  }

  const pesoGrezzo = pesoPanetto.trim();
  let peso: number | null = null;
  if (pesoGrezzo !== '') {
    peso = leggiNumeroDecimale(pesoGrezzo);
    if (peso === null) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoNonValido;
    } else if (peso <= 0) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoZero;
    } else if (peso > LIMITI.maxPesoPanettoG) {
      errori.pesoPanetto = MESSAGGI.pesoPanettoMax;
    }
  }

  if (Object.keys(errori).length > 0 || farina === null) {
    return { valori: null, errori };
  }

  return { valori: { farinaKg: farina, pesoPanettoG: peso }, errori };
}

export interface EsitoValidazioneTeglie {
  valori: { latoA: number; latoB: number; numeroTeglie: number } | null;
  errori: ErroriCampi;
}

export function validaModalitaTeglie(
  latoA: string,
  latoB: string,
  numeroTeglie: string,
): EsitoValidazioneTeglie {
  const errori: ErroriCampi = {};
  const a = leggiLato(latoA, 'latoA', errori);
  const b = leggiLato(latoB, 'latoB', errori);

  const grezze = numeroTeglie.trim();
  let numero: number | null = null;
  if (grezze === '') {
    errori.numeroTeglie = MESSAGGI.teglieVuote;
  } else {
    numero = leggiIntero(grezze);
    if (numero === null) {
      const decimale = leggiNumeroDecimale(grezze);
      errori.numeroTeglie =
        decimale === null ? MESSAGGI.teglieNonValido : MESSAGGI.teglieIntero;
    } else if (numero <= 0) {
      errori.numeroTeglie = MESSAGGI.teglieZero;
    } else if (numero > LIMITI.maxTeglie) {
      errori.numeroTeglie = MESSAGGI.teglieMax;
    }
  }

  if (Object.keys(errori).length > 0 || a === null || b === null || numero === null) {
    return { valori: null, errori };
  }

  return { valori: { latoA: a, latoB: b, numeroTeglie: numero }, errori };
}

export interface EsitoValidazioneProdotti {
  valori: { id: string; quantita: number; pesoG: number }[] | null;
  errori: ErroriCampi;
}

/**
 * Calcolatore misto: ogni riga ha quantità intera (zero esclude il formato) e
 * peso del singolo pezzo. Serve almeno un formato con quantità maggiore di zero.
 */
export function validaModalitaProdotti(
  righe: readonly {
    id: string;
    quantita: string;
    peso: string;
  }[],
): EsitoValidazioneProdotti {
  const errori: ErroriCampi = {};
  const valori: { id: string; quantita: number; pesoG: number }[] = [];

  for (const riga of righe) {
    const chiave = `prodotto-${riga.id}` as const;
    const quantitaGrezza = riga.quantita.trim();
    const pesoGrezzo = riga.peso.trim();

    let quantita = 0;
    if (quantitaGrezza !== '') {
      const numero = leggiIntero(quantitaGrezza);
      if (numero === null) {
        errori[chiave] = MESSAGGI.pezziNonValido;
        continue;
      }
      if (numero < 0) {
        errori[chiave] = MESSAGGI.pezziNonValido;
        continue;
      }
      if (numero > LIMITI.maxPezzi) {
        errori[chiave] = MESSAGGI.pezziMax;
        continue;
      }
      quantita = numero;
    }

    // Il peso serve solo ai formati effettivamente scelti: a zero la riga è
    // esclusa e non si chiede nulla.
    if (quantita === 0) {
      continue;
    }

    let peso = 0;
    if (pesoGrezzo === '') {
      errori[chiave] = MESSAGGI.pesoPezzoZero;
      continue;
    }
    const numeroPeso = leggiNumeroDecimale(pesoGrezzo);
    if (numeroPeso === null) {
      errori[chiave] = MESSAGGI.pesoPezzoNonValido;
      continue;
    }
    if (numeroPeso <= 0) {
      errori[chiave] = MESSAGGI.pesoPezzoZero;
      continue;
    }
    if (numeroPeso > LIMITI.maxPesoPanettoG) {
      errori[chiave] = MESSAGGI.pesoPezzoMax;
      continue;
    }
    peso = numeroPeso;

    valori.push({ id: riga.id, quantita, pesoG: peso });
  }

  if (Object.keys(errori).length > 0) {
    return { valori: null, errori };
  }

  if (valori.length === 0) {
    return { valori: null, errori: { prodotti: MESSAGGI.prodottiVuoti } };
  }

  return { valori, errori };
}

export interface EsitoValidazioneStima {
  valori: { latoA: number; latoB: number } | null;
  errori: ErroriCampi;
}

/** Stima facoltativa delle teglie: entrambi i lati vuoti o entrambi validi. */
export function validaStimaTeglia(
  latoA: string,
  latoB: string,
): EsitoValidazioneStima {
  const errori: ErroriCampi = {};
  const aVuoto = latoA.trim() === '';
  const bVuoto = latoB.trim() === '';

  if (aVuoto && bVuoto) {
    return { valori: null, errori };
  }

  if (aVuoto || bVuoto) {
    if (aVuoto) errori.latoA = MESSAGGI.stimaEntrambi;
    if (bVuoto) errori.latoB = MESSAGGI.stimaEntrambi;
    return { valori: null, errori };
  }

  const a = leggiLato(latoA, 'latoA', errori);
  const b = leggiLato(latoB, 'latoB', errori);
  if (Object.keys(errori).length > 0 || a === null || b === null) {
    return { valori: null, errori };
  }
  return { valori: { latoA: a, latoB: b }, errori };
}


