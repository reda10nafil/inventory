import * as fs from 'fs';
import * as path from 'path';
import {
  libraryIdFromCsv, MOVEMENT_CSV_HEADER, movementCsvRows, parseStockCell, PRODUCT_CSV_HEADER, productCsvColumns, productCsvFormat,
  productCsvRows, productFromCsvRow, STOCK_CSV_HEADER, stockCell, stockCsvRows,
} from '../utils/productCsv';
import { parseCsv, stringifyCsv } from '../utils/csv';
import { DEFAULT_FUR_TYPES } from '../utils/furTypes';
import { withStartingStock } from '../utils/inventoryOps';
import { replayStock, stockOf } from '../utils/stock';
import type { Product, TimelineEvent } from '../types';

const product = (extra: Partial<Product>): Product => ({
  id: 'x', sku: 'A', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...extra,
});
const libraries = [{ id: 'pellicce', name: 'Pellicce' }, { id: 'usato', name: 'Usato e permute' }];

describe('productCsvRows (P07)', () => {
  it('esclude il cestino e scrive il nome della categoria (la cartella, C1)', () => {
    const rows = productCsvRows([
      product({ sku: 'A', libraryId: 'pellicce' }),
      product({ sku: 'B', deletedAt: '2026-11-21' }),
      product({ sku: 'C' }),
    ], libraries);
    expect(rows[0]).toEqual(PRODUCT_CSV_HEADER);
    expect(rows.slice(1).map((r) => r[0])).toEqual(['A', 'C']);
    const categoria = PRODUCT_CSV_HEADER.indexOf('Categoria');
    expect(rows[1][categoria]).toBe('Pellicce');
    expect(rows[2][categoria]).toBe('');
  });

  it('C1: «Tipo di pelle» e «Categoria» al posto delle colonne di prima, stesse posizioni', () => {
    expect(PRODUCT_CSV_HEADER[1]).toBe('Tipo di pelle');
    expect(PRODUCT_CSV_HEADER[15]).toBe('Categoria');
    expect(PRODUCT_CSV_HEADER).not.toContain('Cartella');
    expect(productCsvFormat(PRODUCT_CSV_HEADER)).toBe('c1');
  });

  it('la sottocategoria si scrive col nome completo; senza tipo di pelle la cella è vuota', () => {
    const list = [...libraries, { id: 'visone', name: 'Visone', parentId: 'pellicce' }];
    const rows = productCsvRows([product({ libraryId: 'visone', furType: '' })], list);
    expect(rows[1][PRODUCT_CSV_HEADER.indexOf('Categoria')]).toBe('Pellicce › Visone');
    expect(rows[1][PRODUCT_CSV_HEADER.indexOf('Tipo di pelle')]).toBe('');
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
  it('C1: nome completo della sottocategoria, anche con «>»; lo stesso nome sotto due categorie', () => {
    const list = [
      ...libraries,
      { id: 'visone', name: 'Visone', parentId: 'pellicce' },
      { id: 'visone-1', name: 'Visone', parentId: 'usato' },
    ];
    expect(libraryIdFromCsv('Pellicce › Visone', list)).toBe('visone');
    expect(libraryIdFromCsv('usato e permute > VISONE', list)).toBe('visone-1');
    expect(libraryIdFromCsv('Usato e permute›Visone', list)).toBe('visone-1');
    expect(libraryIdFromCsv('visone-1', list)).toBe('visone-1');
    // Solo il nome: la prima nell'ordine dell'albero
    expect(libraryIdFromCsv('Visone', list)).toBe('visone');
    expect(libraryIdFromCsv('Pellicce › Volpe', list)).toBeUndefined();
  });
});

// I tre formati del CSV dei prodotti (ticket 19): gli stessi file della prova `prova/c1-categorie.cjs`
describe('CSV di prima e di adesso (C1)', () => {
  const dir = path.join(__dirname, '..', 'piani di implementazione', 'funzionalita', 'prova', 'c1-csv');
  const categories = [
    { id: 'pellicce', name: 'Pellicce' },
    { id: 'collezione-inverno', name: 'Collezione Inverno' },
    { id: 'usato-e-permute', name: 'Usato e permute' },
    { id: 'visone', name: 'Visone', parentId: 'pellicce' },
  ];
  const read = (file: string) => {
    const rows = parseCsv(fs.readFileSync(path.join(dir, file), 'utf8'));
    const cols = productCsvColumns(rows[0]);
    const products = rows.slice(1).map((row) => productFromCsvRow(row, cols, { categories, furTypes: DEFAULT_FUR_TYPES }));
    return { format: cols.format, products: products.map((r) => r && { sku: r.product.sku, furType: r.product.furType, libraryId: r.product.libraryId, status: r.product.status, sellPrice: r.product.sellPrice, stock: r.stock }) };
  };

  it('prima di M01: «Tipo Pelle» è il tipo di pelle, «Cartella» la categoria', () => {
    expect(read('pre-m01.csv')).toEqual({
      format: 'pre-m01',
      products: [
        { sku: 'C1-PRE-1', furType: 'volpe', libraryId: 'pellicce', status: 'sold', sellPrice: 1234.5, stock: null },
        { sku: 'C1-PRE-2', furType: 'visone', libraryId: undefined, status: 'available', sellPrice: undefined, stock: null },
      ],
    });
  });

  it('M01-M10: «Categoria» è il tipo di pelle, «Cartella» la categoria (anche per id)', () => {
    expect(read('m01.csv')).toEqual({
      format: 'm01',
      products: [
        { sku: 'C1-M01-1', furType: 'zibellino', libraryId: 'usato-e-permute', status: 'available', sellPrice: 900, stock: null },
        { sku: 'C1-M01-2', furType: 'astrakan', libraryId: 'collezione-inverno', status: 'available', sellPrice: undefined, stock: { vetrina: 3 } },
      ],
    });
  });

  it('da C1: «Tipo di pelle» (anche per nome o vuoto) e «Categoria» col nome completo', () => {
    expect(read('c1.csv')).toEqual({
      format: 'c1',
      products: [
        { sku: 'C1-NEW-1', furType: 'visone', libraryId: 'visone', status: 'available', sellPrice: 1500, stock: null },
        { sku: 'C1-NEW-2', furType: '', libraryId: 'usato-e-permute', status: 'available', sellPrice: 25, stock: null },
        { sku: 'C1-NEW-3', furType: 'volpe', libraryId: 'visone', status: 'available', sellPrice: undefined, stock: null },
        { sku: 'C1-NEW-4', furType: 'cincilla', libraryId: 'collezione-inverno', status: 'available', sellPrice: undefined, stock: null },
      ],
    });
  });

  it('il formato dipende dall\'intestazione, non dalla posizione', () => {
    // M08 importava «SKU,Categoria,…» senza «Cartella»: è un file M01, «Categoria» = tipo di pelle
    expect(productCsvFormat(['SKU', 'Categoria', 'Posizione'])).toBe('m01');
    expect(productCsvColumns(['SKU', 'Posizione', 'Categoria']).furType).toBe(2);
    expect(productCsvColumns(['SKU', 'Posizione', 'Categoria']).category).toBe(-1);
    // «Cartella» e «Tipo di pelle» insieme: vecchio
    expect(productCsvFormat(['SKU', 'Tipo di pelle', 'Cartella'])).toBe('pre-m01');
    // Solo «Tipo di pelle»: nuovo, nessuna categoria
    const c1 = productCsvColumns(['Categoria', 'SKU', 'Tipo di pelle']);
    expect([c1.format, c1.category, c1.furType]).toEqual(['c1', 0, 2]);
    expect(productCsvFormat(['sku', 'posizione'])).toBe('pre-m01');
  });

  it('riga saltata: SKU vuoto o giacenza non valida', () => {
    const cols = productCsvColumns(['SKU', 'Tipo di pelle', 'Giacenza']);
    expect(productFromCsvRow(['', 'visone', ''], cols, { categories, furTypes: DEFAULT_FUR_TYPES })).toBeNull();
    expect(productFromCsvRow(['A', 'visone', 'vetrina:-1'], cols, { categories, furTypes: DEFAULT_FUR_TYPES })).toBeNull();
  });

  it('esporta e reimporta: stesso tipo di pelle e stessa categoria, anche una sottocategoria e senza tipo', () => {
    const originals = [product({ sku: 'A', libraryId: 'visone', furType: '' }), product({ sku: 'B', libraryId: 'usato-e-permute', furType: 'cincilla' })];
    const rows = parseCsv(stringifyCsv(productCsvRows(originals, categories)));
    const cols = productCsvColumns(rows[0]);
    const back = rows.slice(1).map((row) => productFromCsvRow(row, cols, { categories, furTypes: DEFAULT_FUR_TYPES })?.product);
    expect(back.map((p) => [p?.sku, p?.furType, p?.libraryId])).toEqual([['A', '', 'visone'], ['B', 'cincilla', 'usato-e-permute']]);
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
  const labels = {
    place: (id: string) => ({ vetrina: 'Vetrina', magazzino: 'Magazzino' } as Record<string, string>)[id] ?? id,
    category: (id: string | undefined) => (id === 'visone' ? 'Pellicce › Visone' : id ?? ''),
    furType: (id: string) => (id === 'visone' ? 'Visone' : id),
  };

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
      ['A', '', 'Visone', 'Vetrina', 1, 'kg', 5, 'sì'],
      ['A', '', 'Visone', 'Magazzino', 2, 'kg', 5, 'sì'],
      ['B', '', 'Visone', 'Vetrina', 1, 'pz', undefined, ''],
      ['C', '', 'Visone', 'Vetrina', 0, 'pz', undefined, ''],
      ['F', '', 'Visone', 'Vetrina', 5, 'pz', 5, 'no'],
    ]);
  });

  it('stockCsvRows (C1): «Categoria» = nome completo della cartella, «Tipo di pelle» = nome del tipo, vuoti se mancano', () => {
    expect(STOCK_CSV_HEADER.slice(0, 4)).toEqual(['SKU', 'Categoria', 'Tipo di pelle', 'Posizione']);
    const rows = stockCsvRows([product({ sku: 'A', libraryId: 'visone' }), product({ sku: 'B', furType: '' })], labels);
    expect(rows.slice(1).map((r) => r.slice(0, 4))).toEqual([['A', 'Pellicce › Visone', 'Visone', 'Vetrina'], ['B', '', '', 'Vetrina']]);
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

// S1a (ticket 13): colonna «Scaffale» in fondo, col nome dello scaffale dentro la posizione del prodotto
describe('Scaffale nel CSV dei prodotti (S1a)', () => {
  const shelves = [
    { id: '1700000000000-aaa', name: 'A1', locationId: 'vetrina' },
    { id: '1700000000000-bbb', name: 'B2', locationId: 'magazzino', barcode: 'SCAF-B2' },
  ];
  const lists = { categories: libraries, furTypes: DEFAULT_FUR_TYPES, shelves };

  it('in fondo: le colonne di prima restano dove erano e il formato resta riconosciuto', () => {
    // S2: dopo «Scaffale» c'è «Altezza», in fondo; «Scaffale» resta la ventesima
    expect(PRODUCT_CSV_HEADER.indexOf('Scaffale')).toBe(19);
    expect(PRODUCT_CSV_HEADER.slice(15, 19)).toEqual(['Categoria', 'Unità', 'Giacenza', 'Scorta minima']);
    expect(productCsvFormat(PRODUCT_CSV_HEADER)).toBe('c1');
    expect(productCsvColumns(PRODUCT_CSV_HEADER).shelf).toBe(19);
    expect(productCsvColumns(['SKU', 'Tipo di pelle', 'Posizione']).shelf).toBe(-1);
  });

  it('export: il nome per un pezzo unico sul suo scaffale, vuoto altrimenti (scaffale di un\'altra posizione, articolo a quantità)', () => {
    const rows = productCsvRows([
      product({ sku: 'A', shelfId: '1700000000000-aaa' }),
      product({ sku: 'B', shelfId: '1700000000000-bbb' }),
      product({ sku: 'C', shelfId: '1700000000000-aaa', stock: { vetrina: 2 }, unit: 'pz' }),
      product({ sku: 'D' }),
    ], libraries, shelves);
    const col = PRODUCT_CSV_HEADER.indexOf('Scaffale');
    expect(rows.slice(1).map((r) => r[col])).toEqual(['A1', '', '', '']);
    // senza elenco (chi chiama come prima): colonna vuota
    expect(productCsvRows([product({ shelfId: '1700000000000-aaa' })], libraries)[1][col]).toBe('');
  });

  it('import: per nome dentro la posizione; senza colonna, nome sconosciuto o con la giacenza nessuno scaffale', () => {
    const cols = productCsvColumns(['SKU', 'Tipo di pelle', 'Posizione', 'Giacenza', 'Scaffale']);
    const shelfOf = (row: string[]) => productFromCsvRow(row, cols, lists)?.product.shelfId;
    expect(shelfOf(['A', 'visone', 'vetrina', '', 'a1'])).toBe('1700000000000-aaa');
    expect(shelfOf(['A', 'visone', 'magazzino', '', 'A1'])).toBeUndefined();
    expect(shelfOf(['A', 'visone', 'vetrina', '', 'Z9'])).toBeUndefined();
    expect(shelfOf(['A', 'visone', 'vetrina', 'vetrina:3', 'A1'])).toBeUndefined();
    expect('shelfId' in (productFromCsvRow(['A', 'visone', 'vetrina', '', ''], cols, lists)?.product ?? {})).toBe(false);
  });

  it('import (S1b): la Giacenza accetta lo scaffale (chiave esportata, posizione/nome, id o codice); la posizione no', () => {
    const cols = productCsvColumns(['SKU', 'Tipo di pelle', 'Posizione', 'Giacenza']);
    const B2 = 'magazzino/1700000000000-bbb';
    // In S1a queste righe si saltavano: ora la giacenza va sullo scaffale, nella sua posizione
    expect(productFromCsvRow(['A', 'visone', 'vetrina', 'vetrina:1; 1700000000000-bbb:2'], cols, lists)?.stock).toEqual({ vetrina: 1, [B2]: 2 });
    expect(productFromCsvRow(['A', 'visone', 'vetrina', 'SCAF-B2:2'], cols, lists)?.stock).toEqual({ [B2]: 2 });
    expect(productFromCsvRow(['A', 'visone', 'magazzino', `${B2}:2; magazzino/b2:1`], cols, lists)?.stock).toEqual({ [B2]: 3 });
    // Scaffale sconosciuto o di un'altra posizione, chiave rovinata: riga saltata
    expect(productFromCsvRow(['A', 'visone', 'magazzino', 'magazzino/Z9:1'], cols, lists)).toBeNull();
    expect(productFromCsvRow(['A', 'visone', 'magazzino', 'magazzino/A1:1'], cols, lists)).toBeNull();
    expect(productFromCsvRow(['A', 'visone', 'magazzino', 'magazzino/:1'], cols, lists)).toBeNull();
    // Posizione del prodotto: mai uno scaffale né con il separatore
    expect(productFromCsvRow(['A', 'visone', '1700000000000-aaa', ''], cols, lists)).toBeNull();
    expect(productFromCsvRow(['A', 'visone', 'mag/azzino', ''], cols, lists)).toBeNull();
    expect(productFromCsvRow(['A', 'visone', 'vetrina', 'vetrina:1; magazzino:2'], cols, lists)?.stock).toEqual({ vetrina: 1, magazzino: 2 });
  });

  it('export e reimport della giacenza sugli scaffali: la cella porta le chiavi salvate e torna uguale', () => {
    const B2 = 'magazzino/1700000000000-bbb';
    const p = product({ sku: 'Q', location: 'magazzino', stock: { magazzino: 5, [B2]: 3 }, unit: 'pz' });
    expect(stockCell(p)).toBe(`magazzino:5; ${B2}:3`);
    expect(stockCell(product({ location: 'magazzino', stock: { [B2]: 3 }, unit: 'pz' }))).toBe(`${B2}:3`);
    const rows = parseCsv(stringifyCsv(productCsvRows([p], libraries, shelves)));
    const back = productFromCsvRow(rows[1], productCsvColumns(rows[0]), lists);
    expect(back?.stock).toEqual({ magazzino: 5, [B2]: 3 });
    expect(back?.product.location).toBe('magazzino');
  });

  it('report delle giacenze: una riga per scaffale col suo nome', () => {
    const B2 = 'magazzino/1700000000000-bbb';
    const place = (key: string) => (key === B2 ? 'Magazzino › B2' : key === 'magazzino' ? 'Magazzino' : key);
    const rows = stockCsvRows([product({ sku: 'Q', location: 'magazzino', stock: { [B2]: 3, magazzino: 5 }, unit: 'pz' })], {
      place, category: () => '', furType: (id) => id,
    });
    expect(rows.slice(1).map((r) => [r[3], r[4]])).toEqual([['Magazzino', 5], ['Magazzino › B2', 3]]);
  });

  it('esporta e reimporta: lo scaffale torna', () => {
    const originals = [product({ sku: 'A', shelfId: '1700000000000-aaa' }), product({ sku: 'B', location: 'magazzino', shelfId: '1700000000000-bbb' }), product({ sku: 'C' })];
    const rows = parseCsv(stringifyCsv(productCsvRows(originals, libraries, shelves)));
    const cols = productCsvColumns(rows[0]);
    const back = rows.slice(1).map((row) => productFromCsvRow(row, cols, lists)?.product);
    expect(back.map((p) => [p?.sku, p?.location, p?.shelfId])).toEqual([['A', 'vetrina', '1700000000000-aaa'], ['B', 'magazzino', '1700000000000-bbb'], ['C', 'vetrina', undefined]]);
  });
});

describe('Altezza nel CSV dei prodotti (S2)', () => {
  const lists = { categories: [], furTypes: DEFAULT_FUR_TYPES };
  it('colonna 21, esportata e riletta; un CSV di prima senza la colonna dà un prodotto senza altezza', () => {
    expect(PRODUCT_CSV_HEADER[20]).toBe('Altezza');
    expect(PRODUCT_CSV_HEADER[21]).toBe('Link foto'); // 26/11: dopo l'altezza, i link delle foto in chiaro
    expect(productCsvColumns(PRODUCT_CSV_HEADER).height).toBe(20);
    const rows = productCsvRows([product({ sku: 'A', height: 42.5 }), product({ sku: 'B' })], []);
    expect(rows.slice(1).map((r) => r[20])).toEqual([42.5, undefined]);
    const csv = parseCsv(stringifyCsv(rows));
    const cols = productCsvColumns(csv[0]);
    const back = csv.slice(1).map((row) => productFromCsvRow(row, cols, lists)?.product);
    expect(back.map((x) => x?.height)).toEqual([42.5, undefined]);
    expect('height' in (back[1] ?? {})).toBe(false);
    const old = productCsvColumns(PRODUCT_CSV_HEADER.slice(0, 20));
    expect(old.height).toBe(-1);
    expect('height' in (productFromCsvRow(['A', 'visone', 'vetrina'], old, lists)?.product ?? {})).toBe(false);
  });
});
