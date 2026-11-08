import { useState } from 'react';
import AppVecchio from '../vecchio/App';
import { RICETTE } from '../vecchio/config/ricette';
import { SelettoreRicetta } from '../vecchio/components/SelettoreRicetta';

/**
 * Il vecchio sito dentro la pagina unica: prima solo il tab «Scegli la
 * ricetta»; scelta la ricetta, sotto carica tutta la ricetta del vecchio sito
 * — scheda, dosi, calcolo ed export — e resta solo un tasto discreto per
 * cambiarla.
 */
export function VecchioSito({
  onScelta,
}: {
  /** Avvisa la pagina unica che una ricetta è aperta (serve al tasto indietro). */
  onScelta?: (ricettaId: string | null) => void;
} = {}) {
  const [ricettaId, setRicettaId] = useState<string | null>(null);

  return (
    <div className="grid min-w-0 gap-4">
      {ricettaId === null ? (
        <SelettoreRicetta
          ricette={RICETTE}
          ricettaId=""
          onCambia={(id) => {
            setRicettaId(id);
            onScelta?.(id);
          }}
        />
      ) : (
        <div className="passo-entra">
          <AppVecchio
            key={ricettaId}
            ricettaIniziale={ricettaId}
            senzaTestata
            senzaSelettore
          />
        </div>
      )}
    </div>
  );
}
