import type { Ref } from 'react';
import type { FasciaCurva, PuntoCurva } from '../types';

interface Props {
  curva: readonly PuntoCurva[];
  fasce: readonly FasciaCurva[];
  oreTotali: number;
  /** Il nodo SVG serve all'esportazione: il PDF lo incapsula come immagine. */
  svgRef?: Ref<SVGSVGElement>;
}

/**
 * Grafico dell'attività del lievito e della temperatura dell'impasto.
 *
 * L'area è il ritmo di fermentazione: quante ore equivalenti matura l'impasto
 * in ogni ora. La linea è la temperatura reale del pezzo, che insegue
 * l'ambiente senza saltarci sopra: è il tratto che rende visibile l'inerzia
 * termica.
 *
 * I due assi restano separati e dichiarati: i tempi corrono in basso da zero
 * alle ore totali, le temperature si leggono sulla sinistra fra il minimo e il
 * massimo della curva. La zona del frigorifero è un rettangolo pieno e bordato,
 * così si riconosce anche senza legenda.
 */
export function Grafico({ curva, fasce, oreTotali, svgRef }: Props) {
  const larghezza = 360;
  // Spazio a sinistra per le temperature: l'asse verticale sta lì, non sparse
  // fra le etichette in basso.
  const margine = 30;
  const base = 92;
  const tetto = 12;
  const altezza = 110;
  const larghezzaArea = larghezza - margine;

  const maxOre = Math.max(oreTotali, 0.5);
  const maxAttivita = Math.max(1, ...curva.map((punto) => punto.attivita));

  const temperature = curva.map((punto) => punto.temperatura);
  const minima = Math.min(...temperature);
  const massima = Math.max(...temperature);
  const intervallo = Math.max(massima - minima, 0.5);

  const x = (ora: number) => margine + (ora / maxOre) * larghezzaArea;
  const y = (attivita: number) => base - (attivita / maxAttivita) * (base - tetto);
  // La temperatura ha una scala sua, quella scritta sull'asse di sinistra.
  const yTemperatura = (temperatura: number) =>
    base - ((temperatura - minima) / intervallo) * (base - tetto);

  const linea = curva
    .map(
      (punto, indice) =>
        `${indice === 0 ? 'M' : 'L'} ${x(punto.ora).toFixed(1)} ${y(punto.attivita).toFixed(1)}`,
    )
    .join(' ');

  const termica = curva
    .map(
      (punto, indice) =>
        `${indice === 0 ? 'M' : 'L'} ${x(punto.ora).toFixed(1)} ${yTemperatura(
          punto.temperatura,
        ).toFixed(1)}`,
    )
    .join(' ');

  const ultimo = curva[curva.length - 1];
  const area = `${linea} L ${x(ultimo.ora).toFixed(1)} ${base} L ${margine} ${base} Z`;

  const inFrigo = fasce.filter((fascia) => fascia.inFrigo);
  const oreInFrigo = inFrigo.reduce((somma, fascia) => somma + (fascia.a - fascia.da), 0);
  // L'etichetta sta nella fascia più larga: nelle altre non ci starebbe.
  const fasciaPiuLarga = inFrigo.reduce<FasciaCurva | null>(
    (scelta, fascia) =>
      scelta === null || fascia.a - fascia.da > scelta.a - scelta.da ? fascia : scelta,
    null,
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${larghezza} ${altezza}`}
          className="h-28 w-full"
          role="img"
          aria-label={`Andamento della temperatura dell'impasto e del ritmo di lievitazione in ${Math.round(
            oreTotali,
          )} ore${oreInFrigo > 0 ? `, di cui ${Math.round(oreInFrigo)} in frigorifero` : ''}`}
        >
          {/* La zona fredda: un blocco pieno, non una sfumatura. */}
          {inFrigo.map((fascia) => (
            <rect
              key={`${fascia.da}-${fascia.a}`}
              x={x(fascia.da)}
              y={tetto}
              width={Math.max(0, x(fascia.a) - x(fascia.da))}
              height={base - tetto}
              style={{ fill: 'var(--color-carta)', stroke: 'var(--color-bordo)' }}
              strokeWidth={0.8}
              strokeDasharray="3 2"
              opacity={0.95}
            />
          ))}
          {fasciaPiuLarga ? (
            <text
              x={(x(fasciaPiuLarga.da) + x(fasciaPiuLarga.a)) / 2}
              y={tetto + 8}
              textAnchor="middle"
              fontSize={6.5}
              letterSpacing="0.6"
              style={{ fill: 'var(--color-inchiostro-tenue)' }}
            >
              FRIGO
            </text>
          ) : null}

          <path d={area} style={{ fill: 'var(--color-terracotta)' }} opacity={0.16} />
          <path
            d={linea}
            fill="none"
            style={{ stroke: 'var(--color-terracotta)' }}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path
            d={termica}
            fill="none"
            style={{ stroke: 'var(--color-inchiostro)' }}
            strokeWidth={1.4}
            strokeLinejoin="round"
            opacity={0.75}
          />

          {/* Asse dei tempi, in basso: da zero alle ore totali. */}
          <line
            x1={margine}
            y1={base}
            x2={larghezza}
            y2={base}
            style={{ stroke: 'var(--color-bordo)' }}
            strokeWidth={1}
          />
          <text
            x={margine}
            y={base + 10}
            textAnchor="start"
            fontSize={7}
            style={{ fill: 'var(--color-inchiostro-tenue)' }}
          >
            0 h
          </text>
          <text
            x={margine + larghezzaArea / 2}
            y={base + 10}
            textAnchor="middle"
            fontSize={7}
            style={{ fill: 'var(--color-inchiostro-tenue)' }}
          >
            {Math.round(maxOre / 2)} h
          </text>
          <text
            x={larghezza}
            y={base + 10}
            textAnchor="end"
            fontSize={7}
            style={{ fill: 'var(--color-inchiostro-tenue)' }}
          >
            {Math.round(maxOre)} h
          </text>

          {/* Asse delle temperature, a sinistra: minimo e massimo della curva. */}
          <line
            x1={margine}
            y1={tetto}
            x2={margine}
            y2={base}
            style={{ stroke: 'var(--color-bordo)' }}
            strokeWidth={1}
          />
          <text
            x={margine - 3}
            y={tetto + 3}
            textAnchor="end"
            fontSize={7}
            style={{ fill: 'var(--color-inchiostro-tenue)' }}
          >
            {Math.round(massima)}°
          </text>
          <text
            x={margine - 3}
            y={base}
            textAnchor="end"
            fontSize={7}
            style={{ fill: 'var(--color-inchiostro-tenue)' }}
          >
            {Math.round(minima)}°
          </text>
        </svg>
      </div>

      {/* Legenda breve: un simbolo per voce, nessuna frase in più. */}
      <ul className="shrink-0 space-y-2 text-[11px] leading-snug text-inchiostro-tenue sm:w-44">
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.45 }}
          />
          <span>attività del lievito</span>
        </li>
        <li className="flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-1 inline-block h-0.5 w-4 shrink-0"
            style={{ background: 'var(--color-inchiostro)', opacity: 0.75 }}
          />
          <span>temperatura dell’impasto</span>
        </li>
        {oreInFrigo > 0 ? (
          <li className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-[3px] border border-bordo"
              style={{ background: 'var(--color-carta)' }}
            />
            <span>frigorifero</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
