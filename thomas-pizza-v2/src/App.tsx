import { useEffect, useRef, useState } from 'react';
import type {
  ChiaveErrore,
  ErroriCampi,
  ModalitaCalcolo,
  OpzioniRicetta,
  RisultatoCalcolo,
  StatoSalvato,
  TipoEsportazione,
  ValoriGrezzi,
} from './types';
import {
  RICETTE,
  RICETTA_PREDEFINITA,
  trovaRicetta,
} from './config/ricette';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerTeglie,
} from './lib/calcolo';
import {
  validaModalitaFarina,
  validaModalitaPanetti,
  validaModalitaTeglie,
  validaStimaTeglia,
} from './lib/validazione';
import { creaVistaRicetta } from './lib/vista';
import { formattaGrammi } from './lib/formato';
import {
  aggiornaValoriValidi,
  caricaStato,
  salvaStato,
} from './lib/persistenza';
import { creaNomeFile } from './lib/nomeFile';
import { SelettoreRicetta } from './components/SelettoreRicetta';
import { SchedaRicetta } from './components/SchedaRicetta';
import {
  FormCalcolo,
  type GruppoValori,
} from './components/FormCalcolo';
import { StatoVuoto } from './components/StatoVuoto';
import {
  PannelloRisultato,
  type MessaggioEsportazione,
} from './components/PannelloRisultato';
import { esportaRicettaJpg } from './export/jpg';
import { esportaRicettaPdf } from './export/pdf';

const ERRORE_CALCOLO =
  'Non è stato possibile calcolare l’impasto con questi valori. Controlla i dati e riprova.';

const VANTAGGI_HERO = [
  'Dosi per fase, in grammi',
  'Lievito fresco o secco',
  'JPG e PDF pronti da salvare',
];

function etichettaModalita(modalita: ModalitaCalcolo): string {
  return modalita === 'panetti'
    ? 'per panetti'
    : modalita === 'teglie'
      ? 'per teglie'
      : 'per farina';
}

export default function App() {
  const [stato, setStato] = useState<StatoSalvato>(caricaStato);
  const ricetta = trovaRicetta(stato.ricettaId);
  const corrente = stato.ricette[ricetta.id] ?? stato.ricette[RICETTA_PREDEFINITA.id];
  const { modalita, opzioni, valori } = corrente;

  const [errori, setErrori] = useState<ErroriCampi>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [risultato, setRisultato] = useState<RisultatoCalcolo | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);
  const [esportazione, setEsportazione] = useState<TipoEsportazione | null>(null);
  const [messaggioEsportazione, setMessaggioEsportazione] =
    useState<MessaggioEsportazione | null>(null);
  const [annuncioCalcolo, setAnnuncioCalcolo] = useState('');
  const inEsportazioneRef = useRef(false);

  useEffect(() => {
    salvaStato(stato);
  }, [stato]);

  function aggiornaCorrente(
    trasforma: (precedente: (typeof stato.ricette)[string]) => (typeof stato.ricette)[string],
  ) {
    setStato((precedenteStato) => {
      const precedente = precedenteStato.ricette[ricetta.id];
      return {
        ...precedenteStato,
        ricette: {
          ...precedenteStato.ricette,
          [ricetta.id]: trasforma(precedente),
        },
      };
    });
  }

  function invalidaRisultato() {
    setRisultato(null);
    setDaAggiornare(false);
    setErrori({});
    setErroreGenerale(null);
    setMessaggioEsportazione(null);
  }

  function cambiaRicetta(ricettaId: string) {
    if (ricettaId === ricetta.id) return;
    const nuova = trovaRicetta(ricettaId);
    setStato((precedente) => ({ ...precedente, ricettaId }));
    invalidaRisultato();
    setAnnuncioCalcolo(`Ricetta selezionata: ${nuova.nome}.`);
  }

  function cambiaModalita(nuova: ModalitaCalcolo) {
    if (nuova === modalita) return;

    aggiornaCorrente((precedente) => ({ ...precedente, modalita: nuova }));
    invalidaRisultato();
    setAnnuncioCalcolo(`Metodo di calcolo: ${etichettaModalita(nuova)}.`);
  }

  function cambiaOpzione<K extends keyof OpzioniRicetta>(
    campo: K,
    valore: OpzioniRicetta[K],
  ) {
    if (opzioni[campo] === valore) return;

    aggiornaCorrente((precedente) => ({
      ...precedente,
      opzioni: { ...precedente.opzioni, [campo]: valore },
    }));
    setErrori({});
    setErroreGenerale(null);
    setMessaggioEsportazione(null);
    if (risultato) setDaAggiornare(true);

    setAnnuncioCalcolo(
      campo === 'tipoLievito'
        ? `Lievito ${valore === 'secco' ? 'secco' : 'fresco'} selezionato.`
        : valore
          ? 'Autolisi attivata.'
          : 'Autolisi disattivata.',
    );
  }

  function cambiaCampo(
    gruppo: GruppoValori,
    campo: string,
    valore: string,
  ) {
    aggiornaCorrente((precedente) => {
      let prossimi: ValoriGrezzi;
      switch (gruppo) {
        case 'panetti':
          prossimi = {
            ...precedente.valori,
            panetti: {
              ...precedente.valori.panetti,
              [campo]: valore,
            } as ValoriGrezzi['panetti'],
          };
          break;
        case 'farina':
          prossimi = {
            ...precedente.valori,
            farina: {
              ...precedente.valori.farina,
              [campo]: valore,
            } as ValoriGrezzi['farina'],
          };
          break;
        case 'teglie':
          prossimi = {
            ...precedente.valori,
            teglie: {
              ...precedente.valori.teglie,
              [campo]: valore,
            } as ValoriGrezzi['teglie'],
          };
          break;
      }

      return {
        ...precedente,
        valori: prossimi,
        validi: aggiornaValoriValidi(precedente.validi, prossimi),
      };
    });

    setErrori((precedenti) => {
      if (!precedenti[campo as ChiaveErrore]) return precedenti;
      const successivi = { ...precedenti };
      delete successivi[campo as ChiaveErrore];
      return successivi;
    });
    setErroreGenerale(null);
    setMessaggioEsportazione(null);
    if (risultato) setDaAggiornare(true);
  }

  function calcola() {
    setMessaggioEsportazione(null);
    setErroreGenerale(null);

    let erroriCalcolo: ErroriCampi = {};

    try {
      let nuovo: RisultatoCalcolo;

      if (modalita === 'panetti') {
        const esito = validaModalitaPanetti(
          valori.panetti.numeroPanetti,
          valori.panetti.pesoPanetto,
        );
        erroriCalcolo = esito.errori;
        if (!esito.valori) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla i campi evidenziati.',
          );
          return;
        }

        nuovo = calcolaPerPanetti(
          ricetta,
          esito.valori.numeroPanetti,
          esito.valori.pesoPanetto,
          opzioni,
        );
      } else if (modalita === 'teglie') {
        const esito = validaModalitaTeglie(
          valori.teglie.latoA,
          valori.teglie.latoB,
          valori.teglie.numeroTeglie,
        );
        erroriCalcolo = esito.errori;
        if (!esito.valori) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla i campi evidenziati.',
          );
          return;
        }

        nuovo = calcolaPerTeglie(
          ricetta,
          esito.valori.latoA,
          esito.valori.latoB,
          esito.valori.numeroTeglie,
          opzioni,
        );
      } else {
        const esito = validaModalitaFarina(
          valori.farina.farinaKg,
          ricetta.famiglia === 'diretto' ? '' : valori.farina.pesoPanetto,
        );
        erroriCalcolo = esito.errori;

        let stimaTeglia: { latoA: number; latoB: number } | null = null;
        if (ricetta.famiglia === 'diretto') {
          const stima = validaStimaTeglia(
            valori.farina.latoA,
            valori.farina.latoB,
          );
          erroriCalcolo = { ...erroriCalcolo, ...stima.errori };
          stimaTeglia = stima.valori;
        }

        if (!esito.valori) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla i campi evidenziati.',
          );
          return;
        }

        if (
          ricetta.famiglia === 'diretto' &&
          (erroriCalcolo.latoA || erroriCalcolo.latoB)
        ) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla la stima delle teglie.',
          );
          return;
        }

        nuovo = calcolaPerFarina(
          ricetta,
          esito.valori.farinaKg,
          ricetta.famiglia === 'diretto'
            ? null
            : esito.valori.pesoPanettoG,
          opzioni,
          stimaTeglia,
        );
      }

      const vista = creaVistaRicetta(nuovo, ricetta);
      setRisultato(nuovo);
      setDaAggiornare(false);
      setErrori({});
      setAnnuncioCalcolo(
        `${vista.nomeRicetta}, ${vista.modalitaEtichetta.toLowerCase()}: ${vista.resa}. ${formattaGrammi(
          nuovo.pesoImpastoG,
        )} di impasto, ${formattaGrammi(nuovo.farinaTotaleG)} di farina.`,
      );

      window.setTimeout(() => {
        if (window.matchMedia('(max-width: 1023px)').matches) {
          document
            .getElementById('risultato-titolo')
            ?.scrollIntoView({ block: 'start', behavior: 'auto' });
        }
      }, 30);
    } catch (errore) {
      console.error('Errore di calcolo', errore);
      setErroreGenerale(ERRORE_CALCOLO);
      setAnnuncioCalcolo('Calcolo non eseguito per un errore nei dati.');
    }
  }

  function esporta(tipo: TipoEsportazione) {
    if (
      !risultato ||
      risultato.ricettaId !== ricetta.id ||
      daAggiornare ||
      inEsportazioneRef.current
    ) {
      return;
    }

    const adesso = new Date();
    const nomeFile = creaNomeFile(risultato, ricetta, adesso, tipo);

    inEsportazioneRef.current = true;
    setEsportazione(tipo);
    setMessaggioEsportazione(null);

    try {
      if (tipo === 'jpg') {
        esportaRicettaJpg(risultato, ricetta, nomeFile);
      } else {
        esportaRicettaPdf(risultato, ricetta, adesso, nomeFile);
      }

      setMessaggioEsportazione({
        tipo: 'successo',
        testo: `Ricetta salvata in ${tipo.toUpperCase()}: ${nomeFile}`,
      });
    } catch (errore) {
      console.error(`Errore durante l’esportazione ${tipo.toUpperCase()}`, errore);
      setMessaggioEsportazione({
        tipo: 'errore',
        testo: `Non è stato possibile generare il file ${tipo.toUpperCase()}. Riprova.`,
      });
    } finally {
      inEsportazioneRef.current = false;
      setEsportazione(null);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#calcolatore"
        className="sr-only rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-crema-scuro focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Vai al calcolatore
      </a>

      <header className="sticky top-0 z-40 border-b border-bordo/70 bg-crema-scuro/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="#calcolatore"
            className="group flex min-w-0 items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-linear-to-tr from-terracotta to-oro-chiaro p-[1.5px] shadow-lg shadow-black/40"
            >
              <span className="grid h-full w-full place-items-center rounded-full bg-crema-scuro">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-terracotta"
                >
                  <path
                    d="M12 3 3.6 19.4a1 1 0 0 0 1.3 1.3L21.3 12.4A9.5 9.5 0 0 0 12 3Z"
                    stroke="currentColor"
                    strokeWidth="1.0"
                    strokeLinejoin="round"
                  />
                  <circle cx="12.6" cy="9.4" r="1.05" fill="currentColor" />
                  <circle cx="10" cy="13.6" r="1.05" fill="currentColor" />
                  <circle cx="15.6" cy="13.2" r="1.05" fill="currentColor" />
                </svg>
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-serif text-base leading-none font-bold tracking-wide text-inchiostro sm:text-xl">
                THOMAS&apos; PIZZA
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.16em] text-terracotta uppercase sm:text-[10px] sm:tracking-[0.22em]">
                <span className="min-[380px]:hidden">Calcolatore</span>
                <span className="hidden min-[380px]:inline">
                  Calcolatore di impasti
                </span>
              </span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-bordo bg-carta/70 px-3 py-1.5 text-[11px] font-medium text-inchiostro-tenue sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-terracotta"
              />
              Calcolo locale
            </span>
            <a
              href="#calcolatore"
              className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-terracotta px-3 py-2 text-[11px] font-bold tracking-wider text-crema-scuro uppercase shadow-lg shadow-black/30 transition-all hover:-translate-y-px hover:bg-terracotta-scuro active:translate-y-0 sm:px-4"
            >
              <span className="sm:hidden">Calcola</span>
              <span className="hidden sm:inline">Calcola impasto</span>
            </a>
          </div>
        </div>
      </header>

      <section className="border-b border-bordo/50">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14">
          <p className="inline-flex items-center gap-2 rounded-full border border-bordo bg-carta/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-inchiostro-tenue">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-terracotta"
            />
            Precisione e tecnica artigianale
          </p>

          <h1 className="mt-5 font-serif text-[27px] leading-[1.12] font-bold text-balance text-inchiostro sm:text-5xl">
            La tua pizza,{' '}
            <span className="testo-oro whitespace-nowrap">grammo per grammo</span>.
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed font-light text-inchiostro-tenue sm:text-base">
            Biga, autolisi, idratazione e lievito sotto controllo. Dosi, tempi e
            temperature per pizza in teglia, Trancio Milanese e Canotto,
            calcolate nel tuo browser.
          </p>

          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {VANTAGGI_HERO.map((vantaggio) => (
              <li
                key={vantaggio}
                className="inline-flex items-center gap-2 rounded-lg border border-terracotta/20 bg-carta/70 px-3 py-1.5 text-[11px] font-medium text-inchiostro sm:text-xs"
              >
                <span aria-hidden="true" className="text-terracotta">
                  ✓
                </span>
                {vantaggio}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-12 sm:px-6 lg:pb-16">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start">
          <div className="grid min-w-0 gap-5">
            <SelettoreRicetta
              ricette={RICETTE}
              ricettaId={ricetta.id}
              onCambia={cambiaRicetta}
            />
            <SchedaRicetta ricetta={ricetta} />
            <FormCalcolo
              ricetta={ricetta}
              modalita={modalita}
              opzioni={opzioni}
              valori={valori}
              errori={errori}
              erroreGenerale={erroreGenerale}
              onCambiaModalita={cambiaModalita}
              onCambiaOpzione={cambiaOpzione}
              onCambiaCampo={cambiaCampo}
              onCalcola={calcola}
            />
          </div>

          <div className="min-w-0">
            {risultato && risultato.ricettaId === ricetta.id ? (
              <PannelloRisultato
                risultato={risultato}
                ricetta={ricetta}
                daAggiornare={daAggiornare}
                esportazione={esportazione}
                messaggio={messaggioEsportazione}
                onEsporta={esporta}
              />
            ) : (
              <StatoVuoto />
            )}
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">
          {annuncioCalcolo}
        </p>
      </main>

      <footer className="border-t border-bordo/60 bg-crema-scuro/60 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div>
            <p className="font-serif text-sm font-bold text-inchiostro">
              Thomas&apos; Pizza — Calcolatore di impasti
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-inchiostro-tenue">
              I calcoli e le esportazioni avvengono nel browser. Le quantità sono
              in grammi.
            </p>
          </div>
          <p className="text-[11px] text-inchiostro-tenue">
            © {new Date().getFullYear()} Thomas&apos; Pizza
          </p>
        </div>
      </footer>
    </div>
  );
}
