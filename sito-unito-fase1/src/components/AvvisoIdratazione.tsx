import { avvisoIdratazione, testoSicurezza } from '../config/idratazioni';
import { Avviso } from './ui/Avviso';

/**
 * L'avviso di idratazione fuori intervallo: compare solo quando si esce dal
 * range sicuro della voce scelta e non blocca il calcolo. La regola sta tutta
 * in `config/idratazioni.ts`; qui c'è soltanto il disegno.
 */
export function AvvisoIdratazione({
  ricettaId,
  idratazione,
  className = '',
}: {
  ricettaId: string;
  idratazione: number | null | undefined;
  className?: string;
}) {
  const avviso = avvisoIdratazione(ricettaId, idratazione);
  if (!avviso) return null;

  return (
    <Avviso
      className={className}
      testo={avviso.testo}
      dettaglio={testoSicurezza(ricettaId)}
    />
  );
}
