import { createPortal } from 'react-dom';

import { Component, lazy, Suspense, type ReactNode } from 'react';

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
  onSalva: () => void;
  onChiudi: () => void;
}

export function AnteprimaExport({
  tipo,
  nome,
  url,
  onSalva,
  onChiudi,
}: Props) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Anteprima di ${nome}`}
      className="fixed inset-0 z-[100] flex flex-col bg-crema"
    >
      <div className="flex items-center gap-2 border-b border-bordo bg-carta px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={onChiudi}
          aria-label="Chiudi l’anteprima"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-bordo text-lg leading-none text-inchiostro transition-colors hover:border-terracotta/60"
        >
          ✕
        </button>

        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-inchiostro sm:text-sm">
          {nome}
        </p>

        {tipo === 'pdf' ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-bordo px-3 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/60"
          >
            Apri PDF
          </a>
        ) : null}

        <button
          type="button"
          onClick={onSalva}
          className="min-h-10 shrink-0 rounded-xl bg-terracotta px-4 text-xs font-bold tracking-[0.08em] text-su-oro uppercase transition-colors hover:bg-terracotta-scuro sm:px-5"
        >
          Salva
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-crema-scuro">
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
