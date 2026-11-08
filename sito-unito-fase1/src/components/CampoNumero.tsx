import { leggiNumeroDecimale } from '../lib/numeri';

/*
 * IL CAMPO NUMERICO, UNO SOLO
 * --------------------------
 * Prima ce n'erano due: uno nel calcolatore nuovo e uno nel vecchio sito, con
 * larghezze dei tasti e gestione dell'errore diverse. Questo è l'unico: il
 * vecchio lo re-esporta, quindi i due siti non possono più divergere.
 */

interface Props {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (valore: string) => void;
  inputMode: 'numeric' | 'decimal';
  hint?: string;
  optional?: boolean;
  /** Messaggio di errore del campo: sostituisce il suggerimento. */
  error?: string;
  /** Passo dei tasti − e +. Senza passo i tasti non compaiono. */
  incremento?: number;
  minimo?: number;
  massimo?: number;
  decimali?: number;
  /** Etichetta centrata sopra il campo, per le righe compatte del misto. */
  centrato?: boolean;
}

/** Valore scritto dai tasti: numero con la virgola, senza zeri inutili. */
function formattaPasso(valore: number, decimali: number): string {
  return String(Number(valore.toFixed(decimali))).replace('.', ',');
}

export function CampoNumero({
  id,
  label,
  unit,
  value,
  onChange,
  inputMode,
  hint,
  optional = false,
  error,
  incremento,
  minimo,
  massimo,
  decimali = 2,
  centrato = false,
}: Props) {
  const idHint = hint ? `${id}-hint` : undefined;
  const idErrore = error ? `${id}-errore` : undefined;
  const describedBy = [idHint, idErrore].filter(Boolean).join(' ') || undefined;
  const conTasti = incremento !== undefined && incremento > 0;

  function applicaPasso(verso: 1 | -1) {
    if (!conTasti) return;
    const corrente = leggiNumeroDecimale(value) ?? minimo ?? 0;
    const limiteInferiore = minimo ?? 0;
    const nuovo = Math.max(
      limiteInferiore,
      Math.min(massimo ?? Number.POSITIVE_INFINITY, corrente + incremento * verso),
    );

    onChange(formattaPasso(nuovo, decimali));
  }

  return (
    <div className="min-w-0">
      <div
        className={`mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 ${
          centrato ? 'justify-center text-center' : 'justify-between'
        }`}
      >
        <label htmlFor={id} className="text-sm font-semibold text-inchiostro">
          {label}
          {unit ? (
            <span className="font-normal text-inchiostro-tenue"> ({unit})</span>
          ) : null}
        </label>
        {optional ? (
          <span className="rounded-full border border-bordo bg-crema-scuro px-2 py-0.5 text-[11px] font-medium text-inchiostro-tenue">
            Facoltativo
          </span>
        ) : null}
      </div>

      <div className="flex items-stretch gap-1.5">
        {conTasti ? (
          <button
            type="button"
            aria-label={`Riduci ${label}`}
            onClick={() => applicaPasso(-1)}
            className="grid w-10 shrink-0 place-items-center rounded-xl border border-bordo bg-crema-scuro text-lg leading-none font-bold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            −
          </button>
        ) : null}

        <input
          id={id}
          name={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          enterKeyHint="done"
          spellCheck={false}
          value={value}
          onChange={(evento) => onChange(evento.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={optional ? 'Es. 280' : undefined}
          className={`w-full min-w-0 flex-1 rounded-xl border border-bordo bg-crema-scuro px-2.5 py-3 text-base text-inchiostro shadow-inner shadow-ombra/20 transition-colors placeholder:text-inchiostro-tenue/50 hover:border-bordo focus-visible:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta/20 aria-[invalid=true]:border-errore aria-[invalid=true]:ring-errore/20 sm:px-3.5 ${
            conTasti ? 'text-center font-semibold tabular-nums' : ''
          }`}
        />

        {conTasti ? (
          <button
            type="button"
            aria-label={`Aumenta ${label}`}
            onClick={() => applicaPasso(1)}
            className="grid w-10 shrink-0 place-items-center rounded-xl border border-bordo bg-crema-scuro text-lg leading-none font-bold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
          >
            +
          </button>
        ) : null}
      </div>

      {hint && !error ? (
        <p id={idHint} className="mt-1.5 text-xs leading-relaxed text-inchiostro-tenue">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={idErrore}
          className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed font-semibold text-errore"
        >
          <span aria-hidden="true" className="mt-px">
            !
          </span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
