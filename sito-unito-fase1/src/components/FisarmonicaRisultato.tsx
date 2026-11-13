import type { ReactNode } from 'react';

export function FisarmonicaRisultato({
  titolo,
  riepilogo,
  children,
}: {
  titolo: string;
  riepilogo?: string;
  children: ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-bordo bg-carta/80 shadow-[var(--alone-2)]">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-crema-scuro group-open:bg-terracotta-tenue/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-terracotta sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-base font-bold leading-snug text-inchiostro sm:text-lg">{titolo}</span>
          {riepilogo ? <span className="mt-1 block text-xs text-inchiostro-tenue">{riepilogo}</span> : null}
        </span>
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-1 h-3.5 w-3.5 shrink-0 text-inchiostro-tenue transition-transform duration-200 group-open:rotate-90 group-open:text-oro-chiaro motion-reduce:transition-none"
        >
          <path d="M4 2l4 4-4 4" />
        </svg>
      </summary>
      <div className="space-y-3 px-3 py-3 sm:px-4">{children}</div>
    </details>
  );
}
