import { orderByLayout } from '../utils/layoutOrder';
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
