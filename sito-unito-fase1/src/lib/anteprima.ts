/*
 * ANTEPRIMA NELL'APP
 * ------------------
 * Dentro l'APK il file lo mostra il lettore nativo (AnteprimaActivity): pagina
 * intera, PDF compreso, con «Salva» in alto a destra. Il ponte si chiama
 * `Android.anteprima` e riceve il file in base64. Fuori dall'app non esiste e
 * il sito usa la sua pagina di anteprima.
 */

interface PonteAndroid {
  anteprima?: (nome: string, base64: string, tipo: string) => void;
}

function ponte(): PonteAndroid | null {
  if (typeof window === 'undefined') return null;
  const android = (window as unknown as { Android?: PonteAndroid }).Android;
  return android && typeof android.anteprima === 'function' ? android : null;
}

/** Vero quando l'anteprima la sa mostrare l'app (anche i PDF). */
export function anteprimaNellApp(): boolean {
  return ponte() !== null;
}

/**
 * Vero quando il PDF va mostrato come immagine.
 *
 * Chrome su Android non ha un lettore di PDF dentro la pagina: un PDF aperto
 * in un riquadro o in una scheda nuova mostra solo la schermata di scaricamento
 * (icona PDF, codice del file, tasto «Apri» che resta bianco). Lì conviene
 * disegnare l'immagine dello stesso foglio e lasciare il PDF al tasto «Salva».
 */
export function anteprimaPdfComeImmagine(): boolean {
  if (anteprimaNellApp()) return false;
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** Passa il file al lettore nativo: si guarda, e si salva solo da lì. */
export function apriNellApp(blob: Blob, nome: string): void {
  const android = ponte();
  if (!android?.anteprima) return;

  const lettore = new FileReader();
  lettore.onload = () => {
    const base64 = String(lettore.result).split(',')[1] ?? '';
    try {
      android.anteprima!(nome, base64, blob.type || 'application/octet-stream');
    } catch {
      // Se il ponte rifiuta, il sito resta com'era: nessun errore da mostrare.
    }
  };
  lettore.readAsDataURL(blob);
}
