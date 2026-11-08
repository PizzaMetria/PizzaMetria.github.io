import { useState } from 'react';
import { Marchio } from './Marchio';
import { MenuLaterale } from './MenuLaterale';

/**
 * Testata unica del sito: marchio su un riquadro carta, stato del calcolo e
 * burger che apre il menu laterale. Il tema è uno solo, quindi qui non c'è
 * più il selettore chiaro/scuro.
 */
export function Testata({
  href = '#/',
  onHome,
}: {
  href?: string;
  /** Riporta alla home azzerando il lavoro fatto: il marchio è il tasto «ricomincia». */
  onHome?: () => void;
}) {
  const [menuAperto, setMenuAperto] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-bordo/70 bg-crema/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-2.5 px-3.5 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
          <a
            href={href}
            onClick={
              onHome
                ? (evento) => {
                    evento.preventDefault();
                    onHome();
                  }
                : undefined
            }
            title={onHome ? 'Torna all’inizio e ricomincia' : undefined}
            className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-carta shadow-[0_8px_18px_-10px_rgba(138,109,78,0.55)] ring-1 ring-bordo/70 sm:h-16 sm:w-16">
              <Marchio className="h-10 w-10 sm:h-11 sm:w-11" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-lg leading-none font-extrabold tracking-tight text-inchiostro sm:text-2xl">
                PizzaMetria
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold tracking-[0.18em] text-oro-chiaro uppercase sm:text-xs">
                Il calcolatore di impasti
              </span>
            </span>
          </a>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-bordo bg-carta/70 px-3 py-1.5 text-[11px] font-medium text-inchiostro-tenue sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-terracotta"
              />
              Calcolo locale
            </span>
            <button
              type="button"
              onClick={() => setMenuAperto(true)}
              aria-expanded={menuAperto}
              aria-controls="menu-laterale"
              aria-label="Apri il menu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-bordo bg-carta text-inchiostro hover:border-terracotta/60 hover:text-oro-chiaro sm:h-11 sm:w-11"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-4.5 w-4.5"
              >
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MenuLaterale aperto={menuAperto} onChiudi={() => setMenuAperto(false)} />
    </>
  );
}
