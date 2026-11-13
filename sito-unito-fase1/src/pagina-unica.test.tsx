import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { gruppiVisibili, PaginaUnica, testaDellaVoce } from './PaginaUnica';
import App from './App';
import { VecchioSito } from './components/VecchioSito';
import { CalcolatoreBiga } from './vecchio/components/CalcolatoreBiga';
import { RICETTE } from './vecchio/config/ricette';
import { IMPASTI } from './config/impasti';
import { sottotitoloRicetta } from './vecchio/lib/vista';

/*
 * La pagina unica mostra i due siti affiancati, il nuovo per primo, e fa
 * partire subito il tab «Scegli la ricetta» del sito scelto: per il nuovo sito
 * sono le tre dirette, ognuna con la sua descrizione.
 */
describe('pagina unica', () => {
  const html = renderToStaticMarkup(<PaginaUnica />);

  it('apre con il titolo e il sottotitolo del vecchio sito', () => {
    expect(html).toContain('La tua pizza,');
    expect(html).toContain('grammo per grammo');
    expect(html).toContain(
      'Dal calcolo al forno: dosi, tempi e procedimento passo dopo passo',
    );
  });

  it('ha le tre voci: pizza, ricette di casa e biga', () => {
    expect(html.indexOf('Calcola la tua Pizza')).toBeGreaterThan(-1);
    expect(html.indexOf('Calcola la tua Pizza')).toBeLessThan(
      html.indexOf('Le mie ricette'),
    );
    expect(html.indexOf('Le mie ricette')).toBeLessThan(
      html.indexOf('Calcola il prefermento'),
    );
    expect(html).toContain(
      'Scegli tra Verace, Contemporanea o in Teglia e calcola il tuo impasto diretto.',
    );
    expect(html).toContain(
      'già perfettamente bilanciate. Ti consiglio di usarle chiare e pronte così come sono.',
    );
    expect(html).toContain(
      'Dai una spinta in più al tuo impasto con la gestione su misura dei prefermenti.',
    );
    // I conteggi sono spariti: restano solo i due gruppi.
    expect(html).not.toContain('3 ricette');
    expect(html).not.toContain('4 ricette');
  });

  it('parte con le tre voci chiuse', () => {
    // Nessuna voce aperta al caricamento: niente liste dentro la pagina.
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('aria-expanded="true"');
    expect(html).not.toContain('Scegli la ricetta');
    expect(html).not.toContain('Ogni impasto ha le proprie dosi');
    for (const impasto of IMPASTI) {
      expect(html).not.toContain(impasto.nome);
    }
  });

  it('non ha la scelta multipla dentro al calcolatore', () => {
    // Il calcolatore si apre solo dopo la scelta: qui non c'è ancora.
    expect(html).not.toContain('Impasto diretto, dosi esatte');
    expect(html).not.toContain('Impostazione');
    // Una sola testata: quella della pagina.
    expect(html.match(/Apri il menu/g) ?? []).toHaveLength(1);
  });
});

/*
 * Con una ricetta aperta le altre categorie spariscono: sul fondo non resta
 * niente da toccare, si esce solo con il tasto indietro.
 */
describe('una ricetta sola alla volta', () => {
  it('con una ricetta aperta mostra solo la sua voce', () => {
    for (const id of ['nuovo', 'vecchio', 'biga'] as const) {
      expect(gruppiVisibili(id, true).map((voce) => voce.id)).toEqual([id]);
    }
  });

  it('senza ricetta aperta mostra tutte e tre le voci', () => {
    expect(gruppiVisibili(null, false).map((voce) => voce.id)).toEqual([
      'nuovo',
      'vecchio',
      'biga',
    ]);
    for (const id of ['nuovo', 'vecchio', 'biga'] as const) {
      expect(gruppiVisibili(id, false).map((voce) => voce.id)).toEqual([
        'nuovo',
        'vecchio',
        'biga',
      ]);
    }
  });
});

/*
 * La testata della voce cambia per tutte le ricette, non solo per la verace:
 * nome e descrizione della ricetta scelta al posto della categoria.
 */
describe('testata della voce con la ricetta aperta', () => {
  const categoria = { titolo: 'Calcola la tua Pizza', nota: 'Scegli la ricetta' };
  const chiuso = { diretta: null, bigaScelta: false, vecchia: null };

  it('mostra nome e descrizione di ognuna delle tre dirette', () => {
    for (const impasto of IMPASTI) {
      const testa = testaDellaVoce('nuovo', categoria.titolo, categoria.nota, {
        ...chiuso,
        diretta: impasto.id,
      });
      expect(testa).toEqual({
        titolo: impasto.nome,
        nota: impasto.sottotitolo,
      });
    }
  });

  it('mostra nome e descrizione di ogni ricetta di casa', () => {
    for (const ricetta of RICETTE) {
      const testa = testaDellaVoce('vecchio', 'Le mie ricette', 'Le ricette', {
        ...chiuso,
        vecchia: ricetta.id,
      });
      // La nota è la stessa che si legge nell'elenco della ricetta.
      expect(testa).toEqual({
        titolo: ricetta.nome,
        nota: sottotitoloRicetta(ricetta),
      });
      expect(testa.nota.length).toBeGreaterThan(0);
    }
  });

  it('mostra «Biga» con la sua descrizione', () => {
    expect(
      testaDellaVoce('biga', 'Calcola il prefermento', 'La biga', {
        ...chiuso,
        bigaScelta: true,
      }),
    ).toEqual({
      titolo: 'Biga',
      nota: 'Modifica tempo e temperatura per ottenere sempre un prefermento perfetto.',
    });
  });

  it('senza ricetta aperta resta il titolo della categoria', () => {
    expect(testaDellaVoce('nuovo', categoria.titolo, categoria.nota, chiuso)).toEqual(
      categoria,
    );
    expect(
      testaDellaVoce('vecchio', 'Le mie ricette', 'Le ricette', chiuso),
    ).toEqual({ titolo: 'Le mie ricette', nota: 'Le ricette' });
  });
});

/*
 * La terza voce è la sola biga: campi suoi, senza ricetta intorno.
 */
describe('calcolatore della biga', () => {
  const html = renderToStaticMarkup(<CalcolatoreBiga />);

  it('ha farina, orari e temperature, e le dosi della biga', () => {
    expect(html).toContain('Farina');
    // Giorno e ora, non solo l'ora: la biga può finire il giorno dopo.
    expect(html).toContain('Quando ti serve la biga?');
    expect(html).toContain('Quando la prepari?');
    expect(html.indexOf('Quando la prepari?')).toBeLessThan(html.indexOf('Quando ti serve la biga?'));
    expect(html).toContain('datetime-local');
    expect(html).toContain('Temperatura ambiente');
    expect(html).toContain('Lievito');
    // Le dosi della sola biga, senza sale né olio.
    expect(html).toContain('Farina totale');
    expect(html).toContain('Idratazione');
    expect(html).toContain('Biga pronta');
    expect(html).not.toContain('Sale');
    expect(html).not.toContain('Olio');
  });
});

/*
 * Il vecchio sito entra solo come tab delle ricette: niente calcolatore, niente
 * export. La ricetta scelta compare sotto.
 */
describe('vecchio sito nella pagina unica', () => {
  const html = renderToStaticMarkup(<VecchioSito />);

  it('mostra solo l’elenco delle ricette', () => {
    for (const ricetta of RICETTE) {
      expect(html).toContain(ricetta.nome);
    }
    expect(html).not.toContain('Calcola il tuo impasto');
    expect(html).not.toContain('Salva PDF');
    expect(html).not.toContain('Ricetta selezionata');
  });
});

/*
 * Il calcolatore aperto dalla pagina unica non deve più chiedere l'impasto:
 * la scelta è già stata fatta nel tab qui sopra.
 */
describe('calcolatore nella pagina unica', () => {
  const html = renderToStaticMarkup(<App tipoIniziale="verace" senzaTestata />);

  it('non ripete la scelta multipla e non ripete il titolo', () => {
    expect(html).not.toContain('Tonda contemporanea');
    expect(html).not.toContain('Impasto diretto, dosi esatte');
    // Il calcolatore c'è: parte dai suoi passi, senza chiedere l'impasto, e
    // aspetta «Calcola impasto» prima di mostrare dosi ed export.
    expect(html).toContain('Scegli le dosi');
    expect(html).toContain('Calcola impasto');
    expect(html).not.toContain('Salva ricetta completa');
  });
});
