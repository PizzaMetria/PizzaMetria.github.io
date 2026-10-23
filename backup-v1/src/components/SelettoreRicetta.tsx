import type { RicettaConfig } from '../types';

interface Props {
  ricette: readonly RicettaConfig[];
  ricettaId: string;
  onCambia: (ricettaId: string) => void;
}

export function SelettoreRicetta({ ricette, ricettaId, onCambia }: Props) {
  return (
    <fieldset className="rounded-3xl border border-bordo bg-carta p-4 shadow-[0_1px_2px_rgba(42,33,28,0.04)] sm:p-5">
      <legend className="px-1 text-sm font-semibold text-inchiostro">
        Scegli la ricetta
      </legend>
      <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
        Tre impasti diversi, ciascuno con le proprie dosi e il proprio
        procedimento.
      </p>

      <div className="mt-3 grid gap-2">
        {ricette.map((ricetta) => {
          const selezionata = ricetta.id === ricettaId;

          return (
            <label key={ricetta.id} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name="ricetta"
                value={ricetta.id}
                checked={selezionata}
                onChange={() => onCambia(ricetta.id)}
                className="peer sr-only"
              />
              <span className="flex items-start gap-2.5 rounded-2xl border border-bordo bg-white px-3.5 py-3 transition-colors peer-checked:border-terracotta peer-checked:bg-terracotta-tenue/60 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold ${
                    selezionata
                      ? 'border-terracotta bg-terracotta text-white'
                      : 'border-bordo text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block text-sm leading-snug font-bold text-inchiostro">
                    {ricetta.nome}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-inchiostro-tenue">
                    {ricetta.descrizione}
                  </span>
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
