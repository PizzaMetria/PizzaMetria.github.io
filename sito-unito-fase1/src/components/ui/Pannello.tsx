import type { ReactNode } from 'react';

/**
 * Il riquadro con titolo del sito: stessa superficie, stesso bordo, stesso
 * titolo serif ovunque. Prima esisteva solo dentro il calcolatore nuovo; ora è
 * qui e lo usano tutti, così le due interfacce non possono divergere.
 */
export function Pannello({
  titolo,
  nota,
  children,
  className = '',
  id,
}: {
  titolo: string;
  nota?: string;
  children: ReactNode;
  /** Serve alla navigazione a passi del telefono: un passo per volta. */
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-bordo/80 bg-carta/70 p-3 shadow-xl shadow-ombra/20 sm:p-5 ${className}`}
    >
      <h2 className="font-serif text-xl leading-snug font-bold tracking-tight text-inchiostro">
        {titolo}
      </h2>
      {nota ? (
        <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">{nota}</p>
      ) : null}
      <div className="mt-4 space-y-3.5">{children}</div>
    </section>
  );
}
