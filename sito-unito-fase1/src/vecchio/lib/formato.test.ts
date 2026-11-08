import { describe, expect, it } from 'vitest';
import { formattaGrammiIngrediente } from './formato';

describe('arrotondamento delle dosi', () => {
  it('mostra sempre un decimale per lievito e malto', () => {
    expect(formattaGrammiIngrediente(9.68, 'lievito')).toBe('9,7 g');
    expect(formattaGrammiIngrediente(9, 'lievito')).toBe('9,0 g');
    expect(formattaGrammiIngrediente(4, 'malto')).toBe('4,0 g');
    expect(formattaGrammiIngrediente(17.6, 'malto')).toBe('17,6 g');
  });

  it('usa numeri interi per farina e acqua', () => {
    expect(formattaGrammiIngrediente(1139, 'farina')).toBe('1.139 g');
    expect(formattaGrammiIngrediente(1138.6, 'farina')).toBe('1.139 g');
    expect(formattaGrammiIngrediente(911.2, 'acqua')).toBe('911 g');
    expect(formattaGrammiIngrediente(911.6, 'acqua')).toBe('912 g');
  });

  it('usa interi da 10 g in su e un decimale sotto i 10 g per sale e olio', () => {
    expect(formattaGrammiIngrediente(46, 'olio')).toBe('46 g');
    expect(formattaGrammiIngrediente(46.4, 'olio')).toBe('46 g');
    expect(formattaGrammiIngrediente(8.4, 'olio')).toBe('8,4 g');
    expect(formattaGrammiIngrediente(9.96, 'olio')).toBe('10 g');
    expect(formattaGrammiIngrediente(34, 'sale')).toBe('34 g');
    expect(formattaGrammiIngrediente(7.6, 'sale')).toBe('7,6 g');
  });
});
