import type {
  ErroriCampi,
  ModalitaCalcolo,
  OpzioniRicetta,
  RicettaConfig,
  TipoLievito,
  ValoriGrezzi,
} from '../types';
import { CampoNumero } from './CampoNumero';
import { SelettoreModalita } from './SelettoreModalita';

export type GruppoValori = keyof ValoriGrezzi;
export type CambiaCampo = (
  gruppo: GruppoValori,
  campo: string,
  valore: string,
) => void;

interface Props {
  ricetta: RicettaConfig;
  modalita: ModalitaCalcolo;
  opzioni: OpzioniRicetta;
  valori: ValoriGrezzi;
  errori: ErroriCampi;
  erroreGenerale: string | null;
  onCambiaModalita: (modalita: ModalitaCalcolo) => void;
  onCambiaOpzione: <K extends keyof OpzioniRicetta>(
    campo: K,
    valore: OpzioniRicetta[K],
  ) => void;
  onCambiaCampo: CambiaCampo;
  onCalcola: () => void;
}

const ETICHETTE_LIEVITO: Record<TipoLievito, string> = {
  fresco: 'Lievito fresco',
  secco: 'Lievito secco',
};

const TESTI_MODALITA: Record<ModalitaCalcolo, string> = {
  panetti:
    'Inserisci quanti panetti ti servono e quanto deve pesare ciascuno: il peso comprende tutti gli ingredienti.',
  farina:
    'Parti dalla farina che hai. Se vuoi, indica anche una resa per ottenere panetti o una stima delle teglie.',
  teglie:
    'Inserisci le dimensioni della teglia e quante ne vuoi preparare: le dosi mantengono la stessa quantità di impasto per superficie.',
};

export function FormCalcolo({
  ricetta,
  modalita,
  opzioni,
  valori,
  errori,
  erroreGenerale,
  onCambiaModalita,
  onCambiaOpzione,
  onCambiaCampo,
  onCalcola,
}: Props) {
  const quotaFarinaAutolisi = Math.round(
    (1 - (ricetta.quotaFarinaBiga ?? 0)) * 100,
  );
  const idratazioneAutolisi = Math.round(
    (ricetta.idratazioneAutolisi ?? 0) * 100,
  );

  function impostaTeglia(latoA: string, latoB: string) {
    onCambiaCampo('teglie', 'latoA', latoA);
    onCambiaCampo('teglie', 'latoB', latoB);
  }

  return (
    <form
      id="calcolatore"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        onCalcola();
      }}
      className="rounded-2xl border border-bordo/80 bg-carta/70 p-5 shadow-xl shadow-black/20"
    >
      <h2 className="font-serif text-xl font-bold tracking-tight text-inchiostro">
        Calcola il tuo impasto
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-inchiostro-tenue">
        {TESTI_MODALITA[modalita]}
      </p>

      <div className="mt-4">
        <SelettoreModalita
          modalita={modalita}
          modalitaDisponibili={ricetta.modalita}
          onCambia={onCambiaModalita}
        />
      </div>

      <div
        role="group"
        aria-labelledby="configurazione-titolo"
        className="mt-4 rounded-xl border border-bordo/70 bg-crema-scuro/40 p-3.5"
      >
        <p
          id="configurazione-titolo"
          className="font-serif text-sm font-bold text-inchiostro"
        >
          Configurazione della ricetta
        </p>
        <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
          Il lievito fresco è l’impostazione predefinita; le dosi si adeguano
          al tipo di lievito scelto.
        </p>

        <div className="mt-3">
          <p
            id="tipo-lievito-titolo"
            className="text-xs font-semibold tracking-wide text-inchiostro-tenue uppercase"
          >
            Tipo di lievito
          </p>
          <div
            role="radiogroup"
            aria-labelledby="tipo-lievito-titolo"
            className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl border border-bordo/80 bg-crema-scuro p-1.5"
          >
            {(['fresco', 'secco'] as const).map((tipo) => {
              const selezionato = opzioni.tipoLievito === tipo;

              return (
                <label key={tipo} className="min-w-0 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo-lievito"
                    value={tipo}
                    checked={selezionato}
                    onChange={() => onCambiaOpzione('tipoLievito', tipo)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-center text-xs font-semibold text-inchiostro-tenue transition-all peer-checked:border-terracotta/50 peer-checked:bg-terracotta/15 peer-checked:text-oro-chiaro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">
                    <span
                      aria-hidden="true"
                      className={selezionato ? 'visible' : 'invisible'}
                    >
                      ✓
                    </span>
                    <span className="min-w-0">{ETICHETTE_LIEVITO[tipo]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {ricetta.autolisiOpzionale ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-bordo bg-crema-scuro/60 px-3 py-2.5 transition-colors hover:border-terracotta/40">
            <input
              type="checkbox"
              checked={opzioni.autolisi}
              onChange={(evento) =>
                onCambiaOpzione('autolisi', evento.target.checked)
              }
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#d4af37]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-inchiostro">
                Autolisi
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-inchiostro-tenue">
                Facoltativa: la farina del rinfresco riposa con una parte
                dell’acqua prima dell’impastamento finale. Il calcolatore
                ripartisce l’acqua totale tra biga, autolisi e impasto finale.
              </span>
            </span>
          </label>
        ) : ricetta.famiglia === 'biga-autolisi' ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-bordo bg-crema-scuro/60 px-3 py-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-terracotta text-[10px] leading-none font-bold text-crema-scuro"
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-inchiostro">
                  Autolisi
                </span>
                <span className="rounded-full border border-terracotta/30 bg-oro-velo px-2 py-0.5 text-[10px] font-semibold tracking-wide text-oro-chiaro uppercase">
                  Inclusa
                </span>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-inchiostro-tenue">
                Fa parte della ricetta e non si disattiva: il{' '}
                {quotaFarinaAutolisi}% della farina riposa con il{' '}
                {idratazioneAutolisi}% della sua acqua la sera prima
                dell’impastamento finale. L’acqua è già compresa nel totale.
              </span>
            </span>
          </div>
        ) : null}
      </div>

      {modalita === 'panetti' ? (
        <div className="mt-4 grid gap-4">
          <CampoNumero
            id="numero-panetti"
            label="Numero di panetti"
            value={valori.panetti.numeroPanetti}
            onChange={(valore) =>
              onCambiaCampo('panetti', 'numeroPanetti', valore)
            }
            inputMode="numeric"
            hint="Un numero intero, ad esempio 6."
            error={errori.numeroPanetti}
          />
          <CampoNumero
            id="peso-panetto"
            label="Peso di ciascun panetto"
            unit="g"
            value={valori.panetti.pesoPanetto}
            onChange={(valore) =>
              onCambiaCampo('panetti', 'pesoPanetto', valore)
            }
            inputMode="decimal"
            hint="Puoi usare la virgola o il punto per i decimali."
            error={errori.pesoPanetto}
          />
        </div>
      ) : null}

      {modalita === 'teglie' ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 min-[380px]:grid-cols-2">
            <CampoNumero
              id="teglia-lato-a"
              label="Lato A"
              unit="cm"
              value={valori.teglie.latoA}
              onChange={(valore) =>
                onCambiaCampo('teglie', 'latoA', valore)
              }
              inputMode="decimal"
              error={errori.latoA}
            />
            <CampoNumero
              id="teglia-lato-b"
              label="Lato B"
              unit="cm"
              value={valori.teglie.latoB}
              onChange={(valore) =>
                onCambiaCampo('teglie', 'latoB', valore)
              }
              inputMode="decimal"
              error={errori.latoB}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-inchiostro-tenue">
              Scorciatoie di dimensione, se ti servono:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => impostaTeglia('30', '40')}
                className="min-h-9 rounded-lg border border-bordo bg-crema-scuro px-3 py-1.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:bg-terracotta/10 hover:text-oro-chiaro"
              >
                30 × 40 cm
              </button>
              <button
                type="button"
                onClick={() => impostaTeglia('40', '60')}
                className="min-h-9 rounded-lg border border-bordo bg-crema-scuro px-3 py-1.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:bg-terracotta/10 hover:text-oro-chiaro"
              >
                40 × 60 cm
              </button>
            </div>
          </div>

          <CampoNumero
            id="numero-teglie"
            label="Numero di teglie"
            value={valori.teglie.numeroTeglie}
            onChange={(valore) =>
              onCambiaCampo('teglie', 'numeroTeglie', valore)
            }
            inputMode="numeric"
            hint="Un numero intero, ad esempio 2."
            error={errori.numeroTeglie}
          />
        </div>
      ) : null}

      {modalita === 'farina' ? (
        <div className="mt-4 grid gap-4">
          <CampoNumero
            id="farina-totale"
            label="Farina totale"
            unit="kg"
            value={valori.farina.farinaKg}
            onChange={(valore) =>
              onCambiaCampo('farina', 'farinaKg', valore)
            }
            inputMode="decimal"
            hint="Ad esempio 1 oppure 1,25."
            error={errori.farinaKg}
          />

          {ricetta.famiglia === 'diretto' ? (
            <div className="rounded-xl border border-bordo/80 bg-crema-scuro/50 p-3.5">
              <p className="text-xs font-semibold text-inchiostro">
                Stima delle teglie{' '}
                <span className="font-normal text-inchiostro-tenue">
                  (facoltativa)
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
                Indica i due lati di una teglia per sapere quante ne ottieni e
                quanto impasto avanza. Puoi anche lasciare entrambi i campi
                vuoti.
              </p>
              <div className="mt-2.5 grid gap-3 min-[380px]:grid-cols-2">
                <CampoNumero
                  id="stima-lato-a"
                  label="Lato A"
                  unit="cm"
                  optional
                  value={valori.farina.latoA}
                  onChange={(valore) =>
                    onCambiaCampo('farina', 'latoA', valore)
                  }
                  inputMode="decimal"
                  error={errori.latoA}
                />
                <CampoNumero
                  id="stima-lato-b"
                  label="Lato B"
                  unit="cm"
                  optional
                  value={valori.farina.latoB}
                  onChange={(valore) =>
                    onCambiaCampo('farina', 'latoB', valore)
                  }
                  inputMode="decimal"
                  error={errori.latoB}
                />
              </div>
            </div>
          ) : (
            <CampoNumero
              id="peso-panetto-farina"
              label="Peso del panetto"
              unit="g"
              optional
              value={valori.farina.pesoPanetto}
              onChange={(valore) =>
                onCambiaCampo('farina', 'pesoPanetto', valore)
              }
              inputMode="decimal"
              hint="Se lo indichi, calcoliamo i panetti interi e l’impasto residuo."
              error={errori.pesoPanetto}
            />
          )}
        </div>
      ) : null}

      {erroreGenerale ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-errore/40 bg-errore/10 px-3 py-2 text-sm font-medium text-errore"
        >
          {erroreGenerale}
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl bg-terracotta px-5 py-3.5 text-base font-bold text-crema-scuro shadow-lg shadow-black/30 transition-all hover:-translate-y-px hover:bg-oro-scuro active:translate-y-0"
      >
        Calcola impasto
      </button>

      <p className="mt-2.5 text-center text-xs text-inchiostro-tenue">
        I calcoli avvengono nel tuo browser. Nessun dato viene inviato altrove.
      </p>
    </form>
  );
}
