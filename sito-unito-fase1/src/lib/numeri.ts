/** Legge un numero scritto con virgola o punto, rifiutando testo misto. */
export function leggiNumeroDecimale(grezzo: string): number | null {
  const testo = grezzo.trim();
  if (testo === '') return null;
  if (!/^-?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(testo)) return null;

  const numero = Number(testo.replace(',', '.'));
  return Number.isFinite(numero) ? numero : null;
}

/** Numero con la virgola italiana e i decimali richiesti. */
export function formatta(valore: number, decimali = 0): string {
  return valore.toLocaleString('it-IT', {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
  });
}

/**
 * Grammi: interi se il valore è intero, un decimale se serve, due decimali
 * sotto il grammo — è la scala del lievito secco, dove 0,1 g conta.
 */
export function grammi(valore: number): string {
  if (Number.isInteger(valore)) return formatta(valore, 0);
  if (Math.abs(valore) < 1) return formatta(valore, 2);
  return formatta(valore, 1);
}

/** Ore leggibili: 1,5 h oppure 24 h. */
export function ore(valore: number): string {
  return Number.isInteger(valore) ? formatta(valore, 0) : formatta(valore, 1);
}

/** Data nel formato accettato da <input type="datetime-local">. */
export function aInputData(data: Date): string {
  const due = (numero: number) => String(numero).padStart(2, '0');
  return `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())}T${due(
    data.getHours(),
  )}:${due(data.getMinutes())}`;
}

/** Data e ora in italiano, senza secondi. */
export function formattaQuando(data: Date): string {
  return data.toLocaleString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
