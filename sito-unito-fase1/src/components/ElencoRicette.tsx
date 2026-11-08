/** Una voce degli elenchi di ricette: gli stessi dati per i due siti. */
export interface VoceElenco {
  id: string;
  nome: string;
  /** «Diretto», «Con biga»…: la pillola a destra del nome. */
  tipo: string;
  sottotitolo: string;
}

/**
 * L'unico modo in cui il sito mostra una lista di ricette. Lo usano sia
 * «Calcola la tua Pizza» sia «Le mie ricette», così pallino di scelta,
 * caratteri, pillola del tipo e spaziature non possono divergere.
 */
export function ElencoRicette<T extends string>({
  idIntestazione,
  nomeGruppo,
  voci,
  scelta,
  onScegli,
  titolo,
  descrizione,
}: {
  idIntestazione: string;
  nomeGruppo: string;
  voci: readonly (VoceElenco & { id: T })[];
  scelta: T | null;
  onScegli: (id: T) => void;
  /** Intestazione facoltativa: se manca, l'elenco parte subito. */
  titolo?: string;
  descrizione?: string;
}) {
  return (
    <fieldset aria-label={titolo ?? 'Ricette'} className="min-w-0">
      {titolo ? (
        <legend
          id={idIntestazione}
          className="font-serif text-lg leading-snug font-bold text-inchiostro lg:text-xl"
        >
          {titolo}
        </legend>
      ) : null}
      {descrizione ? (
        <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
          {descrizione}
        </p>
      ) : null}

      <div className={`grid gap-2 ${titolo ? 'mt-3' : ''}`}>
        {voci.map((voce) => {
          const sceltaOra = voce.id === scelta;

          return (
            <label key={voce.id} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name={nomeGruppo}
                value={voce.id}
                checked={sceltaOra}
                onChange={() => onScegli(voce.id)}
                className="peer sr-only"
              />
              <span
                className={`solleva flex items-start gap-2.5 rounded-xl border px-3.5 py-3 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta ${
                  sceltaOra
                    ? 'border-terracotta/70 bg-terracotta-tenue shadow-[var(--alone-2)]'
                    : 'border-bordo/80 bg-crema-scuro/50'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors ${
                    sceltaOra
                      ? 'border-terracotta bg-terracotta text-su-oro'
                      : 'border-bordo text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="block min-w-0 font-serif text-[0.9375rem] leading-snug font-bold text-inchiostro">
                      {voce.nome}
                    </span>
                    <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-bordo bg-crema-scuro/70 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-inchiostro-tenue uppercase">
                      {voce.tipo}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-inchiostro-tenue">
                    {voce.sottotitolo}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
