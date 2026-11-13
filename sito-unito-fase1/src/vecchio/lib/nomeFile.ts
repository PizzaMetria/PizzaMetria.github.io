import type { RicettaConfig, RisultatoCalcolo, TipoEsportazione } from '../types';
import { formattaDataFileConOra } from './formato';

function numeroCompatto(valore: number, decimali: number): string {
  const fattore = 10 ** decimali;
  const arrotondato = Math.round(valore * fattore) / fattore;
  return String(arrotondato).replace('.', '-');
}

function pulisci(testo: string): string {
  return testo
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Il nome porta la ricetta, la resa e il momento in cui il file è stato
 * creato: due esportazioni dello stesso giorno non si sovrappongono.
 *
 * Esempi:
 * - pizza-contemporanea-6-panetti-280g-2026-10-21-1504.jpg
 * - trancio-milanese-2-teglie-30x40-2026-10-21-1504.pdf
 * - pizza-contemporanea-canotto-1kg-farina-2026-10-21-1504.pdf
 */
export function creaNomeFile(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  data: Date,
  estensione: TipoEsportazione,
): string {
  const base = pulisci(ricetta.slug);
  const giorno = formattaDataFileConOra(data);

  if (risultato.modalita === 'panetti') {
    const panetti = numeroCompatto(risultato.numeroPanetti ?? 0, 0);
    const peso = numeroCompatto(risultato.pesoPanettoG ?? 0, 1);
    const unita = risultato.numeroPanetti === 1 ? 'panetto' : 'panetti';
    return `${base}-${panetti}-${unita}-${peso}g-${giorno}.${estensione}`;
  }

  if (risultato.modalita === 'prodotti') {
    const pezzi = (risultato.prodotti ?? []).reduce(
      (totale, prodotto) => totale + prodotto.quantita,
      0,
    );
    const peso = numeroCompatto(risultato.pesoProdottiG ?? 0, 0);
    const unita = pezzi === 1 ? 'pezzo' : 'pezzi';
    return `${base}-${numeroCompatto(pezzi, 0)}-${unita}-${peso}g-${giorno}.${estensione}`;
  }

  if (risultato.modalita === 'teglie' && risultato.teglie) {
    const numero = numeroCompatto(risultato.teglie.numeroTeglie, 0);
    const latoA = numeroCompatto(risultato.teglie.latoA, 2);
    const latoB = numeroCompatto(risultato.teglie.latoB, 2);
    const unita = risultato.teglie.numeroTeglie === 1 ? 'teglia' : 'teglie';
    return `${base}-${numero}-${unita}-${latoA}x${latoB}-${giorno}.${estensione}`;
  }

  const farinaKg =
    risultato.datiPartenza.modalita === 'farina'
      ? risultato.datiPartenza.farinaKg ?? 0
      : 0;
  const farina = numeroCompatto(farinaKg, 3);
  return `${base}-${farina}kg-farina-${giorno}.${estensione}`;
}
