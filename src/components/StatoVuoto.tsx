const VANTAGGI = [
  'Dosi in grammi divise per fase, quando la ricetta lo prevede',
  'Peso teorico, panetti o teglie ottenibili',
  'JPG con le dosi e PDF con il procedimento completo',
];

export function StatoVuoto() {
  return (
    <section
      aria-labelledby="stato-vuoto-titolo"
      className="flex h-full min-h-80 flex-col justify-center rounded-3xl border border-dashed border-bordo bg-white/70 p-6 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-2xl bg-terracotta-tenue text-terracotta"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3 3.6 19.4a1 1 0 0 0 1.3 1.3L21.3 12.4A9.5 9.5 0 0 0 12 3Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="12.6" cy="9.4" r="1.2" fill="currentColor" />
          <circle cx="10" cy="13.6" r="1.2" fill="currentColor" />
          <circle cx="15.6" cy="13.2" r="1.2" fill="currentColor" />
        </svg>
      </div>

      <h2 id="stato-vuoto-titolo" className="mt-4 text-lg font-bold tracking-tight">
        Il tuo impasto, pronto da salvare
      </h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-inchiostro-tenue">
        Scegli una ricetta, inserisci i dati nel calcolatore e ritrova qui le dosi,
        il peso teorico e i pulsanti per salvare la ricetta.
      </p>

      <ul className="mt-4 space-y-2">
        {VANTAGGI.map((vantaggio) => (
          <li key={vantaggio} className="flex items-start gap-2 text-sm">
            <span aria-hidden="true" className="font-bold text-terracotta">
              ✓
            </span>
            <span className="text-inchiostro">{vantaggio}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
