import type {
  FaseCalcolata,
  RicettaConfig,
  RisultatoCalcolo,
  TipoIngrediente,
} from '../types';
import {
  formattaGrammi,
  formattaGrammiIngrediente,
  formattaIntero,
  formattaKg,
  formattaNumero,
  formattaPercentuale,
  formattaTemperatura,
} from './formato';

export interface VoceVista {
  etichetta: string;
  valore: string;
  /** Tipo di ingrediente, usato per l'icona accanto alla dose. */
  tipo?: TipoIngrediente;
}

export interface FaseVista {
  id: string;
  titolo: string;
  nota?: string;
  avviso?: string;
  voci: VoceVista[];
  totale?: VoceVista;
}

export interface VistaRicetta {
  nomeRicetta: string;
  descrizione: string;
  modalitaEtichetta: string;
  /** Resa essenziale, usata anche come sottotitolo del JPG. */
  resa: string;
  datiPartenza: VoceVista[];
  statistiche: VoceVista[];
  riepilogo: VoceVista[];
  dettagli: VoceVista[];
  fasi: FaseVista[];
  parametri: VoceVista[];
  /** Note operative essenziali, mostrate subito dopo gli ingredienti. */
  noteEssenziali: string[];
  /** Note editoriali della ricetta, usate nel PDF completo. */
  note: string[];
  notaPeso: string;
  chiarimenti: string[];
}

const NOTA_PESO =
  'Peso teorico: quantità arrotondate; condimenti e perdite di lavorazione esclusi.';

export function grammiDi(risultato: RisultatoCalcolo, chiave: string): number {
  return (
    risultato.ingredienti.find((ingrediente) => ingrediente.chiave === chiave)
      ?.grammi ?? 0
  );
}

export function etichettaModalita(modalita: RisultatoCalcolo['modalita']): string {
  switch (modalita) {
    case 'panetti':
      return 'Per panetti';
    case 'teglie':
      return 'Per teglie';
    case 'farina':
      return 'Per farina';
  }
}

export function autolisiAttiva(risultato: RisultatoCalcolo): boolean {
  return risultato.fasi.some((fase) => fase.id === 'autolisi');
}

function formattaDimensioni(latoA: number, latoB: number): string {
  return `${formattaNumero(latoA, 2)} × ${formattaNumero(latoB, 2)} cm`;
}

function creaResa(risultato: RisultatoCalcolo): string {
  if (risultato.modalita === 'panetti') {
    const numero = formattaIntero(risultato.numeroPanetti ?? 0);
    const peso = formattaGrammi(risultato.pesoPanettoG ?? 0);
    return `${numero} ${risultato.numeroPanetti === 1 ? 'panetto' : 'panetti'} da ${peso}`;
  }

  if (risultato.modalita === 'teglie' && risultato.teglie) {
    const numeroTeglie = risultato.teglie.numeroTeglie;
    const base = `${formattaIntero(numeroTeglie)} ${
      numeroTeglie === 1 ? 'teglia' : 'teglie'
    } da ${formattaDimensioni(risultato.teglie.latoA, risultato.teglie.latoB)}`;

    return risultato.pesoPerTegliaG === null
      ? base
      : `${base} · ${formattaGrammi(
          risultato.pesoPerTegliaG,
        )} di impasto per teglia`;
  }

  const farinaKg =
    risultato.datiPartenza.modalita === 'farina'
      ? risultato.datiPartenza.farinaKg ?? risultato.farinaTotaleG / 1000
      : risultato.farinaTotaleG / 1000;

  const base = `Dosi per ${formattaNumero(farinaKg, 3)} kg di farina`;
  if (risultato.panettiInteri !== null && risultato.pesoPanettoG !== null) {
    return `${base} · ${formattaIntero(
      risultato.panettiInteri,
    )} panetti da ${formattaGrammi(risultato.pesoPanettoG)}`;
  }
  return base;
}

function creaDatiPartenza(risultato: RisultatoCalcolo): VoceVista[] {
  const voci: VoceVista[] = [];
  const dati = risultato.datiPartenza;

  if (dati.modalita === 'panetti') {
    voci.push(
      { etichetta: 'Numero di panetti', valore: formattaIntero(dati.numeroPanetti ?? 0) },
      {
        etichetta: 'Peso di ciascun panetto',
        valore: formattaGrammi(dati.pesoPanettoG ?? 0),
      },
    );
  } else if (dati.modalita === 'teglie') {
    voci.push(
      {
        etichetta: 'Dimensioni della teglia',
        valore: formattaDimensioni(dati.latoA ?? 0, dati.latoB ?? 0),
      },
      {
        etichetta: 'Numero di teglie',
        valore: formattaIntero(dati.numeroTeglie ?? 0),
      },
    );
  } else {
    voci.push({
      etichetta: 'Farina totale',
      valore: formattaKg(dati.farinaKg ?? risultato.farinaTotaleG / 1000),
    });
    if (dati.pesoPanettoG != null) {
      voci.push({
        etichetta: 'Peso del panetto',
        valore: formattaGrammi(dati.pesoPanettoG),
      });
    }
    if (dati.stimaTeglia) {
      voci.push({
        etichetta: 'Stima teglie',
        valore: formattaDimensioni(
          dati.stimaTeglia.latoA,
          dati.stimaTeglia.latoB,
        ),
      });
    }
  }

  return voci;
}

function creaStatistiche(risultato: RisultatoCalcolo): VoceVista[] {
  return [
    {
      etichetta: 'Farina totale',
      valore: formattaGrammiIngrediente(risultato.farinaTotaleG, 'farina'),
    },
    {
      etichetta: 'Peso teorico totale',
      valore: formattaGrammi(risultato.pesoImpastoG),
    },
    {
      etichetta: 'Idratazione totale',
      valore: formattaPercentuale(
        risultato.acquaTotaleG / risultato.farinaTotaleG,
      ),
    },
  ];
}

/**
 * Dettagli secondari del dimensionamento: la resa e gli indicatori coprono già
 * panetti, teglie e loro dimensioni, quindi qui restano solo i valori in più.
 */
function creaDettagli(risultato: RisultatoCalcolo): VoceVista[] {
  const voci: VoceVista[] = [];

  if (risultato.modalita === 'farina') {
    if (risultato.residuoG !== null) {
      voci.push({
        etichetta: 'Impasto residuo',
        valore: formattaGrammi(risultato.residuoG),
      });
    }
    if (risultato.stimaTeglie) {
      voci.push(
        {
          etichetta: 'Teglie intere (stima)',
          valore: formattaIntero(risultato.stimaTeglie.intere),
        },
        {
          etichetta: 'Impasto residuo (stima)',
          valore: formattaGrammi(risultato.stimaTeglie.residuoG),
        },
      );
    }
  }

  return voci;
}

function creaFasi(risultato: Pick<RisultatoCalcolo, 'fasi'>): FaseVista[] {
  return risultato.fasi.map((fase: FaseCalcolata) => ({
    id: fase.id,
    titolo: fase.titolo,
    nota: fase.nota,
    avviso: fase.avviso,
    voci: fase.voci.map((voce) => ({
      etichetta: voce.etichetta,
      valore: formattaGrammiIngrediente(voce.grammi, voce.tipo),
      tipo: voce.tipo,
    })),
    totale: fase.totale
      ? {
          etichetta: fase.totale.etichetta,
          valore: formattaGrammi(fase.totale.grammi),
        }
      : undefined,
  }));
}

/** Il malto è riferito alla biga, tranne negli impasti diretti. */
function baseMalto(ricetta: RicettaConfig): string {
  return ricetta.famiglia === 'diretto'
    ? 'della farina totale'
    : 'della farina della biga';
}

function creaParametri(
  ricetta: RicettaConfig,
  risultato: RisultatoCalcolo,
): VoceVista[] {
  // L'idratazione totale è già uno dei tre indicatori: qui restano i parametri
  // secondari, per non ripetere lo stesso valore nella sezione richiudibile.
  const parametri: VoceVista[] = [];

  if (ricetta.famiglia === 'diretto') {
    if (ricetta.tegliaRiferimento) {
      parametri.push({
        etichetta: 'Teglia di riferimento',
        valore: formattaDimensioni(
          ricetta.tegliaRiferimento.latoA,
          ricetta.tegliaRiferimento.latoB,
        ),
      });
    }
    parametri.push(
      {
        etichetta: 'Farina',
        valore: ricetta.farinaDescrizione,
      },
      {
        etichetta: 'Farina della dose base',
        valore: formattaGrammi(ricetta.farinaBaseG ?? 0),
      },
    );
    return parametri;
  }

  parametri.push(
    {
      etichetta: 'Farina nella biga',
      valore: `${formattaPercentuale(
        ricetta.quotaFarinaBiga ?? 0,
      )} della farina totale`,
    },
    {
      etichetta: 'Farina',
      valore: ricetta.farinaDescrizione,
    },
  );

  if (ricetta.idratazioneBiga !== undefined) {
    parametri.push({
      etichetta: 'Idratazione della biga',
      valore: formattaPercentuale(ricetta.idratazioneBiga),
    });
  }

  if (ricetta.percentualeMalto !== undefined) {
    parametri.push({
      etichetta: 'Malto',
      valore: `${formattaPercentuale(
        ricetta.percentualeMalto,
      )} ${baseMalto(ricetta)}`,
    });
  }

  if (ricetta.autolisiOpzionale || ricetta.famiglia === 'biga-autolisi') {
    parametri.push({
      etichetta: 'Autolisi',
      valore: autolisiAttiva(risultato)
        ? 'Attiva'
        : ricetta.autolisiOpzionale
          ? 'Non attiva'
          : 'Inclusa',
    });
  }

  if (ricetta.oreBiga != null) {
    const temperatura =
      ricetta.temperaturaConservazioneBiga != null
        ? ` a ${formattaTemperatura(ricetta.temperaturaConservazioneBiga)}`
        : '';
    parametri.push({
      etichetta: 'Conservazione della biga',
      valore: `${formattaIntero(ricetta.oreBiga)} ore${temperatura}`,
    });
  }

  if (ricetta.temperaturaChiusuraBiga != null) {
    parametri.push({
      etichetta: 'Temperatura di chiusura',
      valore: formattaTemperatura(ricetta.temperaturaChiusuraBiga),
    });
  }

  return parametri;
}

function creaChiarimenti(
  ricetta: RicettaConfig,
  risultato: RisultatoCalcolo,
): string[] {
  if (ricetta.famiglia === 'diretto') {
    return [
      'L’acqua indicata è l’acqua totale dell’impasto: non ci sono aggiunte separate.',
      'Le dosi si riferiscono alla teglia di riferimento e vengono scalate in proporzione alla superficie.',
    ];
  }

  const chiarimenti = [
    'La percentuale di biga indica la quota della farina totale utilizzata nella biga.',
    'L’idratazione della biga è riferita alla sola farina della biga.',
    'L’idratazione totale è il rapporto fra acqua totale e farina totale.',
    'L’acqua delle fasi successive alla biga è compresa nell’acqua totale: non è un’aggiunta separata.',
  ];

  if (ricetta.percentualeMalto !== undefined) {
    chiarimenti.push('Il malto indicato è già incluso nelle dosi.');
  }

  if (autolisiAttiva(risultato) && ricetta.famiglia === 'biga-autolisi') {
    chiarimenti.push(
      'Biga e autolisi sono già incluse nel peso dell’impasto: non vanno sommate una seconda volta.',
    );
  }

  return chiarimenti;
}

/**
 * Unica fonte di verità per le quantità mostrate ed esportate.
 * Riceve il risultato del motore e produce solo stringhe formattate.
 */
export function creaVistaRicetta(
  risultato: RisultatoCalcolo,
  ricetta: RicettaConfig,
): VistaRicetta {
  const statistiche = creaStatistiche(risultato);
  const dettagli = creaDettagli(risultato);
  const riepilogo = [...statistiche, ...dettagli];

  return {
    nomeRicetta: ricetta.nome,
    descrizione: ricetta.descrizione,
    modalitaEtichetta: etichettaModalita(risultato.modalita),
    resa: creaResa(risultato),
    datiPartenza: creaDatiPartenza(risultato),
    statistiche,
    riepilogo,
    dettagli,
    fasi: creaFasi(risultato),
    parametri: creaParametri(ricetta, risultato),
    noteEssenziali: [...(ricetta.noteEssenziali ?? [])],
    note: [...ricetta.note],
    notaPeso: NOTA_PESO,
    chiarimenti: creaChiarimenti(ricetta, risultato),
  };
}

/** Parametri sintetici mostrati nella scheda della ricetta attiva. */
export function parametriScheda(ricetta: RicettaConfig): VoceVista[] {
  if (ricetta.famiglia === 'diretto') {
    return [
      {
        etichetta: 'Idratazione',
        valore: formattaPercentuale(ricetta.idratazioneTotale),
      },
      {
        etichetta: 'Farina',
        valore: ricetta.farinaDescrizione,
      },
      {
        etichetta: 'Teglia di riferimento',
        valore: ricetta.tegliaRiferimento
          ? formattaDimensioni(
              ricetta.tegliaRiferimento.latoA,
              ricetta.tegliaRiferimento.latoB,
            )
          : '—',
      },
      {
        etichetta: 'Farina della dose base',
        valore: formattaGrammi(ricetta.farinaBaseG ?? 0),
      },
    ];
  }

  const parametri: VoceVista[] = [
    {
      etichetta: 'Idratazione totale',
      valore: formattaPercentuale(ricetta.idratazioneTotale),
    },
    {
      etichetta: 'Farina nella biga',
      valore: formattaPercentuale(ricetta.quotaFarinaBiga ?? 0),
    },
    {
      etichetta: 'Farina',
      valore: ricetta.farinaDescrizione,
    },
  ];

  if (ricetta.percentualeMalto !== undefined) {
    parametri.push({
      etichetta: 'Malto',
      valore: `${formattaPercentuale(
        ricetta.percentualeMalto,
      )} ${baseMalto(ricetta)}`,
    });
  }

  if (ricetta.autolisiOpzionale || ricetta.famiglia === 'biga-autolisi') {
    parametri.push({
      etichetta: 'Autolisi',
      valore: ricetta.autolisiOpzionale ? 'Facoltativa' : 'Inclusa',
    });
  }

  const conservazione =
    ricetta.oreBiga != null
      ? `${formattaIntero(ricetta.oreBiga)} ore${
          ricetta.temperaturaConservazioneBiga != null
            ? ` · ${formattaTemperatura(
                ricetta.temperaturaConservazioneBiga,
              )}`
            : ' in frigorifero'
        }`
      : null;

  if (conservazione) {
    parametri.push({
      etichetta: 'Conservazione biga',
      valore: conservazione,
    });
  }

  return parametri;
}
