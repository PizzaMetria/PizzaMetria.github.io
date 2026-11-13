import { formatta } from '../lib/numeri';
import type { GiudizioForza } from '../types';

export interface RigaFarina {
  quota: string;
  w: string;
}

/** Quante farine si possono mettere insieme. */
export const MAX_FARINE = 4;

interface Props {
  farine: readonly RigaFarina[];
  /** Quota dell'ultima farina: è il resto, non si scrive. */
  resto: number;
  errori: { quote: readonly boolean[]; forze: readonly boolean[]; totale: number | null };
  wMancanti: readonly boolean[];
  onChange: (indice: number, campo: keyof RigaFarina, valore: string) => void;
  onAggiungi: () => void;
  onRimuovi: (indice: number) => void;
  wEquivalente: number | null;
  /** W efficace del mix: è quello su cui si basa il giudizio. */
  efficace: number | null;
  giudizio: GiudizioForza | null;
  /** W consigliato dal modello, null se i tempi non sono ancora validi. */
  consigliato: number | null;
  /** Fascia tollerata attorno al W consigliato, per la direzione dell'avviso. */
  finestra: { minima: number; massima: number } | null;
}

const STILI: Record<GiudizioForza, string> = {
  ottima: 'border-terracotta/50 bg-terracotta-tenue text-oro-chiaro',
  accettabile: 'border-avviso/50 bg-avviso-tenue text-avviso',
  distante: 'border-errore/50 bg-errore/10 text-errore',
};

const ETICHETTE: Record<GiudizioForza, string> = {
  ottima: 'In linea',
  accettabile: 'Accettabile',
  distante: 'Distante',
};

const CAMPO =
  'w-full min-w-0 rounded-lg border border-bordo bg-crema px-2 py-2 text-sm text-inchiostro tabular-nums transition-colors hover:border-terracotta/40 focus-visible:border-terracotta';

/**
 * Mix di farine: da una a quattro righe. Tutte tranne l'ultima hanno la quota
 * scritta a mano, l'ultima prende quello che resta; così una farina sola è il
 * 100% e ogni riga aggiunta è un grado di libertà in più.
 * Il W equivalente è la media pesata delle farine di cui si conosce la forza.
 */
export function MixFarine({
  farine,
  resto,
  errori,
  wMancanti,
  onChange,
  onAggiungi,
  onRimuovi,
  wEquivalente: weq,
  efficace,
  giudizio,
  consigliato,
  finestra,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_4.5rem_4.5rem] gap-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-inchiostro-tenue">
        <span>Farina</span>
        <span className="text-center">Quota</span>
        <span className="text-center">W</span>
      </div>

      {farine.map((farina, indice) => {
        const ultima = indice === farine.length - 1;
        const rimovibile = farine.length > 1 && indice > 0;

        const quotaErrata = errori.quote[indice] === true;
        const forzaErrata = errori.forze[indice] === true;
        const forzaMancante = wMancanti[indice] === true;
        const idQuota = `mix-quota-errore-${indice}`;
        const idForza = `mix-w-avviso-${indice}`;

        return (
          <div key={indice} className="mt-1.5 grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <label htmlFor={`farina-${indice}`} className="truncate text-sm text-inchiostro">
                Farina {indice + 1}
              </label>
              {rimovibile ? (
                <button
                  type="button"
                  onClick={() => onRimuovi(indice)}
                  aria-label={`Togli la farina ${indice + 1}`}
                  className="shrink-0 rounded-full px-1.5 text-sm leading-none text-inchiostro-tenue transition-colors hover:text-errore"
                >
                  ×
                </button>
              ) : null}
            </div>

            {ultima ? (
              <div
                className="rounded-lg border border-bordo/60 bg-crema-scuro px-2 py-2 text-center text-sm text-inchiostro-tenue tabular-nums"
                title="Quota restante, calcolata dalle altre"
              >
                {formatta(Math.max(0, resto), 0)}%
              </div>
            ) : (
              <div className="relative min-w-0">
                <input
                  id={`farina-${indice}`}
                  type="text"
                  inputMode="decimal"
                  aria-invalid={quotaErrata || undefined}
                  aria-describedby={quotaErrata ? idQuota : undefined}
                  autoComplete="off"
                  aria-label={`Quota della farina ${indice + 1} in percentuale`}
                  value={farina.quota}
                  onChange={(evento) => onChange(indice, 'quota', evento.target.value)}
                  className={`${CAMPO} pr-6 text-center font-semibold aria-[invalid=true]:border-errore`}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-inchiostro-tenue"
                >
                  %
                </span>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              aria-label={`Forza W della farina ${indice + 1}`}
              placeholder="—"
              aria-invalid={forzaErrata || undefined}
              aria-describedby={forzaErrata || forzaMancante ? idForza : undefined}
              value={farina.w}
              onChange={(evento) => onChange(indice, 'w', evento.target.value)}
              className={`${CAMPO} text-center aria-[invalid=true]:border-errore ${forzaMancante ? "border-avviso" : ""}`}
            />
            {quotaErrata ? (
              <p id={idQuota} role="status" className="col-span-3 text-xs text-errore">
                Farina {indice + 1}. Inserisci una quota da 0% a 100%.
              </p>
            ) : null}
            {forzaErrata || forzaMancante ? (
              <p id={idForza} role="status" className={`col-span-3 text-xs ${forzaErrata ? 'text-errore' : 'text-avviso'}`}>
                {forzaErrata
                  ? `Farina ${indice + 1}. Inserisci un W da 100 a 500 o lascia il campo vuoto.`
                  : `Manca il W della farina ${indice + 1}. Puoi calcolare le dosi, ma il W del mix resta sconosciuto.`}
              </p>
            ) : null}
          </div>
        );
      })}

      {errori.totale !== null ? (
        <p role="status" className="mt-2 text-xs text-errore">
          Le quote inserite sommano a {formatta(errori.totale, Number.isInteger(errori.totale) ? 0 : 2)}%. Il totale non può superare il 100%.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onAggiungi}
        disabled={farine.length >= MAX_FARINE}
        className="mt-2 rounded-lg border border-dashed border-bordo px-2.5 py-1.5 text-xs font-semibold text-inchiostro-tenue transition-colors hover:border-terracotta/50 hover:text-oro-chiaro disabled:opacity-40 disabled:hover:border-bordo disabled:hover:text-inchiostro-tenue"
      >
        {farine.length >= MAX_FARINE
          ? `Massimo ${MAX_FARINE} farine`
          : `+ Aggiungi farina (${farine.length}/${MAX_FARINE})`}
      </button>

      {/* L’anteprima del W sta subito sotto la colonna della forza: ottenuto,
          richiesto e se il mix regge, senza dover scorrere. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-bordo/60 bg-crema-scuro px-2.5 py-2">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-inchiostro-tenue uppercase">
          W ottenuto
        </span>
        <span className="font-serif text-lg leading-none text-oro-chiaro tabular-nums">
          {weq === null ? '—' : Math.round(weq)}
        </span>
        <span aria-hidden="true" className="text-inchiostro-tenue">
          ·
        </span>
        <span className="text-[10px] font-semibold tracking-[0.12em] text-inchiostro-tenue uppercase">
          richiesto
        </span>
        <span className="text-sm font-semibold text-inchiostro tabular-nums">
          {consigliato === null ? '—' : consigliato}
        </span>

        {giudizio && consigliato !== null ? (
          <span
            className={`ml-auto inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${STILI[giudizio]}`}
          >
            {giudizio === 'ottima'
              ? '✓ in linea'
              : giudizio === 'accettabile'
                ? ETICHETTE.accettabile
                : `✕ troppo ${efficace !== null && consigliato !== null && efficace > consigliato ? 'alto' : 'basso'}`}
          </span>
        ) : null}
      </div>

      {giudizio === 'distante' && efficace !== null && finestra !== null ? (
        <div
          role="status"
          className="mt-2 rounded-xl border border-errore/40 bg-errore/5 px-3 py-2 text-xs leading-relaxed text-errore"
        >
          <strong className="font-bold">
            {efficace > finestra.massima
              ? 'W troppo alto per queste ore.'
              : 'W troppo basso per queste ore.'}
          </strong>{' '}
        </div>
      ) : null}

      <p className="mt-1.5 text-xs leading-relaxed text-inchiostro-tenue">
        {consigliato === null
          ? 'L’ultima quota è il resto: si calcola da sé.'
          : `Per queste ore il modello consiglia W ${consigliato}. Lascia il W vuoto se non lo conosci: le dosi non cambiano.`}
      </p>
    </div>
  );
}
