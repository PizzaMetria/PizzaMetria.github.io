import { useEffect, useRef, useState } from 'react';
import type {
  ChiaveErrore,
  ErroriCampi,
  ModalitaCalcolo,
  OpzioniRicetta,
  ParametriRicetta,
  RisultatoCalcolo,
  StatoSalvato,
  TipoEsportazione,
  TipoLievito,
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
  calcolaPerProdotti,
  calcolaPerTeglie,
  pesoDaDimensione,
} from './lib/calcolo';
import {
  campiParametri,
  configPersonalizzata,
  convertiLievito,
  limitaParametro,
  parametriIniziali,
  ricettaPersonalizzata,
  type ChiaveParametro,
} from './config/personalizzazione';
import {
  leggiNumeroDecimale,
  validaModalitaFarina,
  validaModalitaPanetti,
  validaModalitaProdotti,
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
import { useMediaQuery } from './lib/useMediaQuery';
import { SelettoreRicetta } from './components/SelettoreRicetta';
import { SchedaRicetta } from './components/SchedaRicetta';
import {
  FormCalcolo,
  type GruppoValori,
} from './components/FormCalcolo';
import { MenuLaterale } from './components/MenuLaterale';
import { NavigazionePassi } from '../components/Passi';
import {
  PannelloRisultato,
  type MessaggioEsportazione,
} from './components/PannelloRisultato';
import { SCALA_JPG, jpgBlob } from '../export/foglio';
import { datiFoglioRicetta } from './export/foglio-ricetta';
import {
  anteprimaNellApp,
  apriNellApp,
} from '../lib/anteprima';
import { scaricaBlob } from './lib/download';
import { Marchio } from './components/Marchio';

const ERRORE_CALCOLO =
  'Non è stato possibile calcolare l’impasto con questi valori. Controlla i dati e riprova.';

/**
 * Modalità app (build con VITE_APP=1). Il percorso guidato a quattro passaggi
 * vale sempre nell'app e, sul sito, sotto i 768 px: su desktop le schede
 * restano affiancate in una pagina unica.
 */
const SOLO_APP = import.meta.env.VITE_APP === '1';
// Stessa soglia del calcolatore nuovo: sotto questa larghezza il percorso
// guidato è la regola, sopra resta la pagina unica desktop.
const SOGLIA_GUIDATA = '(max-width: 1023px)';

/**
 * I passi del percorso guidato: gli stessi nomi del calcolatore nuovo, più il
 * passo della ricetta. Il modulo è spezzato in dosi e personalizzazione, così
 * sul telefono si compila una scheda per volta invece di un modulo lungo.
 */
const PAGINE_APP = [
  'Scegli la ricetta',
  'La ricetta',
  'Scegli le dosi',
  'Personalizza',
  'Il tuo impasto',
];

/** L'ultima pagina: il risultato con le esportazioni. */
const PAGINA_RISULTATO = PAGINE_APP.length;

function etichettaModalita(modalita: ModalitaCalcolo): string {
  return modalita === 'panetti'
    ? 'per panetti'
    : modalita === 'teglie'
      ? 'per teglie'
      : modalita === 'prodotti'
        ? 'per prodotti'
        : 'per farina';
}

export default function App({
  ricettaIniziale,
  senzaTestata = false,
  senzaSelettore = false,
}: {
  /** Ricetta già scelta nel tab qui sopra: si apre direttamente questa. */
  ricettaIniziale?: string;
  /** Nella pagina unica la testata è una sola: questa si spegne. */
  senzaTestata?: boolean;
  /** La scelta della ricetta è già stata fatta sopra: niente secondo selettore. */
  senzaSelettore?: boolean;
} = {}) {
  const [stato, setStato] = useState<StatoSalvato>(() => {
    const base = caricaStato();
    return ricettaIniziale ? { ...base, ricettaId: ricettaIniziale } : base;
  });
  const ricetta = trovaRicetta(stato.ricettaId);
  const corrente = stato.ricette[ricetta.id] ?? stato.ricette[RICETTA_PREDEFINITA.id];
  const { modalita, opzioni, valori, parametri } = corrente;
  const personalizzata =
    ricetta.senzaPersonalizzazione === true
      ? false
      : ricettaPersonalizzata(ricetta, parametri, opzioni);

  const [errori, setErrori] = useState<ErroriCampi>({});
  const [erroreGenerale, setErroreGenerale] = useState<string | null>(null);
  const [risultato, setRisultato] = useState<RisultatoCalcolo | null>(null);
  const [daAggiornare, setDaAggiornare] = useState(false);
  const [esportazione, setEsportazione] = useState<TipoEsportazione | null>(null);
  const [anteprima, setAnteprima] = useState<{
    tipo: TipoEsportazione;
    nome: string;
    url: string;
    blob: Blob;
  } | null>(null);

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
  const [messaggioEsportazione, setMessaggioEsportazione] =
    useState<MessaggioEsportazione | null>(null);
  const [annuncioCalcolo, setAnnuncioCalcolo] = useState('');
  // Passo corrente del percorso guidato (app e sito mobile).
  const [paginaApp, setPaginaApp] = useState(senzaSelettore ? 2 : 1);
  const [menuAperto, setMenuAperto] = useState(false);
  const mobile = useMediaQuery(SOGLIA_GUIDATA);
  // Il percorso guidato vale sempre sul telefono e nell’app. Nella pagina unica
  // la ricetta è già scelta: si parte dalla scheda, e il selettore non c’è.
  const proceduraGuidata = SOLO_APP || mobile;
  const primaPagina = senzaSelettore ? 2 : 1;
  const passiGuidati = senzaSelettore ? PAGINE_APP.slice(1) : PAGINE_APP;
  const indiceGuidato = Math.max(0, paginaApp - primaPagina);
  const [ottimizzaSmartphone, setOttimizzaSmartphone] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches,
  );
  const inEsportazioneRef = useRef(false);

  useEffect(() => {
    salvaStato(stato);
  }, [stato]);

  // Senza un risultato la quarta pagina resterebbe vuota: si torna al calcolatore.
  useEffect(() => {
    if (!proceduraGuidata || paginaApp !== PAGINA_RISULTATO) return;
    const pronto = risultato !== null && risultato.ricettaId === ricetta.id;
    if (!pronto) setPaginaApp(PAGINA_RISULTATO - 1);
  }, [proceduraGuidata, paginaApp, risultato, ricetta.id]);

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

  /**
   * Cambio di passo: si va all'inizio del riquadro nuovo, non in cima alla
   * pagina, così il passo compare subito sotto la testata.
   */
  function vaiAPagina(nuova: number) {
    setPaginaApp(Math.min(PAGINE_APP.length, Math.max(1, nuova)));
    requestAnimationFrame(() => {
      const riquadro = document.getElementById('passi-calcolatore');
      if (riquadro) {
        riquadro.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }
      // «instant»: la CSS usa scroll-behavior smooth, che qui farebbe partire
      // un’animazione a ogni cambio pagina.
      window.scrollTo({ top: 0, behavior: 'instant' });
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
      // La dose del lievito segue il tipo scelto, con la conversione esistente.
      parametri:
        campo === 'tipoLievito'
          ? convertiLievito(
              ricetta,
              precedente.parametri,
              precedente.opzioni.tipoLievito,
              valore as TipoLievito,
            )
          : precedente.parametri,
    }));
    setErrori({});
    setErroreGenerale(null);
    setMessaggioEsportazione(null);
    if (risultato) setDaAggiornare(true);

    setAnnuncioCalcolo(
      campo === 'tipoLievito'
        ? `Lievito ${valore === 'secco' ? 'secco' : 'fresco'} selezionato.`
        : campo === 'biga'
          ? 'Maturazione della biga aggiornata.'
          : valore
            ? 'Autolisi attivata.'
            : 'Autolisi disattivata.',
    );
  }

  function cambiaParametro(chiave: ChiaveParametro, valore: number) {
    const campo = campiParametri(ricetta, opzioni).find(
      (voce) => voce.chiave === chiave,
    );
    if (!campo) return;

    const limitato = limitaParametro(campo, valore);
    if (limitato === parametri[chiave]) return;

    aggiornaCorrente((precedente) => ({
      ...precedente,
      parametri: { ...precedente.parametri, [chiave]: limitato },
    }));
    setErroreGenerale(null);
    setMessaggioEsportazione(null);
    if (risultato) setDaAggiornare(true);
  }

  function ripristinaParametri() {
    const iniziali: ParametriRicetta = parametriIniziali(ricetta, opzioni);
    aggiornaCorrente((precedente) => ({
      ...precedente,
      parametri: iniziali,
    }));
    setMessaggioEsportazione(null);
    if (risultato) setDaAggiornare(true);
    setAnnuncioCalcolo('Ricetta originale ripristinata.');
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
        case 'prodotti': {
          // campo arriva come «id:quantita», «id:peso» o «id:dimA»/«id:dimB».
          const [id, attributo] = campo.split(':');
          const riga = precedente.valori.prodotti[id] ?? {
            quantita: '0',
            peso: '',
          };
          const aggiornata = { ...riga, [attributo]: valore };

          // Cambiando diametro o stampo il peso del pezzo si ricalcola dalla
          // superficie; resta poi modificabile a mano.
          const dimensione = ricetta.prodotti?.find(
            (voce) => voce.id === id,
          )?.dimensione;
          if (dimensione && (attributo === 'dimA' || attributo === 'dimB')) {
            const a =
              leggiNumeroDecimale(aggiornata.dimA ?? '') ?? dimensione.baseA;
            const b =
              dimensione.tipo === 'stampo'
                ? (leggiNumeroDecimale(aggiornata.dimB ?? '') ??
                  (dimensione.baseB ?? 1))
                : undefined;
            aggiornata.peso = String(pesoDaDimensione(dimensione, a, b));
          }

          prossimi = {
            ...precedente.valori,
            prodotti: {
              ...precedente.valori.prodotti,
              [id]: aggiornata,
            },
          };
          break;
        }
      }

      return {
        ...precedente,
        valori: prossimi,
        validi: aggiornaValoriValidi(precedente.validi, prossimi),
      };
    });

    // Gli errori dei formati sono uno per riga, non uno per campo.
    const chiaveErrore: ChiaveErrore =
      gruppo === 'prodotti'
        ? (`prodotto-${campo.split(':')[0]}` as ChiaveErrore)
        : (campo as ChiaveErrore);

    setErrori((precedenti) => {
      if (!precedenti[chiaveErrore]) return precedenti;
      const successivi = { ...precedenti };
      delete successivi[chiaveErrore];
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
      // Le percentuali personalizzate vivono in una copia della ricetta:
      // formule, fasi e testi restano quelli originali.
      const config = configPersonalizzata(ricetta, parametri, opzioni);

      if (modalita === 'prodotti') {
        const righe = (ricetta.prodotti ?? []).map((prodotto) => ({
          id: prodotto.id,
          quantita: valori.prodotti?.[prodotto.id]?.quantita ?? '0',
          peso:
            valori.prodotti?.[prodotto.id]?.peso ?? String(prodotto.pesoBaseG),
        }));
        const esito = validaModalitaProdotti(righe);
        erroriCalcolo = esito.errori;
        if (!esito.valori) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla i formati scelti.',
          );
          return;
        }

        nuovo = calcolaPerProdotti(config, esito.valori, opzioni);
      } else if (modalita === 'panetti') {
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
          config,
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
          config,
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

        // La stima delle teglie è del Trancio: il calcolatore misto, partendo
        // dalla farina, ripartisce invece l'impasto tra i formati.
        const conStimaTeglie =
          ricetta.famiglia === 'diretto' && !ricetta.prodotti;
        let stimaTeglia: { latoA: number; latoB: number } | null = null;
        if (conStimaTeglie) {
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

        if (conStimaTeglie && (erroriCalcolo.latoA || erroriCalcolo.latoB)) {
          setErrori(erroriCalcolo);
          setAnnuncioCalcolo(
            'Calcolo non eseguito: controlla la stima delle teglie.',
          );
          return;
        }

        nuovo = calcolaPerFarina(
          config,
          esito.valori.farinaKg,
          ricetta.famiglia === 'diretto'
            ? null
            : esito.valori.pesoPanettoG,
          opzioni,
          stimaTeglia,
        );
      }

      const vista = creaVistaRicetta(nuovo, nuovo.config);
      setRisultato(nuovo);
      setDaAggiornare(false);
      setErrori({});
      setAnnuncioCalcolo(
        `${vista.nomeRicetta}, ${vista.modalitaEtichetta.toLowerCase()}: ${vista.resa}. ${formattaGrammi(
          nuovo.pesoImpastoG,
        )} di impasto, ${formattaGrammi(nuovo.farinaTotaleG)} di farina.`,
      );

      // Nel percorso guidato il calcolo apre direttamente l'ultima pagina.
      if (proceduraGuidata) {
        vaiAPagina(PAGINA_RISULTATO);
      } else {
        window.setTimeout(() => {
          if (window.matchMedia('(max-width: 1023px)').matches) {
            document
              .getElementById('risultato-titolo')
              ?.scrollIntoView({ block: 'start', behavior: 'auto' });
          }
        }, 30);
      }
    } catch (errore) {
      console.error('Errore di calcolo', errore);
      setErroreGenerale(ERRORE_CALCOLO);
      setAnnuncioCalcolo('Calcolo non eseguito per un errore nei dati.');
    }
  }

  async function esporta(tipo: TipoEsportazione, smartphone = ottimizzaSmartphone) {
    if (
      !risultato ||
      risultato.ricettaId !== ricetta.id ||
      daAggiornare ||
      inEsportazioneRef.current
    ) {
      return;
    }

    const adesso = new Date();
    // Anteprima ed esportazioni seguono la configurazione calcolata.
    const config = risultato.config;
    const nomeFile = creaNomeFile(risultato, config, adesso, tipo);

    inEsportazioneRef.current = true;
    setEsportazione(tipo);
    setMessaggioEsportazione(null);

    try {
      // Il file si prepara e si mostra: niente download automatico, si salva
      // solo dal pulsante dell'anteprima. Il disegno è quello del foglio del
      // sito: alla ricetta cambiano i contenuti, non il layout.
      await document.fonts.ready;
      const dati = datiFoglioRicetta(risultato, config, adesso);
      let blob: Blob;
      if (tipo === 'pdf') {
        // Il motore dei PDF arriva solo quando serve: all'apertura del sito
        // non pesa sul telefono.
        const { pdfBlob } = await import('../export/pdf');
        blob = pdfBlob(dati, smartphone);
      } else {
        blob = await jpgBlob(dati, SCALA_JPG, smartphone);
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
      console.error(`Errore durante l’esportazione ${tipo}`, errore);
      setMessaggioEsportazione({
        tipo: 'errore',
        testo: 'Non è stato possibile creare il file. Riprova.',
      });
    } finally {
      inEsportazioneRef.current = false;
      setEsportazione(null);
    }
  }

  // I quattro riquadri, costruiti una volta e mostrati dalla modalità attiva.
  const selettoreRicetta = (
    <SelettoreRicetta
      ricette={RICETTE}
      ricettaId={ricetta.id}
      onCambia={cambiaRicetta}
    />
  );
  const schedaRicetta = <SchedaRicetta ricetta={ricetta} incorporata={senzaTestata} />;
  // Sul desktop il modulo è un blocco solo; nel percorso guidato si mostra un
  // pezzo per pagina (dosi, poi personalizzazione).
  const moduloCalcolo = (sezione: 'tutto' | 'dosi' | 'personalizza') => (
    <FormCalcolo
      ricetta={ricetta}
      modalita={modalita}
      opzioni={opzioni}
      valori={valori}
      parametri={parametri}
      personalizzata={personalizzata}
      errori={errori}
      erroreGenerale={erroreGenerale}
      onCambiaModalita={cambiaModalita}
      onCambiaOpzione={cambiaOpzione}
      onCambiaCampo={cambiaCampo}
      onCambiaParametro={cambiaParametro}
      onRipristinaParametri={ripristinaParametri}
      onCalcola={calcola}
      sezione={sezione}
    />
  );
  const esitoCalcolo =
    risultato && risultato.ricettaId === ricetta.id ? (
      <PannelloRisultato
        risultato={risultato}
        titolo={senzaTestata ? "Dosi e resa" : undefined}
        ricetta={risultato.config}
        daAggiornare={daAggiornare}
        esportazione={esportazione}
        messaggio={messaggioEsportazione}
        ottimizzaSmartphone={ottimizzaSmartphone}
        onCambiaOttimizzaSmartphone={setOttimizzaSmartphone}
        onEsporta={esporta}
        anteprima={anteprima}
        onSalvaAnteprima={salvaAnteprima}
        onChiudiAnteprima={chiudiAnteprima}
      />
    ) : null;

  // Ogni passo mostra un solo riquadro, con i comandi avanti/indietro. I nomi
  // e l'ordine sono quelli del calcolatore nuovo, così il percorso è lo stesso
  // in tutta l'app.
  const contenutoApp = proceduraGuidata ? (
    <div id="passi-calcolatore" className="grid min-w-0 gap-6 scroll-mt-24">
      {paginaApp === 1 && !senzaSelettore ? (
        <>
          {selettoreRicetta}
          <NavigazionePassi
            passi={passiGuidati}
            attivo={indiceGuidato}
            onAvanti={() => vaiAPagina(2)}
          />
        </>
      ) : null}

      {paginaApp === 2 ? (
        <>
          {schedaRicetta}
          <NavigazionePassi
            passi={passiGuidati}
            attivo={indiceGuidato}
            onIndietro={senzaSelettore ? undefined : () => vaiAPagina(1)}
            onAvanti={() => vaiAPagina(3)}
          />
        </>
      ) : null}

      {paginaApp === 3 ? (
        <>
          {moduloCalcolo('dosi')}
          <NavigazionePassi
            passi={passiGuidati}
            attivo={indiceGuidato}
            onIndietro={() => vaiAPagina(2)}
            onAvanti={() => vaiAPagina(4)}
          />
        </>
      ) : null}

      {paginaApp === 4 ? (
        <>
          {moduloCalcolo('personalizza')}
          <NavigazionePassi
            passi={passiGuidati}
            attivo={indiceGuidato}
            onIndietro={() => vaiAPagina(3)}
          />
        </>
      ) : null}

      {paginaApp === PAGINA_RISULTATO && esitoCalcolo ? (
        <>
          <div className="min-w-0">{esitoCalcolo}</div>
          <NavigazionePassi
            passi={passiGuidati}
            attivo={indiceGuidato}
            onIndietro={() => vaiAPagina(4)}
          />
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#calcolatore"
        onClick={
          proceduraGuidata
            ? (evento) => {
                evento.preventDefault();
                vaiAPagina(3);
              }
            : undefined
        }
        className="sr-only rounded-lg bg-terracotta px-4 py-2 text-sm font-semibold text-su-oro focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
      >
        Vai al calcolatore
      </a>

      {senzaTestata ? null : (
      <header className="sticky top-0 z-40 border-b border-bordo/70 bg-crema-scuro/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="#calcolatore"
            onClick={
              proceduraGuidata
                ? (evento) => {
                    evento.preventDefault();
                    vaiAPagina(1);
                  }
                : undefined
            }
            className="group flex min-w-0 items-center gap-3"
          >
            <Marchio className="h-11 w-11 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-serif text-base leading-none font-bold tracking-wide text-inchiostro sm:text-xl">
                PizzaMetria
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.16em] text-terracotta uppercase sm:text-[10px] sm:tracking-[0.22em]">
                <span className="min-[380px]:hidden">Calcolatore</span>
                <span className="hidden min-[380px]:inline">
                  Calcolatore di impasti
                </span>
              </span>
            </span>
          </a>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-bordo bg-carta/70 px-3 py-1.5 text-[11px] font-medium text-inchiostro-tenue sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-terracotta"
              />
              Calcolo locale
            </span>
            {/* In testa non c'è più nessun comando di calcolo: la pagina si
                usa dall'alto in basso e il menu si apre da destra, identico
                su smartphone e desktop. */}
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
        <MenuLaterale
          aperto={menuAperto}
          onChiudi={() => setMenuAperto(false)}
        />
      )}

      {/* Nel percorso guidato l'eroe resta soltanto sul primo passaggio. */}
      {senzaTestata || (proceduraGuidata && paginaApp !== 1) ? null : (
        <section className="border-b border-bordo/50">
          <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-12">
            <h1 className="font-serif text-[27px] leading-[1.12] font-bold text-balance text-inchiostro sm:text-5xl">
              La tua pizza,{' '}
              <span className="testo-oro whitespace-nowrap">grammo per grammo</span>.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed font-light text-inchiostro-tenue sm:text-base">
              La tua pizza, dal calcolo al forno: dosi, tempi e procedimento
              passo dopo passo.
            </p>
          </div>
        </section>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-0 pt-8 pb-12 sm:px-6 lg:pb-16">
        {proceduraGuidata ? (
          contenutoApp
        ) : (
        <div className="grid min-w-0 gap-6">
          {/* Su desktop la scelta della ricetta e la scheda stanno affiancate;
              su smartphone restano in colonna, una sotto l'altra. */}
          <div
            className={`grid min-w-0 gap-5 ${
              senzaSelettore
                ? ''
                : 'lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-stretch'
            }`}
          >
            {senzaSelettore ? null : selettoreRicetta}
            {schedaRicetta}
          </div>

          {moduloCalcolo('tutto')}

          <div className="min-w-0">{esitoCalcolo}</div>
        </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">
          {annuncioCalcolo}
        </p>
      </main>

      {senzaTestata ? null : (
      <footer className="border-t border-bordo/60 bg-crema-scuro/60 py-7">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div>
            <p className="font-serif text-sm font-bold text-inchiostro">
              PizzaMetria — Calcolatore di impasti
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-inchiostro-tenue">
              I calcoli e le esportazioni avvengono nel browser. Le quantità sono
              in grammi.
            </p>
          </div>
          <p className="text-[11px] text-inchiostro-tenue">
            © {new Date().getFullYear()} PizzaMetria
          </p>
        </div>
      </footer>
      )}
    </div>
  );
}
