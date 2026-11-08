/** Modalità di avvio del calcolo. */
export type ModalitaCalcolo = 'panetti' | 'farina' | 'teglie' | 'prodotti';

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
  | 'miele'
  | 'zucchero';

/** Attesa e temperature con cui il motore calcola la biga. */
export interface RichiestaBiga {
  /** Temperatura dell'ambiente, in °C. */
  temperatura: number;
  /**
   * Tempo fra l'impasto e la biga pronta, in ore. Quando ci sono gli orari si
   * ricava da quelli: resta come ripiego per gli stati salvati senza orari.
   */
  ore: number;
  /** Temperatura del frigorifero, in °C. */
  temperaturaFrigo: number;
  /** Giorno e ora in cui si impasta la biga, «YYYY-MM-DDTHH:MM». */
  oraImpasto?: string;
  /** Giorno e ora in cui la biga deve essere pronta, «YYYY-MM-DDTHH:MM». */
  oraPronta?: string;
}

/** Esito del motore della biga: idratazione, attesa e consigli. */
export interface PianoBiga {
  temperatura: number;
  temperaturaFrigo: number;
  oreTotali: number;
  /** Le ore in ambiente. */
  oreAmbiente: number;
  /** Le ore in frigorifero: zero quando l'attesa sta tutta in ambiente. */
  oreFrigo: number;
  /** Ambiente + frigo convertito in ore di ambiente. */
  equivalente: number;
  /** Idratazione della biga scelta dal motore, in %. */
  idratazione: number;
  stato: 'ok' | 'senza-tempo' | 'troppo-corto' | 'troppo-lungo' | 'oltre-modello';
  /** Consiglio quando l'attesa non sta nella finestra. */
  consiglio?: string;
  /** Avviso quando parte dell'attesa la fa il frigo. */
  avviso?: string;
}

export interface OpzioniRicetta {
  tipoLievito: TipoLievito;
  /** Autolisi attiva; nelle ricette che la prevedono sempre è sempre true. */
  autolisi: boolean;
  /** Solo nelle ricette con biga: attesa e temperature del motore. */
  biga?: RichiestaBiga;
}

/** Percentuali personalizzabili, espresse in punti percentuali (80 = 80%). */
export interface ParametriRicetta {
  idratazioneTotale: number;
  /** Quota della farina totale destinata alla biga, 0 nelle ricette dirette. */
  percentualeBiga: number;
  idratazioneAutolisi: number;
  percentualeMalto: number;
  percentualeMiele: number;
  percentualeSale: number;
  percentualeOlio: number;
  /** Dose del tipo di lievito selezionato, sulla farina totale. */
  lievito: number;
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
  /** Paragrafi che completano il valore, per le indicazioni articolate. */
  paragrafi?: readonly string[];
  /** Elenco puntato che chiude l'indicazione. */
  elenco?: readonly string[];
}

export interface PassoProcedimento {
  titolo: string;
  paragrafi: string[];
  elenco?: string[];
  /**
   * Sotto-voci del passo, mostrate come elenco puntato rientrato senza
   * numerazione (per esempio i formati dell'Impasto Tuttofare). Ognuna compare
   * solo se la propria condizione è vera.
   */
  voci?: PassoProcedimento[];
  /**
   * Il passo compare solo nella variante indicata: autolisi attiva, autolisi
   * assente con farina del rinfresco, biga al 100% senza farina residua,
   * oppure prodotto selezionato nel calcolatore misto.
   */
  condizione?:
    | 'autolisi'
    | 'senzaAutolisi'
    | 'senzaFarinaRinfresco'
    | `prodotto-${string}`;
}

/**
 * Parametro dimensionale del formato: il diametro della teglietta delle focacce
 * o i lati dello stampo dei bauletti. Il peso del pezzo si ricalcola dalla
 * superficie, restando poi modificabile a mano.
 */
export interface DimensioneProdotto {
  /** Un solo valore (diametro) oppure i due lati dello stampo. */
  tipo: 'diametro' | 'stampo';
  /** Etichetta del campo: «Diametro» oppure «Stampo». */
  etichetta: string;
  /** Misure di riferimento, in centimetri. */
  baseA: number;
  baseB?: number;
  /** Peso corrispondente alle misure di riferimento, in grammi. */
  pesoBaseG: number;
  /** Passo dei tasti − e +. */
  incremento: number;
  /** Limiti dei campi, in centimetri. */
  min: number;
  max: number;
  unita: string;
}

/** Un formato del calcolatore misto (focacce, pizzette, panini, bauletti). */
export interface ProdottoConfig {
  id: string;
  /** Nome del formato al plurale, usato come titolo della riga. */
  nome: string;
  /** Nome al singolare, per le frasi con un solo pezzo. */
  singolare: string;
  plurale: string;
  /** Peso di riferimento di un pezzo, in grammi. */
  pesoBaseG: number;
  /** Riferimento descrittivo del formato. */
  nota: string;
  /** Diametro o stampo, quando il formato ne prevede uno. */
  dimensione?: DimensioneProdotto;
}

/** Formato effettivamente calcolato, con quantità e subtotale. */
export interface ProdottoScelto {
  id: string;
  nome: string;
  quantita: number;
  pesoG: number;
  subtotaleG: number;
  /** Impasto che avanza dopo i pezzi interi della pezzatura di riferimento. */
  residuoG?: number;
}

export interface RicettaConfig {
  id: string;
  /** Base per i nomi file, senza caratteri problematici. */
  slug: string;
  nome: string;
  descrizione: string;
  /** Riga compatta mostrata nella scheda «Ricetta selezionata». */
  sottotitolo?: string;
  /** Dicitura della farina nella scheda, quando differisce da quella degli export. */
  farinaScheda?: string;
  /** Nota della scheda quando il testo richiesto è più breve di quello del calcolo. */
  notaScheda?: string;
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
  /** Zucchero sulla farina totale, solo per gli impasti diretti che lo prevedono. */
  percentualeZucchero?: number;

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
  /**
   * Attesa e temperature di partenza del motore della biga: l'idratazione
   * della biga non è più un valore fisso, la decide il motore da queste.
   */
  motoreBiga?: RichiestaBiga;
  temperaturaConservazioneBiga?: number | null;
  temperaturaChiusuraBiga?: number | null;

  /** Ricetta diretta: dose di riferimento della teglia 30 × 40 cm. */
  farinaBaseG?: number;
  tegliaRiferimento?: { latoA: number; latoB: number };
  /**
   * Impasto di riferimento della teglia base, per le ricette che non partono
   * da una dose fissa di farina (per esempio quelle con biga).
   */
  pesoImpastoTegliaG?: number;

  /** Testi editoriali usati dalla scheda e dal PDF. */
  tempiETemperature: readonly VoceConfig[];
  procedimento: readonly PassoProcedimento[];
  note: readonly string[];
  /** Note operative essenziali mostrate subito dopo gli ingredienti. */
  noteEssenziali?: readonly string[];
  /** Nasconde i chiarimenti dei parametri nella scheda risultato. */
  senzaChiarimenti?: boolean;
  /** Ricetta senza percentuali modificabili: niente pannello di personalizzazione. */
  senzaPersonalizzazione?: boolean;
  /** Formati del calcolatore misto, nell'ordine in cui mostrarli. */
  prodotti?: readonly ProdottoConfig[];
  tips: readonly string[];
  /** Consigli mostrati solo se è stato scelto il formato indicato. */
  tipsProdotti?: readonly { condizione: `prodotto-${string}`; testo: string }[];
}

export interface IngredienteCalcolato {
  chiave: string;
  etichetta: string;
  grammi: number;
  tipo: TipoIngrediente;
  faseId: string;
  /** Rapporto esatto dell'ingrediente e base editoriale della percentuale. */
  percentuale?: number;
  basePercentuale?: 'farina totale' | 'farina della biga' | 'farina dell’autolisi';
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
  /** Formati scelti nel calcolatore misto, con i loro subtotali. */
  prodotti?: readonly ProdottoScelto[];
}

/** Risultato completo, condiviso da schermo, JPG e PDF. */
export interface RisultatoCalcolo {
  ricettaId: string;
  famiglia: FamigliaRicetta;
  /** Configurazione effettivamente usata: anteprima ed esportazioni la seguono. */
  config: RicettaConfig;
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

  /** Solo modalità per prodotti: formati calcolati e peso complessivo. */
  prodotti?: ProdottoScelto[] | null;
  pesoProdottiG?: number | null;

  /** Totali di fase utili a note e PDF, mai sommati di nuovo. */
  pesoBigaG?: number;
  pesoAutolisiG?: number;
  /** Acqua dell'ultima fase (rinfresco o impastamento finale). */
  acquaFinaleG?: number;
  /** Piano della biga usato: c'è solo nelle ricette con biga. */
  pianoBiga?: PianoBiga;
}

/**
 * Riga del calcolatore misto come stringhe, durante la digitazione: quantità,
 * peso del pezzo e, per i formati che lo prevedono, diametro o stampo.
 */
export interface RigaProdottoGrezza {
  quantita: string;
  peso: string;
  /** Diametro della teglietta o primo lato dello stampo, in centimetri. */
  dimA?: string;
  /** Secondo lato dello stampo, solo per i formati rettangolari. */
  dimB?: string;
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
  /** Righe del calcolatore misto, per id del formato. */
  prodotti: Record<string, RigaProdottoGrezza>;
}

export type ChiaveErrore =
  | 'numeroPanetti'
  | 'pesoPanetto'
  | 'farinaKg'
  | 'latoA'
  | 'latoB'
  | 'numeroTeglie'
  | 'prodotti'
  | `prodotto-${string}`;

export type ErroriCampi = Partial<Record<ChiaveErrore, string>>;

export interface StatoRicetta {
  modalita: ModalitaCalcolo;
  opzioni: OpzioniRicetta;
  valori: ValoriGrezzi;
  validi: ValoriGrezzi;
  /** Percentuali personalizzate della ricetta, separate da quelle delle altre. */
  parametri: ParametriRicetta;
}

export interface StatoSalvato {
  ricettaId: string;
  ricette: Record<string, StatoRicetta>;
}
