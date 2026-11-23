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

describe('describeChanges: valori dei campi personalizzati (VAL)', () => {
  const opts = ['XS', 'S', 'M', 'L'].map((label, i) => ({ id: `opt_${i}`, label }));
  const taglia = { id: 'ft', name: 'Taglia', type: 'single_choice', uiType: 'grid', required: true, order: 0, options: opts } as any;
  const tagliaDopo = { ...taglia, options: opts.map((o) => (o.id === 'opt_2' ? { ...o, label: 'Media' } : o)) };
  const spess = { id: 'fs', name: 'Spessore', type: 'number', uiType: 'text', unit: 'mm', required: false, order: 0 } as any;
  const pelle = { id: 'fp', name: 'Pelle interna', type: 'single_choice', uiType: 'grid', required: false, order: 0, linkTo: 'furType' } as any;
  const prima = { ...before, customData: [{ value: 'M', fieldSnapshot: taglia }, { value: '3', fieldSnapshot: spess }, { value: 'Visone', fieldSnapshot: pelle }] };
  it('l\'etichetta di prima e l\'id della stessa opzione, «3» e 3: nessuna riga', () => {
    const customData = [{ value: 'opt_2', fieldSnapshot: tagliaDopo }, { value: 3, fieldSnapshot: spess }, { value: 'visone', fieldSnapshot: pelle }];
    expect(describeChanges(prima, { customData }, { options: () => [{ id: 'visone', label: 'Visone' }] })).toEqual([]);
  });
  it('una modifica vera si scrive con le etichette, mai con gli id', () => {
    const customData = [{ value: 'opt_3', fieldSnapshot: tagliaDopo }, { value: 4.5, fieldSnapshot: spess }, { value: 'volpe', fieldSnapshot: pelle }];
    expect(describeChanges(prima, { customData }, { options: () => [{ id: 'visone', label: 'Visone' }, { id: 'volpe', label: 'Volpe' }] }))
      .toEqual(['Taglia: Media → L', 'Spessore: 3 mm → 4,5 mm', 'Pelle interna: Visone → Volpe']);
  });
});
