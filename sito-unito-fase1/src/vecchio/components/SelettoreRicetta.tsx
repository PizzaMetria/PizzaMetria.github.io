import type { RicettaConfig } from '../types';
import { sottotitoloRicetta, tipoImpasto } from '../lib/vista';
import { ElencoRicette } from '../../components/ElencoRicette';

interface Props {
  ricette: readonly RicettaConfig[];
  ricettaId: string;
  onCambia: (ricettaId: string) => void;
}

export function SelettoreRicetta({ ricette, ricettaId, onCambia }: Props) {
  const voci = ricette.map((ricetta) => ({
    id: ricetta.id,
    nome: ricetta.nome,
    tipo: tipoImpasto(ricetta),
    sottotitolo: sottotitoloRicetta(ricetta),
  }));

  return (
    <ElencoRicette
      idIntestazione="ricetta-selettore-titolo"
      nomeGruppo="ricetta-mie"
      voci={voci}
      scelta={ricettaId === '' ? null : ricettaId}
      onScegli={onCambia}
    />
  );
}
