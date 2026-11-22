import { canMove, canMoveStock, canSell, usage } from '../utils/productRules';

describe('usage (P08, P09)', () => {
  const list = [
    { location: 'vetrina', libraryId: 'pellicce', furType: 'visone' },
    { location: 'vetrina', libraryId: undefined, furType: 'volpe', deletedAt: 'x' },
    { location: 'magazzino', libraryId: 'pellicce', furType: 'visone', deletedAt: 'x' },
  ];
  it('conta i prodotti di una posizione, attivi e nel cestino', () => {
    expect(usage(list, { location: 'vetrina' })).toEqual({ active: 1, trashed: 1 });
    expect(usage(list, { location: 'sartoria' })).toEqual({ active: 0, trashed: 0 });
  });
  it('una posizione con giacenza è in uso, anche nel cestino (M03)', () => {
    const stocked = [
      { location: 'vetrina', stock: { vetrina: 0, sartoria: 2 }, deletedAt: 'x' },
      { location: 'magazzino', stock: { magazzino: 1, stand_a: 0 } },
    ];
    expect(usage(stocked, { location: 'sartoria' })).toEqual({ active: 0, trashed: 1 });
    expect(usage(stocked, { location: 'vetrina' })).toEqual({ active: 0, trashed: 1 }); // posizione principale
    expect(usage(stocked, { location: 'stand_a' })).toEqual({ active: 0, trashed: 0 }); // a 0 e non principale
  });
  it('conta i prodotti di una cartella', () => {
    expect(usage(list, { libraryId: 'pellicce' })).toEqual({ active: 1, trashed: 1 });
  });
  it('conta i prodotti di una categoria (M01)', () => {
    expect(usage(list, { furType: 'visone' })).toEqual({ active: 1, trashed: 1 });
    expect(usage(list, { furType: 'volpe' })).toEqual({ active: 0, trashed: 1 });
    expect(usage(list, { furType: 'altro' })).toEqual({ active: 0, trashed: 0 });
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

describe('canMoveStock (M04, M09)', () => {
  it('solo prodotti disponibili e non nel cestino', () => {
    expect(canMoveStock({ status: 'available', location: 'vetrina' })).toBe(true);
    expect(canMoveStock({ status: 'sold', location: 'vetrina' })).toBe(false);
    expect(canMoveStock({ status: 'available', location: 'vetrina', deletedAt: 'x' })).toBe(false);
    expect(canMoveStock(undefined)).toBe(false);
  });
});
