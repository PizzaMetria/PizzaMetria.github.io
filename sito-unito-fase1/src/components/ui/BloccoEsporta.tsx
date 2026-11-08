import { AnteprimaExport } from '../AnteprimaExport';
import { Pulsante } from './Pulsante';

/**
 * IL BLOCCO DI ESPORTAZIONE, UNO SOLO
 * -----------------------------------
 * Prima esistevano due versioni dello stesso riquadro: una nel calcolatore
 * nuovo e una nel pannello risultato delle ricette. Avevano testi, spinner e
 * spaziature leggermente diversi. Ora il riquadro è questo e basta: casella
 * «Ottimizza per smartphone», due pulsanti JPG e PDF con gli stessi nomi, la
 * stessa anteprima e lo stesso messaggio di errore ovunque.
 */

export type FormatoEsportazione = 'jpg' | 'pdf';

export interface AnteprimaFile {
  tipo: FormatoEsportazione;
  nome: string;
  url: string;
  /** Immagine dello stesso foglio: al posto del PDF dove non si vede (Android). */
  immagine?: string;
}

export interface MessaggioEsporta {
  tipo: 'successo' | 'errore';
  testo: string;
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

export function BloccoEsporta({
  esportando,
  ottimizza,
  onOttimizza,
  onEsporta,
  anteprima,
  onSalva,
  onChiudi,
  bloccato = false,
  errore = null,
  messaggio = null,
}: {
  /** Formato in preparazione, o null quando è tutto fermo. */
  esportando: FormatoEsportazione | null;
  ottimizza: boolean;
  onOttimizza: (valore: boolean) => void;
  onEsporta: (formato: FormatoEsportazione) => void;
  anteprima: AnteprimaFile | null;
  onSalva: () => void;
  onChiudi: () => void;
  /** Esportazioni disattivate: c'è qualcosa da ricalcolare. */
  bloccato?: boolean;
  errore?: string | null;
  messaggio?: MessaggioEsporta | null;
}) {
  const disabilitato = bloccato || esportando !== null;

  return (
    <div className="grid gap-2.5">
      <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-xl border border-bordo/70 bg-carta/35 px-3 py-2 text-sm font-medium text-inchiostro">
        <span>Ottimizza per smartphone</span>
        <input
          type="checkbox"
          checked={ottimizza}
          onChange={(evento) => onOttimizza(evento.target.checked)}
          className="h-5 w-5 accent-terracotta"
        />
      </label>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <Pulsante
          variante="secondario"
          dimensione="alta"
          className="w-full flex-col gap-0.5"
          onClick={() => onEsporta('jpg')}
          disabilitato={disabilitato}
          ariaBusy={esportando === 'jpg'}
        >
          {esportando === 'jpg' ? (
            <span className="flex items-center gap-2">
              <Spinner />
              Preparazione…
            </span>
          ) : (
            <>
              <span>Anteprima JPG</span>
              <span className="text-[11px] font-medium text-inchiostro-tenue">
                Dosi e resa, senza procedimento
              </span>
            </>
          )}
        </Pulsante>

        <Pulsante
          variante="primario"
          dimensione="alta"
          className="w-full flex-col gap-0.5 font-bold"
          onClick={() => onEsporta('pdf')}
          disabilitato={disabilitato}
          ariaBusy={esportando === 'pdf'}
        >
          {esportando === 'pdf' ? (
            <span className="flex items-center gap-2">
              <Spinner scuro />
              Preparazione…
            </span>
          ) : (
            <>
              <span>Anteprima PDF</span>
              <span className="text-[11px] font-medium opacity-85">
                Ingredienti e procedimento
              </span>
            </>
          )}
        </Pulsante>
      </div>

      {anteprima ? (
        <AnteprimaExport
          tipo={anteprima.tipo}
          nome={anteprima.nome}
          url={anteprima.url}
          immagine={anteprima.immagine ?? null}
          onSalva={onSalva}
          onChiudi={onChiudi}
        />
      ) : null}

      {errore ? (
        <p role="alert" className="text-xs leading-relaxed text-errore">
          {errore}
        </p>
      ) : null}

      {messaggio ? (
        <p
          role={messaggio.tipo === 'errore' ? 'alert' : 'status'}
          className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed font-semibold ${
            messaggio.tipo === 'errore'
              ? 'border-errore/40 bg-errore/10 text-errore'
              : 'border-terracotta/30 bg-oro-velo text-oro-chiaro'
          }`}
        >
          {messaggio.testo}
        </p>
      ) : null}
    </div>
  );
}
