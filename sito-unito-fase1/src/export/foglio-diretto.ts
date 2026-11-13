/*
 * IL FOGLIO DEL CALCOLATORE DIRETTO
 * ---------------------------------
 * Stessi numeri della scheda a schermo, già impaginati per il disegno. Stava
 * dentro App.tsx, dove non si poteva provare: qui è una funzione pura, così un
 * test può prendere un risultato vero e controllare che il foglio — e quindi il
 * PDF — dica le stesse cose.
 *
 * Una regola sola: il tipo di lievito e i grammi devono venire dalla **stessa**
 * fotografia. Per questo gli ingressi arrivano dallo stesso risultato, e il
 * chiamante deve aver già verificato che il risultato sia quello dei dati nel
 * modulo (vedi `bloccoExport`).
 */
import type { DatiFoglio, VoceDose } from './foglio';
import { NOMI_LIEVITO } from '../lib/fermentazione';
import { leggiNumeroDecimale, formatta, grammi } from '../lib/numeri';
import { istruzioneChiusura, orarioFase, titoloAzione } from '../lib/orari';
import type { GiudizioForza, RisultatoCalcolo, TipoLievito } from '../types';

/** Le parole del giudizio sulla forza, usate nel foglio e nella scheda. */
export const ETICHETTE_GIUDIZIO: Record<GiudizioForza, string> = {
  ottima: 'Forza in linea',
  accettabile: 'Forza accettabile',
  distante: 'Forza da rivedere',
};

export function testoGiudizio(
  giudizio: GiudizioForza,
  weff: number,
  consigliato: number,
  minima: number,
  massima: number,
): string {
  const scarto = Math.round(((weff - consigliato) / consigliato) * 100);
  switch (giudizio) {
    case 'ottima':
      return `Il mix è a W ${Math.round(weff)}: per il modello sta nella zona consigliata per queste ore.`;
    case 'accettabile':
      return scarto < 0
        ? `W ${Math.round(weff)} sta sotto la zona consigliata (${scarto}%): il modello lo considera ancora tollerato, ma vicino al limite. Tieni il frigo basso e non allungare i tempi.`
        : `W ${Math.round(weff)} è sopra la zona consigliata (+${scarto}%): il modello lo considera ancora tollerato, ma l’impasto resta più tenace del necessario. Puoi valutare una maturazione più lunga.`;
    case 'distante':
      return scarto < 0
        ? `W ${Math.round(weff)} è sotto la fascia tollerata ${minima}–${massima} per queste ore: il modello indica una maglia al limite. Accorcia i tempi o aggiungi una farina più forte.`
        : `W ${Math.round(weff)} è sopra la fascia tollerata ${minima}–${massima}: il modello indica un impasto più tenace del necessario. Puoi valutare una maturazione più lunga o un’idratazione più alta.`;
  }
}

export interface IngressiFoglioDiretto {
  /** Il risultato a schermo: da qui vengono grammi, percentuale e tipo. */
  risultato: RisultatoCalcolo;
  /** Nome dell'impasto scelto. */
  nome: string;
  /** Panetti oppure teglie. */
  tonda: boolean;
  /** Idratazione scritta nel campo (può essere vuota o con la virgola). */
  idratazioneScritta: string;
  /** Idratazione di ripiego, quella dello stile. */
  idratazioneConfig: number;
  tipoLievito: TipoLievito;
}

/** Il foglio di stampa di un calcolo diretto. */
export function foglioDiretto(ingressi: IngressiFoglioDiretto): DatiFoglio {
  const { risultato: r, tipoLievito } = ingressi;

  const idrNum = leggiNumeroDecimale(ingressi.idratazioneScritta) ?? ingressi.idratazioneConfig;
  const percentoSuFarina = (valore: number): number => (r.farinaG > 0 ? (valore / r.farinaG) * 100 : 0);

  const dosi: VoceDose[] = [
    { nome: 'Farina', tipo: 'farina', grammi: r.farinaG, percentuale: 100 },
    {
      nome: 'Acqua', tipo: 'acqua', grammi: r.acquaG, percentuale: idrNum,
      nota: `Temperatura consigliata ${formatta(r.temperaturaAcqua, 0)} °C`,
    },
    { nome: 'Sale', tipo: 'sale', grammi: r.saleG, percentuale: percentoSuFarina(r.saleG) },
  ];
  if (r.olioG > 0) {
    dosi.push({
      nome: 'Olio',
      tipo: 'olio',
      grammi: r.olioG,
      percentuale: percentoSuFarina(r.olioG),
    });
  }
  if (r.maltoG > 0) {
    dosi.push({
      nome: 'Malto',
      tipo: 'malto',
      grammi: r.maltoG,
      percentuale: percentoSuFarina(r.maltoG),
    });
  }
  dosi.push({
    nome: NOMI_LIEVITO[tipoLievito],
    tipo: 'lievito',
    grammi: r.lievitoG,
    percentuale: r.percentualeLievito,
  });

  const formato = ingressi.tonda
    ? `${r.numeroPezzi} panetti da ${grammi(r.pesoPerPezzoG)} g`
    : `${r.numeroPezzi} ${r.numeroPezzi === 1 ? 'teglia' : 'teglie'} da ${grammi(
        r.pesoPerPezzoG,
      )} g`;

  return {
    titolo: ingressi.nome,
    sottotitolo:
      `${formatta(idrNum, 0)}% di idratazione · ${formato}` +
      (r.residuoG !== null && r.residuoG > 0 ? ` · avanzano ${grammi(r.residuoG)} g` : ''),
    tipoLievito: NOMI_LIEVITO[tipoLievito],
    lievitoG: r.lievitoG,
    lievitoNota: `${formatta(r.percentualeLievito, 2)}% sulla farina · ${formatta(
      r.lievitoPerKgFarina,
      1,
    )} g per kg`,
    dosi,
    totaleG: r.pesoImpastoG,
    totaleNota: formato,
    forza: {
      consigliata: r.forzaConsigliata,
      efficace: r.wEfficace,
      finestra: `${r.forzaMinima}–${r.forzaMassima}`,
      minima: r.forzaMinima,
      massima: r.forzaMassima,
      testo:
        r.wEfficace !== null && r.giudizioForza
          ? `${ETICHETTE_GIUDIZIO[r.giudizioForza]}. ${testoGiudizio(
              r.giudizioForza,
              r.wEfficace,
              r.forzaConsigliata,
              r.forzaMinima,
              r.forzaMassima,
            )}`
          : 'Il W non è dichiarato nel mix: le dosi non cambiano, ma non posso dirti se la farina è adatta a queste ore.',
    },
    passi: r.passi.map((passo) => ({
      quando: '',
      orario: orarioFase(passo.quando),
      titolo: titoloAzione(passo.titolo),
      istruzione: passo.temperaturaChiusura === undefined
        ? undefined
        : istruzioneChiusura(passo.temperaturaChiusura),
      nota: passo.nota,
    })),
    // Il grafico viaggia con il foglio: lo usa il PDF vettoriale.
    curva: r.curva.map((punto) => ({ ora: punto.ora, attivita: punto.attivita })),
    fasce: r.fasce.map((fascia) => ({ da: fascia.da, a: fascia.a, inFrigo: fascia.inFrigo })),
    oreTotali: r.fasce.reduce((massimo, fascia) => Math.max(massimo, fascia.a), 0),
    // Niente note sul foglio: le dosi si correggono col forno, non con una frase
    // stampata. La sezione sparisce da sola se l'elenco è vuoto.
    note: [],
    noteTitolo: 'NOTA',
  };
}
