import { useState, type CSSProperties } from 'react';
import type {
  OpzioniRicetta,
  ParametriRicetta,
  RicettaConfig,
} from '../types';
import {
  campiParametri,
  formattaParametro,
  leggiParametro,
  limitaParametro,
  type CampoParametro,
  type ChiaveParametro,
} from '../config/personalizzazione';

interface Props {
  ricetta: RicettaConfig;
  opzioni: OpzioniRicetta;
  parametri: ParametriRicetta;
  personalizzata: boolean;
  onCambia: (chiave: ChiaveParametro, valore: number) => void;
  onRipristina: () => void;
}

interface CampoProps {
  campo: CampoParametro;
  valore: number;
  onCambia: (valore: number) => void;
}

function CampoPercentuale({ campo, valore, onCambia }: CampoProps) {
  const [bozza, setBozza] = useState<string | null>(null);
  const id = `parametro-${campo.chiave}`;
  const idCursore = `${id}-cursore`;
  const idDescrizione = `${id}-descrizione`;
  const mostrato =
    bozza ?? formattaParametro(valore, campo.decimali);

  // Il cursore usa gli stessi limiti e lo stesso passo del campo numerico.
  const perCursore = limitaParametro(campo, valore);
  const ampiezza = campo.max - campo.min;
  const riempimento =
    ampiezza > 0 ? ((perCursore - campo.min) / ampiezza) * 100 : 0;

  function applica(nuovo: number) {
    onCambia(nuovo);
  }

  return (
    <div className="min-w-0 rounded-lg border border-bordo/60 bg-carta/40 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={id}
          className="min-w-0 text-[11px] font-semibold leading-tight text-inchiostro"
        >
          {campo.etichetta}
          <span className="font-normal text-inchiostro-tenue">
            {' '}
            · {campo.base}
          </span>
        </label>
        <span
          aria-hidden="true"
          className="shrink-0 text-[10px] font-medium tabular-nums text-inchiostro-tenue"
        >
          {formattaParametro(campo.min, campo.decimali)}–
          {formattaParametro(campo.max, campo.decimali)}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`Riduci ${campo.etichetta}`}
          onClick={() => applica(valore - campo.passo)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-bordo bg-crema-scuro text-base leading-none font-bold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          −
        </button>

        {/* Il numero resta centrato fra − e +, con il simbolo % sempre visibile. */}
        <div className="relative flex h-8 min-w-0 flex-1 items-center rounded-md border border-bordo bg-crema-scuro transition-colors hover:border-bordo focus-within:border-terracotta focus-within:ring-2 focus-within:ring-terracotta/20">
          <input
            id={id}
            name={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="done"
            spellCheck={false}
            value={mostrato}
            aria-describedby={idDescrizione}
            onFocus={() => setBozza(formattaParametro(valore, campo.decimali))}
            onChange={(evento) => {
              const testo = evento.target.value;
              setBozza(testo);
              const numero = leggiParametro(testo);
              if (numero !== null) applica(numero);
            }}
            onBlur={() => setBozza(null)}
            className="h-full w-full min-w-0 rounded-md bg-transparent px-4 text-center text-sm font-semibold tabular-nums text-inchiostro outline-none focus-visible:outline-none"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[11px] font-medium text-inchiostro-tenue"
          >
            %
          </span>
        </div>

        <button
          type="button"
          aria-label={`Aumenta ${campo.etichetta}`}
          onClick={() => applica(valore + campo.passo)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-bordo bg-crema-scuro text-base leading-none font-bold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          +
        </button>
      </div>

      <input
        id={idCursore}
        name={idCursore}
        type="range"
        min={campo.min}
        max={campo.max}
        step={campo.passo}
        value={perCursore}
        aria-label={`${campo.etichetta}: cursore`}
        aria-valuetext={`${formattaParametro(perCursore, campo.decimali)} per cento`}
        aria-describedby={idDescrizione}
        onChange={(evento) => {
          const numero = Number(evento.target.value);
          if (Number.isFinite(numero)) applica(numero);
        }}
        className="cursore-percentuale mt-1"
        style={{ '--riempimento': `${riempimento}%` } as CSSProperties}
      />

      <p id={idDescrizione} className="sr-only">
        {`Percentuale sulla ${campo.base}, da ${formattaParametro(
          campo.min,
          campo.decimali,
        )} a ${formattaParametro(campo.max, campo.decimali)} per cento.`}
      </p>
    </div>
  );
}

export function PannelloPersonalizzazione({
  ricetta,
  opzioni,
  parametri,
  personalizzata,
  onCambia,
  onRipristina,
}: Props) {
  const [aperto, setAperto] = useState(false);
  const campi = campiParametri(ricetta, opzioni);

  return (
    <section className="mt-4 rounded-xl border border-bordo/70 bg-crema-scuro/40">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={aperto}
          aria-controls="modifica-ricetta"
          onClick={() => setAperto((precedente) => !precedente)}
          className="flex min-h-9 items-center gap-1.5 rounded-lg bg-terracotta px-3 py-1.5 text-sm font-bold text-su-oro shadow-lg shadow-ombra/30 transition-all hover:-translate-y-px hover:bg-oro-scuro active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <span>Modifica ricetta</span>
          <span
            aria-hidden="true"
            className={`text-[11px] transition-transform ${aperto ? 'rotate-180' : ''}`}
          >
            ▼
          </span>
        </button>

        {personalizzata ? (
          <span className="rounded-full border border-terracotta/30 bg-oro-velo px-2 py-0.5 text-[10px] font-semibold tracking-wide text-oro-chiaro">
            Ricetta personalizzata
          </span>
        ) : null}
      </div>

      {aperto ? (
        <div
          id="modifica-ricetta"
          className="border-t border-bordo/60 px-3 py-3"
        >
          <div className="grid gap-2.5 min-[420px]:grid-cols-2">
            {campi.map((campo) => (
              <CampoPercentuale
                key={campo.chiave}
                campo={campo}
                valore={parametri[campo.chiave]}
                onCambia={(valore) => onCambia(campo.chiave, valore)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onRipristina}
            disabled={!personalizzata}
            className="mt-3 min-h-9 rounded-lg border border-bordo bg-crema-scuro px-3 py-1.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-bordo disabled:hover:text-inchiostro"
          >
            Ripristina ricetta originale
          </button>

          <p className="sr-only" aria-live="polite">
            {personalizzata
              ? 'Ricetta personalizzata rispetto ai valori originali.'
              : 'Parametri originali della ricetta.'}
          </p>
        </div>
      ) : null}
    </section>
  );
}
