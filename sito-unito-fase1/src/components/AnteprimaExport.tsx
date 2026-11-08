import { createPortal } from 'react-dom';

/*
 * ANTEPRIMA A PAGINA INTERA
 * -------------------------
 * Il file preparato si apre sopra tutto: barra in alto con il nome, «Salva»
 * in alto a destra e la croce per chiudere. Il JPG si vede come immagine, il
 * PDF nel lettore del browser, a tutta altezza.
 *
 * Su Android il browser non ha un lettore di PDF dentro la pagina: lì il PDF
 * mostrerebbe solo la schermata di scaricamento, con il codice del file e il
 * tasto «Apri» che resta vuoto. Per questo, quando il chiamante passa
 * `immagine`, al posto del PDF si mostra l'immagine dello stesso foglio: il
 * tasto «Salva» consegna comunque il PDF.
 */

interface Props {
  tipo: 'jpg' | 'pdf';
  nome: string;
  url: string;
  /** Immagine dello stesso foglio: si usa al posto del PDF dove non si vede. */
  immagine?: string | null;
  onSalva: () => void;
  onChiudi: () => void;
}

export function AnteprimaExport({
  tipo,
  nome,
  url,
  immagine = null,
  onSalva,
  onChiudi,
}: Props) {
  if (typeof document === 'undefined') return null;

  const mostraImmagine = tipo === 'jpg' || immagine !== null;
  const sorgente = tipo === 'jpg' ? url : immagine;

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

        {tipo === 'pdf' && !mostraImmagine ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="hidden min-h-10 items-center rounded-xl border border-bordo px-3 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/60 sm:inline-flex"
          >
            Apri fuori
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
        {mostraImmagine ? (
          <div className="px-1.5 py-2 sm:px-4 sm:py-4">
            <img
              src={sorgente ?? url}
              alt={`Anteprima di ${nome}`}
              className="mx-auto block w-full max-w-3xl rounded-lg shadow-lg shadow-ombra/20"
            />
            {tipo === 'pdf' ? (
              <p className="mx-auto mt-2 max-w-3xl pb-3 text-center text-[11px] leading-relaxed text-inchiostro-tenue">
                Anteprima immagine: il file che salvi è il PDF.
              </p>
            ) : null}
          </div>
        ) : (
          <iframe
            src={url}
            title={nome}
            className="h-full w-full border-0 bg-carta"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
