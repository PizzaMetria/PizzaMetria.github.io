import type {
  PassoProcedimento,
  RicettaConfig,
  RisultatoCalcolo,
} from '../types';
import {
  formattaGrammi,
  formattaGrammiIngrediente,
  formattaIntero,
} from './formato';
import { grammiDi } from './vista';

interface Porzioni {
  numero: number | null;
  peso: number | null;
}

/** Numero e peso delle porzioni, ricavati dai dati del calcolatore. */
function porzioni(risultato: RisultatoCalcolo): Porzioni {
  if (risultato.modalita === 'teglie') {
    return {
      numero: risultato.teglie?.numeroTeglie ?? null,
      peso: risultato.pesoPerTegliaG,
    };
  }

  const numero =
    risultato.modalita === 'panetti'
      ? risultato.numeroPanetti
      : risultato.panettiInteri;

  return { numero, peso: risultato.pesoPanettoG };
}

/** Istruzione di staglio coerente con la modalità di calcolo attiva. */
function formazionePanetti(risultato: RisultatoCalcolo): string {
  const { numero, peso } = porzioni(risultato);

  if (numero === null || numero <= 0 || peso === null) {
    return 'Dividi l’impasto nella pezzatura desiderata e forma i panetti.';
  }

  if (numero === 1) {
    return `L’impasto corrisponde a una porzione unica da ${formattaGrammi(
      peso,
    )}: formala in un unico panetto.`;
  }

  if (risultato.modalita === 'teglie') {
    return `Dividi l’impasto in ${formattaIntero(
      numero,
    )} porzioni da ${formattaGrammi(peso)} ciascuna, una per teglia.`;
  }

  const istruzione = `Forma ${formattaIntero(
    numero,
  )} panetti da ${formattaGrammi(peso)}.`;

  if (
    risultato.modalita === 'farina' &&
    risultato.residuoG !== null &&
    risultato.residuoG >= 1
  ) {
    return `${istruzione} Con il resto dell’impasto puoi formare una porzione più piccola.`;
  }

  return istruzione;
}

/** Divisione in porzioni e formatura, con testo corretto anche per una sola. */
function divisionePorzioni(risultato: RisultatoCalcolo): string {
  const { numero, peso } = porzioni(risultato);

  if (numero === null || numero <= 0 || peso === null) {
    return 'Dividilo quindi nelle porzioni previste e forma i panetti.';
  }

  if (numero === 1) {
    return `Forma quindi un unico panetto da circa ${formattaGrammi(peso)}.`;
  }

  return `Dividilo quindi in ${formattaIntero(
    numero,
  )} porzioni da circa ${formattaGrammi(peso)} ciascuna e forma i panetti.`;
}

/**
 * Acqua dell'impasto diretto: gli 8/9 iniziali e il resto aggiunto alla fine.
 * I grammi mostrati sono coerenti fra loro e con il totale visualizzato.
 */
function acquaImpasto(risultato: RisultatoCalcolo): {
  iniziale: string;
  finale: string;
} {
  const totale = Math.round(risultato.acquaTotaleG);
  const iniziale = Math.round((risultato.acquaTotaleG * 8) / 9);

  return {
    iniziale: `${formattaIntero(iniziale)} g`,
    finale: `${formattaIntero(totale - iniziale)} g`,
  };
}

/** Pieghe e prima lievitazione: divisione solo quando le porzioni sono più di una. */
function pieghePrimaLievitazione(risultato: RisultatoCalcolo): string {
  const { numero, peso } = porzioni(risultato);
  const coda =
    'Lascia lievitare fino quasi al raddoppio: considera circa un’ora, regolando l’attesa in base allo sviluppo dell’impasto e alla temperatura ambiente.';

  if (numero !== null && numero > 1 && peso !== null) {
    return `Dopo il riposo, esegui un giro di pieghe. Dividi l’impasto in ${formattaIntero(
      numero,
    )} porzioni da circa ${formattaGrammi(
      peso,
    )} ciascuna. Ungi leggermente il piano di lavoro e la superficie delle porzioni, quindi copri ciascuna con una ciotola capovolta. ${coda}`;
  }

  return `Dopo il riposo, esegui un giro di pieghe. Ungi leggermente il piano di lavoro e la superficie dell’impasto, quindi coprilo con una ciotola capovolta. ${coda}`;
}

/** Trasferimento in teglia, al singolare o per ogni porzione. */
function stesuraTeglie(risultato: RisultatoCalcolo): string {
  const { numero, peso } = porzioni(risultato);

  if (numero !== null && numero > 1 && peso !== null) {
    return 'Ungi bene le teglie. Trasferisci ogni porzione capovolgendola: la parte che durante il riposo era rivolta verso l’alto deve andare a contatto con il fondo. Allargala delicatamente in due o tre riprese, con brevi pause tra una e l’altra per permetterle di rilassarsi.';
  }

  return 'Ungi bene la teglia. Trasferisci l’impasto capovolgendolo: la parte che durante il riposo era rivolta verso l’alto deve andare a contatto con il fondo. Allargalo delicatamente in due o tre riprese, con brevi pause tra una e l’altra per permettergli di rilassarsi.';
}

/**
 * Risolve i segnaposto del procedimento con le dosi effettive del calcolo.
 * Unica fonte per PDF e per un'eventuale vista del procedimento nel sito.
 */
export function componiProcedimento(
  ricetta: RicettaConfig,
  risultato: RisultatoCalcolo,
): PassoProcedimento[] {
  const grammi = (chiave: string, tipo: 'farina' | 'acqua' | 'lievito') =>
    formattaGrammiIngrediente(grammiDi(risultato, chiave), tipo);

  const acqua = acquaImpasto(risultato);

  const valori: Record<string, string> = {
    farinaBiga: grammi('farina-biga', 'farina'),
    acquaBiga: grammi('acqua-biga', 'acqua'),
    lievito: grammi('lievito', 'lievito'),
    farinaAutolisi: grammi('farina-autolisi', 'farina'),
    acquaAutolisi: grammi('acqua-autolisi', 'acqua'),
    farinaRinfresco: grammi('farina-rinfresco', 'farina'),
    acquaRinfresco: grammi('acqua-rinfresco', 'acqua'),
    acquaFinale: grammi('acqua-finale', 'acqua'),
    acquaTotale: formattaGrammiIngrediente(risultato.acquaTotaleG, 'acqua'),
    formazionePanetti: formazionePanetti(risultato),
    divisionePorzioni: divisionePorzioni(risultato),
    acquaImpastoIniziale: acqua.iniziale,
    acquaImpastoFinale: acqua.finale,
    pieghePrimaLievitazione: pieghePrimaLievitazione(risultato),
    stesuraTeglie: stesuraTeglie(risultato),
  };

  const autolisi = risultato.fasi.some((fase) => fase.id === 'autolisi');

  return ricetta.procedimento
    .filter(
      (passo) =>
        passo.condizione === undefined ||
        (passo.condizione === 'autolisi') === autolisi,
    )
    .map((passo) => ({
      ...passo,
      paragrafi: passo.paragrafi.map((paragrafo) =>
        paragrafo.replace(/\{([a-zA-Z]+)\}/g, (_intero, chiave: string) => {
          const valore = valori[chiave];
          if (valore === undefined) {
            throw new Error(`Segnaposto sconosciuto nel procedimento: ${chiave}`);
          }
          return valore;
        }),
      ),
    }));
}
