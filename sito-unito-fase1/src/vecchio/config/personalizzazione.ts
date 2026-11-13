import type {
  OpzioniRicetta,
  ParametriRicetta,
  RicettaConfig,
  TipoLievito,
} from '../types';
import { fattoreLievito, opzioniIniziali, usaAutolisi } from './ricette';

export type { ParametriRicetta };

export type ChiaveParametro = keyof ParametriRicetta;

export interface CampoParametro {
  chiave: ChiaveParametro;
  etichetta: string;
  /** Base di calcolo dichiarata accanto all'etichetta. */
  base: string;
  min: number;
  max: number;
  passo: number;
  decimali: number;
}

interface Intervallo {
  min: number;
  max: number;
  passo: number;
  decimali: number;
}

const IDRATAZIONE: Intervallo = { min: 0, max: 100, passo: 1, decimali: 0 };
const PERCENTUALE: Intervallo = { min: 0, max: 10, passo: 0.1, decimali: 2 };
const BIGA: Intervallo = { min: 25, max: 100, passo: 1, decimali: 0 };

const INTERVALLI: Record<
  string,
  Partial<Record<ChiaveParametro, Intervallo>>
> = {
  'pizza-teglia-biga-85': {
    // Il cursore arriva dove arriva il tetto sicuro della ricetta (88%), così
    // non esiste un intervallo raggiungibile senza controllo.
    idratazioneTotale: { min: 70, max: 88, passo: 1, decimali: 0 },
    percentualeBiga: { min: 25, max: 100, passo: 1, decimali: 0 },
    idratazioneAutolisi: { min: 50, max: 70, passo: 1, decimali: 0 },
    percentualeMalto: { min: 0, max: 3, passo: 0.1, decimali: 2 },
    percentualeSale: { min: 1, max: 4, passo: 0.1, decimali: 2 },
    percentualeOlio: { min: 0, max: 8, passo: 0.1, decimali: 2 },
  },
  'trancio-milanese': {
    idratazioneTotale: { min: 55, max: 70, passo: 1, decimali: 0 },
    percentualeMalto: { min: 0, max: 2, passo: 0.1, decimali: 2 },
    percentualeMiele: { min: 0, max: 4, passo: 0.1, decimali: 2 },
    percentualeSale: { min: 1, max: 4, passo: 0.1, decimali: 2 },
    percentualeOlio: { min: 0, max: 8, passo: 0.1, decimali: 2 },
  },
  'pizza-contemporanea-con-biga-77': {
    idratazioneTotale: { min: 65, max: 80, passo: 1, decimali: 0 },
    percentualeBiga: { min: 25, max: 100, passo: 1, decimali: 0 },
    idratazioneAutolisi: { min: 50, max: 70, passo: 1, decimali: 0 },
    percentualeMalto: { min: 0, max: 3, passo: 0.1, decimali: 2 },
    percentualeSale: { min: 1, max: 4, passo: 0.1, decimali: 2 },
    percentualeOlio: { min: 0, max: 8, passo: 0.1, decimali: 2 },
  },
};

/** Intervalli del lievito del Trancio, per tipo selezionato. */
const INTERVALLI_LIEVITO: Record<TipoLievito, Intervallo> = {
  fresco: { min: 0.1, max: 3, passo: 0.05, decimali: 2 },
  secco: { min: 0.1, max: 2, passo: 0.05, decimali: 2 },
};

function intervallo(
  ricetta: RicettaConfig,
  chiave: ChiaveParametro,
): Intervallo {
  const range = INTERVALLI[ricetta.id]?.[chiave];
  if (range) return range;
  if (chiave === 'percentualeBiga') return { ...BIGA };
  return chiave.startsWith('idratazione')
    ? { ...IDRATAZIONE }
    : { ...PERCENTUALE };
}

function lievitoPercentuale(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
): number {
  if (ricetta.famiglia === 'diretto') {
    return (
      (ricetta.lievitoFrescoSuFarina ?? 0) *
      fattoreLievito(ricetta, opzioni) *
      100
    );
  }
  return (ricetta.lievitoFrescoSuFarinaBiga ?? 0) * 100;
}

/** Valori iniziali: quelli originali della ricetta, senza arrotondamenti. */
export function parametriIniziali(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta = opzioniIniziali(ricetta),
): ParametriRicetta {
  return {
    idratazioneTotale: ricetta.idratazioneTotale * 100,
    percentualeBiga: (ricetta.quotaFarinaBiga ?? 0) * 100,
    idratazioneAutolisi: (ricetta.idratazioneAutolisi ?? 0) * 100,
    percentualeMalto: (ricetta.percentualeMalto ?? 0) * 100,
    percentualeMiele: (ricetta.percentualeMiele ?? 0) * 100,
    percentualeSale: ricetta.percentualeSale * 100,
    percentualeOlio: ricetta.percentualeOlio * 100,
    lievito: lievitoPercentuale(ricetta, opzioni),
  };
}

function etichettaBaseMalto(ricetta: RicettaConfig): string {
  return ricetta.famiglia === 'diretto'
    ? 'farina totale'
    : 'farina della biga';
}

/** Campi mostrati nel pannello, nell'ordine del pannello stesso. */
export function campiParametri(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
): CampoParametro[] {
  const campi: CampoParametro[] = [];

  const aggiungi = (
    chiave: ChiaveParametro,
    etichetta: string,
    base: string,
    range: Intervallo,
  ) => {
    campi.push({ chiave, etichetta, base, ...range });
  };

  aggiungi(
    'idratazioneTotale',
    'Idratazione',
    'farina totale',
    intervallo(ricetta, 'idratazioneTotale'),
  );

  if (ricetta.quotaFarinaBiga !== undefined) {
    aggiungi(
      'percentualeBiga',
      '% biga',
      'farina totale',
      intervallo(ricetta, 'percentualeBiga'),
    );
  }

  if (ricetta.famiglia === 'diretto') {
    aggiungi(
      'lievito',
      opzioni.tipoLievito === 'secco' ? 'Lievito secco' : 'Lievito fresco',
      'farina totale',
      INTERVALLI_LIEVITO[opzioni.tipoLievito],
    );
  }

  if (usaAutolisi(ricetta, opzioni) && ricetta.idratazioneAutolisi !== undefined) {
    aggiungi(
      'idratazioneAutolisi',
      'Idratazione autolisi',
      'farina dell’autolisi',
      intervallo(ricetta, 'idratazioneAutolisi'),
    );
  }

  if (ricetta.percentualeMalto !== undefined) {
    aggiungi(
      'percentualeMalto',
      'Malto diastasico',
      etichettaBaseMalto(ricetta),
      intervallo(ricetta, 'percentualeMalto'),
    );
  }

  if (ricetta.percentualeMiele !== undefined) {
    aggiungi(
      'percentualeMiele',
      'Miele',
      'farina totale',
      intervallo(ricetta, 'percentualeMiele'),
    );
  }

  aggiungi(
    'percentualeSale',
    'Sale',
    'farina totale',
    intervallo(ricetta, 'percentualeSale'),
  );
  aggiungi(
    'percentualeOlio',
    'Olio extravergine',
    'farina totale',
    intervallo(ricetta, 'percentualeOlio'),
  );

  return campi;
}

/**
 * Configurazione effettiva usata dal calcolo e dalle esportazioni.
 * Riparte dalla ricetta originale e sostituisce solo le percentuali
 * personalizzabili, così formule, fasi e testi restano quelli esistenti.
 */
/**
 * Frazione della percentuale, mantenendo il valore originale quando il
 * parametro coincide: così il ripristino restituisce risultati identici.
 */
function frazione(parametro: number, originale: number): number {
  const valore = parametro / 100;
  return Math.abs(valore - originale) < 1e-9 ? originale : valore;
}

export function configPersonalizzata(
  ricetta: RicettaConfig,
  parametri: ParametriRicetta,
  opzioni: OpzioniRicetta,
): RicettaConfig {
  const config: RicettaConfig = {
    ...ricetta,
    motoreBiga: ricetta.motoreBiga ? opzioni.biga ?? ricetta.motoreBiga : undefined,
    idratazioneTotale: frazione(
      parametri.idratazioneTotale,
      ricetta.idratazioneTotale,
    ),
    // La quota della biga resta quella originale nelle ricette dirette.
    quotaFarinaBiga:
      ricetta.quotaFarinaBiga === undefined
        ? undefined
        : frazione(parametri.percentualeBiga, ricetta.quotaFarinaBiga),
    percentualeSale: frazione(
      parametri.percentualeSale,
      ricetta.percentualeSale,
    ),
    percentualeOlio: frazione(
      parametri.percentualeOlio,
      ricetta.percentualeOlio,
    ),
  };

  if (ricetta.idratazioneAutolisi !== undefined) {
    config.idratazioneAutolisi = frazione(
      parametri.idratazioneAutolisi,
      ricetta.idratazioneAutolisi,
    );
  }

  if (ricetta.percentualeMalto !== undefined) {
    config.percentualeMalto = frazione(
      parametri.percentualeMalto,
      ricetta.percentualeMalto,
    );
  }

  if (ricetta.percentualeMiele !== undefined) {
    config.percentualeMiele = frazione(
      parametri.percentualeMiele,
      ricetta.percentualeMiele,
    );
  }

  if (ricetta.famiglia === 'diretto') {
    // Il calcolo ricava il lievito secco dal fresco: la dose scelta per il
    // tipo selezionato viene riportata alla base fresca equivalente.
    const baseFresca = ricetta.lievitoFrescoSuFarina ?? 0;
    const dose =
      opzioni.tipoLievito === 'secco'
        ? parametri.lievito / 100 / ricetta.fattoreLievitoSecco
        : parametri.lievito / 100;
    config.lievitoFrescoSuFarina =
      Math.abs(dose - baseFresca) < 1e-9 ? baseFresca : dose;
  }

  return config;
}

/** Valore arrotondato e riportato nell'intervallo del campo. */
export function limitaParametro(campo: CampoParametro, valore: number): number {
  if (!Number.isFinite(valore)) return campo.min;
  const limitato = Math.min(campo.max, Math.max(campo.min, valore));
  const fattore = 10 ** campo.decimali;
  return Math.round(limitato * fattore) / fattore;
}

/** Testo del valore nel campo, con la virgola italiana. */
export function formattaParametro(
  valore: number,
  decimali: number,
): string {
  return new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: decimali,
    minimumFractionDigits: 0,
  }).format(valore);
}

/** Interpreta il testo digitato, accettando virgola o punto. */
export function leggiParametro(testo: string): number | null {
  const pulito = testo.trim().replace(',', '.');
  if (pulito === '') return null;
  const numero = Number(pulito);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Un parametro è personalizzato quando differisce dal valore originale,
 * confrontando ciò che l'utente vede nel campo.
 */
export function parametroDiverso(
  campo: CampoParametro,
  parametri: ParametriRicetta,
  iniziali: ParametriRicetta,
): boolean {
  return (
    formattaParametro(parametri[campo.chiave], campo.decimali) !==
    formattaParametro(iniziali[campo.chiave], campo.decimali)
  );
}

/** Vero quando almeno un parametro visibile differisce dall'originale. */
export function ricettaPersonalizzata(
  ricetta: RicettaConfig,
  parametri: ParametriRicetta,
  opzioni: OpzioniRicetta,
): boolean {
  const iniziali = parametriIniziali(ricetta, opzioni);
  return campiParametri(ricetta, opzioni).some((campo) =>
    parametroDiverso(campo, parametri, iniziali),
  );
}

/**
 * Converte la dose di lievito quando si cambia tipo, con il fattore già usato
 * dalla ricetta, riportandola nell'intervallo del nuovo tipo.
 */
export function convertiLievito(
  ricetta: RicettaConfig,
  parametri: ParametriRicetta,
  da: TipoLievito,
  a: TipoLievito,
): ParametriRicetta {
  if (da === a) return parametri;

  const { min, max } = INTERVALLI_LIEVITO[a];
  const frazione = parametri.lievito / 100;
  const convertita =
    a === 'secco'
      ? frazione * ricetta.fattoreLievitoSecco * 100
      : (frazione / ricetta.fattoreLievitoSecco) * 100;

  // La dose convertita resta esatta: si limita solo ai bordi dell'intervallo,
  // così il cambio di tipo non altera il dosaggio originale.
  const limitata = Number.isFinite(convertita)
    ? Math.min(max, Math.max(min, convertita))
    : min;

  return { ...parametri, lievito: limitata };
}

/** Riporta i parametri salvati nelle forme e negli intervalli previsti. */
export function sanificaParametri(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
  grezzo: Record<string, unknown>,
): ParametriRicetta {
  const iniziali = parametriIniziali(ricetta, opzioni);
  const campi = campiParametri(ricetta, opzioni);
  const parametri: ParametriRicetta = { ...iniziali };

  for (const chiave of Object.keys(iniziali) as ChiaveParametro[]) {
    const campo = campi.find((voce) => voce.chiave === chiave);
    // La quota della biga esiste solo nelle ricette con biga.
    if (chiave === 'percentualeBiga' && campo === undefined) continue;
    const valore = grezzo[chiave];
    if (typeof valore !== 'number' || !Number.isFinite(valore)) continue;
    parametri[chiave] = campo ? limitaParametro(campo, valore) : valore;
  }

  return parametri;
}
