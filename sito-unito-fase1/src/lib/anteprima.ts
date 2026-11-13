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
