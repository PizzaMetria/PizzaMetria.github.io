import {
  derivaRicetta,
  etichettaLievito,
  fattoreLievito,
  opzioniIniziali,
  quotaMaltoSuFarinaTotale,
  usaAutolisi,
} from '../config/ricette';
import type { RichiestaBiga } from '../types';
import { oreAttesa, piano as pianoMotore } from './motore-biga';
import type { Piano } from './motore-biga';
import type {
  DimensioneProdotto,
  FaseCalcolata,
  IngredienteCalcolato,
  OpzioniRicetta,
  ProdottoScelto,
  RicettaConfig,
  RisultatoCalcolo,
  StimaTeglie,
  TipoIngrediente,
} from '../types';

/** Arrotonda ai 5 g usati dalle pezzature, mai sotto un pezzo minimo. */
export function arrotondaAl5(grammi: number): number {
  return Math.max(5, Math.round(grammi / 5) * 5);
}

/**
 * Peso del pezzo ricavato dalla superficie del formato: la teglietta circolare
 * cresce con il diametro al quadrato, lo stampo con il prodotto dei due lati.
 * Il riferimento è 24 cm = 200 g per le focacce e 20 × 10 cm = 500 g per i
 * bauletti; l'output è arrotondato al multiplo di 5 g.
 */
export function pesoDaDimensione(
  dimensione: DimensioneProdotto,
  a: number,
  b?: number,
): number {
  const rettangolare = dimensione.tipo === 'stampo';
  const secondoLato = b ?? dimensione.baseB ?? 1;
  const riferimento = rettangolare
    ? dimensione.baseA * (dimensione.baseB ?? 1)
    : dimensione.baseA * dimensione.baseA;
  const superficie = rettangolare
    ? a * secondoLato
    : a * a;

  if (!(riferimento > 0) || !(superficie > 0)) {
    return dimensione.pesoBaseG;
  }

  return arrotondaAl5((dimensione.pesoBaseG * superficie) / riferimento);
}

function richiediPositivo(nome: string, valore: number): void {
  if (!Number.isFinite(valore) || valore <= 0) {
    throw new RangeError(`${nome} deve essere un numero positivo e finito.`);
  }
}

function richiediConfig(valore: number | undefined, nome: string): number {
  if (valore === undefined || !Number.isFinite(valore)) {
    throw new Error(`Configurazione incompleta: ${nome}.`);
  }
  return valore;
}

function riga(
  chiave: string,
  etichetta: string,
  grammi: number,
  tipo: TipoIngrediente,
  faseId: string,
): IngredienteCalcolato {
  return { chiave, etichetta, grammi, tipo, faseId };
}

/**
 * L'attesa della biga. Comandano gli orari — «preparo alle … , pronta alle …»
 * come nel calcolatore della biga — e solo chi non li ha (stati salvati da
 * prima) ricade sulle ore indicate.
 */
export function oreDellaBiga(richiesta: RichiestaBiga): number {
  if (richiesta.oraImpasto && richiesta.oraPronta) {
    return oreAttesa(richiesta.oraImpasto, richiesta.oraPronta) ?? richiesta.ore;
  }
  return richiesta.ore;
}

/**
 * Il piano della biga: dal motore, con l'attesa e le temperature scelte
 * dall'utente (o quelle della ricetta). Le ricette dirette non ce l'hanno.
 */
function pianoDellaBiga(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
): Piano | null {
  if (ricetta.famiglia === 'diretto') return null;
  const richiesta = opzioni.biga ?? ricetta.motoreBiga;
  if (!richiesta) return null;

  return pianoMotore({
    temperatura: richiesta.temperatura,
    temperaturaFrigo: richiesta.temperaturaFrigo,
    oreTotali: oreDellaBiga(richiesta),
  });
}

interface CalcoloBase {
  fasi: FaseCalcolata[];
  ingredienti: IngredienteCalcolato[];
  farinaTotaleG: number;
  acquaTotaleG: number;
  pesoImpastoG: number;
  fattorePeso: number;
  pesoBigaG?: number;
  pesoAutolisiG?: number;
  acquaFinaleG?: number;
  /** Piano della biga usato per queste dosi: solo nelle ricette con biga. */
  pianoBiga?: Piano;
}

function somma(voci: IngredienteCalcolato[]): number {
  return voci.reduce((totale, voce) => totale + voce.grammi, 0);
}

/** Le etichette delle fasi restano allineate alla configurazione della ricetta. */
function faseConfig(ricetta: RicettaConfig, id: string) {
  return ricetta.fasi.find((fase) => fase.id === id);
}

function lievitoFrescoBiga(ricetta: RicettaConfig, farinaBiga: number): number {
  return (
    farinaBiga *
    richiediConfig(ricetta.lievitoFrescoSuFarinaBiga, 'lievitoFrescoSuFarinaBiga')
  );
}

function calcolaBigaRinfresco(
  ricetta: RicettaConfig,
  farinaTotaleG: number,
  opzioni: OpzioniRicetta,
): CalcoloBase {
  const quotaBiga = richiediConfig(ricetta.quotaFarinaBiga, 'quotaFarinaBiga');
  // L'idratazione della biga non è più fissa: la decide il motore in base
  // all'attesa e alle temperature. La ricetta fissa solo la farina e l'acqua.
  const pianoBiga = pianoDellaBiga(ricetta, opzioni);
  const idratazioneBiga = pianoBiga
    ? pianoBiga.idratazione / 100
    : richiediConfig(ricetta.idratazioneBiga, 'idratazioneBiga');

  const farinaBiga = farinaTotaleG * quotaBiga;
  const farinaRinfresco = farinaTotaleG - farinaBiga;
  const acquaBiga = farinaBiga * idratazioneBiga;
  const acquaTotale = farinaTotaleG * ricetta.idratazioneTotale;
  const lievito =
    lievitoFrescoBiga(ricetta, farinaBiga) * fattoreLievito(ricetta, opzioni);
  const olio = farinaTotaleG * ricetta.percentualeOlio;
  const sale = farinaTotaleG * ricetta.percentualeSale;
  const malto = farinaTotaleG * quotaMaltoSuFarinaTotale(ricetta);

  // Con il 100% di biga non resta farina per l'autolisi.
  const autolisi = usaAutolisi(ricetta, opzioni) && farinaRinfresco > 1e-9;
  const acquaAutolisi = autolisi
    ? farinaRinfresco * richiediConfig(ricetta.idratazioneAutolisi, 'idratazioneAutolisi')
    : 0;
  const acquaFinale = acquaTotale - acquaBiga - acquaAutolisi;

  if (acquaFinale < -1e-9) {
    throw new RangeError('La ripartizione dell’acqua non è valida.');
  }

  const biga = [
    riga('farina-biga', ricetta.farinaEtichetta, farinaBiga, 'farina', 'biga'),
    riga('acqua-biga', 'Acqua', acquaBiga, 'acqua', 'biga'),
    riga(
      'lievito',
      etichettaLievito(opzioni.tipoLievito),
      lievito,
      'lievito',
      'biga',
    ),
  ];

  const fasi: FaseCalcolata[] = [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: faseConfig(ricetta, 'biga')?.nota,
      avviso: faseConfig(ricetta, 'biga')?.avviso,
      voci: biga,
      totale: { etichetta: 'Totale biga pronta', grammi: somma(biga) },
    },
  ];

  let fasiFinali: IngredienteCalcolato[];
  let pesoAutolisiG: number | undefined;

  if (autolisi) {
    const autolisiVoci = [
      riga(
        'farina-autolisi',
        ricetta.farinaEtichetta,
        farinaRinfresco,
        'farina',
        'autolisi',
      ),
      riga('acqua-autolisi', 'Acqua', acquaAutolisi, 'acqua', 'autolisi'),
    ];
    const finale = [
      riga('acqua-finale', 'Acqua restante', acquaFinale, 'acqua', 'finale'),
      riga('malto', 'Malto diastasico', malto, 'malto', 'finale'),
      riga('sale', 'Sale', sale, 'sale', 'finale'),
      riga('olio', 'Olio extravergine', olio, 'olio', 'finale'),
    ];

    pesoAutolisiG = somma(autolisiVoci);
    fasi.push(
      {
        id: 'autolisi',
        titolo: 'Autolisi',
        nota: faseConfig(ricetta, 'autolisi')?.nota,
        voci: autolisiVoci,
        totale: { etichetta: 'Totale autolisi', grammi: pesoAutolisiG },
      },
      {
        id: 'finale',
        titolo: 'Impastamento finale',
        nota: faseConfig(ricetta, 'finale')?.nota,
        avviso: faseConfig(ricetta, 'finale')?.avviso,
        voci: finale,
      },
    );
    fasiFinali = finale;
  } else {
    const rinfresco = [
      ...(farinaRinfresco > 1e-9
        ? [
            riga(
              'farina-rinfresco',
              ricetta.farinaEtichetta,
              farinaRinfresco,
              'farina',
              'rinfresco',
            ),
          ]
        : []),
      riga('acqua-rinfresco', 'Acqua', acquaFinale, 'acqua', 'rinfresco'),
      riga('malto', 'Malto diastasico', malto, 'malto', 'rinfresco'),
      riga('sale', 'Sale', sale, 'sale', 'rinfresco'),
      riga('olio', 'Olio extravergine', olio, 'olio', 'rinfresco'),
    ];

    fasi.push({
      id: 'rinfresco',
      titolo: 'Rinfresco',
      nota: faseConfig(ricetta, 'rinfresco')?.nota,
      avviso: faseConfig(ricetta, 'rinfresco')?.avviso,
      voci: rinfresco,
    });
    fasiFinali = rinfresco;
  }

  const ingredienti = fasi.flatMap((fase) => fase.voci);
  const pesoImpasto = somma(ingredienti);

  return {
    fasi,
    ingredienti,
    farinaTotaleG,
    acquaTotaleG: acquaTotale,
    pesoImpastoG: pesoImpasto,
    fattorePeso: pesoImpasto / farinaTotaleG,
    pesoBigaG: somma(biga),
    pesoAutolisiG,
    acquaFinaleG: somma(fasiFinali.filter((voce) => voce.tipo === 'acqua')),
    pianoBiga: pianoBiga ?? undefined,
  };
}

function calcolaDiretto(
  ricetta: RicettaConfig,
  farinaTotaleG: number,
  opzioni: OpzioniRicetta,
): CalcoloBase {
  const lievitoFresco =
    farinaTotaleG *
    richiediConfig(ricetta.lievitoFrescoSuFarina, 'lievitoFrescoSuFarina');
  const acquaTotale = farinaTotaleG * ricetta.idratazioneTotale;
  const lievito = lievitoFresco * fattoreLievito(ricetta, opzioni);
  const sale = farinaTotaleG * ricetta.percentualeSale;
  const olio = farinaTotaleG * ricetta.percentualeOlio;
  const malto = farinaTotaleG * quotaMaltoSuFarinaTotale(ricetta);
  const miele = farinaTotaleG * (ricetta.percentualeMiele ?? 0);

  const voci: IngredienteCalcolato[] = [
    riga('farina', ricetta.farinaEtichetta, farinaTotaleG, 'farina', 'impasto'),
    riga('acqua', 'Acqua', acquaTotale, 'acqua', 'impasto'),
    riga(
      'lievito',
      etichettaLievito(opzioni.tipoLievito),
      lievito,
      'lievito',
      'impasto',
    ),
  ];

  if (ricetta.percentualeZucchero !== undefined) {
    voci.push(
      riga(
        'zucchero',
        'Zucchero',
        farinaTotaleG * ricetta.percentualeZucchero,
        'zucchero',
        'impasto',
      ),
    );
  }

  if (ricetta.percentualeMalto !== undefined) {
    voci.push(riga('malto', 'Malto diastasico', malto, 'malto', 'impasto'));
  }
  if (ricetta.percentualeMiele !== undefined) {
    voci.push(riga('miele', 'Miele', miele, 'miele', 'impasto'));
  }

  voci.push(
    riga('sale', 'Sale', sale, 'sale', 'impasto'),
    riga('olio', 'Olio extravergine', olio, 'olio', 'impasto'),
  );

  const pesoImpasto = somma(voci);

  return {
    fasi: [{ id: 'impasto', titolo: 'Impasto', voci }],
    ingredienti: voci,
    farinaTotaleG,
    acquaTotaleG: acquaTotale,
    pesoImpastoG: pesoImpasto,
    fattorePeso: pesoImpasto / farinaTotaleG,
  };
}

function calcolaBigaAutolisi(
  ricetta: RicettaConfig,
  farinaTotaleG: number,
  opzioni: OpzioniRicetta,
): CalcoloBase {
  const quotaBiga = richiediConfig(ricetta.quotaFarinaBiga, 'quotaFarinaBiga');
  const pianoBiga = pianoDellaBiga(ricetta, opzioni);
  const idratazioneBiga = pianoBiga
    ? pianoBiga.idratazione / 100
    : richiediConfig(ricetta.idratazioneBiga, 'idratazioneBiga');
  const idratazioneAutolisi = richiediConfig(
    ricetta.idratazioneAutolisi,
    'idratazioneAutolisi',
  );

  const farinaBiga = farinaTotaleG * quotaBiga;
  const acquaBiga = farinaBiga * idratazioneBiga;
  const lievito =
    lievitoFrescoBiga(ricetta, farinaBiga) * fattoreLievito(ricetta, opzioni);

  const farinaAutolisi = farinaTotaleG - farinaBiga;
  // Con il 100% di biga non resta farina per l'autolisi.
  const conAutolisi = usaAutolisi(ricetta, opzioni) && farinaAutolisi > 1e-9;
  const acquaAutolisi = conAutolisi
    ? farinaAutolisi * idratazioneAutolisi
    : 0;

  const acquaTotale = farinaTotaleG * ricetta.idratazioneTotale;
  const acquaFinale = acquaTotale - acquaBiga - acquaAutolisi;

  const olio = farinaTotaleG * ricetta.percentualeOlio;
  const sale = farinaTotaleG * ricetta.percentualeSale;
  const malto = farinaTotaleG * quotaMaltoSuFarinaTotale(ricetta);

  if (acquaFinale < -1e-9) {
    throw new RangeError('La ripartizione dell’acqua non è valida.');
  }

  const biga = [
    riga('farina-biga', ricetta.farinaEtichetta, farinaBiga, 'farina', 'biga'),
    riga('acqua-biga', 'Acqua', acquaBiga, 'acqua', 'biga'),
    riga(
      'lievito',
      etichettaLievito(opzioni.tipoLievito),
      lievito,
      'lievito',
      'biga',
    ),
  ];
  const autolisi = conAutolisi
    ? [
        riga(
          'farina-autolisi',
          ricetta.farinaEtichetta,
          farinaAutolisi,
          'farina',
          'autolisi',
        ),
        riga('acqua-autolisi', 'Acqua', acquaAutolisi, 'acqua', 'autolisi'),
      ]
    : [];

  // Senza autolisi la farina del rinfresco entra nell'impastamento finale.
  const finale = conAutolisi
    ? [
        riga('acqua-finale', 'Acqua restante', acquaFinale, 'acqua', 'finale'),
        riga('malto', 'Malto diastasico', malto, 'malto', 'finale'),
        riga('sale', 'Sale', sale, 'sale', 'finale'),
        riga('olio', 'Olio extravergine', olio, 'olio', 'finale'),
      ]
    : [
        ...(farinaAutolisi > 1e-9
          ? [
              riga(
                'farina-rinfresco',
                ricetta.farinaEtichetta,
                farinaAutolisi,
                'farina',
                'finale',
              ),
            ]
          : []),
        riga('acqua-finale', 'Acqua restante', acquaFinale, 'acqua', 'finale'),
        riga('malto', 'Malto diastasico', malto, 'malto', 'finale'),
        riga('sale', 'Sale', sale, 'sale', 'finale'),
        riga('olio', 'Olio extravergine', olio, 'olio', 'finale'),
      ];

  const pesoBiga = somma(biga);
  const pesoAutolisi = conAutolisi ? somma(autolisi) : undefined;

  const fasi: FaseCalcolata[] = [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: faseConfig(ricetta, 'biga')?.nota,
      avviso: faseConfig(ricetta, 'biga')?.avviso,
      voci: biga,
      totale: { etichetta: 'Totale biga pronta', grammi: pesoBiga },
    },
  ];

  if (conAutolisi) {
    fasi.push({
      id: 'autolisi',
      titolo: 'Autolisi',
      nota: faseConfig(ricetta, 'autolisi')?.nota,
      voci: autolisi,
      totale: {
        etichetta: 'Totale autolisi',
        grammi: pesoAutolisi ?? 0,
      },
    });
  }

  const senzaFarinaRinfresco = farinaAutolisi <= 1e-9;

  fasi.push({
    id: 'finale',
    titolo: 'Impastamento finale',
    nota: conAutolisi
      ? faseConfig(ricetta, 'finale')?.nota
      : senzaFarinaRinfresco
        ? 'Solo biga'
        : 'Biga + farina',
    avviso: conAutolisi
      ? faseConfig(ricetta, 'finale')?.avviso
      : senzaFarinaRinfresco
        ? 'Unisci tutta la biga e l’acqua restante.'
        : 'Unisci tutta la biga e la farina del rinfresco.',
    voci: finale,
  });

  const ingredienti = [...biga, ...autolisi, ...finale];
  const pesoImpasto = somma(ingredienti);

  return {
    fasi,
    ingredienti,
    farinaTotaleG,
    acquaTotaleG: acquaTotale,
    pesoImpastoG: pesoImpasto,
    fattorePeso: pesoImpasto / farinaTotaleG,
    pesoBigaG: pesoBiga,
    pesoAutolisiG: pesoAutolisi,
    acquaFinaleG: acquaFinale,
    pianoBiga: pianoBiga ?? undefined,
  };
}

/**
 * Deriva gli ingredienti da una farina totale in grammi.
 * Resta la funzione unica di calcolo: le modalità si limitano a ricavare la
 * farina totale e a leggere lo stesso risultato.
 */
export function calcolaDaFarinaTotale(
  ricetta: RicettaConfig,
  farinaTotaleG: number,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): CalcoloBase {
  richiediPositivo('La farina totale', farinaTotaleG);

  let base: CalcoloBase;
  switch (ricetta.famiglia) {
    case 'biga-rinfresco':
      base = calcolaBigaRinfresco(ricetta, farinaTotaleG, opzioni);
      break;
    case 'diretto':
      base = calcolaDiretto(ricetta, farinaTotaleG, opzioni);
      break;
    case 'biga-autolisi':
      base = calcolaBigaAutolisi(ricetta, farinaTotaleG, opzioni);
      break;
  }

  if (!Number.isFinite(base.pesoImpastoG) || base.pesoImpastoG <= 0) {
    throw new RangeError('I valori inseriti producono un risultato non valido.');
  }

  return base;
}

export function calcolaPerPanetti(
  ricetta: RicettaConfig,
  numeroPanetti: number,
  pesoPanettoG: number,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): RisultatoCalcolo {
  richiediPositivo('Il numero di panetti', numeroPanetti);
  if (!Number.isInteger(numeroPanetti)) {
    throw new RangeError('Il numero di panetti deve essere un numero intero.');
  }
  richiediPositivo('Il peso del panetto', pesoPanettoG);

  const fattore = derivaRicetta(ricetta, opzioni).fattorePeso;
  const pesoDesiderato = numeroPanetti * pesoPanettoG;
  const base = calcolaDaFarinaTotale(
    ricetta,
    pesoDesiderato / fattore,
    opzioni,
  );

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
    config: ricetta,
    modalita: 'panetti',
    datiPartenza: {
      modalita: 'panetti',
      numeroPanetti,
      pesoPanettoG,
    },
    numeroPanetti,
    pesoPanettoG,
    panettiInteri: null,
    residuoG: null,
    teglie: null,
    pesoPerTegliaG: null,
    stimaTeglie: null,
  };
}

function stimaTeglieDaFarina(
  ricetta: RicettaConfig,
  pesoImpastoG: number,
  latoA: number,
  latoB: number,
  opzioni: OpzioniRicetta,
): StimaTeglie {
  const farinaBase = richiediConfig(ricetta.farinaBaseG, 'farinaBaseG');
  const riferimento = ricetta.tegliaRiferimento ?? { latoA: 30, latoB: 40 };
  const areaBase = riferimento.latoA * riferimento.latoB;
  const area = latoA * latoB;
  const pesoPerTeglia = calcolaDaFarinaTotale(
    ricetta,
    farinaBase * (area / areaBase),
    opzioni,
  ).pesoImpastoG;

  const intere = Math.floor(pesoImpastoG / pesoPerTeglia);
  return {
    latoA,
    latoB,
    intere,
    residuoG: pesoImpastoG - intere * pesoPerTeglia,
    pesoPerTegliaG: pesoPerTeglia,
  };
}

export function calcolaPerFarina(
  ricetta: RicettaConfig,
  farinaKg: number,
  pesoPanettoG: number | null = null,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
  stimaTeglia: { latoA: number; latoB: number } | null = null,
): RisultatoCalcolo {
  richiediPositivo('La farina', farinaKg);
  if (pesoPanettoG !== null) {
    richiediPositivo('Il peso del panetto', pesoPanettoG);
  }

  const farinaTotaleG = farinaKg * 1000;
  const base = calcolaDaFarinaTotale(ricetta, farinaTotaleG, opzioni);

  let panettiInteri: number | null = null;
  let residuoG: number | null = null;
  let stimaTeglie: StimaTeglie | null = null;

  if (pesoPanettoG !== null && ricetta.famiglia !== 'diretto') {
    panettiInteri = Math.floor(base.pesoImpastoG / pesoPanettoG);
    residuoG = base.pesoImpastoG - panettiInteri * pesoPanettoG;
  }

  if (stimaTeglia && ricetta.famiglia === 'diretto') {
    stimaTeglie = stimaTeglieDaFarina(
      ricetta,
      base.pesoImpastoG,
      stimaTeglia.latoA,
      stimaTeglia.latoB,
      opzioni,
    );
  }

  // Calcolatore misto partendo dalla farina: l'impasto ottenuto si rapporta
  // alle pezzature di riferimento di ogni formato, con l'avanzo che ne resta.
  const configurazione = ricetta.prodotti ?? [];
  const prodotti: ProdottoScelto[] | undefined =
    configurazione.length > 0
      ? configurazione.map((prodotto) => {
          const quantita = Math.floor(
            base.pesoImpastoG / prodotto.pesoBaseG,
          );
          const subtotaleG = quantita * prodotto.pesoBaseG;

          return {
            id: prodotto.id,
            nome: prodotto.nome,
            quantita,
            pesoG: prodotto.pesoBaseG,
            subtotaleG,
            residuoG: base.pesoImpastoG - subtotaleG,
          };
        })
      : undefined;

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
    config: ricetta,
    modalita: 'farina',
    datiPartenza: {
      modalita: 'farina',
      farinaKg,
      pesoPanettoG,
      stimaTeglia,
    },
    numeroPanetti: null,
    pesoPanettoG,
    panettiInteri,
    residuoG,
    teglie: null,
    pesoPerTegliaG: null,
    stimaTeglie,
    prodotti,
  };
}

export function calcolaPerTeglie(
  ricetta: RicettaConfig,
  latoA: number,
  latoB: number,
  numeroTeglie: number,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): RisultatoCalcolo {
  const riferimento = ricetta.tegliaRiferimento;
  // Le ricette dirette partono da una dose fissa di farina; quelle con biga
  // partono dal peso dell'impasto, che resta esatto qualunque sia il lievito.
  const farinaBaseG =
    ricetta.farinaBaseG ??
    (ricetta.pesoImpastoTegliaG != null
      ? ricetta.pesoImpastoTegliaG / derivaRicetta(ricetta, opzioni).fattorePeso
      : undefined);

  if (!riferimento || farinaBaseG === undefined) {
    throw new Error('Questa ricetta non supporta il calcolo per teglie.');
  }
  richiediPositivo('Il primo lato della teglia', latoA);
  richiediPositivo('Il secondo lato della teglia', latoB);
  richiediPositivo('Il numero di teglie', numeroTeglie);
  if (!Number.isInteger(numeroTeglie)) {
    throw new RangeError('Il numero di teglie deve essere un numero intero.');
  }

  const areaBase = riferimento.latoA * riferimento.latoB;
  const areaTeglia = latoA * latoB;
  const fattorePerTeglia = areaTeglia / areaBase;
  const fattoreTotale = fattorePerTeglia * numeroTeglie;
  const farinaTotaleG = farinaBaseG * fattoreTotale;
  const base = calcolaDaFarinaTotale(ricetta, farinaTotaleG, opzioni);

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
    config: ricetta,
    modalita: 'teglie',
    datiPartenza: {
      modalita: 'teglie',
      latoA,
      latoB,
      numeroTeglie,
    },
    numeroPanetti: null,
    pesoPanettoG: null,
    panettiInteri: null,
    residuoG: null,
    teglie: {
      latoA,
      latoB,
      numeroTeglie,
      areaCm2: areaTeglia,
      areaRiferimentoCm2: areaBase,
    },
    pesoPerTegliaG: base.pesoImpastoG / numeroTeglie,
    stimaTeglie: null,
  };
}

/** Riga del calcolatore misto: prodotto scelto, quantità e peso del pezzo. */
export interface RigaProdottoCalcolo {
  id: string;
  quantita: number;
  pesoG: number;
}

/**
 * Calcolatore misto: il peso complessivo dei formati scelti determina la farina
 * e quindi un unico impasto. Il peso per pezzo non è un limite culinario: si
 * controlla solo che sia un numero positivo.
 */
export function calcolaPerProdotti(
  ricetta: RicettaConfig,
  righe: readonly RigaProdottoCalcolo[],
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): RisultatoCalcolo {
  const configurazione = ricetta.prodotti;
  if (!configurazione || configurazione.length === 0) {
    throw new Error('Questa ricetta non prevede il calcolo per prodotti.');
  }

  const scelti = righe.filter((riga) => riga.quantita > 0);
  if (scelti.length === 0) {
    throw new RangeError('Indica almeno un prodotto.');
  }

  const prodotti: ProdottoScelto[] = scelti.map((riga) => {
    const prodotto = configurazione.find((voce) => voce.id === riga.id);
    if (!prodotto) {
      throw new Error(`Prodotto non previsto dalla ricetta: ${riga.id}.`);
    }
    if (!Number.isInteger(riga.quantita) || riga.quantita <= 0) {
      throw new RangeError('La quantità deve essere un numero intero positivo.');
    }
    richiediPositivo('Il peso del pezzo', riga.pesoG);

    return {
      id: prodotto.id,
      nome: prodotto.nome,
      quantita: riga.quantita,
      pesoG: riga.pesoG,
      subtotaleG: riga.quantita * riga.pesoG,
    };
  });

  const pesoProdottiG = prodotti.reduce(
    (totale, prodotto) => totale + prodotto.subtotaleG,
    0,
  );
  const fattore = derivaRicetta(ricetta, opzioni).fattorePeso;
  const base = calcolaDaFarinaTotale(
    ricetta,
    pesoProdottiG / fattore,
    opzioni,
  );

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
    config: ricetta,
    modalita: 'prodotti',
    datiPartenza: { modalita: 'prodotti', prodotti },
    numeroPanetti: null,
    pesoPanettoG: null,
    panettiInteri: null,
    residuoG: null,
    teglie: null,
    pesoPerTegliaG: null,
    stimaTeglie: null,
    prodotti,
    pesoProdottiG,
  };
}

/** Somma degli ingredienti: usata per coerenza e test. */
export function sommaIngredienti(risultato: RisultatoCalcolo): number {
  return somma(risultato.ingredienti);
}
