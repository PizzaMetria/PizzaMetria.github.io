import { FASCE, NOMI_FASCE, SOGLIE, intervalloDose, pesiInParole } from '../lib/miniricette';
import type { RisultatoMiniRicetta } from '../lib/miniricette';

/*
 * La scheda del modello a 12 mini-ricette, accanto al risultato.
 *
 * È il motore predefinito del sito, e quindi la scheda che spiega le dosi
 * mostrate; quando si sceglie un altro modello resta come secondo parere.
 * Dice quale mini-ricetta è stata selezionata, da quale dei due indici, il W
 * consigliato con la sua fascia, la dose di lievito con il suo intervallo, e —
 * quando ci sono — gli avvisi che dicono perché la stima va presa con le molle.
 */

function numero(valore: number, decimali = 0): string {
  return valore.toFixed(decimali).replace('.', ',');
}

export function SchedaMiniRicetta({
  risultato,
  attivo = false,
}: {
  risultato: RisultatoMiniRicetta;
  /** Vero quando è questo il motore che sta leggendo le dosi del risultato. */
  attivo?: boolean;
}) {
  const indiceLievito = FASCE.indexOf(risultato.fasciaLievito);
  const rangeDose = intervalloDose(risultato.ricetta, indiceLievito, risultato.fattoreDose);
  // Sotto le 4 ore equivalenti la fascia breve viene estrapolata: la dose è un
  // minimo, non un punto dentro una banda, e l'intervallo si stampa aperto.
  const sottoPavimento = risultato.iFerm < SOGLIE[0];
  const intervalloTesto = sottoPavimento
    ? `≥ ${numero(rangeDose[1], 1)}`
    : `${numero(rangeDose[0], 1)}–${numero(rangeDose[1], 1)}`;

  const fasciaCambiata =
    risultato.fasciaDichiarata[0] !== risultato.fasciaEffettiva[0] ||
    risultato.fasciaDichiarata[1] !== risultato.fasciaEffettiva[1];

  return (
    <section className="rounded-2xl border border-bordo/80 bg-carta/70 p-3.5 shadow-xl shadow-ombra/20 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl leading-snug font-bold tracking-tight text-inchiostro">
          Mini-ricetta
        </h2>
        <span className="flex items-center gap-1.5">
          <span
            className={
              attivo
                ? 'rounded-full border border-oro-chiaro/50 bg-oro-chiaro/15 px-2.5 py-1 text-[11px] font-semibold text-oro-chiaro'
                : 'rounded-full border border-bordo/70 bg-crema px-2.5 py-1 text-[11px] font-semibold text-inchiostro-tenue'
            }
          >
            {attivo ? 'motore in uso' : 'secondo parere'}
          </span>
          <span className="rounded-full border border-bordo/70 bg-crema px-2.5 py-1 text-[11px] font-semibold text-inchiostro-tenue">
            {risultato.nomeRicetta}
          </span>
        </span>
      </div>

      <p className="mt-2 font-serif text-lg leading-snug font-bold text-oro-chiaro">
        {NOMI_FASCE[risultato.fasciaW]}
      </p>
      <p className="text-xs leading-relaxed text-inchiostro-tenue">
        scelta dall’indice di maturazione, che è quello che decide il W
        {risultato.pesiW.length > 0 ? ` · pesi ${pesiInParole(risultato.pesiW)}` : null}
      </p>

      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-bordo/70 bg-crema px-3 py-2">
          <dt className="text-[11px] tracking-wide text-inchiostro-tenue uppercase">
            Indice di maturazione
          </dt>
          <dd className="text-sm font-semibold tabular-nums">
            {numero(risultato.iMat, 2)} ore equivalenti
          </dd>
          <dd className="mt-0.5 text-xs leading-relaxed text-inchiostro-tenue">
            W {risultato.w} · fascia {risultato.fasciaEffettiva[0]}–
            {risultato.fasciaEffettiva[1]}
          </dd>
        </div>

        <div className="rounded-xl border border-bordo/70 bg-crema px-3 py-2">
          <dt className="text-[11px] tracking-wide text-inchiostro-tenue uppercase">
            Indice fermentativo
          </dt>
          <dd className="text-sm font-semibold tabular-nums">
            {numero(risultato.iFerm, 2)} ore equivalenti
          </dd>
          <dd className="mt-0.5 text-xs leading-relaxed text-inchiostro-tenue">
            lievito {numero(risultato.doseGkg, 2)} g/kg ·{' '}
            {numero(risultato.lievitoG, 2)} g su {numero(risultato.farinaG)} g di farina
          </dd>
        </div>
      </dl>

      <div className="mt-3 space-y-1.5 text-xs leading-relaxed text-inchiostro-tenue">
        <p>
          <span className="font-semibold text-inchiostro">Mini-ricetta del lievito:</span>{' '}
          {NOMI_FASCE[risultato.fasciaLievito]} · intervallo {intervalloTesto} g/kg
          {sottoPavimento
            ? '. Programma molto corto: sotto le 4 ore equivalenti la dose è un minimo, non un valore dentro la banda.'
            : null}
          {risultato.fasciaLievito !== risultato.fasciaW
            ? '. È diversa da quella del W: il freddo pesa poco sul lievito e molto sulla maturazione.'
            : '.'}
        </p>
        <p>
          <span className="font-semibold text-inchiostro">Fascia della ricetta:</span>{' '}
          {risultato.fasciaDichiarata[0]}–{risultato.fasciaDichiarata[1]}
          {fasciaCambiata
            ? ` dichiarata a idratazione e massa di riferimento; con questi valori diventa ${risultato.fasciaEffettiva[0]}–${risultato.fasciaEffettiva[1]}.`
            : ' (coincide con quella mostrata: qui idratazione e massa sono quelle di riferimento).'}
        </p>
      </div>

      {risultato.avvisi.length > 0 ? (
        <ul className="mt-3 space-y-1.5 rounded-xl border border-avviso/40 bg-avviso-tenue px-3 py-2 text-xs leading-relaxed text-avviso">
          {risultato.avvisi.map((avviso) => (
            <li key={avviso} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{avviso}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
