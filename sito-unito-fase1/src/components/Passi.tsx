/**
 * I pezzi della procedura guidata da smartphone, uguali nei due siti.
 *
 * Il tasto è quello del vecchio sito (pillola terracotta, maiuscolo); lo stato
 * di avanzamento è quello del nuovo (passo corrente, nome del passo e barre).
 * Prima erano uno per sito: qui stanno insieme, così si comportano allo stesso
 * modo ovunque.
 */

/** Il tasto «Avanti» / «Indietro» del vecchio sito. */
export function PulsantePasso({
  etichetta,
  onClick,
  disabilitato = false,
}: {
  etichetta: string;
  onClick: () => void;
  disabilitato?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabilitato}
      className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-terracotta px-6 text-xs font-bold tracking-wider text-su-oro uppercase shadow-lg shadow-ombra/30 transition-all hover:-translate-y-px hover:bg-terracotta-scuro active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
    >
      {etichetta}
    </button>
  );
}

/**
 * Barra di avanzamento e tasti del passo. Sul telefono è la navigazione vera:
 * si vede un passo per volta, con il tasto indietro sempre a portata di pollice.
 */
export function NavigazionePassi({
  passi,
  attivo,
  onIndietro,
  onAvanti,
  etichettaAvanti = 'Avanti',
  bloccaAvanti = false,
  notaAvanti,
}: {
  passi: readonly string[];
  attivo: number;
  onIndietro?: () => void;
  onAvanti?: () => void;
  etichettaAvanti?: string;
  /** Tasto spento: c'è qualcosa da sistemare nel passo, non al risultato. */
  bloccaAvanti?: boolean;
  /** Perché il tasto è spento. */
  notaAvanti?: string;
}) {
  return (
    <nav
      aria-label={`Passo ${attivo + 1} di ${passi.length}: ${passi[attivo]}`}
      className="rounded-2xl border border-bordo bg-crema-scuro/70 p-3"
    >
      <div className="flex items-baseline justify-between gap-3 text-[11px] text-inchiostro-tenue">
        <span className="shrink-0">
          Passo {attivo + 1} di {passi.length}
        </span>
        <span className="truncate font-semibold text-inchiostro">{passi[attivo]}</span>
      </div>

      <div className="mt-2 flex gap-1" aria-hidden="true">
        {passi.map((nome, indice) => (
          <span
            key={nome}
            className={`h-1 flex-1 rounded-full ${
              indice <= attivo ? 'bg-terracotta' : 'bg-bordo'
            }`}
          />
        ))}
      </div>

      {bloccaAvanti && notaAvanti ? (
        <p className="mt-2 text-[11px] leading-relaxed text-errore">{notaAvanti}</p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        {onIndietro ? (
          <PulsantePasso etichetta="Indietro" onClick={onIndietro} />
        ) : (
          <span aria-hidden="true" />
        )}
        {onAvanti ? (
          <PulsantePasso
            etichetta={etichettaAvanti}
            onClick={onAvanti}
            disabilitato={attivo === passi.length - 1 || bloccaAvanti}
          />
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
    </nav>
  );
}
