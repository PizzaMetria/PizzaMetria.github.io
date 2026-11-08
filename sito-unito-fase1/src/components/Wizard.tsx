import type { ReactNode } from 'react';
import { NavigazionePassi } from './Passi';

export interface Passo {
  nome: string;
  contenuto: ReactNode;
}

interface NavigazioneProps {
  passi: readonly string[];
  attivo: number;
  onCambia: (indice: number) => void;
  bloccaAvanti?: boolean;
  notaAvanti?: string;
}

/**
 * Barra di avanzamento e tasti avanti/indietro.
 *
 * Sul telefono è la navigazione vera del calcolatore: si vede un passo per
 * volta, con il tasto per tornare indietro sempre a portata di pollice. Sul
 * desktop la stessa barra chiude il passo corrente.
 */
export function Navigazione({
  passi,
  attivo,
  onCambia,
  bloccaAvanti = false,
  notaAvanti,
}: NavigazioneProps) {
  const ultimo = passi.length - 1;

  return (
    <NavigazionePassi
      passi={passi}
      attivo={attivo}
      onIndietro={attivo === 0 ? undefined : () => onCambia(attivo - 1)}
      onAvanti={() => onCambia(Math.min(ultimo, attivo + 1))}
      etichettaAvanti={attivo === ultimo - 1 ? 'Risultato' : 'Avanti'}
      bloccaAvanti={bloccaAvanti}
      notaAvanti={notaAvanti}
    />
  );
}

interface WizardProps {
  passi: readonly Passo[];
  attivo: number;
  onCambia: (indice: number) => void;
}

/** Un passo per volta, con la navigazione in fondo. */
export function Wizard({ passi, attivo, onCambia }: WizardProps) {
  return (
    <div className="space-y-4">
      {passi[attivo]?.contenuto}
      <Navigazione passi={passi.map((passo) => passo.nome)} attivo={attivo} onCambia={onCambia} />
    </div>
  );
}
