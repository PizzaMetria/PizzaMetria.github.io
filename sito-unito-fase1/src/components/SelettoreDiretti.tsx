import { IMPASTI } from '../config/impasti';
import { ElencoRicette } from './ElencoRicette';
import type { TipoImpasto } from '../types';

const VOCI = IMPASTI.map((impasto) => ({
  id: impasto.id,
  nome: impasto.nome,
  tipo: 'Diretto',
  sottotitolo: impasto.sottotitolo,
}));

/**
 * Il tab del nuovo sito: la stessa lista di «Le mie ricette», con le tre
 * dirette. Dentro la fisarmonica di PaginaUnica, così la scelta della
 * categoria resta un titolo e le ricette un elenco.
 */
export function SelettoreDiretti({
  scelto,
  onScegli,
}: {
  scelto: TipoImpasto | null;
  onScegli: (id: TipoImpasto) => void;
}) {
  return (
    <ElencoRicette
      idIntestazione="ricetta-selettore-titolo"
      nomeGruppo="ricetta-diretto"
      voci={VOCI}
      scelta={scelto}
      onScegli={onScegli}
    />
  );
}
