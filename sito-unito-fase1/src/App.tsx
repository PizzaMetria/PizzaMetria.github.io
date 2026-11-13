import { FisarmonicaRisultato } from './components/FisarmonicaRisultato';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Modello } from './types';
import { CampoNumero } from './components/CampoNumero';
import { Grafico } from './components/Grafico';
import { GraficoForza } from './components/GraficoForza';
import { Marchio } from './components/Marchio';
import { MAX_FARINE, MixFarine } from './components/MixFarine';
import type { RigaFarina } from './components/MixFarine';
import { Navigazione, Wizard } from './components/Wizard';
import type { Passo } from './components/Wizard';
import { IMPASTI, LIMITI, SPESSORI, problemaOreTotali, trovaImpasto } from './config/impasti';
import { ripartizioneFacile } from './lib/facile';
import { useMediaQuery } from './lib/useMediaQuery';
import { MenuLaterale } from './components/MenuLaterale';
import { IconaIngrediente } from './vecchio/components/IconaIngrediente';
import type { TipoIngrediente } from './vecchio/types';
import { calcola, temperaturaAcqua, wEquivalente } from './lib/calcolo';
import { NOMI_LIEVITO } from './lib/fermentazione';
import { AvvisoIdratazione } from './components/AvvisoIdratazione';
import { BloccoEsporta } from './components/ui/BloccoEsporta';
import { Pannello as Card } from './components/ui/Pannello';
import { SCALA_JPG, jpgBlob } from './export/foglio';
import {
  anteprimaNellApp,
  apriNellApp,
} from './lib/anteprima';
import { scaricaBlob } from './lib/download';
import type { ImmagineFoglio } from './export/foglio';
import { rasterizzaSvg } from './lib/immagine';
import type { DatiFoglio } from './export/foglio';
import { nomeFoglio } from './export/nomeFile';
import {
  aInputData,
  formatta,
  formattaQuando,
  grammi,
  grammiLievito,
  leggiNumeroDecimale,
  ore,
} from './lib/numeri';
import { MESSAGGIO_DATI_CAMBIATI, bloccoExport } from './export/blocco';
import {
  ETICHETTE_GIUDIZIO,
  foglioDiretto,
  testoGiudizio,
} from './export/foglio-diretto';
import { istruzioneChiusura, orarioFase, sommaOre, titoloAzione } from './lib/orari';
import type {
  Farina,
  FormaTeglia,
  GiudizioForza,
  ModalitaTonda,
  SpessoreTeglia,
  Staglio,
  TipoImpasto,
  TipoLievito,
  UnitaCondimenti,
} from './types';

/** Legge un numero e verifica che stia nell'intervallo indicato. */
function leggiIntervallo(
  grezzo: string,
  limiti: { min: number; max: number },
): number | null {
  const valore = leggiNumeroDecimale(grezzo);
  if (valore === null || valore < limiti.min || valore > limiti.max) return null;
  return valore;
}

function leggiIntero(
  grezzo: string,
  limiti: { min: number; max: number },
): number | null {
  const valore = leggiIntervallo(grezzo, limiti);
  if (valore === null || !Number.isInteger(valore)) return null;
  return valore;
}

const STILI_GIUDIZIO: Record<GiudizioForza, string> = {
  ottima: 'border-terracotta/60 bg-terracotta-tenue text-oro-chiaro',
  accettabile: 'border-avviso/50 bg-avviso-tenue text-avviso',
  distante: 'border-errore/50 bg-errore/10 text-errore',
};

/**
 * Consiglio sulla farina in parole, per la Modalità Facile: lì il W non si
 * chiede, quindi la risposta deve stare in una frase riconoscibile al banco.
 */
function consiglioFarina(w: number): string {
  if (w <= 210) {
    return 'Ti basta una farina 0 o una 00 di forza media (W 180-220): quelle del supermercato vanno bene.';
  }
  if (w <= 260) {
    return 'Intorno a W240: ideale sia una farina 0 che 00 con all’incirca il 12% di proteine.';
  }
  if (w <= 310) {
    return 'Serve una farina forte, intorno a W 280-300: cerca il 13% di proteine o una farina da lunga maturazione.';
  }
  return 'Servono ore lunghe e una farina molto forte (W 320 o più): meglio accorciare i tempi oppure mettere metà farina forte nel mix.';
}

/**
 * L'impasto parte quindici minuti dopo l'apertura, arrotondati ai cinque
 * minuti più vicini: chi apre alle 18:59 impasta alle 19:15, chi apre alle
 * 19:42 impasta alle 19:55. È il momento in cui si comincia davvero, e non va
 * spostato quando si sceglie l'ora della pizza.
 */
function oraDiPartenza(): string {
  const data = new Date(Date.now() + 15 * 60_000);
  data.setSeconds(0, 0);
  data.setMinutes(Math.round(data.getMinutes() / 5) * 5);
  return aInputData(data);
}

function oraDiFine(inizio: string): string {
  const data = new Date(inizio);
  if (Number.isNaN(data.getTime())) return inizio;
  return aInputData(new Date(data.getTime() + 24 * 3_600_000));
}

function Riga({
  etichetta,
  valore,
  tipo,
  nota,
}: {
  etichetta: string;
  valore: string;
  tipo?: TipoIngrediente;
  nota?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="flex min-w-0 items-center gap-2 text-inchiostro-tenue">
        {tipo ? (
          <IconaIngrediente tipo={tipo} className="text-terracotta" />
        ) : null}
        <span className="min-w-0">
          {etichetta}
          {nota ? <span className="block text-xs">{nota}</span> : null}
        </span>
      </dt>
      <dd className="font-semibold tabular-nums">{valore}</dd>
    </div>
  );
}

const GIORNI_BREVI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

/** «sab 02:00»: giorno corto e ora, per leggere il programma a colpo d'occhio. */
export function orarioBreve(data: Date): string {
  const ore = String(data.getHours()).padStart(2, '0');
  const minuti = String(data.getMinutes()).padStart(2, '0');
  return `${GIORNI_BREVI[data.getDay()]} ${ore}:${minuti}`;
}

/** Dalle 7 alle 23 è giorno: il resto è «di notte», da segnalare. */
export function eNotte(data: Date): boolean {
  return data.getHours() < 7;
}

/**
 * Il programma in orologio della Modalità Pro: mentre si scelgono le ore in
 * frigo e quelle a temperatura ambiente, qui si vede quando si staglia, quando
 * si esce dal frigo e se tocca alzarsi. Non cambia niente: segnala soltanto.
 */
function Programma({
  inizio,
  fine,
  orePrima,
  oreFrigo,
  staglio,
  tonda,
}: {
  inizio: string;
  fine: string;
  orePrima: number | null;
  oreFrigo: number | null;
  staglio: string;
  /** In teglia non c'è staglio: i panetti non si formano. */
  tonda: boolean;
}) {
  const partenza = new Date(inizio);
  const arrivo = new Date(fine);
  if (Number.isNaN(partenza.getTime()) || Number.isNaN(arrivo.getTime())) return null;

  const prima = orePrima ?? 0;
  const frigo = oreFrigo ?? 0;
  const righe: { etichetta: string; quando: Date }[] = [
    { etichetta: 'Impasto', quando: partenza },
  ];

  if (frigo > 0) {
    righe.push({
      etichetta: !tonda ? 'In frigo' : staglio === 'prima' ? 'Staglio e in frigo' : 'In frigo (massa)',
      quando: new Date(partenza.getTime() + prima * 3_600_000),
    });
    righe.push({
      etichetta: 'Fuori dal frigo',
      quando: new Date(partenza.getTime() + (prima + frigo) * 3_600_000),
    });
  }

  righe.push({ etichetta: 'Infornata', quando: arrivo });

  const notturne = righe.filter((riga) => eNotte(riga.quando));

  return (
    <div className="rounded-xl border border-bordo/70 bg-crema p-3 sm:p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-sm font-semibold">Programma</p>
        <p className="text-[11px] text-inchiostro-tenue">si aggiorna mentre scegli</p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {righe.map((riga, indice) => (
          <li
            key={`${riga.etichetta}-${indice}`}
            className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2"
          >
            <span className="truncate text-sm">{riga.etichetta}</span>
            <span className="justify-self-center">
              {eNotte(riga.quando) ? (
                <span className="rounded-full border border-terracotta/60 bg-terracotta/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
                  di notte
                </span>
              ) : null}
            </span>
            <span className="justify-self-end text-sm font-semibold tabular-nums text-oro-chiaro">
              {orarioBreve(riga.quando)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs leading-relaxed text-inchiostro-tenue">
        {notturne.length === 0
          ? 'Nessun passaggio fra mezzanotte e le 7.'
          : `${
              notturne.length === 1 ? 'Un passaggio cade' : `${notturne.length} passaggi cadono`
            } fra mezzanotte e le 7: puoi spostare l’impasto o cambiare le ore.`}
      </p>
    </div>
  );
}

/** Colonne del segmentato: su telefono stretto le voci possono stare su due righe. */
const COLONNE_SEGMENTATO: Record<number, { unaRiga: string; dueRighe: string }> = {
  2: { unaRiga: 'grid-cols-2', dueRighe: 'grid-cols-2' },
  3: { unaRiga: 'grid-cols-3', dueRighe: 'grid-cols-2 sm:grid-cols-3' },
  4: { unaRiga: 'grid-cols-4', dueRighe: 'grid-cols-2 sm:grid-cols-4' },
};

function Segmentato<T extends string>({
  voci,
  attivo,
  onChange,
  dueRighe = false,
}: {
  voci: readonly { id: T; nome: string }[];
  attivo: T;
  onChange: (id: T) => void;
  /**
   * Su schermo stretto spezza le voci su due righe: «Bassa · Media · Alta ·
   * Su misura» in fila sola sta appiccicata altrimenti.
   */
  dueRighe?: boolean;
}) {
  const colonne = COLONNE_SEGMENTATO[voci.length] ?? COLONNE_SEGMENTATO[2];
  return (
    <div
      className={`grid gap-1.5 rounded-xl border border-bordo/80 bg-crema-scuro p-1.5 ${
        dueRighe ? colonne.dueRighe : colonne.unaRiga
      }`}
    >
      {voci.map((voce) => {
        const scelto = voce.id === attivo;
        return (
          <button
            key={voce.id}
            type="button"
            aria-pressed={scelto}
            onClick={() => onChange(voce.id)}
            className={`flex min-h-12 min-w-0 items-center justify-center gap-1 rounded-lg border px-1.5 py-2.5 text-center text-[12px] font-semibold transition-all min-[380px]:gap-1.5 min-[380px]:text-[13px] ${
              scelto
                ? 'border-terracotta/50 bg-terracotta/15 text-oro-chiaro'
                : 'border-transparent text-inchiostro-tenue hover:text-inchiostro'
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-sm leading-none ${scelto ? 'visible' : 'invisible'}`}
            >
              ✓
            </span>
            <span className="min-w-0">{voce.nome}</span>
          </button>
        );
      })}
    </div>
  );
}

const VOCI_MODALITA: readonly { id: ModalitaTonda; nome: string }[] = [
  { id: 'panetti', nome: 'Panetti' },
  { id: 'farina', nome: 'Farina' },
];

const VOCI_FORMA: readonly { id: FormaTeglia; nome: string }[] = [
  { id: 'rettangolare', nome: 'Rettangolare' },
  { id: 'tonda', nome: 'Tonda' },
];

const VOCI_LIEVITO: readonly { id: TipoLievito; nome: string }[] = [
  { id: 'fresco', nome: 'Fresco' },
  { id: 'secco', nome: 'Secco' },
];

const VOCI_STAGLIO: readonly { id: Staglio; nome: string }[] = [
  { id: 'prima', nome: 'Prima del frigo' },
  { id: 'dopo', nome: 'Dopo il frigo' },
];

// La stessa domanda della Pro, chiesta con le parole di chi fa la pizza.
const VOCI_STAGLIO_FACILE: readonly { id: Staglio; nome: string }[] = [
  { id: 'prima', nome: 'Prima del frigo' },
  { id: 'dopo', nome: 'Dopo il frigo' },
];

const VOCI_MODELLO: readonly { id: Modello; nome: string }[] = [
  { id: 'miniRicette', nome: 'Modello frazionario' },
  { id: 'termico', nome: 'Termico' },
  { id: 'nuovo', nome: 'Inerziale' },
  { id: 'vecchio', nome: 'Vecchio' },
];

const VOCI_VISTA: readonly { id: 'facile' | 'pro'; nome: string }[] = [
  { id: 'facile', nome: 'Modalità Facile' },
  { id: 'pro', nome: 'Modalità Pro' },
];

const PRESET_FACILE: readonly { id: 'stasera' | 'pranzo' | 'cena'; nome: string }[] = [
  { id: 'stasera', nome: 'Stasera' },
  { id: 'pranzo', nome: 'Domani a pranzo' },
  { id: 'cena', nome: 'Domani a cena' },
];

// Si parte da una farina sola: l'ultima riga è sempre il resto, quindi con una
// riga la quota è il 100% e le righe aggiunte col «+» diventano quelle scrivibili.
const FARINE_INIZIALI: readonly RigaFarina[] = [{ quota: '100', w: '' }];

export default function App({
  tipoIniziale = 'verace',
  senzaTestata = false,
}: {
  /** Ricetta classica scelta nella pagina unica. */
  tipoIniziale?: TipoImpasto;
  /** Nella pagina unica la testata è una sola: quella del calcolatore si spegne. */
  senzaTestata?: boolean;
} = {}) {
  const [tipo, setTipo] = useState<TipoImpasto>(tipoIniziale);
  const config = trovaImpasto(tipo);

  const [idratazione, setIdratazione] = useState(String(config.idratazione));
  // All'apertura l'impasto è già quello della ricetta: la teglia parte al 75%
  // con olio e malto, come dice la configurazione, non a 70% e olio zero.
  const [sale, setSale] = useState(String(config.sale).replace('.', ','));
  const [olio, setOlio] = useState(String(config.olio).replace('.', ','));
  // Sale e olio si scrivono sempre in percentuale sulla farina.
  const unita: UnitaCondimenti = 'farina';
  const [usaMalto, setUsaMalto] = useState(config.malto > 0);
  const [malto, setMalto] = useState(
    config.malto > 0 ? String(config.malto).replace('.', ',') : '1',
  );
  const [tipoLievito, setTipoLievito] = useState<TipoLievito>('fresco');
  const [farine, setFarine] = useState<RigaFarina[]>([...FARINE_INIZIALI]);

  const [modalita, setModalita] = useState<ModalitaTonda>('panetti');
  const [panetti, setPanetti] = useState('6');
  const [pesoPanetto, setPesoPanetto] = useState(String(config.pesoPanetto ?? 250));
  const [farina, setFarina] = useState('1');

  const [forma, setForma] = useState<FormaTeglia>('rettangolare');
  const [latoA, setLatoA] = useState('30');
  const [latoB, setLatoB] = useState('40');
  const [diametro, setDiametro] = useState('32');
  const [teglie, setTeglie] = useState('1');
  const [spessore, setSpessore] = useState<SpessoreTeglia>('media');
  const [grammiCm2, setGrammiCm2] = useState('0,55');

  const [tempiIniziali] = useState(() => {
    const partenza = oraDiPartenza();
    return { inizio: partenza, fine: oraDiFine(partenza) };
  });
  const [inizio, setInizio] = useState(tempiIniziali.inizio);
  const [fine, setFine] = useState(tempiIniziali.fine);
  const [usaFrigo, setUsaFrigo] = useState(true);
  const [oreFrigo, setOreFrigo] = useState('18');
  // In Modalità Facile le ore le decide la ripartizione, ma la riga del frigo si
  // può correggere a mano: da quel momento valgono i numeri scritti qui.
  const [frigoScritto, setFrigoScritto] = useState<string | null>(null);
  const [oreTaPrima, setOreTaPrima] = useState('2');
  const [tc, setTc] = useState('4');
  const [ta, setTa] = useState('20');
  const [temperaturaImpasto, setTemperaturaImpasto] = useState('21');
  const [temperaturaFarina, setTemperaturaFarina] = useState('20');
  const [riscaldamento, setRiscalDamento] = useState('8');
  const [staglio, setStaglio] = useState<Staglio>('prima');
  // Il motore predefinito è il modello a 12 mini-ricette, quello validato: W e
  // dose vengono dai suoi due indici. Gli altri due restano selezionabili, e il
  // vecchio in particolare serve a ritrovare le dosi del calcolatore di prima.
  const [modello, setModello] = useState<Modello>('miniRicette');
  const [vista, setVista] = useState<'facile' | 'pro'>('facile');
  const [passoFacile, setPassoFacile] = useState(0);
  const [passoPro, setPassoPro] = useState(0);
  // Il percorso guidato vale solo sul telefono: da desktop la pagina resta una
  // sola, con tutti i riquadri in vista, come nel progetto vecchio.
  const guidato = useMediaQuery('(max-width: 1023px)');
  const [menuAperto, setMenuAperto] = useState(false);
  const graficoRef = useRef<SVGSVGElement>(null);
  const forzaRef = useRef<SVGSVGElement>(null);
  const [esportando, setEsportando] = useState<'jpg' | 'pdf' | null>(null);
  // Il file preparato resta qui finché l'utente non decide: si può guardare e
  // chiudere senza salvarlo, oppure salvarlo con il pulsante.
  const [anteprima, setAnteprima] = useState<{
    tipo: 'jpg' | 'pdf';
    nome: string;
    url: string;
    blob: Blob;
  } | null>(null);
  // Come nel vecchio sito: il foglio si può stringere per leggerlo sul telefono.
  // Il foglio «stretto» è pensato per il telefono: lì parte già acceso, sul
  // desktop resta spento (il PDF esce in A4). La scelta resta modificabile.
  // Su telefono e tablet il foglio parte già stretto, sul computer resta largo:
  // lo dice lo user agent, perché una finestra stretta su un PC non è un telefono.
  const [ottimizzaSmartphone, setOttimizzaSmartphone] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent),
  );
  const [erroreExport, setErroreExport] = useState<string | null>(null);

  function scegliImpasto(nuovo: TipoImpasto) {
    const prossimo = trovaImpasto(nuovo);
    setTipo(nuovo);
    setIdratazione(String(prossimo.idratazione));
    setSale(String(prossimo.sale).replace('.', ','));
    setOlio(String(prossimo.olio).replace('.', ','));
    setUsaMalto(prossimo.malto > 0);
    setMalto(prossimo.malto > 0 ? String(prossimo.malto).replace('.', ',') : '1');
    // Il panetto cambia con l'impasto: la contemporanea vuole 280 g.
    setPesoPanetto(String(prossimo.pesoPanetto ?? 250));
  }

  function cambiaFarina(indice: number, campo: keyof RigaFarina, valore: string) {
    setFarine((precedenti) =>
      precedenti.map((riga, posizione) =>
        posizione === indice ? { ...riga, [campo]: valore } : riga,
      ),
    );
  }

  /**
   * Il «+» aggiunge una riga: quella che era il resto diventa scrivibile con la
   * quota che aveva, e la riga nuova si prende il resto.
   */
  function aggiungiFarina() {
    setFarine((precedenti) => {
      if (precedenti.length >= MAX_FARINE) return precedenti;
      // L'ultima riga è «il resto»: il suo 0 memorizzato vale 40. Prima di
      // aggiungere una riga va scritta con la quota che si vede a schermo,
      // altrimenti il mix 60/40 diventa 60/0/40 e cambia anche il W del mix.
      const scritte = precedenti.slice(0, -1);
      const somma = scritte.reduce(
        (totale, riga) => totale + (leggiNumeroDecimale(riga.quota) ?? 0),
        0,
      );
      const resto = Math.max(0, 100 - somma);
      const crescenti = precedenti.map((riga) => ({ ...riga }));
      crescenti[crescenti.length - 1] = {
        ...crescenti[crescenti.length - 1],
        quota: String(resto),
      };
      crescenti.push({ quota: '0', w: '' });
      return crescenti;
    });
  }

  function rimuoviFarina(indice: number) {
    setFarine((precedenti) =>
      precedenti.length <= 1 ? precedenti : precedenti.filter((_, posizione) => posizione !== indice),
    );
  }

  // Ore fra impastamento e infornata, prima di ogni altra cosa: da qui la
  // Modalità Facile ricava la ripartizione fra frigo e tavolo.
  const oreDisponibili = useMemo(() => {
    const partenza = new Date(inizio);
    const arrivo = new Date(fine);
    if (Number.isNaN(partenza.getTime()) || Number.isNaN(arrivo.getTime())) return null;
    return (arrivo.getTime() - partenza.getTime()) / 3_600_000;
  }, [inizio, fine]);

  const ripartizione = useMemo(
    () => ripartizioneFacile(oreDisponibili ?? 0, usaFrigo),
    [oreDisponibili, usaFrigo],
  );
  const facile = vista === 'facile';

  const esito = useMemo(() => {
    const problemi: string[] = [];
    const tonda = config.tonda;

    const idr = leggiIntervallo(idratazione, LIMITI.idratazione);
    if (idr === null) problemi.push('Idratazione: inserisci un valore fra 45% e 100%.');

    const limitiSale = unita === 'farina' ? LIMITI.sale : LIMITI.saleLitro;
    const limitiOlio = unita === 'farina' ? LIMITI.olio : LIMITI.olioLitro;

    const saleVal = leggiIntervallo(sale, limitiSale);
    if (saleVal === null) {
      problemi.push(
        unita === 'farina'
          ? 'Sale: inserisci un valore fra 0% e 5%.'
          : 'Sale: inserisci un valore fra 0 e 80 g per litro d’acqua.',
      );
    }

    const olioVal = leggiIntervallo(olio, limitiOlio);
    if (olioVal === null) {
      problemi.push(
        unita === 'farina'
          ? 'Olio: inserisci un valore fra 0% e 20%.'
          : 'Olio: inserisci un valore fra 0 e 80 g per litro d’acqua.',
      );
    }

    const ml = usaMalto ? leggiIntervallo(malto, LIMITI.malto) : 0;
    if (ml === null) problemi.push('Malto: inserisci un valore fra 0% e 3%.');

    // Il mix di farine: tutte le righe tranne l’ultima hanno la quota scritta a
    // mano, l’ultima prende quello che resta.
    const editabili = farine.slice(0, -1);
    const quote = editabili.map((riga) => leggiIntervallo(riga.quota, LIMITI.quota));
    const sommaQuote = quote.reduce<number>((somma, quota) => somma + (quota ?? 0), 0);

    if (quote.some((quota) => quota === null)) {
      problemi.push('Quote delle farine: inserisci valori fra 0 e 100.');
    } else if (sommaQuote > 100.001) {
      problemi.push('Le quote scritte a mano superano il 100%: riducine una.');
    }

    const leggiW = (testo: string): number | null | 'errore' => {
      if (testo.trim() === '') return null;
      const valore = leggiIntervallo(testo, LIMITI.forza);
      return valore === null ? 'errore' : valore;
    };
    const forze = farine.map((riga) => leggiW(riga.w));
    if (forze.some((valore) => valore === 'errore')) {
      problemi.push('Forza della farina: inserisci un W fra 100 e 500, oppure lascia vuoto.');
    }

    const resto = 100 - sommaQuote;
    const farineNum: Farina[] = farine.map((_, indice) => {
      const forza = forze[indice];
      return {
        quota: indice === farine.length - 1 ? Math.max(0, resto) : (quote[indice] ?? 0),
        w: typeof forza === 'number' ? forza : null,
      };
    });
    const erroriMix = {
      quote: quote.map((quota) => quota === null),
      forze: forze.map((forza) => forza === 'errore'),
      totale: sommaQuote > 100.001 ? sommaQuote : null,
    };
    const mixNonValido = erroriMix.quote.some(Boolean)
      || erroriMix.forze.some(Boolean) || erroriMix.totale !== null;
    const farineUsate = farineNum.filter((farina) => farina.quota > 0);
    const wMancanti = farineNum.map((farina, indice) =>
      !mixNonValido && farineUsate.length > 1 && farina.quota > 0 && forze[indice] === null,
    );
    const mixW = mixNonValido ? null : wEquivalente(farineNum);

    const partenza = new Date(inizio);
    const arrivo = new Date(fine);
    const orariValidi =
      !Number.isNaN(partenza.getTime()) && !Number.isNaN(arrivo.getTime());
    const oreTotali = orariValidi
      ? (arrivo.getTime() - partenza.getTime()) / 3_600_000
      : null;

    if (oreTotali === null) {
      problemi.push('Controlla la data e l’ora di partenza e di fine.');
    } else {
      const problemaOre = problemaOreTotali(oreTotali);
      if (problemaOre) problemi.push(problemaOre);
    }

    const taNum = leggiIntervallo(ta, LIMITI.ta);
    if (taNum === null) {
      problemi.push('Temperatura ambiente: inserisci un valore fra 5 e 40 °C.');
    }

    // In Modalità Facile le ore le decide la ripartizione, salvo la riga del
    // frigo, che si può correggere a mano.
    const frigoNum = facile
      ? usaFrigo
        ? frigoScritto !== null
          ? leggiIntervallo(frigoScritto, LIMITI.oreFrigo)
          : ripartizione.oreFrigo
        : 0
      : usaFrigo
        ? leggiIntervallo(oreFrigo, LIMITI.oreFrigo)
        : 0;
    if (frigoNum === null) {
      problemi.push('Ore in frigorifero: inserisci un valore fra 0 e 96.');
    }

    // La temperatura del frigo si valida solo se il calcolo la usa davvero:
    // spento, o acceso con zero ore, non entra in nessun conto. In Facile la
    // cella sta a 4 °C fissi.
    const frigoUsato = usaFrigo && !facile && (frigoNum ?? 0) > 0;
    const tcNum = frigoUsato ? leggiIntervallo(tc, LIMITI.tc) : 4;
    if (frigoUsato && tcNum === null) {
      problemi.push('Frigorifero: inserisci una temperatura fra 1 e 14 °C.');
    }

    const taPrimaNum = facile
      ? ripartizione.orePrima
      : usaFrigo
        ? leggiIntervallo(oreTaPrima, LIMITI.oreTaPrima)
        : 0;
    if (taPrimaNum === null) {
      problemi.push('Ore a temperatura ambiente: inserisci un valore fra 0 e 24.');
    }

    let taDopoNum = 0;
    if (oreTotali !== null && frigoNum !== null && taPrimaNum !== null) {
      taDopoNum = oreTotali - frigoNum - taPrimaNum;
      if (taDopoNum < 0) {
        problemi.push(
          'Frigorifero e puntata superano il tempo a disposizione: riduci le ore o allunga i tempi.',
        );
      }
    }

    let numeroPanetti: number | null = null;
    let pesoPanettoNum: number | null = null;
    let farinaNum: number | null = null;
    let lati = { a: 30, b: 40, d: 32 };
    let teglieNum: number | null = null;
    let grammiPerCm2Num: number | null = null;

    if (tonda) {
      pesoPanettoNum = leggiIntervallo(pesoPanetto, LIMITI.pesoPanetto);
      if (pesoPanettoNum === null) {
        problemi.push('Peso del panetto: inserisci un valore fra 80 e 1.200 g.');
      }

      if (modalita === 'panetti') {
        numeroPanetti = leggiIntero(panetti, LIMITI.panetti);
        if (numeroPanetti === null) {
          problemi.push('Numero di panetti: inserisci un intero fra 1 e 200.');
        }
      } else {
        farinaNum = leggiIntervallo(farina, LIMITI.farina);
        if (farinaNum === null) {
          problemi.push('Farina: inserisci un valore fra 0,1 e 50 kg.');
        }
      }
    } else {
      const latoAVal = leggiIntervallo(latoA, LIMITI.lato);
      const latoBVal = forma === 'rettangolare' ? leggiIntervallo(latoB, LIMITI.lato) : latoAVal;
      const diametroVal = forma === 'tonda' ? leggiIntervallo(diametro, LIMITI.diametro) : 0;

      // In una teglia tonda il lato non entra nel conto: si chiede il diametro.
      if (latoAVal === null && forma !== 'tonda') {
        problemi.push('Lato della teglia: inserisci un valore fra 10 e 200 cm.');
      }
      if (forma === 'rettangolare' && latoBVal === null) {
        problemi.push('Lato B della teglia: inserisci un valore fra 10 e 200 cm.');
      }
      if (forma === 'tonda' && diametroVal === null) {
        problemi.push('Diametro della teglia: inserisci un valore fra 12 e 80 cm.');
      }

      lati = { a: latoAVal ?? 30, b: latoBVal ?? 40, d: diametroVal ?? 32 };

      teglieNum = leggiIntero(teglie, LIMITI.teglie);
      if (teglieNum === null) {
        problemi.push('Numero di teglie: inserisci un intero fra 1 e 20.');
      }

      const spessoreScelto = SPESSORI.find((voce) => voce.id === (facile ? 'media' : spessore));
      grammiPerCm2Num =
        !facile && spessore === 'personalizzata'
          ? leggiIntervallo(grammiCm2, LIMITI.grammiCm2)
          : (spessoreScelto?.grammiPerCm2 ?? 0.55);

      if (grammiPerCm2Num === null) {
        problemi.push('Grammi per cm²: inserisci un valore fra 0,2 e 1,2.');
      }
    }

    const tempImpNum = leggiIntervallo(temperaturaImpasto, LIMITI.temperaturaImpasto);
    if (tempImpNum === null) {
      problemi.push('Temperatura dell’impasto: inserisci un valore fra 15 e 32 °C.');
    }

    const tempFarinaNum = leggiIntervallo(temperaturaFarina, LIMITI.temperaturaFarina);
    if (tempFarinaNum === null) {
      problemi.push('Temperatura della farina: inserisci un valore fra 5 e 35 °C.');
    }

    const riscaldamentoNum = leggiIntervallo(riscaldamento, LIMITI.riscaldamento);
    if (riscaldamentoNum === null) {
      problemi.push('Riscaldamento dell’impastatrice: inserisci un valore fra 0 e 20 °C.');
    }

    if (problemi.length > 0) {
      return { problemi, risultato: null, dati: null, oreTotali, taDopo: taDopoNum, mixW, erroriMix, mixNonValido, wMancanti };
    }

    const risultato = calcola(
      {
        tipo,
        ramo: config.ramo,
        idratazione: idr!,
        sale: unita === 'farina' ? saleVal! : (saleVal! * idr!) / 1000,
        olio: unita === 'farina' ? olioVal! : (olioVal! * idr!) / 1000,
        malto: ml!,
        tipoLievito,
        farine: farineNum,
        modalita,
        numeroPanetti,
        pesoPanettoG: pesoPanettoNum,
        farinaG: farinaNum === null ? null : farinaNum * 1000,
        formaTeglia: forma,
        latoA: lati.a,
        latoB: lati.b,
        diametro: lati.d,
        numeroTeglie: teglieNum ?? 1,
        grammiPerCm2: grammiPerCm2Num!,
        temperaturaImpasto: tempImpNum!,
        temperaturaFarina: tempFarinaNum!,
        riscaldamento: riscaldamentoNum!,
        // La correzione del lievito non è più una casella: chi vuole la fa a mano.
        correzioneLievito: 0,
        // In Modalità Facile il frigo è quello di casa (4 °C) e lo staglio si
        // sceglie nella stessa scheda; la teglia resta a panetti già formati.
        staglio: facile && !config.tonda ? 'prima' : staglio,
        modello,
        tempi: {
          oreTotali: oreTotali!,
          oreFrigo: frigoNum!,
          oreTaPrima: taPrimaNum!,
          oreTaDopo: taDopoNum,
          ta: taNum!,
          tc: facile ? 4 : tcNum!,
        },
      },
      partenza,
    );

    return {
      problemi, risultato, oreTotali, taDopo: taDopoNum, mixW, erroriMix, mixNonValido, wMancanti,
      dati: { tipoLievito, fine, idratazione: idr! },
    };
  }, [
    config.ramo,
    config.tonda,
    idratazione,
    sale,
    olio,
    unita,
    usaMalto,
    malto,
    farine,
    inizio,
    fine,
    tc,
    ta,
    usaFrigo,
    oreFrigo,
    frigoScritto,
    oreTaPrima,
    modalita,
    panetti,
    pesoPanetto,
    farina,
    forma,
    latoA,
    latoB,
    diametro,
    teglie,
    spessore,
    grammiCm2,
    tipo,
    tipoLievito,
    temperaturaImpasto,
    temperaturaFarina,
    riscaldamento,
    staglio,
    modello,
    facile,
    ripartizione,
  ]);

  // Il risultato non si aggiorna da solo: si calcola quando si preme «Calcola
  // impasto», come nel vecchio sito. `calcolo` è la fotografia dei dati al
  // momento del tocco: se i dati cambiano resta quella, e lo diciamo.
  const [calcolo, setCalcolo] = useState<typeof esito | null>(null);
  const r = calcolo?.risultato ?? null;
  const dati = calcolo?.dati;
  const lievitoRisultato = dati?.tipoLievito ?? tipoLievito;
  const riepilogoRef = useRef<HTMLDivElement>(null);
  const nomiModello: Record<Modello, string> = {
    miniRicette: 'Frazionario', termico: 'Termico', nuovo: 'Inerziale', vecchio: 'Vecchio',
  };
  const misureConfronto = r ? [
    {
      etichetta: 'Ore equivalenti per il lievito',
      miniRicette: ore(r.miniRicetta.iFerm),
      termico: ore(r.confronto.oreEquivalentiTermico),
      nuovo: ore(r.confronto.oreEquivalentiNuovo),
      vecchio: ore(r.confronto.oreEquivalentiVecchio),
    },
    {
      etichetta: NOMI_LIEVITO[lievitoRisultato],
      miniRicette: `${grammiLievito(r.confronto.lievitoMiniG)} g`,
      termico: `${grammiLievito(r.confronto.lievitoTermicoG)} g`,
      nuovo: `${grammiLievito(r.confronto.lievitoNuovoG)} g`,
      vecchio: `${grammiLievito(r.confronto.lievitoVecchioG)} g`,
    },
    {
      etichetta: 'W consigliato',
      miniRicette: `W ${r.confronto.forzaMini}`,
      termico: `W ${r.confronto.forzaTermico}`,
      nuovo: `W ${r.confronto.forzaNuovo}`,
      vecchio: `W ${r.confronto.forzaVecchio}`,
    },
  ] : [];
  function confermaCalcolo() {
    setCalcolo(esito);
    if (esito.risultato) {
      requestAnimationFrame(() => {
        riepilogoRef.current?.focus({ preventScroll: true });
        riepilogoRef.current?.scrollIntoView({ block: 'start' });
      });
    }
  }
  // Anteprima dell'acqua: si legge dai campi, senza aspettare «Calcola», così
  // in «Acqua e temperature» la temperatura è già lì mentre si scelgono i valori.
  const acquaAnteprima = temperaturaAcqua(
    leggiIntervallo(temperaturaImpasto, LIMITI.temperaturaImpasto) ?? 22,
    leggiIntervallo(ta, LIMITI.ta) ?? 20,
    leggiIntervallo(temperaturaFarina, LIMITI.temperaturaFarina) ?? 20,
    leggiIntervallo(riscaldamento, LIMITI.riscaldamento) ?? 6,
  );
  const problemi = calcolo?.problemi ?? [];
  // Identità fra il risultato messo da parte e quello ricalcolato: è la
  // stessa regola che blocca l'export, così scheda e foglio non divergono.
  const daRicalcolare = bloccoExport(calcolo, esito) !== null;
  // Nella Pro non si passa al risultato con ore impossibili: puntata e frigo
  // stanno nella scheda dei tempi, e lì si sistemano, non al passo 6.
  const oreTempiValide =
    !usaFrigo ||
    (leggiIntervallo(oreTaPrima, LIMITI.oreTaPrima) !== null &&
      leggiIntervallo(oreFrigo, LIMITI.oreFrigo) !== null &&
      esito.taDopo >= 0);
  // Cambiando modello cambiano lievito, W consigliato e curva: la fotografia
  // del risultato si rifà subito, senza aspettare un altro «Calcola».
  const modelloPrecedente = useRef(modello);
  useEffect(() => {
    if (modelloPrecedente.current === modello) return;
    modelloPrecedente.current = modello;
    if (calcolo !== null) setCalcolo(esito);
  }, [modello, calcolo, esito]);
  /**
   * Spostando l'ora dell'impasto o quella di pronto, le ore si risistemano da
   * sole: puntata e appretto restano quelli scelti, il frigo prende il resto.
   * Se il tempo si accorcia, il frigo si accorcia per primo; l'appretto è il
   * riquadro che si calcola, quindi non si tocca.
   */
  const orariPrecedenti = useRef({ inizio, fine });
  useEffect(() => {
    const prima = orariPrecedenti.current;
    if (prima.inizio === inizio && prima.fine === fine) return;
    orariPrecedenti.current = { inizio, fine };
    if (facile) return;
    const totalePrima =
      (new Date(prima.fine).getTime() - new Date(prima.inizio).getTime()) / 3_600_000;
    const totale = (new Date(fine).getTime() - new Date(inizio).getTime()) / 3_600_000;
    if (!Number.isFinite(totale) || totale <= 0) return;
    const puntata = leggiIntervallo(oreTaPrima, LIMITI.oreTaPrima) ?? 0;
    const frigo = usaFrigo ? (leggiIntervallo(oreFrigo, LIMITI.oreFrigo) ?? 0) : 0;
    // L'appretto resta quello che c'era; se prima non ci stava, riparte da zero.
    const dopo =
      Number.isFinite(totalePrima) && totalePrima > 0
        ? Math.max(0, totalePrima - puntata - frigo)
        : 0;
    const mezzOra = (valore: number) => Math.round(valore * 2) / 2;
    let nuovaPuntata = puntata;
    let nuovoFrigo = mezzOra(totale - puntata - dopo);
    if (nuovoFrigo < 0) {
      nuovoFrigo = 0;
      nuovaPuntata = mezzOra(Math.min(puntata, totale));
    }
    const scrivi = (valore: number) => String(Number(valore.toFixed(1))).replace('.', ',');
    if (usaFrigo && nuovoFrigo !== frigo) setOreFrigo(scrivi(nuovoFrigo));
    if (nuovaPuntata !== puntata) setOreTaPrima(scrivi(nuovaPuntata));
  }, [inizio, fine, usaFrigo, oreFrigo, oreTaPrima, facile]);

  const spessoreScelto = SPESSORI.find((voce) => voce.id === (facile ? 'media' : spessore));
  // Le righe tranne l’ultima hanno la quota scritta a mano: l’ultima è il resto.
  const restoMix =
    100 -
    farine
      .slice(0, -1)
      .reduce((somma, riga) => somma + (leggiNumeroDecimale(riga.quota) ?? 0), 0);
  // Le ore in frigo che contano davvero: in Facile sono quelle della
  // ripartizione (o la correzione a mano), in Pro quelle scritte nella scheda.
  const oreFrigoNum = !usaFrigo
    ? 0
    : facile
      ? frigoScritto === null
        ? ripartizione.oreFrigo
        : (leggiNumeroDecimale(frigoScritto) ?? ripartizione.oreFrigo)
      : Number(oreFrigo.replace(',', '.')) || 0;
  // Il frigo compare solo se serve davvero: con poche ore la ripartizione lo
  // spegne da sola, e allora resta una riga unica a temperatura ambiente.
  const conFrigoFacile = usaFrigo && (ripartizione.conFrigo || frigoScritto !== null);
  // Per la teglia lo staglio resta "panetti prima": glielo dice anche il motore.
  // Gli orari previsti delle fasi della Modalità Facile, uno per riga.
  const orePrimaFacile = usaFrigo ? ripartizione.orePrima : 0;
  const finePuntata = sommaOre(inizio, orePrimaFacile);
  const fineFrigo = finePuntata
    ? new Date(finePuntata.getTime() + oreFrigoNum * 3_600_000)
    : null;
  const prontoDaInfornare = sommaOre(
    inizio,
    orePrimaFacile + oreFrigoNum + Math.max(0, esito.taDopo),
  );
  const oreTotaliGrafico = r
    ? r.fasce.reduce((massimo, fascia) => Math.max(massimo, fascia.a), 0)
    : 0;

  /** Stessi numeri della scheda a schermo, già impaginati per il disegno. */
  function preparaFoglio(): DatiFoglio | null {
    if (!r || !dati) return null;
    return foglioDiretto({
      risultato: r,
      nome: config.nome,
      tonda: config.tonda,
      idratazioneScritta: String(dati.idratazione),
      idratazioneConfig: config.idratazione,
      tipoLievito: dati.tipoLievito,
    });
  }

  async function esporta(formato: 'jpg' | 'pdf', soloIngredienti = false) {
    // Il foglio prende i grammi dal risultato e il tipo di lievito dal modulo:
    // con dati modificati e non ricalcolati le due cose non coinciderebbero (il
    // PDF direbbe «secco» accanto ai grammi del fresco). Meglio fermarsi qui.
    const blocco = bloccoExport(calcolo, esito);
    if (blocco) {
      setErroreExport(blocco);
      return;
    }

    const completo = preparaFoglio();
    if (!completo) return;
    // «Salva ingredienti» lascia fuori il procedimento: restano dosi e resa.
    const dati = soloIngredienti ? { ...completo, passi: [], note: [] } : completo;

    setErroreExport(null);
    setEsportando(formato);

    try {
      // Senza i font caricati il canvas ripiegherebbe sui caratteri di sistema.
      await document.fonts.ready;
      const nome = nomeFoglio(tipo, formato);

      // I grafici si fotografano per il PDF, dove restano utili; nel JPG non
      // ci sono più.
      const grafici: {
        forza?: ImmagineFoglio | null;
        attivita?: ImmagineFoglio | null;
      } = {};
      try {
        if (forzaRef.current) grafici.forza = await rasterizzaSvg(forzaRef.current);
        if (graficoRef.current) grafici.attivita = await rasterizzaSvg(graficoRef.current);
      } catch {
        // Senza immagini resta il disegno vettoriale della curva.
      }

      // Il file si prepara e si mostra: niente download automatico, così chi
      // vuole solo guardarlo non se lo ritrova in Download.
      let blob: Blob;
      if (formato === 'pdf') {
        // Il motore dei PDF arriva solo quando serve: all'apertura del sito
        // non pesa sul telefono.
        const { pdfBlob } = await import('./export/pdf');
        blob = pdfBlob({ ...dati, grafici }, ottimizzaSmartphone);
      } else {
        blob = await jpgBlob(dati, SCALA_JPG, ottimizzaSmartphone);
      }

      if (anteprimaNellApp()) {
        apriNellApp(blob, nome);
        return;
      }

      if (anteprima) {
        URL.revokeObjectURL(anteprima.url);
      }
      setAnteprima({
        tipo: formato,
        nome,
        blob,
        url: URL.createObjectURL(blob),
      });
    } catch (errore) {
      setErroreExport(errore instanceof Error ? errore.message : 'Esportazione non riuscita.');
    } finally {
      setEsportando(null);
    }
  }

  /** Salva il file che è in anteprima: è l'unico punto che scarica davvero. */
  function salvaAnteprima() {
    if (anteprima) scaricaBlob(anteprima.blob, anteprima.nome);
  }

  function chiudiAnteprima() {
    if (anteprima) {
      URL.revokeObjectURL(anteprima.url);
    }
    setAnteprima(null);
  }

  const schedaDosi = r && dati ? (
    <div ref={riepilogoRef} tabIndex={-1} className="scroll-mt-24 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-terracotta">
      <Card titolo="Dosi e resa">
        <div className="grid gap-3 rounded-xl border border-bordo bg-crema-scuro/70 p-3 sm:grid-cols-2 sm:p-4">
          <div>
            <p className="text-xs text-inchiostro-tenue">Resa</p>
            <p className="font-serif text-lg font-bold text-inchiostro">
              {r.numeroPezzi > 0
                ? `${r.numeroPezzi} ${config.tonda ? (r.numeroPezzi === 1 ? 'panetto' : 'panetti') : (r.numeroPezzi === 1 ? 'teglia' : 'teglie')} da ${grammi(r.pesoPerPezzoG)} g`
                : `${grammi(r.pesoImpastoG)} g di impasto`}
            </p>
            <p className="text-xs text-inchiostro-tenue">
              {grammi(r.pesoImpastoG)} g totali{r.residuoG ? ` · avanzano ${grammi(r.residuoG)} g` : ''}
            </p>
          </div>
          <div>
            <p className="text-xs text-inchiostro-tenue">Impasto pronto</p>
            <p className="font-serif text-lg font-bold text-inchiostro">{formattaQuando(new Date(dati.fine))}</p>
          </div>
        </div>
        {daRicalcolare ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-avviso-tenue p-2 text-xs" role="status">
            <span>Dosi dell’ultimo calcolo. I dati del modulo sono cambiati.</span>
            <button type="button" onClick={confermaCalcolo} className="rounded-md border border-bordo px-3 py-2 font-semibold">Ricalcola</button>
          </div>
        ) : null}
        <dl className="divide-y divide-bordo/60 text-sm">
          <Riga etichetta="Farina" valore={`${grammi(r.farinaG)} g`} tipo="farina" />
          <Riga etichetta="Acqua" valore={`${grammi(r.acquaG)} g`} tipo="acqua" nota={`Temperatura consigliata ${formatta(r.temperaturaAcqua, 0)} °C`} />
          <Riga etichetta="Sale" valore={`${grammi(r.saleG)} g`} tipo="sale" />
          {r.olioG > 0 ? <Riga etichetta="Olio" valore={`${grammi(r.olioG)} g`} tipo="olio" /> : null}
          {r.maltoG > 0 ? <Riga etichetta="Malto" valore={`${grammi(r.maltoG)} g`} tipo="malto" /> : null}
          <Riga etichetta={NOMI_LIEVITO[lievitoRisultato]} valore={`${grammiLievito(r.lievitoG)} g`} tipo="lievito" />
        </dl>
      </Card>
    </div>
  ) : null;

  const tabellaMarcia = r ? (
    <Card titolo="Tabella di marcia">
      <ol className="divide-y divide-bordo/60">
        {r.passi.map((passo) => {
          const { ora, giorno } = orarioFase(passo.quando);
          return (
            <li key={passo.titolo} className="grid grid-cols-[5rem_1fr] gap-3 py-3">
              <time dateTime={passo.quando.toISOString()} className="text-sm font-bold tabular-nums text-oro-chiaro">
                {ora}
                <span className="block text-xs font-normal text-inchiostro-tenue">
                  {giorno}
                </span>
              </time>
              <div>
                <p className="text-sm font-semibold">{titoloAzione(passo.titolo)}</p>
                {passo.temperaturaChiusura !== undefined ? (
                  <p className="text-xs text-inchiostro-tenue">{istruzioneChiusura(passo.temperaturaChiusura)}</p>
                ) : null}
                <p className="text-xs text-inchiostro-tenue">{passo.nota}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  ) : null;

  // Lo stesso riquadro di esportazione in Modalità Facile e in Pro: scelta
  // «ottimizza per smartphone», anteprima e salvataggio separato.
  const cardEsporta = (
    <Card titolo="La tua ricetta">
      <BloccoEsporta
        esportando={esportando}
        ottimizza={ottimizzaSmartphone}
        onOttimizza={setOttimizzaSmartphone}
        onEsporta={(formato) => esporta(formato, formato === 'jpg')}
        bloccato={daRicalcolare}
        messaggio={
          daRicalcolare ? { tipo: 'errore' as const, testo: MESSAGGIO_DATI_CAMBIATI } : null
        }
        errore={erroreExport}
        anteprima={anteprima}
        onSalva={salvaAnteprima}
        onChiudi={chiudiAnteprima}
      />
    </Card>
  );

  // Il mix di farine sta in fondo: solo con tempi, spessore e correzioni già
  // scelti il modello sa che W serve, e può dire quale farina cercare.
  const passiPro = [
    'L’impasto',
    'Scegli le dosi',
    'Tempi e temperature',
    'Acqua e temperature',
    'Mix di farine',
    'Risultato',
  ];
  const visibilePro = (indice: number) => (!guidato || passoPro === indice ? '' : 'hidden');

  /**
   * Cambio di passo nel percorso guidato: si va all'inizio del riquadro nuovo,
   * non in cima alla pagina. La testata resta fuori dallo schermo e il passo si
   * legge subito, senza scorrere a mano.
   */
  function cambiaPasso(imposta: (valore: number) => void, indice: number) {
    imposta(indice);
    requestAnimationFrame(() => {
      const riquadro = document.getElementById('passi-calcolatore');
      if (riquadro) {
        riquadro.scrollIntoView({ block: 'start', behavior: 'auto' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
  }

  /**
   * I tre pulsanti (Facile e Pro): spostano solo l'ora della pizza. L'impasto
   * resta quello scelto — di default adesso — così le ore calcolate sono
   * quelle vere, non un numero ricavato all'indietro.
   */
  function applicaPreset(id: 'stasera' | 'pranzo' | 'cena') {
    const adesso = new Date();
    const pizza = new Date(adesso);

    if (id === 'stasera') {
      pizza.setHours(19, 30, 0, 0);
      // Se le 19:30 sono passate, o restano meno ore del minimo utile,
      // «stasera» diventa domani sera.
      if (pizza.getTime() - adesso.getTime() < LIMITI.oreTotali.min * 3_600_000) {
        pizza.setDate(pizza.getDate() + 1);
      }
    } else {
      pizza.setDate(pizza.getDate() + 1);
      if (id === 'pranzo') pizza.setHours(13, 0, 0, 0);
      else pizza.setHours(19, 30, 0, 0);
    }

    setFine(aInputData(pizza));

    // In Pro l'ora dell'impasto non si muove: se il frigo scritto non ci sta
    // nel tempo scelto, si accorcia (o si spegne) invece di lasciare un errore.
    if (!facile) {
      const partenza = new Date(inizio);
      if (!Number.isNaN(partenza.getTime())) {
        const totali = (pizza.getTime() - partenza.getTime()) / 3_600_000;
        if (totali < 12) setUsaFrigo(false);
      }
    }
  }

  const farinaNonValida = config.tonda && modalita === 'farina'
    && leggiIntervallo(farina, LIMITI.farina) === null;
  const messaggioFarina = 'Inserisci da 0,1 a 50 kg di farina.';

  const passiFacile: Passo[] = [
    {
      nome: 'Scegli le dosi',
      contenuto: (
        <Card titolo="Scegli le dosi">
          {config.tonda ? (
            <>
              <Segmentato voci={VOCI_MODALITA} attivo={modalita} onChange={setModalita} />
              <div className="grid gap-3 sm:grid-cols-2">
                {modalita === 'panetti' ? (
                  <CampoNumero
                    id="f-panetti"
                    label="Numero di panetti"
                    value={panetti}
                    onChange={setPanetti}
                    inputMode="numeric"
                    incremento={1}
                    minimo={LIMITI.panetti.min}
                    massimo={LIMITI.panetti.max}
                    decimali={0}
                  />
                ) : (
                  <CampoNumero
                    id="f-farina"
                    label="Farina"
                    unit="kg"
                    error={farinaNonValida ? messaggioFarina : undefined}
                    value={farina}
                    onChange={setFarina}
                    inputMode="decimal"
                    incremento={0.1}
                    minimo={LIMITI.farina.min}
                    massimo={LIMITI.farina.max}
                    decimali={2}
                  />
                )}
                <CampoNumero
                  id="f-peso-panetto"
                  label="Peso di ciascun panetto"
                  unit="g"
                  value={pesoPanetto}
                  onChange={setPesoPanetto}
                  inputMode="numeric"
                  incremento={5}
                  minimo={LIMITI.pesoPanetto.min}
                  massimo={LIMITI.pesoPanetto.max}
                  decimali={0}
                />
              </div>
            </>
          ) : (
            <>
              <Segmentato voci={VOCI_FORMA} attivo={forma} onChange={setForma} />
              <h3 className="text-sm font-semibold text-inchiostro">
                Dimensioni della teglia
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {forma === 'rettangolare' ? (
                  <>
                    <CampoNumero
                      id="f-lato-a"
                      label="Lato A"
                      unit="cm"
                      value={latoA}
                      onChange={setLatoA}
                      inputMode="numeric"
                      incremento={1}
                      minimo={LIMITI.lato.min}
                      massimo={LIMITI.lato.max}
                      decimali={0}
                    />
                    <CampoNumero
                      id="f-lato-b"
                      label="Lato B"
                      unit="cm"
                      value={latoB}
                      onChange={setLatoB}
                      inputMode="numeric"
                      incremento={1}
                      minimo={LIMITI.lato.min}
                      massimo={LIMITI.lato.max}
                      decimali={0}
                    />
                  </>
                ) : (
                  <CampoNumero
                    id="f-diametro"
                    label="Diametro"
                    unit="cm"
                    value={diametro}
                    onChange={setDiametro}
                    inputMode="numeric"
                    incremento={1}
                    minimo={LIMITI.diametro.min}
                    massimo={LIMITI.diametro.max}
                    decimali={0}
                  />
                )}
                <CampoNumero
                  id="f-teglie"
                  label="Teglie"
                  value={teglie}
                  onChange={setTeglie}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.teglie.min}
                  massimo={LIMITI.teglie.max}
                  decimali={0}
                />
              </div>
              <p className="text-xs leading-relaxed text-inchiostro-tenue">
                Spessore medio,{' '}
                {formatta(
                  (SPESSORI.find((voce) => voce.id === 'media')?.grammiPerCm2 ?? 0.55) * 100,
                  0,
                )}{' '}
                g per dm². In Modalità Pro puoi sceglierlo.
              </p>
            </>
          )}
        </Card>
      ),
    },
    {
      nome: 'Tempi e temperature',
      contenuto: (
        <Card titolo="Tempi e temperature">
          <p className="text-sm leading-relaxed">
            Quando vuoi sfornare? Usa i tasti rapidi qui sotto per impostare l’orario al volo,
            oppure modificalo a mano.
          </p>

          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_FACILE.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applicaPreset(preset.id)}
                className="rounded-xl border border-bordo bg-crema px-2 py-2.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro"
              >
                {preset.nome}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="f-inizio" className="mb-1.5 block text-sm font-semibold">
                Impasto alle
              </label>
              <input
                id="f-inizio"
                type="datetime-local"
                value={inizio}
                onChange={(evento) => setInizio(evento.target.value)}
                className="w-full rounded-xl border border-bordo bg-crema px-3.5 py-3 text-sm text-inchiostro"
              />
            </div>
            <div>
              <label htmlFor="f-fine" className="mb-1.5 block text-sm font-semibold">
                Impasto pronto alle
              </label>
              <input
                id="f-fine"
                type="datetime-local"
                value={fine}
                onChange={(evento) => setFine(evento.target.value)}
                className="w-full rounded-xl border border-bordo bg-crema px-3.5 py-3 text-sm text-inchiostro"
              />
            </div>
          </div>

          <CampoNumero
            id="f-ta"
            label="Temperatura in casa"
            unit="°C"
            value={ta}
            onChange={setTa}
            inputMode="numeric"
            incremento={1}
            minimo={LIMITI.ta.min}
            massimo={LIMITI.ta.max}
            decimali={0}
          />

          {/* Le ore nell’ordine in cui passano: ogni riga è un passo del lavoro,
              con le ore, i gradi e l’orario previsto in fondo. */}
          <ol className="rounded-xl border border-bordo/70 bg-crema p-3 sm:p-4">
            <li className="relative pl-5">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-terracotta/70 bg-terracotta/30"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold leading-snug">
                  Puntata a temperatura ambiente
                </p>
                <p className="text-xs font-semibold tabular-nums text-oro-chiaro">
                  {finePuntata ? `fine ${formattaQuando(finePuntata)}` : '—'}
                </p>
              </div>
              <p className="text-xs leading-relaxed text-inchiostro-tenue">
                {orePrimaFacile > 0
                  ? `${ore(orePrimaFacile)} ore a ${ta} °C`
                  : 'Nessuna puntata: subito in frigo'}
                <span className="ml-1.5 inline-block rounded-full border border-bordo bg-crema-scuro px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  calcolate
                </span>
              </p>
            </li>

            {config.tonda && conFrigoFacile ? (
              <li className="relative mt-3 pl-5">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-bordo bg-crema-scuro"
                />
                <p className="mb-1.5 text-sm font-semibold leading-snug">
                  Quando fai i panetti?
                </p>
                <Segmentato
                  voci={VOCI_STAGLIO_FACILE}
                  attivo={staglio}
                  onChange={setStaglio}
                />
              </li>
            ) : null}

            <li className="relative mt-3 pl-5">
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-bordo bg-crema-scuro"
              />
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-sm font-semibold leading-snug">Maturazione in frigo</p>
                <p className="text-xs font-semibold tabular-nums text-oro-chiaro">
                  {fineFrigo ? `fine ${formattaQuando(fineFrigo)}` : '—'}
                </p>
              </div>
              <div className="mt-2">
                <Segmentato
                  voci={[
                    { id: 'si', nome: 'Sì' },
                    { id: 'no', nome: 'No' },
                  ]}
                  attivo={usaFrigo ? 'si' : 'no'}
                  onChange={(voce) => setUsaFrigo(voce === 'si')}
                />
              </div>
              {conFrigoFacile ? (
                <>
                  <div className="mt-2 sm:max-w-[20rem]">
                    <CampoNumero
                      id="f-frigo"
                      label="Ore in frigo a 4 °C"
                      unit="h"
                      value={frigoScritto ?? ore(ripartizione.oreFrigo)}
                      onChange={setFrigoScritto}
                      inputMode="decimal"
                      incremento={1}
                      minimo={LIMITI.oreFrigo.min}
                      massimo={LIMITI.oreFrigo.max}
                      decimali={1}
                    />
                  </div>
                  {frigoScritto !== null ? (
                    <button
                      type="button"
                      onClick={() => setFrigoScritto(null)}
                      className="mt-1 text-xs font-semibold text-terracotta underline underline-offset-2"
                    >
                      Torna ai tempi consigliati
                    </button>
                  ) : null}
                </>
              ) : null}
            </li>

            {conFrigoFacile ? (
              <>
                {staglio === 'dopo' ? (
                  <li className="relative mt-3 pl-5">
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-bordo bg-crema-scuro"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-semibold leading-snug">Staglio</p>
                      <p className="text-xs font-semibold tabular-nums text-oro-chiaro">
                        {fineFrigo ? formattaQuando(fineFrigo) : '—'}
                      </p>
                    </div>
                    <p className="text-xs leading-relaxed text-inchiostro-tenue">
                      Panetti formati appena escono dal frigo, prima dell’appretto.
                    </p>
                  </li>
                ) : null}

                <li className="relative mt-3 pl-5">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-terracotta/70 bg-terracotta/30"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold leading-snug">
                      Appretto a temperatura ambiente
                    </p>
                    <p className="text-xs font-semibold tabular-nums text-oro-chiaro">
                      {prontoDaInfornare
                        ? `impasto pronto ${formattaQuando(prontoDaInfornare)}`
                        : '—'}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-inchiostro-tenue">
                    {`${ore(Math.max(0, esito.taDopo))} ore a ${ta} °C`}
                  </p>
                </li>
              </>
            ) : (
              <li className="relative mt-3 pl-5">
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border border-terracotta/70 bg-terracotta/30"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-semibold leading-snug">
                    Tutto a temperatura ambiente
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-oro-chiaro">
                    {prontoDaInfornare
                      ? `impasto pronto ${formattaQuando(prontoDaInfornare)}`
                      : '—'}
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-inchiostro-tenue">
                  {`${ore(esito.oreTotali ?? 0)} ore a ${ta} °C, senza frigo`}
                </p>
              </li>
            )}
          </ol>
        </Card>
      ),
    },
    {
      nome: 'Il tuo impasto',
      contenuto: (
        // I risultati uno sotto l'altro, a tutta larghezza.
        <div className="space-y-4">
          {r ? (
            <>
              {schedaDosi}

              <Card titolo="La farina che ti serve">
                <p className="text-sm leading-relaxed">{consiglioFarina(r.forzaConsigliata)}</p>
                {r.avvisi.length > 0 ? (
                  <p className="rounded-xl border border-bordo bg-crema px-3 py-2 text-xs leading-relaxed text-avviso">
                    {r.avvisi[0]}
                  </p>
                ) : null}
              </Card>

              {tabellaMarcia}

              <Card titolo="Attività e temperatura">
                <Grafico svgRef={graficoRef} curva={r.curva} fasce={r.fasce} oreTotali={oreTotaliGrafico} />
              </Card>

              {cardEsporta}
            </>
          ) : (
            <div className="space-y-4">
              <Card titolo="Calcola impasto">
                <button
                  type="button"
                  onClick={confermaCalcolo}
                  disabled={farinaNonValida || (!facile && esito.mixNonValido)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-terracotta/40 bg-transparent px-5 py-3.5 text-base font-bold text-oro-chiaro transition-all hover:-translate-y-px hover:border-terracotta/70 hover:bg-terracotta/10 active:translate-y-0"
                >
                  Calcola impasto
                </button>
              </Card>
              {problemi.length > 0 ? (
                <Card titolo="Manca qualcosa">
                  <ul className="space-y-1.5 text-sm leading-relaxed text-errore">
                    {problemi.map((problema) => (
                      <li key={problema} className="flex gap-2">
                        <span aria-hidden="true">!</span>
                        <span>{problema}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {senzaTestata ? null : (
      <header className="sticky top-0 z-40 border-b border-bordo/70 bg-crema-scuro/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <a
            href="#calcolatore"
            className="flex min-w-0 items-center gap-3"
          >
            <Marchio className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-serif text-base leading-none font-bold tracking-wide text-inchiostro sm:text-lg">
                PizzaMetria
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.16em] text-terracotta">
                Calcolatore libero
              </span>
            </span>
          </a>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-bordo bg-carta/70 px-3 py-1.5 text-[11px] font-medium text-inchiostro-tenue sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-terracotta"
              />
              Calcolo locale
            </span>
            <button
              type="button"
              onClick={() => setMenuAperto(true)}
              aria-expanded={menuAperto}
              aria-controls="menu-laterale"
              aria-label="Apri il menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-bordo bg-carta/70 text-inchiostro transition-colors hover:border-terracotta/60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="h-4 w-4"
              >
                <path d="M3 5.5h14M3 10h14M3 14.5h14" />
              </svg>
            </button>
          </div>
        </div>
      </header>
      )}

      {senzaTestata ? null : (
        <MenuLaterale aperto={menuAperto} onChiudi={() => setMenuAperto(false)} />
      )}

      <main
        id="calcolatore"
        className={`mx-auto max-w-5xl scroll-mt-20 px-0 pb-14 sm:px-6 ${
          senzaTestata ? 'pt-4' : ''
        }`}
      >
        {senzaTestata ? null : (
        <section className="pt-7 pb-5">
          <h1 className="font-serif text-2xl leading-tight sm:text-3xl">
            Impasto <span className="testo-oro">diretto</span>, dosi esatte
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-inchiostro-tenue">
            Dici a che ora impasti e a che ora vuoi mangiare: il calcolatore ricava il lievito
            dalle ore effettive, frigorifero compreso, e ti dice se la farina che hai in casa
            è adatta a questi tempi.
          </p>
        </section>
        )}

        {senzaTestata ? null : (
        <>
        <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-bordo bg-crema-scuro p-1.5">
          {IMPASTI.map((impasto) => {
            const attivo = impasto.id === tipo;
            return (
              <button
                key={impasto.id}
                type="button"
                aria-pressed={attivo}
                onClick={() => scegliImpasto(impasto.id)}
                className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
                  attivo
                    ? 'bg-terracotta text-su-oro'
                    : 'text-inchiostro-tenue hover:bg-crema hover:text-inchiostro'
                }`}
              >
                {impasto.nomeBreve}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-inchiostro-tenue">
          <span className="font-semibold text-inchiostro">{config.nome}</span> ·{' '}
          {config.sottotitolo}
        </p>
        </>
        )}

        {/* La modalità è un'impostazione preliminare: sul telefono il selettore
            resta solo nel primo passo e sparisce appena si va avanti. */}
        {guidato && (facile ? passoFacile > 0 : passoPro > 0) ? null : (
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-semibold text-inchiostro">
              Scegli come calcolare la tua ricetta
            </p>
            <Segmentato
              voci={VOCI_VISTA}
              attivo={vista}
              onChange={(voce) => {
                setVista(voce);
                setPassoFacile(0);
                setPassoPro(0);
              }}
            />
          </div>
        )}

        {facile ? (
          guidato ? (
            <div id="passi-calcolatore" className="mt-5 scroll-mt-24">
              <Wizard
                passi={passiFacile}
                attivo={passoFacile}
                bloccaAvanti={passoFacile === 0 && farinaNonValida}
                onCambia={(indice) => {
                  // L'ultimo passo sono i risultati: si calcola da sé, senza un
                  // tasto in più da premere.
                  if (indice === passiFacile.length - 1) confermaCalcolo();
                  cambiaPasso(setPassoFacile, indice);
                }}
              />
            </div>
          ) : (
            // Da desktop niente passi: un riquadro per riga, prima i dati e poi
            // i calcoli, tutti a tutta larghezza.
            <div className="mt-5 space-y-4">
              {passiFacile.map((passo) => (
                <div key={passo.nome}>{passo.contenuto}</div>
              ))}
            </div>
          )
        ) : (
        <div id="passi-calcolatore" className="mt-5 scroll-mt-24 space-y-4">
          {/* Prima si compila: un riquadro per riga, nell'ordine dei dati. */}
          <div className="space-y-4">
            <Card
              className={visibilePro(0)}
              titolo="L’impasto"
              nota="Percentuali calcolate sulla farina."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoNumero
                  id="idratazione"
                  label="Idratazione"
                  unit="%"
                  value={idratazione}
                  onChange={setIdratazione}
                  inputMode="decimal"
                  incremento={1}
                  minimo={LIMITI.idratazione.min}
                  massimo={LIMITI.idratazione.max}
                  decimali={0}
                />
                <AvvisoIdratazione
                  ricettaId={tipo}
                  idratazione={leggiIntervallo(idratazione, LIMITI.idratazione)}
                  className="sm:col-span-2"
                />
                <CampoNumero
                  id="sale"
                  label="Sale"
                  unit={unita === 'farina' ? '%' : 'g/L'}
                  value={sale}
                  onChange={setSale}
                  inputMode="decimal"
                  incremento={unita === 'farina' ? 0.1 : 1}
                  minimo={unita === 'farina' ? LIMITI.sale.min : LIMITI.saleLitro.min}
                  massimo={unita === 'farina' ? LIMITI.sale.max : LIMITI.saleLitro.max}
                  decimali={unita === 'farina' ? 1 : 0}
                />
                <CampoNumero
                  id="olio"
                  label="Olio"
                  unit={unita === 'farina' ? '%' : 'g/L'}
                  value={olio}
                  onChange={setOlio}
                  inputMode="decimal"
                  incremento={unita === 'farina' ? 0.5 : 5}
                  minimo={unita === 'farina' ? LIMITI.olio.min : LIMITI.olioLitro.min}
                  massimo={unita === 'farina' ? LIMITI.olio.max : LIMITI.olioLitro.max}
                  decimali={unita === 'farina' ? 1 : 0}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-inchiostro">
                    Malto
                    <span className="font-normal text-inchiostro-tenue">
                      {' '}
                      (aiuta il colore e l’attività enzimatica)
                    </span>
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-pressed={usaMalto}
                      onClick={() => setUsaMalto(true)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        usaMalto
                          ? 'bg-terracotta text-su-oro'
                          : 'border border-bordo text-inchiostro-tenue'
                      }`}
                    >
                      Sì
                    </button>
                    <button
                      type="button"
                      aria-pressed={!usaMalto}
                      onClick={() => setUsaMalto(false)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        !usaMalto
                          ? 'bg-terracotta text-su-oro'
                          : 'border border-bordo text-inchiostro-tenue'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
                {usaMalto ? (
                  <CampoNumero
                    id="malto"
                    label="Malto"
                    unit="%"
                    value={malto}
                    onChange={setMalto}
                    inputMode="decimal"
                    incremento={0.1}
                    minimo={LIMITI.malto.min}
                    massimo={LIMITI.malto.max}
                    decimali={1}
                    hint="In media viene utilizzato dall’1% al 2% sul peso della farina."
                  />
                ) : null}
              </div>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-inchiostro">Lievito</p>
                <Segmentato voci={VOCI_LIEVITO} attivo={tipoLievito} onChange={setTipoLievito} />
              </div>
            </Card>

            <Card className={visibilePro(1)} titolo="Scegli le dosi">
              {config.tonda ? (
                <>
                  <Segmentato voci={VOCI_MODALITA} attivo={modalita} onChange={setModalita} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {modalita === 'panetti' ? (
                      <CampoNumero
                        id="panetti"
                        label="Numero di panetti"
                        value={panetti}
                        onChange={setPanetti}
                        inputMode="numeric"
                        incremento={1}
                        minimo={LIMITI.panetti.min}
                        massimo={LIMITI.panetti.max}
                        decimali={0}
                      />
                    ) : (
                      <CampoNumero
                        id="farina-kg"
                        label="Farina"
                        unit="kg"
                        error={farinaNonValida ? messaggioFarina : undefined}
                        value={farina}
                        onChange={setFarina}
                        inputMode="decimal"
                        incremento={0.1}
                        minimo={LIMITI.farina.min}
                        massimo={LIMITI.farina.max}
                        decimali={2}
                      />
                    )}
                    <CampoNumero
                      id="peso-panetto"
                      label="Peso di ciascun panetto"
                      unit="g"
                      value={pesoPanetto}
                      onChange={setPesoPanetto}
                      inputMode="numeric"
                      incremento={5}
                      minimo={LIMITI.pesoPanetto.min}
                      massimo={LIMITI.pesoPanetto.max}
                      decimali={0}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Segmentato voci={VOCI_FORMA} attivo={forma} onChange={setForma} />
                  <div className="grid gap-3 md:grid-cols-2">
                    {forma === 'rettangolare' ? (
                      <>
                        <CampoNumero
                          id="lato-a"
                          label="Lato A"
                          unit="cm"
                          value={latoA}
                          onChange={setLatoA}
                          inputMode="numeric"
                          incremento={1}
                          minimo={LIMITI.lato.min}
                          massimo={LIMITI.lato.max}
                          decimali={0}
                        />
                        <CampoNumero
                          id="lato-b"
                          label="Lato B"
                          unit="cm"
                          value={latoB}
                          onChange={setLatoB}
                          inputMode="numeric"
                          incremento={1}
                          minimo={LIMITI.lato.min}
                          massimo={LIMITI.lato.max}
                          decimali={0}
                        />
                      </>
                    ) : (
                      <CampoNumero
                        id="diametro"
                        label="Diametro"
                        unit="cm"
                        value={diametro}
                        onChange={setDiametro}
                        inputMode="numeric"
                        incremento={1}
                        minimo={LIMITI.diametro.min}
                        massimo={LIMITI.diametro.max}
                        decimali={0}
                      />
                    )}
                    <CampoNumero
                      id="teglie"
                      label="Teglie"
                      value={teglie}
                      onChange={setTeglie}
                      inputMode="numeric"
                      incremento={1}
                      minimo={LIMITI.teglie.min}
                      massimo={LIMITI.teglie.max}
                      decimali={0}
                    />
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-semibold text-inchiostro">Spessore</p>
                    <Segmentato
                      voci={SPESSORI.map((voce) => ({ id: voce.id, nome: voce.nome }))}
                      attivo={spessore}
                      onChange={setSpessore}
                      dueRighe
                    />
                    <p className="mt-1.5 text-xs text-inchiostro-tenue">
                      {spessoreScelto?.nota} ·{' '}
                      {formatta((spessoreScelto?.grammiPerCm2 ?? 0) * 100, 0)} g per dm²
                    </p>
                  </div>

                  {spessore === 'personalizzata' ? (
                    <CampoNumero
                      id="grammi-cm2"
                      label="Impasto per superficie"
                      unit="g/cm²"
                      value={grammiCm2}
                      onChange={setGrammiCm2}
                      inputMode="decimal"
                      incremento={0.05}
                      minimo={LIMITI.grammiCm2.min}
                      massimo={LIMITI.grammiCm2.max}
                      decimali={2}
                      hint="0,42 teglia sottile · 0,55 media · 0,70 alta."
                    />
                  ) : null}
                </>
              )}
            </Card>

            <Card className={visibilePro(2)} titolo="Tempi e temperature">
              <p className="text-sm leading-relaxed">
                Quando vuoi sfornare? Usa i tasti rapidi qui sotto per impostare l’orario al volo,
                oppure modificalo a mano.
              </p>

              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_FACILE.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applicaPreset(preset.id)}
                    className="rounded-xl border border-bordo bg-crema px-2 py-2.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:text-oro-chiaro"
                  >
                    {preset.nome}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="inizio" className="mb-1.5 block text-sm font-semibold">
                    Impasto alle
                  </label>
                  <input
                    id="inizio"
                    type="datetime-local"
                    value={inizio}
                    onChange={(evento) => setInizio(evento.target.value)}
                    className="w-full rounded-xl border border-bordo bg-crema px-3.5 py-3 text-sm text-inchiostro"
                  />
                </div>
                <div>
                  <label htmlFor="fine" className="mb-1.5 block text-sm font-semibold">
                    Impasto pronto alle
                  </label>
                  <input
                    id="fine"
                    type="datetime-local"
                    value={fine}
                    onChange={(evento) => setFine(evento.target.value)}
                    className="w-full rounded-xl border border-bordo bg-crema px-3.5 py-3 text-sm text-inchiostro"
                  />
                </div>
              </div>

              <p className="rounded-xl border border-bordo bg-crema px-3 py-2 text-xs text-inchiostro-tenue">
                Tempo a disposizione:{' '}
                <strong className="text-inchiostro">
                  {esito.oreTotali !== null && esito.oreTotali > 0
                    ? `${ore(esito.oreTotali)} ore`
                    : '—'}
                </strong>
              </p>

              <div>
                <p className="mb-1.5 text-sm font-semibold text-inchiostro">
                  Maturazione in frigo
                </p>
                <Segmentato
                  voci={[
                    { id: 'si', nome: 'Sì' },
                    { id: 'no', nome: 'No' },
                  ]}
                  attivo={usaFrigo ? 'si' : 'no'}
                  onChange={(voce) => setUsaFrigo(voce === 'si')}
                />
              </div>

              {config.tonda ? (
                <div>
                  <p className="mb-1.5 text-sm font-semibold text-inchiostro">
                    Quando fai i panetti?
                  </p>
                  <Segmentato voci={VOCI_STAGLIO} attivo={staglio} onChange={setStaglio} />
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {usaFrigo ? (
                  <>
                    <CampoNumero
                      id="ore-ta-prima"
                      label="Ore a TA prima"
                      unit="h"
                      value={oreTaPrima}
                      onChange={setOreTaPrima}
                      inputMode="decimal"
                      incremento={0.5}
                      minimo={LIMITI.oreTaPrima.min}
                      massimo={LIMITI.oreTaPrima.max}
                      decimali={1}
                      hint="Puntata prima di mettere l’impasto in frigo."
                    />
                    <CampoNumero
                      id="ore-frigo"
                      label="Ore in frigo"
                      unit="h"
                      value={oreFrigo}
                      onChange={setOreFrigo}
                      inputMode="decimal"
                      incremento={1}
                      minimo={LIMITI.oreFrigo.min}
                      massimo={LIMITI.oreFrigo.max}
                      decimali={1}
                      hint="Prende quello che resta: si adatta agli orari."
                    />
                    <div className="min-w-0 rounded-xl border border-bordo bg-crema px-3.5 py-2.5">
                      <p className="text-sm font-semibold text-inchiostro">
                        Ore a TA dopo il frigo
                      </p>
                      <p className="font-serif text-xl tabular-nums text-oro-chiaro">
                        {ore(Math.max(0, esito.taDopo))}{' '}
                        <span className="font-sans text-sm text-inchiostro-tenue">h</span>
                      </p>
                      <p className="text-[11px] leading-relaxed text-inchiostro-tenue">
                        Calcolate: è il tempo che resta fra il frigo e l’infornata.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {usaFrigo && esito.taDopo < 0 ? (
                <p className="rounded-xl border border-errore/40 bg-crema px-3 py-2 text-xs leading-relaxed text-errore">
                  Puntata e frigo chiedono più ore di quelle che hai: togline{' '}
                  {ore(-esito.taDopo)} oppure sposta l’ora di pronto.
                </p>
              ) : null}

              <Programma
                inizio={inizio}
                fine={fine}
                orePrima={usaFrigo ? leggiIntervallo(oreTaPrima, LIMITI.oreTaPrima) : 0}
                oreFrigo={usaFrigo ? leggiIntervallo(oreFrigo, LIMITI.oreFrigo) : 0}
                staglio={staglio}
                tonda={config.tonda}
              />
            </Card>

            <Card
              className={visibilePro(3)}
              titolo="Acqua e temperature"
              nota="L’acqua porta l’impasto alla temperatura giusta; frigo e stanza decidono quanto fermenta."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <CampoNumero
                  id="temp-impasto"
                  label="Impasto a fine lavorazione"
                  unit="°C"
                  value={temperaturaImpasto}
                  onChange={setTemperaturaImpasto}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.temperaturaImpasto.min}
                  massimo={LIMITI.temperaturaImpasto.max}
                  decimali={0}
                  hint="21-24 °C è l’intervallo classico."
                />
                <CampoNumero
                  id="temp-farina"
                  label="Farina"
                  unit="°C"
                  value={temperaturaFarina}
                  onChange={setTemperaturaFarina}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.temperaturaFarina.min}
                  massimo={LIMITI.temperaturaFarina.max}
                  decimali={0}
                />
                <CampoNumero
                  id="riscaldamento"
                  label="Riscaldamento impastatrice"
                  unit="°C"
                  value={riscaldamento}
                  onChange={setRiscalDamento}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.riscaldamento.min}
                  massimo={LIMITI.riscaldamento.max}
                  decimali={0}
                  hint="4-6 °C a mano, 8-12 °C con la planetaria."
                />
                <CampoNumero
                  id="tc"
                  label="Temperatura frigo"
                  unit="°C"
                  value={tc}
                  onChange={setTc}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.tc.min}
                  massimo={LIMITI.tc.max}
                  decimali={0}
                  hint="4 °C è il frigo di casa; più freddo ferma la lievitazione prima."
                />
                <CampoNumero
                  id="ta"
                  label="Temperatura ambiente"
                  unit="°C"
                  value={ta}
                  onChange={setTa}
                  inputMode="numeric"
                  incremento={1}
                  minimo={LIMITI.ta.min}
                  massimo={LIMITI.ta.max}
                  decimali={0}
                />
              </div>
              <p className="rounded-xl border border-bordo bg-crema px-3 py-2 text-xs leading-relaxed text-inchiostro-tenue">
                Acqua consigliata:{' '}
                <strong className="text-oro-chiaro">
                  {formatta(r?.temperaturaAcqua ?? acquaAnteprima, 0)} °C
                </strong>{' '}
                {r ? '' : '· anteprima'}
              </p>
            </Card>

            <Card
              className={visibilePro(4)}
              titolo="Mix di farine"
              nota="Da una a quattro farine: il W che ne esce tiene conto anche di quanto è eterogeneo il mix."
            >
              <MixFarine
                farine={farine}
                resto={restoMix}
                errori={esito.erroriMix}
                wMancanti={esito.wMancanti}
                onChange={cambiaFarina}
                onAggiungi={aggiungiFarina}
                onRimuovi={rimuoviFarina}
                wEquivalente={esito.mixW}
                efficace={esito.risultato?.wEfficace ?? null}
                giudizio={esito.risultato?.giudizioForza ?? null}
                consigliato={esito.risultato?.forzaConsigliata ?? null}
                finestra={
                  esito.risultato
                    ? {
                        minima: esito.risultato.forzaMinima,
                        massima: esito.risultato.forzaMassima,
                      }
                    : null
                }
              />
            </Card>

            <div className="lg:hidden">
              <Navigazione
                passi={passiPro}
                attivo={passoPro}
                bloccaAvanti={(passoPro === 1 && farinaNonValida) || (passoPro === 2 && !oreTempiValide) || (passoPro === 4 && esito.mixNonValido)}
                notaAvanti={passoPro === 2 ? "Sistema le ore in «Tempi e temperature»." : undefined}
                onCambia={(indice) => {
                  // Arrivando all'ultimo passo il risultato è già calcolato.
                  if (indice === passiPro.length - 1) confermaCalcolo();
                  cambiaPasso(setPassoPro, indice);
                }}
              />
            </div>
          </div>

          {/* I calcoli sotto, dopo i dati: il risultato si legge a pagina piena. */}
          <div
            className={`space-y-4 ${guidato && passoPro !== 5 ? 'hidden' : ''}`}
          >
            {daRicalcolare && !r ? (
              <Card titolo="Dati cambiati">
                <p className="text-sm leading-relaxed text-inchiostro-tenue">
                  Hai modificato qualcosa: le dosi qui sotto sono quelle del
                  calcolo precedente.
                </p>
                <button
                  type="button"
                  onClick={confermaCalcolo}
                  disabled={farinaNonValida || (!facile && esito.mixNonValido)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-terracotta/40 bg-transparent px-5 py-3.5 text-base font-bold text-oro-chiaro transition-all hover:-translate-y-px hover:border-terracotta/70 hover:bg-terracotta/10 active:translate-y-0"
                >
                  Ricalcola
                </button>
              </Card>
            ) : null}

            {calcolo === null ? (
              <Card titolo="Calcola impasto">
                <p className="text-sm leading-relaxed text-inchiostro-tenue">
                  Controlla i dati e premi il pulsante: dosi, tempi e procedimento
                  compaiono qui.
                </p>
                <button
                  type="button"
                  onClick={confermaCalcolo}
                  disabled={farinaNonValida || (!facile && esito.mixNonValido)}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl border border-terracotta/40 bg-transparent px-5 py-3.5 text-base font-bold text-oro-chiaro transition-all hover:-translate-y-px hover:border-terracotta/70 hover:bg-terracotta/10 active:translate-y-0"
                >
                  Calcola impasto
                </button>
              </Card>
            ) : problemi.length > 0 ? (
              <Card titolo="Manca qualcosa">
                <ul className="space-y-1.5 text-sm leading-relaxed text-errore">
                  {problemi.map((problema) => (
                    <li key={problema} className="flex gap-2">
                      <span aria-hidden="true">!</span>
                      <span>{problema}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : r ? (
              <>
                {schedaDosi}
                {tabellaMarcia}
                {r.avvisi.length > 0 ? (
                  <Card titolo="Da controllare">
                    <ul className="space-y-1.5 text-xs leading-relaxed text-avviso">
                      {r.avvisi.map((avviso) => (
                        <li key={avviso} className="flex gap-2">
                          <span aria-hidden="true">·</span>
                          <span>{avviso}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}

                <FisarmonicaRisultato titolo="Confronta i modelli">
                  <Segmentato voci={VOCI_MODELLO} attivo={modello} onChange={setModello} dueRighe />
                  <p className="text-xs leading-relaxed text-inchiostro-tenue">
                    {modello === 'miniRicette'
                      ? 'Frazionario: dodici mini-ricette, un indice per il lievito e uno per la maturazione. È il motore predefinito.'
                      : modello === 'termico'
                        ? 'Termico: segue la temperatura reale del pezzo (peso e forma) e conta il lievito in frigo con il suo orologio. Il W resta quello dell’inerziale.'
                        : modello === 'nuovo'
                          ? 'Inerziale: l’impasto insegue la temperatura con una costante di tempo che dipende da peso e forma.'
                          : 'Vecchio: scambi termici rapidi, come nel calcolatore precedente.'}
                  </p>
                  <div className="grid gap-2 sm:hidden">
                    {VOCI_MODELLO.map(({ id }) => (
                      <div key={id} className={`rounded-xl border p-3 ${modello === id ? 'border-terracotta/50 bg-crema-scuro' : 'border-bordo/80'}`}>
                        <p className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
                          {nomiModello[id]}
                          {modello === id ? <span className="text-xs text-oro-chiaro">In uso</span> : null}
                        </p>
                        <dl className="grid gap-1.5">
                          {misureConfronto.map((misura) => (
                            <Riga key={misura.etichetta} etichetta={misura.etichetta} valore={misura[id]} />
                          ))}
                        </dl>
                      </div>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-bordo/80 sm:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-crema-scuro text-[11px] tracking-wide text-inchiostro-tenue uppercase">
                          <th scope="col" className="px-2.5 py-2 text-left font-semibold">
                            <span className="sr-only">Misura</span>
                          </th>
                          {(['miniRicette', 'termico', 'nuovo', 'vecchio'] as const).map((id) => (
                            <th
                              key={id}
                              scope="col"
                              className={`px-1 py-2 text-right font-semibold ${
                                modello === id ? 'text-oro-chiaro' : ''
                              }`}
                            >
                              {nomiModello[id]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-bordo/60">
                        {misureConfronto.map((riga) => (
                          <tr key={riga.etichetta}>
                            <th
                              scope="row"
                              className="px-2.5 py-2 text-left font-normal text-inchiostro-tenue"
                            >
                              {riga.etichetta}
                            </th>
                            {(['miniRicette', 'termico', 'nuovo', 'vecchio'] as const).map(
                              (id) => (
                                <td
                                  key={id}
                                  className={`px-1 py-2 text-right tabular-nums ${
                                    modello === id
                                      ? 'font-semibold text-inchiostro'
                                      : 'text-inchiostro-tenue'
                                  }`}
                                >
                                  {riga[id]}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </FisarmonicaRisultato>

                <Card titolo="Forza della farina">
                  <p className="text-sm">
                    Per questa maturazione serve{' '}
                    <strong className="text-oro-chiaro">W {r.forzaConsigliata}</strong>{' '}
                    <span className="text-inchiostro-tenue">
                      · fascia tollerata {r.forzaMinima}–{r.forzaMassima} · zona consigliata{' '}
                      {r.zonaMinima}–{r.zonaMassima}
                    </span>
                    .
                  </p>
                  <div className="mt-2">
                    <GraficoForza
                      svgRef={forzaRef}
                      consigliato={r.forzaConsigliata}
                      efficace={r.wEfficace}
                      giudizio={r.giudizioForza}
                      fasce={{
                        sicura: [r.zonaMinima, r.zonaMassima],
                        tollerata: [r.forzaMinima, r.forzaMassima],
                      }}
                    />
                  </div>
                  {r.wEfficace !== null && r.giudizioForza ? (
                    <>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          STILI_GIUDIZIO[r.giudizioForza]
                        }`}
                      >
                        {ETICHETTE_GIUDIZIO[r.giudizioForza]} · mix a W{' '}
                        {Math.round(r.wEfficace)}
                      </span>
                      <p className="text-xs leading-relaxed text-inchiostro-tenue">
                        {testoGiudizio(
                          r.giudizioForza,
                          r.wEfficace,
                          r.forzaConsigliata,
                          r.forzaMinima,
                          r.forzaMassima,
                        )}
                      </p>
                      {r.suggerimentoForza ? (
                        <p className="text-xs leading-relaxed text-avviso">
                          {r.suggerimentoForza}
                        </p>
                      ) : null}
                      {r.wEquivalente !== null &&
                      Math.round(r.wEquivalente) !== Math.round(r.wEfficace) ? (
                        <p className="text-[11px] leading-relaxed text-inchiostro-tenue">
                          Media delle farine: W {Math.round(r.wEquivalente)}. Il mix eterogeneo
                          perde {Math.round(r.wEquivalente - r.wEfficace)} gradi, perché la parte
                          debole cede prima di quanto dica la sua quota.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-inchiostro-tenue">
                      {r.wIncompleto
                        ? "Manca il W di una delle farine del mix: finché non li hai tutti il W del mix non è calcolabile, e non posso dire se la farina regge. Aggiungi il W di quella farina, oppure metti la sua quota a zero."
                        : "Senza il W non posso dire se la farina regge: cerca le proteine in etichetta, 12-14% è di solito una farina forte."}
                    </p>
                  )}
                </Card>

                <Card
                  titolo="Attività del lievito"
                  nota={
                    r.modello === 'vecchio'
                      ? 'La curva segue l’ambiente quasi subito.'
                      : r.modello === 'termico' || r.modello === 'miniRicette'
                        ? 'Il grafico mostra il profilo termico di base. Le ore equivalenti dipendono dal modello selezionato.'
                        : `L’impasto insegue l’ambiente con una costante di tempo di ${ore(
                          r.costanteTempoOre,
                        )} ore: la curva non fa scalini.`
                  }
                >
                  <Grafico
                    svgRef={graficoRef}
                    curva={r.curva}
                    fasce={r.fasce}
                    oreTotali={oreTotaliGrafico}
                  />
                  <p className="rounded-xl border border-bordo bg-crema px-3 py-2 text-xs leading-relaxed text-inchiostro-tenue">
                    {nomiModello[r.modello]} ·{' '}
                    <strong className="text-oro-chiaro">
                      {ore(r.modello === 'miniRicette' ? r.miniRicetta.iFerm : r.oreEquivalenti)} ore equivalenti per il lievito
                    </strong>
                    {r.modello === 'miniRicette' ? ` · ${ore(r.miniRicetta.iMat)} per la maturazione` : ''}
                    {r.temperaturaUscitaFrigo !== null
                      ? `. All’uscita dal frigo l’impasto è ancora a ${formatta(
                          r.temperaturaUscitaFrigo,
                          1,
                        )} °C.`
                      : '.'}
                  </p>
                </Card>


                {cardEsporta}
              </>
            ) : null}
          </div>
        </div>
        )}

        

        <p className="mt-6 text-center text-[11px] text-inchiostro-tenue">
          PizzaMetria · calcolatore libero · versione di prova. Tutti i calcoli restano nel tuo
          browser.
        </p>
      </main>
    </div>
  );
}
