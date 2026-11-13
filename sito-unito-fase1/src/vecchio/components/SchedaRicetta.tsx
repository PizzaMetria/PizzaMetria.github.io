import { Pannello } from '../../components/ui/Pannello';
import type { RicettaConfig } from '../types';
import { formattaPercentuale } from '../lib/formato';
import { parametriScheda, sottotitoloRicetta, tipoImpasto } from '../lib/vista';

interface Props {
  ricetta: RicettaConfig;
  incorporata?: boolean;
}

function notaRicetta(ricetta: RicettaConfig): string {
  // Gli impasti diretti definiscono la propria nota in `notaScheda`; qui resta
  // il testo delle ricette con biga, con le rispettive percentuali:
  // la biga ha un'acqua sua, quindi il calcolo ripartisce quella restante.
  const quotaBiga = ricetta.quotaFarinaBiga ?? 0;
  const percentualeBiga = formattaPercentuale(quotaBiga);
  const articolo = /^(8|11|18)/.test(percentualeBiga) ? 'L’' : 'Il ';

  return `${articolo}${percentualeBiga} della farina va nella biga, il restante ${formattaPercentuale(
    1 - quotaBiga,
  )} nel rinfresco. L’autolisi è facoltativa: se la attivi, il calcolatore ripartisce l’acqua restante tra autolisi e rinfresco.`;
}

export function SchedaRicetta({ ricetta, incorporata = false }: Props) {
  const parametri = parametriScheda(ricetta);

  return (
    <Pannello
      id="ricetta-attiva"
      titolo={incorporata ? "Caratteristiche dell’impasto" : ricetta.nome}
      nota={incorporata ? undefined : sottotitoloRicetta(ricetta)}
    >
      <div className="mt-3 flex items-start justify-between gap-x-2 gap-y-1">
        <span className="inline-flex shrink-0 items-center rounded-full border border-bordo bg-crema-scuro/70 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-inchiostro-tenue uppercase">
          {tipoImpasto(ricetta)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
        {parametri.map((parametro) => {
          const consiglioFarina = ricetta.famiglia !== 'diretto' && ricetta.farinaScheda && parametro.etichetta === 'Farina';
          return (
            <div
              key={parametro.etichetta}
              className={`min-w-0 rounded-xl border border-bordo/60 bg-crema-scuro/60 px-3 py-2 ${consiglioFarina ? 'col-span-full' : 'flex items-baseline justify-between gap-2 min-[380px]:block'}`}
            >
              <dt className="text-[10px] leading-tight font-semibold tracking-wider text-inchiostro-tenue uppercase">
                {parametro.etichetta}
              </dt>
              <dd className={`min-w-0 break-words text-sm text-inchiostro ${consiglioFarina ? 'mt-1 font-normal' : 'text-right font-bold tabular-nums min-[380px]:mt-1 min-[380px]:text-left'}`}>
                {consiglioFarina ? parametro.valore.split('\n').map((riga) => {
                  const separatore = riga.indexOf(':');
                if (separatore === -1) return <span key={riga} className="block">{riga}</span>;
                  return (
                    <span key={riga} className="block">
                      <span className="font-medium">{riga.slice(0, separatore + 1)}</span>
                      {riga.slice(separatore + 1)}
                    </span>
                  );
                }) : parametro.valore}
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="mt-4 border-l-2 border-terracotta/60 pl-3 text-xs leading-relaxed text-inchiostro-tenue">
        {ricetta.notaScheda ?? notaRicetta(ricetta)}
      </p>
    </Pannello>
  );
}
