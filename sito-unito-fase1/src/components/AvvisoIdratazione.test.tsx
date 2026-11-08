import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AvvisoIdratazione } from './AvvisoIdratazione';

describe('avviso di idratazione a schermo', () => {
  it('non disegna niente dentro l’intervallo sicuro', () => {
    expect(renderToStaticMarkup(<AvvisoIdratazione ricettaId="verace" idratazione={62} />)).toBe(
      '',
    );
  });

  it('non disegna niente sulle ricette di casa nemmeno fuori range', () => {
    expect(
      renderToStaticMarkup(
        <AvvisoIdratazione ricettaId="pizza-teglia-biga-85" idratazione={95} />,
      ),
    ).toBe('');
  });

  it('disegna il messaggio e l’intervallo quando si esce dal range', () => {
    const html = renderToStaticMarkup(
      <AvvisoIdratazione ricettaId="contemporanea" idratazione={82} />,
    );

    expect(html).toContain('Idratazione superiore all’intervallo consigliato per la Contemporanea');
    expect(html).toContain('Intervallo consigliato: 65–78%.');
    // Non è un errore: il calcolo prosegue.
    expect(html).toContain('role="status"');
  });
});
