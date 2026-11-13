import type {
  ModalitaCalcolo,
  OpzioniRicetta,
  RichiestaBiga,
  RicettaConfig,
  RigaProdottoGrezza,
  StatoRicetta,
  StatoSalvato,
  ValoriGrezzi,
} from '../types';
import {
  RICETTE,
  RICETTA_PREDEFINITA,
  opzioniIniziali,
} from '../config/ricette';
import {
  parametriIniziali,
  sanificaParametri,
} from '../config/personalizzazione';
import { LIMITI, leggiIntero, leggiNumeroDecimale } from './validazione';
import { oreAttesa } from './motore-biga';

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
    prodotti: Object.fromEntries(
      Object.entries(valori.prodotti).map(([id, riga]) => [id, { ...riga }]),
    ),
  };
}

const INIZIALI: Record<string, ValoriGrezzi> = {
  'pizza-teglia-biga-85': {
    panetti: { numeroPanetti: '3', pesoPanetto: '710' },
    farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
    prodotti: {},
  },
  'trancio-milanese': {
    panetti: { numeroPanetti: '6', pesoPanetto: '280' },
    farina: { farinaKg: '0,375', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
    prodotti: {},
  },
  'pizza-contemporanea-con-biga-77': {
    panetti: { numeroPanetti: '3', pesoPanetto: '280' },
    farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
    teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
    prodotti: {},
  },
};

const INIZIALI_GENERICI: ValoriGrezzi = {
  panetti: { numeroPanetti: '6', pesoPanetto: '280' },
  farina: { farinaKg: '1', pesoPanetto: '', latoA: '', latoB: '' },
  teglie: { latoA: '30', latoB: '40', numeroTeglie: '1' },
  prodotti: {},
};

/** Id con cui la pizza contemporanea era salvata prima della rinomina. */
const ID_CANOTTO_PRECEDENTE = 'pizza-contemporanea-canotto-77';

export function valoriIniziali(ricettaId: string): ValoriGrezzi {
  const valori = clona(INIZIALI[ricettaId] ?? INIZIALI_GENERICI);
  const ricetta = RICETTE.find((voce) => voce.id === ricettaId);

  // Tutti i formati partono a zero: si sceglie dall'elenco a fisarmonica
  // quali preparare, senza che nessuno sia già selezionato al posto nostro.
  if (ricetta?.prodotti && ricetta.prodotti.length > 0) {
    valori.prodotti = Object.fromEntries(
      ricetta.prodotti.map((prodotto) => {
        const riga: RigaProdottoGrezza = {
          quantita: '0',
          peso: String(prodotto.pesoBaseG),
        };

        // Diametro o stampo di riferimento: il peso resta poi modificabile.
        if (prodotto.dimensione) {
          riga.dimA = String(prodotto.dimensione.baseA);
          if (prodotto.dimensione.baseB !== undefined) {
            riga.dimB = String(prodotto.dimensione.baseB);
          }
        }

        return [prodotto.id, riga];
      }),
    );
  }

  return valori;
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

function quantitaProdottoValida(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiIntero(valore);
  if (numero === null || numero < 0 || numero > LIMITI.maxPezzi) return null;
  return valore;
}

function pesoProdottoValido(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiNumeroDecimale(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxPesoPanettoG) {
    return null;
  }
  return valore;
}

/** Diametro o lato dello stampo salvato: misura positiva e ragionevole. */
function misuraValida(valore: unknown): string | null {
  if (typeof valore !== 'string') return null;
  const numero = leggiNumeroDecimale(valore);
  if (numero === null || numero <= 0 || numero > LIMITI.maxLatoTegliaCm) {
    return null;
  }
  return valore;
}

function sanificaProdotti(
  grezzo: unknown,
  fallback: Record<string, RigaProdottoGrezza>,
): Record<string, RigaProdottoGrezza> {
  const dati = oggetto(grezzo);
  const risultato: Record<string, RigaProdottoGrezza> = {};

  for (const [id, iniziale] of Object.entries(fallback)) {
    const riga = oggetto(dati[id]);
    const sanificata: RigaProdottoGrezza = {
      quantita: quantitaProdottoValida(riga.quantita) ?? iniziale.quantita,
      peso: pesoProdottoValido(riga.peso) ?? iniziale.peso,
    };

    // Diametro e stampo esistono solo per i formati che li prevedono.
    if (iniziale.dimA !== undefined) {
      sanificata.dimA = misuraValida(riga.dimA) ?? iniziale.dimA;
    }
    if (iniziale.dimB !== undefined) {
      sanificata.dimB = misuraValida(riga.dimB) ?? iniziale.dimB;
    }

    risultato[id] = sanificata;
  }

  return risultato;
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
    prodotti: sanificaProdotti(grezzo.prodotti, fallback.prodotti),
  };
}

/**
 * Il piano della biga salvato: numeri nei limiti, altrimenti quelli della
 * ricetta. Un valore fuori scala non deve rompere il calcolo al riaprire.
 */
function sanificaBiga(
  grezzo: unknown,
  predefinita: RichiestaBiga | undefined,
): RichiestaBiga | undefined {
  if (!predefinita) return undefined;
  const dati = oggetto(grezzo);

  const numero = (valore: unknown, fallback: number, minimo: number, massimo: number) => {
    const grezzo =
      typeof valore === 'number'
        ? valore
        : Number.parseFloat(testo(valore).replace(',', '.'));
    if (!Number.isFinite(grezzo)) return fallback;
    return Math.min(massimo, Math.max(minimo, grezzo));
  };

  // Gli orari sono la fonte dell'attesa: si accettano sia il giorno con l'ora
  // («YYYY-MM-DDTHH:MM», l'input del modulo) sia i vecchi «HH:MM», che restano
  // come sono e prendono il giorno solo quando si mostrano. Un orario
  // illeggibile torna a quello della ricetta, mai a una stringa vuota che
  // spezzerebbe il calcolo.
  const oraValida = (valore: unknown, difetto: string | undefined) => {
    const scritto = typeof valore === 'string' ? valore : '';
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(scritto)) return scritto;
    if (/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(scritto)) {
      return scritto;
    }
    return difetto;
  };

  const oraImpasto = oraValida(dati.oraImpasto, predefinita.oraImpasto);
  const oraPronta = oraValida(dati.oraPronta, predefinita.oraPronta);
  const oreSalvate = numero(
    dati.ore,
    predefinita.ore,
    LIMITI.oreBiga.min,
    LIMITI.oreBiga.max,
  );
  const ore =
    oraImpasto && oraPronta
      ? (oreAttesa(oraImpasto, oraPronta) ?? oreSalvate)
      : oreSalvate;

  return {
    temperatura: numero(
      dati.temperatura,
      predefinita.temperatura,
      LIMITI.temperaturaBiga.min,
      LIMITI.temperaturaBiga.max,
    ),
    ore,
    temperaturaFrigo: numero(
      dati.temperaturaFrigo,
      predefinita.temperaturaFrigo,
      LIMITI.frigoBiga.min,
      LIMITI.frigoBiga.max,
    ),
    ...(typeof dati.tuttaInFrigo === 'boolean' ? { tuttaInFrigo: dati.tuttaInFrigo } : {}),
    ...(typeof dati.oreAmbienteMisto === 'string' ? { oreAmbienteMisto: dati.oreAmbienteMisto } : {}),
    ...(oraImpasto ? { oraImpasto } : {}),
    ...(oraPronta ? { oraPronta } : {}),
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

  const autolisiPredefinita =
    ricetta.id === 'pizza-teglia-biga-85' ? true : predefinite.autolisi;

  const biga = sanificaBiga(grezzo.biga, ricetta.motoreBiga);

  return {
    tipoLievito,
    autolisi:
      ricetta.autolisiOpzionale === true
        ? typeof grezzo.autolisi === 'boolean'
          ? grezzo.autolisi
          : autolisiPredefinita
        : ricetta.famiglia === 'biga-autolisi',
    ...(biga ? { biga } : {}),
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

  const opzioni = sanificaOpzioni(ricetta, oggetto(grezzo.opzioni));

  return {
    modalita: modalitaValida(ricetta, grezzo.modalita),
    opzioni,
    valori,
    validi,
    parametri: sanificaParametri(ricetta, opzioni, oggetto(grezzo.parametri)),
  };
}

function statoPredefinito(ricetta: RicettaConfig): StatoRicetta {
  const valori = valoriIniziali(ricetta.id);
  const opzioni = opzioniIniziali(ricetta);
  return {
    modalita: modalitaIniziale(ricetta),
    opzioni,
    valori,
    validi: clona(valori),
    parametri: parametriIniziali(ricetta, opzioni),
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
      // La pizza contemporanea è stata rinominata: lo stato salvato con il
      // vecchio id viene ripreso senza perdere percentuali e quantità.
      const salvata = ricetteSalvate[ricetta.id] ??
        (ricetta.id === 'pizza-contemporanea-con-biga-77'
          ? ricetteSalvate[ID_CANOTTO_PRECEDENTE]
          : undefined);
      if (salvata !== undefined) {
        ricette[ricetta.id] = creaStatoRicetta(
          ricetta,
          oggetto(salvata),
        );
      }
    }

    const ricettaScelta =
      dati.ricettaId === ID_CANOTTO_PRECEDENTE
        ? 'pizza-contemporanea-con-biga-77'
        : dati.ricettaId;
    const ricettaId = RICETTE.some((ricetta) => ricetta.id === ricettaScelta)
      ? (ricettaScelta as string)
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
    prodotti: sanificaProdotti(nuovi.prodotti, precedenti.prodotti),
  };
}
