import { PRODUCT_CSV_HEADER, productCsvColumns, productCsvRows, productFromCsvRow } from '../utils/productCsv';
import {
  exportCustomData, exportFields, fieldCell, fieldColumns, IMAGE_FILES_HEADER, isLocalPhoto, localPhotoCount, photoFiles, photosWarning, rowsWithImageFiles,
} from '../utils/productExport';
import { DEFAULT_FUR_TYPES } from '../utils/furTypes';
import type { CustomField, Product } from '../types';

const field = (extra: Partial<CustomField> & Pick<CustomField, 'id' | 'name' | 'type'>): CustomField => ({ uiType: 'text', required: false, order: 0, ...extra });
const TAGLIA = field({ id: 'f_taglia', name: 'Taglia', type: 'single_choice', options: [{ id: 'opt_0', label: 'S' }, { id: 'opt_1', label: 'M' }] });
const DETT = field({ id: 'f_dett', name: 'Dettagli', type: 'multi_choice', options: [{ id: 'opt_0', label: 'Cappuccio' }, { id: 'opt_1', label: 'Tasche' }] });
const LARG = field({ id: 'f_larg', name: 'Larghezza', type: 'number', order: 3 });
const FOTO = field({ id: 'f_foto', name: 'Foto dettagli', type: 'images', uiType: 'images' });
const FATTO = field({ id: 'f_ok', name: 'Pulito', type: 'boolean' });
const TIPO = field({ id: 'f_tipo', name: 'Pelle di consegna', type: 'single_choice', linkTo: 'furType' });
const SYS = field({ id: 'sku', name: 'SKU', type: 'text_short', isSystem: true });
const VIA = field({ id: 'f_via', name: 'Vecchio', type: 'text_short', deletedAt: '2026-11-01' });
const FIELDS = [SYS, TAGLIA, DETT, LARG, FOTO, FATTO, TIPO, VIA];

const product = (extra: Partial<Product>): Product => ({
  id: 'p', sku: 'A', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [], createdAt: '', updatedAt: '', ...extra,
});
const VIS = product({
  id: 'v', sku: 'VIS-0142',
  images: ['data:image/jpeg;base64,/9j/AA', 'https://img.test/b.jpg', 'blob:http://x/1', 'local-photo:abc'],
  customData: [
    { value: 'opt_1', fieldSnapshot: TAGLIA },
    { value: ['opt_0', 'opt_1'], fieldSnapshot: DETT },
    { value: 12.5, fieldSnapshot: LARG },
    { value: ['data:image/png;base64,iVBO', 'https://img.test/d.jpg'], fieldSnapshot: FOTO },
    { value: true, fieldSnapshot: FATTO },
    { value: 'volpe', fieldSnapshot: TIPO },
  ],
});

describe('EXP: colonne dei campi', () => {
  it('campi personalizzati non nel cestino, nell\'ordine del modulo', () => {
    expect(exportFields(FIELDS, ['f_dett', 'f_taglia']).map((f) => f.id)).toEqual(['f_dett', 'f_taglia', 'f_larg', 'f_foto', 'f_ok', 'f_tipo']);
  });
  it('nomi uguali a una colonna di sistema resi univoci («Larghezza (campo)»)', () => {
    expect(fieldColumns([LARG, TAGLIA, { ...LARG, id: 'f_larg2' }], PRODUCT_CSV_HEADER).map((c) => c.header)).toEqual(['Larghezza (campo)', 'Taglia', 'Larghezza (campo 2)']); // e «Immagini file» resta dello ZIP
    expect(fieldColumns([{ ...TAGLIA, name: 'Immagini file' }], PRODUCT_CSV_HEADER)[0].header).toBe('Immagini file (campo)');
  });
  it('valori leggibili: scelte con l\'etichetta, multiple con «; », numeri col punto, Sì/No, solo link http', () => {
    const lists = { furTypes: DEFAULT_FUR_TYPES };
    expect(fieldCell(TAGLIA, VIS)).toBe('M');
    expect(fieldCell(DETT, VIS)).toBe('Cappuccio; Tasche');
    expect(fieldCell(LARG, VIS)).toBe('12.5');
    expect(fieldCell(FOTO, VIS)).toBe('https://img.test/d.jpg');
    expect(fieldCell(FATTO, VIS)).toBe('Sì');
    expect(fieldCell(TIPO, VIS, lists)).toBe(DEFAULT_FUR_TYPES.find((t) => t.id === 'volpe')?.label);
    expect(fieldCell(TAGLIA, product({}))).toBe('');
  });
  it('productCsvRows: colonne dei campi in fondo, JSON senza base64 (CSV-E3), cestino escluso; senza campi come prima', () => {
    const rows = productCsvRows([VIS, product({ id: 'x', sku: 'B', deletedAt: '2026-11-20' })], [], [], { fields: FIELDS, layoutIds: [], furTypes: DEFAULT_FUR_TYPES });
    expect(rows[0].slice(0, PRODUCT_CSV_HEADER.length)).toEqual(PRODUCT_CSV_HEADER);
    expect(rows[0].slice(PRODUCT_CSV_HEADER.length)).toEqual(['Taglia', 'Dettagli', 'Larghezza (campo)', 'Foto dettagli', 'Pulito', 'Pelle di consegna']);
    expect(rows).toHaveLength(2);
    const json = String(rows[1][PRODUCT_CSV_HEADER.indexOf('Dati Personalizzati JSON')]);
    expect(json).not.toContain('data:image');
    expect(json).toContain('https://img.test/d.jpg');
    expect(rows[1][PRODUCT_CSV_HEADER.indexOf('Immagini URL')]).toBe('["https://img.test/b.jpg"]');
    expect(productCsvRows([VIS], [])[0]).toEqual(PRODUCT_CSV_HEADER);
  });
  it('l\'import di prima legge ancora il file (colonne nuove in fondo, ignorate)', () => {
    const rows = productCsvRows([VIS], [], [], { fields: FIELDS }).map((r) => r.map((v) => (v == null ? '' : String(v))));
    const cols = productCsvColumns(rows[0]);
    expect(cols.format).toBe('c1');
    expect(cols.width).toBe(PRODUCT_CSV_HEADER.indexOf('Larghezza'));
    const back = productFromCsvRow(rows[1], cols, { categories: [], furTypes: DEFAULT_FUR_TYPES });
    expect(back?.product.customData.map((c) => c.fieldSnapshot.id)).toEqual(['f_taglia', 'f_dett', 'f_larg', 'f_foto', 'f_ok', 'f_tipo']);
  });
  it('exportCustomData tiene solo i link nelle immagini e nei documenti', () => {
    expect(exportCustomData(VIS.customData)[3].value).toEqual(['https://img.test/d.jpg']);
    expect(exportCustomData(VIS.customData)[0]).toBe(VIS.customData[0]);
  });
});

describe('EXP: foto del dispositivo', () => {
  it('contate (prodotti e campi Immagini, non il cestino) e avviso', () => {
    expect(isLocalPhoto('file:///x.jpg')).toBe(true);
    expect(isLocalPhoto('https://x')).toBe(false);
    const trashed = product({ id: 't', images: ['data:image/jpeg;base64,AA'], deletedAt: '2026-11-01' });
    expect(localPhotoCount([VIS, trashed])).toEqual({ product: 3, fields: 1 });
    expect(photosWarning([VIS])).toBe('4 foto non esportate: sono solo su questo dispositivo. Per averle usa «Esporta con le foto».');
    expect(photosWarning([product({ images: ['https://x/y.jpg'] })])).toBeNull();
  });
  it('nomi nello ZIP: <SKU>-<posizione>, estensione dal tipo; SKU uguali dopo la pulizia prendono -b', () => {
    const files = photoFiles([VIS, product({ id: 'q', sku: 'VIS/0142', images: ['data:image/png;base64,AA'] }), product({ id: 'w', sku: 'W', images: ['https://x/y.jpg'] })]);
    expect(files.map((f) => f.name)).toEqual(['VIS-0142-1.jpg', 'VIS-0142-3.jpg', 'VIS-0142-4.jpg', 'VIS_0142-1.png']);
    const clash = photoFiles([product({ id: 'a', sku: 'X:1', images: ['data:image/jpeg;base64,AA'] }), product({ id: 'b', sku: 'X/1', images: ['data:image/jpeg;base64,AA'] })]);
    expect(clash.map((f) => f.name)).toEqual(['X_1-1.jpg', 'X_1-b-1.jpg']);
  });
  it('colonna «Immagini file» in fondo, senza le foto non lette', () => {
    const live = [VIS, product({ id: 'z', sku: 'Z' })];
    const rows = rowsWithImageFiles([['SKU'], ['VIS-0142'], ['Z']], live, photoFiles(live), new Set(['VIS-0142-3.jpg']));
    expect(rows).toEqual([['SKU', IMAGE_FILES_HEADER], ['VIS-0142', 'VIS-0142-1.jpg; VIS-0142-4.jpg'], ['Z', '']]);
  });
});
