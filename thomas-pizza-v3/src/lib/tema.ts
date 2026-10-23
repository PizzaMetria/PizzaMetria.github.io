/** Tema dell’interfaccia. Le esportazioni JPG e PDF restano sempre chiare. */
export type Tema = 'chiaro' | 'scuro';

/** Chiave separata dallo stato delle ricette: il tema vale per tutto il sito. */
export const CHIAVE_TEMA = 'thomas-pizza-tema';

export const TEMA_PREDEFINITO: Tema = 'scuro';

export function temaOpposto(tema: Tema): Tema {
  return tema === 'chiaro' ? 'scuro' : 'chiaro';
}

/**
 * Sceglie il tema: vale la scelta salvata, altrimenti la preferenza di sistema.
 * Funzione pura, usata sia dal codice React sia dallo script nel <head>.
 */
export function risolviTema(
  salvato: string | null | undefined,
  preferisceChiaro: boolean,
): Tema {
  if (salvato === 'chiaro' || salvato === 'scuro') return salvato;
  return preferisceChiaro ? 'chiaro' : TEMA_PREDEFINITO;
}

function sistemaPreferisceChiaro(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

/** Tema da mostrare al primo render, leggendo la scelta salvata. */
export function temaIniziale(): Tema {
  let salvato: string | null = null;
  try {
    salvato = window.localStorage.getItem(CHIAVE_TEMA);
  } catch {
    // Archiviazione non disponibile (navigazione privata): si usa il sistema.
  }
  return risolviTema(salvato, sistemaPreferisceChiaro());
}

const COLORI_TEMA: Record<Tema, string> = {
  chiaro: '#f7f2e8',
  scuro: '#23262a',
};

/**
 * Applica il tema al documento. Il colore di sfondo del browser segue il tema.
 * Non salva nulla: al primo accesso il sito continua a seguire il sistema.
 */
export function applicaTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLORI_TEMA[tema]);
}

/** Ricorda la scelta fatta dall’utente, così vale anche ai prossimi accessi. */
export function salvaTema(tema: Tema): void {
  try {
    window.localStorage.setItem(CHIAVE_TEMA, tema);
  } catch {
    // Archiviazione non disponibile: la scelta vale per questa sessione.
  }
}
