import { describe, expect, it } from 'vitest';
import {
  RICETTA_CANOTTO,
  RICETTA_TEGLIA_BIGA,
  RICETTA_TRANCIO,
} from '../config/ricette';
import {
  calcolaPerFarina,
  calcolaPerPanetti,
  calcolaPerTeglie,
} from './calcolo';
import { creaNomeFile } from './nomeFile';
import { formattaDataFile } from './formato';

const data = new Date(2026, 9, 21, 15, 4);

describe('nomi file', () => {
  it('usa il formato per panetti della pizza in teglia con biga', () => {
    const risultato = calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710);
    expect(creaNomeFile(risultato, RICETTA_TEGLIA_BIGA, data, 'jpg')).toBe(
      'pizza-teglia-biga-3-panetti-710g-2026-10-21-1504.jpg',
    );
    expect(creaNomeFile(risultato, RICETTA_TEGLIA_BIGA, data, 'pdf')).toBe(
      'pizza-teglia-biga-3-panetti-710g-2026-10-21-1504.pdf',
    );
  });

  it('usa il formato per farina della pizza in teglia con biga', () => {
    const risultato = calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1);
    expect(creaNomeFile(risultato, RICETTA_TEGLIA_BIGA, data, 'pdf')).toBe(
      'pizza-teglia-biga-1kg-farina-2026-10-21-1504.pdf',
    );
  });

  it('usa il nome Trancio Milanese per le teglie', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2);
    expect(creaNomeFile(risultato, RICETTA_TRANCIO, data, 'jpg')).toBe(
      'trancio-milanese-2-teglie-30x40-2026-10-21-1504.jpg',
    );
  });

  it('usa la slug della pizza contemporanea con biga e gestisce i decimali', () => {
    const risultato = calcolaPerFarina(RICETTA_CANOTTO, 1.25);
    expect(creaNomeFile(risultato, RICETTA_CANOTTO, data, 'pdf')).toBe(
      'pizza-contemporanea-con-biga-1-25kg-farina-2026-10-21-1504.pdf',
    );
  });

  it('normalizza lati e peso decimali senza caratteri problematici', () => {
    const teglie = calcolaPerTeglie(RICETTA_TRANCIO, 25.5, 35.5, 1);
    expect(creaNomeFile(teglie, RICETTA_TRANCIO, data, 'pdf')).toBe(
      'trancio-milanese-1-teglia-25-5x35-5-2026-10-21-1504.pdf',
    );

    const panetti = calcolaPerPanetti(RICETTA_CANOTTO, 4, 280.5);
    expect(creaNomeFile(panetti, RICETTA_CANOTTO, data, 'jpg')).toBe(
      'pizza-contemporanea-con-biga-4-panetti-280-5g-2026-10-21-1504.jpg',
    );
  });

  it('formatta la data nel fuso locale', () => {
    expect(formattaDataFile(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('distingue due esportazioni fatte nello stesso giorno', () => {
    const risultato = calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2);
    const mattina = creaNomeFile(risultato, RICETTA_TRANCIO, new Date(2026, 9, 21, 9, 5), 'pdf');
    const sera = creaNomeFile(risultato, RICETTA_TRANCIO, new Date(2026, 9, 21, 19, 40), 'pdf');

    expect(mattina).toBe('trancio-milanese-2-teglie-30x40-2026-10-21-0905.pdf');
    expect(sera).toBe('trancio-milanese-2-teglie-30x40-2026-10-21-1940.pdf');
    expect(mattina).not.toBe(sera);
  });
});
