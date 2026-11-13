import type { Ramo } from '../types';

/*
 * MODELLO A 12 MINI-RICETTE (3 ricette master × 4 fasce)
 * -----------------------------------------------------
 * Porting del modello validato in `artifacts/modello-12-mini-ricette/`
 * (`simula.mjs` e i tre CSV). Non sostituisce il motore esistente: lo affianca,
 * e i suoi numeri sono quelli dei CSV, non una seconda stima.
 *
 * DUE INDICI, entrambi in «ore equivalenti a 20 °C»:
 *
 *   θ_amb(T)  = 2^((T − 20) / 10)
 *   θ_fr(Tc)  = 2,5^((Tc − 4) / 10)
 *   eq_amb    = Σ fasi ∫ θ_amb(T(t)) dt        con T(t) = Ta + (T0 − Ta)·e^(−t/τ)
 *   τ         = 1,8 · (massa / 660)^(2/3)
 *
 *   I_ferm = eq_amb + 0,23 · h_fr · θ_fr        il frigo pesa poco sul lievito
 *   I_mat  = eq_amb + 0,70 · h_fr · θ_fr        il frigo pesa molto sul W
 *
 * Stesse soglie per entrambi: 8 / 16 / 24 / 48 ore equivalenti. Da qui nasce
 * il caso di riferimento: 2+18+4 in cella a 4 °C sta a 8,88 ore fermentative
 * (fascia media del lievito) e a 17,34 ore di maturazione (fascia lunga del W).
 * Non è un compromesso: sono due orologi diversi e la mini-ricetta lo mostra.
 *
 * IL W è una curva lineare a tratti per fascia (ancore per ricetta), mediata sui
 * bordi con pesi lineari su una finestra di 3 ore equivalenti, poi affinata con
 * idratazione, massa, sale, olio e formato. La dose di lievito è una legge
 * unica per ricetta, con un esponente proprio, valutata sul tempo fermentativo.
 *
 * PERCHÉ LE DOSI NON SONO PIÙ LE MEDIANE DELLE FONT I. La prima versione dava a
 * ogni fascia una dose di centro presa dalle fonti e la scalava con un esponente
 * fisso (−0,55). Le quattro dosi di una ricetta però non stavano su una curva
 * sola: fra breve e media gli esponenti impliciti andavano da 0,32 a 1,12. Così
 * al bordo la dose della breve restava alta e la fusione la mescolava alla
 * media, gonfiando il numero: una contemporanea con 18 h di frigo leggeva 4,15
 * g/kg invece dei ~2 che il programma chiede. Ora le dosi di centro stanno
 * tutte sulla stessa legge (esponente per ricetta, ~1,2 come la legge misurata
 * del progetto), quindi ai bordi le fasce valgono lo stesso numero e la fusione
 * non può più inventare un valore intermedio sbagliato. L'intervallo stampato
 * accanto alla dose è quello della fascia (dose agli estremi della banda), non
 * un ±40% del centro: il numero del caso ci cade dentro per costruzione.
 *
 * Fuori dominio il modello non tace: gli avvisi sono parte del risultato.
 */

/** Le quattro fasce, nell'ordine delle soglie. */
export type Fascia = 'breve' | 'media' | 'lunga' | 'molto';

/** Formati con un fattore proprio sull'affinamento. */
export type Formato12 = 'teglia' | 'tonda' | 'pala' | 'focaccia';

/** Soglie in ore equivalenti: 4 · 8 · 16 · 24 · 48. */
export const SOGLIE = [4, 8, 16, 24, 48] as const;

export const FASCE: readonly Fascia[] = ['breve', 'media', 'lunga', 'molto'];

export const NOMI_FASCE: Record<Fascia, string> = {
  breve: 'breve (4–8 h)',
  media: 'media (8–16 h)',
  lunga: 'lunga (18–24 h)',
  molto: 'molto lunga (36–48 h)',
};

/** Nomi corti, per le etichette dell'interfaccia. */
export const NOMI_FASCE_BREVI: Record<Fascia, string> = {
  breve: 'breve',
  media: 'media',
  lunga: 'lunga',
  molto: 'molto lunga',
};

/** Ampiezza della finestra di fusione, in ore equivalenti (±1,5). */
export const DELTA_FUSIONE = 3;

/** Peso di un'ora di cella sull'indice fermentativo (lievito). */
export const PESO_FRIGO_FERM = 0.23;
/** Peso di un'ora di cella sull'indice di maturazione (W). */
export const PESO_FRIGO_W = 0.7;

export interface RicettaMaster12 {
  nome: string;
  /** Idratazione di riferimento, in punti percentuali. */
  idroRif: number;
  /** Sale e olio di riferimento della ricetta. */
  sale: number;
  olio: number;
  malto: number;
  formato: Formato12;
  /** Massa di riferimento, in grammi. */
  massa: number;
  /** Cinque ancore del W, agli estremi delle quattro fasce. */
  ancoraW: readonly [number, number, number, number, number];
  /** Quattro dosi di centro, una per fascia, in g/kg di farina. */
  ancoraD: readonly [number, number, number, number];
  /**
   * Esponente della dose sul tempo fermentativo: d = D_b · (x / centro_b)^−e.
   *
   * È lo stesso per tutte le fasce della ricetta, ed è quello che rende la
   * curva una curva sola: con lo stesso esponente le quattro dosi di centro
   * cadono sulla stessa legge, quindi ai bordi le due fasce valgono lo stesso
   * numero e la fusione non inventa più il valore alto della breve.
   */
  esponenteDose: number;
  /** Coefficiente dell'idratazione sul W, per fascia. */
  betaIdro: readonly [number, number, number, number];
  /** Fascia dichiarata della mini-ricetta: [min, max]. */
  rangeW: readonly (readonly [number, number])[];
}

/**
 * Le tre ricette master con le ancore del W. Le dosi di centro stanno sulla
 * legge della ricetta (esponente 1,36 teglia, 1,20 verace, 1,22 contemporanea),
 * ancorata ai casi pratici: teglia 30×40 2+18+4 a 4,64 g/kg, verace 2+7,5+3,8
 * a ~2,97 g/kg (2,7 g su 912 g di farina), contemporanea 2+18+4 a ~2,17 g/kg
 * (2,05 g su 946 g). L'ancora delle 24 h è stata allineata alla fascia
 * dichiarata (teglia 325→320, contemporanea 317→312, con la 16 h a 296/288 per
 * tenere il caso obbligatorio a W 300): così il W non esce più dalla fascia che
 * la scheda stampa quando l'affinamento del caso è positivo.
 */
export const RICETTE_12: Record<Ramo, RicettaMaster12> = {
  teglia: {
    nome: 'Pizza in teglia',
    idroRif: 75,
    sale: 2.5,
    olio: 2,
    malto: 1,
    formato: 'teglia',
    massa: 660,
    ancoraW: [268, 285, 296, 320, 348],
    ancoraD: [9.43, 3.67, 1.74, 0.82],
    esponenteDose: 1.36,
    betaIdro: [1.5, 1.9, 2.3, 2.7],
    rangeW: [
      [250, 295],
      [275, 315],
      [280, 320],
      [320, 350],
    ],
  },
  verace: {
    nome: 'Tonda verace',
    idroRif: 62,
    sale: 2.6,
    olio: 0,
    malto: 0,
    formato: 'tonda',
    massa: 250,
    ancoraW: [205, 248, 270, 296, 320],
    ancoraD: [3.11, 1.35, 0.7, 0.36],
    esponenteDose: 1.2,
    betaIdro: [1.2, 1.5, 1.8, 2.1],
    rangeW: [
      [195, 250],
      [240, 275],
      [265, 300],
      [295, 330],
    ],
  },
  contemporanea: {
    nome: 'Tonda contemporanea',
    idroRif: 75,
    sale: 2.4,
    olio: 1,
    malto: 0,
    formato: 'tonda',
    massa: 280,
    ancoraW: [249, 267, 288, 312, 340],
    ancoraD: [3.51, 1.51, 0.77, 0.39],
    esponenteDose: 1.22,
    betaIdro: [1.4, 1.7, 2.0, 2.3],
    rangeW: [
      [242, 277],
      [262, 292],
      [272, 312],
      [312, 342],
    ],
  },
};

/** Effetto del formato sul W, in gradi. La ricetta di riferimento vale 0 se è il suo. */
const K_FMT_W: Record<Formato12, number> = {
  teglia: 0,
  tonda: -8,
  pala: 8,
  focaccia: 16,
};

/** Effetto del formato sulla dose. */
const K_FMT_D: Record<Formato12, number> = {
  teglia: 1.0,
  tonda: 0.95,
  pala: 1.0,
  focaccia: 1.1,
};

/** Fattore di temperatura dell'ambiente: raddoppio ogni 10 °C. */
export function fattoreAmbiente(temperatura: number): number {
  return Math.pow(2, (temperatura - 20) / 10);
}

/** Fattore di temperatura della cella: Q10 = 2,5, normalizzato a 4 °C. */
export function fattoreCella(temperaturaCella: number): number {
  return Math.pow(2.5, (temperaturaCella - 4) / 10);
}

/**
 * Ore equivalenti maturate a temperatura ambiente, con l'inerzia termica del
 * pezzo: l'impasto insegue la temperatura dell'ambiente con costante τ invece
 * di saltarci sopra. Le fasi sono {ore, tIniziale} e la seconda parte, quando
 * c'è stato il frigo, dalla temperatura della cella.
 */
export function oreAmbiente(
  fasi: readonly { ore: number; tIniziale: number }[],
  ta: number,
  tau: number,
  passo = 0.02,
): number {
  let eq = 0;
  for (const fase of fasi) {
    for (let t = 0; t < fase.ore; t += passo) {
      const temperatura = ta + (fase.tIniziale - ta) * Math.exp(-t / tau);
      eq += fattoreAmbiente(temperatura) * Math.min(passo, fase.ore - t);
    }
  }
  return eq;
}

/** Costante di tempo dell'inerzia termica, in ore. */
export function costanteTempo(massaG: number): number {
  return 1.8 * Math.pow(massaG / 660, 2 / 3);
}

/**
 * Pesi della fusione morbida: lineari sulla finestra ±1,5 ore equivalenti,
 * normalizzati a somma 1. Fuori dalla finestra il peso è zero, quindi al
 * massimo due fasce concorrono.
 */
export function pesiFusione(x: number): number[] {
  // Fuori dalla prima e dall'ultima soglia una sola fascia resta accesa.
  // Prima qui tutti i pesi andavano a zero: la dose diventava 0 e finiva sul
  // pavimento di 0,1 g/kg, cioe' meno lievito a chi ha meno tempo. La legge
  // della fascia breve vale anche sotto le 4 ore equivalenti, e la curva
  // resta monotona.
  if (x <= SOGLIE[0]) return FASCE.map((_, b) => (b === 0 ? 1 : 0));
  if (x >= SOGLIE[SOGLIE.length - 1]) {
    const ultima = FASCE.length - 1;
    return FASCE.map((_, b) => (b === ultima ? 1 : 0));
  }

  const pesi = FASCE.map((_, b) => {
    const lo = SOGLIE[b];
    const hi = SOGLIE[b + 1];
    return Math.max(
      0,
      Math.min((x - lo) / DELTA_FUSIONE + 0.5, (hi - x) / DELTA_FUSIONE + 0.5, 1),
    );
  });
  const somma = pesi.reduce((totale, peso) => totale + peso, 0) || 1;
  return pesi.map((peso) => peso / somma);
}

/** Curva lineare a tratti della fascia b, valutata in x. */
function curvaBanda(valori: readonly number[], b: number, x: number): number {
  const lo = SOGLIE[b];
  const hi = SOGLIE[b + 1];
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return valori[b] + (valori[b + 1] - valori[b]) * t;
}

/** Centro geometrico della fascia b: la dose si scala su questo tempo. */
function centroBanda(b: number): number {
  return Math.sqrt(SOGLIE[b] * SOGLIE[b + 1]);
}

/**
 * Dose della fascia b al tempo x, con la legge della ricetta.
 *
 * Con lo stesso esponente per tutte le fasce, le quattro dosi di centro
 * stanno sulla stessa curva: ai bordi le due fasce adiacenti valgono lo stesso
 * numero e la fusione non può gonfiare il risultato.
 */
function doseBanda(ric: RicettaMaster12, b: number, x: number): number {
  return ric.ancoraD[b] * Math.pow(x / centroBanda(b), -ric.esponenteDose);
}

/**
 * Intervallo di dose di una fascia: la dose agli estremi della banda, non un
 * ±40% del centro. È quello che la scheda stampa accanto al numero, e il
 * numero del caso ci cade dentro per costruzione (la banda è quella
 * dominante, quindi x sta fra i suoi due estremi).
 */
export function intervalloDose(ricetta: Ramo, b: number, fattore = 1): readonly [number, number] {
  const ric = RICETTE_12[ricetta];
  // Arrotondamento verso l'esterno: così qualunque dose della banda cade
  // dentro l'intervallo stampato, senza code di 0,05 fuori. Il fattore è la
  // correzione del caso (idratazione, sale, olio, formato): senza di lui un
  // caso al 10% sotto il riferimento usciva dall'intervallo pur essendo giusto.
  const sotto = Math.floor(doseBanda(ric, b, SOGLIE[b + 1]) * fattore * 10) / 10;
  const sopra = Math.ceil(doseBanda(ric, b, SOGLIE[b]) * fattore * 10) / 10;
  return [sotto, sopra] as const;
}

/** Fascia con il peso maggiore. */
export function fasciaDominante(pesi: readonly number[]): Fascia {
  let migliore = 0;
  pesi.forEach((peso, indice) => {
    if (peso > pesi[migliore]) migliore = indice;
  });
  return FASCE[migliore];
}

export interface DettaglioAffinamento {
  idratazione: number;
  massa: number;
  sale: number;
  olio: number;
  formato: number;
}

export interface InputMiniRicetta {
  ricetta: Ramo;
  /** Ore a temperatura ambiente prima del frigo. */
  hPrima: number;
  /** Ore in cella. */
  hFrigo: number;
  /** Ore a temperatura ambiente dopo il frigo (appretto). */
  hDopo: number;
  /** Temperatura ambiente, in °C. */
  ta: number;
  /** Temperatura della cella, in °C. */
  tc: number;
  /** Temperatura dell'impasto a fine lavorazione, in °C. */
  t0: number;
  /** Idratazione in punti percentuali. */
  idro: number;
  /** Sale in percentuale sulla farina. */
  sale: number;
  /** Olio in percentuale sulla farina. */
  olio: number;
  /** Peso dell'impasto, in grammi. */
  massa: number;
  /** Farina in grammi: se manca si ricava dall'impasto. */
  farina?: number;
  /** Formato, se diverso da quello della ricetta. */
  formato?: Formato12;
}

export interface RisultatoMiniRicetta {
  ricetta: Ramo;
  nomeRicetta: string;
  /** Indice fermentativo, in ore equivalenti: decide il lievito. */
  iFerm: number;
  /** Indice di maturazione, in ore equivalenti: decide il W. */
  iMat: number;
  pesiW: number[];
  pesiLievito: number[];
  /** Mini-ricetta letta dall'indice di maturazione (quella del W). */
  fasciaW: Fascia;
  /** Mini-ricetta letta dall'indice fermentativo (quella del lievito). */
  fasciaLievito: Fascia;
  /** W della banda, prima dell'affinamento. */
  wBanda: number;
  affinamento: number;
  dettaglio: DettaglioAffinamento;
  /** W consigliato, arrotondato e dentro il dominio 150–380. */
  w: number;
  /** Fascia dichiarata dalla mini-ricetta, come nei range del CSV. */
  fasciaDichiarata: readonly [number, number];
  /** Fascia mostrata: la dichiarata traslata dall'affinamento del caso. */
  fasciaEffettiva: readonly [number, number];
  /** Dose di lievito fresco, in g per kg di farina. */
  doseGkg: number;
  /** Dose pesata, in grammi di lievito fresco. */
  lievitoG: number;
  farinaG: number;
  /** Percentuale di lievito sulla farina. */
  percentuale: number;
  /**
   * Correzione della dose per questo caso (idratazione, sale, olio, formato).
   * Serve a stampare l'intervallo della fascia con lo stesso metro del numero:
   * senza, un caso al 10% sotto il riferimento usciva dall'intervallo.
   */
  fattoreDose: number;
  avvisi: string[];
  /** Vero se almeno un input è fuori dal dominio dichiarato. */
  fuoriDominio: boolean;
}

/**
 * Il calcolo completo. Non lancia mai: un input fuori dominio produce numeri
 * con avviso, perché il pannello deve poter dire *perché* la stima non vale.
 */
export function calcolaMiniRicetta(input: InputMiniRicetta): RisultatoMiniRicetta {
  const ricetta = RICETTE_12[input.ricetta];
  const formato = input.formato ?? ricetta.formato;

  const massa = Math.max(1, input.massa);
  const idro = input.idro;
  const sale = input.sale;
  const olio = input.olio;
  const hPrima = Math.max(0, input.hPrima);
  const hFrigo = Math.max(0, input.hFrigo);
  const hDopo = Math.max(0, input.hDopo);

  const tau = costanteTempo(massa);
  const fasi = [
    { ore: hPrima, tIniziale: input.t0 },
    { ore: hDopo, tIniziale: hFrigo > 0 ? input.tc : input.ta },
  ];
  const eqAmb = oreAmbiente(fasi, input.ta, tau);
  const freddo = hFrigo * fattoreCella(input.tc);
  const iFerm = eqAmb + PESO_FRIGO_FERM * freddo;
  const iMat = eqAmb + PESO_FRIGO_W * freddo;

  const pesiW = pesiFusione(iMat);
  const pesiLievito = pesiFusione(iFerm);

  // --- W: banda, affinamento, clamp ---
  let wBanda = 0;
  let beta = 0;
  FASCE.forEach((_, b) => {
    wBanda += pesiW[b] * curvaBanda(ricetta.ancoraW, b, iMat);
    beta += pesiW[b] * ricetta.betaIdro[b];
  });

  const dettaglio: DettaglioAffinamento = {
    idratazione: beta * (idro - ricetta.idroRif),
    massa: -4 * Math.log2(massa / 660),
    sale: 2.0 * (sale - 2.5),
    olio: 1.0 * (olio - 2),
    formato: K_FMT_W[formato] - K_FMT_W[ricetta.formato],
  };
  const affinamento =
    dettaglio.idratazione +
    dettaglio.massa +
    dettaglio.sale +
    dettaglio.olio +
    dettaglio.formato;

  const wGrezzo = wBanda + affinamento;
  const w = Math.min(380, Math.max(150, Math.round(wGrezzo)));

  // --- lievito ---
  let doseBase = 0;
  FASCE.forEach((_, b) => {
    doseBase += pesiLievito[b] * doseBanda(ricetta, b, iFerm);
  });
  const kIdro = Math.pow(idro / ricetta.idroRif, -1.2);
  const kSale = (1.172 - 0.0655 * sale) / (1.172 - 0.0655 * 2.5);
  const kOlio = 1 / (1 + 0.05 * olio);
  const kFormato = K_FMT_D[formato] / K_FMT_D[ricetta.formato];

  const fattoreDose = kIdro * kSale * kOlio * kFormato;
  const doseGrezza = doseBase * fattoreDose;
  const doseGkg = Math.min(30, Math.max(0.1, doseGrezza));

  const farinaG =
    input.farina ??
    massa /
      (1 + idro / 100 + (sale + ricetta.malto + olio) / 100);

  const lievitoG = (farinaG * doseGkg) / 1000;

  // --- fasce ---
  const fasciaW = fasciaDominante(pesiW);
  const fasciaLievito = fasciaDominante(pesiLievito);
  const indiceW = FASCE.indexOf(fasciaW);
  const fasciaDichiarata = ricetta.rangeW[indiceW];
  const fasciaEffettiva = [
    Math.round(fasciaDichiarata[0] + affinamento),
    Math.round(fasciaDichiarata[1] + affinamento),
  ] as const;

  // --- avvisi di dominio ---
  const avvisi: string[] = [];
  if (!Number.isFinite(wGrezzo)) {
    avvisi.push('Input non numerico: la stima non è disponibile.');
  }
  if (iMat < 3) {
    avvisi.push(
      'Maturazione sotto le 3 ore equivalenti: è un programma troppo corto perché il modello lo legga.',
    );
  } else if (iMat > 48) {
    avvisi.push(
      'Maturazione oltre le 48 ore equivalenti: la mini-ricetta è al tetto del dominio, la stima è meno affidabile.',
    );
  }
  if (idro < 55 || idro > 90) {
    avvisi.push(`Idratazione ${idro}% fuori dall'intervallo 55–90% del modello.`);
  }
  if (input.tc > 8) {
    avvisi.push(`Cella a ${input.tc} °C: non è conservazione al freddo, il modello conta le ore come ambiente.`);
  }
  if (input.tc < 0) {
    avvisi.push('Cella sotto 0 °C: il lievito non lavora, la stima non è valida.');
  }
  if (input.ta < 15 || input.ta > 30) {
    avvisi.push(`Ambiente a ${input.ta} °C fuori dall'intervallo 15–30 °C del modello.`);
  }
  if (doseGrezza > 30) {
    avvisi.push('Dose oltre il 3% di farina: caso fuori dal modello, il numero mostrato è un limite.');
  }
  if (doseGrezza < 0.1) {
    avvisi.push('Dose sotto 0,1 g/kg: caso fuori dal modello, il numero mostrato è un limite.');
  }
  if (hFrigo > 0 && hDopo < 0.5) {
    avvisi.push('Nessuna risalita dopo il frigo: l’appretto non è previsto dal programma.');
  }
  if (wGrezzo > 380 || wGrezzo < 150) {
    avvisi.push(`W fuori dal dominio 150–380: mostrato il limite.`);
  }

  return {
    ricetta: input.ricetta,
    nomeRicetta: ricetta.nome,
    iFerm,
    iMat,
    pesiW,
    pesiLievito,
    fasciaW,
    fasciaLievito,
    wBanda,
    affinamento,
    dettaglio,
    w,
    fasciaDichiarata,
    fasciaEffettiva,
    doseGkg,
    lievitoG,
    farinaG,
    percentuale: doseGkg / 10,
    fattoreDose,
    avvisi,
    fuoriDominio: avvisi.length > 0,
  };
}

/**
 * Testo dei pesi, per l'interfaccia: «media 5% / lunga 95%».
 * Le fasce sotto l'1% si omettono: non cambiano il numero mostrato.
 */
export function pesiInParole(pesi: readonly number[]): string {
  return FASCE.map((fascia, indice) =>
    pesi[indice] >= 0.01 ? `${NOMI_FASCE_BREVI[fascia]} ${Math.round(pesi[indice] * 100)}%` : null,
  )
    .filter((voce): voce is string => voce !== null)
    .join(' / ');
}
