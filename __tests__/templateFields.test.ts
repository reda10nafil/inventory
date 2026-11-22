import { appendLayoutFields, matchTemplateFields } from '../utils/templateFields';

describe('matchTemplateFields (D12)', () => {
  const existing = [
    { id: 'f1', name: 'Condizione' },
    { id: 'f2', name: 'Vecchio', deletedAt: '2026-11-01' },
  ];
  it('riusa i campi attivi con lo stesso nome, crea gli altri', () => {
    const out = matchTemplateFields([{ name: 'Brand' }, { name: ' condizione ' }, { name: 'Vecchio' }], existing);
    expect(out.map((o) => [o.field.name, o.existingId])).toEqual([['Brand', undefined], [' condizione ', 'f1'], ['Vecchio', undefined]]);
  });
  it('un nome ripetuto nel modello vale una volta', () => {
    expect(matchTemplateFields([{ name: 'A' }, { name: 'a' }], [])).toHaveLength(1);
  });
});

describe('appendLayoutFields (D12, P11)', () => {
  const current = [{ id: 'sku', type: 'base' as const, size: 'full' as const, visible: true }, { id: 'f1', type: 'custom' as const, size: 'small' as const, visible: false }];
  it('aggiunge in fondo solo i campi che mancano, visibili', () => {
    const out = appendLayoutFields(current, ['f1', 'f9', 'f9', 'f8']);
    expect(out.map((f) => f.id)).toEqual(['sku', 'f1', 'f9', 'f8']);
    expect(out[1]).toEqual(current[1]); // quello già presente non cambia
    expect(out[2]).toEqual({ id: 'f9', type: 'custom', size: 'medium', visible: true });
  });
});
