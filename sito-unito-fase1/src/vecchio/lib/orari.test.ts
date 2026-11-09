import { describe, expect, it } from 'vitest';
import {
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
