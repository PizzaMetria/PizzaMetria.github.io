import type { RisultatoMiniRicetta } from './lib/miniricette';

/** I tre impasti diretti previsti dal calcolatore libero. */
export type TipoImpasto = 'verace' | 'contemporanea' | 'teglia';

/**
 * Ramo di calibrazione della dose di lievito: uno per ricetta.
 *
 * Verace e contemporanea non condividono più i coefficienti: la seconda nasce
 * al 75% di idratazione, con panetti più grandi e spesso con il frigorifero,
 * e un solo ramo per le due tonde costringeva l'esponente dell'idratazione a
 * fare da surrogato della ricetta.
 */
export type Ramo = 'verace' | 'contemporanea' | 'teglia';

/** Lievito con cui si vuole leggere la dose. */
export type TipoLievito = 'fresco' | 'secco';

/** Punto di partenza della pizza tonda: panetti già decisi oppure farina. */
export type ModalitaTonda = 'panetti' | 'farina';

/** Forma della teglia. */
export type FormaTeglia = 'rettangolare' | 'tonda';

/**
 * Quando si formano i panetti rispetto al frigorifero: prima del frigo, o dopo
 * (massa unica in frigo e panetti per l'appretto).
 */
export type Staglio = 'prima' | 'dopo';

/**
 * Quale modello di calcolo si sta leggendo: il modello a 12 mini-ricette (il
 * predefinito), il Termico (inerzia termica più orologio del lievito e la legge
 * dei 193 impasti), quello a inerzia termica storica oppure la sua emulazione
 * del calcolatore precedente.
 */
export type Modello = 'miniRicette' | 'termico' | 'nuovo' | 'vecchio';

/** Le due letture dello stesso impasto, per la card di confronto. */
export interface ConfrontoModelli {
  oreEquivalentiNuovo: number;
  oreEquivalentiVecchio: number;
  lievitoNuovoG: number;
  lievitoVecchioG: number;
  forzaNuovo: number;
  forzaVecchio: number;
  /** W del modello a 12 mini-ricette per lo stesso impasto. */
  forzaMini: number;
  /** Ore equivalenti del modello Termico: profilo termico più orologio del lievito. */
  oreEquivalentiTermico: number;
  /** La sua dose, nel lievito scelto qui sopra. */
  lievitoTermicoG: number;
  /** W del modello Termico: la legge dell'inerzia, invariata. */
  forzaTermico: number;
  /** La sua dose, nel lievito scelto qui sopra. */
  lievitoMiniG: number;
}

/** Spessore dell'impasto in teglia, espresso in grammi per cm². */
export type SpessoreTeglia = 'bassa' | 'media' | 'alta' | 'personalizzata';

/** Come si dichiarano sale e olio: sulla farina oppure per litro d'acqua. */
export type UnitaCondimenti = 'farina' | 'litro';

/** Giudizio sulla forza del mix rispetto a quella consigliata. */
export type GiudizioForza = 'ottima' | 'accettabile' | 'distante';

/** Una farina del mix: quota sul totale e forza dichiarata. */
export interface Farina {
  /** Quota sul peso totale delle farine, in punti percentuali. */
  quota: number;
  /** Forza dichiarata in gradi W, null se non la conosce. */
  w: number | null;
}

/** Segmenti di lievitazione: a temperatura ambiente prima e dopo il frigo. */
export interface ParametriTempo {
  /** Durata totale fra impastamento e infornata, in ore. */
  oreTotali: number;
  /** Ore in frigorifero. */
  oreFrigo: number;
  /** Ore a temperatura ambiente prima del frigorifero (puntata). */
  oreTaPrima: number;
  /** Ore a temperatura ambiente dopo il frigorifero (appretto). */
  oreTaDopo: number;
  /** Temperatura ambiente, in °C. */
  ta: number;
  /** Temperatura del frigorifero, in °C. */
  tc: number;
}

/** Descrizione di un impasto: valori di partenza e comportamento del lievito. */
export interface ConfigImpasto {
  id: TipoImpasto;
  nome: string;
  nomeBreve: string;
  sottotitolo: string;
  /** Idratazione di partenza, in punti percentuali. */
  idratazione: number;
  /** Sale di partenza, sulla farina. */
  sale: number;
  /** Olio di partenza, sulla farina. */
  olio: number;
  /** Malto di partenza, sulla farina (0 = escluso). */
  malto: number;
  /** Ramo da usare per la dose di lievito. */
  ramo: Ramo;
  /** Panetto proposto per questo impasto, in grammi. */
  pesoPanetto?: number;
  /** Formati disponibili: la teglia non usa panetti. */
  tonda: boolean;
}

/** Voce della tabella degli spessori. */
export interface ConfigSpessore {
  id: SpessoreTeglia;
  nome: string;
  nota: string;
  grammiPerCm2: number;
}

/** Tutto ciò che serve al calcolo, già numerico e validato. */
export interface InputCalcolo {
  tipo: TipoImpasto;
  ramo: Ramo;
  idratazione: number;
  /** Sale in percentuale sulla farina. */
  sale: number;
  /** Olio in percentuale sulla farina. */
  olio: number;
  malto: number;
  tipoLievito: TipoLievito;
  /** Farine del mix: la somma delle quote fa 100. */
  farine: Farina[];
  /** Pizza tonda. */
  modalita: ModalitaTonda;
  numeroPanetti: number | null;
  pesoPanettoG: number | null;
  farinaG: number | null;
  /** Pizza in teglia. */
  formaTeglia: FormaTeglia;
  latoA: number;
  latoB: number;
  diametro: number;
  numeroTeglie: number;
  grammiPerCm2: number;
  /** Tempi e temperature. */
  tempi: ParametriTempo;
  /** Panetti formati prima del frigo o massa unica. */
  staglio: Staglio;
  /**
   * Modello di calcolo da usare: il predefinito è quello a 12 mini-ricette;
   * senza campo si legge con l'inerzia termica, come nelle prove di confronto.
   */
  modello?: Modello;
  /** Temperatura dell'impasto a fine lavorazione, in °C. */
  temperaturaImpasto: number;
  /** Temperatura della farina, in °C. */
  temperaturaFarina: number;
  /** Riscaldamento dovuto all'impastatrice, in °C. */
  riscaldamento: number;
  /** Correzione manuale della dose di lievito, in punti percentuali. */
  correzioneLievito: number;
}

/** Passo della tabella di marcia. */
export interface PassoTempo {
  temperaturaChiusura?: number;
  quando: Date;
  titolo: string;
  nota: string;
}

/** Punto del grafico: temperatura dell'impasto e ritmo del lievito. */
export interface PuntoCurva {
  ora: number;
  /** Temperatura dell'impasto, non dell'ambiente. */
  temperatura: number;
  /** Quante ore equivalenti matura l'impasto in quest'ora. */
  attivita: number;
}

/** Tratto del grafico che appartiene alla stessa fase. */
export interface FasciaCurva {
  da: number;
  a: number;
  nome: string;
  inFrigo: boolean;
}

/** Esito completo del calcolo. */
export interface RisultatoCalcolo {
  farinaG: number;
  acquaG: number;
  saleG: number;
  olioG: number;
  maltoG: number;
  lievitoG: number;
  /** La stessa dose espressa in lievito fresco, per confronto. */
  lievitoFrescoG: number;
  pesoImpastoG: number;
  /** Panetti oppure teglie. */
  numeroPezzi: number;
  pesoPerPezzoG: number;
  /** Impasto che avanza nella modalità "parti dalla farina". */
  residuoG: number | null;
  percentualeLievito: number;
  /** Modello con cui è stato letto questo risultato. */
  modello: Modello;
  /** Stile scelto: serve alle forchette di dose, che cambiano per stile. */
  ramo: Ramo;
  /** Gli stessi numeri calcolati con entrambi i modelli. */
  confronto: ConfrontoModelli;
  oreEquivalenti: number;
  /** Ore equivalenti se l'impasto saltasse subito alla temperatura ambiente. */
  oreEquivalentiSenzaInerzia: number;
  /** Costante di tempo del pezzo che va in frigorifero, in ore. */
  costanteTempoOre: number;
  /** Temperatura dell'impasto all'uscita dal frigo, null senza frigo. */
  temperaturaUscitaFrigo: number | null;
  /** Ore equivalenti maturate in frigorifero. */
  oreEquivalentiInFrigo: number;
  /** Area di una singola teglia, in cm². */
  areaTegliaCm2: number;
  /** W consigliato per questa maturazione. */
  forzaConsigliata: number;
  /** W del mix, null se nessuna farina ha il W dichiarato. */
  wEquivalente: number | null;
  /**
   * C'è una farina con la quota ma senza W: il W del mix non si calcola, come
   * se i campi fossero vuoti. Serve a dire il perché, invece di sembrare
   * un'omissione dell'utente.
   */
  wIncompleto: boolean;
  giudizioForza: GiudizioForza | null;
  /** W del mix corretto per l'eterogeneità delle farine. */
  wEfficace: number | null;
  /** Fascia tollerata (0,85–1,25 del W consigliato): la finestra dichiarata. */
  forzaMinima: number;
  forzaMassima: number;
  /** Zona consigliata (0,90–1,15 del W consigliato). */
  zonaMinima: number;
  zonaMassima: number;
  /**
   * Inversione algebrica della retta del W a zero ore di frigo: non è una
   * durata della farina e non viene usata nei consigli.
   */
  oreMassime: number | null;
  /** Limite del modello che ha effettivamente fermato la dose, se è scattato. */
  limiteLievito: 'minimo' | 'massimo' | null;
  /** Come correggere il mix, quando serve. */
  suggerimentoForza: string | null;
  passi: PassoTempo[];
  /** Temperatura dell'acqua per chiudere l'impasto alla temperatura voluta. */
  temperaturaAcqua: number;
  /** Grammi per kg di farina del lievito scelto (secco o fresco). */
  lievitoPerKgFarina: number;
  /** Gli stessi grammi espressi in equivalente fresco. */
  lievitoPerKgFarinaFresco: number;
  curva: PuntoCurva[];
  fasce: FasciaCurva[];
  /**
   * Lettura dello stesso impasto con il modello a 12 mini-ricette: quale
   * mini-ricetta, i due indici, il W e la dose con la loro fascia. È un
   * secondo parere accanto al motore scelto, non lo sostituisce.
   */
  miniRicetta: RisultatoMiniRicetta;
  /** Segnalazioni da leggere prima di impastare. */
  avvisi: string[];
}
