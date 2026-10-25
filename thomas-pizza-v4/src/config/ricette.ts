import type {
  OpzioniRicetta,
  RicettaConfig,
  TipoLievito,
} from '../types';

/**
 * Le percentuali sono frazioni: 0.85 = 85% della farina totale.
 * Il lievito è riferito alla farina della biga o alla farina totale a seconda
 * della famiglia. Il lievito secco si ricava internamente dal lievito fresco.
 * Il malto delle ricette con biga è riferito alla farina della biga, quello
 * degli impasti diretti alla farina totale.
 */

/**
 * Consiglio condiviso dalle due ricette con biga: è un testo unico, così home
 * e PDF restano allineati senza duplicazioni.
 */
export const TIP_AUTOLISI =
  'L’autolisi è opzionale e la sua durata può essere adattata alla farina e al risultato desiderato: può essere preparata mezz’ora prima del rinfresco oppure, con farine più forti, anche la sera precedente, per smorzarne la tenacità e favorire l’estensibilità dell’impasto. Se attivata, il calcolatore ripartisce automaticamente l’acqua totale tra biga, autolisi e impastamento finale. La ripartizione riguarda la sola acqua del rinfresco tra autolisi e impastamento finale; l’acqua della biga resta invariata.';

export const RICETTA_TEGLIA_BIGA: RicettaConfig = {
  id: 'pizza-teglia-biga-85',
  slug: 'pizza-teglia-biga',
  nome: 'Pizza in teglia con biga',
  descrizione:
    'Una base croccante e un interno leggero e arioso, con un’alveolatura aperta e irregolare.',
  famiglia: 'biga-rinfresco',
  modalita: ['teglie', 'panetti', 'farina'],
  fasi: [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: 'Da preparare',
      avviso: 'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C.',
    },
    {
      id: 'autolisi',
      titolo: 'Autolisi',
      nota: 'Facoltativa',
    },
    {
      id: 'rinfresco',
      titolo: 'Rinfresco',
      nota: 'Con la biga',
      avviso: 'Aggiungi tutta la biga preparata.',
    },
    {
      id: 'finale',
      titolo: 'Impastamento finale',
      nota: 'Biga + autolisi',
      avviso: 'Unisci tutta la biga e tutta l’autolisi.',
    },
  ],
  quotaFarinaBiga: 0.85,
  idratazioneBiga: 0.5,
  idratazioneAutolisi: 0.55,
  idratazioneTotale: 0.8,
  lievitoFrescoSuFarinaBiga: 0.01,
  percentualeOlio: 0.04,
  percentualeSale: 0.03,
  percentualeMalto: 0.02,
  fattoreLievitoSecco: 0.6,
  autolisiOpzionale: true,
  farinaEtichetta: 'Farina 00 forte',
  farinaDescrizione: '00 forte, W 300–320',
  oreBiga: 24,
  temperaturaConservazioneBiga: 4,
  temperaturaChiusuraBiga: 25,
  tegliaRiferimento: { latoA: 30, latoB: 40 },
  /** Un panetto da 710 g copre una teglia 30 × 40 cm. */
  pesoImpastoTegliaG: 710,
  tempiETemperature: [
    {
      etichetta: 'Biga',
      valore: 'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C',
    },
    {
      etichetta: 'Autolisi',
      valore: 'La sera prima, fino al momento dell’impastamento finale',
    },
    { etichetta: 'Teglia di riferimento', valore: '40 × 30 cm · 710 g di impasto' },
    {
      etichetta: 'Cottura',
      valore: 'Prima cottura — forno F1 P134H, pietra refrattaria',
      paragrafi: [
        'Preriscaldamento: preriscalda il forno a 300 °C con entrambe le resistenze.',
        'Prima fase: inforna la teglia con la resistenza superiore spenta e quella inferiore impostata a 270 °C. Cuoci per 5 minuti.',
        'Seconda fase: prosegui per altri 7 minuti, impostando la resistenza superiore a 250 °C per la pizza rossa oppure a 230 °C per la pizza bianca. Per quest’ultima, limita l’accensione della resistenza superiore a una sola volta.',
        'Sforna e fai raffreddare la base su una griglia.',
      ],
    },
  ],
  procedimento: [
    {
      titolo: 'Prepara la biga',
      paragrafi: [
        'Mescola la farina ({farinaBiga}), l’acqua ({acquaBiga}) e il lievito ({lievito}): il composto deve restare grezzo e uniforme, senza essere lavorato a lungo. La temperatura della biga a fine impasto deve essere circa 25 °C. Riponi la biga in un contenitore ermetico e trasferiscila in frigorifero a 4 °C per circa 24 ore.',
      ],
    },
    {
      titolo: 'Prepara l’autolisi',
      condizione: 'autolisi',
      paragrafi: [
        'Mescola la farina dell’autolisi ({farinaAutolisi}) con l’acqua destinata all’autolisi ({acquaAutolisi}) fino a ottenere un impasto grossolano.',
        'Copri bene il contenitore e lascialo riposare fino al momento dell’impastamento finale.',
      ],
    },
    {
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'senzaAutolisi',
      paragrafi: [
        'Unisci tutta la biga. Aggiungi la farina residua ({farinaRinfresco}), il malto e inizia ad impastare incorporando gradualmente l’acqua restante ({acquaRinfresco}), scegliendone la temperatura in base a quella dell’ambiente e degli ingredienti. Aggiungi il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben incordato (temperatura finale dell’impasto: circa 22–23 °C).'
      ],
    },
    {
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'autolisi',
      paragrafi: [
        'Unisci tutta la biga e tutta l’autolisi. Aggiungi il malto e inizia ad impastare incorporando gradualmente l’acqua restante ({acquaFinale}), scegliendone la temperatura in base a quella dell’ambiente e degli ingredienti. Aggiungi il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben incordato (temperatura finale dell’impasto: circa 22–23 °C).'
      ],
    },
    {
      titolo: 'Rigenero, pieghe e puntata in massa',
      paragrafi: [
        'A 10 minuti dalla chiusura dell’impasto, effettua un rigenero in impastatrice, esegui un giro di pieghe sul banco e trasferisci l’impasto in un contenitore oleato.',
        'Lascia riposare in massa al caldo (circa 25 °C) fino al raddoppio del volume (indicativamente circa 1 ora).',
      ],
    },
    {
      titolo: 'Staglio e formatura dei panetti',
      paragrafi: [
        '{formazionePanetti}',
        'Esegui una pre-formatura stendendo delicatamente l’impasto, applica 4+4 pieghe dal lato corto verso il centro, arrotola su se stesso per 3–4 volte e sovrapponi nel senso opposto, chiudendo bene la parte inferiore.',
        'Spolvera abbondantemente di semola rimacinata.',
      ],
    },
    {
      titolo: 'Seconda lievitazione (appretto)',
      paragrafi: [
        'Riponi i panetti in un contenitore oleato e lascia lievitare a circa 25 °C fino a triplicare il volume (indicativamente circa 3 ore).',
      ],
    },
    {
      titolo: 'Stesura e preparazione della teglia',
      paragrafi: [
        'Ungi la teglia e distribuisci delicatamente l’impasto fino a coprire uniformemente tutta la superficie.',
      ],
    },
    {
      titolo: 'Prima cottura — forno F1 P134H, pietra refrattaria',
      paragrafi: [
        'Preriscaldamento: preriscalda il forno a 300 °C con entrambe le resistenze.',
        'Prima fase: inforna la teglia con la resistenza superiore spenta e quella inferiore impostata a 270 °C. Cuoci per 5 minuti.',
        'Seconda fase: prosegui per altri 7 minuti, impostando la resistenza superiore a 250 °C per la pizza rossa oppure a 230 °C per la pizza bianca. Per quest’ultima, limita l’accensione della resistenza superiore a una sola volta.',
        'Sforna e fai raffreddare la base su una griglia.',
      ],
    },
    {
      titolo: 'Seconda cottura e farcitura',
      paragrafi: [
        'Preriscalda il forno di casa in modalità statica al massimo. Inforna la base a metà altezza sulla griglia per un paio di minuti, quindi condiscila e completa la cottura fino a quando i condimenti sono cotti e la mozzarella, se presente, è ben sciolta.',
      ],
    },
  ],
  note: [
    'Farina di riferimento: 00 forte, indicativamente W 300–320, adatta alle lunghe fermentazioni e all’alta idratazione.',
    'Il malto diastasico è il 2% della farina della biga ed è già compreso nelle dosi.',
    'L’acqua del rinfresco è compresa nell’acqua totale: non è un’aggiunta separata.',
  ],
  noteEssenziali: [],
  senzaNotaPeso: true,
  senzaChiarimenti: true,
  tips: [
    'Per una biga all’85% e un’idratazione totale dell’80% serve una farina forte, indicativamente W 300–320: deve reggere la lunga fermentazione e l’alta idratazione senza collassare.',
    'Usando un prefermento freddo nei periodi più freddi, l’impasto potrebbe chiudersi a una temperatura inferiore a 20 °C, rallentando la lievitazione: in questo caso, utilizza acqua tiepida o calda nel rinfresco per riportare la temperatura finale del mix in target (22–23 °C).',
    TIP_AUTOLISI,
    'Cottura nel forno F1 P134H — La camera bassa e la vicinanza della resistenza superiore possono far bruciare la superficie prima che la cottura sia completata. Gli accorgimenti indicati per entrambe le cotture servono a limitare il calore dall’alto e ottenere una cottura più equilibrata.',
  ],
};

export const RICETTA_TRANCIO: RicettaConfig = {
  id: 'trancio-milanese',
  slug: 'trancio-milanese',
  nome: 'Trancio Milanese',
  descrizione:
    'Alto e morbido, con una mollica dall’alveolatura più fitta e uniforme e un fondo dorato.',
  famiglia: 'diretto',
  modalita: ['teglie', 'farina', 'panetti'],
  fasi: [{ id: 'impasto', titolo: 'Impasto' }],
  idratazioneTotale: 0.6,
  lievitoFrescoSuFarina: 5.5 / 375,
  percentualeOlio: 22 / 375,
  percentualeSale: 8 / 375,
  /** Impasto diretto: il malto resta riferito alla farina totale. */
  percentualeMalto: 4 / 375,
  percentualeMiele: 10 / 375,
  fattoreLievitoSecco: 0.67,
  farinaEtichetta: 'Farina debole',
  farinaDescrizione: 'Farina debole, indicativamente W 150–180',
  farinaBaseG: 375,
  tegliaRiferimento: { latoA: 30, latoB: 40 },
  tempiETemperature: [
    {
      etichetta: 'Prima lievitazione',
      valore: 'Circa 1 ora; il volume quasi raddoppiato è il riferimento principale',
    },
    {
      etichetta: 'Appretto',
      valore: 'Circa 1 ora e mezza–2 ore, più almeno 30 minuti con la salsa',
    },
    {
      etichetta: 'Cottura',
      valore: 'Circa 10 minuti, rotazione e altri 2 minuti indicativi',
    },
    {
      etichetta: 'Temperature',
      valore:
        'Preriscaldo 300 °C sopra e sotto; cottura circa 250 °C sotto e 250–270 °C sopra',
    },
    {
      etichetta: 'Durata complessiva',
      valore: 'Variabile: la somma dei riposi indicati può superare le 3 ore',
    },
  ],
  procedimento: [
    {
      titolo: 'Impasto in spirale',
      paragrafi: [
        'Sciogli il lievito, il malto diastasico e il miele in {acquaImpastoIniziale} di acqua fredda. Versa il composto nell’impastatrice a spirale insieme alla farina e avvia la lavorazione.',
        'Quando l’impasto comincia a incordare, aggiungi il sale e incorpora l’olio in tre riprese. Infine, aggiungi i restanti {acquaImpastoFinale} di acqua molto lentamente.',
        'Terminata l’aggiunta dell’acqua, spegni la macchina e lascia riposare l’impasto per 10–15 minuti.',
      ],
    },
    {
      titolo: 'Pieghe e prima lievitazione',
      paragrafi: ['{pieghePrimaLievitazione}'],
    },
    {
      titolo: 'Stesura in teglia',
      paragrafi: ['{stesuraTeglie}'],
    },
    {
      titolo: 'Appretto e condimento',
      paragrafi: [
        'Dopo la stesura, lascia lievitare in teglia per circa 1 ora e mezza–2 ore.',
        'Distribuisci la salsa e lascia riposare l’impasto per almeno altri 30 minuti. Nel frattempo, preriscalda il forno.',
      ],
    },
    {
      titolo: 'Cottura nel forno F1 P134H',
      paragrafi: [
        'Preriscalda a 300 °C sopra e sotto; al momento di infornare imposta circa 250 °C sotto e 250–270 °C sopra.',
        'Cuoci per circa 10 minuti, controlla il fondo e la superficie, poi ruota la teglia di 180° e prosegui indicativamente per altri 2 minuti.',
      ],
    },
  ],
  note: [
    'Farina di riferimento: una farina debole, indicativamente W 150–180, adatta al trancio.',
    'La dose di riferimento è la teglia 30 × 40 cm con 375 g di farina; le dosi vengono scalate automaticamente.',
  ],
  noteEssenziali: [
    'Olio per ungere teglia e piano di lavoro: q.b., escluso dalle dosi.',
  ],
  senzaNotaPeso: true,
  tips: [
    'Per un impasto diretto al 60% di idratazione è adatta una farina debole, indicativamente W 150–180: garantisce morbidezza e non serve una farina forte.',
    'Con una farina debole, aggiungi l’ultima parte d’acqua molto lentamente, lasciando che venga assorbita prima di versarne altra. Se l’impasto perde forza, evita di insistere con lavorazioni prolungate: termina l’impastamento e lascialo riposare per 10–15 minuti.',
    'Se usi la mozzarella, aggiungila dopo i primi 10 minuti, quando ruoti la teglia, e prosegui la cottura per circa altri 2 minuti. Il salamino, se tagliato sottile, può essere aggiunto fin dall’inizio.',
    'Il lievito secco tende a partire più lentamente rispetto al lievito fresco: considera tempi di lievitazione più lunghi.',
  ],
};

export const RICETTA_CANOTTO: RicettaConfig = {
  id: 'pizza-contemporanea-canotto-77',
  slug: 'pizza-contemporanea-canotto',
  nome: 'Pizza contemporanea Canotto',
  descrizione:
    'Un cornicione alto, soffice e alveolato racchiude un centro sottile: una pizza che si riconosce dal suo bordo generoso.',
  famiglia: 'biga-autolisi',
  modalita: ['panetti', 'farina'],
  fasi: [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: 'Da preparare',
      avviso: 'Chiusura a 25 °C, poi 24 ore in frigorifero a 4 °C.',
    },
    {
      id: 'autolisi',
      titolo: 'Autolisi',
      nota: 'La sera prima',
    },
    {
      id: 'finale',
      titolo: 'Impastamento finale',
      nota: 'Biga + autolisi',
      avviso: 'Unisci tutta la biga e tutta l’autolisi.',
    },
  ],
  quotaFarinaBiga: 0.75,
  idratazioneBiga: 0.55,
  idratazioneAutolisi: 0.55,
  idratazioneTotale: 0.77,
  lievitoFrescoSuFarinaBiga: 0.01,
  percentualeOlio: 0.02,
  percentualeSale: 0.03,
  /** 2% della farina della biga, non della farina totale. */
  percentualeMalto: 0.02,
  fattoreLievitoSecco: 0.6,
  /** L'autolisi è consigliata ma si può disattivare. */
  autolisiOpzionale: true,
  farinaEtichetta: 'Farina 00 forte',
  farinaDescrizione: '00 forte, W 300–320',
  oreBiga: 24,
  temperaturaConservazioneBiga: 4,
  temperaturaChiusuraBiga: null,
  tempiETemperature: [
    {
      etichetta: 'Biga',
      valore: 'Chiusura a 25 °C, poi 24 ore a 4 °C',
    },
    {
      etichetta: 'Autolisi',
      valore: 'La sera prima, fino al momento dell’impastamento finale',
    },
    { etichetta: 'Puntata', valore: 'Poco meno di 30 minuti' },
    {
      etichetta: 'Panetti',
      valore: 'Circa 2 ore a temperatura ambiente, poi in frigorifero a 4 °C',
    },
    {
      etichetta: 'Prima della cottura',
      valore: 'Circa 30 minuti fuori dal frigorifero, da adattare',
    },
    {
      etichetta: 'Cottura pizza',
      valore:
        '400 °C cielo · 350 °C platea · circa 2 minuti + 30 secondi a bocca di forno',
    },
    {
      etichetta: 'Cottura basi',
      valore:
        '350 °C cielo e platea · circa 2 minuti e 30 secondi + 30 secondi a bocca di forno',
    },
  ],
  procedimento: [
    {
      titolo: 'Prepara la biga',
      paragrafi: [
        'Mescola la farina ({farinaBiga}), l’acqua ({acquaBiga}) e il lievito ({lievito}): il composto deve restare grezzo e uniforme, senza essere lavorato a lungo. La temperatura della biga a fine impasto deve essere circa 25 °C. Riponi la biga in un contenitore ermetico e trasferiscila in frigorifero a 4 °C per circa 24 ore.',
      ],
    },
    {
      titolo: 'Prepara l’autolisi',
      condizione: 'autolisi',
      paragrafi: [
        'Mescola la farina dell’autolisi ({farinaAutolisi}) con l’acqua destinata all’autolisi ({acquaAutolisi}) fino a ottenere un impasto grossolano.',
        'Copri bene il contenitore e lascialo riposare fino al momento dell’impastamento finale.',
      ],
    },
    {
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'senzaAutolisi',
      paragrafi: [
        'Mescola la farina del rinfresco ({farinaRinfresco}) con l’acqua restante ({acquaFinale}) e unisci tutta la biga.',
        'Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione.',
        'Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto.',
        'Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; l’acqua indicata è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'autolisi',
      paragrafi: [
        'Unisci tutta la biga e tutta l’autolisi, quindi incorpora gradualmente l’acqua restante ({acquaFinale}). Aggiungi il malto, il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben sviluppato.',
      ],
    },
    {
      titolo: 'Prima lievitazione e formatura dei panetti',
      paragrafi: [
        'Copri l’impasto e lascialo riposare in massa per poco meno di 30 minuti. {divisionePorzioni}',
      ],
    },
    {
      titolo: 'Seconda lievitazione (appretto)',
      paragrafi: [
        'Sistema i panetti in contenitori coperti e lasciali circa 2 ore a temperatura ambiente, intorno a 22 °C. Quando iniziano a crescere e a rilassarsi, trasferiscili in frigorifero a 4 °C. Coordina la fermentazione con l’orario di cottura, evitando di prolungarla se i panetti sono già molto sviluppati.',
      ],
    },
    {
      titolo: 'Prepara il forno e i panetti',
      paragrafi: [
        'Preriscalda il forno con l’anticipo necessario. Togli i panetti dal frigorifero circa 30 minuti prima della stesura; se sono ancora freddi o tenaci, lasciali rilassare qualche minuto in più.',
      ],
    },
    {
      titolo: 'Cuoci la pizza contemporanea',
      paragrafi: [
        'Imposta il forno a circa 400 °C di cielo e 350 °C di platea.',
        'Cuoci per circa 2 minuti, controllando e ruotando la pizza secondo necessità. Completa con circa 30 secondi a bocca di forno, sostenendola con una pala idonea e controllando continuamente il colore del cornicione.',
        'Tempi e temperature sono indicativi: adatta la cottura alla risposta del forno, al condimento e alla colorazione.',
      ],
    },
    {
      titolo: 'Variante: basi da farcire',
      paragrafi: [
        'Per le basi imposta circa 350 °C sia di cielo sia di platea.',
        'Sistema al centro del disco lo stampo in alluminio capovolto previsto da questa preparazione, lasciando libero il bordo. Utilizza esclusivamente uno stampo adatto alla temperatura di cottura.',
        'Cuoci per circa 2 minuti e 30 secondi e completa con circa 30 secondi a bocca di forno, controllando la colorazione. Anche in questo caso adatta i tempi alla risposta del forno.',
      ],
    },
  ],
  note: [
    'Il malto diastasico è il 2% della farina della biga ed è già compreso nelle dosi.',
    'L’acqua dell’impastamento finale è la parte restante dell’acqua totale dopo la biga, e dopo l’autolisi quando la usi: biga e autolisi sono già comprese nel peso dell’impasto.',
    'La permanenza dei panetti in frigorifero va coordinata con l’orario di cottura e lo sviluppo dei panetti.',
  ],
  senzaNotaPeso: true,
  tips: [
    'Per una biga al 75% e un’idratazione totale del 77% è adatta una farina forte, indicativamente W 300–320: deve sostenere la lunga maturazione della biga e l’alta idratazione.',
    'Usando un prefermento freddo nei periodi più freddi, l’impasto potrebbe chiudersi a una temperatura inferiore a 20 °C, rallentando la lievitazione: in questo caso, utilizza acqua tiepida o calda nel rinfresco per riportare la temperatura finale del mix in target (22–23 °C).',
    TIP_AUTOLISI,
  ],
};

/** Elenco delle ricette disponibili nell'app. */
export const RICETTE: readonly RicettaConfig[] = [
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  RICETTA_CANOTTO,
];

export const RICETTA_PREDEFINITA: RicettaConfig = RICETTA_TEGLIA_BIGA;

export function trovaRicetta(id: string): RicettaConfig {
  return RICETTE.find((ricetta) => ricetta.id === id) ?? RICETTA_PREDEFINITA;
}

/** Configurazione iniziale: lievito fresco e autolisi attiva nelle ricette con biga. */
export function opzioniIniziali(ricetta: RicettaConfig): OpzioniRicetta {
  return {
    tipoLievito: 'fresco',
    autolisi: ricetta.famiglia === 'biga-autolisi' || ricetta.id === RICETTA_TEGLIA_BIGA.id,
  };
}

/** L'autolisi è attiva quando è inclusa nella ricetta o scelta dall'utente. */
export function usaAutolisi(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
): boolean {
  if (ricetta.autolisiOpzionale === true) return opzioni.autolisi;
  return ricetta.famiglia === 'biga-autolisi';
}

/** Il lievito secco viene ricavato internamente dal dosaggio del fresco. */
export function fattoreLievito(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
): number {
  return opzioni.tipoLievito === 'secco' ? ricetta.fattoreLievitoSecco : 1;
}

export function etichettaLievito(tipo: TipoLievito): string {
  return tipo === 'secco' ? 'Lievito di birra secco' : 'Lievito di birra fresco';
}

/**
 * Frazione della farina totale usata per il malto.
 * Nelle ricette con biga il malto è una percentuale della farina della biga;
 * negli impasti diretti resta una percentuale della farina totale.
 */
export function quotaMaltoSuFarinaTotale(ricetta: RicettaConfig): number {
  const percentuale = ricetta.percentualeMalto ?? 0;
  if (ricetta.famiglia === 'diretto') return percentuale;
  return percentuale * (ricetta.quotaFarinaBiga ?? 0);
}

export interface DerivatiRicetta {
  /** Quota della farina totale usata nella fase di rinfresco/autolisi. */
  quotaFarinaRinfresco: number;
  /** Peso dell'impasto per 1 g di farina totale. */
  fattorePeso: number;
}

/** Deriva dalla configurazione i valori non arbitrari degli impasti lievitati. */
export function derivaRicetta(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): DerivatiRicetta {
  const quotaFarinaBiga = ricetta.quotaFarinaBiga ?? 0;
  const lievitoFresco =
    ricetta.famiglia === 'diretto'
      ? (ricetta.lievitoFrescoSuFarina ?? 0)
      : quotaFarinaBiga * (ricetta.lievitoFrescoSuFarinaBiga ?? 0);

  const fattorePeso =
    1 +
    ricetta.idratazioneTotale +
    ricetta.percentualeOlio +
    ricetta.percentualeSale +
    quotaMaltoSuFarinaTotale(ricetta) +
    (ricetta.percentualeMiele ?? 0) +
    lievitoFresco * fattoreLievito(ricetta, opzioni);

  return {
    quotaFarinaRinfresco: ricetta.famiglia === 'diretto' ? 1 : 1 - quotaFarinaBiga,
    fattorePeso,
  };
}
