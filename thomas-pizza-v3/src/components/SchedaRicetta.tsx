import type { RicettaConfig } from '../types';
import { RICETTE } from '../config/ricette';
import { parametriScheda } from '../lib/vista';

interface Props {
  ricetta: RicettaConfig;
}

function notaRicetta(ricetta: RicettaConfig): string {
  if (ricetta.famiglia === 'diretto') {
    return 'La dose di riferimento è una teglia 30 × 40 cm con 375 g di farina. Il calcolo mantiene la stessa quantità di impasto per unità di superficie.';
  }
  if (ricetta.famiglia === 'biga-autolisi') {
    return 'Il 75% della farina va nella biga, il 25% nell’autolisi facoltativa. Se la disattivi, la farina entra nell’impastamento finale; l’acqua finale resta la parte restante dell’acqua totale.';
  }
  return 'L’85% della farina va nella biga, il restante 15% nel rinfresco. L’autolisi è facoltativa: se la attivi, il calcolatore ripartisce l’acqua totale tra biga, autolisi e rinfresco.';
}

export function SchedaRicetta({ ricetta }: Props) {
  const parametri = parametriScheda(ricetta);

  return (
    <section
      aria-labelledby="ricetta-attiva-titolo"
      className="rounded-2xl border border-bordo/80 bg-carta/70 p-5 shadow-xl shadow-ombra/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-oro-velo px-2.5 py-1 text-[10px] font-bold tracking-widest text-oro-chiaro uppercase">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-terracotta" />
          Ricetta selezionata
        </span>
        <span className="text-[11px] font-medium text-inchiostro-tenue">
          {RICETTE.length} ricette disponibili
        </span>
      </div>

      <h2
        id="ricetta-attiva-titolo"
        className="mt-3 font-serif text-xl leading-snug font-bold tracking-tight text-inchiostro"
      >
        {ricetta.nome}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-inchiostro-tenue">
        {ricetta.descrizione}
      </p>

      <dl className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {parametri.map((parametro) => (
          <div
            key={parametro.etichetta}
            className="flex min-w-0 items-baseline justify-between gap-2 rounded-xl border border-bordo/60 bg-crema-scuro/60 px-3 py-2 min-[380px]:block"
          >
            <dt className="text-[10px] leading-tight font-semibold tracking-wider text-inchiostro-tenue uppercase">
              {parametro.etichetta}
            </dt>
            <dd className="mt-0 min-w-0 text-right text-sm font-bold break-words text-inchiostro tabular-nums min-[380px]:mt-1 min-[380px]:text-left">
              {parametro.valore}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-4 border-l-2 border-terracotta/60 pl-3 text-xs leading-relaxed text-inchiostro-tenue">
        {notaRicetta(ricetta)}
      </p>
    </section>
  );
}
