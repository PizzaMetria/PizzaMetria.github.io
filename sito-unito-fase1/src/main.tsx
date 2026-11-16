import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PaginaUnica } from './PaginaUnica';
import { AggiornamentoSito } from './components/AggiornamentoSito';
import './fonts.css';
import './index.css';

const radice = document.getElementById('root');
if (!radice) {
  throw new Error('Elemento #root non trovato nel documento.');
}

createRoot(radice).render(
  <StrictMode>
    <PaginaUnica />
    <AggiornamentoSito />
  </StrictMode>,
);
