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

/** Istruzione di staglio coerente con la modalità di calcolo attiva. */
function formazionePanetti(risultato: RisultatoCalcolo): string {
  const numero =
    risultato.modalita === 'panetti'
      ? risultato.numeroPanetti
      : risultato.panettiInteri;

  if (numero !== null && numero > 0 && risultato.pesoPanettoG !== null) {
    const istruzione = `Forma ${formattaIntero(
      numero,
    )} panetti da ${formattaGrammi(risultato.pesoPanettoG)}.`;

    if (
      risultato.modalita === 'farina' &&
      risultato.residuoG !== null &&
      risultato.residuoG >= 1
    ) {
      return `${istruzione} Con il resto dell’impasto puoi formare una porzione più piccola.`;
    }

    return istruzione;
  }

  return 'Dividi l’impasto nella pezzatura desiderata e forma i panetti.';
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
