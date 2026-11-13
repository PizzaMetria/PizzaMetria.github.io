import type { Ramo, TipoLievito } from '../types';

/*
 * MODELLO DI FERMENTAZIONE — calibrazione «C»
 * -------------------------------------------
 * Ogni fase della lievitazione viene convertita in «ore equivalenti a 20 °C»
 * moltiplicando le ore reali per il fattore di temperatura della fase; le ore
 * equivalenti alimentano la legge del lievito.
 *
 * DUE OROLOGI. Le ore equivalenti servono a una cosa sola: quanta forza di
 * lievito serve. Non raccontano la maturazione. A 4 °C il lievito è quasi
 * fermo ma proteasi e amilasi continuano, quindi un impasto può avere le
 * stesse ore equivalenti di uno breve e essere comunque più degradato. Per
 * questo la forza della farina (vedi `forzaConsigliata`) somma alle ore
 * equivalenti anche le ore reali passate in frigorifero: sono due orologi
 * diversi e non vanno confusi.
 *
 * TRE RAMI. Verace, contemporanea e teglia hanno coefficienti propri perché
 * sono tre ricette diverse: cambia l'idratazione di lavoro, cambia la forza
 * della farina, cambia il programma. Un solo ramo per le due tonde costringeva
 * l'esponente dell'idratazione a fare da surrogato della ricetta.
 *
 * I coefficienti non sono stimati a occhio: il ramo verace e quello teglia
 * vengono dalla campagna di misure a parametro singolo — temperatura, durata,
 * idratazione, sale, olio, tipo di lievito — con i valori fittati ai minimi
 * quadrati (artifacts/calcolatori/FORMULE-ESTRATTE.md). Il ramo contemporanea
 * è tarato sulle ricette di riferimento con ferro da frigo, perché la campagna
 * misurava solo impasti a temperatura ambiente: vedi
 * DOCUMENTAZIONE-CALIBRAZIONE-C.md per le ancore e gli scarti.
 */

/**
 * Fattore di temperatura. La curva non segue un raddoppio ogni 10 °C: è
 * leggermente concava, e una quadratica sul logaritmo la riproduce entro lo
 * 0,5% su tutto l'intervallo 16–28 °C misurato.
 *
 *   ln(rate) = −2,843854 + 0,175803·T − 0,00168741·T²
 *
 * Il valore è normalizzato a 1 esatto a 20 °C. Ai 4 °C del frigorifero la
 * stessa formula dà 0,1148, cioè un'ora in cella conta come sette minuti a
 * temperatura ambiente. **Questo valore non è stato toccato**: la calibrazione
 * «C» non ha trovato motivi per cambiarlo (vedi la documentazione).
 */
const TEMP = { a: -2.843854, b: 0.175803, c: -0.00168741 } as const;

/**
 * Fuori da questo intervallo la quadratica non si estrapola più: sotto i −2 °C
 * il modello non sa cosa succede (la cella non gela l'impasto, ma il lievito
 * entra in uno stato che non è più cinetico), sopra i 42 °C il lievito muore.
 *
 * Sopra i 38 °C la curva grezza continuerebbe a salire fino a 52 °C, che è
 * falso: l'optimum di produzione di gas è intorno ai 35 °C e oltre i 45 °C le
 * proteine coagulano. Il fattore viene quindi riportato giù con un calo che
 * parte piano (derivata nulla a 38 °C) e vale 0,68 a 42 °C.
 */
export const LIMITI_TEMPERATURA = {
  min: -2,
  max: 42,
  caloDa: 38,
  /** Frazione persa per ogni grado oltre `caloDa`, elevata a 1,5. */
  calo: 0.04,
} as const;

function temperaturaGrezza(temperatura: number): number {
  const t = Math.min(LIMITI_TEMPERATURA.max, Math.max(LIMITI_TEMPERATURA.min, temperatura));
  return Math.exp(TEMP.a + TEMP.b * t + TEMP.c * t * t);
}

const NORMALE_20 = temperaturaGrezza(20);

export function fattoreTemperatura(temperatura: number): number {
  const normalizzato = temperaturaGrezza(temperatura) / NORMALE_20;
  if (temperatura <= LIMITI_TEMPERATURA.caloDa) return normalizzato;

  const eccesso =
    Math.min(temperatura, LIMITI_TEMPERATURA.max) - LIMITI_TEMPERATURA.caloDa;
  return normalizzato * (1 - LIMITI_TEMPERATURA.calo * eccesso ** 1.5);
}

/**
 * Un ramo di calibrazione: la legge del lievito di una ricetta.
 *
 *   percentuale = coefficiente × oreEquivalenti^(−esponente) × (idratazione / riferimento)^esponenteAcqua
 *
 * `esponenteAcqua` è negativo: più acqua, più velocità, meno lievito. È un
 * parametro del ramo e non una costante globale, perché l'effetto misurato a
 * temperatura ambiente (-1,2 sul riferimento, fra 55% e 80%) non descrive bene una
 * contemporanea che nasce al 75%: lì quell'esponente stava assorbendo la
 * differenza fra le ricette, non quella fra le acque.
 */
export interface RamoDose {
  coefficiente: number;
  esponente: number;
  idratazione: { riferimento: number; esponente: number };
}

/**
 * I tre rami. Verace e teglia restano quelli misurati; la contemporanea ha
 * coefficiente ed esponente propri, tarati su cinque ancore (i due casi
 * d'uso, 24 ore di solo frigo, 48 e 72 ore) con scarti entro il 14%.
 *
 * Il rapporto teglia/tonda a 24 ore resta circa 3, come prima: la teglia non
 * è cambiata, è la tonda contemporanea ad aver smesso di essere una verace.
 */
export const RAMI: Record<Ramo, RamoDose> = {
  verace: {
    coefficiente: 2.8656,
    esponente: 1.1978,
    idratazione: { riferimento: 62, esponente: -1.2 },
  },
  contemporanea: {
    coefficiente: 2.99,
    esponente: 1.225,
    idratazione: { riferimento: 62, esponente: -0.3 },
  },
  teglia: {
    coefficiente: 14.0668,
    esponente: 1.3589,
    idratazione: { riferimento: 62, esponente: -1.2 },
  },
};

/**
 * Limiti degli ingredienti usati *dentro* il modello (non nell'interfaccia):
 * servono a garantire che qualunque numero arrivi produca un risultato finito
 * e sensato. Oltre l'8% di sale il fattore di velocità lineare cambierebbe
 * segno — a 17,9% si annulla e la dose schizzerebbe da 8% a 0,01%: qui viene
 * tagliato prima.
 */
export const LIMITI_INGREDIENTI = {
  idratazione: { min: 40, max: 100 },
  sale: { min: 0, max: 8 },
  olio: { min: 0, max: 10 },
} as const;

/**
 * Sale e olio rallentano la fermentazione. I due fattori sono di VELOCITÀ,
 * non dosi: vanno sotto il coefficiente, cioè la dose si divide per loro.
 * Sono normalizzati sui valori di riferimento (2,5% di sale, nessun olio),
 * così il coefficiente del ramo resta quello misurato.
 */
const SALE = { base: 1.172, pendenza: -0.0655, riferimento: 2.5 } as const;
/** Dose × (1 + 0,05 · olio). */
const OLIO = { pendenza: 0.05 } as const;

/**
 * Forza consigliata: una legge logaritmica, due orologi, nessun tetto basso.
 *
 *   W = 119 + 64 · ln(oreEq + 0,155 · oreFrigo)
 *       + 2,4 · (idro − 62) + 2 · (sale − 2,5) − 1 · (olio − 2)
 *
 * **Perché logaritmica.** La retta precedente (162,657 + 5,8044 · oreEq + 2 ·
 * oreFrigo) veniva da una regressione sulle ore *equivalenti*, ma la scala del
 * W non è lineare nel tempo: raddoppiare la maturazione non raddoppia la forza
 * che serve. Il confronto con le schede dei molini lo mostra bene — W 260–280
 * per 8–12 ore, 300–320 per 24, 360–380 per 48, 400 per 72 (Caputo Pizzeria,
 * Saccorosso, Manitoba; AVPN 2022; Rachello; Grassi). Una retta non passa per
 * quei quattro punti: o sottostima le corte o sovrastima le lunghe, e infatti
 * la vecchia legge dava 208 a 8 ore (contro 260–270 dichiarati) e finiva sul
 * tetto di 365 già a 36 ore, dove le fonti chiedono ancora 380 a 48 e 400 a 72.
 *
 * **La calibrazione.** 31 vincoli: i 20 punti della scala PizzaBlab (10 a
 * temperatura ambiente, 10 in frigo), AVPN 2022 (8 h → W 265, 24 h → W 300),
 * Caputo Pizzeria/Saccorosso/Manitoba, Molino Rachello, il disciplinare
 * dell'Associazione Pizza Romana, la teglia professionale di Molini Pivetti e,
 * come outliers dichiarati, la 00 Slow H24 di Molino Grassi. Minimi quadrati
 * pesati sulla sola incognita non lineare (il peso del frigo), poi lineari:
 * errore quadratico medio 15,7 W su tutto l'intervallo 2–288 ore. Il residuo
 * più grande è Grassi (−57 W), che è una farina W 380 venduta per 24 ore: non
 * è il minimo che serve, è il massimo che il mulino offre.
 *
 * **Perché due orologi.** Il frigo conta 0,115 per il lievito (è dentro le ore
 * equivalenti) e 0,27 per la struttura: la differenza, 0,155 per ora, è quella
 * che il W aggiunge qui. A 4 °C il lievito è quasi fermo, proteasi e amilasi no:
 * la maglia si degrada comunque, e la farina deve essere più forte.
 *
 * **Perché gli ingredienti adesso contano.** Prima il W non si muoveva con
 * acqua, sale e olio: era una scelta, non una misura, e contraddiceva le schede
 * dei molini, che per le alte idratazioni chiedono 300–350 dove per la stessa
 * durata al 62% ne chiedono 260–320 (Rachello) e il disciplinare romano dà
 * 260–350 per impasti al 70–80%. L'acqua non cambia la velocità del lievito
 * (Le-Bail 2010: 56–60% di idratazione non sposta la cinetica), ma cambia
 * quanta struttura serve per tenerla. Il sale rinforza leggermente la maglia,
 * l'olio la distende: i due coefficienti sono quelli già usati dalle 12
 * mini-ricette, così i due motori non si contraddicono sullo stesso impasto.
 */
const FORZA = {
  /** W a un'ora equivalente: il piede della curva. */
  base: 119,
  /** Gradi di W per unità di logaritmo naturale delle ore. */
  pendenza: 64,
  /**
   * Ore di cella che contano per la struttura in più rispetto alle ore
   * equivalenti: 0,115 + 0,155 = 0,27 per ora, contro 0,115 per il lievito.
   */
  frigoStruttura: 0.155,
  idratazione: { riferimento: 62, pendenza: 2.4 },
  sale: { riferimento: 2.5, pendenza: 2 },
  olio: { riferimento: 2, pendenza: -1 },
  /** Oltre le 72 ore equivalenti il modello non ha più vincoli: si ferma qui. */
  tetto: 420,
  /** Sotto le 2 ore la legge scenderebbe sotto la farina più debole in commercio. */
  minimo: 150,
} as const;

/** Ingredienti che spostano la forza richiesta (non la dose di lievito). */
export interface IngredientiForza {
  /** Idratazione in punti percentuali. */
  idratazione: number;
  /** Sale in percentuale sulla farina. */
  sale: number;
  /** Olio in percentuale sulla farina. */
  olio: number;
}

/** Resa dei due lieviti, rispetto al fresco (fresco = 1). */
export const FATTORI_LIEVITO: Record<TipoLievito, number> = {
  fresco: 1,
  secco: 0.335,
};

export const NOMI_LIEVITO: Record<TipoLievito, string> = {
  fresco: 'Lievito fresco',
  secco: 'Lievito secco',
};

/**
 * Dose pesabile. Sotto 0,15 g per kg di farina non c'è modo di distribuire il
 * lievito in modo uniforme (su un chilo sono 0,15 g: una punta di coltello);
 * sopra 30 g per kg non è più un impasto a lievitazione ma una pasta madre.
 * I due limiti sono un taglio, non una curva: quando scattano l'interfaccia lo
 * dice, perché il numero mostrato non è più quello del modello.
 */
export const LIMITI_LIEVITO = { min: 0.015, max: 3 } as const;

export type LimiteDose = 'minimo' | 'massimo' | null;

export function fattoreSale(sale: number): number {
  const s = Math.min(LIMITI_INGREDIENTI.sale.max, Math.max(LIMITI_INGREDIENTI.sale.min, sale));
  return (SALE.base + SALE.pendenza * s) / (SALE.base + SALE.pendenza * SALE.riferimento);
}

export function fattoreOlio(olio: number): number {
  const o = Math.min(LIMITI_INGREDIENTI.olio.max, Math.max(LIMITI_INGREDIENTI.olio.min, olio));
  return 1 / (1 + OLIO.pendenza * o);
}

export interface ParametriLievito {
  oreEquivalenti: number;
  ramo: Ramo;
  /** Idratazione in punti percentuali. */
  idratazione: number;
  /** Sale in percentuale sulla farina. */
  sale: number;
  /** Olio in percentuale sulla farina. */
  olio: number;
  tipo: TipoLievito;
  /** Legge da usare, quando il motore attivo non è quella storica. */
  rami?: Record<Ramo, RamoDose>;
}

/**
 * Dice se la dose mostrata è quella del modello o un limite. I limiti sono un
 * parametro perché i due motori ne hanno di diversi: il nuovo 0,015–3%, il
 * vecchio 0,01–8%. Il confronto è sulla dose non arrotondata.
 */
export function limiteDose(
  percentualeFresco: number,
  limiti: { min: number; max: number } = LIMITI_LIEVITO,
): LimiteDose {
  if (percentualeFresco <= limiti.min + 1e-9) return 'minimo';
  if (percentualeFresco >= limiti.max - 1e-9) return 'massimo';
  return null;
}

/**
 * La legge del modello **Termico**, tarata sui 193 impasti diretti raccolti da
 * ricette italiane.
 *
 * Un solo esponente per i tre stili, 1,4: è quello che le fonti implicano fra
 * le 8 e le 24 ore, dove le ancore sono solide. Con un esponente libero per
 * ramo il corpus andava a inseguire il rumore dei tempi lunghi (1,2 g/kg a 48
 * ore, cioè un impasto morto). Lo stile sposta il livello della curva, non la
 * sua forma.
 *
 * Il livello viene dal risultato reale del motore sulle 193 ricette: con
 * questi tre numeri la mediana dello scarto è 1,00 su tutti e tre gli stili e
 * il 33% delle ricette cade entro il ±30% (era il 25% con la legge storica).
 */
export const RAMI_TERMICO: Record<Ramo, RamoDose> = {
  verace: {
    coefficiente: 5.87,
    esponente: 1.4,
    idratazione: { riferimento: 62, esponente: -1.2 },
  },
  contemporanea: {
    coefficiente: 9.69,
    esponente: 1.4,
    idratazione: { riferimento: 62, esponente: -0.3 },
  },
  teglia: {
    coefficiente: 18.17,
    esponente: 1.4,
    idratazione: { riferimento: 62, esponente: -1.2 },
  },
};

/**
 * Percentuale di lievito sulla farina, già convertita nel tipo scelto.
 * Il minimo di 0,5 ore evita che tempi quasi nulli mandino la dose a infinito:
 * sotto mezz'ora il conto non ha comunque senso.
 */
export function percentualeLievito(parametri: ParametriLievito): number {
  const ramo = (parametri.rami ?? RAMI)[parametri.ramo];
  const ore = Math.max(parametri.oreEquivalenti, 0.5);

  const idratazione = Math.min(
    LIMITI_INGREDIENTI.idratazione.max,
    Math.max(LIMITI_INGREDIENTI.idratazione.min, parametri.idratazione),
  );
  const acqua = Math.pow(
    idratazione / ramo.idratazione.riferimento,
    ramo.idratazione.esponente,
  );

  // Più condimento rallenta la fermentazione, quindi alza la dose: il fattore
  // di velocità va al denominatore.
  const rallentamento = fattoreSale(parametri.sale) * fattoreOlio(parametri.olio);

  const percentuale =
    ((ramo.coefficiente * Math.pow(ore, -ramo.esponente) * acqua) / rallentamento) *
    FATTORI_LIEVITO[parametri.tipo];

  return Math.min(
    LIMITI_LIEVITO.max,
    Math.max(LIMITI_LIEVITO.min, percentuale),
  );
}

/** Percentuale di lievito fresco, indipendente dal tipo scelto. */
export function percentualeLievitoFresco(parametri: Omit<ParametriLievito, 'tipo'>): number {
  return percentualeLievito({ ...parametri, tipo: 'fresco' });
}

/**
 * W richiesto dall'impasto di riferimento (62% di idratazione, 2,5% di sale,
 * nessun olio), senza arrotondamenti né tagli: è il mattone su cui si
 * costruiscono `forzaConsigliata`, `forzaImpasto` e la loro inversa.
 */
function forzaGrezza(oreEquivalenti: number, oreFrigo: number): number {
  // Mezz'ora è il limite inferiore: sotto, il logaritmo non descrive più nulla
  // e il W scenderebbe sotto qualunque farina in commercio.
  const ore = Math.max(oreEquivalenti, 0.5);
  const struttura = ore + FORZA.frigoStruttura * Math.max(oreFrigo, 0);
  return FORZA.base + FORZA.pendenza * Math.log(struttura);
}

function entroDominio(valore: number): number {
  return Math.min(FORZA.tetto, Math.max(FORZA.minimo, Math.round(valore)));
}

/** Forza della farina che serve per questa maturazione, in gradi W. */
export function forzaConsigliata(oreEquivalenti: number, oreFrigo = 0): number {
  return entroDominio(forzaGrezza(oreEquivalenti, oreFrigo));
}

/**
 * Correzione degli ingredienti sulla forza richiesta, in gradi W. Additiva e
 * non moltiplicativa: l'acqua non cambia di una percentuale fissa la forza che
 * serve, cambia quanti gradi di tenuta servono per sostenerla.
 */
export function correzioneIngredienti(ingredienti: IngredientiForza): number {
  const idro = Math.min(
    LIMITI_INGREDIENTI.idratazione.max,
    Math.max(LIMITI_INGREDIENTI.idratazione.min, ingredienti.idratazione),
  );
  const sale = Math.min(
    LIMITI_INGREDIENTI.sale.max,
    Math.max(LIMITI_INGREDIENTI.sale.min, ingredienti.sale),
  );
  const olio = Math.min(
    LIMITI_INGREDIENTI.olio.max,
    Math.max(LIMITI_INGREDIENTI.olio.min, ingredienti.olio),
  );

  return (
    FORZA.idratazione.pendenza * (idro - FORZA.idratazione.riferimento) +
    FORZA.sale.pendenza * (sale - FORZA.sale.riferimento) +
    FORZA.olio.pendenza * (olio - FORZA.olio.riferimento)
  );
}

/**
 * Forza che serve a *questo* impasto, non a «un» impasto.
 *
 * La retta di base è misurata sull'impasto di riferimento della campagna
 * (62% di idratazione, 2,5% di sale, niente olio né malto): quegli ingredienti
 * non entrano nelle ore equivalenti, ma cambiano quanto la maglia regge. La
 * correzione è un moltiplicatore su quella retta, costruito in `calcolo.ts`
 * dove vivono gli ingredienti. Il tetto si applica alla fine, perché chiedere
 * una farina più forte del massimo che il modello ammette non aiuta.
 */
export function forzaImpasto(
  oreEquivalenti: number,
  oreFrigo = 0,
  correzione = 1,
  ingredienti?: IngredientiForza,
): number {
  const base =
    forzaGrezza(oreEquivalenti, oreFrigo) +
    (ingredienti ? correzioneIngredienti(ingredienti) : 0);

  return Math.min(FORZA.tetto, Math.max(0, Math.round(base * correzione)));
}

/**
 * Inversa della retta della forza: quante ore equivalenti regge un dato W.
 * Con W 302 la maturazione arriva a 24 ore, con W 200 a 6,4.
 *
 * È l'inversa a zero ore di frigorifero: quando l'impasto ne ha, la stessa
 * farina regge meno ore equivalenti (il termine del frigo si mangia parte del
 * margine). Restituisce un numero di ore equivalenti, non totali.
 */
export function oreMassimePerForza(w: number): number {
  // Inversa a zero ore di frigo: h = e^((W − base) / pendenza).
  return Math.max(0, Math.exp((w - FORZA.base) / FORZA.pendenza));
}
