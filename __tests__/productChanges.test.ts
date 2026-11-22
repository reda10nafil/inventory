import { describeChanges } from '../utils/productChanges';
import type { Product } from '../types';

const field = (id: string, name: string) => ({ id, name, type: 'text_short', uiType: 'text', required: false, order: 0 }) as any;
const before: Product = {
  id: 'p', sku: 'VIS-1', furType: 'visone', location: 'vetrina', status: 'available', images: ['a', 'b'],
  weight: 2.1, sellPrice: 4200, libraryId: 'pellicce',
  customData: [{ value: 'Rossi', fieldSnapshot: field('f1', 'Fornitore') }, { value: ['A', 'B'], fieldSnapshot: field('f2', 'Dettagli') }],
  createdAt: '', updatedAt: '',
};

describe('describeChanges (P13)', () => {
  it('niente se nulla cambia, anche con tutti i campi passati', () => {
    expect(describeChanges(before, { ...before })).toEqual([]);
  });

  it('testo vuoto e assente sono uguali (note dei prodotti importati)', () => {
    expect(describeChanges({ ...before, technicalNotes: '' }, { technicalNotes: undefined })).toEqual([]);
  });

  it('peso, cartella e prezzo in formato italiano', () => {
    expect(describeChanges(before, { weight: 2.5, libraryId: undefined, sellPrice: 4500 })).toEqual([
      'Cartella: pellicce → —',
      'Prezzo vendita: 4.200 € → 4.500 €',
      'Peso: 2,1 → 2,5',
    ]);
  });

  it('SKU, tipo e foto tolte', () => {
    expect(describeChanges(before, { sku: 'VIS-2', furType: 'volpe', images: ['a'] })).toEqual([
      'SKU: VIS-1 → VIS-2', 'Tipo: visone → volpe', '1 foto tolte',
    ]);
  });

  it('campi personalizzati cambiati, aggiunti e tolti', () => {
    const customData = [{ value: 'Bianchi', fieldSnapshot: field('f1', 'Fornitore') }, { value: 'L', fieldSnapshot: field('f3', 'Taglia') }];
    expect(describeChanges(before, { customData })).toEqual(['Fornitore: Rossi → Bianchi', 'Dettagli: A, B → —', 'Taglia: — → L']);
  });
});
