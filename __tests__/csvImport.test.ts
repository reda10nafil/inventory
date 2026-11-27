import * as fs from 'fs';
import * as path from 'path';
import {
  detectDelimiter, guessFieldType, guessMapping, isAppFile, newLocationId, previewImport, rejectedRows, requiredFor, splitList,
  type ImportContext, type Target,
} from '../utils/csvImport';
import { parseCsv } from '../utils/csv';
import { DEFAULT_FUR_TYPES } from '../utils/furTypes';
import { productCsvRows } from '../utils/productCsv';
import type { CustomField, Product } from '../types';

const field = (extra: Partial<CustomField> & Pick<CustomField, 'id' | 'name' | 'type'>): CustomField => ({ uiType: 'text', required: false, order: 0, ...extra });
const FIELDS: CustomField[] = [
  field({ id: 'sku', name: 'SKU / Codice', type: 'text_short', isSystem: true, required: true }),
  field({ id: 'field_taglia', name: 'Taglia', type: 'single_choice', uiType: 'grid', required: true, options: [{ id: 'opt_0', label: 'S' }, { id: 'opt_1', label: 'M' }] }),
  field({ id: 'field_colore', name: 'Colore', type: 'single_choice', uiType: 'picker', options: [{ id: 'opt_0', label: 'Nero' }, { id: 'opt_1', label: 'Grigio perla' }] }),
  field({ id: 'field_dett', name: 'Dettagli', type: 'multi_choice', uiType: 'grid', options: [{ id: 'opt_0', label: 'Cappuccio' }, { id: 'opt_1', label: 'Tasche' }] }),
  field({ id: 'field_pezzi', name: 'Pezzi', type: 'number', uiType: 'stepper' }),
  field({ id: 'field_larg', name: 'Larghezza', type: 'number' }),
  field({ id: 'field_foto', name: 'Foto dettagli', type: 'images', uiType: 'images' }),
  field({ id: 'field_old', name: 'Vecchio', type: 'text_short', deletedAt: '2026-11-01' }),
];
const LAYOUT = ['field_taglia', 'field_colore', 'field_dett', 'field_pezzi'].map((id) => ({ id, type: 'custom', visible: true }));
const LOCATIONS = [{ id: 'vetrina', label: 'Vetrina' }, { id: 'magazzino', label: 'Magazzino' }, { id: 'stand_a', label: 'Stand A' }];
const CATEGORIES = [{ id: 'pellicce', name: 'Pellicce' }, { id: 'visone-cat', name: 'Visone', parentId: 'pellicce' }, { id: 'usato-e-permute', name: 'Usato e permute' }, { id: 'collezione-inverno', name: 'Collezione inverno' }, { id: 'accessori', name: 'Accessori' }];
const existing = (sku: string, extra: Partial<Product> = {}) => ({ sku, ...extra });
const ctx = (extra: Partial<ImportContext> = {}): ImportContext => ({
  products: [existing('VIS-0142'), existing('OLD-1', { deletedAt: '2026-11-20' })],
  locations: LOCATIONS, categories: CATEGORIES, furTypes: DEFAULT_FUR_TYPES, fields: FIELDS, layoutFields: LAYOUT, ...extra,
});
const fixture = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'piani di implementazione', 'funzionalita', 'prova', 'imp-csv', name), 'utf8');
const c1Fixture = (name: string) => fs.readFileSync(path.join(__dirname, '..', 'piani di implementazione', 'funzionalita', 'prova', 'c1-csv', name), 'utf8');
const load = (text: string) => {
  const delimiter = detectDelimiter(text);
  const rows = parseCsv(text.replace(/^﻿/, ''), delimiter);
  return { delimiter, header: rows[0], body: rows.slice(1) };
};
const run = (text: string, extra: Partial<ImportContext> = {}, mapping?: Target[]) => {
  const { delimiter, header, body } = load(text);
  const m = mapping ?? guessMapping(header, { fields: FIELDS, furTypes: DEFAULT_FUR_TYPES, categories: CATEGORIES }, body);
  return { mapping: m, header, ...previewImport(body, m, ctx({ appFile: isAppFile(header, delimiter), ...extra })) };
};

describe('detectDelimiter', () => {
  it('«;» di Excel in italiano, «,» di sempre, tab; le virgolette non contano', () => {
    expect(detectDelimiter('Codice articolo;Descrizione;Prezzo\r\nA;B;1,5')).toBe(';');
    expect(detectDelimiter('SKU,Note\r\nA,"x;y;z"')).toBe(',');
    expect(detectDelimiter('"Note; con; punti",SKU\nA,B')).toBe(',');
    expect(detectDelimiter('SKU\tNote\nA\tB')).toBe('\t');
    expect(detectDelimiter('﻿SKU')).toBe(',');
  });
});

describe('guessMapping (sinonimi e campi)', () => {
  const lists = { fields: FIELDS, furTypes: DEFAULT_FUR_TYPES, categories: CATEGORIES };
  it('altro gestionale: Codice articolo → SKU, Prezzo → Prezzo vendita, Quantità, Immagine; Colore → campo; Materiale ignorata', () => {
    const { header, body } = load(fixture('altro-gestionale-pv.csv'));
    expect(guessMapping(header, lists, body)).toEqual(['sku', 'notes', 'category', 'sellPrice', 'qty', 'field:field_colore', 'ignore', 'images']);
  });
  it('CSV-I2: «Categoria» di un altro gestionale è la categoria; Taglia e Colore ai campi; Immagine e Immagini insieme', () => {
    const { header, body } = load(fixture('altro-gestionale-virgola.csv'));
    expect(guessMapping(header, lists, body)).toEqual(['sku', 'ignore', 'category', 'sellPrice', 'qty', 'field:field_taglia', 'field:field_colore', 'ignore', 'images', 'images']);
  });
  it('i tre formati dell\'app (C1): niente da scegliere', () => {
    const pre = load(c1Fixture('pre-m01.csv'));
    expect(guessMapping(pre.header, lists, pre.body)).toEqual(['sku', 'furType', 'location', 'status', 'sellPrice', 'category']);
    const m01 = load(c1Fixture('m01.csv'));
    expect(guessMapping(m01.header, lists, m01.body)).toEqual(['sku', 'furType', 'location', 'status', 'sellPrice', 'category', 'unit', 'stock', 'minStock']);
    const c1 = load(c1Fixture('c1.csv'));
    expect(guessMapping(c1.header, lists, c1.body)).toEqual(['sku', 'furType', 'location', 'status', 'sellPrice', 'category', 'unit', 'stock', 'minStock']);
  });
  it('«Categoria» senza tipo di pelle ma con valori che sono tipi di pelle (file a mano di M08) → Tipo di pelle', () => {
    expect(guessMapping(['SKU', 'Categoria', 'Posizione'], lists, [['A', 'visone', 'vetrina'], ['B', 'Volpe', 'vetrina']])).toEqual(['sku', 'furType', 'location']);
    expect(guessMapping(['SKU', 'Categoria'], lists, [['A', 'Pellicce']])).toEqual(['sku', 'category']);
  });
  it('export dell\'app: «Larghezza (campo)» → il campo; col JSON dei campi le colonne leggibili restano su Ignora', () => {
    expect(guessMapping(['SKU', 'Larghezza', 'Larghezza (campo)', 'Taglia'], lists)).toEqual(['sku', 'width', 'field:field_larg', 'field:field_taglia']);
    expect(guessMapping(['SKU', 'Dati Personalizzati JSON', 'Taglia', 'Immagini file'], lists)).toEqual(['sku', 'customData', 'ignore', 'imageFiles']);
  });
  it('una colonna per campo (la seconda «Prezzo» su Ignora); campo nel cestino non abbinato', () => {
    expect(guessMapping(['SKU', 'Prezzo', 'Prezzo vendita', 'Vecchio', 'Foto 2'], lists)).toEqual(['sku', 'sellPrice', 'ignore', 'ignore', 'images']);
  });
});

describe('previewImport', () => {
  it('righe-errate.csv: rifiutate col motivo, avvisi su prezzo, posizione, categoria, stato e obbligatori', () => {
    const p = run(fixture('righe-errate.csv'));
    expect(p.rejected.map((r) => [r.row, r.sku, r.reason])).toEqual([
      [3, 'VIS-0142', 'SKU già presente'],
      [4, 'vis-0142', 'SKU già presente'],
      [5, '', 'SKU vuoto'],
      [6, 'ERR-GIAC', 'giacenza non valida «abc»'],
      [8, 'ERR-NOPOS', 'manca la Posizione'],
      [9, 'ERR-POSX', 'posizione sconosciuta «Magazzino Centrale»'],
      [10, 'ERR-OK', 'SKU ripetuto nel file (riga 2)'],
    ]);
    expect(p.toAdd.map((r) => r.sku)).toEqual(['ERR-OK', 'ERR-PREZZO', 'ERR-STATO']);
    const texts = p.warnings.map((w) => w.text);
    expect(texts).toContain('Prezzo vendita: 1 valore illeggibile, lasciati vuoti');
    expect(texts).toContain('Posizione sconosciuta «Magazzino Centrale» (1 riga rifiutata)');
    expect(texts).toContain('Stato sconosciuto «boh» (1 riga): disponibile');
    expect(texts.some((t) => t.startsWith('«Taglia» è obbligatorio'))).toBe(true);
    expect(p.warnings.find((w) => w.kind === 'location')?.value).toBe('Magazzino Centrale');
    expect(p.toAdd[0].product).toMatchObject({ location: 'vetrina', furType: 'visone', sellPrice: 1500, libraryId: 'pellicce', technicalNotes: undefined });
    // «Usa…» per Magazzino Centrale e valore per le righe vuote: le due righe passano
    const fixed = run(fixture('righe-errate.csv'), { locationChoice: { 'magazzino centrale': 'magazzino' }, defaults: { location: 'stand_a' } });
    expect(fixed.toAdd.map((r) => [r.sku, r.product.location])).toEqual([['ERR-OK', 'vetrina'], ['ERR-PREZZO', 'vetrina'], ['ERR-NOPOS', 'stand_a'], ['ERR-POSX', 'magazzino'], ['ERR-STATO', 'vetrina']]);
    expect(fixed.warnings.find((w) => w.kind === 'category')?.value).toBe('Borse');
  });

  it('numeri: «1.250,00» e «1.250» = 1250 in un file d\'altri, «129,90»; nell\'export dell\'app «2.125» = 2,125', () => {
    const p = run(fixture('altro-gestionale-virgola.csv'), { locationChoice: {}, defaults: { location: 'vetrina' } });
    expect(p.toAdd[0].product.sellPrice).toBe(1250);
    const pv = run(fixture('altro-gestionale-pv.csv'), { defaults: { location: 'magazzino' } });
    expect(pv.toAdd.map((r) => r.product.sellPrice)).toEqual([129.9, 59]);
    expect(run('SKU;Posizione;Prezzo\r\nN-1;vetrina;1.250\r\n').toAdd[0].product.sellPrice).toBe(1250);
    expect(run('SKU,Tipo di pelle,Posizione,Unità,Giacenza\r\nN-2,visone,vetrina,kg,vetrina:2.125\r\n').toAdd[0].stock).toEqual({ vetrina: 2.125 });
  });

  it('quantità sola → giacenza nella posizione; Colore con un valore nuovo aggiunto alle opzioni; immagini da più colonne', () => {
    // senza obbligatori nel modulo (la Sciarpa non ha la Taglia)
    const p = run(fixture('altro-gestionale-virgola.csv'), { defaults: { location: 'vetrina' }, layoutFields: [] });
    const [a, s] = p.toAdd;
    expect(a.stock).toEqual({ vetrina: 2 });
    expect(a.product.status).toBe('available');
    expect(a.product.libraryId).toBe('pellicce');
    expect(a.product.images).toEqual(['https://img.prova.test/a1.png', 'https://img.prova.test/a2.png', 'https://img.prova.test/a3.png']);
    expect(a.product.customData.map((c) => [c.fieldSnapshot.id, c.value])).toEqual([['field_taglia', 'opt_1'], ['field_colore', 'opt_0']]);
    // Rosso non c'è: opzione nuova, stessa per tutte le righe
    expect(s.product.customData.find((c) => c.fieldSnapshot.id === 'field_colore')?.value).toMatch(/^opt_/);
    expect(p.newOptions).toHaveLength(1);
    expect(p.newOptions[0].options.map((o) => o.label)).toEqual(['Nero', 'Grigio perla', 'Rosso']);
    expect(p.warnings.map((w) => w.text)).toContain('Colore: valori nuovi «Rosso», aggiunti alle opzioni');
    expect(p.rejected).toEqual([]);
    // con la Taglia obbligatoria e la colonna abbinata, la Sciarpa (cella vuota) si rifiuta col motivo
    const strict = run(fixture('altro-gestionale-virgola.csv'), { defaults: { location: 'vetrina' } });
    expect(strict.rejected.map((r) => [r.sku, r.reason])).toEqual([['ALT-002', 'manca «Taglia» (obbligatorio)']]);
  });

  it('obbligatori: colonna abbinata e cella vuota → rifiutata col nome del campo', () => {
    const p = run('SKU,Posizione,Taglia\r\nT-1,vetrina,M\r\nT-2,vetrina,\r\n');
    expect(p.toAdd.map((r) => r.sku)).toEqual(['T-1']);
    expect(p.rejected[0]).toMatchObject({ row: 3, sku: 'T-2', reason: 'manca «Taglia» (obbligatorio)' });
  });

  it('immagini-link.csv: JSON, «;», link Drive con avviso; le foto del dispositivo restano com\'erano', () => {
    const p = run(fixture('immagini-link.csv'));
    const by = (sku: string) => p.toAdd.find((r) => r.sku === sku)!.product;
    expect(by('IMG-JSON').images).toEqual(['https://img.prova.test/f1.png', 'https://img.prova.test/f2.png']);
    expect(by('IMG-JSON').backupImageLinks).toHaveLength(3);
    expect(by('IMG-PV').images).toEqual(['https://img.prova.test/f3.png', 'https://img.prova.test/f4.png']);
    expect(p.warnings.some((w) => w.key === 'drive')).toBe(true);
    expect(by('IMG-LOCALE').images).toHaveLength(2);
  });

  it('foto dello ZIP nella loro posizione, link dopo; nome mancante con avviso', () => {
    const photos = new Map([['A-1.jpg', 'data:image/jpeg;base64,AAA'], ['A-3.png', 'data:image/png;base64,BBB']]);
    const p = run('SKU,Posizione,Immagini URL,Immagini file\r\nA,vetrina,"[""https://x.test/2.jpg""]",A-1.jpg; A-3.png; A-9.jpg\r\n', { photos });
    expect(p.toAdd[0].product.images).toEqual(['data:image/jpeg;base64,AAA', 'https://x.test/2.jpg', 'data:image/png;base64,BBB']);
    expect(p.warnings.map((w) => w.text)).toContain('1 foto non trovata nello ZIP');
  });

  it('andata e ritorno con l\'export dell\'app: campi dal JSON, stessi valori', () => {
    const source: Product = {
      id: 'p1', sku: 'RT-1', furType: 'visone', location: 'vetrina', status: 'sold', images: ['https://x.test/a.jpg'], createdAt: '', updatedAt: '',
      sellPrice: 1250.5, libraryId: 'visone-cat', technicalNotes: 'Nota, con virgola',
      customData: [{ value: 'opt_1', fieldSnapshot: FIELDS[1] }, { value: ['opt_0', 'opt_1'], fieldSnapshot: FIELDS[3] }],
    };
    const rows = productCsvRows([source], CATEGORIES, [], { fields: FIELDS });
    const csv = rows.map((r) => r.map((v) => { const t = v == null ? '' : String(v); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(',')).join('\r\n');
    const p = run(`﻿${csv}`, { products: [] });
    expect(p.rejected).toEqual([]);
    const got = p.toAdd[0].product;
    expect(got).toMatchObject({ sku: 'RT-1', status: 'sold', sellPrice: 1250.5, libraryId: 'visone-cat', technicalNotes: 'Nota, con virgola', images: ['https://x.test/a.jpg'] });
    expect(got.customData.map((c) => [c.fieldSnapshot.id, c.value])).toEqual([['field_taglia', 'opt_1'], ['field_dett', ['opt_0', 'opt_1']]]);
    expect(p.newOptions).toEqual([]);
  });

  it('SKU di un prodotto nel Cestino; GS1 come in Aggiungi; nulla di scritto (funzione pura)', () => {
    const gs1 = jest.fn((sku: string, n: number) => `https://id.test/01/${sku}?n=${n}`);
    const p = run('SKU,Posizione\r\nOLD-1,vetrina\r\nNEW-1,vetrina\r\nNEW-2,vetrina,\r\n', { gs1 });
    expect(p.rejected[0].reason).toBe('SKU già presente (nel Cestino)');
    expect(p.toAdd.map((r) => r.product.gs1DigitalLink)).toEqual(['https://id.test/01/NEW-1?n=2', 'https://id.test/01/NEW-2?n=3']);
    // con la colonna GS1 (export dell'app) la cella vuota resta vuota, una scritta resta quella
    const own = run('SKU,Posizione,GS1 Digital Link\r\nNEW-3,vetrina,\r\nNEW-4,vetrina,https://id.test/01/X\r\n', { gs1 });
    expect(own.toAdd.map((r) => r.product.gs1DigitalLink)).toEqual([undefined, 'https://id.test/01/X']);
  });

  it('righe rifiutate da scaricare con il motivo', () => {
    const p = run('SKU,Posizione\r\n,vetrina\r\n');
    expect(rejectedRows(p.header, p.rejected)).toEqual([['SKU', 'Posizione', 'Motivo'], ['', 'vetrina', 'SKU vuoto']]);
  });
});

describe('aiuti', () => {
  it('requiredFor: solo i campi visibili nel modulo e obbligatori', () => {
    expect(requiredFor({}, [...LAYOUT, { id: 'field_larg', type: 'custom', visible: false }], FIELDS).map((f) => f.id)).toEqual(['field_taglia']);
  });
  it('guessFieldType per «+ Crea campo»', () => {
    expect(guessFieldType(['Montone', 'Lana', 'Montone'])).toEqual({ type: 'single_choice', options: ['Montone', 'Lana'] });
    expect(guessFieldType(['12', '3,5'])).toEqual({ type: 'number', options: [] });
    expect(guessFieldType(['https://a.test/x.png'])).toEqual({ type: 'images', options: [] });
    expect(guessFieldType([])).toEqual({ type: 'text_short', options: [] });
  });
  it('splitList e newLocationId', () => {
    expect(splitList('a; b|c\nd')).toEqual(['a', 'b', 'c', 'd']);
    expect(splitList('["x","y"]')).toEqual(['x', 'y']);
    expect(newLocationId('Magazzino Centrale', [{ id: 'magazzino_centrale' }])).toBe('magazzino_centrale_2');
  });
});

describe('correzioni del revisore (DATI)', () => {
  const lists = { fields: [...FIELDS, field({ id: 'field_qta', name: 'Quantità', type: 'number' })], furTypes: DEFAULT_FUR_TYPES, categories: CATEGORIES };
  it('export dell\'app: un campo chiamato come un sinonimo («Quantità») non prende la colonna di sistema', () => {
    expect(guessMapping(['SKU', 'Dati Personalizzati JSON', 'Quantità', 'Immagini file', 'Taglia'], lists)).toEqual(['sku', 'customData', 'ignore', 'imageFiles', 'ignore']);
  });
  it('valori come «constructor» non escono dal prototipo', () => {
    const p = run('SKU,Posizione,Status\r\nP-1,constructor,constructor\r\nP-2,vetrina,constructor\r\n');
    expect(p.rejected[0].reason).toBe('posizione sconosciuta «constructor»');
    expect(p.toAdd[0].product.status).toBe('available');
  });
});
