/**
 * Il banner del sito: un solo disegno per avvisi, errori e informazioni.
 * Lo usano sia il calcolatore nuovo sia le ricette di casa, così lo stesso
 * tipo di messaggio ha sempre lo stesso colore e la stessa forma.
 */

export type VarianteAvviso = 'attenzione' | 'errore' | 'info';

const STILI: Record<VarianteAvviso, { contenitore: string; icona: string }> = {
  attenzione: {
    contenitore: 'border-avviso/40 bg-avviso-tenue text-avviso',
    icona: 'border-avviso/50 text-avviso',
  },
  errore: {
    contenitore: 'border-errore/40 bg-errore/10 text-errore',
    icona: 'border-errore/50 text-errore',
  },
  info: {
    contenitore: 'border-bordo bg-carta/40 text-inchiostro-tenue',
    icona: 'border-bordo text-inchiostro-tenue',
  },
};

const SIMBOLO: Record<VarianteAvviso, string> = {
  attenzione: '!',
  errore: '!',
  info: 'i',
};

export function Avviso({
  testo,
  dettaglio,
  variante = 'attenzione',
  className = '',
}: {
  testo: string;
  /** Riga più piccola sotto al messaggio: intervallo, rimedio, ecc. */
  dettaglio?: string | null;
  variante?: VarianteAvviso;
  className?: string;
}) {
  const stile = STILI[variante];

  return (
    <div
      role={variante === 'errore' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${stile.contenitore} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mt-px grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border text-[10px] leading-none font-bold ${stile.icona}`}
      >
        {SIMBOLO[variante]}
      </span>
      <span className="min-w-0">
        <span className="block text-xs leading-relaxed font-semibold">{testo}</span>
        {dettaglio ? (
          <span className="mt-0.5 block text-[11px] leading-relaxed font-normal opacity-90">
            {dettaglio}
          </span>
        ) : null}
      </span>
    </div>
  );
}
