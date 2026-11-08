import { IconaPizza } from './IconaPizza';
import { IconaRicette } from './IconaRicette';
import { IconaPrefermento } from './IconaPrefermento';

/** Le tre voci della fisarmonica della home. */
type Gruppo = 'nuovo' | 'vecchio' | 'biga';

/**
 * Piccola icona che caratterizza la voce: pizza tonda per il calcolatore,
 * ricettario per le ricette di casa, pane per il prefermento. Ogni disegno è
 * un file vettoriale suo. È puramente decorativa: il testo della voce resta
 * l'unica etichetta.
 */
export function IconaGruppo({ id }: { id: Gruppo }) {
  if (id === 'nuovo') return <IconaPizza />;
  if (id === 'vecchio') return <IconaRicette />;
  return <IconaPrefermento />;
}
