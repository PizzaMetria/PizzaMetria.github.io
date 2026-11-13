/*
 * LA FORCHETTA DELLA DOSE
 * -----------------------
 * Le 193 ricette italiane dirette, per ogni motore e ogni stile, danno dosi che
 * stanno in un intervallo largo: la mediana del rapporto ricetta/modello è 1,00,
 * ma metà delle ricette sta fra il primo e il terzo quartile, e quel quarto di
 * distanza è la forchetta qui sotto.
 *
 * Serve perché un numero solo è una bugia comoda: la farina, la temperatura
 * reale del frigo e il modo di lavorare spostano la dose più di quanto sposti il
 * modello. Mostrare l'intervallo rende l'onestà visibile.
 *
 *   npx vite-node scripts/bande-dosi.ts
 *
 * rigenera questo file. Se cambia un coefficiente, cambia anche la forchetta:
 * è il modo giusto, purché il cambiamento sia voluto.
 */
import type { Modello, Ramo } from '../types';
import { grammiLievito } from './numeri';

/** Moltiplicatori sulla dose del modello: [quarto inferiore, superiore]. */
export const BANDE_DOSI: Record<Modello, Record<Ramo, [number, number]>> = {
  miniRicette: { verace: [0.79, 2.64], contemporanea: [0.79, 3.83], teglia: [0.58, 1.67] },
  termico: { verace: [0.64, 2.21], contemporanea: [0.47, 2.24], teglia: [0.58, 1.38] },
  nuovo: { verace: [0.59, 2.58], contemporanea: [0.90, 4.34], teglia: [0.46, 1.20] },
  vecchio: { verace: [0.61, 2.08], contemporanea: [0.79, 3.71], teglia: [0.48, 1.20] },
};

/**
 * La forchetta in grammi, già formattata per la scheda. Sotto il centesimo il
 * limite inferiore non si scrive: «< 0,01–0,03» sembrerebbe un refuso.
 */
export function forchettaDose(modello: Modello, ramo: Ramo, doseG: number): string {
  const [minimo, massimo] = BANDE_DOSI[modello][ramo];
  const basso = grammiLievito(doseG * minimo);
  const alto = grammiLievito(doseG * massimo);
  if (doseG * minimo < 0.01) return 'fino a ' + alto;
  return basso + '–' + alto;
}
