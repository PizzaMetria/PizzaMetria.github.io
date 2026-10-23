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
          ? 'border-terracotta/30 border-t-terracotta'
          : 'border-white/40 border-t-white'
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
  const grigliaStatistiche =
    vista.statistiche.length === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-2 sm:grid-cols-3';

  return (
    <section
      aria-labelledby="risultato-titolo"
      className={`rounded-3xl border bg-carta p-5 shadow-[0_1px_2px_rgba(42,33,28,0.04)] ${
        daAggiornare ? 'border-avviso/40' : 'border-bordo'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold tracking-[0.14em] text-terracotta uppercase">
            Risultato
          </p>
          <h2
            id="risultato-titolo"
            className="mt-1 text-xl leading-snug font-bold tracking-tight"
          >
            {vista.nomeRicetta}
          </h2>
          <p className="mt-1 text-sm text-inchiostro-tenue">{vista.resa}</p>
        </div>
        <span className="rounded-full border border-bordo bg-crema px-2.5 py-1 text-[11px] font-semibold text-inchiostro-tenue">
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

      <dl className={`mt-4 grid gap-2.5 ${grigliaStatistiche}`}>
        {vista.statistiche.map((statistica, indice) => (
          <div
            key={statistica.etichetta}
            className={`flex min-w-0 flex-col justify-between gap-1 rounded-2xl px-3.5 py-3 ${
              indice === 0
                ? 'border border-terracotta/20 bg-terracotta-tenue'
                : 'border border-bordo bg-crema/60'
            }`}
          >
            <dt className="text-[10.5px] leading-tight font-semibold tracking-wide text-inchiostro-tenue uppercase">
              {statistica.etichetta}
            </dt>
            <dd className="text-lg leading-tight font-bold tabular-nums">
              {statistica.valore}
            </dd>
          </div>
        ))}
      </dl>

      {vista.dettagli.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-bordo/70 bg-crema/40 p-3.5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {vista.dettagli.map((dettaglio) => (
              <div key={dettaglio.etichetta} className="min-w-0">
                <dt className="text-[10.5px] font-semibold tracking-wide text-inchiostro-tenue uppercase">
                  {dettaglio.etichetta}
                </dt>
                <dd className="mt-0.5 text-sm font-bold tabular-nums">
                  {dettaglio.valore}
                </dd>
              </div>
            ))}
          </dl>
          {risultato.stimaTeglie ? (
            <p className="mt-2.5 border-t border-bordo/60 pt-2 text-[11px] leading-relaxed text-inchiostro-tenue">
              Stima calcolata con una teglia da{' '}
              {risultato.stimaTeglie.latoA} × {risultato.stimaTeglie.latoB} cm e
              le opzioni correnti. Il numero è sempre arrotondato per difetto.
            </p>
          ) : null}
        </div>
      ) : null}

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

      <div className="mt-4 rounded-2xl border border-bordo bg-white p-4">
        <h3 className="text-base font-bold">Parametri della ricetta</h3>
        <dl className="mt-2.5 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
          {vista.parametri.map((parametro) => (
            <div key={parametro.etichetta} className="min-w-0">
              <dt className="text-[10.5px] font-semibold tracking-wide text-inchiostro-tenue uppercase">
                {parametro.etichetta}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{parametro.valore}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 border-t border-bordo/70 pt-3">
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

      <div className="mt-3 rounded-xl bg-crema/70 px-3 py-2.5">
        <ul className="space-y-1.5">
          {vista.note.map((nota) => (
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
        <p className="mt-2 border-t border-bordo/60 pt-2 text-[11px] leading-relaxed text-inchiostro-tenue">
          {vista.notaPeso}
        </p>
      </div>

      <div className="mt-4 border-t border-bordo pt-4">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onEsporta('jpg')}
            disabled={esportazioniBloccate}
            aria-busy={esportazione === 'jpg'}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-terracotta-scuro disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-terracotta"
          >
            {esportazione === 'jpg' ? (
              <>
                <Spinner />
                Generazione JPG…
              </>
            ) : (
              'Salva JPG'
            )}
          </button>

          <button
            type="button"
            onClick={() => onEsporta('pdf')}
            disabled={esportazioniBloccate}
            aria-busy={esportazione === 'pdf'}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-terracotta/40 bg-white px-4 py-3 text-sm font-semibold text-terracotta-scuro transition-colors hover:bg-terracotta-tenue disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
          >
            {esportazione === 'pdf' ? (
              <>
                <Spinner scuro />
                Generazione PDF…
              </>
            ) : (
              'Salva PDF'
            )}
          </button>
        </div>

        <p className="mt-2 text-center text-[11px] leading-relaxed text-inchiostro-tenue">
          Il JPG contiene solo nome, resa e dosi. Il PDF aggiunge procedimento,
          tempi e temperature.
        </p>

        {messaggio ? (
          <p
            role={messaggio.tipo === 'errore' ? 'alert' : 'status'}
            className={`mt-3 rounded-xl border px-3 py-2.5 text-xs leading-relaxed font-semibold ${
              messaggio.tipo === 'errore'
                ? 'border-errore/30 bg-errore/5 text-errore'
                : 'border-terracotta/25 bg-terracotta-tenue text-terracotta-scuro'
            }`}
          >
            {messaggio.testo}
          </p>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {vista.resa}. {formattaGrammi(risultato.pesoImpastoG)} di impasto,{' '}
        {formattaGrammi(risultato.farinaTotaleG)} di farina.
      </p>
    </section>
  );
}
