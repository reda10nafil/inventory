import { libraryIdFromCsv, PRODUCT_CSV_HEADER, productCsvRows } from '../utils/productCsv';
import type { Product } from '../types';

const product = (extra: Partial<Product>): Product => ({
  id: 'x', sku: 'A', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...extra,
});
const libraries = [{ id: 'pellicce', name: 'Pellicce' }, { id: 'usato', name: 'Usato e permute' }];

describe('productCsvRows (P07)', () => {
  it('esclude il cestino e scrive il nome della cartella', () => {
    const rows = productCsvRows([
      product({ sku: 'A', libraryId: 'pellicce' }),
      product({ sku: 'B', deletedAt: '2026-11-21' }),
      product({ sku: 'C' }),
    ], libraries);
    expect(rows[0]).toEqual(PRODUCT_CSV_HEADER);
    expect(rows.slice(1).map((r) => r[0])).toEqual(['A', 'C']);
    const cartella = PRODUCT_CSV_HEADER.indexOf('Cartella');
    expect(rows[1][cartella]).toBe('Pellicce');
    expect(rows[2][cartella]).toBe('');
  });

  it('solo le foto con link http entrano nel CSV', () => {
    const rows = productCsvRows([product({ images: ['https://x/a.jpg', 'file:///b.jpg', 'blob:c'] })], libraries);
    expect(rows[1][PRODUCT_CSV_HEADER.indexOf('Immagini URL')]).toBe('["https://x/a.jpg"]');
  });
});

describe('libraryIdFromCsv', () => {
  it('riconosce nome o id della cartella', () => {
    expect(libraryIdFromCsv('Pellicce', libraries)).toBe('pellicce');
    expect(libraryIdFromCsv(' usato e PERMUTE ', libraries)).toBe('usato');
    expect(libraryIdFromCsv('usato', libraries)).toBe('usato');
  });
  it('cartella sconosciuta o vuota: nessuna', () => {
    expect(libraryIdFromCsv('Giacche', libraries)).toBeUndefined();
    expect(libraryIdFromCsv('', libraries)).toBeUndefined();
  });
});
