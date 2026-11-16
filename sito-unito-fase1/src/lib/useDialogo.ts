import { useEffect, useEffectEvent, type RefObject } from 'react';

const CONTROLLI = 'a[href], button, input, select, textarea, [tabindex]';

/** Condivide tastiera, focus e isolamento dello sfondo tra menu ed export. */
export function useDialogo(
  ref: RefObject<HTMLElement | null>,
  aperto: boolean,
  onChiudi: () => void,
) {
  const chiudi = useEffectEvent(onChiudi);

  useEffect(() => {
    const dialogo = ref.current;
    if (!aperto || !dialogo) return;

    const precedente = document.activeElement;
    const radice = document.documentElement;
    const overflowRadice = radice.style.overflow;
    const overflowBody = document.body.style.overflow;
    const isolati: HTMLElement[] = [];
    for (let nodo: HTMLElement | null = dialogo; nodo?.parentElement && nodo !== document.body; nodo = nodo.parentElement) {
      for (const fratello of nodo.parentElement.children) {
        if (fratello !== nodo && fratello instanceof HTMLElement && !fratello.inert) {
          fratello.inert = true;
          isolati.push(fratello);
        }
      }
    }
    radice.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    function suTasto(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        chiudi();
        return;
      }
      if (evento.key !== 'Tab' || !dialogo) return;
      const elementi = Array.from(dialogo.querySelectorAll<HTMLElement>(CONTROLLI))
        .filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0);
      const primo = elementi[0];
      const ultimo = elementi.at(-1);
      if (!primo || !ultimo) {
        evento.preventDefault();
        dialogo.focus();
      } else if (!elementi.includes(document.activeElement as HTMLElement)
        || document.activeElement === (evento.shiftKey ? primo : ultimo)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primo).focus();
      }
    }

    (dialogo.querySelector<HTMLElement>('[data-focus-iniziale]') ?? dialogo).focus();
    document.addEventListener('keydown', suTasto);
    return () => {
      document.removeEventListener('keydown', suTasto);
      radice.style.overflow = overflowRadice;
      document.body.style.overflow = overflowBody;
      isolati.forEach((fratello) => { fratello.inert = false; });
      if (precedente instanceof HTMLElement && precedente.isConnected) precedente.focus();
    };
  }, [aperto, ref]);
}
