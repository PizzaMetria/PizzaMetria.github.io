import type { VoceVista } from '../lib/vista';
import { formattaPercentuale } from '../lib/formato';
import { IconaIngrediente } from './IconaIngrediente';

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
      className={`min-w-0 rounded-xl border border-bordo/70 bg-crema-scuro/55 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
        <h3 className="flex items-center gap-2 font-serif text-base font-bold text-inchiostro">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-terracotta" />
          {titolo}
        </h3>
        {nota ? (
          <span className="rounded-full border border-bordo bg-carta/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-inchiostro-tenue uppercase">
            {nota}
          </span>
        ) : null}
      </div>

      {avviso ? (
        <p className="mt-2 rounded-lg border border-terracotta/25 bg-oro-velo px-3 py-2 text-xs leading-relaxed font-semibold text-oro-chiaro">
          {avviso}
        </p>
      ) : null}

      <dl className="mt-2">
        {voci.map((voce) => (
          <div
            key={voce.etichetta}
            className="flex items-center justify-between gap-3 border-b border-bordo/50 py-2 last:border-b-0 last:pb-0"
          >
            <dt className="flex min-w-0 items-center gap-2 text-sm text-inchiostro-tenue">
              {voce.tipo ? (
                <IconaIngrediente tipo={voce.tipo} className="text-terracotta" />
              ) : null}
              <span className="min-w-0">
                {voce.etichetta}
                {voce.percentuale !== undefined ? (
                  <span className="text-xs text-inchiostro-tenue">
                    {' · '}
                    {formattaPercentuale(voce.percentuale)} sulla{' '}
                    {voce.basePercentuale}
                  </span>
                ) : null}
              </span>
            </dt>
            <dd className="shrink-0 text-base font-bold text-inchiostro tabular-nums">
              {voce.valore}
            </dd>
          </div>
        ))}
      </dl>

      {totale ? (
        <p className="mt-2 flex items-baseline justify-between gap-2 border-t border-bordo/60 pt-2 text-xs text-inchiostro-tenue">
          <span>{totale.etichetta}</span>
          <span className="font-semibold text-oro-chiaro tabular-nums">
            {totale.valore}
          </span>
        </p>
      ) : null}
    </div>
  );
}
