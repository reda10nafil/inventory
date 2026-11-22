import { libraryIdFromCsv, MOVEMENT_CSV_HEADER, movementCsvRows, parseStockCell, PRODUCT_CSV_HEADER, productCsvRows, STOCK_CSV_HEADER, stockCell, stockCsvRows } from '../utils/productCsv';
import { parseCsv, stringifyCsv } from '../utils/csv';
import { withStartingStock } from '../utils/inventoryOps';
import { replayStock, stockOf } from '../utils/stock';
import type { Product, TimelineEvent } from '../types';

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

describe('Giacenza nel CSV dei prodotti (M08)', () => {
  const stocked = (stock: Record<string, number>, extra: Partial<Product> = {}) => product({ stock, unit: 'kg', ...extra });

  it('stockCell: posizione principale per prima, anche a 0; pezzo unico vuoto', () => {
    expect(stockCell(stocked({ magazzino: 12, vetrina: 2.5 }, { location: 'vetrina' }))).toBe('vetrina:2.5; magazzino:12');
    expect(stockCell(stocked({ vetrina: 0 }))).toBe('vetrina:0');
    expect(stockCell(stocked({}))).toBe('vetrina:0');
    expect(stockCell(stocked({ vetrina: 3, magazzino: 0 }))).toBe('vetrina:3');
    expect(stockCell(product({}))).toBe('');
  });

  it('parseStockCell: vuota = pezzo unico, non valida = riga da saltare', () => {
    expect(parseStockCell('')).toBeNull();
    expect(parseStockCell('  ')).toBeNull();
    expect(parseStockCell('vetrina:2.5; magazzino:12')).toEqual({ vetrina: 2.5, magazzino: 12 });
    expect(parseStockCell('vetrina:2,5')).toEqual({ vetrina: 2.5 });
    expect(parseStockCell('vetrina:0')).toEqual({ vetrina: 0 });
    expect(parseStockCell('a:b:1')).toEqual({ 'a:b': 1 });
    expect(parseStockCell('vetrina:1; vetrina:0.5')).toEqual({ vetrina: 1.5 });
    for (const bad of ['vetrina', ':3', 'vetrina:-1', 'vetrina:due', ';', 'vetrina:']) expect(parseStockCell(bad)).toBeUndefined();
  });

  it('productCsvRows scrive Unità, Giacenza e Scorta minima solo per gli articoli a quantità', () => {
    const rows = productCsvRows([stocked({ vetrina: 2.5, magazzino: 1 }, { minStock: 3 }), product({ sku: 'B' })], libraries);
    const at = (name: string) => PRODUCT_CSV_HEADER.indexOf(name);
    expect(rows[1][at('Unità')]).toBe('kg');
    expect(rows[1][at('Giacenza')]).toBe('vetrina:2.5; magazzino:1');
    expect(rows[1][at('Scorta minima')]).toBe(3);
    expect([rows[2][at('Unità')], rows[2][at('Giacenza')], rows[2][at('Scorta minima')]]).toEqual(['', '', undefined]);
  });

  it('esporta e reimporta: stessa giacenza, posizione principale, e gli eventi la ridanno', () => {
    const now = '2026-11-22T10:00:00.000Z';
    for (const original of [
      stocked({ magazzino: 12, vetrina: 2.5 }, { location: 'vetrina' }),
      stocked({ vetrina: 0 }),
      stocked({ vetrina: 0.1, stand_a: 0.2 }),
    ]) {
      const text = stringifyCsv(productCsvRows([original], libraries));
      const row = parseCsv(text)[1];
      const stock = parseStockCell(row[PRODUCT_CSV_HEADER.indexOf('Giacenza')]);
      if (!stock) throw new Error('giacenza persa');
      const back = withStartingStock({ ...original, stock: undefined, location: row[PRODUCT_CSV_HEADER.indexOf('Posizione')] }, stock, now);
      if (!back.ok) throw new Error(back.reason);
      expect(stockOf(back.product)).toEqual(stockOf(original));
      expect(back.product.location).toBe(original.location);
      expect(back.product.stock).toEqual(Object.fromEntries(Object.entries(original.stock!).filter(([k, q]) => q > 0 || k === original.location)));
      expect(replayStock(back.events)).toEqual(stockOf(original));
    }
  });
});

describe('Report giacenze e movimenti (M08)', () => {
  const labels = { place: (id: string) => ({ vetrina: 'Vetrina', magazzino: 'Magazzino' } as Record<string, string>)[id] ?? id, category: (id: string) => (id === 'visone' ? 'Visone' : id) };

  it('stockCsvRows: una riga per posizione, pezzo unico a 1, esaurito a 0, sotto scorta del prodotto', () => {
    const rows = stockCsvRows([
      product({ sku: 'A', stock: { magazzino: 2, vetrina: 1 }, unit: 'kg', minStock: 5, location: 'vetrina' }),
      product({ sku: 'B' }),
      product({ sku: 'C', stock: { vetrina: 0 }, unit: 'pz' }),
      product({ sku: 'D', status: 'sold' }),
      product({ sku: 'E', stock: { vetrina: 4 }, deletedAt: '2026-11-22' }),
      product({ sku: 'F', stock: { vetrina: 5 }, minStock: 5 }),
    ], labels);
    expect(rows[0]).toEqual(STOCK_CSV_HEADER);
    expect(rows.slice(1)).toEqual([
      ['A', 'Visone', 'Vetrina', 1, 'kg', 5, 'sì'],
      ['A', 'Visone', 'Magazzino', 2, 'kg', 5, 'sì'],
      ['B', 'Visone', 'Vetrina', 1, 'pz', undefined, ''],
      ['C', 'Visone', 'Vetrina', 0, 'pz', undefined, ''],
      ['F', 'Visone', 'Vetrina', 5, 'pz', 5, 'no'],
    ]);
  });

  it('movementCsvRows: solo eventi `stock`, dal più vecchio, con etichette; prodotto eliminato → id', () => {
    const ev = (id: string, timestamp: string, details: TimelineEvent['details'], productId = 'x', type: TimelineEvent['type'] = 'stock'): TimelineEvent => ({ id, productId, type, timestamp, details });
    // Salvati dal più nuovo, come la Cronologia; i due del 10:00 sono il carico iniziale e poi lo scarico
    const timeline = [
      ev('5', '2026-11-22T12:00:00.000Z', { movement: 'carico', qty: 1, to: 'vetrina' }, 'sparito'),
      ev('4', '2026-11-22T11:00:00.000Z', { from: 'vetrina', to: 'magazzino' }, 'x', 'moved'),
      ev('3', '2026-11-22T10:00:00.000Z', { movement: 'scarico', qty: 1, from: 'vetrina', reason: 'vendita', finalPrice: 120, contactId: 'c1', note: 'n' }),
      ev('2', '2026-11-22T10:00:00.000Z', { movement: 'carico', qty: 1, to: 'vetrina', reason: 'iniziale' }),
    ];
    const rows = movementCsvRows(timeline, [product({ id: 'x', sku: 'A', unit: 'kg', stock: {} })], { ...labels, contact: (id) => (id === 'c1' ? 'Rossi' : id) });
    expect(rows[0]).toEqual(MOVEMENT_CSV_HEADER);
    expect(rows.slice(1).map((r) => [r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10]])).toEqual([
      ['A', 'Carico', 1, 'kg', '', 'Vetrina', 'Giacenza iniziale', undefined, '', undefined],
      ['A', 'Scarico', 1, 'kg', 'Vetrina', '', 'Vendita', 120, 'Rossi', 'n'],
      ['sparito', 'Carico', 1, 'pz', '', 'Vetrina', '', undefined, '', undefined],
    ]);
    expect(rows[1][0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('movementCsvRows (M10): il nome del contatto; un id che il risolutore non conosce resta scritto com\'è', () => {
    const ev = (id: string, contactId?: string): TimelineEvent => ({
      id, productId: 'x', type: 'stock', timestamp: `2026-11-22T1${id}:00:00.000Z`,
      details: { movement: 'carico', qty: 1, to: 'vetrina', ...(contactId && { contactId }) },
    });
    // Come `nameOf` del contesto: undefined per un id sconosciuto (una stringa vuota stamperebbe vuoto)
    const contact = (id: string) => (id === 'c1' ? 'Rossi srl' : undefined);
    const rows = movementCsvRows([ev('3'), ev('2', 'sparito'), ev('1', 'c1')], [product({ id: 'x', sku: 'A', stock: {} })], { ...labels, contact });
    const col = MOVEMENT_CSV_HEADER.indexOf('Contatto');
    expect(rows.slice(1).map((r) => r[col])).toEqual(['Rossi srl', 'sparito', '']);
  });
});
