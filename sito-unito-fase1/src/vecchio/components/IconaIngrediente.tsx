import type { TipoIngrediente } from '../types';
import {
  LATO_ICONA,
  contorniIcona,
  percorsoPolilinea,
} from '../lib/icone';

interface Props {
  tipo: TipoIngrediente;
  /** Lato in pixel; il colore segue quello del testo circostante. */
  dimensione?: number;
  className?: string;
}

export function IconaIngrediente({
  tipo,
  dimensione = 16,
  className = '',
}: Props) {
  const { polilinee, cerchi } = contorniIcona(tipo);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={dimensione}
      height={dimensione}
      viewBox={`0 0 ${LATO_ICONA} ${LATO_ICONA}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {polilinee.map((polilinea, indice) => (
        <path key={`t${indice}`} d={percorsoPolilinea(polilinea)} />
      ))}
      {cerchi.map((cerchio, indice) => (
        <circle
          key={`c${indice}`}
          cx={cerchio.cx}
          cy={cerchio.cy}
          r={cerchio.r}
        />
      ))}
    </svg>
  );
}
