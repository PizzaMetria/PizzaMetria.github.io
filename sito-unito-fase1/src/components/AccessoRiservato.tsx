import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Marchio } from './Marchio';

/**
 * Schermata di accesso per il sito di prova.
 *
 * L'impronta della password non sta nel JavaScript: si legge da `accesso.json`
 * accanto alla pagina, quindi si può cambiare la password riscrivendo quel solo
 * file. Il confronto avviene nel browser con SHA-256.
 *
 * Se il file manca (o è vuoto) il sito si apre normalmente: è il caso della
 * pubblicazione su GitHub Pages. Serve a contingentare gli accessi, non è una
 * protezione: chi scarica il sito può aggirarla.
 */

const CHIAVE = 'pizzametria-accesso';

/**
 * Il blocco esiste soltanto nella build di prova (`npm run build:prova`).
 * Nella build pubblicata per GitHub il componente non fa nulla: nessuna
 * richiesta di `accesso.json`, quindi nessun rischio di restare bloccati su
 * «Accesso non verificabile» quando il telefono è senza rete.
 */
const IN_PROVA = import.meta.env.MODE === 'prova';

type Stato = 'verifica' | 'bloccato' | 'aperto' | 'errore';

/** Impronta SHA-256 in esadecimale. */
async function impronta(testo: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const dati = new TextEncoder().encode(testo);
  const risultato = await crypto.subtle.digest('SHA-256', dati);
  return Array.from(new Uint8Array(risultato))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Legge l'impronta attesa.
 *
 * Stringa vuota significa sito aperto: è il caso di chi vuole togliere la
 * password lasciando `"impronta": ""` nel file. Un file che non risponde,
 * che non si legge o che non ha la forma attesa è invece un errore: in quel
 * caso meglio non aprire a scatola chiusa, e mostrare «Riprova».
 */
async function improntaAttesa(): Promise<string> {
  const risposta = await fetch('./accesso.json', { cache: 'no-store' });
  if (!risposta.ok) throw new Error(`accesso.json ha risposto ${risposta.status}`);
  const dati: unknown = await risposta.json();
  const grezza = (dati as { impronta?: unknown } | null)?.impronta;
  if (typeof grezza !== 'string') throw new Error('accesso.json senza campo impronta');
  if (grezza.trim() === '') return '';
  const decodificata = atob(grezza.trim()).replace(/^pm1:/, '');
  if (!/^[0-9a-f]{64}$/.test(decodificata)) throw new Error('impronta non valida');
  return decodificata;
}

/** Marchio, nome e sottotitolo: gli stessi della testata del sito. */
function Intestazione() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-carta shadow-[0_8px_18px_-10px_rgba(138,109,78,0.55)] ring-1 ring-bordo/70 sm:h-16 sm:w-16">
        <Marchio className="h-10 w-10 sm:h-11 sm:w-11" />
      </span>
      <span className="min-w-0">
        <h1 className="block truncate font-serif text-lg leading-none font-extrabold tracking-tight text-inchiostro sm:text-2xl">
          PizzaMetria
        </h1>
        <span className="mt-1 block truncate text-[10px] font-semibold tracking-[0.18em] text-oro-chiaro uppercase sm:text-xs">
          Il calcolatore di impasti
        </span>
      </span>
    </div>
  );
}

export function AccessoRiservato({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<Stato>(IN_PROVA ? 'verifica' : 'aperto');
  const [attesa, setAttesa] = useState('');
  const [password, setPassword] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const [controllo, setControllo] = useState(false);
  const [tentativo, setTentativo] = useState(0);

  useEffect(() => {
    if (!IN_PROVA) return;
    let attivo = true;
    setStato('verifica');
    improntaAttesa()
      .then((impronta) => {
        if (!attivo) return;
        if (!impronta) {
          setStato('aperto');
          return;
        }
        setAttesa(impronta);
        let ricordo = '';
        try {
          ricordo = sessionStorage.getItem(CHIAVE) ?? '';
        } catch {
          // Senza memoria si richiede la password a ogni visita.
        }
        setStato(ricordo === impronta ? 'aperto' : 'bloccato');
      })
      .catch(() => {
        // Nessuna risposta dal file: meglio non aprire a scatola chiusa.
        if (attivo) setStato('errore');
      });
    return () => {
      attivo = false;
    };
  }, [tentativo]);

  if (stato === 'aperto') return <>{children}</>;

  async function invia(evento: FormEvent) {
    evento.preventDefault();
    setControllo(true);
    setMessaggio('');
    const calcolata = await impronta(password);
    if (calcolata === null) {
      setMessaggio('Questo browser non permette il controllo: apri il sito in HTTPS.');
      setControllo(false);
      return;
    }
    if (calcolata === attesa) {
      try {
        sessionStorage.setItem(CHIAVE, attesa);
      } catch {
        // Vale per questa pagina: dopo il F5 si rientra con la password.
      }
      setStato('aperto');
      return;
    }
    setMessaggio('Password non corretta.');
    setControllo(false);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-crema px-4 py-10">
      {stato === 'verifica' ? (
        <p role="status" className="text-sm text-inchiostro-tenue">
          Apertura del sito…
        </p>
      ) : null}

      {stato === 'errore' ? (
        <div className="w-full max-w-sm rounded-2xl border border-bordo bg-carta p-6 text-center shadow-[var(--alone-2)]">
          <Intestazione />
          <h2 className="mt-6 font-serif text-xl font-extrabold text-inchiostro">
            Accesso non verificabile
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-inchiostro-tenue">
            Non riesco a leggere il file di accesso. Controlla la connessione e riprova.
          </p>
          <button
            type="button"
            onClick={() => setTentativo((valore) => valore + 1)}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-terracotta px-6 text-xs font-bold tracking-wider text-su-oro uppercase"
          >
            Riprova
          </button>
        </div>
      ) : null}

      {stato === 'bloccato' ? (
        <form
          onSubmit={invia}
          className="w-full max-w-sm rounded-2xl border border-bordo bg-carta p-6 shadow-[var(--alone-2)]"
        >
          <Intestazione />
          <p className="mt-6 text-sm leading-relaxed text-inchiostro-tenue">
            Inserisci la password per aprire il calcolatore.
          </p>

          <label
            htmlFor="password-accesso"
            className="mt-5 block text-[11px] font-semibold tracking-wide text-inchiostro uppercase"
          >
            Password
          </label>
          <input
            id="password-accesso"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(evento) => setPassword(evento.target.value)}
            className="mt-1.5 w-full rounded-xl border border-bordo bg-crema px-3.5 py-2.5 text-base text-inchiostro outline-none focus:border-terracotta/70"
          />

          {messaggio ? (
            <p role="alert" className="mt-2 text-xs leading-relaxed text-errore">
              {messaggio}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={controllo || password.length === 0}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-terracotta px-6 text-xs font-bold tracking-wider text-su-oro uppercase shadow-lg shadow-ombra/30 transition-all hover:-translate-y-px hover:bg-terracotta-scuro active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none"
          >
            {controllo ? 'Controllo…' : 'Entra'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
