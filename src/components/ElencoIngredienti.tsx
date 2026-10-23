import type { VoceVista } from '../lib/vista';

interface Props {
  titolo: string;
  voci: VoceVista[];
  nota?: string;
  avviso?: string;
  totale?: VoceVista;
  className?: string;
}

export function ElencoIngredienti({
  titolo,
  voci,
  nota,
  avviso,
  totale,
  className = '',
}: Props) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-bordo bg-crema/50 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-terracotta" />
          {titolo}
        </h3>
        {nota ? (
          <span className="text-[11px] font-medium text-inchiostro-tenue">
            {nota}
          </span>
        ) : null}
      </div>

      {avviso ? (
        <p className="mt-2 rounded-lg bg-terracotta-tenue px-3 py-2 text-xs leading-relaxed font-semibold text-terracotta-scuro">
          {avviso}
        </p>
      ) : null}

      <dl className="mt-2">
        {voci.map((voce) => (
          <div
            key={voce.etichetta}
            className="flex items-baseline justify-between gap-3 border-b border-bordo/70 py-2 last:border-b-0 last:pb-0"
          >
            <dt className="min-w-0 text-sm text-inchiostro">{voce.etichetta}</dt>
            <dd className="shrink-0 text-base font-bold tabular-nums">
              {voce.valore}
            </dd>
          </div>
        ))}
      </dl>

      {totale ? (
        <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-bordo/70 pt-2 text-xs text-inchiostro-tenue">
          <span>{totale.etichetta}</span>
          <span className="font-semibold tabular-nums">{totale.valore}</span>
        </p>
      ) : null}
    </div>
  );
}
