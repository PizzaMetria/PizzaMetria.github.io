import { useEffect, useRef, useState } from 'react';

/** Propone di ricaricare solo dopo che il nuovo worker ha preso il controllo. */
export function AggiornamentoSito() {
  const [inAttesa, setInAttesa] = useState<ServiceWorker | null>(null);
  const [aggiornando, setAggiornando] = useState(false);
  const richiesto = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
    const worker = navigator.serviceWorker;
    let attivo = true;
    let registrazione: ServiceWorkerRegistration | undefined;
    let nuovo: ServiceWorker | null = null;
    const mostraAggiornamento = () => {
      if (!attivo) return;
      setInAttesa(worker.controller ? registrazione?.waiting ?? null : null);
    };
    const seguiInstallazione = () => {
      nuovo?.removeEventListener('statechange', mostraAggiornamento);
      nuovo = registrazione?.installing ?? null;
      nuovo?.addEventListener('statechange', mostraAggiornamento);
    };
    const alCambio = () => {
      if (richiesto.current) location.reload();
      else mostraAggiornamento();
    };
    const registra = async () => {
      try {
        registrazione = await worker.register('./sw.js');
        if (!attivo) return;
        registrazione.addEventListener('updatefound', seguiInstallazione);
        seguiInstallazione();
        mostraAggiornamento();
      } catch {
        // Il calcolatore rimane disponibile online.
      }
    };

    worker.addEventListener('controllerchange', alCambio);
    if (document.readyState === 'complete') void registra();
    else window.addEventListener('load', registra, { once: true });

    return () => {
      attivo = false;
      window.removeEventListener('load', registra);
      nuovo?.removeEventListener('statechange', mostraAggiornamento);
      registrazione?.removeEventListener('updatefound', seguiInstallazione);
      worker.removeEventListener('controllerchange', alCambio);
    };
  }, []);

  if (!inAttesa && !aggiornando) return null;

  return (
    <aside className="fixed inset-x-3 top-3 z-40 mx-auto flex max-w-md flex-wrap items-center justify-between gap-2 rounded-xl border border-bordo bg-carta px-3 py-2.5 text-sm shadow-lg">
      <p role="status">{aggiornando ? 'Aggiornamento in corso…' : 'Nuova versione disponibile.'}</p>
      <button
        type="button"
        disabled={aggiornando}
        className="rounded-full bg-terracotta px-4 py-2 font-bold text-su-oro disabled:opacity-50"
        onClick={() => {
          if (!inAttesa) return;
          richiesto.current = true;
          setAggiornando(true);
          inAttesa.postMessage({ tipo: 'ATTIVA_AGGIORNAMENTO' });
        }}
      >
        Aggiorna
      </button>
    </aside>
  );
}
