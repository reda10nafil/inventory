import type { Alert, Product } from '../types';
import { lowStockAlert, mergeAlerts, parseMinStock } from '../utils/alerts';
import { describeChanges } from '../utils/productChanges';

const NOW = '2026-11-22T10:00:00.000Z';
const product = (extra: Partial<Product> = {}): Product => ({
  id: 'p1', sku: 'VIS-0142', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...extra,
});
const alert = (id: string, type: Alert['type'], dismissed = false): Alert => ({ id, productId: 'p1', type, message: '', createdAt: NOW, dismissed });

describe('lowStockAlert (M06, ticket 05)', () => {
  it('sotto la scorta minima: avviso con quantità e scorta', () => {
    expect(lowStockAlert(product({ stock: { vetrina: 2 }, unit: 'pz', minStock: 5 }), NOW)).toEqual({
      id: 'alert-low-p1', productId: 'p1', type: 'low_stock', message: 'VIS-0142: 2 pz, scorta minima 5 pz', createdAt: NOW, dismissed: false,
    });
    expect(lowStockAlert(product({ stock: { vetrina: 0.5, magazzino: 1 }, unit: 'kg', minStock: 2.5 }), NOW)?.message).toBe('VIS-0142: 1,5 kg, scorta minima 2,5 kg');
  });
  it('alla scorta minima o sopra, senza scorta, pezzo unico o nel cestino: nessun avviso', () => {
    expect(lowStockAlert(product({ stock: { vetrina: 5 }, minStock: 5 }), NOW)).toBeNull();
    expect(lowStockAlert(product({ stock: { vetrina: 0 } }), NOW)).toBeNull();
    expect(lowStockAlert(product({ minStock: 5 }), NOW)).toBeNull();
    expect(lowStockAlert(product({ stock: { vetrina: 0 }, minStock: 5, deletedAt: NOW }), NOW)).toBeNull();
  });
});

describe('mergeAlerts', () => {
  it('gli avvisi scartati restano scartati, quelli nuovi entrano', () => {
    const merged = mergeAlerts([alert('a', 'dormant'), alert('b', 'low_stock')], [alert('a', 'dormant', true)]);
    expect(merged.map((a) => [a.id, a.dismissed])).toEqual([['b', false], ['a', true]]);
  });
  it('un avviso di scorta scartato si dimentica quando il prodotto torna sopra la scorta', () => {
    expect(mergeAlerts([], [alert('low', 'low_stock', true), alert('old', 'dormant', true)]).map((a) => a.id)).toEqual(['old']);
    expect(mergeAlerts([alert('low', 'low_stock')], [alert('low', 'low_stock', true)]).map((a) => [a.id, a.dismissed])).toEqual([['low', true]]);
  });
});

describe('parseMinStock', () => {
  it('vuota o 0 = nessuna scorta, «2,5» = 2.5, non valida = null', () => {
    expect(parseMinStock('')).toBeUndefined();
    expect(parseMinStock(' 0 ')).toBeUndefined();
    expect(parseMinStock('2,5')).toBe(2.5);
    expect(parseMinStock('12')).toBe(12);
    expect(parseMinStock('-1')).toBeNull();
    expect(parseMinStock('abc')).toBeNull();
  });
});

describe('describeChanges e scorta minima', () => {
  it('scrive la scorta minima cambiata, niente se resta uguale', () => {
    expect(describeChanges(product({ minStock: 5 }), { minStock: 3 })).toEqual(['Scorta minima: 5 → 3']);
    expect(describeChanges(product({ minStock: undefined }), { minStock: 2.5 })).toEqual(['Scorta minima: — → 2,5']);
    expect(describeChanges(product({ minStock: 5 }), { minStock: undefined })).toEqual(['Scorta minima: 5 → —']);
    expect(describeChanges(product({}), { minStock: undefined })).toEqual([]);
  });
});
