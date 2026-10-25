import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './fonts.css';
import './index.css';

// Il JPG disegna su canvas: i font devono essere pronti prima dell'esportazione.
void document.fonts?.load('600 34px "Playfair Display"');
void document.fonts?.load('700 18px "Inter"');
void document.fonts?.load('400 16px "Inter"');

const radice = document.getElementById('root');
if (!radice) {
  throw new Error('Elemento #root non trovato nel documento.');
}

createRoot(radice).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
