import { useState } from 'react';
import type {
  ErroriCampi,
  ModalitaCalcolo,
  OpzioniRicetta,
  ParametriRicetta,
  RichiestaBiga,
  RicettaConfig,
  TipoLievito,
  ValoriGrezzi,
} from '../types';
import { oreAttesa, piano as pianoMotore } from '../lib/motore-biga';
import { completaCoppia, giornoDi, oraDi, orarioPredefinito } from '../lib/orari';
import type { ChiaveParametro } from '../config/personalizzazione';
import { LIMITI } from '../lib/validazione';
import { testoMaturazione } from '../lib/vista';
import { CampoNumero } from './CampoNumero';
import { SelettoreModalita } from './SelettoreModalita';
import { PannelloPersonalizzazione } from './PannelloPersonalizzazione';

export type GruppoValori = keyof ValoriGrezzi;
export type CambiaCampo = (
  gruppo: GruppoValori,
  campo: string,
  valore: string,
) => void;

interface Props {
  ricetta: RicettaConfig;
  modalita: ModalitaCalcolo;
  opzioni: OpzioniRicetta;
  valori: ValoriGrezzi;
  parametri: ParametriRicetta;
  personalizzata: boolean;
  errori: ErroriCampi;
  erroreGenerale: string | null;
  onCambiaModalita: (modalita: ModalitaCalcolo) => void;
  onCambiaOpzione: <K extends keyof OpzioniRicetta>(
    campo: K,
    valore: OpzioniRicetta[K],
  ) => void;
  onCambiaCampo: CambiaCampo;
  onCambiaParametro: (chiave: ChiaveParametro, valore: number) => void;
  onRipristinaParametri: () => void;
  onCalcola: () => void;
  /**
   * Nel percorso guidato il modulo si spezza in due passi: prima le dosi, poi
   * lievito, biga e percentuali. Sul desktop resta un blocco solo.
   */
  sezione?: 'dosi' | 'personalizza' | 'tutto';
}

const ETICHETTE_LIEVITO: Record<TipoLievito, string> = {
  fresco: 'Lievito fresco',
  secco: 'Lievito secco',
};

const TESTI_MODALITA: Record<ModalitaCalcolo, string> = {
  panetti:
    'Inserisci quanti panetti ti servono e quanto deve pesare ciascuno: il peso comprende tutti gli ingredienti.',
  farina:
    'Parti dalla farina che hai. Se vuoi, indica anche una resa per ottenere panetti o una stima delle teglie.',
  teglie:
    'Inserisci le dimensioni della teglia e quante ne vuoi preparare: le dosi mantengono la stessa quantità di impasto per superficie.',
  prodotti:
    'Combina i formati che ti servono: indica quanti pezzi e il peso di ciascuno. La quantità zero esclude il formato, e l’impasto resta uno solo.',
};

export function FormCalcolo({
  ricetta,
  modalita,
  opzioni,
  valori,
  parametri,
  personalizzata,
  errori,
  erroreGenerale,
  onCambiaModalita,
  onCambiaOpzione,
  onCambiaCampo,
  onCambiaParametro,
  onRipristinaParametri,
  onCalcola,
  sezione = 'tutto',
}: Props) {
  // Le percentuali mostrate seguono la quota di biga scelta nel pannello.
  const quotaFarinaAutolisi = Math.round(100 - parametri.percentualeBiga);
  const idratazioneAutolisi = Math.round(parametri.idratazioneAutolisi);
  const senzaFarinaRinfresco = quotaFarinaAutolisi <= 0;
  const mostraDosi = sezione !== 'personalizza';
  const mostraPersonalizzazione = sezione !== 'dosi';
  // I formati sono un elenco a fisarmonica: se ne apre uno per volta, e tutti
  // partono a zero, così si sceglie soltanto quello che serve.
  const [apertoProdotto, setApertoProdotto] = useState<string | null>(null);

  // Il motore della biga: l'idratazione della biga non è più una percentuale
  // fissa, la ricava dall'attesa e dalle due temperature.
  const richiestaBiga = ricetta.motoreBiga
    ? (opzioni.biga ?? ricetta.motoreBiga)
    : null;
  // L'attesa nascе dagli orari, come nel calcolatore della sola biga: le ore
  // restano solo come ripiego per gli stati salvati senza orari.
  // Giorno e ora dei due istanti: un vecchio stato salvato con il solo orario
  // prende il giorno da oggi, così datetime-local lo può mostrare.
  const { inizio: inizioBiga, fine: fineBiga } = completaCoppia(
    richiestaBiga?.oraImpasto ?? orarioPredefinito(0),
    richiestaBiga?.oraPronta ?? orarioPredefinito(1),
  );
  const oreDagliOrari = richiestaBiga ? oreAttesa(inizioBiga, fineBiga) : null;
  const oreBiga = richiestaBiga ? (oreDagliOrari ?? richiestaBiga.ore) : 0;

  // Il giorno in cui la biga è pronta: «martedì 5 novembre alle 08:00».
  const giornoPronta = giornoDi(fineBiga);
  const oraPronta = oraDi(fineBiga);

  const pianoBiga = richiestaBiga
    ? pianoMotore({
        temperatura: richiestaBiga.temperatura,
        temperaturaFrigo: richiestaBiga.temperaturaFrigo,
        oreTotali: oreBiga,
      })
    : null;

  const cambiaBiga = (modifica: Partial<RichiestaBiga>) => {
    if (!richiestaBiga) return;
    onCambiaOpzione('biga', { ...richiestaBiga, ...modifica });
  };

  /** Spostare un orario ricalcola subito l'attesa del motore. */
  const cambiaOrario = (
    campo: 'oraImpasto' | 'oraPronta',
    valore: string,
  ) => {
    if (!richiestaBiga) return;
    const coppia = completaCoppia(
      campo === 'oraImpasto'
        ? valore
        : (richiestaBiga.oraImpasto ?? orarioPredefinito(0)),
      campo === 'oraPronta'
        ? valore
        : (richiestaBiga.oraPronta ?? orarioPredefinito(1)),
    );
    const ore = oreAttesa(coppia.inizio, coppia.fine);
    const prossima: RichiestaBiga = {
      ...richiestaBiga,
      oraImpasto: coppia.inizio,
      oraPronta: coppia.fine,
      ...(ore === null ? {} : { ore }),
    };
    onCambiaOpzione('biga', prossima);
  };

  const leggìNumero = (testo: string, difetto: number) => {
    const numero = Number.parseFloat(testo.replace(',', '.'));
    return Number.isFinite(numero) ? numero : difetto;
  };
  const testoNumero = (valore: number) => String(valore).replace('.', ',');

  const formattatoreGrammi = new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: 0,
  });

  /** Subtotale e totale del calcolatore misto, solo con numeri validi. */
  const righeProdotti = (ricetta.prodotti ?? []).map((prodotto) => {
    const riga = valori.prodotti?.[prodotto.id];
    const quantita = riga ? Number.parseInt(riga.quantita, 10) : 0;
    const peso = riga ? Number.parseFloat(riga.peso.replace(',', '.')) : 0;
    const valida = Number.isFinite(quantita) && Number.isFinite(peso);
    const subtotale = valida ? Math.max(0, quantita) * Math.max(0, peso) : 0;
    return { prodotto, riga, subtotale };
  });
  const pesoComplessivo = righeProdotti.reduce(
    (totale, riga) => totale + riga.subtotale,
    0,
  );

  function impostaTeglia(latoA: string, latoB: string) {
    onCambiaCampo('teglie', 'latoA', latoA);
    onCambiaCampo('teglie', 'latoB', latoB);
  }

  return (
    <form
      id="calcolatore"
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault();
        // Nel passo delle dosi non c'è il comando di calcolo: Invio non deve
        // saltare alla pagina del risultato.
        if (mostraPersonalizzazione) onCalcola();
      }}
      className="rounded-2xl border border-bordo/80 bg-carta/70 p-3 shadow-xl shadow-ombra/20 sm:p-5"
    >
      <h2 className="font-serif text-xl font-bold tracking-tight text-inchiostro">
        {sezione === 'dosi'
          ? 'Scegli le dosi'
          : sezione === 'personalizza'
            ? 'Personalizza la ricetta'
            : 'Calcola il tuo impasto'}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-inchiostro-tenue">
        {sezione === 'personalizza'
          ? 'Lievito, biga e percentuali: qui cambi la ricetta. Se va bene così, premi «Calcola impasto».'
          : modalita === 'farina' && ricetta.prodotti
            ? 'Parti dalla farina che hai: calcoliamo l’impasto totale e la ripartizione indicativa tra i formati.'
            : TESTI_MODALITA[modalita]}
      </p>

      {mostraDosi ? (
        <div className="mt-4">
          <SelettoreModalita
            modalita={modalita}
            modalitaDisponibili={ricetta.modalita}
            onCambia={onCambiaModalita}
          />
        </div>
      ) : null}

      {mostraPersonalizzazione ? (
      <div
        role="group"
        aria-labelledby="configurazione-titolo"
        className="mt-4 rounded-xl border border-bordo/70 bg-crema-scuro/40 p-2 sm:p-3.5"
      >
        <p
          id="configurazione-titolo"
          className="font-serif text-sm font-bold text-inchiostro"
        >
          Configurazione della ricetta
        </p>
        <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
          Il lievito fresco è l’impostazione predefinita; le dosi si adeguano
          al tipo di lievito scelto.
        </p>

        <div className="mt-3">
          <p
            id="tipo-lievito-titolo"
            className="text-xs font-semibold tracking-wide text-inchiostro-tenue uppercase"
          >
            Tipo di lievito
          </p>
          <div
            role="radiogroup"
            aria-labelledby="tipo-lievito-titolo"
            className="mt-1.5 grid grid-cols-2 gap-1.5 rounded-xl border border-bordo/80 bg-crema-scuro p-1.5"
          >
            {(['fresco', 'secco'] as const).map((tipo) => {
              const selezionato = opzioni.tipoLievito === tipo;

              return (
                <label key={tipo} className="min-w-0 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo-lievito"
                    value={tipo}
                    checked={selezionato}
                    onChange={() => onCambiaOpzione('tipoLievito', tipo)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2 py-2 text-center text-xs font-semibold text-inchiostro-tenue transition-all peer-checked:border-terracotta/50 peer-checked:bg-terracotta/15 peer-checked:text-oro-chiaro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta">
                    <span
                      aria-hidden="true"
                      className={selezionato ? 'visible' : 'invisible'}
                    >
                      ✓
                    </span>
                    <span className="min-w-0">{ETICHETTE_LIEVITO[tipo]}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {ricetta.famiglia !== 'diretto' && senzaFarinaRinfresco ? (
          <div className="mt-3 rounded-xl border border-bordo bg-crema-scuro/60 px-2.5 py-2.5">
            <p className="text-sm font-semibold text-inchiostro">Autolisi</p>
            <p className="mt-0.5 text-xs leading-relaxed text-inchiostro-tenue">
              Tutta la farina è nella biga: non resta farina per l’autolisi.
            </p>
          </div>
        ) : ricetta.autolisiOpzionale ? (
          <label className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-bordo bg-crema-scuro/60 px-2.5 py-2.5 transition-colors hover:border-terracotta/40">
            <input
              type="checkbox"
              checked={opzioni.autolisi}
              onChange={(evento) =>
                onCambiaOpzione('autolisi', evento.target.checked)
              }
              className="mt-0.5 h-4 w-4 shrink-0 accent-terracotta"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-inchiostro">
                Autolisi
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-inchiostro-tenue">
                Facoltativa: la farina del rinfresco riposa con una parte
                dell’acqua prima dell’impastamento finale. Il calcolatore
                ripartisce l’acqua totale tra biga, autolisi e impasto finale.
              </span>
            </span>
          </label>
        ) : ricetta.famiglia === 'biga-autolisi' ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-bordo bg-crema-scuro/60 px-2.5 py-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-terracotta text-[10px] leading-none font-bold text-su-oro"
            >
              ✓
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-inchiostro">
                  Autolisi
                </span>
                <span className="rounded-full border border-terracotta/30 bg-oro-velo px-2 py-0.5 text-[10px] font-semibold tracking-wide text-oro-chiaro uppercase">
                  Inclusa
                </span>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-inchiostro-tenue">
                Fa parte della ricetta e non si disattiva: il{' '}
                {quotaFarinaAutolisi}% della farina riposa con il{' '}
                {idratazioneAutolisi}% della sua acqua la sera prima
                dell’impastamento finale. L’acqua è già compresa nel totale.
              </span>
            </span>
          </div>
        ) : null}

        {richiestaBiga && pianoBiga ? (
          <div className="mt-3 rounded-xl border border-bordo bg-crema-scuro/60 px-2.5 py-2.5">
            <p className="text-sm font-semibold text-inchiostro">
              Maturazione della biga
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-inchiostro-tenue">
              L’idratazione della biga la decide il motore, non è fissa: conta
              l’attesa dall’impasto alla biga pronta e le due temperature.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <label className="block">
                <span className="block text-xs font-semibold text-inchiostro-tenue">
                  Preparo la biga il
                </span>
                <input
                  type="datetime-local"
                  value={inizioBiga}
                  onChange={(evento) =>
                    cambiaOrario('oraImpasto', evento.target.value)
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-bordo bg-carta px-3 text-base font-semibold text-inchiostro tabular-nums"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-inchiostro-tenue">
                  Biga pronta il
                </span>
                <input
                  type="datetime-local"
                  value={fineBiga}
                  onChange={(evento) =>
                    cambiaOrario('oraPronta', evento.target.value)
                  }
                  className="mt-1 min-h-11 w-full rounded-xl border border-bordo bg-carta px-3 text-base font-semibold text-inchiostro tabular-nums"
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
              <CampoNumero
                id="biga-temperatura"
                label="Ambiente"
                unit="°C"
                value={testoNumero(richiestaBiga.temperatura)}
                onChange={(valore) =>
                  cambiaBiga({
                    temperatura: leggìNumero(valore, richiestaBiga.temperatura),
                  })
                }
                inputMode="decimal"
                incremento={1}
                minimo={LIMITI.temperaturaBiga.min}
                massimo={LIMITI.temperaturaBiga.max}
                decimali={1}
              />
              <CampoNumero
                id="biga-frigo"
                label="Frigorifero"
                unit="°C"
                value={testoNumero(richiestaBiga.temperaturaFrigo)}
                onChange={(valore) =>
                  cambiaBiga({
                    temperaturaFrigo: leggìNumero(
                      valore,
                      richiestaBiga.temperaturaFrigo,
                    ),
                  })
                }
                inputMode="decimal"
                incremento={1}
                minimo={LIMITI.frigoBiga.min}
                massimo={LIMITI.frigoBiga.max}
                decimali={0}
              />
            </div>

            {oreDagliOrari === null ? (
              <p
                role="alert"
                className="mt-2.5 rounded-lg border border-errore/40 bg-errore/10 px-2.5 py-2 text-xs leading-relaxed font-semibold text-errore"
              >
                La biga non può essere pronta prima di essere preparata: sposta
                avanti il giorno o l’ora di fine.
              </p>
            ) : (
              <p className="mt-2.5 text-xs leading-relaxed text-inchiostro">
                Attesa:{' '}
                <strong>{testoNumero(Math.round(oreBiga * 10) / 10)} ore</strong>
                {giornoPronta && oraPronta
                  ? `, biga pronta ${giornoPronta} alle ${oraPronta}`
                  : ''}
                . Biga al <strong>{pianoBiga.idratazione}%</strong> di
                idratazione, matura{' '}
                <strong>{testoMaturazione(pianoBiga)}</strong>.
              </p>
            )}

            {pianoBiga.consiglio ? (
              <p className="mt-2 rounded-lg border border-terracotta/40 bg-terracotta/10 px-2.5 py-2 text-xs leading-relaxed text-inchiostro">
                {pianoBiga.consiglio}
              </p>
            ) : null}

          </div>
        ) : null}
      </div>
      ) : null}

      {mostraDosi && modalita === 'panetti' ? (
        <div className="mt-4 grid gap-4">
          <CampoNumero
            id="numero-panetti"
            label="Numero di panetti"
            value={valori.panetti.numeroPanetti}
            onChange={(valore) =>
              onCambiaCampo('panetti', 'numeroPanetti', valore)
            }
            inputMode="numeric"
            hint="Un numero intero, ad esempio 6."
            error={errori.numeroPanetti}
            incremento={1}
            minimo={1}
            massimo={LIMITI.maxPanetti}
            decimali={0}
          />
          <CampoNumero
            id="peso-panetto"
            label="Peso di ciascun panetto"
            unit="g"
            value={valori.panetti.pesoPanetto}
            onChange={(valore) =>
              onCambiaCampo('panetti', 'pesoPanetto', valore)
            }
            inputMode="decimal"
            hint="Puoi usare la virgola o il punto per i decimali."
            error={errori.pesoPanetto}
            incremento={5}
            minimo={5}
            massimo={LIMITI.maxPesoPanettoG}
          />
        </div>
      ) : null}

      {mostraDosi && modalita === 'teglie' ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 min-[380px]:grid-cols-2">
            <CampoNumero
              id="teglia-lato-a"
              label="Lato A"
              unit="cm"
              value={valori.teglie.latoA}
              onChange={(valore) =>
                onCambiaCampo('teglie', 'latoA', valore)
              }
              inputMode="decimal"
              error={errori.latoA}
              incremento={1}
              minimo={1}
              massimo={LIMITI.maxLatoTegliaCm}
              decimali={1}
            />
            <CampoNumero
              id="teglia-lato-b"
              label="Lato B"
              unit="cm"
              value={valori.teglie.latoB}
              onChange={(valore) =>
                onCambiaCampo('teglie', 'latoB', valore)
              }
              inputMode="decimal"
              error={errori.latoB}
              incremento={1}
              minimo={1}
              massimo={LIMITI.maxLatoTegliaCm}
              decimali={1}
            />
          </div>

          <div>
            <p className="text-xs font-medium text-inchiostro-tenue">
              Scorciatoie di dimensione, se ti servono:
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => impostaTeglia('30', '40')}
                className="min-h-9 rounded-lg border border-bordo bg-crema-scuro px-3 py-1.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:bg-terracotta/10 hover:text-oro-chiaro"
              >
                30 × 40 cm
              </button>
              <button
                type="button"
                onClick={() => impostaTeglia('40', '60')}
                className="min-h-9 rounded-lg border border-bordo bg-crema-scuro px-3 py-1.5 text-xs font-semibold text-inchiostro transition-colors hover:border-terracotta/50 hover:bg-terracotta/10 hover:text-oro-chiaro"
              >
                40 × 60 cm
              </button>
            </div>
          </div>

          <CampoNumero
            id="numero-teglie"
            label="Numero di teglie"
            value={valori.teglie.numeroTeglie}
            onChange={(valore) =>
              onCambiaCampo('teglie', 'numeroTeglie', valore)
            }
            inputMode="numeric"
            hint="Un numero intero, ad esempio 2."
            error={errori.numeroTeglie}
            incremento={1}
            minimo={1}
            massimo={LIMITI.maxTeglie}
            decimali={0}
          />
        </div>
      ) : null}

      {mostraDosi && modalita === 'prodotti' ? (
        <div className="mt-4 grid gap-3">
          <p className="text-xs leading-relaxed text-inchiostro-tenue">
            I tempi base si riferiscono alle pezzature di riferimento; cambia
            pure i pesi, adattando poi la cottura.
          </p>

          {errori.prodotti ? (
            <p
              role="alert"
              className="rounded-xl border border-errore/40 bg-errore/10 px-3 py-2 text-sm font-medium text-errore"
            >
              {errori.prodotti}
            </p>
          ) : null}

          {righeProdotti.map(({ prodotto, riga, subtotale }) => {
            const dimensione = prodotto.dimensione;
            const quantita = riga ? Number.parseInt(riga.quantita, 10) || 0 : 0;
            const dimensioneScelta = dimensione
              ? dimensione.tipo === 'stampo'
                ? `${riga?.dimA ?? dimensione.baseA} × ${riga?.dimB ?? dimensione.baseB ?? 1} ${dimensione.unita}`
                : `Ø ${riga?.dimA ?? dimensione.baseA} ${dimensione.unita}`
              : prodotto.nota;
            const riferimentoDimensione = dimensione
              ? dimensione.tipo === 'stampo'
                ? `${dimensione.baseA} × ${dimensione.baseB ?? 1} cm corrispondono a ${formattatoreGrammi.format(dimensione.pesoBaseG)} g`
                : `${dimensione.baseA} cm corrispondono a ${formattatoreGrammi.format(dimensione.pesoBaseG)} g`
              : '';

            return (
              <div
                key={prodotto.id}
                className="rounded-xl border border-bordo/70 bg-crema-scuro/40 p-3.5 sm:p-4"
              >
                <button
                  type="button"
                  aria-expanded={apertoProdotto === prodotto.id}
                  aria-controls={`prodotto-${prodotto.id}-dettagli`}
                  onClick={() =>
                    setApertoProdotto(
                      apertoProdotto === prodotto.id ? null : prodotto.id,
                    )
                  }
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-serif text-base leading-tight font-bold text-inchiostro">
                      {prodotto.nome}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-inchiostro-tenue">
                      {dimensioneScelta}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-right text-[11px] leading-tight text-inchiostro-tenue tabular-nums">
                      <span className="block font-semibold text-inchiostro">
                        {quantita} {quantita === 1 ? "pezzo" : "pezzi"}
                      </span>
                      {formattatoreGrammi.format(subtotale)} g
                    </span>
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-3.5 w-3.5 shrink-0 text-inchiostro-tenue transition-transform duration-200 motion-reduce:transition-none ${
                        apertoProdotto === prodotto.id ? 'rotate-90' : ''
                      }`}
                    >
                      <path d="M4 2l4 4-4 4" />
                    </svg>
                  </span>
                </button>

                {apertoProdotto === prodotto.id ? (
                  <div id={`prodotto-${prodotto.id}-dettagli`}>
                {/* Su smartphone i due campi stanno uno sotto l'altro: con i
                    tasti − e + affiancati il valore resterebbe illeggibile. */}
                <div className="mt-3 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2">
                  <CampoNumero
                    id={`prodotto-${prodotto.id}-quantita`}
                    label="Pezzi"
                    centrato
                    value={riga?.quantita ?? '0'}
                    onChange={(valore) =>
                      onCambiaCampo(
                        'prodotti',
                        `${prodotto.id}:quantita`,
                        valore,
                      )
                    }
                    inputMode="numeric"
                    incremento={1}
                    minimo={0}
                    massimo={LIMITI.maxPezzi}
                    decimali={0}
                  />
                  <CampoNumero
                    id={`prodotto-${prodotto.id}-peso`}
                    label="Peso per pezzo"
                    unit="g"
                    centrato
                    value={riga?.peso ?? String(prodotto.pesoBaseG)}
                    onChange={(valore) =>
                      onCambiaCampo('prodotti', `${prodotto.id}:peso`, valore)
                    }
                    inputMode="decimal"
                    incremento={5}
                    minimo={5}
                    massimo={LIMITI.maxPesoPanettoG}
                  />
                </div>

                {dimensione ? (
                  <div className="mx-auto mt-3.5 w-full max-w-[320px] rounded-xl border border-bordo/60 bg-carta/60 px-3 py-3">
                    {dimensione.tipo === 'stampo' ? (
                      <>
                        <p className="text-center text-[11px] font-semibold tracking-wide text-inchiostro-tenue uppercase">
                          {dimensione.etichetta}
                        </p>
                        {/* I due lati restano impilati: affiancati, i tasti
                            lascerebbero al campo una larghezza inutilizzabile. */}
                        <div className="mt-2 grid grid-cols-1 gap-3">
                          <CampoNumero
                            id={`prodotto-${prodotto.id}-dim-a`}
                            label="Lato A"
                            unit={dimensione.unita}
                            centrato
                            value={
                              riga?.dimA ?? String(dimensione.baseA)
                            }
                            onChange={(valore) =>
                              onCambiaCampo(
                                'prodotti',
                                `${prodotto.id}:dimA`,
                                valore,
                              )
                            }
                            inputMode="decimal"
                            incremento={dimensione.incremento}
                            minimo={dimensione.min}
                            massimo={dimensione.max}
                            decimali={1}
                          />
                          <CampoNumero
                            id={`prodotto-${prodotto.id}-dim-b`}
                            label="Lato B"
                            unit={dimensione.unita}
                            centrato
                            value={
                              riga?.dimB ?? String(dimensione.baseB ?? 1)
                            }
                            onChange={(valore) =>
                              onCambiaCampo(
                                'prodotti',
                                `${prodotto.id}:dimB`,
                                valore,
                              )
                            }
                            inputMode="decimal"
                            incremento={dimensione.incremento}
                            minimo={dimensione.min}
                            massimo={dimensione.max}
                            decimali={1}
                          />
                        </div>
                      </>
                    ) : (
                      <CampoNumero
                        id={`prodotto-${prodotto.id}-dim-a`}
                        label={dimensione.etichetta}
                        unit={dimensione.unita}
                        centrato
                        value={riga?.dimA ?? String(dimensione.baseA)}
                        onChange={(valore) =>
                          onCambiaCampo(
                            'prodotti',
                            `${prodotto.id}:dimA`,
                            valore,
                          )
                        }
                        inputMode="decimal"
                        incremento={dimensione.incremento}
                        minimo={dimensione.min}
                        massimo={dimensione.max}
                        decimali={1}
                      />
                    )}
                    <p className="mt-2 text-center text-[11px] leading-relaxed text-inchiostro-tenue">
                      Il peso si ricalcola dalla superficie ({riferimentoDimensione}) e resta modificabile a mano.
                    </p>
                  </div>
                ) : null}

                {errori[`prodotto-${prodotto.id}`] ? (
                  <p role="alert" className="mt-2 text-xs font-medium text-errore">
                    {errori[`prodotto-${prodotto.id}`]}
                  </p>
                ) : null}

                <p className="mt-2.5 text-right text-[11px] font-semibold text-inchiostro-tenue tabular-nums">
                  Subtotale:{' '}
                  {formattatoreGrammi.format(subtotale)} g
                </p>
                  </div>
                ) : null}
              </div>
            );
          })}

          <p className="flex items-baseline justify-between gap-2 rounded-xl border border-terracotta/25 bg-oro-velo px-3 py-2.5">
            <span className="text-xs font-semibold text-inchiostro">
              Peso complessivo
            </span>
            <span className="font-serif text-base font-bold tabular-nums text-oro-chiaro">
              {formattatoreGrammi.format(pesoComplessivo)} g
            </span>
          </p>
        </div>
      ) : null}

      {mostraDosi && modalita === 'farina' ? (
        <div className="mt-4 grid gap-4">
          <CampoNumero
            id="farina-totale"
            label="Farina totale"
            unit="kg"
            value={valori.farina.farinaKg}
            onChange={(valore) =>
              onCambiaCampo('farina', 'farinaKg', valore)
            }
            inputMode="decimal"
            hint="Ad esempio 1 oppure 1,25."
            error={errori.farinaKg}
            incremento={0.05}
            minimo={0.05}
            massimo={LIMITI.maxFarinaKg}
          />

          {ricetta.prodotti ? (
            <p className="rounded-xl border border-bordo/80 bg-crema-scuro/50 px-3.5 py-2.5 text-xs leading-relaxed text-inchiostro-tenue">
              Dalla farina calcoliamo l’impasto totale e, nel risultato, la
              ripartizione indicativa tra i formati alle loro pezzature di
              riferimento.
            </p>
          ) : ricetta.famiglia === 'diretto' ? (
            <div className="rounded-xl border border-bordo/80 bg-crema-scuro/50 p-3.5">
              <p className="text-xs font-semibold text-inchiostro">
                Stima delle teglie{' '}
                <span className="font-normal text-inchiostro-tenue">
                  (facoltativa)
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-inchiostro-tenue">
                Indica i due lati di una teglia per sapere quante ne ottieni e
                quanto impasto avanza. Puoi anche lasciare entrambi i campi
                vuoti.
              </p>
              <div className="mt-2.5 grid gap-3 min-[380px]:grid-cols-2">
                <CampoNumero
                  id="stima-lato-a"
                  label="Lato A"
                  unit="cm"
                  optional
                  value={valori.farina.latoA}
                  onChange={(valore) =>
                    onCambiaCampo('farina', 'latoA', valore)
                  }
                  inputMode="decimal"
                  error={errori.latoA}
                  incremento={1}
                  minimo={1}
                  massimo={LIMITI.maxLatoTegliaCm}
                  decimali={1}
                />
                <CampoNumero
                  id="stima-lato-b"
                  label="Lato B"
                  unit="cm"
                  optional
                  value={valori.farina.latoB}
                  onChange={(valore) =>
                    onCambiaCampo('farina', 'latoB', valore)
                  }
                  inputMode="decimal"
                  error={errori.latoB}
                  incremento={1}
                  minimo={1}
                  massimo={LIMITI.maxLatoTegliaCm}
                  decimali={1}
                />
              </div>
            </div>
          ) : (
            <CampoNumero
              id="peso-panetto-farina"
              label="Peso del panetto"
              unit="g"
              optional
              value={valori.farina.pesoPanetto}
              onChange={(valore) =>
                onCambiaCampo('farina', 'pesoPanetto', valore)
              }
              inputMode="decimal"
              hint="Se lo indichi, calcoliamo i panetti interi e l’impasto residuo."
              error={errori.pesoPanetto}
              incremento={5}
              minimo={5}
              massimo={LIMITI.maxPesoPanettoG}
            />
          )}
        </div>
      ) : null}

      {ricetta.senzaPersonalizzazione === true || !mostraPersonalizzazione ? null : (
        <PannelloPersonalizzazione
          ricetta={ricetta}
          opzioni={opzioni}
          parametri={parametri}
          personalizzata={personalizzata}
          onCambia={onCambiaParametro}
          onRipristina={onRipristinaParametri}
        />
      )}

      {mostraPersonalizzazione && erroreGenerale ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-errore/40 bg-errore/10 px-3 py-2 text-sm font-medium text-errore"
        >
          {erroreGenerale}
        </p>
      ) : null}

      {/* Colori invertiti con il pulsante «Modifica ricetta»: il comando che
          genera la ricetta è ora in stile secondario, quello che apre la
          personalizzazione è pieno. */}
      {mostraPersonalizzazione ? (
        <>
      <button
        type="submit"
        className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-terracotta/40 bg-transparent px-5 py-3.5 text-base font-bold text-oro-chiaro transition-all hover:-translate-y-px hover:border-terracotta/70 hover:bg-terracotta/10 active:translate-y-0"
      >
        Calcola impasto
      </button>

      <p className="mt-2.5 text-center text-xs text-inchiostro-tenue">
        I calcoli avvengono nel tuo browser. Nessun dato viene inviato altrove.
      </p>
        </>
      ) : null}
    </form>
  );
}
