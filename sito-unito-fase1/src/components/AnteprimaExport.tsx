import { useDialogo } from '../lib/useDialogo';
import { createPortal } from 'react-dom';

import { Component, lazy, Suspense, useRef, type ReactNode } from 'react';

const PaginePdf = lazy(() => import('./PaginePdf'));

class RipiegoAnteprimaPdf extends Component<{ children: ReactNode }, { errore: boolean }> {
  state = { errore: false };

  static getDerivedStateFromError() {
    return { errore: true };
  }

  render() {
    return this.state.errore ? (
      <p role="alert" className="p-4 text-sm">
        Anteprima PDF non disponibile. Usa «Apri PDF» o «Salva» nella barra in alto.
      </p>
    ) : this.props.children;
  }
}

interface Props {
  tipo: 'jpg' | 'pdf';
  nome: string;
  url: string;
  /** Foglio largo da computer o foglio stretto da smartphone. */
  ottimizza: boolean;
  /** Cambia l'impaginazione: il file si rifà qui sotto, senza uscire. */
  onOttimizza: (valore: boolean) => void;
  /** Il file si sta rigenerando con l'altra impaginazione. */
  inPreparazione?: boolean;
  onSalva: () => void;
  onChiudi: () => void;
}

const VERSIONI: readonly { chiave: string; etichetta: string; stretto: boolean }[] = [
  { chiave: 'computer', etichetta: 'Versione Computer', stretto: false },
  { chiave: 'smartphone', etichetta: 'Versione Smartphone', stretto: true },
];

/**
 * L'anteprima del file, a tutto schermo.
 *
 * La scelta fra foglio da computer e foglio da smartphone sta **qui**, dove si
 * vede il risultato: si preme l'altra versione e il file si rifà nella stessa
 * finestra. Il primo tasto acceso è quello del dispositivo da cui si guarda —
 * il telefono parte su «Smartphone», il computer su «Computer» — ma la scelta
 * resta libera.
 *
 * Sul telefono comanda lo spazio: il nome del file non si stampa nella barra
 * (resta nell'etichetta per i lettori di schermo) e i due tasti prendono tutta
 * la larghezza; il loro testo è un filo più piccolo, così «Versione Smartphone»
 * non va a capo nemmeno sui telefoni stretti. Finché l'anteprima è aperta la
 * pagina sotto non scorre.
 */
export function AnteprimaExport({
  tipo,
  nome,
  url,
  ottimizza,
  onOttimizza,
  inPreparazione = false,
  onSalva,
  onChiudi,
}: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  useDialogo(dialogo, true, onChiudi);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogo}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Anteprima di ${nome}`}
      // Sui telefoni con notch lo spazio di sicurezza non fa parte della pagina:
      // senza questo margine i tasti in alto finivano sotto la barra di sistema.
      className="fixed inset-0 z-[100] flex h-[100dvh] w-screen max-w-[100vw] flex-col overflow-hidden bg-crema"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'env(safe-area-inset-right)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2 overflow-hidden border-b border-bordo bg-carta px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={onChiudi}
          data-focus-iniziale
          aria-label="Chiudi l’anteprima"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-bordo text-lg leading-none text-inchiostro transition-colors hover:border-terracotta/60"
        >
          ✕
        </button>

        <span className="min-w-0 flex-1" />

        {tipo === 'pdf' ? (
          inPreparazione ? (
            <span className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-bordo/50 px-3 text-xs font-semibold text-inchiostro-tenue/60">
              Apri PDF
            </span>
          ) : (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-bordo px-3 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/60"
            >
              Apri PDF
            </a>
          )
        ) : null}

        <button
          type="button"
          onClick={onSalva}
          disabled={inPreparazione}
          className="min-h-10 shrink-0 rounded-xl bg-terracotta px-4 text-xs font-bold tracking-[0.08em] text-su-oro uppercase transition-colors hover:bg-terracotta-scuro disabled:pointer-events-none disabled:opacity-40 sm:px-5"
        >
          Salva
        </button>
      </div>

      <div
        role="group"
        aria-label="Versione del foglio da salvare"
        className="flex min-w-0 items-center gap-1.5 overflow-hidden border-b border-bordo/70 bg-carta/70 px-2 py-2 sm:px-3"
      >
        {VERSIONI.map((versione) => {
          const scelta = versione.stretto === ottimizza;
          return (
            <button
              key={versione.chiave}
              type="button"
              aria-pressed={scelta}
              // Con un file in preparazione non si accettano altri clic: due
              // richieste insieme possono riaccendere il salvataggio a sproposito.
              disabled={inPreparazione}
              onClick={() => {
                if (!scelta) onOttimizza(versione.stretto);
              }}
              className={`min-h-10 flex-1 rounded-lg border px-2 text-[11px] leading-tight font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 sm:px-3 sm:text-xs ${
                scelta
                  ? 'border-terracotta bg-oro-velo text-oro-chiaro'
                  : 'border-bordo text-inchiostro-tenue hover:border-terracotta/50'
              }`}
            >
              {versione.etichetta}
            </button>
          );
        })}
        {inPreparazione ? (
          <span role="status" className="shrink-0 text-[11px] font-semibold text-inchiostro-tenue">
            Aggiorno…
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain bg-crema-scuro">
        {tipo === 'jpg' ? (
          <div className="px-1.5 py-2 sm:px-4 sm:py-4">
            <img
              src={url}
              alt={`Anteprima di ${nome}`}
              className="mx-auto block w-full max-w-3xl rounded-lg shadow-lg shadow-ombra/20"
            />
          </div>
        ) : (
          <RipiegoAnteprimaPdf key={url}>
            <Suspense fallback={<p role="status" className="p-4 text-sm">Apertura del PDF…</p>}>
              <PaginePdf url={url} />
            </Suspense>
          </RipiegoAnteprimaPdf>
        )}
      </div>
    </div>,
    document.body,
  );
}
