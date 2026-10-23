interface Props {
  id: string;
  label: string;
  unit?: string;
  value: string;
  onChange: (valore: string) => void;
  inputMode: 'numeric' | 'decimal';
  hint?: string;
  optional?: boolean;
  error?: string;
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
}: Props) {
  const idHint = hint ? `${id}-hint` : undefined;
  const idErrore = error ? `${id}-errore` : undefined;
  const describedBy = [idHint, idErrore].filter(Boolean).join(' ') || undefined;

  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
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
        className="w-full min-w-0 rounded-xl border border-bordo bg-crema-scuro px-3.5 py-3 text-base text-inchiostro shadow-inner shadow-ombra/20 transition-colors placeholder:text-inchiostro-tenue/50 hover:border-bordo focus-visible:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta/20 aria-[invalid=true]:border-errore aria-[invalid=true]:ring-errore/20"
      />

      {hint && !error ? (
        <p id={idHint} className="mt-1.5 text-xs leading-relaxed text-inchiostro-tenue">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={idErrore}
          className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold leading-relaxed text-errore"
        >
          <span aria-hidden="true" className="mt-px">!</span>
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
