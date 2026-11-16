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
 * così si riconosce anche senza legenda. Griglia e tacche ci sono per leggere
 * un valore, non per decorare: senza, una curva morbida non dice nulla.
 */
export function Grafico({ curva, fasce, oreTotali, svgRef }: Props) {
  const larghezza = 520;
  // Il riquadro è largo: il disegno prende anche l'altezza che avanza, così la
  // curva si legge senza strizzare gli occhi e la legenda resta sulla sinistra.
  const altezza = 232;
  // Spazio a sinistra per le temperature: l'asse verticale sta lì, non sparse
  // fra le etichette in basso.
  const margine = 42;
  const margineDestro = 14;
  const base = 192;
  const tetto = 16;
  const larghezzaArea = larghezza - margine - margineDestro;

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

  const primo = curva[0];
  const ultimo = curva[curva.length - 1];
  const area = `${linea} L ${x(ultimo.ora).toFixed(1)} ${base} L ${margine} ${base} Z`;

  // Quattro intervalli: bastano a collocare un'ora senza affollare l'asse.
  const tacche = [0, 0.25, 0.5, 0.75, 1];

  const inFrigo = fasce.filter((fascia) => fascia.inFrigo);
  const oreInFrigo = inFrigo.reduce((somma, fascia) => somma + (fascia.a - fascia.da), 0);
  // L'etichetta sta nella fascia più larga: nelle altre non ci starebbe.
  const fasciaPiuLarga = inFrigo.reduce<FasciaCurva | null>(
    (scelta, fascia) =>
      scelta === null || fascia.a - fascia.da > scelta.a - scelta.da ? fascia : scelta,
    null,
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      {/* Legenda a sinistra: prima del grafico, con il segno accanto alla voce. */}
      <ul className="order-last shrink-0 space-y-3 text-[12px] leading-snug text-inchiostro sm:order-first sm:w-44">
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-px inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.4 }}
          />
          <span>attività del lievito</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[7px] inline-block w-4 shrink-0"
            style={{ borderTop: '2px dashed var(--color-inchiostro)', opacity: 0.8 }}
          />
          <span>temperatura dell’impasto</span>
        </li>
        {oreInFrigo > 0 ? (
          <li className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]"
              style={{
                background: 'var(--color-carta)',
                border: '1px dashed var(--color-inchiostro-tenue)',
              }}
            />
            <span>
              ore in frigorifero
              <span className="text-inchiostro-tenue"> · {Math.round(oreInFrigo)} h</span>
            </span>
          </li>
        ) : null}
      </ul>

      <div className="min-w-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${larghezza} ${altezza}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Andamento della temperatura dell'impasto e del ritmo di lievitazione in ${Math.round(
            oreTotali,
          )} ore${oreInFrigo > 0 ? `, di cui ${Math.round(oreInFrigo)} in frigorifero` : ''}`}
        >
          {/* Griglia: tacche dei tempi e tre righe orizzontali, appena visibili. */}
          {tacche.map((quota) => (
            <line
              key={`griglia-${quota}`}
              x1={x(maxOre * quota)}
              y1={tetto}
              x2={x(maxOre * quota)}
              y2={base}
              style={{ stroke: 'var(--color-bordo)' }}
              strokeWidth={0.7}
              strokeDasharray="2 4"
              opacity={quota === 0 || quota === 1 ? 0 : 0.8}
            />
          ))}
          {[1 / 3, 2 / 3].map((quota) => (
            <line
              key={`orizzonte-${quota}`}
              x1={margine}
              y1={base - quota * (base - tetto)}
              x2={larghezza - margineDestro}
              y2={base - quota * (base - tetto)}
              style={{ stroke: 'var(--color-bordo)' }}
              strokeWidth={0.7}
              strokeDasharray="2 4"
              opacity={0.8}
            />
          ))}

          {/* La zona fredda: un blocco pieno, non una sfumatura. */}
          {inFrigo.map((fascia) => (
            <rect
              key={`${fascia.da}-${fascia.a}`}
              x={x(fascia.da)}
              y={tetto}
              width={Math.max(0, x(fascia.a) - x(fascia.da))}
              height={base - tetto}
              style={{ fill: 'var(--color-carta)', stroke: 'var(--color-inchiostro-tenue)' }}
              strokeWidth={0.9}
              strokeDasharray="4 3"
              opacity={0.9}
            />
          ))}
          {fasciaPiuLarga ? (
            <text
              x={(x(fasciaPiuLarga.da) + x(fasciaPiuLarga.a)) / 2}
              y={tetto + 9.5}
              textAnchor="middle"
              fontSize={8.5}
              letterSpacing="1"
              style={{ fill: 'var(--color-inchiostro-tenue)' }}
            >
              FRIGO
            </text>
          ) : null}

          <path d={area} style={{ fill: 'var(--color-terracotta)' }} opacity={0.22} />
          <path
            d={linea}
            fill="none"
            style={{ stroke: 'var(--color-terracotta-scuro)' }}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={termica}
            fill="none"
            style={{ stroke: 'var(--color-inchiostro)' }}
            strokeWidth={1.8}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="5 3"
            opacity={0.8}
          />

          {/* I due punti di arrivo: dove finisce la maturazione. */}
          <circle
            cx={x(ultimo.ora)}
            cy={y(ultimo.attivita)}
            r={2.8}
            style={{ fill: 'var(--color-terracotta-scuro)', stroke: 'var(--color-carta)' }}
            strokeWidth={1.2}
          />
          <circle
            cx={x(ultimo.ora)}
            cy={yTemperatura(ultimo.temperatura)}
            r={2.4}
            style={{ fill: 'var(--color-inchiostro)', stroke: 'var(--color-carta)' }}
            strokeWidth={1.2}
          />
          <circle
            cx={x(primo.ora)}
            cy={yTemperatura(primo.temperatura)}
            r={2.4}
            style={{ fill: 'var(--color-inchiostro)', stroke: 'var(--color-carta)' }}
            strokeWidth={1.2}
          />

          {/* Asse dei tempi, in basso: da zero alle ore totali. */}
          <line
            x1={margine}
            y1={base}
            x2={larghezza - margineDestro}
            y2={base}
            style={{ stroke: 'var(--color-inchiostro-tenue)' }}
            strokeWidth={1}
            opacity={0.6}
          />
          {tacche.map((quota) => (
            <g key={`tempo-${quota}`}>
              <line
                x1={x(maxOre * quota)}
                y1={base}
                x2={x(maxOre * quota)}
                y2={base + 3.5}
                style={{ stroke: 'var(--color-inchiostro-tenue)' }}
                strokeWidth={1}
                opacity={0.6}
              />
              <text
                x={x(maxOre * quota)}
                y={base + 14}
                textAnchor={quota === 0 ? 'start' : quota === 1 ? 'end' : 'middle'}
                fontSize={8.6}
                style={{ fill: 'var(--color-inchiostro-tenue)' }}
              >
                {Number((maxOre * quota).toFixed(1))} h
              </text>
            </g>
          ))}

          {/* Asse delle temperature, a sinistra: minimo e massimo della curva. */}
          <line
            x1={margine}
            y1={tetto}
            x2={margine}
            y2={base}
            style={{ stroke: 'var(--color-inchiostro-tenue)' }}
            strokeWidth={1}
            opacity={0.6}
          />
          <line
            x1={margine - 3.5}
            y1={tetto}
            x2={margine}
            y2={tetto}
            style={{ stroke: 'var(--color-inchiostro-tenue)' }}
            strokeWidth={1}
            opacity={0.6}
          />
          <line
            x1={margine - 3.5}
            y1={base}
            x2={margine}
            y2={base}
            style={{ stroke: 'var(--color-inchiostro-tenue)' }}
            strokeWidth={1}
            opacity={0.6}
          />
          <text
            x={margine - 6}
            y={tetto + 3}
            textAnchor="end"
            fontSize={9}
            style={{ fill: 'var(--color-inchiostro)' }}
          >
            {Math.round(massima)}°
          </text>
          <text
            x={margine - 6}
            y={base}
            textAnchor="end"
            fontSize={9}
            style={{ fill: 'var(--color-inchiostro)' }}
          >
            {Math.round(minima)}°
          </text>
        </svg>
      </div>
    </div>
  );
}
