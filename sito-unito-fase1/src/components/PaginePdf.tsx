import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Mostra le pagine del PDF già generato. Il salvataggio usa lo stesso URL. */
export default function PaginePdf({ url }: { url: string }) {
  const contenitore = useRef<HTMLDivElement>(null);
  const [stato, setStato] = useState<'caricamento' | 'pronto' | 'errore'>('caricamento');

  useEffect(() => {
    const pagine = contenitore.current;
    if (!pagine) return;

    const caricamento = getDocument({ url, useWasm: false });
    let chiuso = false;
    let disegno: RenderTask | undefined;

    async function mostraPagine() {
      const pdf = await caricamento.promise;

      for (let numero = 1; numero <= pdf.numPages && !chiuso; numero++) {
        const pagina = await pdf.getPage(numero);
        if (chiuso) return;

        const originale = pagina.getViewport({ scale: 1 });
        const viewport = pagina.getViewport({ scale: 1440 / originale.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.className = 'block h-auto w-full bg-white shadow-sm';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `Pagina ${numero} di ${pdf.numPages} del PDF`);

        disegno = pagina.render({ canvas, viewport });
        await disegno.promise;
        disegno = undefined;
        if (chiuso) return;

        pagine!.append(canvas);
        pagina.cleanup();
        setStato('pronto');
      }
    }

    void mostraPagine().catch(() => {
      if (!chiuso) setStato('errore');
    });

    return () => {
      chiuso = true;
      disegno?.cancel();
      void caricamento.destroy().catch(() => {});
      pagine.replaceChildren();
    };
  }, [url]);

  return (
    <div className="mx-auto max-w-3xl space-y-3 px-1.5 py-2 sm:px-4 sm:py-4">
      {stato === 'caricamento' ? <p role="status" className="p-3 text-sm">Apertura del PDF…</p> : null}
      {stato === 'errore' ? (
        <p role="alert" className="rounded-lg bg-carta p-3 text-sm">
          Il browser non è riuscito a mostrare tutte le pagine. Puoi usare «Salva» oppure{' '}
          <a href={url} target="_blank" rel="noreferrer" className="font-semibold underline">
            aprire il PDF
          </a>.
        </p>
      ) : null}
      <div ref={contenitore} className="space-y-3" />
    </div>
  );
}
