/*
 * GRAFICO COME IMMAGINE
 * ---------------------
 * Il PDF del foglio è vettoriale nel testo, ma per i grafici usa le stesse
 * immagini della schermata: sono più leggibili di una ricostruzione a mano e
 * restano identiche a quello che l'utente ha visto.
 *
 * La strada è: si clona l'SVG, si risolvono le variabili CSS in colori pieni
 * (dentro un SVG isolato `var(--color-…)` non esiste più), si riportano le tinte
 * sulla tavolozza chiara del foglio, si rasterizza su canvas e si esporta in
 * JPEG. Il JPEG è comodo perché il PDF lo incapsula così com'è, senza doverlo
 * ricodificare.
 */

export interface ImmagineRaster {
  /** JPEG in data URL. */
  datiUrl: string;
  larghezza: number;
  altezza: number;
}

/**
 * Tinte del tema scuro → tinte chiare del foglio.
 * `getComputedStyle` restituisce `rgb(…)`, quindi la mappa lavora su quella forma.
 */
const CHIARO: Record<string, string> = {
  'rgb(212, 175, 55)': '#b89428', // oro
  'rgb(232, 200, 119)': '#a67c00', // oro chiaro
  'rgb(243, 244, 246)': '#23262a', // inchiostro
  'rgb(156, 163, 175)': '#6b6257', // inchiostro tenue
  'rgb(44, 48, 54)': '#efeae0', // carta, la fascia del frigorifero
  'rgb(58, 63, 70)': '#d8d0c2', // bordo
  'rgb(35, 38, 42)': '#fffdf8', // crema, il contorno del segno
  'rgb(27, 29, 32)': '#fffdf8',
  'rgb(179, 139, 40)': '#8a6b12',
  'rgb(206, 58, 43)': '#a3281c', // errore
};

function tintaChiaro(valore: string): string {
  return CHIARO[valore.replace(/\s+/g, ' ').trim()] ?? valore;
}

/** Proprietà di disegno che vanno fissate sull'elemento clonato. */
const PROPRIETA = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linejoin',
  'stroke-linecap',
  'opacity',
  'fill-opacity',
  'stroke-opacity',
] as const;

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Disegna l'SVG in un canvas e restituisce il JPEG.
 * `scala` è il fattore di ingrandimento: 2,5 bastano per una stampa A4 nitida.
 */
export async function rasterizzaSvg(
  svg: SVGSVGElement,
  scala = 2.5,
  sfondo = '#fffdf8',
): Promise<ImmagineRaster> {
  const clonato = svg.cloneNode(true) as SVGSVGElement;
  const originali = [svg, ...Array.from(svg.querySelectorAll<SVGElement>('*'))];
  const cloni = [clonato, ...Array.from(clonato.querySelectorAll<SVGElement>('*'))];

  originali.forEach((originale, indice) => {
    const clone = cloni[indice];
    if (!clone) return;

    /*
     * Il clone si porta dietro gli attributi del nodo vivo, `style` compreso:
     * `style="fill: var(--color-carta)"` dentro l'SVG isolato non trova più la
     * variabile, la dichiarazione diventa invalida e il browser ripiega sul
     * nero. Si tolgono, così contano solo gli attributi qui sotto, già risolti.
     */
    clone.removeAttribute('style');
    clone.removeAttribute('class');

    const stile = window.getComputedStyle(originale);
    for (const proprieta of PROPRIETA) {
      const valore = stile.getPropertyValue(proprieta).trim();
      if (proprieta === 'fill' || proprieta === 'stroke') {
        if (!valore || valore === 'none' || valore === 'rgba(0, 0, 0, 0)') {
          clone.setAttribute(proprieta, 'none');
        } else {
          clone.setAttribute(proprieta, tintaChiaro(valore));
        }
        continue;
      }
      if (valore) clone.setAttribute(proprieta, valore);
    }
  });

  const vista = svg.viewBox.baseVal;
  const larghezzaBase = vista && vista.width > 0 ? vista.width : 320;
  const altezzaBase = vista && vista.height > 0 ? vista.height : 96;
  const larghezza = Math.round(larghezzaBase * scala);
  const altezza = Math.round(altezzaBase * scala);

  clonato.setAttribute('xmlns', SVG);
  clonato.setAttribute('width', String(larghezza));
  clonato.setAttribute('height', String(altezza));

  // Il JPEG non ha trasparenza: il fondo lo dipinge un rettangolo.
  const fondo = document.createElementNS(SVG, 'rect');
  fondo.setAttribute('x', '0');
  fondo.setAttribute('y', '0');
  fondo.setAttribute('width', String(larghezzaBase));
  fondo.setAttribute('height', String(altezzaBase));
  fondo.setAttribute('fill', sfondo);
  clonato.insertBefore(fondo, clonato.firstChild);

  const serializzato = new XMLSerializer().serializeToString(clonato);
  /*
   * Rete di sicurezza: se in qualche punto è rimasta una `var(--…)`, qui non
   * esiste e il browser la dipingerebbe di nero. Si risolve sull'elemento vivo.
   */
  const variabili = window.getComputedStyle(svg);
  const risolto = serializzato.replace(/var\((--[\w-]+)\)/g, (intero, nome: string) => {
    const valore = variabili.getPropertyValue(nome).trim();
    return valore || intero;
  });
  const sorgente = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(risolto)}`;

  const immagine = new Image();
  await new Promise<void>((risolvi, rifiuta) => {
    immagine.onload = () => risolvi();
    immagine.onerror = () => rifiuta(new Error('Il grafico non si è potuto disegnare.'));
    immagine.src = sorgente;
  });

  const tela = document.createElement('canvas');
  tela.width = larghezza;
  tela.height = altezza;
  const contesto = tela.getContext('2d');
  if (!contesto) throw new Error('Canvas non disponibile in questo browser.');

  contesto.fillStyle = sfondo;
  contesto.fillRect(0, 0, larghezza, altezza);
  contesto.drawImage(immagine, 0, 0, larghezza, altezza);

  return { datiUrl: tela.toDataURL('image/jpeg', 0.92), larghezza, altezza };
}
