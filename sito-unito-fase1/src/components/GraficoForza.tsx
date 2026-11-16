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

/** Passo delle tacche sull'asse del W: pochi numeri tondi, mai un asse fitto. */
function passoAsse(minimo: number, massimo: number): number {
  const intervallo = massimo - minimo;
  for (const passo of [25, 50, 100, 125, 250, 500]) {
    if (intervallo / passo <= 6) return passo;
  }
  return 1000;
}

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
  const larghezza = 520;
  // Stessa altezza dell'attività: i due grafici stanno uno sopra l'altro e
  // devono respirare allo stesso modo, con la legenda in colonna a sinistra.
  const altezza = 242;
  const margine = 12;
  const margineDestro = 14;
  const tetto = 20;
  const base = 192;
  const larghezzaArea = larghezza - margine - margineDestro;

  // Le fasce arrivano dal calcolo: se il motore attivo è quello a 12
  // mini-ricette sono la fascia della mini-ricetta, non il ±15% del punto.
  const zone = fasce ?? fasceForza(consigliato);
  const sicura = zone.sicura;
  // La fascia chiara è la finestra stampata nella card: stessi numeri, disegnati.
  const finestra = { minima: zone.tollerata[0], massima: zone.tollerata[1] };
  // L'asse segue i dati invece di stare fisso fra 100 e 500: con una zona
  // stretta (per esempio 247–307) la curva si schiacciava in fondo e il mix
  // finiva sul bordo, senza margine per leggere il numero.
  const minimoDati = Math.min(
    finestra.minima,
    sicura[0],
    efficace !== null ? efficace : Number.POSITIVE_INFINITY,
  );
  const massimoDati = Math.max(
    finestra.massima,
    sicura[1],
    efficace !== null ? efficace : Number.NEGATIVE_INFINITY,
  );
  const respiro = Math.max(20, Math.round((massimoDati - minimoDati) * 0.4));
  const sinistra = Math.max(25, Math.floor((minimoDati - respiro) / 25) * 25);
  const destra = Math.max(
    sinistra + 100,
    Math.ceil((massimoDati + respiro) / 25) * 25,
  );

  const x = (w: number) => margine + ((w - sinistra) / (destra - sinistra)) * larghezzaArea;
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
  const area = `${linea} L ${x(destra).toFixed(1)} ${base} L ${x(sinistra).toFixed(1)} ${base} Z`;

  const altezzaMix = efficace === null ? null : adattamentoForza(efficace, consigliato, zone);
  const coloreMix = giudizio ? COLORI_GIUDIZIO[giudizio] : 'var(--color-inchiostro)';

  const passo = passoAsse(sinistra, destra);
  const tacche: number[] = [];
  for (let w = Math.ceil(sinistra / passo) * passo; w <= destra; w += passo) tacche.push(w);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
      {/* Legenda a sinistra: il colore del mix sta qui, non in un pallino scritto. */}
      <ul className="order-last shrink-0 space-y-3 text-[12px] leading-snug text-inchiostro sm:order-first sm:w-44">
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-px inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.4 }}
          />
          <span>zona consigliata per queste ore</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-px inline-block h-3.5 w-3.5 shrink-0 rounded-[3px]"
            style={{ background: 'var(--color-terracotta)', opacity: 0.14 }}
          />
          <span>fascia tollerata: il modello la considera ancora utilizzabile</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[7px] inline-block w-4 shrink-0"
            style={{ borderTop: '2px dashed var(--color-inchiostro)', opacity: 0.55 }}
          />
          <span>W consigliato {Math.round(consigliato)}</span>
        </li>
        {efficace !== null ? (
          <li className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-px inline-block h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ background: coloreMix }}
            />
            <span>mix a W {Math.round(efficace)}</span>
          </li>
        ) : null}
      </ul>

      <div className="min-w-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${larghezza} ${altezza}`}
          className="h-auto w-full"
          role="img"
          aria-label={
            efficace !== null
              ? `Zona di forza consigliata ${Math.round(sicura[0])}–${Math.round(
                  sicura[1],
                )} per questo impasto, con un mix a W ${Math.round(efficace)}`
              : `Zona di forza consigliata ${Math.round(sicura[0])}–${Math.round(sicura[1])}`
          }
        >
          <text x={margine} y={12} fontSize={12} fontWeight={600} fill="var(--color-inchiostro-tenue)">
            Compatibilità stimata
          </text>
          {/* Griglia orizzontale: tre righe per leggere l'altezza della curva. */}
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
            />
          ))}

          {/* La finestra stampata nella card: tolleranza attorno alla zona. */}
          <rect
            x={x(finestra.minima)}
            y={tetto}
            width={Math.max(0, x(finestra.massima) - x(finestra.minima))}
            height={base - tetto}
            style={{ fill: 'var(--color-terracotta)', stroke: 'var(--color-terracotta-scuro)' }}
            fillOpacity={0.09}
            strokeWidth={1}
            strokeDasharray="5 3"
            strokeOpacity={0.5}
          />
          {/* Zona consigliata: la parte più alta della curva. */}
          <rect
            x={x(sicura[0])}
            y={tetto}
            width={Math.max(0, x(sicura[1]) - x(sicura[0]))}
            height={base - tetto}
            style={{ fill: 'var(--color-terracotta)', stroke: 'var(--color-terracotta-scuro)' }}
            fillOpacity={0.22}
            strokeWidth={1.1}
            strokeOpacity={0.85}
          />

          <path d={area} style={{ fill: 'var(--color-terracotta)' }} opacity={0.12} />
          <path
            d={linea}
            fill="none"
            style={{ stroke: 'var(--color-terracotta-scuro)' }}
            strokeWidth={2.2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Il W che serve: il centro della zona. */}
          <line
            x1={x(consigliato)}
            y1={tetto}
            x2={x(consigliato)}
            y2={base}
            style={{ stroke: 'var(--color-inchiostro)' }}
            strokeWidth={1.2}
            strokeDasharray="5 3"
            opacity={0.55}
          />

          {/* Il mix: il segno che si muove solo se cambiano gli ingressi. */}
          {efficace !== null && altezzaMix !== null ? (
            <>
              <line
                x1={x(efficace)}
                y1={base}
                x2={x(efficace)}
                y2={y(altezzaMix)}
                style={{ stroke: coloreMix }}
                strokeWidth={1.8}
              />
              <circle
                cx={x(efficace)}
                cy={y(altezzaMix)}
                r={4}
                style={{ fill: coloreMix, stroke: 'var(--color-carta)' }}
                strokeWidth={1.5}
              />
              <text
                x={x(efficace)}
                y={y(altezzaMix) - 9}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                style={{ fill: 'var(--color-inchiostro)' }}
              >
                W {Math.round(efficace)}
              </text>
            </>
          ) : null}

          <line
            x1={margine}
            y1={base}
            x2={larghezza - margineDestro}
            y2={base}
            style={{ stroke: 'var(--color-inchiostro-tenue)' }}
            strokeWidth={1}
            opacity={0.6}
          />
          {tacche.map((valore) => (
            <g key={`tacca-${valore}`}>
              <line
                x1={x(valore)}
                y1={base}
                x2={x(valore)}
                y2={base + 3.5}
                style={{ stroke: 'var(--color-inchiostro-tenue)' }}
                strokeWidth={1}
                opacity={0.6}
              />
              <text
                x={x(valore)}
                y={base + 14}
                textAnchor="middle"
                fontSize={8.8}
                style={{ fill: 'var(--color-inchiostro-tenue)' }}
              >
                {valore}
              </text>
            </g>
          ))}
          <text x={larghezza / 2} y={base + 33} textAnchor="middle" fontSize={12}
            fill="var(--color-inchiostro-tenue)">
            Forza della farina (W)
          </text>
        </svg>
      </div>
    </div>
  );
}
