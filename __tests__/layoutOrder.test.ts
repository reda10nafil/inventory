import { editableFields, orderByLayout } from '../utils/layoutOrder';

describe('editableFields (D03)', () => {
  const fields = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const layout = [
    { id: 'sku', type: 'base', visible: true },
    { id: 'c', type: 'custom', visible: true },
    { id: 'a', type: 'custom', visible: true },
    { id: 'b', type: 'custom', visible: false },
  ];
  it('mostra i campi del modulo anche vuoti, nell\'ordine del layout', () => {
    expect(editableFields(fields, layout, []).map((f) => f.id)).toEqual(['c', 'a']);
  });
  it('aggiunge i campi già compilati anche se nascosti o fuori dal layout, in fondo', () => {
    expect(editableFields(fields, layout, ['d', 'b']).map((f) => f.id)).toEqual(['c', 'a', 'b', 'd']);
  });
});
import type { ProductCustomData } from '../types';

const item = (id: string, value: string) => ({ value, fieldSnapshot: { id } }) as unknown as ProductCustomData;

describe('orderByLayout (D04)', () => {
  it('mette i campi nell\'ordine del layout', () => {
    const data = [item('c', '3'), item('a', '1'), item('b', '2')];
    expect(orderByLayout(data, ['sku', 'a', 'b', 'section_x', 'c']).map((d) => d.value)).toEqual(['1', '2', '3']);
  });

  it('lascia in fondo, nell\'ordine di prima, i campi che il layout non ha', () => {
    const data = [item('z', 'z'), item('b', 'b'), item('y', 'y'), item('a', 'a')];
    expect(orderByLayout(data, ['a', 'b']).map((d) => d.value)).toEqual(['a', 'b', 'z', 'y']);
  });
});
