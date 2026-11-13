import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  RICETTA_TUTTOFARE,
} from '../config/ricette';
import {
  CHIAVE_STATO,
  aggiornaValoriValidi,
  caricaStato,
  salvaStato,
  valoriIniziali,
} from './persistenza';

function archivioFinto(iniziale?: string) {
  const mappa = new Map<string, string>();
  if (iniziale !== undefined) mappa.set(CHIAVE_STATO, iniziale);

  return {
    getItem: (chiave: string) => mappa.get(chiave) ?? null,
    setItem: (chiave: string, valore: string) => {
      mappa.set(chiave, valore);
    },
    leggi: () => mappa.get(CHIAVE_STATO),
  };
}

describe('persistenza locale per ricetta', () => {
  it('inizializza tutte le ricette quando non c’è nulla di salvato', () => {
    const stato = caricaStato(archivioFinto());
    expect(stato.ricettaId).toBe(RICETTA_TEGLIA_BIGA.id);
    expect(Object.keys(stato.ricette)).toHaveLength(4);

    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].modalita).toBe('teglie');
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].valori).toEqual(
      valoriIniziali(RICETTA_TEGLIA_BIGA.id),
    );
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].valori.panetti).toEqual({
      numeroPanetti: '3',
      pesoPanetto: '710',
    });
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].opzioni).toEqual({
      tipoLievito: 'fresco',
      autolisi: true,
      biga: {
        temperatura: 20,
        tuttaInFrigo: true,
        ore: 24,
        temperaturaFrigo: 4,
        oraImpasto: '08:00',
        oraPronta: '08:00',
      },
    });

    expect(stato.ricette[RICETTA_TRANCIO.id].modalita).toBe('teglie');
    expect(stato.ricette[RICETTA_TRANCIO.id].valori.teglie).toEqual({
      latoA: '30',
      latoB: '40',
      numeroTeglie: '1',
    });

    expect(stato.ricette[RICETTA_CANOTTO.id].valori.panetti).toEqual({
      numeroPanetti: '3',
      pesoPanetto: '280',
    });
    expect(stato.ricette[RICETTA_CANOTTO.id].opzioni).toEqual({
      tipoLievito: 'fresco',
      autolisi: true,
      biga: {
        temperatura: 20,
        tuttaInFrigo: true,
        ore: 24,
        temperaturaFrigo: 4,
        oraImpasto: '08:00',
        oraPronta: '08:00',
      },
    });

    // Il calcolatore misto parte con tutti i formati a zero: si sceglie
    // dall’elenco a fisarmonica; teglietta e stampo partono dalle misure di
    // riferimento.
    expect(stato.ricette[RICETTA_TUTTOFARE.id].modalita).toBe('prodotti');
    expect(stato.ricette[RICETTA_TUTTOFARE.id].valori.prodotti).toEqual({
      pizzette: { quantita: '0', peso: '50' },
      panini: { quantita: '0', peso: '90' },
      focacce: { quantita: '0', peso: '200', dimA: '24' },
      bauletti: { quantita: '0', peso: '500', dimA: '20', dimB: '10' },
      'focacce-teglia': { quantita: '0', peso: '530', dimA: '30', dimB: '40' },
    });
  });

  it('ripristina ricetta selezionata, modalità e valori di ciascuna ricetta', () => {
    const archivio = archivioFinto(
      JSON.stringify({
        versione: 3,
        ricettaId: RICETTA_TRANCIO.id,
        ricette: {
          [RICETTA_TRANCIO.id]: {
            modalita: 'farina',
            valori: {
              farina: { farinaKg: '0,5', pesoPanetto: '', latoA: '40', latoB: '60' },
            },
          },
          [RICETTA_CANOTTO.id]: {
            modalita: 'farina',
            valori: {
              farina: { farinaKg: '2,5', pesoPanetto: '300' },
            },
          },
        },
      }),
    );

    const stato = caricaStato(archivio);
    expect(stato.ricettaId).toBe(RICETTA_TRANCIO.id);
    expect(stato.ricette[RICETTA_TRANCIO.id].modalita).toBe('farina');
    expect(stato.ricette[RICETTA_TRANCIO.id].valori.farina.farinaKg).toBe('0,5');
    expect(stato.ricette[RICETTA_TRANCIO.id].valori.farina.latoA).toBe('40');
    expect(stato.ricette[RICETTA_CANOTTO.id].modalita).toBe('farina');
    expect(stato.ricette[RICETTA_CANOTTO.id].valori.farina.farinaKg).toBe('2,5');
  });

  it('migra il vecchio stato della sola Biga senza perdere i valori', () => {
    const archivio = archivioFinto(
      JSON.stringify({
        modalita: 'farina',
        valori: {
          panetti: { numeroPanetti: '8', pesoPanetto: '250' },
          farina: { farinaKg: '2,5', pesoPanetto: '300' },
        },
      }),
    );

    const stato = caricaStato(archivio);
    expect(stato.ricettaId).toBe(RICETTA_TEGLIA_BIGA.id);
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].modalita).toBe('farina');
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].valori.farina.farinaKg).toBe(
      '2,5',
    );
    expect(
      stato.ricette[RICETTA_TEGLIA_BIGA.id].valori.panetti.numeroPanetti,
    ).toBe('8');
    expect(stato.ricette[RICETTA_TRANCIO.id].modalita).toBe('teglie');
  });

  it('corregge singoli campi corrotti senza perdere gli altri', () => {
    const archivio = archivioFinto(
      JSON.stringify({
        versione: 3,
        ricettaId: RICETTA_TEGLIA_BIGA.id,
        ricette: {
          [RICETTA_TEGLIA_BIGA.id]: {
            modalita: 'panetti',
            valori: {
              panetti: { numeroPanetti: '6,5', pesoPanetto: '280' },
              farina: { farinaKg: 'zero', pesoPanetto: '280abc' },
            },
          },
        },
      }),
    );

    const stato = caricaStato(archivio);
    const biga = stato.ricette[RICETTA_TEGLIA_BIGA.id];
    expect(biga.valori.panetti.numeroPanetti).toBe('3');
    expect(biga.valori.panetti.pesoPanetto).toBe('280');
    expect(biga.valori.farina.farinaKg).toBe('1');
    expect(biga.valori.farina.pesoPanetto).toBe('');
  });

  it('tollera JSON corrotto, modalità sconosciute e ricette sconosciute', () => {
    expect(caricaStato(archivioFinto('{non-json')).ricettaId).toBe(
      RICETTA_TEGLIA_BIGA.id,
    );
    const stato = caricaStato(
      archivioFinto(
        JSON.stringify({
          ricettaId: 'ricetta-inesistente',
          ricette: {
            [RICETTA_TEGLIA_BIGA.id]: { modalita: 'microonde' },
          },
        }),
      ),
    );
    expect(stato.ricettaId).toBe(RICETTA_TEGLIA_BIGA.id);
    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].modalita).toBe('teglie');
  });

  it('salva lo stato in JSON', () => {
    const archivio = archivioFinto();
    const stato = caricaStato(archivio);
    stato.ricette[RICETTA_TEGLIA_BIGA.id].modalita = 'farina';
    stato.ricettaId = RICETTA_TRANCIO.id;
    salvaStato(stato, archivio);

    const salvato = JSON.parse(archivio.leggi() ?? '{}');
    expect(salvato.versione).toBe(3);
    expect(salvato.ricettaId).toBe(RICETTA_TRANCIO.id);
    expect(salvato.ricette[RICETTA_TEGLIA_BIGA.id].modalita).toBe('farina');
  });

  it('non blocca l’app se la scrittura fallisce', () => {
    const archivioRotto = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };

    expect(() => salvaStato(caricaStato(archivioFinto()), archivioRotto)).not.toThrow();
  });

  it('conserva gli ultimi valori validi per ciascun gruppo', () => {
    const precedenti = valoriIniziali(RICETTA_TEGLIA_BIGA.id);
    const aggiornati = aggiornaValoriValidi(precedenti, {
      ...precedenti,
      panetti: { numeroPanetti: 'abc', pesoPanetto: '300' },
      farina: {
        farinaKg: '',
        pesoPanetto: '',
        latoA: '',
        latoB: '',
      },
    });

    expect(aggiornati.panetti.numeroPanetti).toBe('3');
    expect(aggiornati.panetti.pesoPanetto).toBe('300');
    expect(aggiornati.farina.farinaKg).toBe('1');
    expect(aggiornati.farina.pesoPanetto).toBe('');
  });
});

describe('opzioni lievito e autolisi', () => {
  it('ripristina tipo di lievito e autolisi attiva', () => {
    const stato = caricaStato(
      archivioFinto(
        JSON.stringify({
          versione: 3,
          ricettaId: RICETTA_TEGLIA_BIGA.id,
          ricette: {
            [RICETTA_TEGLIA_BIGA.id]: {
              modalita: 'panetti',
              opzioni: { tipoLievito: 'secco', autolisi: true },
            },
          },
        }),
      ),
    );

    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].opzioni).toEqual({
      tipoLievito: 'secco',
      autolisi: true,
      biga: {
        temperatura: 20,
        ore: 24,
        temperaturaFrigo: 4,
        oraImpasto: '08:00',
        oraPronta: '08:00',
      },
    });
  });

  it('mantiene l’autolisi scelta nella Canotto e la disattiva nel Trancio', () => {
    const stato = caricaStato(
      archivioFinto(
        JSON.stringify({
          versione: 3,
          ricette: {
            [RICETTA_CANOTTO.id]: {
              opzioni: { tipoLievito: 'fresco', autolisi: false },
            },
            [RICETTA_TRANCIO.id]: {
              opzioni: { tipoLievito: 'fresco', autolisi: true },
            },
          },
        }),
      ),
    );

    expect(stato.ricette[RICETTA_CANOTTO.id].opzioni.autolisi).toBe(false);
    expect(stato.ricette[RICETTA_TRANCIO.id].opzioni.autolisi).toBe(false);
  });

  it('scarta un tipo di lievito sconosciuto', () => {
    const stato = caricaStato(
      archivioFinto(
        JSON.stringify({
          versione: 3,
          ricette: {
            [RICETTA_TEGLIA_BIGA.id]: {
              opzioni: { tipoLievito: 'madre', autolisi: 'sì' },
            },
          },
        }),
      ),
    );

    expect(stato.ricette[RICETTA_TEGLIA_BIGA.id].opzioni).toEqual({
      tipoLievito: 'fresco',
      autolisi: true,
      biga: {
        temperatura: 20,
        ore: 24,
        temperaturaFrigo: 4,
        oraImpasto: '08:00',
        oraPronta: '08:00',
      },
    });
  });
});
