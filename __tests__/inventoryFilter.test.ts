import { matchesFilter, matchesSearch } from '../utils/inventoryFilter';

const locations = [{ id: 'stand_a', label: 'Stand A' }, { id: 'vetrina', label: 'Vetrina' }];
const types = [{ id: 'cincilla', label: 'Cincillà' }];
const p = { sku: 'VOL-0087', furType: 'volpe', location: 'stand_a' };

describe('matchesSearch (P14)', () => {
  it('trova per nome della posizione, non solo per id', () => {
    expect(matchesSearch(p, 'Stand A', locations)).toBe(true);
    expect(matchesSearch(p, 'stand_a', locations)).toBe(true);
    expect(matchesSearch(p, 'vetrina', locations)).toBe(false);
  });
  it('trova per SKU e per tipo, anche col nome', () => {
    expect(matchesSearch(p, 'vol-00', locations)).toBe(true);
    expect(matchesSearch({ ...p, furType: 'cincilla' }, 'Cincillà', locations, types)).toBe(true);
  });
  it('ricerca vuota: tutto', () => expect(matchesSearch(p, '  ', locations)).toBe(true));
});

describe('matchesFilter', () => {
  const alerted = new Set(['b']);
  const items = [
    { id: 'a', status: 'available' as const },
    { id: 'b', status: 'available' as const },
    { id: 'c', status: 'sold' as const },
    { id: 'd', status: 'available' as const, deletedAt: 'x' },
  ];
  const ids = (f: Parameters<typeof matchesFilter>[1]) => items.filter((i) => matchesFilter(i, f, alerted)).map((i) => i.id);
  it('ogni filtro', () => {
    expect(ids('all')).toEqual(['a', 'b', 'c']);
    expect(ids('available')).toEqual(['a', 'b']);
    expect(ids('sold')).toEqual(['c']);
    expect(ids('alert')).toEqual(['b']);
    expect(ids('trash')).toEqual(['d']);
  });
});
