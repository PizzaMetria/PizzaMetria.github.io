import { useState } from 'react';
import App from './App';
import { Testata } from './components/Testata';
import { SelettoreDiretti } from './components/SelettoreDiretti';
import { VecchioSito } from './components/VecchioSito';
import { ElencoRicette } from './components/ElencoRicette';
import { CalcolatoreBiga } from './vecchio/components/CalcolatoreBiga';
import { IconaGruppo } from './components/IconaGruppo';
import { IMPASTI } from './config/impasti';
import { RICETTE } from './vecchio/config/ricette';
import { sottotitoloRicetta } from './vecchio/lib/vista';
import type { TipoImpasto } from './types';

/** Le tre voci del sito unico: i due gruppi di ricette e la sola biga. */
export type Gruppo = 'nuovo' | 'vecchio' | 'biga';

const GRUPPI: readonly {
  id: Gruppo;
  titolo: string;
  nota: string;
}[] = [
  {
    id: 'nuovo',
    titolo: 'Calcola la tua Pizza',
    nota: 'Scegli tra Verace, Contemporanea o in Teglia e calcola il tuo impasto diretto.',
  },
  {
    id: 'vecchio',
    titolo: 'Le mie ricette',
    nota: 'Tra diretti e indiretti: qui trovi le mie ricette preferite, già perfettamente bilanciate. Ti consiglio di usarle chiare e pronte così come sono.',
  },
  {
    id: 'biga',
    titolo: 'Calcola il prefermento',
    nota: 'Dai una spinta in più al tuo impasto con la gestione su misura dei prefermenti.',
  },
];

/** Il tab della sola biga: una voce sola, che apre il calcolatore. */
const VOCI_BIGA = [
  {
    id: 'biga' as const,
    nome: 'Biga',
    tipo: 'Prefermento',
    sottotitolo:
      'Modifica tempo e temperatura per ottenere sempre un prefermento perfetto.',
  },
];

/**
 * Titolo e nota della voce: con una ricetta aperta al posto della categoria si
 * legge il nome della ricetta con la sua descrizione. Vale per tutte le ricette
 * dei due gruppi e per la biga: la regola è una sola, scritta qui.
 */
export function testaDellaVoce(
  id: Gruppo,
  titolo: string,
  nota: string,
  stato: {
    diretta: TipoImpasto | null;
    bigaScelta: boolean;
    vecchia: string | null;
  },
): { titolo: string; nota: string } {
  if (id === 'nuovo' && stato.diretta !== null) {
    const impasto = IMPASTI.find((voce) => voce.id === stato.diretta);
    if (impasto) return { titolo: impasto.nome, nota: impasto.sottotitolo };
  }
  if (id === 'biga' && stato.bigaScelta) {
    return { titolo: VOCI_BIGA[0].nome, nota: VOCI_BIGA[0].sottotitolo };
  }
  if (id === 'vecchio' && stato.vecchia !== null) {
    const ricetta = RICETTE.find((voce) => voce.id === stato.vecchia);
    if (ricetta) {
      return { titolo: ricetta.nome, nota: sottotitoloRicetta(ricetta) };
    }
  }
  return { titolo, nota };
}

/**
 * Le voci da mostrare: con una ricetta aperta resta soltanto la sua, quindi
 * sul fondo della pagina non compaiono più le altre categorie. Chiusa la
 * ricetta tornano tutte e tre, nell'ordine di sempre.
 */
export function gruppiVisibili(aperto: Gruppo | null, inRicetta: boolean) {
  if (!inRicetta) return GRUPPI;
  return GRUPPI.filter((voce) => voce.id === aperto);
}

/**
 * Il sito unico: una pagina sola, nessun cambio di indirizzo. Le tre voci sono
 * un menu a fisarmonica: ognuna è un titolo con la sua riga di spiegazione, e
 * toccandola si apre subito sotto il suo contenuto. Una sola aperta per volta.
 */
export function PaginaUnica() {
  // All'apertura le tre voci sono tutte chiuse: l'utente sceglie da dove partire.
  const [aperto, setAperto] = useState<Gruppo | null>(null);
  // Nel nuovo sito la scelta della diretta si fa qui, non più nel calcolatore.
  const [diretta, setDiretta] = useState<TipoImpasto | null>(null);
  // Cambiando questa chiave il contenuto si rimonta: dosi, passi e ricette
  // tornano da capo, come al primo accesso.
  const [riavvio, setRiavvio] = useState(0);
  // Anche la biga, come le pizze, parte dal suo tab che la introduce.
  const [bigaScelta, setBigaScelta] = useState(false);
  // «Le mie ricette» sceglie al suo interno: qui basta sapere se una ricetta è
  // aperta, per mostrare il tasto che riporta all'elenco.
  const [vecchia, setVecchia] = useState<string | null>(null);
  // Cambiando la chiave il vecchio sito si rimonta e torna all'elenco.
  const [chiaveVecchio, setChiaveVecchio] = useState(0);

  /** Marchio in testa: si torna alla home e si ricomincia da zero. */
  function tornaAllaHome() {
    // Come al primo caricamento: le tre voci tornano chiuse.
    setAperto(null);
    setDiretta(null);
    setBigaScelta(false);
    setVecchia(null);
    setChiaveVecchio((valore) => valore + 1);
    setRiavvio((valore) => valore + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** Un tocco sulla voce aperta la richiude; su un'altra la apre e chiude quella. */
  function scegli(prossimo: Gruppo) {
    if (aperto === prossimo) {
      setAperto(null);
      return;
    }
    setAperto(prossimo);
    setDiretta(null);
    setBigaScelta(false);
    setVecchia(null);
    // Il vecchio sito ricorda la ricetta al suo interno: senza questa chiave,
    // riaprendo la voce si ritroverebbe la ricetta di prima aperta, con la
    // testata che dice ancora «Le mie ricette».
    setChiaveVecchio((valore) => valore + 1);
  }

  function contenuto(id: Gruppo) {
    if (id === 'nuovo') {
      return diretta === null ? (
        <SelettoreDiretti scelto={diretta} onScegli={(scelta) => setDiretta(scelta)} />
      ) : (
        <div className="passo-entra">
          <App key={diretta} tipoIniziale={diretta} senzaTestata />
        </div>
      );
    }
    if (id === 'biga') {
      return bigaScelta ? (
        <div className="passo-entra">
          <CalcolatoreBiga />
        </div>
      ) : (
        <ElencoRicette
          idIntestazione="biga-selettore-titolo"
          nomeGruppo="ricetta-biga"
          voci={VOCI_BIGA}
          scelta={null}
          onScegli={() => setBigaScelta(true)}
        />
      );
    }
    return (
      <VecchioSito
        key={chiaveVecchio}
        onScelta={setVecchia}
      />
    );
  }

  /** Titolo e nota della voce, con la ricetta aperta al posto della categoria. */
  function intestazione(id: Gruppo, titolo: string, nota: string) {
    return testaDellaVoce(id, titolo, nota, { diretta, bigaScelta, vecchia });
  }

  /** Vero quando è aperta una ricetta: sotto la testata compare il tasto indietro. */
  const inRicetta =
    (aperto === 'nuovo' && diretta !== null) ||
    (aperto === 'biga' && bigaScelta) ||
    (aperto === 'vecchio' && vecchia !== null);

  /**
   * Tasto indietro: chiude la ricetta e riapre l'elenco della stessa voce.
   * Chiudendo la ricetta tornano anche le altre due voci, che con la ricetta
   * aperta erano sparite dal fondo.
   */
  function tornaAlleRicette() {
    setDiretta(null);
    setBigaScelta(false);
    setVecchia(null);
    setChiaveVecchio((valore) => valore + 1);
    document
      .getElementById('elenco-ricette')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Testata onHome={tornaAllaHome} />

      <header className="relative overflow-hidden border-b border-bordo/60">
        <div
          aria-hidden="true"
          className="filigrana-oro pointer-events-none absolute inset-0 opacity-60"
        />
        <div className="relative mx-auto w-full max-w-3xl px-4 pt-8 pb-7 text-center sm:px-6 sm:pt-12 sm:pb-10">
          <h1 className="font-serif text-[1.65rem] leading-[1.08] font-extrabold tracking-tight text-balance text-inchiostro sm:text-[2.6rem] lg:text-5xl">
            La tua pizza,{' '}
            <span className="testo-oro whitespace-nowrap">grammo per grammo</span>.
          </h1>
          <p className="mx-auto mt-3.5 max-w-xl text-[0.85rem] leading-relaxed text-inchiostro-tenue sm:text-base">
            Dal calcolo al forno: dosi, tempi e procedimento passo dopo passo.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-1.5 pt-5 pb-14 sm:px-6 sm:pt-7 lg:max-w-4xl lg:pb-16">
        {inRicetta ? (
          <div className="mb-3 sm:mb-4">
            <button
              type="button"
              onClick={tornaAlleRicette}
              className="inline-flex items-center gap-2 rounded-full border border-bordo bg-carta/80 px-4 py-2 text-xs font-semibold text-inchiostro shadow-[var(--alone-2)] transition-colors hover:border-terracotta/60 hover:text-oro-chiaro"
            >
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3 w-3 shrink-0"
              >
                <path d="M8 2L4 6l4 4" />
              </svg>
              Torna a tutte le ricette
            </button>
          </div>
        ) : null}

        <div
          key={riavvio}
          id="elenco-ricette"
          className="overflow-hidden rounded-2xl border border-bordo bg-carta/80 shadow-[var(--alone-2)] scroll-mt-20"
        >
          {gruppiVisibili(aperto, inRicetta).map((voce, indice) => {
            const aperta = voce.id === aperto;
            const testa = intestazione(voce.id, voce.titolo, voce.nota);
            // Ricetta aperta: l'intestazione non si tocca, si torna all'elenco
            // soltanto con il tasto in alto.
            const bloccata = aperta && inRicetta;
            const testaVoce = (
              <>
                {/* L'icona della voce sta a sinistra, appena dentro il bordo, e
                    non cambia con l'apertura: fondo chiaro e glifo terracotta
                    sempre, così resta leggibile in tutte e tre le voci. Il
                    riquadro si centra in altezza sulla voce, mentre il testo
                    e la freccia restano allineati in alto. */}
                <span className="grid h-[52px] w-[52px] shrink-0 self-center place-items-center rounded-xl border border-bordo/60 bg-carta text-terracotta">
                  <IconaGruppo id={voce.id} />
                </span>
                <span className="min-w-0 flex-1">
                  {/* Playfair su tutte le larghezze, come le intestazioni del sito. */}
                  <span className="block font-serif text-[1.2rem] leading-snug font-extrabold text-inchiostro sm:text-xl lg:text-[1.35rem]">
                    {testa.titolo}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed font-normal text-inchiostro-tenue">
                    {testa.nota}
                  </span>
                </span>
              </>
            );
            return (
              <section
                key={voce.id}
                className={indice === 0 ? '' : 'border-t border-bordo/70'}
              >
                <h2>
                  {bloccata ? (
                    <div className="flex w-full items-start gap-2.5 bg-terracotta-tenue/70 px-2.5 py-4 text-left sm:px-3">
                      {testaVoce}
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-expanded={aperta}
                      aria-controls={`gruppo-${voce.id}`}
                      onClick={() => scegli(voce.id)}
                      className={`flex w-full items-start gap-2.5 px-2.5 py-4 text-left transition-colors sm:px-3 ${
                        aperta
                          ? 'bg-terracotta-tenue/70'
                          : 'hover:bg-crema-scuro'
                      }`}
                    >
                      {testaVoce}
                      <svg
                        aria-hidden="true"
                        focusable="false"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`mt-2 h-3.5 w-3.5 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${
                          aperta
                            ? 'rotate-90 text-oro-chiaro'
                            : 'text-inchiostro-tenue'
                        }`}
                      >
                        <path d="M4 2l4 4-4 4" />
                      </svg>
                    </button>
                  )}
                </h2>

                {aperta ? (
                  <div
                    id={`gruppo-${voce.id}`}
                    className="passo-entra px-1 py-3 sm:px-4 sm:py-4"
                  >
                    {contenuto(voce.id)}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
