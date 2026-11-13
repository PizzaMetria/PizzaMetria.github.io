import type { TipoImpasto } from '../types';

/** Nome leggibile dei tre impasti, come nei file esportati dal sito. */
const SLUG: Record<TipoImpasto, string> = {
  verace: 'tonda-verace',
  contemporanea: 'tonda-contemporanea',
  teglia: 'teglia',
};

/**
 * `pizzametria-tonda-verace-2026-10-29-1840.pdf`: l'impasto, il giorno e
 * l'ora della creazione. L'ora serve perché due file dello stesso giorno
 * avrebbero lo stesso nome e il telefono li rinominerebbe con «(1)».
 */
export function nomeFoglio(
  tipo: TipoImpasto,
  formato: 'jpg' | 'pdf',
  data: Date = new Date(),
): string {
  const due = (numero: number): string => String(numero).padStart(2, '0');
  const giorno = `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}`;
  const ora = `${due(data.getHours())}${due(data.getMinutes())}`;

  return `pizzametria-${SLUG[tipo]}-${giorno}-${ora}.${formato}`;
}
