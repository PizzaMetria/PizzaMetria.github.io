import type {
  OpzioniRicetta,
  ProdottoConfig,
  ProdottoScelto,
  RicettaConfig,
  RisultatoCalcolo,
  TipoLievito,
} from '../types';
import { formattaGrammi } from '../lib/formato';

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
  nome: 'Pizza in Teglia con biga',
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
      nota: 'Prima di impastare',
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
  idratazioneBiga: 0.55,
  idratazioneAutolisi: 0.55,
  idratazioneTotale: 0.8,
  lievitoFrescoSuFarinaBiga: 0.01,
  percentualeOlio: 0.04,
  percentualeSale: 0.03,
  percentualeMalto: 0.02,
  fattoreLievitoSecco: 0.6,
  autolisiOpzionale: true,
  farinaEtichetta: 'Farina',
  farinaDescrizione: '00 forte per biga e rinfresco',
  oreBiga: 24,
  /**
   * Le 24 ore di casa, con la cucina a 27 °C: a questa temperatura l'attesa è
   * fuori dalla finestra dell'ambiente, quindi il motore mette la biga tutta in
   * frigorifero, come la biga classica delle 24 ore a 4 °C.
   */
  motoreBiga: {
    temperatura: 27,
    ore: 24,
    temperaturaFrigo: 4,
    // Solo l'ora: il giorno lo aggiunge il modulo (datetime-local), così la
    // configurazione resta la stessa a ogni apertura.
    oraImpasto: '08:00',
    oraPronta: '08:00',
  },
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
        'Mescola la farina da {farinaBiga}, l’acqua da {acquaBiga} ({idratazioneBiga} di idratazione) e il lievito da {lievito}. Il composto deve risultare grezzo ma uniforme, senza essere lavorato a lungo. La temperatura della biga a fine impasto deve essere di circa 25 °C. Riponila in un contenitore ermetico: matura {maturazioneBiga}.',
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
      // Biga al 100%: non c'è farina residua da aggiungere.
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'senzaFarinaRinfresco',
      paragrafi: [
        'Unisci tutta la biga. Aggiungi il malto e inizia ad impastare incorporando gradualmente l’acqua restante ({acquaRinfresco}), scegliendone la temperatura in base a quella dell’ambiente e degli ingredienti. Aggiungi il sale e l’olio e lavora fino a ottenere un impasto omogeneo e ben incordato (temperatura finale dell’impasto: circa 22–23 °C).'
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
      titolo: 'Staglio / Formazione panetti',
      paragrafi: [
        '{formazionePanetti}',
        'Allarga delicatamente ogni porzione formando un rettangolo. Prendi l’impasto dai bordi e portalo delicatamente verso il centro, applicando 4 piccole pieghe da ciascun lato corto. Arrotola poi l’impasto su se stesso per 3–4 giri, fino a ottenere un salsicciotto. Ripiegalo quindi su se stesso nel senso opposto, sovrapponendo le due estremità, e sigilla bene la parte inferiore.',
        'Spolvera abbondantemente di semola rimacinata.',
      ],
    },
    {
      titolo: 'Fuori dal frigorifero / Appretto',
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
    'Farina di riferimento: 00 forte, adatta alle lunghe fermentazioni e all’alta idratazione. Il W lo calcola il sito: è più alto per la biga che per il rinfresco.',
    'Il malto diastasico è il 2% della farina della biga ed è già compreso nelle dosi.',
    'L’acqua del rinfresco è compresa nell’acqua totale: non è un’aggiunta separata.',
  ],
  noteEssenziali: [],
  senzaChiarimenti: true,
  tips: [
    'La farina della biga deve essere più forte di quella del rinfresco: la biga matura a lungo, il rinfresco poche ore. La scheda indica i due W: per la biga scegline una di tipo 0 oppure 00, con il W che serve a reggere la lunga fermentazione senza collassare.',
    'Usando un prefermento freddo nei periodi più freddi, l’impasto potrebbe chiudersi a una temperatura inferiore a 20 °C, rallentando la lievitazione: in questo caso, utilizza acqua tiepida o calda nel rinfresco per riportare la temperatura finale del mix in target (22–23 °C).',
    TIP_AUTOLISI,
    'Cottura nel forno F1 P134H — La camera bassa e la vicinanza della resistenza superiore possono far bruciare la superficie prima che la cottura sia completata. Gli accorgimenti indicati per entrambe le cotture servono a limitare il calore dall’alto e ottenere una cottura più equilibrata. Per la seconda cottura nel F1, sfrutta il forno in caduta e limita le accensioni della resistenza superiore: la base è già precotta e deve soprattutto completarsi la cottura dei condimenti.',
  ],
};

export const RICETTA_TRANCIO: RicettaConfig = {
  id: 'trancio-milanese',
  slug: 'trancio-milanese',
  nome: 'Trancio Milanese',
  descrizione:
    'Alto e morbido, con una mollica dall’alveolatura più fitta e uniforme e un fondo croccante dorato.',
  famiglia: 'diretto',
  modalita: ['teglie', 'farina', 'panetti'],
  notaScheda:
    'Impasto facile e veloce, pronto in circa 3 ore, senza lunghi tempi di lievitazione.',
  fasi: [{ id: 'impasto', titolo: 'Impasto' }],
  idratazioneTotale: 0.6,
  lievitoFrescoSuFarina: 6 / 375,
  percentualeOlio: 22 / 375,
  percentualeSale: 8 / 375,
  /** Impasto diretto: il malto resta riferito alla farina totale. */
  percentualeMalto: 4 / 375,
  percentualeMiele: 10 / 375,
  fattoreLievitoSecco: 0.67,
  farinaEtichetta: 'Farina debole',
  farinaDescrizione: 'Farina debole, indicativamente W 180–220',
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
      titolo: 'Impasto',
      paragrafi: [
        'Sciogli il lievito ({lievito}), il malto diastasico ({malto}) e il miele ({miele}) in {acquaImpastoIniziale} di acqua. Versa il composto nell’impastatrice a spirale insieme alla farina ({farina}) e avvia la lavorazione.',
        'La temperatura dell’acqua si regola in pratica: usa acqua più calda se farina e ingredienti sono freddi, acqua più fresca in estate o con l’ambiente caldo.',
        'Quando l’impasto comincia a incordare, aggiungi il sale ({sale}) e incorpora l’olio in tre riprese ({olioRiprese}). Infine, aggiungi i restanti {acquaImpastoFinale} di acqua molto lentamente.',
        'Terminata l’impastatura, lascia riposare l’impasto per 10 minuti prima di passare alle pieghe.',
      ],
    },
    {
      titolo: 'Pieghe e riposo in teglia',
      paragrafi: [
        'Togli l’impasto dall’impastatrice ed esegui un giro di pieghe solo per compattarlo, senza chiudere eccessivamente il panetto. Lascia riposare altri 10–15 minuti.',
        '{formazionePanetti} Ungi leggermente la teglia, posiziona l’impasto al suo interno con un filo d’olio anche sulla superficie per non farlo seccare.',
      ],
    },
    {
      titolo: 'Stesura in teglia',
      paragrafi: [
        'Capovolgi il panetto: la parte che durante il riposo era rivolta verso l’alto deve andare a contatto con il fondo. Allargalo delicatamente in due o tre riprese, con brevi pause tra una e l’altra per permettergli di rilassarsi.',
      ],
    },
    {
      titolo: 'Appretto e condimento',
      paragrafi: [
        'Dopo la stesura, lascia lievitare l’impasto in teglia al caldo per circa 1 ora e mezza – 2 ore, coprendolo adeguatamente (ad esempio con un’altra teglia capovolta o un ulteriore velo d’olio in superficie) per evitare che si secchi. Successivamente, distribuisci la salsa e lascia riposare l’impasto per almeno altri 30 minuti. Nel frattempo, procedi con il preriscaldamento del forno.',
      ],
    },
    {
      titolo: 'Cottura nel forno F1 P134H',
      paragrafi: [
        'Preriscalda il forno impostando sia la platea (resistenza inferiore) che il cielo (resistenza superiore) a 300 °C. Al momento di infornare, regola la temperatura a circa 250 °C sulla platea e tra 250 °C e 270 °C sul cielo. Cuoci per circa 10 minuti, controllando il fondo e la superficie. Trascorso questo tempo, concludi la cottura ruotando la teglia di 180° e prosegui per altri 2 minuti circa, aggiungendo la mozzarella o altri condimenti, se la pizza li prevede.',
      ],
    },
  ],
  note: [
    'Farina di riferimento: una farina debole, indicativamente W 180–220, adatta al trancio.',
    'La dose di riferimento è la teglia 30 × 40 cm con 375 g di farina; le dosi vengono scalate automaticamente.',
  ],
  noteEssenziali: [],
  tips: [
    'Per un impasto diretto al 60% di idratazione è adatta una farina debole, indicativamente W 180–220: garantisce morbidezza e non serve una farina forte.',
    'Con una farina debole, aggiungi l’ultima parte d’acqua molto lentamente, lasciando che venga assorbita prima di versarne altra. Se l’impasto perde forza, evita di insistere con lavorazioni prolungate.',
    'Salamino piccante (pizza diavola): se vuoi preparare una pizza con il salamino piccante, taglialo molto sottile e distribuiscilo direttamente sulla salsa prima di infornare. In questo modo cuoce insieme alla pizza fin dall’inizio, rilasciando meglio il suo gusto piccante.',
    'Tieni in considerazione che il lievito secco tende a partire più lentamente rispetto al lievito fresco.',
  ],
};

export const RICETTA_CANOTTO: RicettaConfig = {
  id: 'pizza-contemporanea-con-biga-77',
  slug: 'pizza-contemporanea-con-biga',
  nome: 'Pizza Contemporanea con biga',
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
      nota: 'Prima di impastare',
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
  farinaEtichetta: 'Farina',
  farinaDescrizione: '00 forte per biga e rinfresco',
  oreBiga: 24,
  motoreBiga: {
    temperatura: 27,
    ore: 24,
    temperaturaFrigo: 4,
    // Solo l'ora: il giorno lo aggiunge il modulo (datetime-local), così la
    // configurazione resta la stessa a ogni apertura.
    oraImpasto: '08:00',
    oraPronta: '08:00',
  },
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
        'Mescola la farina da {farinaBiga}, l’acqua da {acquaBiga} ({idratazioneBiga} di idratazione) e il lievito da {lievito}. Il composto deve risultare grezzo ma uniforme, senza essere lavorato a lungo. La temperatura della biga a fine impasto deve essere di circa 25 °C. Riponila in un contenitore ermetico: matura {maturazioneBiga}.',
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
        'Mescola la farina del rinfresco ({farinaRinfresco}) con l’acqua restante ({acquaFinale}) e unisci tutta la biga. Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione. Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto. Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; l’acqua indicata è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      // Biga al 100%: non c'è farina residua da aggiungere.
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'senzaFarinaRinfresco',
      paragrafi: [
        'Unisci tutta la biga all’acqua restante ({acquaFinale}). Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione. Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto. Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; l’acqua indicata è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      titolo: 'Completa l’impasto (rinfresco)',
      condizione: 'autolisi',
      paragrafi: [
        'Unisci tutta la biga e tutta l’autolisi all’acqua restante ({acquaFinale}). Aggiungi malto, sale e olio, lasciando assorbire gli ingredienti durante la lavorazione. Lavora fino a ottenere un impasto omogeneo e ben strutturato. Considera circa 15 minuti come riferimento, da adattare alla macchina e alla risposta dell’impasto. Una temperatura finale intorno a 21 °C è il riferimento di questa ricetta; l’acqua indicata è già compresa nell’acqua totale ({acquaTotale}).',
      ],
    },
    {
      titolo: 'Prima lievitazione e formatura dei panetti',
      paragrafi: [
        'Copri l’impasto e lascialo riposare in massa per il tempo necessario ad avviare la fermentazione (circa 30 minuti). {divisionePorzioni}',
      ],
    },
    {
      titolo: 'Fuori dal frigorifero / Appretto',
      paragrafi: [
        'Sistema i panetti in contenitori coperti e lasciali lievitare a temperatura ambiente (circa 22 °C) finché non aumentano di volume, indicativamente fino a circa il raddoppio. Il tempo varia con la temperatura ambiente e la forza della farina. Quando i panetti sono ben sviluppati, trasferiscili in frigorifero a 4 °C.',
      ],
    },
    {
      titolo: 'Prepara i panetti e il forno',
      paragrafi: [
        'Togli i panetti dal frigorifero 30–45 minuti prima della stesura. Se sono ancora freddi o tenaci, lasciali rilassare qualche minuto in più. Preriscalda il forno con l’anticipo necessario.',
      ],
    },
    {
      titolo: 'Cuoci la pizza contemporanea',
      paragrafi: [
        'Imposta il forno a circa 400 °C di cielo e 350 °C di platea.',
        'Cuoci per circa 2 minuti, controllando e ruotando la pizza secondo necessità. Completa a bocca di forno la cottura per circa 30 secondi, controllando continuamente il colore del cornicione.',
      ],
    },
  ],
  note: [
    'Il malto diastasico è il 2% della farina della biga ed è già compreso nelle dosi.',
    'L’acqua dell’impastamento finale è la parte restante dell’acqua totale dopo la biga, e dopo l’autolisi quando la usi: biga e autolisi sono già comprese nel peso dell’impasto.',
    'La permanenza dei panetti in frigorifero va coordinata con l’orario di cottura e lo sviluppo dei panetti.',
  ],
  tips: [
    'La farina della biga deve essere più forte di quella del rinfresco: la biga matura a lungo, il rinfresco poche ore. La scheda indica i due W: per la biga scegline una di tipo 0 oppure 00, con il W che serve a reggere la lunga fermentazione senza collassare.',
    'Usando un prefermento freddo nei periodi più freddi, l’impasto potrebbe chiudersi a una temperatura inferiore a 20 °C, rallentando la lievitazione: in questo caso, utilizza acqua tiepida o calda nel rinfresco per riportare la temperatura finale del mix in target (22–23 °C).',
    'Basi da farcire: per le basi imposta circa 350 °C sia di cielo sia di platea. Sistema al centro del disco di pizza lo stampo in alluminio capovolto, lasciando libero il bordo. Utilizza sempre uno stampo adatto alla temperatura di cottura. Cuoci per circa 2 minuti e 30 secondi e completa con circa 30 secondi a bocca di forno, controllando la colorazione.',
    TIP_AUTOLISI,
  ],
};

/**
 * Formati del calcolatore misto dell'Impasto Tuttofare.
 * Il peso è quello di un pezzo: quantità e subtotale si compongono nel form.
 */
export const PRODOTTI_TUTTOFARE: readonly ProdottoConfig[] = [
  {
    id: 'pizzette',
    nome: 'Pizzette',
    singolare: 'pizzetta',
    plurale: 'pizzette',
    pesoBaseG: 50,
    nota: 'Peso di riferimento 50 g',
  },
  {
    id: 'panini',
    nome: 'Panini',
    singolare: 'panino',
    plurale: 'panini',
    pesoBaseG: 90,
    nota: 'Peso di riferimento 80–100 g',
  },
  {
    id: 'focacce',
    nome: 'Focaccia rotonda',
    singolare: 'focaccia rotonda',
    plurale: 'focacce rotonde',
    pesoBaseG: 200,
    nota: 'Teglietta circolare di circa 24 cm',
    // Il peso segue la superficie della teglietta: 24 cm = 200 g.
    dimensione: {
      tipo: 'diametro',
      etichetta: 'Diametro',
      baseA: 24,
      pesoBaseG: 200,
      incremento: 1,
      min: 10,
      max: 60,
      unita: 'cm',
    },
  },
  {
    id: 'bauletti',
    nome: 'Bauletti / pane in cassetta',
    singolare: 'bauletto',
    plurale: 'bauletti',
    pesoBaseG: 500,
    nota: 'Stampo rettangolare 20 × 10 cm',
    // Il peso segue la superficie dello stampo: 20 × 10 cm = 500 g.
    dimensione: {
      tipo: 'stampo',
      etichetta: 'Stampo',
      baseA: 20,
      baseB: 10,
      pesoBaseG: 500,
      incremento: 1,
      min: 5,
      max: 60,
      unita: 'cm',
    },
  },
  {
    id: 'focacce-teglia',
    nome: 'Focaccia in teglia',
    singolare: 'focaccia in teglia',
    plurale: 'focacce in teglia',
    pesoBaseG: 530,
    nota: 'Teglia quadrata o rettangolare 30 × 40 cm',
    // Stesso spessore della tonda: 200 g su un cerchio da 24 cm sono 0,442
    // g/cm², quindi una teglia 30 × 40 porta 530 g di impasto.
    dimensione: {
      tipo: 'stampo',
      etichetta: 'Teglia',
      baseA: 30,
      baseB: 40,
      pesoBaseG: 530,
      grammiPerCm2: 200 / (Math.PI * 12 * 12),
      incremento: 1,
      min: 5,
      max: 60,
      unita: 'cm',
    },
  },
];

export const RICETTA_TUTTOFARE: RicettaConfig = {
  id: 'diretto-tuttofare',
  slug: 'impasto-tuttofare',
  nome: 'Impasto Tuttofare',
  descrizione:
    'Un unico impasto per focacce, pizzette, panini e bauletti. Scegli i formati, combina le quantità e calcola tutte le dosi in un’unica volta.',
  /** Dicitura della farina nel riquadro, con il simbolo ≥. */
  farinaScheda: 'Farina forte W 280',
  notaScheda:
    'Impasto pratico e flessibile: pronto in circa 3 ore, oppure preparalo in anticipo e conservalo in frigo per il giorno successivo.',
  famiglia: 'diretto',
  modalita: ['prodotti', 'farina'],
  fasi: [{ id: 'impasto', titolo: 'Impasto' }],
  idratazioneTotale: 0.6,
  lievitoFrescoSuFarina: 0.02,
  percentualeZucchero: 0.04,
  percentualeSale: 0.022,
  percentualeOlio: 0.07,
  /** 20 g di fresco e 8 g di secco istantaneo per kg di farina. */
  fattoreLievitoSecco: 0.4,
  farinaEtichetta: 'Farina',
  farinaDescrizione: 'Farina forte, indicativamente da W 280 in su e proteine almeno 12%',
  senzaPersonalizzazione: true,
  prodotti: PRODOTTI_TUTTOFARE,
  tempiETemperature: [
    {
      etichetta: 'Impastamento',
      valore: 'Prima velocità circa 5 minuti; poi seconda velocità 4–5 minuti',
    },
    { etichetta: 'Temperatura dell’impasto', valore: '25–29 °C a fine impasto' },
    {
      etichetta: 'Riposo in massa',
      valore: '20–25 minuti, senza attendere il raddoppio',
    },
    { etichetta: 'Lievitazione', valore: 'Circa 1–1½ ore a 28 °C' },
    {
      etichetta: 'Cottura',
      valore:
        'Secondo il formato: 180 °C bauletti e panini, 200 °C focacce, 240–250 °C pizzette',
    },
  ],
  procedimento: [
    {
      titolo: 'Impasto',
      paragrafi: [
        'Inserisci tutta la farina ({farina}), tutta l’acqua ({acqua}), il lievito ({lievito}) e lo zucchero ({zucchero}). Lavora in prima velocità per circa 5 minuti.',
        'Aggiungi il sale ({sale}); passa in seconda velocità per circa 4–5 minuti, fino a ottenere struttura.',
        'A impasto incordato incorpora l’olio ({olio}). Parti lentamente per evitare schizzi, poi aumenta fino ad assorbimento completo e vasca pulita.',
        'Temperatura finale dell’impasto: 25–29 °C. Calibra la temperatura dell’acqua in funzione degli ingredienti, dell’ambiente e della macchina. Tempi e velocità sono riferimenti da adattare all’impastatrice.',
      ],
    },
    {
      titolo: 'Pieghe e riposo',
      paragrafi: [
        'Fai un paio di pieghe sul banco e lascia riposare l’impasto in un contenitore unto per 20–25 minuti. Serve a rilassarlo: non attendere il raddoppio in massa.',
      ],
    },
    {
      titolo: 'Divisione e formatura',
      paragrafi: [
        '{divisioneFormati}',
        'Dopo la formatura, lascia lievitare per circa 1 ora – 1 ora e mezza a 28 °C.',
      ],
    },
    {
      // Un solo punto numerato: i formati scelti stanno dentro come elenco
      // puntato rientrato, senza numerazione secondaria, nell'ordine di
      // infornata.
      titolo: 'Prodotti lievitati',
      paragrafi: ['Una volta lievitati, procedi nel seguente modo:'],
      voci: [
        {
          titolo: 'Panini',
          condizione: 'prodotto-panini',
          paragrafi: [
            'Arrotonda bene ogni pezzo. Per i semi passa la superficie superiore prima nell’acqua e poi nei semi, quindi poni sulla teglia con spazio per lo sviluppo.',
            'Lievitazione: riferimento comune; i panini sono pronti quando sono gonfi e leggermente tremolanti muovendo la teglia.',
            'Cottura: circa 180 °C per 11–13 minuti indicativi alla pezzatura base, eventualmente più a lungo secondo forno e sviluppo; leggero vapore se disponibile.',
          ],
        },
        {
          titolo: 'Pizzette',
          condizione: 'prodotto-pizzette',
          paragrafi: [
            'Forma delle palline e ponile su carta forno leggermente unta, per facilitare apertura e distacco. Riferimento di disposizione: 12 pezzi da 50 g su teglia 60 × 40 cm.',
            'Dopo la lievitazione comune, ungi appena la superficie e schiaccia in dischi piatti. Condisci con passata, origano e olio.',
            'Se le pizzette vengono cotte a contatto con la pietra refrattaria, puoi infornarle subito dopo il condimento. Altrimenti, attendi circa 30 minuti prima della cottura.',
            'Cottura: circa 240–250 °C per 8–10 minuti alla pezzatura base. L’umidità è facoltativa se disponibile, non un requisito.',
            'Eventuale filo d’olio a crudo; la variante con mozzarella e basilico è facoltativa, senza quantità inventate.',
          ],
        },
        {
          titolo: 'Bauletti / pane in cassetta',
          condizione: 'prodotto-bauletti',
          paragrafi: [
            'Stendi l’impasto a rettangolo, arrotolalo strettamente a salsicciotto e ponilo nello stampo unto. Riferimento dinamico: {pesoBauletti} in stampo rettangolare 20 × 10 cm, calcolato in base ai parametri selezionati. Lievitazione: il pane è pronto quando l’impasto occupa circa i tre quarti dell’altezza dello stampo. Cottura: circa 180 °C per circa 40 minuti alla pezzatura base, fino a ottenere una colorazione dorata.',
          ],
        },
        {
          // Tonda e in teglia hanno lo stesso procedimento: cambia solo la
          // forma, non il modo di lavorare l’impasto.
          titolo: 'Focacce',
          condizioni: ['prodotto-focacce', 'prodotto-focacce-teglia'],
          paragrafi: [
            'Sistema le palline nelle teglie unte.',
            'Dopo la lievitazione comune, stendi delicatamente fino al bordo. Condisci con pomodorini tagliati a metà con la pelle verso l’alto, olive denocciolate, un velo di passata, origano e olio.',
            'Dopo il condimento lascia ricrescere per altri 30–40 minuti: non infornare subito.',
            'Cottura: circa 200 °C per 13–15 minuti.',
            'Sforna e trasferisci su una griglia; eventuale filo d’olio a crudo.',
          ],
        },
      ],
    },
  ],
  note: [],
  noteEssenziali: [],
  tips: [
    'Utilizza una farina forte, indicativamente W 280 e con almeno il 12% di proteine.',
    'Il riposo di 20–25 minuti serve a rilassare l’impasto, non a farlo raddoppiare: una lievitazione lunga in massa rende la mollica meno fitta e regolare.',
    'La temperatura finale dell’impasto (25–29 °C) e quella di lievitazione (circa 28 °C) sono due cose diverse: la prima si misura a impasto finito, la seconda riguarda l’ambiente di crescita.',
    'I tempi di cottura dipendono dalle pezzature di riferimento: adattali al forno e alle dimensioni. Panini e bauletti hanno tempi diversi e non cuociono insieme.',
    'Non esiste una regolazione valida per tutti i forni: evita di applicare come universali passaggi pensati per un forno professionale, come l’ingresso a 220 °C con discesa a 180 °C o lo spegnimento del suolo.',
    'Variante per il giorno successivo: dopo il riposo breve dividi e forma, poi trasferisci in frigorifero. Il giorno dopo completa la lievitazione a 28–30 °C e segui le istruzioni del prodotto.',
    'Congelamento da crudo: congela i pezzi formati; quando servono, lasciali scongelare e completa la lievitazione a circa 28 °C.',
    'Lascia raffreddare completamente i prodotti prima di riporli. Pizzette e focacce si rigenerano in forno caldo per qualche minuto, con un poco di passata se si è asciugata. Anche da cotto il prodotto si può congelare, dopo il raffreddamento.',
  ],
  // I consigli specifici non ripetono il procedimento: semi, condimento delle
  // focacce e carta forno delle pizzette vivono nel punto «Prodotti». Resta solo
  // il consiglio sullo stampo del bauletto, con il peso effettivo del formato.
  tipsProdotti: [
    {
      condizione: 'prodotto-bauletti',
      testo:
        'Per il bauletto usa uno stampo unto con la capacità adatta: {pesoBauletti} in uno stampo rettangolare 20 × 10 cm è il riferimento, calcolato in base ai parametri selezionati.',
    },
  ],
};

/**
 * Sostituisce i segnaposto dei pesi ({pesoBauletti}, {pesoFocacce}, …) con il
 * peso effettivo del formato scelto: i Tips restano dinamici come il
 * procedimento. Un segnaposto senza formato corrispondente resta invariato.
 */
function risolviPesiProdotti(
  testo: string,
  prodotti: readonly ProdottoScelto[] | undefined,
): string {
  return testo.replace(/\{peso([A-Za-z]+)\}/g, (intero, nome: string) => {
    const prodotto = prodotti?.find(
      (voce) => voce.id.toLowerCase() === nome.toLowerCase(),
    );
    return prodotto ? formattaGrammi(prodotto.pesoG) : intero;
  });
}

/**
 * Consigli della ricetta: prima i comuni, poi quelli dei soli formati scelti.
 * Unica fonte per PDF e verifiche, così i testi restano allineati.
 */
export function tipsRicetta(
  ricetta: RicettaConfig,
  risultato?: Pick<RisultatoCalcolo, 'prodotti'> | null,
): string[] {
  const scelti = new Set(
    (risultato?.prodotti ?? []).map((prodotto) => `prodotto-${prodotto.id}`),
  );
  const specifici = (ricetta.tipsProdotti ?? [])
    .filter((tip) => scelti.has(tip.condizione))
    .map((tip) =>
      risolviPesiProdotti(tip.testo, risultato?.prodotti ?? undefined),
    );

  return [...ricetta.tips, ...specifici];
}

/**
 * Elenco delle ricette, nell'ordine mostrato dal selettore: prima le ricette
 * a impasto indiretto con biga, poi quelle a impasto diretto. La pizza in
 * teglia resta in prima posizione perché è la ricetta più utilizzata.
 */
export const RICETTE: readonly RicettaConfig[] = [
  RICETTA_TEGLIA_BIGA,
  RICETTA_CANOTTO,
  RICETTA_TRANCIO,
  RICETTA_TUTTOFARE,
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
    // Solo le ricette con biga hanno un piano di maturazione da cui partire.
    ...(ricetta.motoreBiga ? { biga: { ...ricetta.motoreBiga } } : {}),
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
    (ricetta.percentualeZucchero ?? 0) +
    quotaMaltoSuFarinaTotale(ricetta) +
    (ricetta.percentualeMiele ?? 0) +
    lievitoFresco * fattoreLievito(ricetta, opzioni);

  return {
    quotaFarinaRinfresco: ricetta.famiglia === 'diretto' ? 1 : 1 - quotaFarinaBiga,
    fattorePeso,
  };
}
