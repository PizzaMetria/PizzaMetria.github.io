import type {
  OpzioniRicetta,
  RicettaConfig,
  TipoLievito,
} from '../types';

/**
 * Le percentuali sono frazioni: 0.85 = 85% della farina totale.
 * Il lievito è riferito alla farina della biga o alla farina totale a seconda
 * della famiglia. Il lievito secco si ricava internamente dal lievito fresco.
 */

export const RICETTA_TEGLIA_BIGA: RicettaConfig = {
  id: 'pizza-teglia-biga-85',
  slug: 'pizza-teglia-biga',
  nome: 'Pizza in teglia con biga',
  descrizione:
    'Biga all’85% della farina e idratazione totale dell’80%, con malto diastasico e autolisi facoltativa.',
  famiglia: 'biga-rinfresco',
  modalita: ['panetti', 'farina'],
  fasi: [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: 'Da preparare',
      avviso:
        'Biga a circa 25 °C, 20 minuti a temperatura ambiente, poi 24 ore in frigorifero a 4 °C.',
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
  tempiETemperature: [
    {
      etichetta: 'Biga',
      valore: '20 minuti a temperatura ambiente, poi circa 24 ore a 4 °C',
    },
    { etichetta: 'Chiusura della biga', valore: 'Circa 25 °C' },
    {
      etichetta: 'Autolisi',
      valore:
        'Facoltativa: la farina del rinfresco con una parte dell’acqua, prima dell’impastamento finale',
    },
    { etichetta: 'Teglia di riferimento', valore: '40 × 30 cm · 710 g di impasto' },
    {
      etichetta: 'Cottura',
      valore:
        'Forno statico alla massima temperatura: prima senza condimenti fino alla colorazione, poi condimenti e completamento',
    },
  ],
  procedimento: [
    {
      titolo: 'Prepara la biga',
      paragrafi: [
        'Mescola la farina ({farinaBiga}), l’acqua ({acquaBiga}) e il lievito ({lievito}) della biga: il composto deve restare grezzo e uniforme, senza essere lavorato a lungo.',
        'Porta la biga a circa 25 °C, lasciala riposare 20 minuti a temperatura ambiente, poi coprila e trasferiscila in frigorifero a 4 °C per circa 24 ore.',
      ],
    },
    {
      titolo: 'Prepara l’autolisi',
      condizione: 'autolisi',
      paragrafi: [
        'Mescola la farina del rinfresco ({farinaAutolisi}) con l’acqua destinata all’autolisi ({acquaAutolisi}), fino a idratare tutta la farina.',
        'Copri il contenitore e lascia riposare fino al momento dell’impastamento finale.',
      ],
    },
    {
      titolo: 'Rinfresca l’impasto',
      condizione: 'senzaAutolisi',
      paragrafi: [
        'Spezzetta tutta la biga e uniscila alla farina residua ({farinaRinfresco}), all’acqua ({acquaRinfresco}), al malto, al sale e all’olio.',
        'Lavora fino a ottenere un impasto omogeneo e ben sviluppato, aggiungendo l’acqua gradualmente.',
      ],
    },
    {
      titolo: 'Completa l’impasto',
      condizione: 'autolisi',
      paragrafi: [
        'Unisci tutta la biga e tutta l’autolisi, quindi incorpora gradualmente l’acqua restante ({acquaFinale}).',
        'Aggiungi il malto, il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben sviluppato.',
      ],
    },
    {
      titolo: 'Riposo, staglio e lievitazione',
      paragrafi: [
        'Lascia riposare l’impasto coperto per 15–20 minuti, poi dividilo in panetti.',
        '{formazionePanetti} Lascia lievitare i panetti fino al raddoppio, prendendo il volume come riferimento principale.',
      ],
    },
    {
      titolo: 'Stesura e cottura in due fasi',
      paragrafi: [
        'Ungi la teglia e stendi il panetto senza forzarlo, concedendogli brevi pause per rilassarsi.',
        'Preriscalda il forno statico alla massima temperatura. Inforna la teglia con il solo impasto e cuoci finché la superficie inizia a colorarsi.',
        'Aggiungi i condimenti e completa la cottura, controllando il fondo e ruotando la teglia se serve. Adatta tempi e temperature al tuo forno.',
      ],
    },
  ],
  note: [
    'Farina di riferimento: 00 forte, indicativamente W 300–320, adatta alle lunghe fermentazioni e all’alta idratazione.',
    'Il malto diastasico è il 2% della farina totale ed è già compreso nelle dosi.',
    'L’acqua del rinfresco è compresa nell’acqua totale: non è un’aggiunta separata.',
    'L’olio per ungere la teglia è q.b. e non è compreso nel peso teorico.',
  ],
  tips: [
    'Per una biga all’85% e un’idratazione totale dell’80% serve una farina forte, indicativamente W 300–320: deve reggere la lunga fermentazione e l’alta idratazione senza collassare.',
    'La biga va portata a circa 25 °C al termine dell’impasto, lasciata 20 minuti a temperatura ambiente e poi conservata in frigorifero per circa 24 ore.',
    'Se la fermentazione riparte con difficoltà, usa acqua tiepida nel rinfresco per riportare l’impasto sopra 20 °C.',
    'L’autolisi è opzionale: serve a idratare la farina del rinfresco prima dell’impastamento finale, favorendo sviluppo e lavorabilità. Se attivata, il calcolatore ripartisce automaticamente l’acqua totale tra biga, autolisi e impastamento finale.',
  ],
};

export const RICETTA_TRANCIO: RicettaConfig = {
  id: 'trancio-milanese',
  slug: 'trancio-milanese',
  nome: 'Trancio Milanese',
  descrizione:
    'Impasto diretto al 60% di idratazione con farina debole: il trancio milanese morbido e leggero, cotto in teglia.',
  famiglia: 'diretto',
  modalita: ['teglie', 'farina'],
  fasi: [{ id: 'impasto', titolo: 'Impasto' }],
  idratazioneTotale: 0.6,
  lievitoFrescoSuFarina: 5.5 / 375,
  percentualeOlio: 22 / 375,
  percentualeSale: 8 / 375,
  percentualeMalto: 4 / 375,
  percentualeMiele: 10 / 375,
  fattoreLievitoSecco: 0.67,
  farinaEtichetta: 'Farina debole',
  farinaDescrizione: 'debole, W 180–220',
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
        'Sciogli il lievito, il malto diastasico e il miele nell’acqua. Versa il composto nell’impastatrice insieme alla farina e avvia la lavorazione.',
        'Quando l’impasto comincia a prendere struttura, incorpora il sale e l’olio, distribuendo l’olio in tre aggiunte.',
        'Con una farina debole l’impasto può risultare meno sostenuto: evita di forzare l’assorbimento con lavorazioni prolungate. Terminato l’impasto, lascialo riposare per 10–15 minuti.',
      ],
    },
    {
      titolo: 'Pieghe e prima lievitazione',
      paragrafi: [
        'Dopo il riposo, esegui un giro di pieghe. Ungi leggermente il piano di lavoro e la superficie dell’impasto, quindi coprilo con una ciotola capovolta o un contenitore adatto.',
        'Lascialo lievitare finché sarà quasi raddoppiato: il volume è l’indicazione principale, mentre il tempo varia con la temperatura ambiente (circa un’ora).',
      ],
    },
    {
      titolo: 'Stesura in teglia',
      paragrafi: [
        'Ungi bene la teglia. Trasferisci l’impasto capovolgendolo: la parte che durante il riposo era rivolta verso l’alto deve andare a contatto con il fondo.',
        'Allargalo delicatamente in due o tre riprese, con brevi pause tra una e l’altra per permettergli di rilassarsi.',
        'Se sono previste più teglie, dividi prima l’impasto nel numero richiesto, usando il peso per teglia calcolato.',
      ],
    },
    {
      titolo: 'Appretto e condimento',
      paragrafi: [
        'Dopo la stesura, lascia lievitare in teglia per circa 1 ora e mezza–2 ore. L’appretto è quest’ultima lievitazione prima della cottura.',
        'Distribuisci la salsa e attendi almeno altri 30 minuti mentre il forno si preriscalda.',
      ],
    },
    {
      titolo: 'Cottura',
      paragrafi: [
        'Nella prova è stato utilizzato un forno con regolazione separata di cielo e platea. Preriscalda a 300 °C sopra e sotto; al momento di infornare imposta circa 250 °C sotto e 250–270 °C sopra.',
        'Cuoci per circa 10 minuti, controlla il fondo e la superficie, poi ruota la teglia di 180° e prosegui indicativamente per altri 2 minuti. Se usi la mozzarella, aggiungila nella fase finale. Il salamino tagliato sottile può essere aggiunto dall’inizio della cottura.',
        'Temperature e tempi si riferiscono al forno della prova. Adattali alle caratteristiche e ai limiti del tuo forno.',
      ],
    },
  ],
  note: [
    'Farina di riferimento della prova: 00 Belbake, proteine 10%, una farina debole adatta al trancio. Puoi usare un’altra farina debole, indicativamente W 180–220.',
    'L’olio per ungere teglia e piano di lavoro è q.b. e non è compreso nel peso teorico.',
    'La dose di riferimento è la teglia 30 × 40 cm con 375 g di farina; le dosi vengono scalate automaticamente.',
  ],
  tips: [
    'Per un impasto diretto al 60% di idratazione è adatta una farina debole, indicativamente W 180–220: garantisce morbidezza e non serve una farina forte.',
    'Il lievito secco tende a partire più lentamente rispetto al lievito fresco: considera tempi di lievitazione più lunghi.',
  ],
  condimentiFacoltativi: ['Salsa', 'Mozzarella', 'Salamino'],
};

export const RICETTA_CANOTTO: RicettaConfig = {
  id: 'pizza-contemporanea-canotto-77',
  slug: 'pizza-contemporanea-canotto',
  nome: 'Pizza contemporanea Canotto',
  descrizione:
    'Impasto al 77% di idratazione, con il 75% della farina in biga e autolisi facoltativa della farina del rinfresco.',
  famiglia: 'biga-autolisi',
  modalita: ['panetti', 'farina'],
  fasi: [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: 'Da preparare',
      avviso:
        'Avvio di circa 30 minuti a temperatura ambiente, poi circa 24 ore a 4 °C.',
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
  percentualeMalto: 0.01,
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
      valore: 'Circa 30 minuti a temperatura ambiente, poi circa 24 ore a 4 °C',
    },
    {
      etichetta: 'Autolisi',
      valore:
        'Facoltativa: la sera prima, a temperatura ambiente per tutta la notte',
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
        'Mescola la farina ({farinaBiga}), l’acqua ({acquaBiga}) e il lievito ({lievito}) previsti per la biga, fino a ottenere un composto grezzo e uniforme, senza lavorarlo fino a renderlo liscio.',
        'Copri il contenitore, lascia avviare la fermentazione per circa 30 minuti a temperatura ambiente e trasferisci in frigorifero a 4 °C per circa 24 ore.',
      ],
    },
    {
      titolo: 'Prepara l’autolisi',
      condizione: 'autolisi',
      paragrafi: [
        'La sera prima dell’impastamento finale, mescola la farina del rinfresco ({farinaAutolisi}) con l’acqua destinata all’autolisi ({acquaAutolisi}), fino a idratare tutta la farina.',
        'Copri bene il contenitore e lascia riposare a temperatura ambiente per tutta la notte.',
        'Usa soltanto la farina e l’acqua indicate nella sezione Autolisi: lievito, malto, sale e olio vengono gestiti nelle rispettive fasi della ricetta.',
      ],
    },
    {
      titolo: 'Impasta la biga con la farina',
      condizione: 'senzaAutolisi',
      paragrafi: [
        'Mescola la farina del rinfresco ({farinaRinfresco}) con l’acqua restante ({acquaFinale}) e unisci tutta la biga.',
        'Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione.',
        'Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto.',
        'Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; l’acqua indicata è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      titolo: 'Completa l’impasto',
      condizione: 'autolisi',
      paragrafi: [
        'Unisci tutta la biga e tutta l’autolisi. Incorpora gradualmente l’acqua restante ({acquaFinale}), quindi aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione.',
        'Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto.',
        'Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; regola la temperatura dell’acqua in base a quella degli ingredienti e al riscaldamento prodotto dall’impastatrice.',
        'L’acqua dell’impastamento finale ({acquaFinale}) è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      titolo: 'Lascia riposare e forma i panetti',
      paragrafi: [
        'Copri l’impasto e lascialo riposare in massa per poco meno di 30 minuti: questa fase è la puntata. Dividilo quindi nelle porzioni previste e forma i panetti.',
        '{formazionePanetti}',
      ],
    },
    {
      titolo: 'Avvia la lievitazione dei panetti',
      paragrafi: [
        'Sistema i panetti in contenitori coperti e lasciali a temperatura ambiente per circa 2 ore, prendendo come riferimento un ambiente intorno a 22 °C.',
        'Il tempo è indicativo: osserva che i panetti inizino a crescere e a rilassarsi, senza aspettare obbligatoriamente il raddoppio. Se l’ambiente è più caldo o la crescita è già evidente, anticipa il passaggio in frigorifero.',
        'Trasferisci quindi i panetti in frigorifero a 4 °C. La fermentazione prosegue più lentamente anche al freddo: coordina questa fase con l’orario di cottura, evitando di prolungarla quando i panetti risultano già molto sviluppati.',
      ],
    },
    {
      titolo: 'Prepara il forno e i panetti',
      paragrafi: [
        'Preriscalda il forno con l’anticipo necessario a raggiungere le temperature indicate. Togli i panetti dal frigorifero circa 30 minuti prima della stesura, come riferimento iniziale.',
        'Controlla che siano abbastanza rilassati da poter essere stesi senza forzarli: se sono ancora molto freddi e tenaci, lascia loro più tempo, osservandone anche lo sviluppo.',
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
    'L’acqua dell’impastamento finale è la parte restante dell’acqua totale dopo la biga, e dopo l’autolisi quando la usi: biga e autolisi sono già comprese nel peso dell’impasto.',
    'La permanenza dei panetti in frigorifero va coordinata con l’orario di cottura e lo sviluppo dei panetti.',
  ],
  tips: [
    'Per una biga al 75% e un’idratazione totale del 77% è adatta una farina forte, indicativamente W 300–320: deve sostenere la lunga maturazione della biga e l’alta idratazione.',
    'Prepara la biga con un avvio di circa 30 minuti a temperatura ambiente, poi conservala in frigorifero per circa 24 ore.',
    'L’autolisi è facoltativa: se la attivi, prepara la sera precedente la farina del rinfresco con l’acqua destinata all’autolisi, così si idrata prima dell’impastamento finale; se la disattivi, la farina entra direttamente nell’impasto con la biga.',
    'L’acqua finale va incorporata gradualmente durante l’impastamento finale, dopo aver unito biga e autolisi.',
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

/** Configurazione iniziale: lievito fresco e autolisi solo se obbligatoria. */
export function opzioniIniziali(ricetta: RicettaConfig): OpzioniRicetta {
  return {
    tipoLievito: 'fresco',
    autolisi: ricetta.famiglia === 'biga-autolisi',
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
    (ricetta.percentualeMalto ?? 0) +
    (ricetta.percentualeMiele ?? 0) +
    lievitoFresco * fattoreLievito(ricetta, opzioni);

  return {
    quotaFarinaRinfresco: ricetta.famiglia === 'diretto' ? 1 : 1 - quotaFarinaBiga,
    fattorePeso,
  };
}
