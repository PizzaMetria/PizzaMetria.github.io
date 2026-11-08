import {
  FATTORI_LIEVITO,
  LIMITI_LIEVITO,
  fattoreTemperatura,
  forzaImpasto,
  limiteDose,
  oreMassimePerForza,
  percentualeLievitoFresco,
} from './fermentazione';
import { profiloTermico } from './inerzia';
import { calcolaMiniRicetta } from './miniricette';
import { LIMITI_LIEVITO_VECCHIO, percentualeLievitoVecchio, profiloVecchio } from './vecchio';
import type { FormaMassa } from './inerzia';
import type {
  Farina,
  GiudizioForza,
  InputCalcolo,
  ParametriTempo,
  PassoTempo,
  RisultatoCalcolo,
} from '../types';

/*
 * CALCOLO COMPLETO
 * ----------------
 * Le dosi restano quelle classiche: farina, acqua, sale, olio, malto e lievito
 * si ricavano dal peso dell'impasto e dalle percentuali sulla farina.
 *
 * Dove interviene il modello di fermentazione:
 * - le ore reali diventano ore equivalenti a 20 °C, fase per fase;
 * - dalle ore equivalenti escono la percentuale di lievito e il W consigliato;
 * - il mix di farine fornisce il W effettivo, che viene confrontato con quello
 *   consigliato.
 */

/**
 * Ore equivalenti a 20 °C. Ogni fase si moltiplica per il fattore di
 * temperatura del proprio ambiente, senza inerzia termica: così un'ora in
 * frigo e un'ora sul tavolo si sommano sullo stesso asse.
 */
export function oreEquivalenti(tempi: ParametriTempo): number {
  const ambiente = fattoreTemperatura(tempi.ta);
  const frigo = fattoreTemperatura(tempi.tc);

  return (
    Math.max(0, tempi.oreTaPrima) * ambiente +
    Math.max(0, tempi.oreFrigo) * frigo +
    Math.max(0, tempi.oreTaDopo) * ambiente
  );
}

/**
 * W del mix: media pesata sulle quote delle farine che hanno il W dichiarato.
 * Le farine senza W non entrano nella media, altrimenti servirebbe inventarlo.
 */
export function wEquivalente(farine: readonly Farina[]): number | null {
  const note = farine.filter((farina) => farina.w !== null && farina.quota > 0);
  const quota = note.reduce((somma, farina) => somma + farina.quota, 0);
  if (quota <= 0) return null;

  const pesata = note.reduce((somma, farina) => somma + (farina.w ?? 0) * farina.quota, 0);
  return pesata / quota;
}

/**
 * W efficace del mix: media pesata meno mezzo scarto quadratico.
 *
 * Perché non basta la media. Un mix 50/50 di W 250 e W 150 ha media 200, ma non
 * si comporta come una farina da 200: la maglia glutinica si rompe dove il
 * glutine è più corto, non «in media», quindi la parte debole cede prima di
 * quanto dica la sua quota. La penalità è mezzo scarto quadratico pesato: vale
 * zero con una farina sola, cresce con l'eterogeneità del mix e non tocca mai
 * il caso pulito.
 */
export function forzaEfficace(farine: readonly Farina[]): number | null {
  const note = farine.filter((farina) => farina.w !== null && farina.quota > 0);
  const quota = note.reduce((somma, farina) => somma + farina.quota, 0);
  if (quota <= 0) return null;

  const media = note.reduce((somma, f) => somma + (f.w ?? 0) * f.quota, 0) / quota;
  const varianza =
    note.reduce((somma, f) => somma + f.quota * ((f.w ?? 0) - media) ** 2, 0) / quota;

  return media - 0.5 * Math.sqrt(varianza);
}

/*
 * IL W CONSIGLIATO NON GUARDA GLI INGREDIENTI
 * -------------------------------------------
 * La retta della forza vale per l'impasto di riferimento e basta. Misurato su
 * riferimento, il W non si muove né con l'acqua né con il sale né con l'olio:
 * a parità di orari dà 258 al 62% come al 75%, 258 con olio a 0, 2 e 4%, e
 * 258 con 20, 40 o 60 g/l di sale.
 *
 * Qui prima c'era una correzione (idratazione^0,6, olio +3% per punto, malto
 * +5%, sale −4%): era una scelta di modellazione, non una misura, e teneva il
 * W del 12% più alto sulla contemporanea e del 21% sulla teglia. Tolta.
 */

/**
 * Fascia tollerata: i bordi entro cui il modello considera il mix ancora
 * utilizzabile, sopra o sotto la zona consigliata. Non è una garanzia fisica di
 * tenuta, è la tolleranza dichiarata dal modello.
 *
 * Una sola definizione: la finestra *è* la fascia tollerata 0,85–1,25. Prima
 * era 0,90–1,25 e non coincideva con il giudizio, che ammetteva l'85–90% pur
 * dicendolo fuori finestra. I bordi sono interi perché tutto ciò che
 * l'interfaccia mostra — W efficace, minima, massima — è arrotondato allo
 * stesso modo, e il confronto avviene sui valori arrotondati: così non si dà il
 * caso di un mix «accettabile» stampato fuori dalla fascia stampata.
 */
export function finestraForza(wConsigliato: number): { minima: number; massima: number } {
  const { tollerata } = fasceForza(wConsigliato);
  return { minima: tollerata[0], massima: tollerata[1] };
}

/**
 * Le due fasce del confronto con il W consigliato, in gradi interi:
 *
 * - **consigliata** (0,90–1,15): il modello la considera adatta a tutta la
 *   maturazione (giudizio «ottima»);
 * - **tollerata** (0,85–1,25): il modello la considera ancora utilizzabile
 *   (giudizio «accettabile»); fuori si parla di fascia «distante».
 *
 * Sono soglie empiriche del modello, non misure di resistenza: dicono quanto ci
 * si può scostare dal W richiesto prima che il consiglio cambi, non
 * garantiscono che l'impasto tenga. Sono le stesse soglie di giudizio, grafico
 * e avvisi, e i bordi sono arrotondati una volta sola qui.
 */
export interface FasceW {
  sicura: readonly [number, number];
  tollerata: readonly [number, number];
}

export function fasceForza(wConsigliato: number): FasceW {
  return {
    sicura: [Math.round(wConsigliato * 0.9), Math.round(wConsigliato * 1.15)] as const,
    tollerata: [Math.round(wConsigliato * 0.85), Math.round(wConsigliato * 1.25)] as const,
  };
}

/**
 * Margine della fascia tollerata quando a leggere l'impasto è il modello a 12
 * mini-ricette, in punti di W.
 *
 * La zona consigliata è la fascia della mini-ricetta del caso, non un ±15%
 * attorno al punto: la fascia è già quella dichiarata e traslata
 * dall'affinamento. La tolleranza non può essere un'altra percentuale, o si
 * ricade nel problema che la finestra stampata non coincide con quella della
 * scheda: 10 W sono circa il tratto che la fusione morbida percorre in mezza
 * finestra (±1,5 ore equivalenti, ~4 W per ora equivalente sulla teglia).
 */
export const MARGINE_FASCE_MINI = 10;

/** Le fasce del modello a 12 mini-ricette: la sua fascia, più il margine. */
export function fasceMini(fascia: readonly [number, number]): FasceW {
  return {
    sicura: fascia,
    tollerata: [fascia[0] - MARGINE_FASCE_MINI, fascia[1] + MARGINE_FASCE_MINI] as const,
  };
}

/**
 * Confronto con il W consigliato sulle due fasce, in gradi interi come
 * l'interfaccia: dentro la consigliata è «ottima», dentro la tollerata è
 * «accettabile», fuori è «distante». Il confronto usa lo stesso arrotondamento
 * dei bordi stampati, così badge e numeri non si contraddicono.
 */
export function giudizioForza(
  wEfficaceValore: number,
  wConsigliato: number,
  fasce: FasceW = fasceForza(wConsigliato),
): GiudizioForza {
  if (wConsigliato <= 0) return 'ottima';

  const { sicura, tollerata } = fasce;
  const w = Math.round(wEfficaceValore);
  if (w >= sicura[0] && w <= sicura[1]) return 'ottima';
  if (w >= tollerata[0] && w <= tollerata[1]) return 'accettabile';
  return 'distante';
}

/* Smoothstep: 0 in `da`, 1 in `a`, con le derivate nulle ai due estremi. */
function transizione(w: number, da: number, a: number): number {
  const t = Math.min(1, Math.max(0, (w - da) / (a - da)));
  return t * t * (3 - 2 * t);
}

/**
 * Altezza della curva della zona di forza: 1 dentro la zona sicura, circa 0,6
 * sulle spalle tollerate, 0 oltre la tolleranza.
 *
 * È la lettura morbida delle stesse tre soglie del giudizio, non una grandezza
 * misurata: serve a vedere *dove* cade il mix rispetto alla zona, non a
 * quantificare quanto regge. La zona si muove con gli ingredienti, il segno del
 * mix no: è il segno che esce.
 */
export function adattamentoForza(
  w: number,
  wConsigliato: number,
  fasce: FasceW = fasceForza(wConsigliato),
): number {
  const { sicura, tollerata } = fasce;
  const rampa = Math.max((sicura[1] - sicura[0]) * 0.5, 8);
  // Stesso arrotondamento del giudizio: il segno del mix e le fasce disegnate
  // non devono dare letture diverse dello stesso W.
  const grado = Math.round(w);

  if (grado >= sicura[0] && grado <= sicura[1]) return 1;

  if (grado < sicura[0]) {
    // A sinistra non c'è spalla: la finestra comincia qui, sotto si scende
    // subito. È la stessa asimmetria del giudizio, dove la debolezza pesa più
    // dell'eccesso.
    return transizione(w, sicura[0] - rampa, sicura[0]);
  }

  if (w <= tollerata[1]) return 1 - 0.4 * transizione(w, sicura[1], tollerata[1]);
  return 0.6 * (1 - transizione(w, tollerata[1], tollerata[1] + rampa));
}

/**
 * Quota di farina forte che porta la *media* pesata al W voluto.
 *
 * Non è più usata per i consigli: la valutazione non legge la media ma
 * `forzaEfficace`, quindi questa quota poteva lasciare il mix fuori fascia
 * (25% di W 400 su 75% di W 200: media 250, efficace 206,7). Resta come
 * riferimento storico e per i test del criterio a media pesata; i consigli
 * usano `suggerimentoMiscela`.
 */
export interface SuggerimentoQuota {
  forte: number;
  debole: number;
  /** Quota della farina più forte sul totale delle farine, in percentuale. */
  quota: number;
}

export function quotaFarinaForte(
  farine: readonly Farina[],
  wVoluto: number,
): SuggerimentoQuota | null {
  const note = farine.filter((farina) => farina.w !== null && farina.quota > 0);
  if (note.length < 2) return null;

  const ordinati = [...note].sort((a, b) => (a.w ?? 0) - (b.w ?? 0));
  const debole = ordinati[0].w ?? 0;
  const forte = ordinati[ordinati.length - 1].w ?? 0;

  // Con farine troppo simili il consiglio non direbbe nulla di utile.
  if (forte - debole < 20) return null;

  const quota = ((wVoluto - debole) / (forte - debole)) * 100;
  if (quota <= 0 || quota >= 100) return null;

  return { forte, debole, quota };
}

/** Come correggere il mix quando è fuori finestra. */
export interface QuotaMiscela {
  w: number;
  quota: number;
}

export interface SuggerimentoMiscela {
  /** Tutte le quote proposte, nello stesso ordine delle farine con W. */
  quote: readonly QuotaMiscela[];
  /** W efficace ricalcolato su queste quote, con la formula della valutazione. */
  wEfficace: number;
  /** Punti percentuali aggiunti alla farina più forte. */
  aumento: number;
  /** Vero se qualche farina con quota non ha il W: il conto vale solo sulle altre. */
  parziale: boolean;
}

/**
 * Quote intere: la farina più forte prende `quotaForte`, le altre si spartiscono
 * il resto in proporzione alle quote attuali (metodo dei resti maggiori). La
 * somma fa sempre 100 e la più forte non scende mai sotto `quotaForte`: il resto
 * che avanza dagli arrotondamenti torna a lei.
 */
function distribuisciQuota(
  note: readonly Farina[],
  indiceForte: number,
  quotaForte: number,
  totaleAltre: number,
): number[] {
  const resto = 100 - quotaForte;
  const interi = note.map(() => 0);
  if (resto <= 0) {
    interi[indiceForte] = 100;
    return interi;
  }
  if (totaleAltre <= 0) {
    interi[indiceForte] = 100;
    return interi;
  }

  const ideali = note.map((farina, indice) =>
    indice === indiceForte || farina.quota <= 0 ? 0 : (farina.quota / totaleAltre) * resto,
  );
  for (let indice = 0; indice < ideali.length; indice += 1) {
    interi[indice] = Math.floor(ideali[indice]);
  }

  let residuo = resto - interi.reduce((somma, valore) => somma + valore, 0);
  const perResto = ideali
    .map((valore, indice) => ({ indice, resto: valore - Math.floor(valore) }))
    .filter((voce) => voce.indice !== indiceForte && ideali[voce.indice] > 0)
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);

  for (const voce of perResto) {
    if (residuo <= 0) break;
    interi[voce.indice] += 1;
    residuo -= 1;
  }

  // Il resto non assegnato (o tutto, se le altre non avevano quota) va alla forte.
  interi[indiceForte] = 0;
  interi[indiceForte] = 100 - interi.reduce((somma, valore) => somma + valore, 0);
  return interi;
}

/**
 * Quote che portano il mix dentro la fascia tollerata, cercate con lo stesso
 * criterio con cui il mix viene giudicato (`forzaEfficace`), non con la media
 * pesata.
 *
 * La farina più forte cresce e le altre si riducono in proporzione; ogni
 * candidato viene ricalcolato sulle quote *effettivamente* proposte, intere e
 * con somma 100. Si scorre dal minimo aumento verso l'alto e si prende il primo
 * che cade dentro tutta la fascia tollerata: niente bisezione, perché
 * `forzaEfficace` non è monotona nell'aumento della farina forte (la penalità di
 * eterogeneità cresce prima di calare).
 */
export function suggerimentoMiscela(
  farine: readonly Farina[],
  wConsigliato: number,
  tollerata: readonly [number, number] = fasceForza(wConsigliato).tollerata,
): SuggerimentoMiscela | null {
  const note = farine.filter((farina) => farina.w !== null && farina.quota > 0);
  if (note.length < 2) return null;

  const forte = Math.max(...note.map((farina) => farina.w ?? 0));
  const indiceForte = note.findIndex((farina) => (farina.w ?? 0) === forte);
  const quotaForteAttuale = Math.round(note[indiceForte].quota);
  const totaleAltre = note.reduce(
    (somma, farina, indice) => (indice === indiceForte ? somma : somma + farina.quota),
    0,
  );
  const parziale = farine.some((farina) => farina.w === null && farina.quota > 0);

  for (let quotaForte = quotaForteAttuale + 1; quotaForte <= 100; quotaForte += 1) {
    const quote = distribuisciQuota(note, indiceForte, quotaForte, totaleAltre);
    const wEfficace = forzaEfficace(
      note.map((farina, indice) => ({ quota: quote[indice], w: farina.w })),
    );
    if (wEfficace === null) continue;

    const grado = Math.round(wEfficace);
    if (grado < tollerata[0] || grado > tollerata[1]) continue;

    return {
      quote: note.map((farina, indice) => ({ w: farina.w ?? 0, quota: quote[indice] })),
      wEfficace,
      aumento: quotaForte - quotaForteAttuale,
      parziale,
    };
  }

  return null;
}

/** Come correggere il mix quando è fuori fascia, in parole. */
export function consiglioForza(
  farine: readonly Farina[],
  wEfficaceValore: number,
  wConsigliato: number,
  finestra: { minima: number; massima: number },
): string | null {
  const grado = Math.round(wEfficaceValore);

  if (grado < finestra.minima) {
    const suggerimento = suggerimentoMiscela(farine, wConsigliato, [
      finestra.minima,
      finestra.massima,
    ]);
    if (suggerimento) {
      const quote = suggerimento.quote.map((voce) => `W ${voce.w} al ${voce.quota}%`).join(', ');
      return `Sotto la fascia tollerata ${finestra.minima}–${finestra.massima}: il modello indica di portare le farine a ${quote}, con un W efficace di ${Math.round(
        suggerimento.wEfficace,
      )}.${
        suggerimento.parziale
          ? ' Il conto vale solo sulle farine con il W dichiarato: le altre non entrano nella stima.'
          : ''
      }`;
    }
    return `Sotto la fascia tollerata ${finestra.minima}–${finestra.massima}: con queste farine il modello non trova una quota che basti, nemmeno usando solo la più forte. Servono ore più corte o una farina più energetica.`;
  }

  if (grado > finestra.massima) {
    return `Sopra la fascia tollerata ${finestra.minima}–${finestra.massima}: il modello indica un impasto più tenace del necessario per queste ore; puoi valutare una maturazione più lunga o un’idratazione più alta.`;
  }

  return null;
}

/** Area di una teglia, in cm². */
export function areaTeglia(
  forma: InputCalcolo['formaTeglia'],
  latoA: number,
  latoB: number,
  diametro: number,
): number {
  if (forma === 'tonda') return Math.PI * (diametro / 2) ** 2;
  return latoA * latoB;
}

/**
 * Temperatura dell'acqua per chiudere l'impasto alla temperatura voluta:
 * formula classica 3 × obiettivo − ambiente − farina − riscaldamento.
 */
export function temperaturaAcqua(
  obiettivo: number,
  ambiente: number,
  temperaturaFarina: number,
  riscaldamento: number,
): number {
  return obiettivo * 3 - ambiente - temperaturaFarina - riscaldamento;
}

function formattaOre(valore: number): string {
  const testo = Number.isInteger(valore)
    ? String(valore)
    : valore.toFixed(1).replace('.', ',');
  return valore === 1 ? '1 ora' : `${testo} ore`;
}

/**
 * Tabella di marcia con gli orari reali delle fasi.
 *
 * Lo staglio entra nella sequenza dove succede davvero: prima del frigo se i
 * panetti si formano appena finita la puntata, subito dopo il frigo se la
 * massa resta unica. La teglia non ha panetti, quindi la voce non compare.
 * L'ultima riga si chiama sempre allo stesso modo: «Impasto pronto».
 */
export function passiTempo(
  inizio: Date,
  tempi: ParametriTempo,
  staglio: InputCalcolo['staglio'] = 'prima',
  tonda = true,
): PassoTempo[] {
  const aggiungiOre = (data: Date, quante: number) =>
    new Date(data.getTime() + quante * 3_600_000);

  const passi: PassoTempo[] = [];
  let corrente = new Date(inizio);

  passi.push({
    quando: new Date(corrente),
    titolo: 'Impasto',
    nota:
      tempi.oreTaPrima > 0
        ? `Puntata a ${tempi.ta} °C per ${formattaOre(tempi.oreTaPrima)}.`
        : `Subito in frigorifero a ${tempi.tc} °C.`,
  });

  // La puntata passa comunque, con o senza frigo: è lì che finisce la prima
  // lievitazione a temperatura ambiente.
  corrente = aggiungiOre(corrente, tempi.oreTaPrima);

  if (tonda && (staglio === 'prima' || tempi.oreFrigo === 0)) {
    passi.push({
      quando: new Date(corrente),
      titolo: 'Staglio / Formazione panetti',
      nota: 'Panetti formati e messi a lievitare.',
    });
  }

  if (tempi.oreFrigo > 0) {
    passi.push({
      quando: new Date(corrente),
      titolo: 'In frigorifero',
      nota: `${formattaOre(tempi.oreFrigo)} a ${tempi.tc} °C.`,
    });

    corrente = aggiungiOre(corrente, tempi.oreFrigo);

    if (tonda && staglio === 'dopo') {
      passi.push({
        quando: new Date(corrente),
        titolo: 'Staglio / Formazione panetti',
        nota: 'Panetti formati appena usciti dal frigo.',
      });
    }

    passi.push({
      quando: new Date(corrente),
      titolo: 'Fuori dal frigorifero',
      nota: `Appretto a ${tempi.ta} °C per ${formattaOre(tempi.oreTaDopo)}.`,
    });
  }

  corrente = aggiungiOre(corrente, tempi.oreTaDopo);
  passi.push({
    quando: new Date(corrente),
    titolo: 'Impasto pronto',
    nota: tonda ? 'Panetti in appretto.' : 'Teglia lievitata.',
  });

  return passi;
}

function arrotonda1(valore: number): number {
  return Math.round(valore * 10) / 10;
}

/** Il lievito si legge al centesimo: 0,06 g non è zero. */
function arrotonda2(valore: number): number {
  return Math.round(valore * 100) / 100;
}

function arrotondaG(valore: number): number {
  return Math.round(valore);
}

/** Calcolo completo: dosi, lievito, forza del mix, acqua e orari. */
export function calcola(
  input: InputCalcolo,
  inizio: Date = new Date(),
): RisultatoCalcolo {
  const tempi = input.tempi;

  // Percentuali tutte sulla farina: il denominatore trasforma il peso
  // dell'impasto in farina.
  const denominatore = 1 + (input.idratazione + input.sale + input.olio + input.malto) / 100;

  let area = 0;
  let numeroPezzi = 0;
  let pesoObiettivoG = 0;

  if (input.tipo === 'teglia') {
    area = areaTeglia(input.formaTeglia, input.latoA, input.latoB, input.diametro);
    pesoObiettivoG = area * input.numeroTeglie * input.grammiPerCm2;
    numeroPezzi = input.numeroTeglie;
  } else if (input.modalita === 'farina') {
    pesoObiettivoG = (input.farinaG ?? 0) * denominatore;
  } else {
    numeroPezzi = input.numeroPanetti ?? 0;
    pesoObiettivoG = numeroPezzi * (input.pesoPanettoG ?? 0);
  }

  const farinaG = arrotondaG(pesoObiettivoG / denominatore);
  const acquaG = arrotondaG((farinaG * input.idratazione) / 100);
  const saleG = arrotondaG((farinaG * input.sale) / 100);
  const olioG = arrotondaG((farinaG * input.olio) / 100);
  const maltoG = arrotondaG((farinaG * input.malto) / 100);

  // Inerzia termica: l'impasto insegue la temperatura dell'ambiente invece di
  // saltarci sopra, quindi le ore equivalenti sono l'integrale del ritmo di
  // fermentazione sulla temperatura reale del pezzo. La massa che conta è
  // quella che sta in frigo: la massa unica se lo staglio viene dopo.
  const formaInFrigo: FormaMassa =
    input.tipo !== 'teglia' && input.staglio === 'prima' ? 'panetto' : 'massa';
  const formaInAppretto: FormaMassa = input.tipo === 'teglia' ? 'massa' : 'panetto';
  const pesoPezzoG =
    input.tipo === 'teglia'
      ? pesoObiettivoG / Math.max(1, input.numeroTeglie)
      : (input.pesoPanettoG ?? 0);

  const profilo = profiloTermico(tempi, {
    pesoPezzoG,
    pesoImpastoG: pesoObiettivoG,
    formaInFrigo,
    formaInAppretto,
    temperaturaIniziale: input.temperaturaImpasto,
  });

  // Lo stesso impasto letto con il modello precedente: serve quando è lui il
  // modello attivo, e comunque per mostrare il confronto fra i due.
  const profiloPrecedente = profiloVecchio(tempi, {
    temperaturaIniziale: input.temperaturaImpasto,
  });
  const vecchio = input.modello === 'vecchio';
  // Il modello a 12 mini-ricette è il motore predefinito: quando è lui a
  // leggere l'impasto, W e dose non vengono dal conteggio termico ma dai suoi
  // due indici. Stesso impasto, stessa farina, stessi tempi: cambia il modo di
  // contare le ore, non i dati di partenza.
  const mini = input.modello === 'miniRicette';
  const miniRicetta = calcolaMiniRicetta({
    ricetta: input.ramo,
    hPrima: tempi.oreTaPrima,
    hFrigo: tempi.oreFrigo,
    hDopo: tempi.oreTaDopo,
    ta: tempi.ta,
    tc: tempi.tc,
    t0: input.temperaturaImpasto,
    idro: input.idratazione,
    sale: input.sale,
    olio: input.olio,
    massa: pesoObiettivoG,
    farina: farinaG,
    formato: input.tipo === 'teglia' ? 'teglia' : 'tonda',
  });

  const oreEqNuovo = profilo.oreEquivalenti;
  const oreEqVecchio = profiloPrecedente.oreEquivalenti;
  // Con il modello a 12 mini-ricette le ore equivalenti sono quelle del suo
  // indice di maturazione: è lo stesso asse (ore a 20 °C), contato con il peso
  // del frigo che quel modello ha scelto.
  const oreEq = mini ? miniRicetta.iMat : vecchio ? oreEqVecchio : oreEqNuovo;

  const percentualeFrescoNuovo = percentualeLievitoFresco({
    oreEquivalenti: oreEqNuovo,
    ramo: input.ramo,
    idratazione: input.idratazione,
    sale: input.sale,
    olio: input.olio,
  });
  const percentualeFrescoVecchio = percentualeLievitoVecchio({
    oreEquivalenti: oreEqVecchio,
    ramo: input.ramo,
    idratazione: input.idratazione,
    sale: input.sale,
    olio: input.olio,
  });
  const percentualeFrescoBase = mini
    ? miniRicetta.doseGkg / 10
    : vecchio
      ? percentualeFrescoVecchio
      : percentualeFrescoNuovo;
  const percentualeFresco = percentualeFrescoBase * (1 + input.correzioneLievito / 100);
  const percentuale = percentualeFresco * FATTORI_LIEVITO[input.tipoLievito];

  const lievitoFrescoG = arrotonda2((farinaG * percentualeFresco) / 100);
  const lievitoG = arrotonda2((farinaG * percentuale) / 100);

  const pesoFinaleG = arrotondaG(farinaG + acquaG + saleG + olioG + maltoG + lievitoG);

  let residuoG: number | null = null;
  if (input.tipo !== 'teglia' && input.modalita === 'farina') {
    const pesoPanetto = input.pesoPanettoG ?? 0;
    numeroPezzi = pesoPanetto > 0 ? Math.floor(pesoFinaleG / pesoPanetto) : 0;
    residuoG = arrotondaG(pesoFinaleG - numeroPezzi * pesoPanetto);
  }

  // Due orologi: il W cresce con le ore equivalenti e anche con le ore reali
  // passate in frigo, perché la maturazione a 4 °C consuma struttura senza
  // consumare zuccheri.
  const forzaNuovo = forzaImpasto(oreEqNuovo, tempi.oreFrigo);
  // Anche il motore predefinito legge il W con i due orologi: le ore
  // equivalenti sono le sue, la legge è una sola. Quello che resta diverso fra
  // i due motori è il modo di contare le ore, non il modo di chiedere la
  // farina. L'emulazione storica del W (`forzaVecchio`) resta in vecchio.ts
  // come documentazione e come test, ma non è più quella mostrata.
  const forzaPrecedente = forzaImpasto(oreEqVecchio, tempi.oreFrigo);
  const wConsigliato = mini ? miniRicetta.w : vecchio ? forzaPrecedente : forzaNuovo;
  const weq = wEquivalente(input.farine);
  const weff = forzaEfficace(input.farine);
  // Le forbici del W: con il modello a 12 mini-ricette sono la fascia della
  // mini-ricetta del caso (già traslata dall'affinamento) più 10 W di
  // tolleranza; con gli altri due motori resta la finestra percentuale.
  const fasce = mini ? fasceMini(miniRicetta.fasciaEffettiva) : fasceForza(wConsigliato);
  const finestra = { minima: fasce.tollerata[0], massima: fasce.tollerata[1] };
  // Inversione algebrica a zero ore di frigo; non è una durata della farina e
  // non entra più nei consigli né nella card.
  const oreMassime = weff === null ? null : oreMassimePerForza(weff);
  const sicura = fasce.sicura;
  const suggerimentoForza =
    weff === null ? null : consiglioForza(input.farine, weff, wConsigliato, finestra);

  const acquaConsigliata = temperaturaAcqua(
    input.temperaturaImpasto,
    tempi.ta,
    input.temperaturaFarina,
    input.riscaldamento,
  );

  const lievitoPerKgFarina = arrotonda1(percentualeFresco * 10);

  const avvisi: string[] = [];
  // Il confronto è sul valore esatto: l'arrotondamento serve solo a mostrarlo.
  const lievitoPerKgEsatto = percentualeFresco * 10;
  if (lievitoPerKgEsatto > 12) {
    avvisi.push(
      'Dose di lievito alta, oltre 12 g freschi per kg di farina: con questi tempi l’impasto può sovralievitare, controlla di non aver messo il frigo troppo alto.',
    );
  }
  if (lievitoPerKgEsatto < 0.4) {
    avvisi.push(
      'Dose di lievito molto bassa, sotto 0,4 g freschi per kg: serve una farina forte e temperature stabili, altrimenti la lievitazione non parte.',
    );
  }

  // Quando la dose tocca un limite il numero mostrato non è più quello del
  // modello: va detto, altrimenti sembra una stima e non un taglio.
  // Ogni motore ha i suoi limiti: l'avviso deve nascere dal limite del modello
  // attivo, non da quello del nuovo applicato anche al vecchio.
  const limitiLievito = vecchio ? LIMITI_LIEVITO_VECCHIO : LIMITI_LIEVITO;
  // Il modello a 12 mini-ricette ha già i suoi limiti dentro (0,1–30 g/kg) e li
  // dichiara nella scheda: qui non si applica un secondo taglio.
  const limite = mini ? null : limiteDose(percentualeFrescoBase, limitiLievito);
  if (limite === 'minimo') {
    avvisi.push(
      `La dose del modello scende sotto il minimo (${limitiLievito.min}% sulla farina) e viene fermata lì: con questa durata il limite non è più il lievito ma la tenuta della farina, quindi accorcia i tempi.`,
    );
  }
  if (limite === 'massimo') {
    avvisi.push(
      `La dose del modello supererebbe il massimo (${limitiLievito.max}% sulla farina) e viene fermata lì: con questi tempi il problema è il programma, non il lievito.`,
    );
  }
  if (limite !== null && Math.abs(percentualeFresco - percentualeFrescoBase) > 1e-9) {
    avvisi.push(
      `La correzione manuale del lievito sposta la dose a ${arrotonda2(
        percentualeFresco,
      )}%: il modello si era fermato a ${arrotonda2(
        percentualeFrescoBase,
      )}%, quindi il numero mostrato non è quello trattenuto dal limite.`,
    );
  }

  // L'altro orologio: le ore reali in frigo. Le ore equivalenti le contano
  // poco, ma la maglia si degrada comunque.
  if (Math.max(0, tempi.oreFrigo) > 48) {
    avvisi.push(
      'Oltre 48 ore in frigorifero: il lievito è quasi fermo, gli enzimi no. La maglia continua a indebolirsi, per questo il W richiesto sale oltre quello delle sole ore equivalenti.',
    );
  }
  if (oreEq < 3) {
    avvisi.push(
      'Lievitazione molto corta: sotto le 3 ore equivalenti il glutine non ha il tempo di distendersi e la pizza resta dura.',
    );
  }
  if (oreEq > 60) {
    avvisi.push(
      'Lievitazione molto lunga: oltre le 60 ore equivalenti cresce il rischio di sovramaturazione, con impasto che perde struttura.',
    );
  }
  if (acquaConsigliata < 4) {
    avvisi.push(
      `L’acqua dovrebbe stare a ${Math.round(acquaConsigliata)} °C: così fredda rallenti troppo la partenza del lievito.`,
    );
  }
  if (acquaConsigliata > 30) {
    avvisi.push(
      `L’acqua dovrebbe stare a ${Math.round(acquaConsigliata)} °C: oltre i 30 °C rischi di stressare il lievito e di chiudere l’impasto troppo caldo.`,
    );
  }
  if (weff !== null && giudizioForza(weff, wConsigliato, fasce) === 'distante') {
    const wMix = Math.round(weff);
    avvisi.push(
      wMix < finestra.minima
        ? `Il mix ha W ${wMix}, sotto la fascia tollerata ${finestra.minima}–${finestra.massima} per queste ore: il modello indica una maglia al limite. Accorcia i tempi o aggiungi una farina più forte.`
        : `Il mix ha W ${wMix}, sopra la fascia tollerata ${finestra.minima}–${finestra.massima} per queste ore: il modello indica un impasto più tenace del necessario. Puoi valutare una maturazione più lunga o un’idratazione più alta.`,
    );
  }

  return {
    farinaG,
    acquaG,
    saleG,
    olioG,
    maltoG,
    lievitoG,
    lievitoFrescoG,
    pesoImpastoG: pesoFinaleG,
    numeroPezzi,
    pesoPerPezzoG: numeroPezzi > 0 ? pesoFinaleG / numeroPezzi : 0,
    residuoG,
    percentualeLievito: percentuale,
    modello: mini ? 'miniRicette' : vecchio ? 'vecchio' : 'nuovo',
    confronto: {
      oreEquivalentiNuovo: oreEqNuovo,
      oreEquivalentiVecchio: oreEqVecchio,
      lievitoNuovoG: arrotonda2(
        (farinaG * percentualeFrescoNuovo * (1 + input.correzioneLievito / 100) *
          FATTORI_LIEVITO[input.tipoLievito]) /
          100,
      ),
      lievitoVecchioG: arrotonda2(
        (farinaG * percentualeFrescoVecchio * (1 + input.correzioneLievito / 100) *
          FATTORI_LIEVITO[input.tipoLievito]) /
          100,
      ),
      forzaNuovo,
      forzaVecchio: forzaPrecedente,
      forzaMini: miniRicetta.w,
      lievitoMiniG: arrotonda2(miniRicetta.lievitoG * FATTORI_LIEVITO[input.tipoLievito]),
    },
    oreEquivalenti: oreEq,
    oreEquivalentiSenzaInerzia: profilo.oreSenzaInerzia,
    costanteTempoOre:
      formaInFrigo === 'panetto' ? profilo.costanteTempoPezzo : profilo.costanteTempoMassa,
    temperaturaUscitaFrigo: vecchio
      ? profiloPrecedente.temperaturaUscitaFrigo
      : profilo.temperaturaUscitaFrigo,
    oreEquivalentiInFrigo: vecchio
      ? profiloPrecedente.oreEquivalentiInFrigo
      : profilo.equivalenti.inFrigo,
    areaTegliaCm2: area,
    forzaConsigliata: wConsigliato,
    wEquivalente: weq,
    giudizioForza: weff === null ? null : giudizioForza(weff, wConsigliato, fasce),
    wEfficace: weff,
    forzaMinima: finestra.minima,
    forzaMassima: finestra.massima,
    zonaMinima: sicura[0],
    zonaMassima: sicura[1],
    oreMassime,
    limiteLievito: limite,
    suggerimentoForza,
    passi: passiTempo(inizio, tempi, input.staglio, input.tipo !== 'teglia'),
    temperaturaAcqua: acquaConsigliata,
    lievitoPerKgFarina,
    curva: vecchio ? profiloPrecedente.curva : profilo.curva,
    fasce: vecchio ? profiloPrecedente.fasce : profilo.fasce,
    miniRicetta,
    avvisi,
  };
}
