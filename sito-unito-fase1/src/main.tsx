import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaginaUnica } from './PaginaUnica';
import './fonts.css';
import './index.css';

/*
 * Installazione e uso senza rete.
 *
 * Da Chrome su Android il sito si installa come app e resta raggiungibile
 * anche senza connessione. Dentro l'APK la pagina arriva da file:// e il
 * service worker non c'è: lì non si registra nulla, e non serve.
 */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Senza service worker il sito funziona lo stesso: nessun errore da mostrare.
    });
  });
}

const radice = document.getElementById('root');
if (!radice) {
  throw new Error('Elemento #root non trovato nel documento.');
}

createRoot(radice).render(
  <StrictMode>
    <PaginaUnica />
  </StrictMode>,
);
