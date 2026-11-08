import type { ReactNode } from 'react';

/**
 * Il pulsante del sito: un solo componente per i tre ruoli che ci sono
 * davvero — azione principale, azione secondaria, azione discreta — e per le
 * tre altezze usate dalle schermate.
 */

export type VariantePulsante = 'primario' | 'secondario' | 'tenue';
export type DimensionePulsante = 'compatto' | 'normale' | 'alta';

const VARIANTI: Record<VariantePulsante, string> = {
  primario:
    'border border-transparent bg-terracotta text-su-oro shadow-lg shadow-ombra/30 hover:bg-terracotta-scuro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta',
  secondario:
    'border border-bordo bg-carta/50 text-inchiostro hover:border-terracotta/60 hover:bg-terracotta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta',
  tenue:
    'border border-bordo bg-crema-scuro text-inchiostro hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta',
};

const DIMENSIONI: Record<DimensionePulsante, string> = {
  compatto: 'min-h-9 rounded-lg px-3 text-xs',
  normale: 'min-h-11 rounded-xl px-4 text-sm',
  alta: 'min-h-14 rounded-xl px-4 text-sm',
};

export function Pulsante({
  children,
  onClick,
  variante = 'secondario',
  dimensione = 'normale',
  disabilitato = false,
  tipo = 'button',
  className = '',
  ariaBusy,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variante?: VariantePulsante;
  dimensione?: DimensionePulsante;
  disabilitato?: boolean;
  tipo?: 'button' | 'submit';
  className?: string;
  ariaBusy?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={disabilitato}
      aria-busy={ariaBusy}
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-px ${VARIANTI[variante]} ${DIMENSIONI[dimensione]} ${className}`}
    >
      {children}
    </button>
  );
}
