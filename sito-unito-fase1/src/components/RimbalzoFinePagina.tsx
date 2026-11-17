import { useEffect } from 'react';

/**
 * Piccolo rimbalzo quando lo scorrimento arriva in fondo alla pagina: il
 * contenuto sale di pochi pixel e si riassesta, come il rilascio di un elastico.
 * Scatta una volta sola per arrivo e non fa nulla se il sistema chiede di
 * ridurre le animazioni.
 */
export function RimbalzoFinePagina() {
  useEffect(() => {
    const ridotto = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (ridotto?.matches) return;

    let inFondo = false;
    let ultimo = 0;
    let timer: number | undefined;

    const alScorrimento = () => {
      const fondo = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (fondo && !inFondo) {
        const adesso = Date.now();
        // Due arrivi ravvicinati (es. rimbalzo del sistema) non devono raddoppiare.
        if (adesso - ultimo > 700) {
          ultimo = adesso;
          const esterno = document.querySelector('main');
          if (esterno) {
            esterno.classList.add('rimbalzo-fine');
            window.clearTimeout(timer);
            timer = window.setTimeout(() => esterno.classList.remove('rimbalzo-fine'), 520);
          }
        }
      }
      inFondo = fondo;
    };

    window.addEventListener('scroll', alScorrimento, { passive: true });
    return () => {
      window.removeEventListener('scroll', alScorrimento);
      window.clearTimeout(timer);
      document.querySelectorAll('main').forEach((el) => el.classList.remove('rimbalzo-fine'));
    };
  }, []);

  return null;
}
