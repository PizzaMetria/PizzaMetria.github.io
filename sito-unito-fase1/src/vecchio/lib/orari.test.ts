import { describe, expect, it } from 'vitest';
import {
  ingressoFrigoDaOre,
  oreDaIngressoFrigo,
  cambiaOrarioBiga,
  rinnovaOrariBiga,
  completaCoppia,
  giornoDi,
  haGiorno,
  impastoPredefinito,
  oraDi,
  oreTraIstanti,
  orarioPredefinito,
} from './orari';

describe('giorno e ora della biga', () => {
  const adesso = new Date('2026-11-04T09:30:00');

  it('scrive il formato di datetime-local', () => {
    expect(orarioPredefinito(0, 8, adesso)).toBe('2026-11-04T08:00');
    expect(orarioPredefinito(1, 8, adesso)).toBe('2026-11-05T08:00');
  });

  it('distingue un orario con il giorno da uno senza', () => {
    expect(haGiorno('2026-11-04T08:00')).toBe(true);
    expect(haGiorno('08:00')).toBe(false);
  });

  it('conta i giorni fra due istanti e rifiuta la fine prima dell’inizio', () => {
    expect(oreTraIstanti('2026-11-04T08:00', '2026-11-05T08:00')).toBe(24);
    expect(oreTraIstanti('2026-11-04T20:00', '2026-11-06T08:00')).toBe(36);
    expect(oreTraIstanti('2026-11-05T08:00', '2026-11-04T08:00')).toBeNull();
  });

  it('scrive il giorno e l’ora in italiano', () => {
    expect(giornoDi('2026-11-05T08:00')).toBe('giovedì 5 novembre');
    expect(giornoDi('08:00')).toBeNull();
    expect(oraDi('2026-11-05T08:00')).toBe('08:00');
    expect(oraDi('08:00')).toBe('08:00');
  });

  it('aggiunge il giorno a un vecchio orario senza data', () => {
    const { inizio, fine } = completaCoppia('20:00', '08:00', adesso);
    expect(inizio).toBe('2026-11-04T20:00');
    expect(fine).toBe('2026-11-05T08:00');
    expect(oreTraIstanti(inizio, fine)).toBe(12);
  });

  it('legge un vecchio orario uguale come un’attesa intera', () => {
    const uguali = completaCoppia('08:00', '08:00', adesso);
    expect(uguali.fine).toBe('2026-11-05T08:00');
    expect(oreTraIstanti(uguali.inizio, uguali.fine)).toBe(24);
  });
});

describe('impasto predefinito', () => {
  it('parte quindici minuti dopo e arrotonda ai cinque più vicini', () => {
    expect(impastoPredefinito(0, new Date('2026-11-09T18:59:00'))).toBe(
      '2026-11-09T19:15',
    );
    expect(impastoPredefinito(0, new Date('2026-11-09T19:42:00'))).toBe(
      '2026-11-09T19:55',
    );
    expect(impastoPredefinito(0, new Date('2026-11-09T18:51:00'))).toBe(
      '2026-11-09T19:05',
    );
  });

  it('passa al giorno dopo quando i quindici minuti scavalcano la mezzanotte', () => {
    expect(impastoPredefinito(0, new Date('2026-11-09T23:55:00'))).toBe(
      '2026-11-10T00:10',
    );
  });

  it('sa spostarsi di ventiquattro ore per la biga pronta', () => {
    expect(impastoPredefinito(24, new Date('2026-11-09T18:59:00'))).toBe(
      '2026-11-10T19:15',
    );
  });
});

describe('orari dei nuovi calcoli biga', () => {
  const biga = { temperatura: 20, temperaturaFrigo: 4, ore: 24, tuttaInFrigo: true,
    oraImpasto: '2026-11-14T08:00', oraPronta: '2026-11-15T08:00' };

  it('rinnova le vecchie date mantenendo 24 ore dal nuovo inizio', () => {
    const nuova = rinnovaOrariBiga(biga, new Date('2026-11-21T09:30:00'));
    expect(nuova.oraImpasto).toBe('2026-11-21T09:45');
    expect(nuova.oraPronta).toBe('2026-11-22T09:45');
  });

  it('sposta la fine quando si modifica la preparazione in frigo', () => {
    const nuova = cambiaOrarioBiga(biga, 'oraImpasto', '2026-11-21T08:00');
    expect(nuova.oraPronta).toBe('2026-11-22T08:00');
  });

  it('conserva la durata personalizzata del programma misto', () => {
    const nuova = cambiaOrarioBiga({ ...biga, ore: 36,
      oraPronta: '2026-11-15T20:00', oreAmbienteMisto: '12' },
      'oraImpasto', '2026-11-21T08:00');
    expect(nuova.oraPronta).toBe('2026-11-22T20:00');
    expect(nuova.oreAmbienteMisto).toBe('12');
  });

  it('conserva una fine inserita manualmente anche se deve essere corretta', () => {
    const nuova = cambiaOrarioBiga(biga, 'oraPronta', '2026-11-13T08:00');
    expect(nuova.oraPronta).toBe('2026-11-13T08:00');
    expect(oreTraIstanti(nuova.oraImpasto!, nuova.oraPronta!)).toBeNull();
  });
});


describe('ore ambiente e orario di ingresso in frigorifero', () => {
  it('converte le 12 ore della ricetta nell’ingresso alle 20', () => {
    expect(ingressoFrigoDaOre('2026-11-21T08:00', '12')).toBe('2026-11-21T20:00');
    expect(oreDaIngressoFrigo('2026-11-21T08:00', '2026-11-21T20:00')).toBe('12');
  });

  it('gestisce frazioni di ora con virgola e punto', () => {
    for (const ore of ['12,5', '12.5']) {
      expect(ingressoFrigoDaOre('2026-11-21T08:00', ore)).toBe('2026-11-21T20:30');
    }
    expect(oreDaIngressoFrigo('2026-11-21T08:00', '2026-11-21T20:30')).toBe('12,5');
  });

  it('permette un ingresso dopo la mezzanotte con la data esplicita', () => {
    expect(ingressoFrigoDaOre('2026-11-21T20:00', '6')).toBe('2026-11-22T02:00');
    expect(oreDaIngressoFrigo('2026-11-21T20:00', '2026-11-22T02:00')).toBe('6');
  });

  it('mantiene i minuti anche dopo più conversioni', () => {
    const inizio = '2026-11-21T08:00';
    const ingresso = '2026-11-21T20:01';
    expect(ingressoFrigoDaOre(inizio, oreDaIngressoFrigo(inizio, ingresso))).toBe(ingresso);
  });

  it('lascia vuoto l’orario per un campo vuoto o incompleto', () => {
    for (const ore of ['', '12,', 'testo', 'Infinity']) {
      expect(ingressoFrigoDaOre('2026-11-21T08:00', ore)).toBe('');
    }
    expect(oreDaIngressoFrigo('2026-11-21T08:00', '')).toBe('');
    expect(oreDaIngressoFrigo('', '2026-11-21T20:00')).toBe('');
  });

  it('mantiene fuori programma un ingresso prima della preparazione', () => {
    expect(oreDaIngressoFrigo('2026-11-21T08:00', '2026-11-21T07:00')).toBe('-1');
  });

  it('usa la differenza reale tra istanti anche al cambio di ora legale', () => {
    expect(oreDaIngressoFrigo('2026-10-25T01:30:00+02:00', '2026-10-25T03:30:00+01:00')).toBe('3');
  });
});
