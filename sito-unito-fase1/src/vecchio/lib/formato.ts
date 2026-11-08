import type { TipoIngrediente } from '../types';

const formattatoreGrammi = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  useGrouping: true,
});

const formattatoreKg = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  useGrouping: true,
});

const formattatorePercentuale = new Intl.NumberFormat('it-IT', {
  style: 'percent',
  maximumFractionDigits: 2,
});

const formattatoreIntero = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 0,
  useGrouping: true,
});

const formattatoreUnDecimale = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const formattatoreData = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const formattatoreOra = new Intl.DateTimeFormat('it-IT', {
  hour: '2-digit',
  minute: '2-digit',
});

function normalizzaZero(valore: number): number {
  // Evita di mostrare "-0" o valori negativi dovuti a errori di rappresentazione.
  return Math.abs(valore) < 0.05 ? 0 : valore;
}

/** Grammi con massimo una cifra decimale, senza ",0" finale. */
export function formattaGrammi(valore: number): string {
  if (!Number.isFinite(valore)) return '—';
  return `${formattatoreGrammi.format(normalizzaZero(valore))} g`;
}

/** Cifra decimale senza unità di misura. */
export function formattaNumero(valore: number, massimoDecimali = 1): string {
  if (!Number.isFinite(valore)) return '—';
  return new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: massimoDecimali,
  }).format(normalizzaZero(valore));
}

/** Chilogrammi per i dati di partenza. */
export function formattaKg(valore: number): string {
  if (!Number.isFinite(valore)) return '—';
  return `${formattatoreKg.format(valore)} kg`;
}

export function formattaIntero(valore: number): string {
  if (!Number.isFinite(valore)) return '—';
  return formattatoreIntero.format(valore);
}

/**
 * Grammi con l'arrotondamento previsto per il tipo di ingrediente.
 * Lievito e malto hanno sempre un decimale; farina e acqua sono interi;
 * sale e olio sono interi da 10 g in su e con un decimale sotto i 10 g.
 */
export function formattaGrammiIngrediente(
  valore: number,
  tipo: TipoIngrediente,
): string {
  if (!Number.isFinite(valore)) return '—';

  const arrotondato = Math.round(valore * 10) / 10;

  switch (tipo) {
    case 'lievito':
    case 'malto':
      return `${formattatoreUnDecimale.format(normalizzaZero(arrotondato))} g`;
    case 'farina':
    case 'acqua':
      // L'arrotondamento a un decimale elimina il rumore in virgola mobile
      // (332,49999… → 332,5) prima di passare all'intero.
      return `${formattatoreIntero.format(normalizzaZero(Math.round(arrotondato)))} g`;
    case 'sale':
    case 'olio':
      return Math.abs(arrotondato) >= 10
        ? `${formattatoreIntero.format(normalizzaZero(Math.round(arrotondato)))} g`
        : `${formattatoreUnDecimale.format(normalizzaZero(arrotondato))} g`;
    default:
      return formattaGrammi(valore);
  }
}

/** Frazione → percentuale italiana (0.75 → "75%"). */
export function formattaPercentuale(frazione: number): string {
  if (!Number.isFinite(frazione)) return '—';
  return formattatorePercentuale.format(frazione);
}

export function formattaTemperatura(celsius: number): string {
  return `${formattaNumero(celsius, 1)} °C`;
}

/** Data leggibile italiana, es. "21 ottobre 2026". */
export function formattaData(data: Date): string {
  return formattatoreData.format(data);
}

/** Ora locale, es. "15:04". */
export function formattaOra(data: Date): string {
  return formattatoreOra.format(data);
}

/** Data e ora per le esportazioni. */
export function formattaDataOra(data: Date): string {
  return `${formattaData(data)} · ore ${formattaOra(data)}`;
}

/** Data per il nome file, in fuso locale: AAAA-MM-GG. */
export function formattaDataFile(data: Date): string {
  const anno = data.getFullYear();
  const mese = String(data.getMonth() + 1).padStart(2, '0');
  const giorno = String(data.getDate()).padStart(2, '0');
  return `${anno}-${mese}-${giorno}`;
}
