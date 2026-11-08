import type { TipoImpasto } from '../types';

/** Nome leggibile dei tre impasti, come nei file esportati dal sito. */
const SLUG: Record<TipoImpasto, string> = {
  verace: 'tonda-verace',
  contemporanea: 'tonda-contemporanea',
  teglia: 'teglia',
};

/** `pizzametria-tonda-verace-2026-10-29.pdf`, con la data del giorno. */
export function nomeFoglio(
  tipo: TipoImpasto,
  formato: 'jpg' | 'pdf',
  data: Date = new Date(),
): string {
  const due = (numero: number): string => String(numero).padStart(2, '0');
  const giorno = `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`;

  return `pizzametria-${SLUG[tipo]}-${giorno}.${formato}`;
}
