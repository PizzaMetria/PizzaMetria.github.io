import { useEffect, useState } from 'react';

/**
 * Segue una media query e si aggiorna quando cambia (rotazione, ridimensiona):
 * è quello che distingue il percorso guidato mobile dalla pagina unica desktop.
 */
export function useMediaQuery(query: string): boolean {
  const [attiva, setAttiva] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    function aggiorna() {
      setAttiva(mq.matches);
    }

    aggiorna();
    mq.addEventListener('change', aggiorna);
    return () => mq.removeEventListener('change', aggiorna);
  }, [query]);

  return attiva;
}
