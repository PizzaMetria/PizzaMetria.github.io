import { temaOpposto, type Tema } from '../lib/tema';

interface Props {
  tema: Tema;
  onCambia: (tema: Tema) => void;
}

function IconaSole() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.5 1.5M17.1 17.1l1.5 1.5M18.6 5.4l-1.5 1.5M6.9 17.1l-1.5 1.5" />
    </svg>
  );
}

function IconaLuna() {
  return (
    <svg
      aria-hidden="true"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.5 14.4A8.6 8.6 0 1 1 9.6 3.5a6.9 6.9 0 0 0 10.9 10.9Z" />
    </svg>
  );
}

/** Passa dal tema chiaro a quello scuro e viceversa. */
export function SelettoreTema({ tema, onCambia }: Props) {
  const prossimo = temaOpposto(tema);

  return (
    <button
      type="button"
      onClick={() => onCambia(prossimo)}
      aria-label={`Passa al tema ${prossimo}`}
      title={`Passa al tema ${prossimo}`}
      className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-bordo bg-carta/70 px-2.5 py-1.5 text-[11px] font-semibold text-inchiostro-tenue transition-colors hover:border-terracotta/50 hover:text-oro-chiaro sm:px-3"
    >
      {tema === 'chiaro' ? <IconaSole /> : <IconaLuna />}
      <span className="hidden sm:inline">
        {tema === 'chiaro' ? 'Tema chiaro' : 'Tema scuro'}
      </span>
    </button>
  );
}
