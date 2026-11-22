import { canMove, canSell, usage } from '../utils/productRules';

describe('usage (P08, P09)', () => {
  const list = [
    { location: 'vetrina', libraryId: 'pellicce' },
    { location: 'vetrina', libraryId: undefined, deletedAt: 'x' },
    { location: 'magazzino', libraryId: 'pellicce', deletedAt: 'x' },
  ];
  it('conta i prodotti di una posizione, attivi e nel cestino', () => {
    expect(usage(list, { location: 'vetrina' })).toEqual({ active: 1, trashed: 1 });
    expect(usage(list, { location: 'sartoria' })).toEqual({ active: 0, trashed: 0 });
  });
  it('conta i prodotti di una cartella', () => {
    expect(usage(list, { libraryId: 'pellicce' })).toEqual({ active: 1, trashed: 1 });
  });
});

const p = (extra: object = {}) => ({ status: 'available' as const, location: 'vetrina', ...extra });

describe('canSell (P05, P06)', () => {
  it('vende un prodotto disponibile', () => expect(canSell(p())).toBe(true));
  it('non rivende un prodotto venduto', () => expect(canSell(p({ status: 'sold' }))).toBe(false));
  it('non vende dal cestino', () => expect(canSell(p({ deletedAt: '2026-11-21' }))).toBe(false));
  it('non vende un prodotto che non c\'è', () => expect(canSell(undefined)).toBe(false));
});

describe('canMove', () => {
  it('sposta in un\'altra posizione', () => expect(canMove(p(), 'magazzino')).toBe(true));
  it('non sposta nella stessa posizione', () => expect(canMove(p(), 'vetrina')).toBe(false));
  it('non sposta dal cestino', () => expect(canMove(p({ deletedAt: 'x' }), 'magazzino')).toBe(false));
});
