import { useMemo } from 'react';
import type { RicettaConfig, RisultatoCalcolo, TipoEsportazione } from '../types';
import { creaVistaRicetta } from '../lib/vista';
import { formattaGrammi } from '../lib/formato';
import { ElencoIngredienti } from './ElencoIngredienti';

export interface MessaggioEsportazione {
  tipo: 'successo' | 'errore';
  testo: string;
}

interface Props {
  risultato: RisultatoCalcolo;
  ricetta: RicettaConfig;
  daAggiornare: boolean;
  esportazione: TipoEsportazione | null;
  messaggio: MessaggioEsportazione | null;
  onEsporta: (tipo: TipoEsportazione) => void;
}

function Spinner({ scuro = false }: { scuro?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`h-4 w-4 animate-spin rounded-full border-2 motion-reduce:animate-none ${
        scuro
          ? 'border-crema-scuro/30 border-t-crema-scuro'
          : 'border-terracotta/30 border-t-terracotta'
      }`}
    />
  );
}

export function PannelloRisultato({
  risultato,
  ricetta,
  daAggiornare,
  esportazione,
  messaggio,
  onEsporta,
}: Props) {
  const vista = useMemo(
    () => creaVistaRicetta(risultato, ricetta),
    [risultato, ricetta],
  );
  const esportazioniBloccate =
    daAggiornare ||
    esportazione !== null ||
    risultato.ricettaId !== ricetta.id;

  return (
    <section
      aria-labelledby="risultato-titolo"
      className={`rounded-2xl border bg-crema-scuro/95 p-5 shadow-2xl shadow-ombra/40 sm:p-6 ${
        daAggiornare ? 'border-avviso/40' : 'border-terracotta/25'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.2em] text-terracotta uppercase">
            Risultato
          </p>
          <h2
            id="risultato-titolo"
            className="mt-1 font-serif text-2xl leading-snug font-bold tracking-tight text-inchiostro"
          >
            {vista.nomeRicetta}
          </h2>
          <p className="mt-1 text-sm text-inchiostro-tenue">{vista.resa}</p>
        </div>
        <span className="rounded-full border border-bordo bg-carta/60 px-2.5 py-1 text-[11px] font-semibold text-inchiostro-tenue">
          {vista.modalitaEtichetta}
        </span>
      </div>

      {daAggiornare ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-avviso/30 bg-avviso-tenue px-3 py-2.5 text-xs leading-relaxed font-semibold text-avviso"
        >
          Dati modificati: ricalcola per aggiornare la ricetta. I salvataggi sono
          disattivati finché non esegui un nuovo calcolo.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {vista.statistiche.map((statistica, indice) => (
          <div
            key={statistica.etichetta}
            className={`flex min-w-0 flex-col justify-between gap-1 rounded-xl px-3.5 py-3 ${
              indice === 0
                ? 'border border-terracotta/30 bg-oro-velo'
                : 'border border-bordo/70 bg-carta/50'
            }`}
          >
            <dt className="text-[10px] leading-tight font-semibold tracking-wider text-inchiostro-tenue uppercase">
              {statistica.etichetta}
            </dt>
            <dd
              className={`font-serif text-lg leading-tight font-bold tabular-nums ${
                indice === 0 ? 'text-oro-chiaro' : 'text-inchiostro'
              }`}
            >
              {statistica.valore}
            </dd>
          </div>
        ))}
      </dl>

      <div
        className={`mt-4 grid gap-3 ${
          vista.fasi.length > 1 ? 'sm:grid-cols-2' : ''
        }`}
      >
        {vista.fasi.map((fase, indice) => (
          <ElencoIngredienti
            key={fase.id}
            titolo={fase.titolo}
            voci={fase.voci}
            nota={fase.nota}
            avviso={fase.avviso}
            totale={fase.totale}
            className={
              vista.fasi.length === 3 && indice === 2 ? 'sm:col-span-2' : ''
            }
          />
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-bordo/50 bg-carta/25 px-3 py-2.5">
        <ul className="space-y-1.5">
          {vista.noteEssenziali.map((nota) => (
            <li
              key={nota}
              className="flex items-start gap-2 text-[11px] leading-relaxed text-inchiostro-tenue"
            >
              <span aria-hidden="true" className="mt-px font-bold text-terracotta">
                i
              </span>
              <span>{nota}</span>
            </li>
          ))}
        </ul>
        <p
          className={`text-[11px] leading-relaxed text-inchiostro-tenue ${
            vista.noteEssenziali.length > 0
              ? 'mt-2 border-t border-bordo/50 pt-2'
              : ''
          }`}
        >
          {vista.notaPeso}
        </p>
      </div>

      <div className="mt-4 border-t border-bordo/60 pt-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onEsporta('jpg')}
            disabled={esportazioniBloccate}
            aria-busy={esportazione === 'jpg'}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-bold text-su-oro shadow-lg shadow-ombra/30 transition-all hover:-translate-y-px hover:bg-oro-scuro active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-terracotta"
          >
            {esportazione === 'jpg' ? (
              <span className="flex items-center gap-2">
                <Spinner scuro />
                Preparazione…
              </span>
            ) : (
              <>
                <span>Salva ingredienti</span>
                <span className="text-[11px] font-medium opacity-85">
                  Dosi e resa, senza procedimento
                </span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onEsporta('pdf')}
            disabled={esportazioniBloccate}
            aria-busy={esportazione === 'pdf'}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-terracotta/40 bg-transparent px-4 py-2.5 text-sm font-semibold text-oro-chiaro transition-all hover:-translate-y-px hover:border-terracotta/70 hover:bg-terracotta/10 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-transparent"
          >
            {esportazione === 'pdf' ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Preparazione…
              </span>
            ) : (
              <>
                <span>Salva ricetta completa</span>
                <span className="text-[11px] font-medium opacity-85">
                  Ingredienti e procedimento
                </span>
              </>
            )}
          </button>
        </div>

        {messaggio ? (
          <p
            role={messaggio.tipo === 'errore' ? 'alert' : 'status'}
            className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed font-semibold ${
              messaggio.tipo === 'errore'
                ? 'border-errore/40 bg-errore/10 text-errore'
                : 'border-terracotta/30 bg-oro-velo text-oro-chiaro'
            }`}
          >
            {messaggio.testo}
          </p>
        ) : null}
      </div>

      <details className="group mt-3 rounded-xl border border-bordo/70 bg-carta/35">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:text-oro-chiaro focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta [&::-webkit-details-marker]:hidden">
          <span className="font-serif text-base font-bold text-inchiostro">
            Parametri e dettagli della ricetta
          </span>
          <span
            aria-hidden="true"
            className="shrink-0 text-lg leading-none font-normal text-terracotta transition-transform group-open:rotate-45 motion-reduce:transition-none"
          >
            +
          </span>
        </summary>

        <div className="border-t border-bordo/60 px-4 py-3.5">
          <dl className="grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {vista.parametri.map((parametro) => (
              <div key={parametro.etichetta} className="min-w-0">
                <dt className="text-[10px] font-semibold tracking-wider text-inchiostro-tenue uppercase">
                  {parametro.etichetta}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-inchiostro">
                  {parametro.valore}
                </dd>
              </div>
            ))}
          </dl>

          {vista.dettagli.length > 0 ? (
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-bordo/50 pt-3">
              {vista.dettagli.map((dettaglio) => (
                <div key={dettaglio.etichetta} className="min-w-0">
                  <dt className="text-[10px] font-semibold tracking-wider text-inchiostro-tenue uppercase">
                    {dettaglio.etichetta}
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold text-inchiostro tabular-nums">
                    {dettaglio.valore}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {risultato.stimaTeglie ? (
            <p className="mt-2.5 border-t border-bordo/50 pt-2 text-[11px] leading-relaxed text-inchiostro-tenue">
              Stima calcolata con una teglia da{' '}
              {risultato.stimaTeglie.latoA} × {risultato.stimaTeglie.latoB} cm e
              le opzioni correnti. Il numero è sempre arrotondato per difetto.
            </p>
          ) : null}

          <div className="mt-3 border-t border-bordo/50 pt-3">
            {vista.chiarimenti.map((chiarimento) => (
              <p
                key={chiarimento}
                className="text-xs leading-relaxed text-inchiostro-tenue"
              >
                {chiarimento}
              </p>
            ))}
          </div>
        </div>
      </details>

      <p className="sr-only" aria-live="polite">
        {vista.resa}. {formattaGrammi(risultato.pesoImpastoG)} di impasto,{' '}
        {formattaGrammi(risultato.farinaTotaleG)} di farina.
      </p>
    </section>
  );
}
