export function RiquadriDosi({ voci }: { voci: readonly { etichetta: string; valore: string }[] }) {
  return (
    <dl className="mt-4 grid grid-cols-3 gap-2 sm:gap-2.5">
      {voci.map((statistica, indice) => (
        <div
          key={statistica.etichetta}
          className={`flex min-w-0 flex-col justify-between gap-1 rounded-xl px-2 py-2.5 sm:px-3.5 sm:py-3 ${
            indice === 0
              ? 'border border-terracotta/30 bg-oro-velo'
              : 'border border-bordo/70 bg-carta/50'
          }`}
        >
          <dt className="text-[10px] leading-tight font-semibold tracking-wider text-inchiostro-tenue uppercase">
            {statistica.etichetta}
          </dt>
          <dd
            className={`font-serif text-base leading-tight sm:text-lg font-bold tabular-nums ${
              indice === 0 ? 'text-oro-chiaro' : 'text-inchiostro'
            }`}
          >
            {statistica.valore}
          </dd>
        </div>
      ))}
    </dl>
  );
}
