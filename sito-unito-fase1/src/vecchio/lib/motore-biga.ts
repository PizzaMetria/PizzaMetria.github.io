/**
 * MOTORE DELLA BIGA
 * =================
 * Il motore di BigaMetrica, portato qui dentro senza cambiargli i numeri:
 * risponde alle due facce dello stesso conto.
 *
 *   1. quante ore matura una biga con una certa idratazione a una certa
 *      temperatura;
 *   2. quale idratazione serve perché sia pronta in un tempo dato.
 *
 *       ore = (1 / T) · (K / (a · idr + b)) ^ (5/6) + correzione(T)
 *
 * I coefficienti sono quelli stimati sulle misure reali dell'app di
 * riferimento; la correzione sotto i 16 °C è empirica e il modello è verificato
 * fino a 27 °C, oltre i quali si ferma invece di estrapolare.
 *
 * IL FRIGORIFERO
 * --------------
 * Il frigo è l'estensione nostra: se l'attesa è più lunga della finestra
 * dell'ambiente la biga va tutta in frigorifero, come le 24 ore classiche a
 * 4 °C, e non metà in ambiente e metà al freddo. Ogni 10 °C in meno il
 * processo dimezza, quindi un'ora a `temperaturaFrigo` vale
 * `2^((temperaturaFrigo − T) / 10)` ore in ambiente. Le 24 ore sono il tetto
 * delle ricette di casa.
 */

export const COSTANTI = {
  /** Pendenza dell'idratazione nella formula delle ore. */
  lineare: 7.74,
  /** Termine noto della stessa formula. */
  noto: -83.5,
  /** Numeratore: stimato sulle misure reali. */
  numeratore: 270534,
  /** Esponente della formula delle ore (5/6). */
  esponente: 5 / 6,

  /** Da questa temperatura in su il riferimento di idratazione scende a 55 %. */
  sogliaRiferimento: 22,
  /** Fino a questa temperatura il modello è verificato. */
  sogliaVerificata: 27,
  /** Oltre la soglia l'idratazione consigliata è questa, fissa. */
  idrRiferimentoAlta: 44,

  /** Estremi dell'idratazione ammessa, in %. */
  idrMinimo: 40,
  idrMassimo: 60,

  /** Tolleranza attorno alle ore obiettivo: ±20 %. */
  tolleranzaPro: 0.2,
  /** Estremo superiore quando fa caldo. */
  idrMassimoCaldo: 55,
  /** Idratazione della biga che passa dal frigorifero: la regola delle 24 ore. */
  idrConFrigo: 55,

  /** Sotto questa temperatura serve una correzione empirica. */
  correzioneSoglia: 16,
  correzioneBase: 0.1382,
  correzioneEsponente: 4 / 3,
} as const;

/** Oltre i 27 °C il modello di riferimento cambia ramo e non è ricostruito. */
export const OLTRE_MODELLO = COSTANTI.sogliaVerificata;

export const FRIGO = {
  /** Temperatura proposta dal campo, in °C. */
  temperatura: 4,
  /** Oltre queste ore di frigo non si va: è il massimo delle ricette di casa. */
  massimoOre: 24,
} as const;

/** Margine sugli estremi della finestra: il modello arrotonda al minuto. */
export const MARGINE_ORE = 10 / 60;

export interface Finestra {
  min: number;
  max: number;
}

export type Ramo = 'sotto' | 'sopra';

export interface Maturazione {
  /** Ore intere. */
  ore: number;
  /** Minuti (0–59, arrotondati). */
  minuti: number;
  /** Ore decimali: è il valore su cui si fanno i conti. */
  decimale: number;
  ramo: Ramo;
}

/**
 * Ore fra due orari «HH:MM». Se l'ora di fine è più bassa di quella di inizio
 * si passa al giorno dopo: 20:00 → 08:00 sono 12 ore, non −12.
 *
 * Con il giorno scritto per intero («YYYY-MM-DDTHH:MM», l'input del modulo)
 * contano anche i giorni: il 4 novembre alle 8 → il 5 novembre alle 8 sono 24
 * ore, e una fine prima dell'inizio resta un errore invece di diventare
 * un'attesa negativa.
 */
export function oreAttesa(
  oraImpasto: string,
  oraPronta: string,
): number | null {
  if (oraImpasto.includes('T') || oraPronta.includes('T')) {
    const a = new Date(oraImpasto);
    const b = new Date(oraPronta);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    const ore = (b.getTime() - a.getTime()) / 3_600_000;
    return ore >= 0 ? ore : null;
  }

  const leggi = (testo: string): number | null => {
    const parti = testo.split(':');
    if (parti.length < 2) return null;
    const ore = Number.parseInt(parti[0], 10);
    const minuti = Number.parseInt(parti[1], 10);
    if (!Number.isFinite(ore) || !Number.isFinite(minuti)) return null;
    return ore * 60 + minuti;
  };

  const inizio = leggi(oraImpasto);
  const fine = leggi(oraPronta);
  if (inizio === null || fine === null) return null;

  const minuti = fine > inizio ? fine - inizio : fine + 24 * 60 - inizio;
  return minuti / 60;
}

/** La temperatura si arrotonda a un decimale, come nei campi del calcolatore. */
export function arrotondaTemperatura(T: number): number {
  return Math.round(T * 10) / 10;
}

/** La temperatura richiesta è oltre il ramo verificato del modello. */
export function oltreModello(T: number): boolean {
  return arrotondaTemperatura(T) > OLTRE_MODELLO;
}

/** Denominatore della formula delle ore. */
export function denominatore(idr: number): number {
  return COSTANTI.lineare * idr + COSTANTI.noto;
}

/** Ore grezze: (1/T) · (numeratore / denominatore)^(5/6). */
export function oreGrezze(idr: number, T: number): number {
  const d = denominatore(idr);
  if (d === 0) return Number.POSITIVE_INFINITY;
  const base = COSTANTI.numeratore / d;
  if (base < 0) return Number.NaN;
  return Math.pow(base, COSTANTI.esponente) / T;
}

/** Divide le ore in ore intere e minuti: 17,7596 h → 17 h 46 min. */
export function spezzaOre(h: number): { ore: number; minuti: number } {
  if (!Number.isFinite(h)) {
    throw new Error('Valore non finito: da qui non si ricavano ore e minuti.');
  }
  const ore = Math.floor(h);
  const minuti = Math.round(((h * 3600) % 3600) / 60);
  return minuti === 60 ? { ore: ore + 1, minuti: 0 } : { ore, minuti };
}

/**
 * Correzione sotto i 16 °C: la formula base è verificata fra 16 e 22 °C, sotto
 * l'app misura ore più lunghe e la differenza segue 0,1382 · (16 − T)^(4/3).
 * È una correzione empirica, non una legge ricostruita.
 */
export function correzioneFreddo(T: number): number {
  const t = arrotondaTemperatura(T);
  if (t >= COSTANTI.correzioneSoglia) return 0;
  return (
    COSTANTI.correzioneBase *
    Math.pow(COSTANTI.correzioneSoglia - t, COSTANTI.correzioneEsponente)
  );
}

/** Ore decimali complete: formula più correzione sotto i 16 °C. */
export function oreDecimali(idr: number, T: number): number {
  return oreGrezze(idr, T) + correzioneFreddo(T);
}

/** Maturazione completa per temperatura e idratazione. */
export function maturazione(T: number, idr: number): Maturazione {
  const t = arrotondaTemperatura(T);
  const decimale = oreDecimali(idr, t);
  const { ore, minuti } = spezzaOre(decimale);
  return {
    ore,
    minuti,
    decimale,
    ramo: t < COSTANTI.sogliaVerificata ? 'sotto' : 'sopra',
  };
}

/** Idratazione di riferimento: 60 % fino a 22 °C, 55 % sopra. */
export function idratazioneRiferimento(T: number): number {
  return arrotondaTemperatura(T) <= COSTANTI.sogliaRiferimento
    ? COSTANTI.idrMassimo
    : COSTANTI.idrMassimoCaldo;
}

/** Finestra di durata ammessa: dal riferimento di idratazione fino al 40 %. */
export function finestra(T: number): Finestra {
  const t = arrotondaTemperatura(T);
  return {
    min: oreDecimali(idratazioneRiferimento(t), t),
    max: oreDecimali(COSTANTI.idrMinimo, t),
  };
}

/** Le ore obiettivo che guidano la scelta dell'idratazione. */
export function tempoObiettivo(T: number): number {
  const t = arrotondaTemperatura(T);
  if (t <= 16) return 20;
  if (t <= 17) return 19;
  if (t < 19) return 18;
  return 16.5;
}

/**
 * Finestra del programma PRO: la finestra dell'idratazione incrociata con la
 * banda ±20 % attorno alle ore obiettivo. A 19 °C stringe a 13,20–19,80 h.
 */
export function finestraPro(T: number): Finestra {
  const t = arrotondaTemperatura(T);
  const base = finestra(t);
  const obiettivo = tempoObiettivo(t);
  return {
    min: Math.max(base.min, obiettivo * (1 - COSTANTI.tolleranzaPro)),
    max: Math.min(base.max, obiettivo * (1 + COSTANTI.tolleranzaPro)),
  };
}

/** Idratazione che produce la durata richiesta, con lo scarto minore. */
export function idrPerDurata(T: number, durata: number): number {
  const t = arrotondaTemperatura(T);
  const massimo = idratazioneRiferimento(t);
  let scelta = COSTANTI.idrMinimo;
  let scarto = Number.POSITIVE_INFINITY;

  for (let idr = COSTANTI.idrMinimo; idr <= massimo; idr += 1) {
    const differenza = Math.abs(oreDecimali(idr, t) - durata);
    if (differenza < scarto) {
      scarto = differenza;
      scelta = idr;
    }
  }

  return scelta;
}

/** Quanto vale un'ora di frigo rispetto a un'ora in ambiente. */
export function pesoFrigo(temperatura: number, temperaturaFrigo: number): number {
  return Math.pow(2, (arrotondaTemperatura(temperaturaFrigo) - temperatura) / 10);
}

export interface RichiestaPiano {
  /** Se non impostato, il motore sceglie in base alla finestra ambiente. */
  tuttaInFrigo?: boolean;
  /** Temperatura dell'ambiente, in °C. */
  temperatura: number;
  /** Temperatura del frigorifero, in °C. */
  temperaturaFrigo?: number;
  /** Tempo fra l'impasto e l'ora in cui la biga deve essere pronta. */
  oreTotali: number;
}

export type StatoPiano =
  | 'ok'
  | 'senza-tempo'
  | 'troppo-corto'
  | 'troppo-lungo'
  | 'oltre-modello';

export interface Piano {
  temperatura: number;
  temperaturaFrigo: number;
  oreTotali: number;
  /** Le ore in ambiente: zero quando l'attesa va tutta in frigorifero. */
  oreAmbiente: number;
  /** Le ore in frigorifero: zero quando l'attesa sta tutta nella finestra. */
  oreFrigo: number;
  /** Quanto vale un'ora di frigo in ore di ambiente. */
  peso: number;
  equivalenteFrigo: number;
  /** Ambiente + frigo convertito: la maturazione che la biga fa davvero. */
  equivalente: number;
  /** Idratazione per quella maturazione, o per l'estremo più vicino. */
  idratazione: number;
  finestra: Finestra;
  dentroFinestra: boolean;
  stato: StatoPiano;
  /** Consiglio quando il piano non regge: accorcia, abbassa la temperatura. */
  consiglio?: string;
  /** Avviso sempre visibile quando è entrato il frigo. */
  avviso?: string;
}

/** Numero con la virgola, senza zeri inutili in coda. */
function numero(valore: number, decimali = 1): string {
  return valore.toFixed(decimali).replace('.', ',');
}

/** Ore e minuti: «8 h 56 min», con i minuti omessi quando sono zero. */
export function oreMinuti(ore: number, minuti: number): string {
  return minuti === 0 ? `${ore} h` : `${ore} h ${minuti} min`;
}

/** Il primo consiglio, quello dell'app: l'attesa è più lunga della finestra. */
function accorcia(T: number, riquadro: Finestra, oreTotali: number): string {
  return (
    `A ${numero(T, 1)} °C ${numero(oreTotali, 1)} ore sono più della finestra ` +
    `(${numero(riquadro.min, 1)}–${numero(riquadro.max, 1)}): conviene accorciare l’attesa ` +
    'oppure abbassare la temperatura.'
  );
}

/** La frase dell'app di riferimento, con i numeri di questa temperatura. */
function riferimento(T: number, riquadro: Finestra, idratazione: number): string {
  const m = maturazione(T, idratazione);
  return (
    `A ${numero(T, 1)} °C si accettano da ${numero(riquadro.min, 1)} a ` +
    `${numero(riquadro.max, 1)} ore. Con il ${numero(idratazione, 0)} % la biga ` +
    `matura in ${oreMinuti(m.ore, m.minuti)}.`
  );
}

/**
 * Il piano a partire dall'attesa. Non lancia mai: quando il tempo non va bene
 * restituisce il piano più vicino e la frase con i numeri da cambiare.
 */
export function piano(richiesta: RichiestaPiano): Piano {
  const T = arrotondaTemperatura(richiesta.temperatura);
  const T_frigo = arrotondaTemperatura(richiesta.temperaturaFrigo ?? FRIGO.temperatura);
  const oreTotali = Math.max(0, richiesta.oreTotali);
  const riquadro = finestraPro(T);
  const peso = pesoFrigo(T, T_frigo);

  const troppoLungo = oreTotali > riquadro.max + MARGINE_ORE;

  // Oltre la finestra dell'ambiente la biga non si divide fra le due
  // temperature: va tutta in frigorifero, come la biga classica delle 24 ore a
  // 4 °C. Mettere in ambiente solo la parte che ci sta e il resto al freddo
  // darebbe due maturazioni in una, che non è la biga che si fa in casa.
  const inFrigo = richiesta.tuttaInFrigo ?? troppoLungo;
  const oreFrigo = inFrigo ? Math.min(oreTotali, FRIGO.massimoOre) : 0;
  const oreAmbiente = inFrigo ? 0 : oreTotali;
  const oltreTetto = inFrigo && oreTotali > FRIGO.massimoOre + MARGINE_ORE;
  const equivalenteFrigo = oreFrigo * peso;
  const equivalente = oreAmbiente + equivalenteFrigo;

  // Fuori finestra si prende l'estremo più vicino solo per poter dire con quale
  // idratazione la biga maturerebbe.
  const orePerIdratazione = Math.min(riquadro.max, Math.max(riquadro.min, equivalente));

  // Il rallentamento lo fa già il frigo: quando il piano entra in frigo
  // l'idratazione resta quella della biga in frigo (55 %), non quella che
  // servirebbe per un'attesa tutta in ambiente. Prima si ricavava dalle ore
  // equivalenti, e il frigo le porta sull'estremo alto della finestra, che è
  // il 40 %: 24 ore a 21 °C uscivano al 40 %, cioè la biga più asciutta
  // possibile, contro la regola delle 24 ore in frigo al 55 %.
  const idratazione =
    oreFrigo > 0 ? COSTANTI.idrConFrigo : idrPerDurata(T, orePerIdratazione);
  const dentroFinestra =
    oreTotali >= riquadro.min - MARGINE_ORE && oreTotali <= riquadro.max + MARGINE_ORE;

  const base = {
    temperatura: T,
    temperaturaFrigo: T_frigo,
    oreTotali,
    oreAmbiente: Math.max(0, oreAmbiente),
    oreFrigo: Math.max(0, oreFrigo),
    peso,
    equivalenteFrigo: Math.max(0, equivalenteFrigo),
    equivalente: Math.max(0, equivalente),
    idratazione,
    finestra: riquadro,
    dentroFinestra,
  };

  if (richiesta.tuttaInFrigo !== true && oltreModello(T)) {
    return {
      ...base,
      stato: 'oltre-modello',
      consiglio: `Sopra i ${OLTRE_MODELLO} °C scegli «24 ore in frigo» oppure abbassa la temperatura ambiente.`,
    };
  }

  if (oreTotali < MARGINE_ORE) {
    return {
      ...base,
      stato: 'senza-tempo',
      consiglio:
        'La biga non può essere pronta prima di essere impastata: sposta avanti l’orario di fine.',
    };
  }

  if (richiesta.tuttaInFrigo === true && oreTotali < FRIGO.massimoOre - MARGINE_ORE) {
    return {
      ...base,
      stato: 'troppo-corto',
      consiglio: `Per il programma tutto in frigo imposta ${FRIGO.massimoOre} ore oppure disattiva questa scelta.`,
    };
  }

  if (richiesta.tuttaInFrigo !== true && oreTotali < riquadro.min - MARGINE_ORE) {
    return {
      ...base,
      stato: 'troppo-corto',
      consiglio:
        'Intervallo di tempo troppo breve: anticipa l’impasto oppure ritarda la ' +
        `fine della maturazione. ${riferimento(T, riquadro, idratazione)}`,
    };
  }

  if (troppoLungo && !inFrigo) {
    return { ...base, stato: 'troppo-lungo', consiglio: accorcia(T, riquadro, oreTotali) };
  }

  if (oltreTetto) {
    return {
      ...base,
      stato: 'troppo-lungo',
      consiglio:
        `${accorcia(T, riquadro, oreTotali)} Nemmeno il frigo basta: la biga può ` +
        `stare al massimo ${FRIGO.massimoOre} h a ${numero(T_frigo, 1)} °C, non ` +
        `${numero(oreTotali, 1)}.`,
    };
  }

  // Oltre la finestra dell'ambiente la biga va tutta in frigo: la riga sopra
  // dice già «24 h a 4 °C» e l'idratazione, quindi non serve aggiungere la
  // finestra dell'ambiente, che a quel punto confonde soltanto.
  return { ...base, stato: 'ok' };
}

/** Stima per ambiente seguito da frigo, con il peso termico già usato dal motore. */
export function stimaBigaMista(temperatura: number, frigo: number, oreAmbiente: number, oreFrigo: number) {
  const ambiente = arrotondaTemperatura(temperatura);
  const freddo = arrotondaTemperatura(frigo);
  const formato = (ore: number) => numero(ore, 1);
  if (ambiente < 8 || oltreModello(ambiente) || freddo < 0 || freddo > 12 || freddo >= ambiente) {
    return { errore: 'Per il programma misto usa da 8 a 27 °C in ambiente e da 0 a 12 °C in frigo, con il frigo più freddo dell’ambiente.' } as const;
  }
  if (oreAmbiente < 1 / 60 || oreFrigo < 1 / 60 || oreFrigo > FRIGO.massimoOre) {
    return { errore: `Imposta almeno un minuto per ciascuna fase e al massimo ${FRIGO.massimoOre} ore in frigo.` } as const;
  }

  const intervallo = finestraPro(ambiente);
  if (oreAmbiente > intervallo.max) {
    return { errore: `A ${formato(ambiente)} °C la fase in ambiente supera il limite del modello di ${formato(intervallo.max)} ore. Metti prima la biga in frigorifero.` } as const;
  }

  const equivalenti = oreAmbiente + oreFrigo * pesoFrigo(ambiente, freddo);
  if (equivalenti < intervallo.min || equivalenti > intervallo.max) {
    const modifica = equivalenti > intervallo.max ? 'Riduci le ore in ambiente.' : 'Aumenta le ore in ambiente o sposta più avanti la fine.';
    return { errore: `Il programma vale ${formato(equivalenti)} ore equivalenti. A ${formato(ambiente)} °C la finestra è ${formato(intervallo.min)}–${formato(intervallo.max)} ore. ${modifica}` } as const;
  }
  const idratazione = idrPerDurata(ambiente, equivalenti);
  const piano: Piano = {
    temperatura: ambiente, temperaturaFrigo: freddo, oreTotali: oreAmbiente + oreFrigo,
    oreAmbiente, oreFrigo, peso: pesoFrigo(ambiente, freddo),
    equivalenteFrigo: equivalenti - oreAmbiente, equivalente: equivalenti,
    idratazione, finestra: intervallo, dentroFinestra: true, stato: 'ok',
  };
  return { idratazione, piano } as const;
}

/** Centro delle durate in ambiente compatibili con il piano misto. */
export function oreAmbienteSuggerite(temperatura: number, frigo: number, oreTotali: number): number | null {
  const ambiente = arrotondaTemperatura(temperatura);
  const peso = pesoFrigo(ambiente, frigo);
  if (!Number.isFinite(oreTotali) || peso >= 1) return null;

  const intervallo = finestraPro(ambiente);
  const minimo = Math.max(1 / 60, oreTotali - FRIGO.massimoOre,
    (intervallo.min - oreTotali * peso) / (1 - peso));
  const massimo = Math.min(oreTotali - 1 / 60, intervallo.max,
    (intervallo.max - oreTotali * peso) / (1 - peso));
  const inizio = Math.ceil(minimo * 100);
  const fine = Math.floor(massimo * 100);
  if (fine < inizio) return null;

  const centro = Math.round((inizio + fine) / 2) / 100;
  return stimaBigaMista(temperatura, frigo, centro, oreTotali - centro).piano ? centro : null;
}

/** Legge le ore del campo misto e applica la stessa verifica in anteprima e nel calcolo. */
export function stimaBigaMistaDaCampo(temperatura: number, frigo: number, totale: number, testo: string) {
  const valore = testo.trim().replace(',', '.');
  const ore = /^\d+(?:\.\d+)?$/.test(valore) ? Number(valore) : 0;
  return stimaBigaMista(temperatura, frigo, ore, totale - ore);
}
