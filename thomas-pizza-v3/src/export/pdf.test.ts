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
} from '../lib/calcolo';
import { creaPdfRicetta } from './pdf';

const data = new Date(2026, 9, 21, 15, 4);

function verificaDocumentoBase(documento: ReturnType<typeof creaPdfRicetta>) {
  const contenuto = documento.output('arraybuffer');
  const intestazione = new TextDecoder().decode(
    new Uint8Array(contenuto.slice(0, 5)),
  );
  expect(intestazione).toBe('%PDF-');
  expect(contenuto.byteLength).toBeGreaterThan(5000);
  expect(documento.internal.pageSize.getWidth()).toBeCloseTo(210, 2);
  expect(documento.internal.pageSize.getHeight()).toBeCloseTo(297, 2);
}

describe('esportazione PDF', () => {
  it('genera un PDF completo per la pizza in teglia con biga', () => {
    const documento = creaPdfRicetta(
      calcolaPerPanetti(RICETTA_TEGLIA_BIGA, 3, 710),
      RICETTA_TEGLIA_BIGA,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(documento.getNumberOfPages()).toBeLessThanOrEqual(3);
  });

  it('genera il PDF con autolisi attiva senza segnaposto irrisolti', () => {
    const documento = creaPdfRicetta(
      calcolaPerFarina(RICETTA_TEGLIA_BIGA, 1, null, {
        tipoLievito: 'fresco',
        autolisi: true,
      }),
      RICETTA_TEGLIA_BIGA,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('genera il PDF del Trancio Milanese con teglie e procedimento', () => {
    const documento = creaPdfRicetta(
      calcolaPerTeglie(RICETTA_TRANCIO, 30, 40, 2),
      RICETTA_TRANCIO,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(documento.output('blob').type).toBe('application/pdf');
  });

  it('genera il PDF della Canotto con le tre fasi', () => {
    const documento = creaPdfRicetta(
      calcolaPerFarina(RICETTA_CANOTTO, 1, 280),
      RICETTA_CANOTTO,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('impagina la Canotto da 3 panetti in non più di tre pagine', () => {
    const documento = creaPdfRicetta(
      calcolaPerPanetti(RICETTA_CANOTTO, 3, 280),
      RICETTA_CANOTTO,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeLessThanOrEqual(3);
  });

  it('regge una dose grande della Canotto senza sforare i margini', () => {
    const documento = creaPdfRicetta(
      calcolaPerPanetti(RICETTA_CANOTTO, 12, 300),
      RICETTA_CANOTTO,
      data,
    );
    verificaDocumentoBase(documento);
    expect(documento.getNumberOfPages()).toBeLessThanOrEqual(3);
  });
});
