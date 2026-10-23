import type { ModalitaCalcolo } from '../types';

interface Props {
  modalita: ModalitaCalcolo;
  modalitaDisponibili: readonly ModalitaCalcolo[];
  onCambia: (modalita: ModalitaCalcolo) => void;
}

const ETICHETTE: Record<ModalitaCalcolo, string> = {
  panetti: 'Per panetti',
  farina: 'Per farina',
  teglie: 'Per teglie',
};

export function SelettoreModalita({
  modalita,
  modalitaDisponibili,
  onCambia,
}: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-inchiostro">
        Metodo di calcolo
      </legend>

      <div
        className="grid gap-1.5 rounded-xl border border-bordo/80 bg-crema-scuro p-1.5"
        style={{
          gridTemplateColumns: `repeat(${modalitaDisponibili.length}, minmax(0, 1fr))`,
        }}
      >
        {modalitaDisponibili.map((opzione) => {
          const selezionata = modalita === opzione;

          return (
            <label key={opzione} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name="modalita-calcolo"
                value={opzione}
                checked={selezionata}
                onChange={() => onCambia(opzione)}
                className="peer sr-only"
              />
              <span className="flex min-h-12 items-center justify-center gap-1 rounded-lg border border-transparent px-1.5 py-2.5 text-center text-[12px] font-semibold text-inchiostro-tenue transition-all peer-checked:border-terracotta/50 peer-checked:bg-terracotta/15 peer-checked:text-oro-chiaro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta min-[380px]:gap-1.5 min-[380px]:text-[13px]">
                <span
                  aria-hidden="true"
                  className={`text-sm leading-none ${
                    selezionata ? 'visible' : 'invisible'
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0">{ETICHETTE[opzione]}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
