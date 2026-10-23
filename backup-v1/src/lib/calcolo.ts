import {
  derivaRicetta,
  etichettaLievito,
  fattoreLievito,
  opzioniIniziali,
  usaAutolisi,
} from '../config/ricette';
import type {
  FaseCalcolata,
  IngredienteCalcolato,
  OpzioniRicetta,
  RicettaConfig,
  RisultatoCalcolo,
  StimaTeglie,
  TipoIngrediente,
} from '../types';

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
  const idratazioneBiga = richiediConfig(
    ricetta.idratazioneBiga,
    'idratazioneBiga',
  );

  const farinaBiga = farinaTotaleG * quotaBiga;
  const farinaRinfresco = farinaTotaleG - farinaBiga;
  const acquaBiga = farinaBiga * idratazioneBiga;
  const acquaTotale = farinaTotaleG * ricetta.idratazioneTotale;
  const lievito =
    lievitoFrescoBiga(ricetta, farinaBiga) * fattoreLievito(ricetta, opzioni);
  const olio = farinaTotaleG * ricetta.percentualeOlio;
  const sale = farinaTotaleG * ricetta.percentualeSale;
  const malto = farinaTotaleG * (ricetta.percentualeMalto ?? 0);

  const autolisi = usaAutolisi(ricetta, opzioni);
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
      riga(
        'farina-rinfresco',
        ricetta.farinaEtichetta,
        farinaRinfresco,
        'farina',
        'rinfresco',
      ),
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
  const malto = farinaTotaleG * (ricetta.percentualeMalto ?? 0);
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
  const idratazioneBiga = richiediConfig(
    ricetta.idratazioneBiga,
    'idratazioneBiga',
  );
  const idratazioneAutolisi = richiediConfig(
    ricetta.idratazioneAutolisi,
    'idratazioneAutolisi',
  );

  const farinaBiga = farinaTotaleG * quotaBiga;
  const acquaBiga = farinaBiga * idratazioneBiga;
  const lievito =
    lievitoFrescoBiga(ricetta, farinaBiga) * fattoreLievito(ricetta, opzioni);

  const farinaAutolisi = farinaTotaleG - farinaBiga;
  const acquaAutolisi = farinaAutolisi * idratazioneAutolisi;

  const acquaTotale = farinaTotaleG * ricetta.idratazioneTotale;
  const acquaFinale = acquaTotale - acquaBiga - acquaAutolisi;

  const olio = farinaTotaleG * ricetta.percentualeOlio;
  const sale = farinaTotaleG * ricetta.percentualeSale;
  const malto = farinaTotaleG * (ricetta.percentualeMalto ?? 0);

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
  const autolisi = [
    riga(
      'farina-autolisi',
      ricetta.farinaEtichetta,
      farinaAutolisi,
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

  const pesoBiga = somma(biga);
  const pesoAutolisi = somma(autolisi);

  return {
    fasi: [
      {
        id: 'biga',
        titolo: 'Biga',
        nota: faseConfig(ricetta, 'biga')?.nota,
        avviso: faseConfig(ricetta, 'biga')?.avviso,
        voci: biga,
        totale: { etichetta: 'Totale biga pronta', grammi: pesoBiga },
      },
      {
        id: 'autolisi',
        titolo: 'Autolisi',
        nota: faseConfig(ricetta, 'autolisi')?.nota,
        voci: autolisi,
        totale: { etichetta: 'Totale autolisi', grammi: pesoAutolisi },
      },
      {
        id: 'finale',
        titolo: 'Impastamento finale',
        nota: faseConfig(ricetta, 'finale')?.nota,
        avviso: faseConfig(ricetta, 'finale')?.avviso,
        voci: finale,
      },
    ],
    ingredienti: [...biga, ...autolisi, ...finale],
    farinaTotaleG,
    acquaTotaleG: acquaTotale,
    pesoImpastoG: somma([...biga, ...autolisi, ...finale]),
    fattorePeso: somma([...biga, ...autolisi, ...finale]) / farinaTotaleG,
    pesoBigaG: pesoBiga,
    pesoAutolisiG: pesoAutolisi,
    acquaFinaleG: acquaFinale,
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

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
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
  };
}

export function calcolaPerTeglie(
  ricetta: RicettaConfig,
  latoA: number,
  latoB: number,
  numeroTeglie: number,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): RisultatoCalcolo {
  if (ricetta.famiglia !== 'diretto' || !ricetta.tegliaRiferimento) {
    throw new Error('Questa ricetta non supporta il calcolo per teglie.');
  }
  richiediPositivo('Il primo lato della teglia', latoA);
  richiediPositivo('Il secondo lato della teglia', latoB);
  richiediPositivo('Il numero di teglie', numeroTeglie);
  if (!Number.isInteger(numeroTeglie)) {
    throw new RangeError('Il numero di teglie deve essere un numero intero.');
  }

  const riferimento = ricetta.tegliaRiferimento;
  const areaBase = riferimento.latoA * riferimento.latoB;
  const areaTeglia = latoA * latoB;
  const fattorePerTeglia = areaTeglia / areaBase;
  const fattoreTotale = fattorePerTeglia * numeroTeglie;
  const farinaTotaleG =
    richiediConfig(ricetta.farinaBaseG, 'farinaBaseG') * fattoreTotale;
  const base = calcolaDaFarinaTotale(ricetta, farinaTotaleG, opzioni);

  return {
    ...base,
    ricettaId: ricetta.id,
    famiglia: ricetta.famiglia,
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

/** Somma degli ingredienti: usata per coerenza e test. */
export function sommaIngredienti(risultato: RisultatoCalcolo): number {
  return somma(risultato.ingredienti);
}
