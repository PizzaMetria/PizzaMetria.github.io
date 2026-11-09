import type {
  PassoProcedimento,
  ProdottoScelto,
  RicettaConfig,
  RisultatoCalcolo,
  TipoIngrediente,
} from '../types';
import {
  formattaGrammi,
  formattaGrammiIngrediente,
  formattaIntero,
  formattaNumero,
} from './formato';
import { grammiDi, testoMaturazione } from './vista';

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

/**
 * Pezzature del calcolatore misto, nella forma «1 pezzo da 200 g,
 * 5 pezzi da 90 g». Solo i formati effettivamente indicati entrano nell'elenco.
 */
function pezzature(prodotti: readonly ProdottoScelto[]): string {
  return prodotti
    .map(
      (prodotto) =>
        `${formattaIntero(prodotto.quantita)} ${
          prodotto.quantita === 1 ? 'pezzo' : 'pezzi'
        } da ${formattaGrammi(prodotto.pesoG)}`,
    )
    .join(', ');
}

/**
 * Divisione dell'impasto nel calcolatore misto. Con i formati scelti elenca le
 * pezzature; partendo dalla farina resta sul riferimento della ricetta, perché
 * i formati si decidono dopo.
 */
function divisioneFormati(
  ricetta: RicettaConfig,
  risultato: RisultatoCalcolo,
): string {
  if (risultato.modalita === 'prodotti') {
    return `Dividi l’impasto nelle pezzature scelte (${pezzature(
      risultato.prodotti ?? [],
    )}) e forma secondo i prodotti.`;
  }

  const riferimento = (ricetta.prodotti ?? [])
    .map(
      (prodotto) =>
        `${prodotto.singolare} ${formattaGrammi(prodotto.pesoBaseG)}`,
    )
    .join(', ');

  return `Dividi l’impasto secondo i formati che vuoi preparare: le pezzature di riferimento sono ${riferimento}.`;
}

/** Ripartizione dell'olio dell'impasto diretto in tre riprese uguali. */
function olioRiprese(risultato: RisultatoCalcolo): string {
  const totale = Math.round(grammiDi(risultato, 'olio'));
  const prima = Math.round(totale / 3);
  const terza = totale - prima * 2;

  return `${prima} g, ${prima} g e ${terza} g`;
}

/** Peso del singolo pezzo di un formato, vuoto se il formato non è scelto. */
function pesoProdotto(risultato: RisultatoCalcolo, id: string): string {
  const prodotto = (risultato.prodotti ?? []).find((voce) => voce.id === id);
  return prodotto ? formattaGrammi(prodotto.pesoG) : '—';
}

/**
 * Risolve i segnaposto del procedimento con le dosi effettive del calcolo.
 * Unica fonte per PDF e per un'eventuale vista del procedimento nel sito.
 */
export function componiProcedimento(
  ricetta: RicettaConfig,
  risultato: RisultatoCalcolo,
): PassoProcedimento[] {
  const grammi = (chiave: string, tipo: TipoIngrediente) =>
    formattaGrammiIngrediente(grammiDi(risultato, chiave), tipo);

  const acqua = acquaImpasto(risultato);

  const valori: Record<string, string> = {
    /** L'idratazione della biga decisa dal motore, non quella fissa della ricetta. */
    idratazioneBiga: `${formattaNumero(
      risultato.pianoBiga
        ? risultato.pianoBiga.idratazione
        : (ricetta.idratazioneBiga ?? 0) * 100,
      0,
    )} %`,
    /** L'attesa vera: in ambiente, in frigo o tutte e due. */
    maturazioneBiga: risultato.pianoBiga
      ? testoMaturazione(risultato.pianoBiga)
      : `${formattaIntero(ricetta.oreBiga ?? 0)} ore`,
    farinaBiga: grammi('farina-biga', 'farina'),
    acquaBiga: grammi('acqua-biga', 'acqua'),
    lievito: grammi('lievito', 'lievito'),
    farinaAutolisi: grammi('farina-autolisi', 'farina'),
    acquaAutolisi: grammi('acqua-autolisi', 'acqua'),
    farinaRinfresco: grammi('farina-rinfresco', 'farina'),
    acquaRinfresco: grammi('acqua-rinfresco', 'acqua'),
    acquaFinale: grammi('acqua-finale', 'acqua'),
    acquaTotale: formattaGrammiIngrediente(risultato.acquaTotaleG, 'acqua'),
    farina: grammi('farina', 'farina'),
    acqua: grammi('acqua', 'acqua'),
    zucchero: grammi('zucchero', 'farina'),
    sale: grammi('sale', 'farina'),
    olio: grammi('olio', 'acqua'),
    malto: grammi('malto', 'malto'),
    miele: grammi('miele', 'miele'),
    olioRiprese: olioRiprese(risultato),
    divisioneFormati: divisioneFormati(ricetta, risultato),
    pesoFocacce: pesoProdotto(risultato, 'focacce'),
    pesoPizzette: pesoProdotto(risultato, 'pizzette'),
    pesoPanini: pesoProdotto(risultato, 'panini'),
    pesoBauletti: pesoProdotto(risultato, 'bauletti'),
    formazionePanetti: formazionePanetti(risultato),
    divisionePorzioni: divisionePorzioni(risultato),
    acquaImpastoIniziale: acqua.iniziale,
    acquaImpastoFinale: acqua.finale,
  };

  const autolisi = risultato.fasi.some((fase) => fase.id === 'autolisi');
  // Con l'autolisi attiva la farina del rinfresco vive nella fase di autolisi:
  // va contata anche lì, altrimenti comparirebbe un secondo passaggio di
  // rinfresco privo di farina.
  const conFarinaRinfresco =
    grammiDi(risultato, 'farina-rinfresco') +
      grammiDi(risultato, 'farina-autolisi') >
    1e-9;

  const condizioni: Record<string, boolean> = {
    autolisi,
    senzaAutolisi: !autolisi && conFarinaRinfresco,
    senzaFarinaRinfresco: !conFarinaRinfresco,
  };

  // I passi dei singoli formati compaiono solo se il prodotto è stato scelto.
  for (const prodotto of risultato.prodotti ?? []) {
    condizioni[`prodotto-${prodotto.id}`] = true;
  }

  const risolvi = (testo: string): string =>
    testo.replace(/\{([a-zA-Z]+)\}/g, (_intero, chiave: string) => {
      const valore = valori[chiave];
      if (valore === undefined) {
        throw new Error(`Segnaposto sconosciuto nel procedimento: ${chiave}`);
      }
      return valore;
    });

  // Una voce è attiva quando la sua condizione è vera; le condizioni
  // alternative (tonda e in teglia) bastano una sola.
  const attiva = (condizione: string | undefined): boolean =>
    condizione === undefined || condizioni[condizione] === true;
  const visibile = (passo: PassoProcedimento): boolean =>
    attiva(passo.condizione) &&
    (passo.condizioni === undefined || passo.condizioni.some(attiva));

  // Le sotto-voci (i formati dell'Impasto Tuttofare) seguono le stesse regole:
  // filtro per condizione e segnaposto risolti, a qualsiasi profondità.
  const componi = (passo: PassoProcedimento): PassoProcedimento => ({
    ...passo,
    paragrafi: passo.paragrafi.map(risolvi),
    ...(passo.elenco ? { elenco: passo.elenco.map(risolvi) } : {}),
    ...(passo.voci
      ? {
          voci: passo.voci.filter(visibile).map(componi),
        }
      : {}),
  });

  return ricetta.procedimento.filter(visibile).map(componi);
}
