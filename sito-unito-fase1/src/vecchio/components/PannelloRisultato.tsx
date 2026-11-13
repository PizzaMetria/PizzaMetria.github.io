import { useMemo } from 'react';
import type { RicettaConfig, RisultatoCalcolo, TipoEsportazione } from '../types';
import { creaVistaRicetta } from '../lib/vista';
import { formattaGrammi } from '../lib/formato';
import { BloccoEsporta } from '../../components/ui/BloccoEsporta';
import { ElencoIngredienti } from './ElencoIngredienti';

export interface MessaggioEsportazione {
  tipo: 'successo' | 'errore';
  testo: string;
}

interface Props {
  risultato: RisultatoCalcolo;
  ricetta: RicettaConfig;
  daAggiornare: boolean;
  titolo?: string;
  esportazione: TipoEsportazione | null;
  messaggio: MessaggioEsportazione | null;
  ottimizzaSmartphone: boolean;
  onCambiaOttimizzaSmartphone: (valore: boolean) => void;
  onEsporta: (tipo: TipoEsportazione, smartphone: boolean) => void;
  /** File già preparato: si guarda, e si salva solo con il suo pulsante. */
  anteprima: {
    tipo: TipoEsportazione;
    nome: string;
    url: string;
  } | null;
  onSalvaAnteprima: () => void;
  onChiudiAnteprima: () => void;
}

export function PannelloRisultato({
  risultato,
  ricetta,
  daAggiornare,
  titolo,
  esportazione,
  messaggio,
  ottimizzaSmartphone,
  onCambiaOttimizzaSmartphone,
  onEsporta,
  anteprima,
  onSalvaAnteprima,
  onChiudiAnteprima,
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
      className={`rounded-2xl border bg-crema-scuro/95 p-3 shadow-2xl shadow-ombra/40 sm:p-6 ${
        daAggiornare ? 'border-avviso/40' : 'border-terracotta/25'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2
            id="risultato-titolo"
            className="mt-1 font-serif text-2xl leading-snug font-bold tracking-tight text-inchiostro"
          >
            {titolo ?? vista.nomeRicetta}
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

      {vista.noteEssenziali.length > 0 ? (
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
        </div>
      ) : null}

      {vista.ripartizione.length > 0 ? (
        <div className="mt-4 rounded-xl border border-bordo/70 bg-carta/40 px-3.5 py-3">
          <p className="font-serif text-sm font-bold text-inchiostro">
            Ripartizione indicativa per formato
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-inchiostro-tenue">
            Con questa farina ottieni indicativamente:
          </p>
          <dl className="mt-2 space-y-1.5">
            {vista.ripartizione.map((voce) => (
              <div
                key={voce.etichetta}
                className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5"
              >
                <dt className="text-xs font-semibold text-inchiostro">
                  {voce.etichetta}
                </dt>
                <dd className="text-xs text-inchiostro-tenue tabular-nums">
                  {voce.valore}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="mt-4 border-t border-bordo/60 pt-4">
        <BloccoEsporta
          esportando={esportazione}
          ottimizza={ottimizzaSmartphone}
          onOttimizza={onCambiaOttimizzaSmartphone}
          onEsporta={(formato) => onEsporta(formato, ottimizzaSmartphone)}
          bloccato={esportazioniBloccate}
          messaggio={messaggio}
          anteprima={anteprima}
          onSalva={onSalvaAnteprima}
          onChiudi={onChiudiAnteprima}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {vista.resa}. {formattaGrammi(risultato.pesoImpastoG)} di impasto,{' '}
        {formattaGrammi(risultato.farinaTotaleG)} di farina.
      </p>
    </section>
  );
}
