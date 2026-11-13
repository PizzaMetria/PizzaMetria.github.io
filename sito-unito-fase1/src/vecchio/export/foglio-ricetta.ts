import { orarioFase } from '../../lib/orari';
import { completaCoppia, spostaOrarioBiga } from '../lib/orari';
import type { DatiFoglio, FaseFoglio, PassoFoglio } from '../../export/foglio';
import type { RicettaConfig, RisultatoCalcolo } from '../types';
import { tipsRicetta } from '../config/ricette';
import { componiProcedimento } from '../lib/procedimento';
import { creaVistaRicetta, tipoImpasto } from '../lib/vista';
import {
  formattaDataOra,
  formattaNumero,
  formattaPercentuale,
} from '../lib/formato';

/**
 * La ricetta calcolata nel foglio condiviso del sito.
 *
 * Il disegno — intestazione, riquadri, dosi, totale, firma — è lo stesso del
 * calcolatore libero: qui cambiano solo i contenuti. Le fasi degli ingredienti
 * restano separate con i loro totali, il riepilogo tecnico resta in due gruppi
 * e il procedimento viaggia passo per passo, con paragrafi, elenchi e voci:
 * niente di quello che c'era nel vecchio export va perso.
 */
export function datiFoglioRicetta(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
  data: Date = new Date(),
  /** Testo in alto a destra: cambia per gruppo, la posizione è la stessa. */
  occhiello = 'LE MIE RICETTE',
): DatiFoglio {
  const vista = creaVistaRicetta(risultato, ricetta);
  const lievito = risultato.ingredienti.find(
    (ingrediente) => ingrediente.tipo === 'lievito',
  );

  // Le percentuali le calcola la vista (dipendono dai parametri della ricetta),
  // i grammi li tiene il risultato: le due liste sono parallele, voce per voce.
  const fasi: FaseFoglio[] = vista.fasi.map((fase, indiceFase) => {
    const calcolata = risultato.fasi[indiceFase];
    return {
      titolo: fase.titolo,
      nota: fase.nota,
      avviso: fase.avviso,
      voci: fase.voci.map((voce, indiceVoce) => ({
        nome: voce.etichetta,
        tipo: voce.tipo,
        grammi: calcolata?.voci[indiceVoce]?.grammi ?? 0,
        // Nella vista la percentuale è una frazione: il foglio la vuole sul cento.
        percentuale:
          typeof voce.percentuale === 'number' ? voce.percentuale * 100 : undefined,
        base: voce.basePercentuale,
      })),
      totale:
        fase.totale && calcolata?.totale
          ? { nome: fase.totale.etichetta, grammi: calcolata.totale.grammi }
          : undefined,
    };
  });

  const passi: PassoFoglio[] = componiProcedimento(ricetta, risultato).map(
    (passo) => ({
      // Nelle ricette il passo non ha un orario: il titolo basta.
      quando: '',
      titolo: passo.titolo,
      nota: '',
      paragrafi: passo.paragrafi,
      elenco: passo.elenco,
      voci: passo.voci?.map((voce) => ({
        titolo: voce.titolo,
        paragrafi: voce.paragrafi,
      })),
    }),
  );

  const piano = risultato.pianoBiga;
  const richiesta = ricetta.motoreBiga;
  const marcia: PassoFoglio[] = [];
  if (piano && richiesta?.oreAmbienteMisto !== undefined && richiesta.oraImpasto && richiesta.oraPronta) {
    const { inizio, fine } = completaCoppia(richiesta.oraImpasto, richiesta.oraPronta, data);
    const ingressoFrigo = spostaOrarioBiga(inizio, piano.oreAmbiente);
    for (const fase of [
      { da: inizio, a: ingressoFrigo, titolo: 'Biga a temperatura ambiente', ore: piano.oreAmbiente, temperatura: piano.temperatura },
      { da: ingressoFrigo, a: fine, titolo: 'Biga in frigorifero', ore: piano.oreFrigo, temperatura: piano.temperaturaFrigo },
    ]) {
      const fineFase = orarioFase(new Date(fase.a));
      marcia.push({
        quando: '', orario: orarioFase(new Date(fase.da)), titolo: fase.titolo,
        nota: `Fino a ${fineFase.giorno} alle ${fineFase.ora} · ${formattaNumero(fase.ore, 2)} h a ${formattaNumero(fase.temperatura)} °C`,
      });
    }
  }

  const note = tipsRicetta(ricetta, risultato);

  return {
    titolo: vista.nomeRicetta,
    sottotitolo: `${vista.resa} · ${vista.descrizione}`,
    tipoLievito: tipoImpasto(ricetta),
    etichettaLievito: lievito?.etichetta ?? 'Lievito',
    lievitoG: lievito?.grammi ?? 0,
    lievitoNota:
      lievito &&
      typeof lievito.percentuale === 'number' &&
      lievito.basePercentuale
        ? `${formattaPercentuale(lievito.percentuale)} sulla ${lievito.basePercentuale}`
        : 'dose totale, già compresa nell’impasto',
    farinaG: risultato.farinaTotaleG,
    fasi,
    riepilogo: vista.riepilogoTecnico.map((gruppo) => ({
      titolo: gruppo.titolo,
      voci: gruppo.voci.map((voce) => ({
        etichetta: voce.etichetta,
        valore: voce.valore,
        valorePdf: voce.etichetta === 'Farina' ? ricetta.farinaPdf : undefined,
      })),
    })),
    totaleG: risultato.pesoImpastoG,
    totaleNota: vista.resa,
    passi,
    marcia: marcia.length > 0 ? marcia : undefined,
    note,
    noteTitolo: 'CONSIGLI',
    occhiello,
    generatoIl: `Generata il ${formattaDataOra(data)}`,
  };
}
