import { FRIGO, oltreModello, type Piano } from '../lib/motore-biga';

export function SceltaFrigoBiga({
  piano, dateValide, inizioValido, scelta, onAttiva, onDisattiva, onAutomatico, misto,
}: {
  piano: Piano;
  dateValide: boolean;
  inizioValido: boolean;
  misto?: { attivo: boolean; onSeleziona: () => void };
  scelta: boolean | undefined;
  onAutomatico: () => void;
  onAttiva: () => void;
  onDisattiva: () => void;
}) {
  const inFrigo = piano.oreFrigo > 0;
  const disponibile = dateValide && !oltreModello(piano.temperatura);
  return (
    <div className="mt-3 space-y-2 text-xs">
      <fieldset disabled={!misto && !disponibile}>
        <legend className="mb-1.5 font-semibold text-inchiostro">{misto ? 'Dove matura la biga?' : 'Maturazione tutta in frigo'}</legend>
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-bordo bg-crema-scuro p-1">
          {[
            { nome: 'Automatico', valore: undefined, azione: onAutomatico },
            { nome: misto ? '24 ore in frigo' : 'Sì', valore: true, azione: onAttiva },
            { nome: misto ? 'Solo ambiente' : 'No', valore: false, azione: onDisattiva },
          ].map(({ nome, valore, azione }) => (
            <button
              key={nome}
              type="button"
              disabled={valore === true && !inizioValido}
              aria-pressed={!misto?.attivo && scelta === valore}
              onClick={azione}
              className={`min-h-10 flex-1 rounded-md border px-2 font-semibold disabled:opacity-50 ${!misto?.attivo && scelta === valore
                ? 'border-terracotta/60 bg-terracotta-tenue text-oro-chiaro'
                : 'border-transparent text-inchiostro-tenue hover:border-terracotta/40'}`}
            >
              {nome}
            </button>
          ))}
          {misto ? (
            <button
              type="button"
              aria-pressed={misto.attivo}
              onClick={misto.onSeleziona}
              className={`min-h-10 flex-1 rounded-md border px-2 font-semibold ${misto.attivo
                ? 'border-terracotta/60 bg-terracotta-tenue text-oro-chiaro'
                : 'border-transparent text-inchiostro-tenue hover:border-terracotta/40'}`}
            >
              Ambiente + frigo
            </button>
          ) : null}
        </div>
      </fieldset>
      {!misto?.attivo && disponibile && scelta === undefined && piano.stato === 'ok' ? (
        <p className="text-inchiostro-tenue">Piano automatico: {inFrigo ? 'tutta in frigo' : 'a temperatura ambiente'}.</p>
      ) : null}
      {!misto && disponibile && !inFrigo ? (
        <p>Attivando il frigo, la biga sarà pronta dopo {FRIGO.massimoOre} ore.</p>
      ) : null}
      {!misto && disponibile && piano.stato === 'troppo-lungo' ? (
        <button
          type="button"
          className="min-h-10 rounded-lg border border-terracotta px-3 font-semibold text-oro-chiaro"
          onClick={onAttiva}
        >
          Fai maturare la biga in frigo ({FRIGO.massimoOre} ore)
        </button>
      ) : null}
    </div>
  );
}
