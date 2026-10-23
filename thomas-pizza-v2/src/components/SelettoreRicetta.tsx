import type { RicettaConfig } from '../types';

interface Props {
  ricette: readonly RicettaConfig[];
  ricettaId: string;
  onCambia: (ricettaId: string) => void;
}

export function SelettoreRicetta({ ricette, ricettaId, onCambia }: Props) {
  return (
    <fieldset
      aria-labelledby="ricetta-selettore-titolo"
      className="rounded-2xl border border-bordo/80 bg-carta/70 p-4 shadow-xl shadow-black/20 sm:p-5"
    >
      <h2
        id="ricetta-selettore-titolo"
        className="text-base font-bold text-inchiostro"
      >
        Scegli la ricetta
      </h2>
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
              <span className="flex items-start gap-2.5 rounded-xl border border-bordo/80 bg-crema-scuro/50 px-3.5 py-3 transition-all peer-checked:border-terracotta/60 peer-checked:bg-oro-velo peer-checked:shadow-lg peer-checked:shadow-black/20 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta hover:border-terracotta/40">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors ${
                    selezionata
                      ? 'border-terracotta bg-terracotta text-crema-scuro'
                      : 'border-bordo text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">
                  <span className="block font-serif text-[15px] leading-snug font-bold text-inchiostro">
                    {ricetta.nome}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-inchiostro-tenue">
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
