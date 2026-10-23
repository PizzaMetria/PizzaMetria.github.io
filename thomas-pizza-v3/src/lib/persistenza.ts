import type {
  ModalitaCalcolo,
  OpzioniRicetta,
  RicettaConfig,
  StatoRicetta,
  StatoSalvato,
  ValoriGrezzi,
} from '../types';
import {
  RICETTE,
  RICETTA_PREDEFINITA,
  opzioniIniziali,
} from '../config/ricette';
import { LIMITI, leggiIntero, leggiNumeroDecimale } from './validazione';

export const CHIAVE_STATO = 'impasti-pizza:v1';

type Archivio = Pick<Storage, 'getItem' | 'setItem'>;

function archivioDisponibile(): Archivio | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function oggetto(valore: unknown): Record<string, unknown> {
  return typeof valore === 'object' && valore !== null
    ? (valore as Record<string, unknown>)
    : {};
}

function testo(valore: unknown): string {
  return typeof valore === 'string' ? valore : '';
}

function clona(valori: ValoriGrezzi): ValoriGrezzi {
  return {
    panetti: { ...valori.panetti },
    farina: { ...valori.farina },
    teglie: { ...valori.teglie },
  };
}

const INIZIALI: Record<string, ValoriGrezzi> = {
  'pizza-teglia-biga-85': {
    panetti: { numeroPanetti: '3', pesoPanetto: '710' },
    farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
  },
  'trancio-milanese': {
    panetti: { numeroPanetti: '6', pesoPanetto: '280' },
    farina: { farinaKg: '0,375', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
  },
  'pizza-contemporanea-canotto-77': {
    panetti: { numeroPanetti: '3', pesoPanetto: '280' },
    farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
  },
};

const INIZIALI_GENERICI: ValoriGrezzi = {
  panetti: { numeroPanetti: '6', pesoPanetto: '280' },
  farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
  teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
};

export function valoriIniziali(ricettaId: string): ValoriGrezzi {
  return clona(INIZIALI[ricettaId] ?? INIZIALI_GENERICI);
}

export function modalitaIniziale(ricetta: RicettaConfig): ModalitaCalcolo {
  return ricetta.modalita[0] ?? 'farina';
}

function modalitaValida(
  ricetta: RicettaConfig,
  valore: unknown,
): ModalitaCalcolo {
  return ricetta.modalita.includes(valore as ModalitaCalcolo)
    ? (valore as ModalitaCalcolo)
    : modalitaIniziale(ricetta);
}

function interoValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiIntero(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxPanetti) return null;
  return valore;
}

function numeroTeglieValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiIntero(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxTeglie) return null;
  return valore;
}

function latoValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiNumeroDecimale(valore);
  if (
    numero === null ||
    numero <= 0 ||
    numero > LIMITI.maxLatoTegliaCm
  ) {
    return null;
  }
  return valore;
}

function pesoValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiNumeroDecimale(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxPesoPanettoG) {
    return null;
  }
  return valore;
}

function pesoOpzionaleValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  if (valore.trim() === '') return '';
  return pesoValido(valore);
}

function farinaValida(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiNumeroDecimale(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxFarinaKg) {
    return null;
  }
  return valore;
}

function stimaValida(
  latoA: unknown,
  latoB: unknown,
): { latoA: string; latoB: string } | null {
  if (latoA === '' && latoB === '') return { latoA: '', latoB: '' };
  const a = latoValido(latoA);
  const b = latoValido(latoB);
  if (a === null || b === null) return null;
  return { latoA: a, latoB: b };
}

function sanificaValori(
  grezzo: Record<string, unknown>,
  fallback: ValoriGrezzi,
): ValoriGrezzi {
  const panetti = oggetto(grezzo.panetti);
  const farina = oggetto(grezzo.farina);
  const teglie = oggetto(grezzo.teglie);
  const stima = stimaValida(
    testo(farina.latoA),
    testo(farina.latoB),
  ) ?? { latoA: fallback.farina.latoA, latoB: fallback.farina.latoB };

  return {
    panetti: {
      numeroPanetti:
        interoValido(panetti.numeroPanetti) ??
        fallback.panetti.numeroPanetti,
      pesoPanetto:
        pesoValido(panetti.pesoPanetto) ?? fallback.panetti.pesoPanetto,
    },
    farina: {
      farinaKg: farinaValida(farina.farinaKg) ?? fallback.farina.farinaKg,
      pesoPanetto:
        pesoOpzionaleValido(farina.pesoPanetto) ??
        fallback.farina.pesoPanetto,
      latoA: stima.latoA,
      latoB: stima.latoB,
    },
    teglie: {
      latoA: latoValido(teglie.latoA) ?? fallback.teglie.latoA,
      latoB: latoValido(teglie.latoB) ?? fallback.teglie.latoB,
      numeroTeglie:
        numeroTeglieValido(teglie.numeroTeglie) ??
        fallback.teglie.numeroTeglie,
    },
  };
}

function sanificaOpzioni(
  ricetta: RicettaConfig,
  grezzo: Record<string, unknown>,
): OpzioniRicetta {
  const predefinite = opzioniIniziali(ricetta);
  const tipoLievito =
    grezzo.tipoLievito === 'secco' || grezzo.tipoLievito === 'fresco'
      ? grezzo.tipoLievito
      : predefinite.tipoLievito;

  const autolisiPredefinita = predefinite.autolisi;

  return {
    tipoLievito,
    autolisi:
      ricetta.autolisiOpzionale === true
        ? typeof grezzo.autolisi === 'boolean'
          ? grezzo.autolisi
          : autolisiPredefinita
        : ricetta.famiglia === 'biga-autolisi',
  };
}

function creaStatoRicetta(
  ricetta: RicettaConfig,
  grezzo: Record<string, unknown>,
): StatoRicetta {
  const predefiniti = valoriIniziali(ricetta.id);
  const valori = sanificaValori(
    oggetto(grezzo.valori),
    predefiniti,
  );
  const validiGrezzi = oggetto(grezzo.validi);
  const validi =
    Object.keys(validiGrezzi).length > 0
      ? sanificaValori(validiGrezzi, valori)
      : valori;

  return {
    modalita: modalitaValida(ricetta, grezzo.modalita),
    opzioni: sanificaOpzioni(ricetta, oggetto(grezzo.opzioni)),
    valori,
    validi,
  };
}

function statoPredefinito(ricetta: RicettaConfig): StatoRicetta {
  const valori = valoriIniziali(ricetta.id);
  return {
    modalita: modalitaIniziale(ricetta),
    opzioni: opzioniIniziali(ricetta),
    valori,
    validi: clona(valori),
  };
}

/** Carica lo stato nuovo o migra quello salvato dalla versione precedente. */
export function caricaStato(
  archivio: Archivio | null = archivioDisponibile(),
): StatoSalvato {
  const predefinito: StatoSalvato = {
    ricettaId: RICETTA_PREDEFINITA.id,
    ricette: Object.fromEntries(
      RICETTE.map((ricetta) => [ricetta.id, statoPredefinito(ricetta)]),
    ),
  };

  try {
    const grezzo = archivio?.getItem(CHIAVE_STATO);
    if (!grezzo) return predefinito;

    const dati = oggetto(JSON.parse(grezzo));
    const ricetteSalvate = oggetto(dati.ricette);

    // Migrazione dal formato v1: { modalita, valori } della sola Biga 75%.
    if (Object.keys(ricetteSalvate).length === 0 && dati.valori !== undefined) {
      return {
        ...predefinito,
        ricette: {
          ...predefinito.ricette,
          [RICETTA_PREDEFINITA.id]: creaStatoRicetta(
            RICETTA_PREDEFINITA,
            {
              modalita: dati.modalita,
              valori: dati.valori,
            },
          ),
        },
      };
    }

    const ricette = { ...predefinito.ricette };
    for (const ricetta of RICETTE) {
      const salvata = ricetteSalvate[ricetta.id];
      if (salvata !== undefined) {
        ricette[ricetta.id] = creaStatoRicetta(
          ricetta,
          oggetto(salvata),
        );
      }
    }

    const ricettaId = RICETTE.some((ricetta) => ricetta.id === dati.ricettaId)
      ? (dati.ricettaId as string)
      : RICETTA_PREDEFINITA.id;

    return { ricettaId, ricette };
  } catch {
    return predefinito;
  }
}

/** Scrive lo stato ignorando quota esaurita o archivi non disponibili. */
export function salvaStato(
  stato: StatoSalvato,
  archivio: Archivio | null = archivioDisponibile(),
): void {
  if (!archivio) return;
  try {
    archivio.setItem(
      CHIAVE_STATO,
      JSON.stringify({ versione: 3, ...stato }),
    );
  } catch {
    // La persistenza non deve bloccare l'app.
  }
}

/**
 * Mantiene i valori precedenti per i campi diventati invalidi, così da
 * conservare sempre gli ultimi valori validi di ciascuna modalità.
 */
export function aggiornaValoriValidi(
  precedenti: ValoriGrezzi,
  nuovi: ValoriGrezzi,
): ValoriGrezzi {
  const stima = stimaValida(nuovi.farina.latoA, nuovi.farina.latoB);

  return {
    panetti: {
      numeroPanetti:
        interoValido(nuovi.panetti.numeroPanetti) ??
        precedenti.panetti.numeroPanetti,
      pesoPanetto:
        pesoValido(nuovi.panetti.pesoPanetto) ??
        precedenti.panetti.pesoPanetto,
    },
    farina: {
      farinaKg:
        farinaValida(nuovi.farina.farinaKg) ??
        precedenti.farina.farinaKg,
      pesoPanetto:
        pesoOpzionaleValido(nuovi.farina.pesoPanetto) ??
        precedenti.farina.pesoPanetto,
      latoA: stima?.latoA ?? precedenti.farina.latoA,
      latoB: stima?.latoB ?? precedenti.farina.latoB,
    },
    teglie: {
      latoA: latoValido(nuovi.teglie.latoA) ?? precedenti.teglie.latoA,
      latoB: latoValido(nuovi.teglie.latoB) ?? precedenti.teglie.latoB,
      numeroTeglie:
        numeroTeglieValido(nuovi.teglie.numeroTeglie) ??
        precedenti.teglie.numeroTeglie,
    },
  };
}
