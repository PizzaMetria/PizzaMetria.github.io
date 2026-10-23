/** Modalità di avvio del calcolo. */
export type ModalitaCalcolo = 'panetti' | 'farina' | 'teglie';

/** Tipo di file esportabile. */
export type TipoEsportazione = 'jpg' | 'pdf';

/** Famiglia di impasto: determina formule e struttura delle fasi. */
export type FamigliaRicetta = 'biga-rinfresco' | 'diretto' | 'biga-autolisi';

/** Lievito scelto dall'utente in fase di configurazione della ricetta. */
export type TipoLievito = 'fresco' | 'secco';

/** Categoria dell'ingrediente: definisce l'arrotondamento delle dosi. */
export type TipoIngrediente =
  | 'farina'
  | 'acqua'
  | 'lievito'
  | 'malto'
  | 'sale'
  | 'olio'
  | 'miele';

export interface OpzioniRicetta {
  tipoLievito: TipoLievito;
  /** Autolisi attiva; nelle ricette che la prevedono sempre è sempre true. */
  autolisi: boolean;
}

export interface FaseConfig {
  id: string;
  titolo: string;
  /** Etichetta breve mostrata accanto al titolo. */
  nota?: string;
  /** Indicazione evidenziata sopra le dosi della fase. */
  avviso?: string;
}

export interface VoceConfig {
  etichetta: string;
  valore: string;
}

export interface PassoProcedimento {
  titolo: string;
  paragrafi: string[];
  elenco?: string[];
  /** Il passo compare solo con l'autolisi attiva o solo quando è assente. */
  condizione?: 'autolisi' | 'senzaAutolisi';
}

export interface RicettaConfig {
  id: string;
  /** Base per i nomi file, senza caratteri problematici. */
  slug: string;
  nome: string;
  descrizione: string;
  famiglia: FamigliaRicetta;
  /** Modalità disponibili, nell'ordine in cui mostrarle. */
  modalita: readonly ModalitaCalcolo[];
  fasi: readonly FaseConfig[];

  /** Idratazione complessiva: acqua totale / farina totale. */
  idratazioneTotale: number;
  /** Frazioni sulla farina totale. */
  percentualeOlio: number;
  percentualeSale: number;
  /** Frazione della farina della biga, o della farina totale se la ricetta è diretta. */
  percentualeMalto?: number;
  percentualeMiele?: number;

  /** Frazione della farina totale usata nella biga. */
  quotaFarinaBiga?: number;
  /** Acqua / farina della biga. */
  idratazioneBiga?: number;
  /** Acqua / farina della fase di autolisi. */
  idratazioneAutolisi?: number;
  /** Lievito fresco / farina della biga. */
  lievitoFrescoSuFarinaBiga?: number;
  /** Lievito fresco / farina totale per gli impasti diretti. */
  lievitoFrescoSuFarina?: number;
  /** Fattore applicato al lievito fresco per ottenere il lievito secco. */
  fattoreLievitoSecco: number;
  /** L'autolisi si può attivare o disattivare; altrove è inclusa o assente. */
  autolisiOpzionale?: boolean;

  /** Nome dell'ingrediente farina e descrizione estesa per la scheda. */
  farinaEtichetta: string;
  farinaDescrizione: string;

  oreBiga?: number | null;
  temperaturaConservazioneBiga?: number | null;
  temperaturaChiusuraBiga?: number | null;

  /** Ricetta diretta: dose di riferimento della teglia 30 × 40 cm. */
  farinaBaseG?: number;
  tegliaRiferimento?: { latoA: number; latoB: number };

  /** Testi editoriali usati dalla scheda e dal PDF. */
  tempiETemperature: readonly VoceConfig[];
  procedimento: readonly PassoProcedimento[];
  note: readonly string[];
  /** Note operative essenziali mostrate subito dopo gli ingredienti. */
  noteEssenziali?: readonly string[];
  tips: readonly string[];
  condimentiFacoltativi?: readonly string[];
}

export interface IngredienteCalcolato {
  chiave: string;
  etichetta: string;
  grammi: number;
  tipo: TipoIngrediente;
  faseId: string;
}

export interface FaseCalcolata {
  id: string;
  titolo: string;
  nota?: string;
  avviso?: string;
  voci: IngredienteCalcolato[];
  /** Totale della fase, es. biga pronta. Non va sommato di nuovo all'impasto. */
  totale?: { etichetta: string; grammi: number };
}

export interface DatiTeglie {
  latoA: number;
  latoB: number;
  numeroTeglie: number;
  areaCm2: number;
  areaRiferimentoCm2: number;
}

export interface StimaTeglie {
  latoA: number;
  latoB: number;
  intere: number;
  residuoG: number;
  pesoPerTegliaG: number;
}

export interface DatiPartenza {
  modalita: ModalitaCalcolo;
  numeroPanetti?: number;
  pesoPanettoG?: number | null;
  farinaKg?: number;
  latoA?: number;
  latoB?: number;
  numeroTeglie?: number;
  stimaTeglia?: { latoA: number; latoB: number } | null;
}

/** Risultato completo, condiviso da schermo, JPG e PDF. */
export interface RisultatoCalcolo {
  ricettaId: string;
  famiglia: FamigliaRicetta;
  modalita: ModalitaCalcolo;
  datiPartenza: DatiPartenza;
  fasi: FaseCalcolata[];
  ingredienti: IngredienteCalcolato[];

  farinaTotaleG: number;
  acquaTotaleG: number;
  pesoImpastoG: number;
  /** Peso dell'impasto per 1 g di farina totale. */
  fattorePeso: number;

  numeroPanetti: number | null;
  pesoPanettoG: number | null;
  /** Solo modalità per farina con peso panetto indicato. */
  panettiInteri: number | null;
  /** Solo modalità per farina con peso panetto indicato. */
  residuoG: number | null;

  teglie: DatiTeglie | null;
  pesoPerTegliaG: number | null;
  stimaTeglie: StimaTeglie | null;

  /** Totali di fase utili a note e PDF, mai sommati di nuovo. */
  pesoBigaG?: number;
  pesoAutolisiG?: number;
  /** Acqua dell'ultima fase (rinfresco o impastamento finale). */
  acquaFinaleG?: number;
}

/** Valori grezzi dei campi, gestiti come stringhe durante la digitazione. */
export interface ValoriGrezzi {
  panetti: {
    numeroPanetti: string;
    pesoPanetto: string;
  };
  farina: {
    farinaKg: string;
    pesoPanetto: string;
    /** Stima facoltativa delle teglie, solo per il Trancio Milanese. */
    latoA: string;
    latoB: string;
  };
  teglie: {
    latoA: string;
    latoB: string;
    numeroTeglie: string;
  };
}

export type ChiaveErrore =
  | 'numeroPanetti'
  | 'pesoPanetto'
  | 'farinaKg'
  | 'latoA'
  | 'latoB'
  | 'numeroTeglie';

export type ErroriCampi = Partial<Record<ChiaveErrore, string>>;

export interface StatoRicetta {
  modalita: ModalitaCalcolo;
  opzioni: OpzioniRicetta;
  valori: ValoriGrezzi;
  validi: ValoriGrezzi;
}

export interface StatoSalvato {
  ricettaId: string;
  ricette: Record<string, StatoRicetta>;
}
