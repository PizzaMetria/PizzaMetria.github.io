/**
 * Scarica un Blob nel browser e libera l'object URL dopo il click.
 * Non usa librerie esterne e non dipende dalla finestra di stampa.
 */
export function scaricaBlob(blob: Blob, nomeFile: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = nomeFile;
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Il browser deve poter iniziare il download prima della revoca.
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Converte un data URL base64 in Blob con il tipo MIME indicato. */
export function dataUrlABlob(dataUrl: string, tipo: string): Blob {
  const virgola = dataUrl.indexOf(',');
  if (virgola === -1) {
    throw new Error('Data URL non valido.');
  }

  const intestazione = dataUrl.slice(0, virgola);
  const contenuto = dataUrl.slice(virgola + 1);

  if (!intestazione.includes(';base64')) {
    const testo = decodeURIComponent(contenuto);
    return new Blob([testo], { type: tipo });
  }

  const binario = atob(contenuto);
  const byte = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) {
    byte[i] = binario.charCodeAt(i);
  }

  return new Blob([byte], { type: tipo });
}
