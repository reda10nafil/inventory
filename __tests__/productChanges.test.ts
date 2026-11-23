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

  it('peso, categoria (la cartella, C1) e prezzo in formato italiano', () => {
    expect(describeChanges(before, { weight: 2.5, libraryId: undefined, sellPrice: 4500 })).toEqual([
      'Categoria: pellicce → —',
      'Prezzo vendita: 4.200 € → 4.500 €',
      'Peso: 2,1 → 2,5',
    ]);
  });

  it('SKU, tipo di pelle e foto tolte', () => {
    expect(describeChanges(before, { sku: 'VIS-2', furType: 'volpe', images: ['a'] })).toEqual([
      'SKU: VIS-1 → VIS-2', 'Tipo di pelle: visone → volpe', '1 foto tolte',
    ]);
  });

  it('tipo di pelle tolto (C1, facoltativo)', () => {
    expect(describeChanges(before, { furType: '' })).toEqual(['Tipo di pelle: visone → —']);
  });

  it('campi personalizzati cambiati, aggiunti e tolti', () => {
    const customData = [{ value: 'Bianchi', fieldSnapshot: field('f1', 'Fornitore') }, { value: 'L', fieldSnapshot: field('f3', 'Taglia') }];
    expect(describeChanges(before, { customData })).toEqual(['Fornitore: Rossi → Bianchi', 'Dettagli: A, B → —', 'Taglia: — → L']);
  });
});

describe('describeChanges: scaffale (S1a)', () => {
  const shelf = (id: string) => ({ 's-1': 'A1', 's-2': 'B2' } as Record<string, string>)[id] ?? id;
  it('col nome dello scaffale, mai l\'id', () => {
    expect(describeChanges(before, { shelfId: 's-1' }, { shelf })).toEqual(['Scaffale: — → A1']);
    expect(describeChanges({ ...before, shelfId: 's-1' }, { shelfId: 's-2' }, { shelf })).toEqual(['Scaffale: A1 → B2']);
    expect(describeChanges({ ...before, shelfId: 's-1' }, { shelfId: undefined }, { shelf })).toEqual(['Scaffale: A1 → —']);
  });
  it('senza nomi, o senza cambiamento, nessuna riga', () => {
    expect(describeChanges(before, { shelfId: 's-1' })).toEqual([]);
    expect(describeChanges({ ...before, shelfId: 's-1' }, { shelfId: 's-1' }, { shelf })).toEqual([]);
    expect(describeChanges(before, { shelfId: undefined }, { shelf })).toEqual([]);
  });
});
