import { describe, expect, it } from 'vitest';
import type {
  ModalitaCalcolo,
  OpzioniRicetta,
  RicettaConfig,
} from '../types';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
  opzioniIniziali,
} from './ricette';
import { piano as pianoMotore } from '../lib/motore-biga';

/** Idratazione della biga decisa dal motore: 24 h a 21 °C, frigo a 4 °C. */
const idrBigaMotore =
  pianoMotore({ temperatura: 21, oreTotali: 24, temperaturaFrigo: 4 }).idratazione / 100;
import {
  campiParametri,
  configPersonalizzata,
  convertiLievito,
  limitaParametro,
  parametriIniziali,
  ricettaPersonalizzata,
  sanificaParametri,
  type ChiaveParametro,
} from './personalizzazione';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerProdotti,
  calcolaPerTeglie,
} from '../lib/calcolo';
import { creaVistaRicetta } from '../lib/vista';
import { componiProcedimento } from '../lib/procedimento';
import { caricaStato } from '../lib/persistenza';

const OPZIONI_LIEVITO_SECCO: OpzioniRicetta = {
  tipoLievito: 'secco',
  autolisi: true,
};

function campo(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
  chiave: ChiaveParametro,
) {
  const trovato = campiParametri(ricetta, opzioni).find(
    (voce) => voce.chiave === chiave,
  );
  if (!trovato) throw new Error(`Campo assente: ${chiave}`);
  return trovato;
}

function conParametri(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
  modifiche: Partial<ReturnType<typeof parametriIniziali>>,
) {
  return configPersonalizzata(
    ricetta,
    { ...parametriIniziali(ricetta, opzioni), ...modifiche },
    opzioni,
  );
}

function calcola(
  ricetta: RicettaConfig,
  opzioni: OpzioniRicetta,
  modalita: ModalitaCalcolo,
) {
  if (modalita === 'panetti') return calcolaPerPanetti(ricetta, 3, 280, opzioni);
  if (modalita === 'teglie') return calcolaPerTeglie(ricetta, 30, 40, 1, opzioni);
  if (modalita === 'prodotti') {
    return calcolaPerProdotti(
      ricetta,
      (ricetta.prodotti ?? []).map((prodotto, indice) => ({
        id: prodotto.id,
        quantita: indice === 0 ? 1 : 0,
        pesoG: prodotto.pesoBaseG,
      })),
      opzioni,
    );
  }
  return calcolaPerFarina(ricetta, 1, null, opzioni);
}

describe('personalizzazione delle percentuali', () => {
  it('mantiene i valori iniziali esatti della configurazione', () => {
    const iniziali = parametriIniziali(RICETTA_TRANCIO);
    expect(iniziali.idratazioneTotale).toBeCloseTo(60, 12);
    expect(iniziali.percentualeSale).toBeCloseTo((8 / 375) * 100, 12);
    expect(iniziali.percentualeOlio).toBeCloseTo((22 / 375) * 100, 12);
    expect(iniziali.percentualeMalto).toBeCloseTo((4 / 375) * 100, 12);
    expect(iniziali.percentualeMiele).toBeCloseTo((10 / 375) * 100, 12);
    expect(iniziali.lievito).toBeCloseTo((6 / 375) * 100, 12);
  });

  it('con i parametri iniziali restituisce gli stessi risultati della versione di partenza', () => {
    const scenari: Array<{
      ricetta: RicettaConfig;
      modalita: ModalitaCalcolo;
    }> = [];
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_TRANCIO, RICETTA_CANOTTO]) {
      for (const modalita of ricetta.modalita) {
        scenari.push({ ricetta, modalita });
      }
    }

    for (const { ricetta, modalita } of scenari) {
      for (const opzioni of [
        opzioniIniziali(ricetta),
        { tipoLievito: 'secco' as const, autolisi: false },
        { tipoLievito: 'secco' as const, autolisi: true },
      ]) {
        // L'autolisi è personalizzabile solo nelle ricette che la prevedono.
        if (!ricetta.autolisiOpzionale && opzioni.autolisi === false) continue;

        const originale = calcola(ricetta, opzioni, modalita);
        const personalizzata = calcola(
          conParametri(ricetta, opzioni, {}),
          opzioni,
          modalita,
        );

        expect(personalizzata.ingredienti).toEqual(originale.ingredienti);
        expect(personalizzata.acquaTotaleG).toBe(originale.acquaTotaleG);
        expect(personalizzata.pesoImpastoG).toBe(originale.pesoImpastoG);
        expect(personalizzata.config).not.toBe(ricetta);
      }
    }
  });

  it('distingue una ricetta personalizzata dagli originali', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const iniziali = parametriIniziali(RICETTA_TEGLIA_BIGA, opzioni);
    expect(
      ricettaPersonalizzata(RICETTA_TEGLIA_BIGA, iniziali, opzioni),
    ).toBe(false);

    const modificati = { ...iniziali, idratazioneTotale: 75 };
    expect(
      ricettaPersonalizzata(RICETTA_TEGLIA_BIGA, modificati, opzioni),
    ).toBe(true);

    // Un valore non modificabile o non visibile non conta.
    expect(
      ricettaPersonalizzata(
        RICETTA_TEGLIA_BIGA,
        { ...iniziali, lievito: 3 },
        opzioni,
      ),
    ).toBe(false);
  });

  it('espone solo i campi previsti da ciascuna ricetta', () => {
    const chiavi = (ricetta: RicettaConfig, opzioni: OpzioniRicetta) =>
      campiParametri(ricetta, opzioni).map((voce) => voce.chiave);

    expect(chiavi(RICETTA_TEGLIA_BIGA, opzioniIniziali(RICETTA_TEGLIA_BIGA))).toEqual([
      'idratazioneTotale',
      'percentualeBiga',
      'idratazioneAutolisi',
      'percentualeMalto',
      'percentualeSale',
      'percentualeOlio',
    ]);
    expect(chiavi(RICETTA_TRANCIO, opzioniIniziali(RICETTA_TRANCIO))).toEqual([
      'idratazioneTotale',
      'lievito',
      'percentualeMalto',
      'percentualeMiele',
      'percentualeSale',
      'percentualeOlio',
    ]);
    expect(chiavi(RICETTA_CANOTTO, opzioniIniziali(RICETTA_CANOTTO))).toEqual([
      'idratazioneTotale',
      'percentualeBiga',
      'idratazioneAutolisi',
      'percentualeMalto',
      'percentualeSale',
      'percentualeOlio',
    ]);

    // Senza autolisi il relativo controllo sparisce.
    expect(
      chiavi(RICETTA_TEGLIA_BIGA, {
        tipoLievito: 'fresco',
        autolisi: false,
      }),
    ).not.toContain('idratazioneAutolisi');
  });

  it('rispetta gli intervalli richiesti', () => {
    const teglia = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'idratazioneTotale')).toMatchObject({ min: 70, max: 88 });
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'percentualeBiga')).toMatchObject({
      min: 25,
      max: 100,
    });
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'idratazioneAutolisi')).toMatchObject({ min: 50, max: 70 });
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'percentualeMalto')).toMatchObject({ min: 0, max: 3 });
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'percentualeSale')).toMatchObject({ min: 1, max: 4 });
    expect(campo(RICETTA_TEGLIA_BIGA, teglia, 'percentualeOlio')).toMatchObject({ min: 0, max: 8 });

    const trancio = opzioniIniziali(RICETTA_TRANCIO);
    expect(campo(RICETTA_TRANCIO, trancio, 'idratazioneTotale')).toMatchObject({ min: 55, max: 70 });
    expect(campo(RICETTA_TRANCIO, trancio, 'percentualeMalto')).toMatchObject({ min: 0, max: 2 });
    expect(campo(RICETTA_TRANCIO, trancio, 'percentualeMiele')).toMatchObject({ min: 0, max: 4 });
    expect(campo(RICETTA_TRANCIO, trancio, 'lievito')).toMatchObject({ min: 0.1, max: 3 });
    expect(campo(RICETTA_TRANCIO, OPZIONI_LIEVITO_SECCO, 'lievito')).toMatchObject({ min: 0.1, max: 2 });

    const canotto = opzioniIniziali(RICETTA_CANOTTO);
    expect(campo(RICETTA_CANOTTO, canotto, 'idratazioneTotale')).toMatchObject({ min: 65, max: 80 });
    expect(campo(RICETTA_CANOTTO, canotto, 'percentualeBiga')).toMatchObject({
      min: 25,
      max: 100,
    });
    expect(campo(RICETTA_CANOTTO, canotto, 'idratazioneAutolisi')).toMatchObject({ min: 50, max: 70 });
    expect(campo(RICETTA_CANOTTO, canotto, 'percentualeMalto')).toMatchObject({ min: 0, max: 3 });
  });

  it('limita i valori fuori intervallo e li arrotonda alla precisione del campo', () => {
    const teglia = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const idratazione = campo(RICETTA_TEGLIA_BIGA, teglia, 'idratazioneTotale');
    expect(limitaParametro(idratazione, 90)).toBe(88);
    expect(limitaParametro(idratazione, 40)).toBe(70);
    expect(limitaParametro(idratazione, 80.4)).toBe(80);

    const sale = campo(RICETTA_TEGLIA_BIGA, teglia, 'percentualeSale');
    expect(limitaParametro(sale, 3.456)).toBe(3.46);
    expect(limitaParametro(sale, 0)).toBe(1);
  });

  it('ripartisce l’acqua dell’autolisi dentro l’idratazione totale scelta', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const config = conParametri(RICETTA_TEGLIA_BIGA, opzioni, {
      idratazioneTotale: 70,
      idratazioneAutolisi: 60,
    });
    const risultato = calcolaPerTeglie(config, 30, 40, 1, opzioni);

    expect(risultato.acquaTotaleG).toBeCloseTo(risultato.farinaTotaleG * 0.7, 9);

    const acquaFasi = risultato.fasi
      .flatMap((fase) => fase.voci)
      .filter((voce) => voce.tipo === 'acqua')
      .reduce((totale, voce) => totale + voce.grammi, 0);
    expect(acquaFasi).toBeCloseTo(risultato.acquaTotaleG, 9);

    const farinaAutolisi = risultato.ingredienti.find(
      (voce) => voce.chiave === 'farina-autolisi',
    );
    const acquaAutolisi = risultato.ingredienti.find(
      (voce) => voce.chiave === 'acqua-autolisi',
    );
    expect(acquaAutolisi?.grammi).toBeCloseTo(
      (farinaAutolisi?.grammi ?? 0) * 0.6,
      9,
    );
  });

  it('usa la dose scelta per il lievito secco del Trancio', () => {
    const opzioni: OpzioniRicetta = { tipoLievito: 'secco', autolisi: false };
    const config = conParametri(RICETTA_TRANCIO, opzioni, { lievito: 0.9 });
    const risultato = calcolaPerTeglie(config, 30, 40, 1, opzioni);
    const lievito = risultato.ingredienti.find(
      (voce) => voce.chiave === 'lievito',
    );

    expect(lievito?.etichetta).toContain('secco');
    expect(lievito?.grammi).toBeCloseTo(risultato.farinaTotaleG * 0.009, 6);
  });

  it('converte e limita la dose quando cambia il tipo di lievito', () => {
    const iniziali = parametriIniziali(RICETTA_TRANCIO);
    const secco = convertiLievito(RICETTA_TRANCIO, iniziali, 'fresco', 'secco');
    expect(secco.lievito).toBeCloseTo(iniziali.lievito * 0.67, 6);

    const oltreIlMassimo = convertiLievito(
      RICETTA_TRANCIO,
      { ...iniziali, lievito: 3 },
      'fresco',
      'secco',
    );
    expect(oltreIlMassimo.lievito).toBe(2);

    const ritorno = convertiLievito(
      RICETTA_TRANCIO,
      oltreIlMassimo,
      'secco',
      'fresco',
    );
    expect(ritorno.lievito).toBeCloseTo(2 / 0.67, 1);
    expect(ritorno.lievito).toBeLessThanOrEqual(3);
  });

  it('sanifica i parametri salvati senza perdere gli altri valori', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const parametri = sanificaParametri(RICETTA_TEGLIA_BIGA, opzioni, {
      idratazioneTotale: 500,
      percentualeSale: 'non un numero',
      percentualeMalto: 1.5,
    });

    expect(parametri.idratazioneTotale).toBe(88);
    expect(parametri.percentualeSale).toBeCloseTo(3, 9);
    expect(parametri.percentualeMalto).toBeCloseTo(1.5, 9);
  });

  it('riporta le percentuali personalizzate nel riepilogo tecnico', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const config = conParametri(RICETTA_TEGLIA_BIGA, opzioni, {
      idratazioneTotale: 75,
      percentualeSale: 3.5,
      percentualeMalto: 1.5,
    });
    const risultato = calcolaPerTeglie(config, 30, 40, 1, opzioni);
    const vista = creaVistaRicetta(risultato, risultato.config);

    expect(vista.riepilogoTecnico[0].voci).toContainEqual({
      etichetta: 'Idratazione',
      valore: '75% sulla farina totale',
    });
    expect(vista.riepilogoTecnico[0].voci).toContainEqual({
      etichetta: 'Sale',
      valore: '3,5% sulla farina totale',
    });
    expect(vista.riepilogoTecnico[0].voci).toContainEqual({
      etichetta: 'Malto diastasico',
      valore: '1,5% sulla farina della biga',
    });

    const malto = vista.fasi
      .flatMap((fase) => fase.voci)
      .find((voce) => voce.etichetta === 'Malto diastasico');
    expect(malto?.percentuale).toBeCloseTo(0.015, 9);
  });

  it('aggiunge i parametri iniziali allo stato salvato dalla versione precedente', () => {
    const archivio = new Map<string, string>([
      [
        'impasti-pizza:v1',
        JSON.stringify({
          versione: 3,
          ricettaId: RICETTA_TRANCIO.id,
          ricette: {
            [RICETTA_TRANCIO.id]: {
              modalita: 'teglie',
              opzioni: { tipoLievito: 'secco', autolisi: false },
              valori: {},
            },
          },
        }),
      ],
    ]);
    const stato = caricaStato({
      getItem: (chiave: string) => archivio.get(chiave) ?? null,
      setItem: (chiave: string, valore: string) => {
        archivio.set(chiave, valore);
      },
    });

    const salvati = stato.ricette[RICETTA_TRANCIO.id].parametri;
    const attesi = parametriIniziali(RICETTA_TRANCIO, {
      tipoLievito: 'secco',
      autolisi: false,
    });
    expect(salvati.idratazioneTotale).toBeCloseTo(attesi.idratazioneTotale, 9);
    expect(salvati.lievito).toBeCloseTo(attesi.lievito, 9);
    expect(salvati.percentualeSale).toBeCloseTo(attesi.percentualeSale, 9);
  });

  it('torna ai risultati originali dopo il ripristino dei parametri', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const originale = calcolaPerTeglie(RICETTA_TEGLIA_BIGA, 30, 40, 1, opzioni);
    const modificato = conParametri(RICETTA_TEGLIA_BIGA, opzioni, {
      idratazioneTotale: 85,
      percentualeSale: 4,
      percentualeOlio: 8,
    });
    const intermedio = calcolaPerTeglie(modificato, 30, 40, 1, opzioni);
    expect(intermedio.pesoImpastoG).not.toBe(originale.pesoImpastoG);

    const ripristinato = conParametri(RICETTA_TEGLIA_BIGA, opzioni, {});
    const finale = calcolaPerTeglie(ripristinato, 30, 40, 1, opzioni);
    expect(finale.ingredienti).toEqual(originale.ingredienti);
  });

  it('parte dalle quote di biga originali', () => {
    expect(parametriIniziali(RICETTA_TEGLIA_BIGA).percentualeBiga).toBeCloseTo(85, 9);
    expect(parametriIniziali(RICETTA_CANOTTO).percentualeBiga).toBeCloseTo(75, 9);
    expect(parametriIniziali(RICETTA_TRANCIO).percentualeBiga).toBe(0);

    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const opzioni = opzioniIniziali(ricetta);
      expect(
        ricettaPersonalizzata(
          ricetta,
          parametriIniziali(ricetta, opzioni),
          opzioni,
        ),
      ).toBe(false);
    }
  });

  it('sposta farina, acqua e lievito con la quota di biga scelta', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);

    for (const quota of [25, 50, 85, 100]) {
      const config = conParametri(RICETTA_TEGLIA_BIGA, opzioni, {
        percentualeBiga: quota,
      });
      const risultato = calcolaPerTeglie(config, 30, 40, 1, opzioni);
      const grammi = (chiave: string) =>
        risultato.ingredienti.find((voce) => voce.chiave === chiave)?.grammi ?? 0;

      const farinaBiga = grammi('farina-biga');
      expect(farinaBiga).toBeCloseTo(risultato.farinaTotaleG * (quota / 100), 9);
      // Acqua e lievito della biga seguono la farina che ci finisce.
      expect(grammi('acqua-biga')).toBeCloseTo(farinaBiga * idrBigaMotore, 9);
      expect(grammi('lievito')).toBeCloseTo(farinaBiga * 0.01, 9);

      // La farina resta quella totale, l'acqua resta nell'idratazione scelta.
      const farina = risultato.ingredienti
        .filter((voce) => voce.tipo === 'farina')
        .reduce((totale, voce) => totale + voce.grammi, 0);
      const acqua = risultato.ingredienti
        .filter((voce) => voce.tipo === 'acqua')
        .reduce((totale, voce) => totale + voce.grammi, 0);
      expect(farina).toBeCloseTo(risultato.farinaTotaleG, 9);
      expect(acqua).toBeCloseTo(risultato.farinaTotaleG * 0.8, 9);
      expect(acqua).toBeCloseTo(risultato.acquaTotaleG, 9);
    }
  });

  it('con il 100% di biga non crea una fase di autolisi vuota', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const opzioni: OpzioniRicetta = { tipoLievito: 'fresco', autolisi: true };
      const config = conParametri(ricetta, opzioni, { percentualeBiga: 100 });
      const risultato =
        ricetta.famiglia === 'biga-rinfresco'
          ? calcolaPerTeglie(config, 30, 40, 1, opzioni)
          : calcolaPerPanetti(config, 3, 280, opzioni);

      // La teglia chiude nel rinfresco, la Canotto nell'impastamento finale.
      expect(risultato.fasi.map((fase) => fase.id)).toEqual([
        'biga',
        ricetta.famiglia === 'biga-rinfresco' ? 'rinfresco' : 'finale',
      ]);
      expect(
        risultato.ingredienti.some(
          (voce) => voce.chiave === 'farina-rinfresco' || voce.chiave === 'farina-autolisi',
        ),
      ).toBe(false);
      expect(risultato.pesoAutolisiG).toBeUndefined();
      expect(risultato.pesoBigaG).toBeCloseTo(
        risultato.farinaTotaleG +
          risultato.farinaTotaleG * idrBigaMotore +
          risultato.farinaTotaleG * (config.lievitoFrescoSuFarinaBiga ?? 0),
        6,
      );

      const acqua = risultato.ingredienti
        .filter((voce) => voce.tipo === 'acqua')
        .reduce((totale, voce) => totale + voce.grammi, 0);
      expect(acqua).toBeCloseTo(risultato.acquaTotaleG, 9);
    }
  });

  it('con il 100% di biga il procedimento non cita farina residua', () => {
    for (const ricetta of [RICETTA_TEGLIA_BIGA, RICETTA_CANOTTO]) {
      const opzioni: OpzioniRicetta = { tipoLievito: 'fresco', autolisi: true };
      const config = conParametri(ricetta, opzioni, { percentualeBiga: 100 });
      const risultato =
        ricetta.famiglia === 'biga-rinfresco'
          ? calcolaPerTeglie(config, 30, 40, 1, opzioni)
          : calcolaPerPanetti(config, 3, 280, opzioni);
      const passi = componiProcedimento(config, risultato);
      const testo = passi
        .flatMap((passo) => [passo.titolo, ...passo.paragrafi])
        .join(' ');

      expect(testo).not.toMatch(/farina residua|farina del rinfresco/i);
      expect(testo).not.toMatch(/\(0 g\)/);
      expect(testo).not.toMatch(/autolisi/i);
      expect(testo).toMatch(/acqua restante/i);
    }
  });

  it('limita e sanifica la quota di biga', () => {
    const opzioni = opzioniIniziali(RICETTA_TEGLIA_BIGA);
    const campo = campiParametri(RICETTA_TEGLIA_BIGA, opzioni).find(
      (voce) => voce.chiave === 'percentualeBiga',
    );
    if (!campo) throw new Error('Campo % biga assente');
    expect(limitaParametro(campo, 10)).toBe(25);
    expect(limitaParametro(campo, 140)).toBe(100);
    expect(limitaParametro(campo, 63.4)).toBe(63);

    expect(
      sanificaParametri(RICETTA_TEGLIA_BIGA, opzioni, { percentualeBiga: 70 })
        .percentualeBiga,
    ).toBe(70);
    expect(
      sanificaParametri(RICETTA_TEGLIA_BIGA, opzioni, { percentualeBiga: 5 })
        .percentualeBiga,
    ).toBe(25);
    // Nelle ricette senza biga il parametro non esiste e resta a zero.
    expect(
      sanificaParametri(RICETTA_TRANCIO, opzioniIniziali(RICETTA_TRANCIO), {
        percentualeBiga: 90,
      }).percentualeBiga,
    ).toBe(0);
  });

  it('riporta la quota personalizzata nel riepilogo tecnico', () => {
    const opzioni = opzioniIniziali(RICETTA_CANOTTO);
    const config = conParametri(RICETTA_CANOTTO, opzioni, { percentualeBiga: 60 });
    const risultato = calcolaPerPanetti(config, 3, 280, opzioni);
    const vista = creaVistaRicetta(risultato, risultato.config);

    expect(vista.riepilogoTecnico[0].voci).toContainEqual({
      etichetta: 'Farina nella biga',
      valore: '60% sulla farina totale',
    });
    expect(risultato.ingredienti.find((voce) => voce.chiave === 'farina-biga')?.grammi).toBeCloseTo(
      risultato.farinaTotaleG * 0.6,
      9,
    );
  });
});
