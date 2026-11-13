/**
 * LA SOLA BIGA
 * ============
 * Il motore della biga senza ricetta intorno: si parte dai chili di farina e
 * dall'attesa (ora di impasto → ora di biga pronta), il motore decide
 * l'idratazione e la ripartizione fra ambiente e frigorifero.
 *
 * Il risultato è un `RisultatoCalcolo` con una configurazione sintetica, così
 * scheda, PDF e JPG restano gli stessi del resto del sito: non c'è un secondo
 * impaginatore da tenere allineato.
 */

import type {
  FaseCalcolata,
  IngredienteCalcolato,
  RicettaConfig,
  RisultatoCalcolo,
  TipoLievito,
} from '../types';
import { etichettaLievito } from '../config/ricette';
import { piano as pianoMotore } from './motore-biga';
import type { Piano } from './motore-biga';

export { oreAttesa } from './motore-biga';

/**
 * Ore fra due istanti «YYYY-MM-DDTHH:MM» (input datetime-local). A differenza
 * di `oreAttesa`, che lavora sulle ore del giorno, qui il giorno è scritto per
 * intero: 2 novembre 20:00 → 4 novembre 08:00 sono 36 ore.
 */
export function oreTraDate(inizio: string, fine: string): number | null {
  const a = new Date(inizio);
  const b = new Date(fine);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;

  const ore = (b.getTime() - a.getTime()) / 3_600_000;
  return ore >= 0 ? ore : null;
}
import { testoMaturazione } from './vista';
import { consiglioForza } from './forza-biga';

/** Lievito fresco sulla farina della biga, come nelle ricette di casa. */
export const LIEVITO_FRESCO_SU_FARINA = 0.01;
/** Il lievito secco è 0,6 volte il fresco, come nelle altre ricette del sito. */
export const FATTORE_LIEVITO_SECCO = 0.6;

export const BIGA_SOLA_ID = 'biga-sola';

export interface RichiestaBigaSola {
  /** Farina della biga, in chilogrammi. */
  farinaKg: number;
  /** Temperatura dell'ambiente, in °C. */
  temperatura: number;
  /** Temperatura del frigorifero, in °C. */
  temperaturaFrigo: number;
  /** Attesa dall'impasto alla biga pronta, in ore (anche decimali). */
  ore: number;
  lievito: TipoLievito;
}

export interface EsitoBigaSola {
  risultato: RisultatoCalcolo;
  config: RicettaConfig;
  piano: Piano;
}

/** La configurazione sintetica: serve a vista ed export, non al calcolo. */
function configurazione(
  piano: Piano,
  richiesta: RichiestaBigaSola,
): RicettaConfig {
  // Nella sola biga non ci sono sale né olio, e l'idratazione è quella del
  // prefermento: la correzione degli ingredienti usa questi valori.
  const forza = consiglioForza(
    piano,
    { idratazione: piano.idratazione, sale: 0, olio: 0 },
    1,
  );

  return {
    id: BIGA_SOLA_ID,
    slug: 'biga',
    nome: 'Biga',
    descrizione:
      'Solo prefermento: farina, acqua e lievito. L’idratazione varia in base a tempi e temperature, per avere sempre un prefermento maturo.',
    sottotitolo: `${testoMaturazione(piano)} · biga al ${piano.idratazione}%`,
    famiglia: 'biga-rinfresco',
    modalita: ['farina'],
    fasi: [{ id: 'biga', titolo: 'Biga', nota: 'Da preparare' }],

    idratazioneTotale: piano.idratazione / 100,
    percentualeOlio: 0,
    percentualeSale: 0,
    quotaFarinaBiga: 1,
    idratazioneBiga: piano.idratazione / 100,
    lievitoFrescoSuFarinaBiga: LIEVITO_FRESCO_SU_FARINA,
    fattoreLievitoSecco: FATTORE_LIEVITO_SECCO,

    farinaEtichetta: 'Farina',
    // Il W dipende dalle ore che l'utente ha chiesto: la biga dura quanto matura,
    // e la farina deve reggere quella durata, non un «almeno 300» fissato.
    farinaDescrizione: forza.riga,

    oreBiga: piano.oreTotali,
    motoreBiga: {
      temperatura: richiesta.temperatura,
      ore: richiesta.ore,
      temperaturaFrigo: richiesta.temperaturaFrigo,
    },
    temperaturaConservazioneBiga: richiesta.temperaturaFrigo,
    temperaturaChiusuraBiga: null,

    tempiETemperature: [
      { etichetta: 'Biga', valore: testoMaturazione(piano) },
      {
        etichetta: 'Temperatura di chiusura',
        valore: '22–23 °C, come per un impasto normale',
      },
      {
        etichetta: 'Conservazione',
        valore: `Contenitore ermetico, ${richiesta.temperaturaFrigo} °C in frigorifero`,
      },
    ],

    procedimento: [
      {
        titolo: 'Prepara la Biga',
        paragrafi: [
          'Mescola la farina da {farinaBiga} con l’acqua da {acquaBiga} ({idratazioneBiga} di idratazione) e il lievito da {lievito}. Il composto deve risultare grezzo ma uniforme, senza essere lavorato a lungo.',
          'La temperatura della biga a fine impasto dovrebbe stare intorno ai 22–23 °C: se la farina è fredda, usa acqua tiepida per arrivarci.',
        ],
      },
      {
        titolo: 'Lascia maturare',
        paragrafi: [
          'Chiudi la biga in un contenitore ermetico e lasciala maturare {maturazioneBiga}. Se hai scelto la maturazione in frigorifero, usala direttamente nell’impasto finale: non serve riportarla a temperatura ambiente.',
        ],
      },
      {
        titolo: 'Come si usa',
        paragrafi: [
          'La biga pronta si unisce alla farina, all’acqua e agli altri ingredienti della tua ricetta: qui non ci sono sale, olio e dosi dell’impasto finale.',
        ],
      },
    ],

    note: [
      'Il lievito è l’1% della farina della biga; il secco è 0,6 volte il fresco.',
      'Questa scheda calcola solo la biga: l’impasto finale si fa con la tua ricetta.',
    ],
    tips: [
      forza.frase,
      'Più l’attesa è lunga, più il motore asciuga la biga: sotto il 45% di idratazione il composto resta sbriciolato e va solo mescolato, non impastato.',
      'Se l’attesa è fuori misura, accorciala o abbassa la temperatura prima di allungare il frigorifero: è il consiglio che dà il motore.',
      'Tieni la biga in un contenitore largo e basso: in frigorifero cresce poco, ma resta più uniforme.',
    ],
  };
}

export function calcolaBigaSola(richiesta: RichiestaBigaSola): EsitoBigaSola {
  const piano = pianoMotore({
    temperatura: richiesta.temperatura,
    temperaturaFrigo: richiesta.temperaturaFrigo,
    oreTotali: richiesta.ore,
  });

  const farina = Math.max(0, richiesta.farinaKg) * 1000;
  const acqua = (farina * piano.idratazione) / 100;
  const lievitoFresco = farina * LIEVITO_FRESCO_SU_FARINA;
  const lievito =
    lievitoFresco *
    (richiesta.lievito === 'secco' ? FATTORE_LIEVITO_SECCO : 1);

  const voci: IngredienteCalcolato[] = [
    {
      chiave: 'farina-biga',
      etichetta: 'Farina',
      grammi: farina,
      tipo: 'farina',
      faseId: 'biga',
    },
    {
      chiave: 'acqua-biga',
      etichetta: 'Acqua',
      grammi: acqua,
      tipo: 'acqua',
      faseId: 'biga',
    },
    {
      chiave: 'lievito',
      etichetta: etichettaLievito(richiesta.lievito),
      grammi: lievito,
      tipo: 'lievito',
      faseId: 'biga',
    },
  ];

  const peso = voci.reduce((totale, voce) => totale + voce.grammi, 0);

  const fasi: FaseCalcolata[] = [
    {
      id: 'biga',
      titolo: 'Biga',
      nota: 'Da preparare',
      voci,
      totale: { etichetta: 'Biga pronta', grammi: peso },
    },
  ];

  const config = configurazione(piano, richiesta);

  const risultato: RisultatoCalcolo = {
    ricettaId: BIGA_SOLA_ID,
    famiglia: 'biga-rinfresco',
    config,
    modalita: 'farina',
    datiPartenza: { modalita: 'farina', farinaKg: richiesta.farinaKg },
    fasi,
    ingredienti: voci,
    farinaTotaleG: farina,
    acquaTotaleG: acqua,
    pesoImpastoG: peso,
    fattorePeso: farina > 0 ? peso / farina : 1,
    numeroPanetti: null,
    pesoPanettoG: null,
    panettiInteri: null,
    residuoG: null,
    teglie: null,
    pesoPerTegliaG: null,
    stimaTeglie: null,
    pesoBigaG: peso,
    pianoBiga: piano,
  };

  return { risultato, config, piano };
}
