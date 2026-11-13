import { useMemo, useState } from 'react';
import type { TipoEsportazione, TipoLievito } from '../types';
import { calcolaBigaSola, oreTraDate } from '../lib/biga-sola';
import { impastoPredefinito } from '../lib/orari';
import { creaNomeFile } from '../lib/nomeFile';
import { testoMaturazione } from '../lib/vista';
import { useMediaQuery } from '../lib/useMediaQuery';
import { NavigazionePassi } from '../../components/Passi';
import { SCALA_JPG, jpgBlob } from '../../export/foglio';
import { datiFoglioRicetta } from '../export/foglio-ricetta';
import {
  anteprimaNellApp,
  apriNellApp,
} from '../../lib/anteprima';
import { scaricaBlob } from '../lib/download';
import { CampoNumero } from './CampoNumero';
import { AvvisoIdratazione } from '../../components/AvvisoIdratazione';
import {
  PannelloRisultato,
  type MessaggioEsportazione,
} from './PannelloRisultato';

/**
 * Numeri con la virgola, come nei campi del resto del sito.
 *
 * `parseFloat` accetterebbe «25abc» come 25: chi scrive per sbaglio una lettera
 * dopo il numero si vedrebbe calcolare 25 kg di farina. Qui o è un numero o non
 * lo è, e chi chiama riceve il valore di difetto.
 */
function leggi(testo: string, difetto: number): number {
  const pulito = testo.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(pulito)) return difetto;
  const numero = Number(pulito);
  return Number.isFinite(numero) ? numero : difetto;
}

/** «24 ore», «1 giorno e 2 ore»: l'attesa si legge a colpo d'occhio. */
function testoAttesa(ore: number): string {
  if (ore <= 0) return 'nessuna attesa';
  const giorni = Math.floor(ore / 24);
  const resto = Math.round((ore - giorni * 24) * 10) / 10;
  const parti: string[] = [];

  if (giorni > 0) {
    parti.push(`${giorni} ${giorni === 1 ? 'giorno' : 'giorni'}`);
  }
  if (resto > 0 || giorni === 0) {
    parti.push(
      `${String(resto).replace('.', ',')} ${resto === 1 ? 'ora' : 'ore'}`,
    );
  }
  return parti.join(' e ');
}

const LIMITI = {
  farinaKg: { min: 0.1, max: 20 },
  temperatura: { min: 8, max: 32 },
  frigo: { min: 0, max: 12 },
} as const;

// Stessa soglia del resto dell'app: sotto questa larghezza si va a passi,
// sopra resta la pagina unica.
const SOGLIA_GUIDATA = '(max-width: 1023px)';

/** I passi del percorso guidato: gli stessi nomi del calcolatore delle pizze. */
const PASSI = ['Scegli le dosi', 'Quando la vuoi', 'Il tuo impasto'];

/**
 * Il calcolatore della sola biga: farina, giorno e ora di impasto e di biga
 * pronta, temperature. Il motore decide idratazione e ripartizione fra
 * ambiente e frigorifero; scheda, PDF e JPG sono quelli del resto del sito.
 *
 * Sul telefono si compila un passo per volta — dosi, tempi, impasto — come
 * nelle ricette; sul desktop i tre riquadri restano uno sotto l'altro.
 */
export function CalcolatoreBiga() {
  const [farina, setFarina] = useState('1');
  const [inizio, setInizio] = useState(() => impastoPredefinito());
  const [fine, setFine] = useState(() => impastoPredefinito(24));
  const [temperatura, setTemperatura] = useState('21');
  const [temperaturaFrigo, setTemperaturaFrigo] = useState('4');
  const [lievito, setLievito] = useState<TipoLievito>('fresco');
  const [smartphone, setSmartphone] = useState(false);
  const [esportazione, setEsportazione] = useState<TipoEsportazione | null>(null);
  const [anteprima, setAnteprima] = useState<{
    tipo: TipoEsportazione;
    nome: string;
    url: string;
    blob: Blob;
  } | null>(null);

  const guidato = useMediaQuery(SOGLIA_GUIDATA);
  const [passo, setPasso] = useState(0);

  /** Scarica il file in anteprima: è l'unico punto che salva davvero. */
  function salvaAnteprima() {
    if (anteprima) scaricaBlob(anteprima.blob, anteprima.nome);
  }

  function chiudiAnteprima() {
    if (anteprima) {
      URL.revokeObjectURL(anteprima.url);
    }
    setAnteprima(null);
  }
  const [messaggio, setMessaggio] = useState<MessaggioEsportazione | null>(null);

  const farinaKg = leggi(farina, 1);
  const gradi = leggi(temperatura, 21);
  const gradiFrigo = leggi(temperaturaFrigo, 4);
  // L'attesa è la distanza fra i due istanti: se la fine è il giorno dopo, i
  // giorni contano. Una fine prima dell'inizio è un errore, non un'attesa.
  const attesa = oreTraDate(inizio, fine);
  const ore = attesa ?? 0;

  const { risultato, config, piano } = useMemo(
    () =>
      calcolaBigaSola({
        farinaKg,
        temperatura: gradi,
        temperaturaFrigo: gradiFrigo,
        ore,
        lievito,
      }),
    [farinaKg, gradi, gradiFrigo, ore, lievito],
  );

  async function esporta(tipo: TipoEsportazione, ottimizza: boolean) {
    setEsportazione(tipo);
    setMessaggio(null);

    try {
      const adesso = new Date();
      const nomeFile = creaNomeFile(risultato, config, adesso, tipo);

      // Anteprima come nel resto del sito: non si scarica da solo, e il foglio
      // è lo stesso del resto del sito.
      await document.fonts.ready;
      const dati = datiFoglioRicetta(risultato, config, adesso, 'PREFERMENTO');
      let blob: Blob;
      if (tipo === 'pdf') {
        // Il motore dei PDF arriva solo quando serve: all'apertura del sito
        // non pesa sul telefono.
        const { pdfBlob } = await import('../../export/pdf');
        blob = pdfBlob(dati, ottimizza);
      } else {
        blob = await jpgBlob(dati, SCALA_JPG, ottimizza);
      }

      if (anteprimaNellApp()) {
        apriNellApp(blob, nomeFile);
        return;
      }

      if (anteprima) {
        URL.revokeObjectURL(anteprima.url);
      }
      setAnteprima({
        tipo,
        nome: nomeFile,
        blob,
        url: URL.createObjectURL(blob),
      });
    } catch (errore) {
      console.error('Errore durante l’esportazione della biga', errore);
      setMessaggio({
        tipo: 'errore',
        testo: 'Non è stato possibile creare il file. Riprova.',
      });
    } finally {
      setEsportazione(null);
    }
  }

  /** Cambio di passo: il riquadro nuovo si legge dall'inizio. */
  function vaiAlPasso(indice: number) {
    setPasso(Math.min(PASSI.length - 1, Math.max(0, indice)));
    requestAnimationFrame(() => {
      document
        .getElementById('passi-biga')
        ?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  }

  const moduloDosi = (
    <section className="min-w-0">
      {/* Il titolo è già quello della fisarmonica: qui resta solo la guida. */}
      <p className="text-xs leading-relaxed text-inchiostro-tenue">
        Dimmi quanta farina hai: il motore decide l’idratazione e quanto tempo
        sta in ambiente e quanto in frigorifero.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <CampoNumero
          id="biga-farina"
          label="Farina"
          unit="kg"
          value={farina}
          onChange={setFarina}
          inputMode="decimal"
          incremento={0.5}
          minimo={LIMITI.farinaKg.min}
          massimo={LIMITI.farinaKg.max}
          decimali={2}
        />
        <CampoNumero
          id="biga-temperatura"
          label="Temperatura ambiente"
          unit="°C"
          value={temperatura}
          onChange={setTemperatura}
          inputMode="decimal"
          incremento={1}
          minimo={LIMITI.temperatura.min}
          massimo={LIMITI.temperatura.max}
          decimali={1}
        />
        <CampoNumero
          id="biga-frigo"
          label="Frigorifero"
          unit="°C"
          value={temperaturaFrigo}
          onChange={setTemperaturaFrigo}
          inputMode="decimal"
          incremento={1}
          minimo={LIMITI.frigo.min}
          massimo={LIMITI.frigo.max}
          decimali={0}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-inchiostro-tenue">
          Lievito
        </span>
        {(
          [
            ['fresco', 'Fresco'],
            ['secco', 'Secco'],
          ] as const
        ).map(([valore, etichetta]) => (
          <button
            key={valore}
            type="button"
            aria-pressed={lievito === valore}
            onClick={() => setLievito(valore)}
            className={`min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors ${
              lievito === valore
                ? 'border-terracotta/60 bg-terracotta-tenue text-oro-chiaro'
                : 'border-bordo bg-crema-scuro text-inchiostro-tenue hover:border-terracotta/40'
            }`}
          >
            {etichetta}
          </button>
        ))}
      </div>
    </section>
  );

  const moduloTempi = (
    <section className="min-w-0">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-semibold text-inchiostro-tenue">
            Preparo la biga il
          </span>
          <input
            type="datetime-local"
            value={inizio}
            onChange={(evento) => setInizio(evento.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-bordo bg-carta px-3 text-sm font-semibold text-inchiostro tabular-nums"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-inchiostro-tenue">
            Biga pronta il
          </span>
          <input
            type="datetime-local"
            value={fine}
            onChange={(evento) => setFine(evento.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-bordo bg-carta px-3 text-sm font-semibold text-inchiostro tabular-nums"
          />
        </label>
      </div>

      {attesa === null ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-errore/40 bg-errore/10 px-2.5 py-2 text-xs leading-relaxed font-semibold text-errore"
        >
          La biga non può essere pronta prima di essere preparata: sposta avanti
          l’ora di fine.
        </p>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-inchiostro-tenue">
          Attesa: <strong className="text-inchiostro">{testoAttesa(ore)}</strong>{' '}
          dall’impasto alla biga pronta.
        </p>
      )}

      <div className="mt-4 rounded-xl border border-bordo bg-crema-scuro/60 px-2.5 py-2.5">
        <p className="text-xs leading-relaxed text-inchiostro">
          Biga al <strong>{piano.idratazione}%</strong> di idratazione: matura{' '}
          <strong>{testoMaturazione(piano)}</strong>.
        </p>
        {piano.consiglio ? (
          <p className="mt-2 rounded-lg border border-terracotta/40 bg-terracotta/10 px-2.5 py-2 text-xs leading-relaxed text-inchiostro">
            {piano.consiglio}
          </p>
        ) : null}
        <AvvisoIdratazione
          ricettaId="biga"
          idratazione={piano.idratazione}
          className="mt-2"
        />
      </div>
    </section>
  );

  const esitoBiga = (
    <PannelloRisultato
      risultato={risultato}
      titolo="Dosi e resa"
      ricetta={config}
      daAggiornare={false}
      esportazione={esportazione}
      messaggio={messaggio}
      ottimizzaSmartphone={smartphone}
      onCambiaOttimizzaSmartphone={setSmartphone}
      onEsporta={esporta}
      anteprima={anteprima}
      onSalvaAnteprima={salvaAnteprima}
      onChiudiAnteprima={chiudiAnteprima}
    />
  );

  return (
    <div id="passi-biga" className="grid min-w-0 gap-4 scroll-mt-24">
      {guidato ? (
        <>
          {passo === 0 ? moduloDosi : null}
          {passo === 1 ? moduloTempi : null}
          {passo === 2 ? esitoBiga : null}
          <NavigazionePassi
            passi={PASSI}
            attivo={passo}
            onIndietro={passo === 0 ? undefined : () => vaiAlPasso(passo - 1)}
            onAvanti={
              passo === PASSI.length - 1 ? undefined : () => vaiAlPasso(passo + 1)
            }
            etichettaAvanti={passo === 1 ? 'Risultato' : 'Avanti'}
          />
        </>
      ) : (
        <>
          {moduloDosi}
          {moduloTempi}
          {esitoBiga}
        </>
      )}
    </div>
  );
}
