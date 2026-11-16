import { useDialogo } from '../lib/useDialogo';
import { useRef } from 'react';
import { Marchio } from './Marchio';
import {
  CHI_SONO,
  DESCRIZIONE_SITO,
  EMAIL_CONTATTI,
  OGGETTO_CONTATTI,
} from '../config/contatti';

interface Props {
  aperto: boolean;
  onChiudi: () => void;
}

/**
 * Menu laterale da destra, come nel vecchio sito: marchio, descrizione del
 * sito, anteprima di «Chi sono» e il pulsante «Scrivimi». Nessuna scorciatoia,
 * perché le ricette e il calcolatore sono già in pagina: sarebbero doppioni.
 * Si chiude con la X, toccando il velo scuro o con Esc; mentre è aperto la
 * pagina sotto non scorre.
 */
export function MenuLaterale({ aperto, onChiudi }: Props) {
  const dialogo = useRef<HTMLDivElement>(null);
  useDialogo(dialogo, aperto, onChiudi);

  if (!aperto) return null;

  return (
    <div ref={dialogo} tabIndex={-1} className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={onChiudi}
        className="menu-velo absolute inset-0 bg-inchiostro/35 backdrop-blur-sm"
      />

      <div
        id="menu-laterale"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-laterale-titolo"
        className="menu-laterale absolute inset-y-0 right-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto border-l border-bordo bg-crema-scuro px-5 py-5 shadow-[-24px_0_48px_-24px_rgba(138,109,78,0.45)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Marchio className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span
                id="menu-laterale-titolo"
                className="block font-serif text-base leading-none font-bold text-inchiostro"
              >
                PizzaMetria
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-terracotta uppercase">
                Il calcolatore di impasti
              </span>
            </span>
          </div>
          <button
            data-focus-iniziale
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi il menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-bordo text-sm text-inchiostro-tenue hover:border-terracotta/60 hover:text-inchiostro"
          >
            ✕
          </button>
        </div>

        <p className="mt-5 text-xs leading-relaxed text-inchiostro-tenue">
          {DESCRIZIONE_SITO}
        </p>

        <section aria-labelledby="menu-chi-sono" className="mt-6">
          <h2
            id="menu-chi-sono"
            className="font-serif text-sm font-bold text-inchiostro"
          >
            Chi sono
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-inchiostro-tenue">
            {CHI_SONO}
          </p>
        </section>

        <a
          href={`mailto:${EMAIL_CONTATTI}?subject=${encodeURIComponent(OGGETTO_CONTATTI)}`}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-terracotta px-5 text-xs font-bold tracking-wider text-su-oro uppercase shadow-[0_12px_24px_-12px_rgba(138,109,78,0.6)] hover:-translate-y-px hover:bg-terracotta-scuro"
        >
          Scrivimi
        </a>

        {/* Al posto della vecchia nota sotto «Scrivimi»: il link all'informativa.
            È una pagina statica, non una schermata dell'app: si apre anche senza
            JavaScript ed è nella cache del service worker per l'uso offline. */}
        <a
          href="./privacy.html"
          className="mt-2 self-start text-[10px] leading-relaxed text-inchiostro-tenue/80 underline decoration-bordo underline-offset-2 hover:text-oro-chiaro hover:decoration-terracotta"
        >
          Informativa privacy
        </a>
      </div>
    </div>
  );
}
