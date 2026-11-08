import type { Ref } from 'react';
import { adattamentoForza, fasceForza } from '../lib/calcolo';
import type { FasceW } from '../lib/calcolo';
import type { GiudizioForza } from '../types';

interface Props {
  /** W che questa maturazione e questi ingredienti chiedono. */
  consigliato: number;
  /** W efficace del mix, null se non si conosce il W delle farine. */
  efficace: number | null;
  giudizio: GiudizioForza | null;
  /**
   * Le fasce del calcolo, quando non sono quelle percentuali dei motori
   * termici: con il modello a 12 mini-ricette sono la fascia della
   * mini-ricetta con il suo margine.
   */
  fasce?: FasceW;
  /** Il nodo SVG serve all'esportazione: il PDF lo incapsula come immagine. */
  svgRef?: Ref<SVGSVGElement>;
}

const COLORI_GIUDIZIO: Record<GiudizioForza, string> = {
  ottima: 'var(--color-inchiostro)',
  accettabile: 'var(--color-avviso)',
  distante: 'var(--color-errore)',
};

/**
 * La zona di forza richiesta da questo impasto, con il segno del mix sopra.
 *
 * L'asse è il W. La fascia più chiara è la zona **consigliata**: è la parte più
 * alta della curva, cioè il tratto in cui il mix regge per tutta la maturazione
 * senza interventi. Le spalle sono la tolleranza (si recupera allungando o
 * alzando l'idratazione), le code la zona sconsigliata.
 *
 * La zona si muove con gli ingredienti — idratazione, olio, sale, malto — e con
 * le ore equivalenti, che contengono già tempo e temperatura. Il segno del mix
 * no: è fisso, ed è lui che esce dalla zona quando gli estremi spostano tutto
 * il resto.
 */
export function GraficoForza({ consigliato, efficace, giudizio, fasce, svgRef }: Props) {
  const larghezza = 320;
  const tetto = 8;
  const base = 92;

  // Le fasce arrivano dal calcolo: se il motore attivo è quello a 12
  // mini-ricette sono la fascia della mini-ricetta, non il ±15% del punto.
  const zone = fasce ?? fasceForza(consigliato);
  const sicura = zone.sicura;
  // La fascia chiara è la finestra stampata nella card: stessi numeri, disegnati.
  const finestra = { minima: zone.tollerata[0], massima: zone.tollerata[1] };
  const sinistra = Math.min(
    100,
    finestra.minima - 40,
    efficace !== null ? efficace - 30 : Number.POSITIVE_INFINITY,
  );
  const destra = Math.max(
    500,
    finestra.massima + 40,
    efficace !== null ? efficace + 30 : Number.NEGATIVE_INFINITY,
  );

  const x = (w: number) => ((w - sinistra) / (destra - sinistra)) * larghezza;
  const y = (altezza: number) => base - altezza * (base - tetto);

  const punti: string[] = [];
  for (let w = sinistra; w <= destra; w += 2) {
    punti.push(
      `${punti.length === 0 ? 'M' : 'L'} ${x(w).toFixed(1)} ${y(
        adattamentoForza(w, consigliato, zone),
      ).toFixed(1)}`,
    );
  }
  const linea = punti.join(' ');
  const area = `${linea} L ${larghezza} ${base} L 0 ${base} Z`;

  const altezzaMix = efficace === null ? null : adattamentoForza(efficace, consigliato, zone);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${larghezza} 96`}
        className="h-28 w-full"
        role="img"
        aria-label={
          efficace !== null
            ? `Zona di forza consigliata ${Math.round(sicura[0])}–${Math.round(
                sicura[1],
              )} per questo impasto, con un mix a W ${Math.round(efficace)}`
            : `Zona di forza consigliata ${Math.round(sicura[0])}–${Math.round(sicura[1])}`
        }
      >
        {/* La finestra stampata nella card: tolleranza a destra della zona. */}
        <rect
          x={x(finestra.minima)}
          y={tetto}
          width={Math.max(0, x(finestra.massima) - x(finestra.minima))}
          height={base - tetto}
          style={{ fill: 'var(--color-terracotta)' }}
          opacity={0.07}
        />
        {/* Zona consigliata: la parte più alta della curva. */}
        <rect
          x={x(sicura[0])}
          y={tetto}
          width={Math.max(0, x(sicura[1]) - x(sicura[0]))}
          height={base - tetto}
          style={{ fill: 'var(--color-terracotta)' }}
          opacity={0.17}
        />

        <path d={area} style={{ fill: 'var(--color-terracotta)' }} opacity={0.13} />
        <path
          d={linea}
          fill="none"
          style={{ stroke: 'var(--color-terracotta)' }}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Il W che serve: il centro della zona. */}
        <line
          x1={x(consigliato)}
          y1={tetto}
          x2={x(consigliato)}
          y2={base}
          style={{ stroke: 'var(--color-inchiostro)' }}
          strokeWidth={1.2}
          strokeDasharray="4 3"
          opacity={0.6}
        />

        {/* Il mix: il segno che si muove solo se cambiano gli ingressi. */}
        {efficace !== null && altezzaMix !== null ? (
          <>
            <line
              x1={x(efficace)}
              y1={base}
              x2={x(efficace)}
              y2={y(altezzaMix)}
              style={{
                stroke: giudizio ? COLORI_GIUDIZIO[giudizio] : 'var(--color-inchiostro)',
              }}
              strokeWidth={1.6}
            />
            <circle
              cx={x(efficace)}
              cy={y(altezzaMix)}
              r={3.6}
              style={{
                fill: giudizio ? COLORI_GIUDIZIO[giudizio] : 'var(--color-inchiostro)',
              }}
              stroke="var(--color-crema)"
              strokeWidth={1}
            />
          </>
        ) : null}

        <line
          x1={0}
          y1={base}
          x2={larghezza}
          y2={base}
          style={{ stroke: 'var(--color-bordo)' }}
          strokeWidth={1}
        />
      </svg>

      <div className="mt-1 flex items-center justify-between text-[11px] text-inchiostro-tenue">
        <span>W {Math.round(sinistra)}</span>
        <span>
          consigliata {Math.round(sicura[0])}–{Math.round(sicura[1])} · tollerata {finestra.minima}–
          {finestra.massima}
        </span>
        <span>W {Math.round(destra)}</span>
      </div>
      </div>

      {/* Legenda a lato: il colore del mix sta qui, non in un pallino scritto. */}
      <ul className="shrink-0 space-y-2 text-[11px] leading-snug text-inchiostro-tenue sm:w-44">
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.4 }}
          />
          <span>zona consigliata per queste ore</span>
        </li>
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.14 }}
          />
          <span>fascia tollerata: il modello la considera ancora utilizzabile</span>
        </li>
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[3px] border border-dashed"
            style={{ borderColor: 'var(--color-inchiostro)' }}
          />
          <span>serve W {Math.round(consigliato)}</span>
        </li>
        {efficace !== null ? (
          <li className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-full"
              style={{
                background: giudizio ? COLORI_GIUDIZIO[giudizio] : 'var(--color-inchiostro)',
              }}
            />
            <span>mix a W {Math.round(efficace)}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
