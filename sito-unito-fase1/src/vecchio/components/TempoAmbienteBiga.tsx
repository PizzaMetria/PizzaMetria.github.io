import { CampoNumero } from './CampoNumero';
import { ingressoFrigoDaOre, oreDaIngressoFrigo } from '../lib/orari';

interface Props {
  id: string;
  inizio: string;
  fine: string;
  ore: string;
  onChange: (ore: string) => void;
}

/** I due campi modificano lo stesso valore usato dal motore e dagli export. */
export function TempoAmbienteBiga({ id, inizio, fine, ore, onChange }: Props) {
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <CampoNumero
        id={id}
        label="Tempo a temperatura ambiente"
        unit="h"
        value={ore}
        onChange={onChange}
        inputMode="decimal"
        incremento={0.5}
        minimo={0.5}
        decimali={2}
      />
      <div className="min-w-0">
        <label htmlFor={`${id}-ingresso-frigo`} className="mb-1 block text-sm font-medium text-inchiostro">
          Metti in frigorifero
        </label>
        <input
          id={`${id}-ingresso-frigo`}
          type="datetime-local"
          step={60}
          value={ingressoFrigoDaOre(inizio, ore)}
          min={ingressoFrigoDaOre(inizio, String(1 / 60))}
          max={ingressoFrigoDaOre(fine, String(-1 / 60))}
          onChange={(evento) => onChange(oreDaIngressoFrigo(inizio, evento.target.value))}
          className="min-h-11 w-full min-w-0 rounded-xl border border-bordo bg-carta px-3 py-2 text-sm text-inchiostro"
        />
      </div>
    </div>
  );
}
