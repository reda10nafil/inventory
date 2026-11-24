import type { Product } from '../types';
import {
  GENERIC_SHELF, isShelfPlace, keptShelfId, locationShelvesError, newShelfId, parseShelves, placeWithShelf,
  productShelf, productShelfId, shelfData, shelfDeleteError, shelfIdFromCsv, shelfKind, shelfNameError, shelfPatch,
  shelfUsage, shelvesByLocation, shelvesFor, shelvesOfCategory, stockKeyFromCsv, stockPlaceLabel, suggestShelfCode,
  UNKNOWN_SHELF, withKeptShelf, withShelfRead, type Shelf,
  capacityFromForm, capacityText, fillLevel, fillText, fitCount, fitCountText, fitsShelf, freeText, measuresText, shelfCapacity,
  shelfLoad, shelvesOfProduct,
} from '../utils/shelves';
import { movementOf } from '../utils/inventoryOps';
import { codeError, codeOwner } from '../utils/codes';

const categories = [
  { id: 'pellicce', name: 'Pellicce' },
  { id: 'visone', name: 'Visone', parentId: 'pellicce' },
  { id: 'accessori', name: 'Accessori' },
];
const locations = [{ id: 'magazzino', label: 'Magazzino', barcode: 'LOC-MAGAZZINO' }, { id: 'vetrina', label: 'Vetrina' }];
const a1: Shelf = { id: '1700000000000-aaa', name: 'A1', locationId: 'magazzino' };
const a10: Shelf = { id: '1700000000000-bbb', name: 'A10', locationId: 'magazzino', libraryId: 'pellicce', barcode: 'SCAF-A10' };
const a2: Shelf = { id: '1700000000000-ccc', name: 'A2', locationId: 'magazzino', libraryId: 'visone' };
const acc: Shelf = { id: '1700000000000-ddd', name: 'Borse', locationId: 'magazzino', libraryId: 'accessori' };
const v1: Shelf = { id: '1700000000000-eee', name: 'V1', locationId: 'vetrina' };
const shelves = [a1, a10, a2, acc, v1];

const NOW = '2026-11-22T10:00:00.000Z';
const piece = (extra: Partial<Product> = {}): Product => ({
  id: 'p1', sku: 'VIS-1', furType: 'visone', location: 'magazzino', status: 'available', images: [], customData: [],
  createdAt: NOW, updatedAt: NOW, ...extra,
});

describe('parseShelves e shelfData', () => {
  it('senza lista, o con una lista rovinata, l\'elenco è vuoto e non lancia', () => {
    expect(parseShelves(null)).toEqual([]);
    expect(parseShelves('')).toEqual([]);
    expect(parseShelves('{non json')).toEqual([]);
    expect(parseShelves('{"id":"x"}')).toEqual([]);
  });
  it('scarta una per una le voci senza id, nome o posizione e gli id doppi; pulisce gli spazi', () => {
    const raw = JSON.stringify([
      { id: ' s1 ', name: ' A1 ', locationId: 'magazzino', barcode: '  ', nfcTag: ' 04:A2 ', createdAt: NOW },
      { id: 's1', name: 'doppio', locationId: 'magazzino' },
      { id: 's2', name: '', locationId: 'magazzino' },
      { id: 's3', name: 'B', locationId: '' },
      'testo', null,
      { id: 's4', name: 'C', locationId: 'vetrina', libraryId: 'pellicce', extra: 1 },
    ]);
    expect(parseShelves(raw)).toEqual([
      { id: 's1', name: 'A1', locationId: 'magazzino', nfcTag: '04:A2', createdAt: NOW },
      { id: 's4', name: 'C', locationId: 'vetrina', libraryId: 'pellicce' },
    ]);
  });
  it('shelfData non salva i campi facoltativi vuoti', () => {
    expect(shelfData({ name: ' A1 ', locationId: 'magazzino', libraryId: '', barcode: ' X ', nfcTag: '' })).toEqual({ name: 'A1', locationId: 'magazzino', barcode: 'X' });
  });
});

describe('newShelfId', () => {
  it('è opaco come quello dei prodotti e non dipende dal nome: non si scontra con gli id di posizioni e categorie', () => {
    const id = newShelfId([], 1732000000000, 0.123456789);
    expect(id).toMatch(/^1732000000000-[a-z0-9]+$/);
    expect(['magazzino', 'vetrina', 'pellicce', 'visone']).not.toContain(id);
  });
  it('se l\'id c\'è già aggiunge un numero', () => {
    const first = newShelfId([], 5, 0.5);
    expect(newShelfId([{ id: first }], 5, 0.5)).toBe(`${first}-2`);
    expect(newShelfId([{ id: first }, { id: `${first}-2` }], 5, 0.5)).toBe(`${first}-3`);
  });
});

describe('shelfNameError', () => {
  it('nome e posizione obbligatori', () => {
    expect(shelfNameError(shelves, '  ', 'magazzino')).toBe('Inserisci un nome per lo scaffale');
    expect(shelfNameError(shelves, 'Z', '')).toBe('Scegli la posizione dello scaffale');
  });
  it('il nome è unico dentro la posizione, con maiuscole e spazi indifferenti; in un\'altra posizione va bene', () => {
    expect(shelfNameError(shelves, ' a1 ', 'magazzino')).toBe('In questa posizione c\'è già lo scaffale "A1"');
    expect(shelfNameError(shelves, 'A1', 'vetrina')).toBeNull();
    expect(shelfNameError(shelves, 'A1', 'magazzino', a1.id)).toBeNull();
  });
});

describe('productShelfId (lettura)', () => {
  it('un pezzo unico sul suo scaffale lo vede', () => {
    expect(productShelfId(piece({ shelfId: a1.id }), shelves)).toBe(a1.id);
    expect(productShelf(piece({ shelfId: a1.id }), shelves)).toBe(a1);
  });
  it('si ignora uno scaffale sconosciuto, di un\'altra posizione o su un articolo a quantità', () => {
    expect(productShelfId(piece({ shelfId: 'sparito' }), shelves)).toBeUndefined();
    expect(productShelfId(piece({ shelfId: v1.id }), shelves)).toBeUndefined();
    expect(productShelfId(piece({ shelfId: a1.id, stock: { magazzino: 2 } }), shelves)).toBeUndefined();
    expect(productShelfId(piece(), shelves)).toBeUndefined();
  });
});

describe('keptShelfId e shelfPatch (scrittura)', () => {
  it('lo scaffale resta se è nella posizione del prodotto', () => {
    expect(keptShelfId(shelves, piece({ shelfId: a1.id }))).toBe(a1.id);
  });
  it('se la posizione cambia e lo scaffale non è di quella posizione, si toglie', () => {
    const before = piece({ shelfId: a1.id });
    expect(keptShelfId(shelves, { ...before, location: 'vetrina' }, before)).toBeUndefined();
    expect(shelfPatch(before, { location: 'vetrina' }, shelves)).toEqual({ location: 'vetrina', shelfId: undefined });
  });
  it('nuova posizione e nuovo scaffale di quella posizione: resta', () => {
    const before = piece({ shelfId: a1.id });
    expect(shelfPatch(before, { location: 'vetrina', shelfId: v1.id }, shelves)).toEqual({ location: 'vetrina', shelfId: v1.id });
  });
  it('un articolo a quantità non ha scaffale (primo movimento di un pezzo unico)', () => {
    const before = piece({ shelfId: a1.id });
    expect(shelfPatch(before, { stock: { magazzino: 3 }, location: 'magazzino' }, shelves)).toEqual({ stock: { magazzino: 3 }, location: 'magazzino', shelfId: undefined });
  });
  it('scaffale sconosciuto: resta finché la scrittura non tocca scaffale o posizione (elenco non ancora letto)', () => {
    const before = piece({ shelfId: 'altrove' });
    expect(shelfPatch(before, { sellPrice: 10 }, [])).toEqual({ sellPrice: 10 });
    expect(shelfPatch(before, { location: 'vetrina' }, [])).toEqual({ location: 'vetrina', shelfId: undefined });
    expect(keptShelfId([], piece({ shelfId: 'nuovo' }), before)).toBeUndefined();
  });
  it('un prodotto di oggi (senza scaffale) non riceve il campo: lo stato salvato resta identico', () => {
    const before = piece();
    const patch = shelfPatch(before, { location: 'vetrina', shelfId: undefined }, shelves);
    expect(patch).toEqual({ location: 'vetrina' });
    expect('shelfId' in patch).toBe(false);
    expect(shelfPatch(before, { sellPrice: 5 }, shelves)).toEqual({ sellPrice: 5 });
  });
  it('Modifica che sceglie uno scaffale di un\'altra posizione: non si salva', () => {
    expect(shelfPatch(piece(), { location: 'magazzino', shelfId: v1.id }, shelves)).toEqual({ location: 'magazzino' });
  });
  it('withKeptShelf per un prodotto nuovo: scaffale valido sì, sconosciuto o di un\'altra posizione no, a quantità no', () => {
    expect(withKeptShelf(piece({ shelfId: a1.id }), shelves).shelfId).toBe(a1.id);
    expect('shelfId' in withKeptShelf(piece({ shelfId: 'sconosciuto' }), shelves)).toBe(false);
    expect('shelfId' in withKeptShelf(piece({ shelfId: v1.id }), shelves)).toBe(false);
    expect('shelfId' in withKeptShelf(piece({ shelfId: a1.id, stock: { magazzino: 1 } }), shelves)).toBe(false);
    const today = piece();
    expect(withKeptShelf(today, shelves)).toBe(today);
  });
});

describe('shelvesFor (proposte)', () => {
  const names = (list: Shelf[]) => list.map((s) => s.name);
  it('categoria e i generici della posizione, prima quelli della categoria; ordine naturale dei nomi', () => {
    expect(names(shelvesFor(shelves, categories, { location: 'magazzino', libraryId: 'pellicce' }))).toEqual(['A10', 'A1']);
  });
  it('sottocategoria: anche gli scaffali della categoria principale sopra', () => {
    expect(names(shelvesFor(shelves, categories, { location: 'magazzino', libraryId: 'visone' }))).toEqual(['A2', 'A10', 'A1']);
  });
  it('senza categoria solo i generici; senza posizione nessuno; mai quelli di un\'altra posizione', () => {
    expect(names(shelvesFor(shelves, categories, { location: 'magazzino' }))).toEqual(['A1']);
    expect(shelvesFor(shelves, categories, { location: '' })).toEqual([]);
    expect(names(shelvesFor(shelves, categories, { location: 'vetrina', libraryId: 'visone' }))).toEqual(['V1']);
  });
  it('in Modifica c\'è anche lo scaffale di adesso, se è in quella posizione', () => {
    expect(names(shelvesFor(shelves, categories, { location: 'magazzino', libraryId: 'pellicce' }, acc.id))).toEqual(['A10', 'A1', 'Borse']);
    expect(names(shelvesFor(shelves, categories, { location: 'vetrina' }, acc.id))).toEqual(['V1']);
  });
});

describe('nomi, gruppi e uso', () => {
  it('shelfKind e placeWithShelf', () => {
    expect(shelfKind(a1, categories)).toBe(GENERIC_SHELF);
    expect(shelfKind(a2, categories)).toBe('Pellicce › Visone');
    expect(placeWithShelf('Magazzino', a1)).toBe('Magazzino › A1');
    expect(placeWithShelf('Magazzino')).toBe('Magazzino');
  });
  it('shelvesByLocation: nell\'ordine delle posizioni, senza gruppi vuoti, poi le posizioni sparite', () => {
    const lost: Shelf = { id: 'x', name: 'Z', locationId: 'sparita' };
    const groups = shelvesByLocation([...shelves, lost], locations);
    expect(groups.map((g) => [g.label, g.shelves.map((s) => s.name)])).toEqual([
      ['Magazzino', ['A1', 'A2', 'A10', 'Borse']],
      ['Vetrina', ['V1']],
      ['sparita', ['Z']],
    ]);
    expect(shelvesByLocation([], locations)).toEqual([]);
  });
  it('shelfUsage conta i prodotti che stanno davvero sullo scaffale, separando il cestino', () => {
    const usage = shelfUsage([
      piece({ shelfId: a1.id }),
      piece({ id: 'p2', shelfId: a1.id, deletedAt: NOW }),
      piece({ id: 'p3', shelfId: a1.id, status: 'sold' }),
      piece({ id: 'p4', shelfId: a1.id, location: 'vetrina' }),
      piece({ id: 'p5', shelfId: a1.id, stock: { magazzino: 1 } }),
      piece({ id: 'p6' }),
    ], shelves);
    expect(usage).toEqual({ [a1.id]: { active: 2, trashed: 1 } });
  });
  it('shelfDeleteError: con prodotti (anche nel cestino) non si elimina', () => {
    expect(shelfDeleteError(a1, undefined)).toBeNull();
    expect(shelfDeleteError(a1, { active: 0, trashed: 0 })).toBeNull();
    expect(shelfDeleteError(a1, { active: 1, trashed: 0 })).toBe('Lo scaffale "A1" ha 1 prodotto. Spostalo in un altro scaffale o posizione prima di eliminarlo.');
    expect(shelfDeleteError(a1, { active: 2, trashed: 1 })).toBe('Lo scaffale "A1" ha 2 prodotti e 1 nel cestino. Spostali in un altro scaffale o posizione prima di eliminarlo. Quello nel cestino si può anche eliminare per sempre dal Cestino.');
    expect(shelfDeleteError(a1, { active: 0, trashed: 2 })).toBe('Lo scaffale "A1" ha 2 prodotti nel cestino. Spostali in un altro scaffale o posizione prima di eliminarlo. Quelli nel cestino si possono anche eliminare per sempre dal Cestino.');
  });
  it('locationShelvesError e shelvesOfCategory', () => {
    expect(locationShelvesError('Magazzino', shelves, 'magazzino')).toBe('La posizione "Magazzino" ha 4 scaffali: eliminali prima da Impostazioni › Scaffali.');
    expect(locationShelvesError('Vetrina', shelves, 'vetrina')).toBe('La posizione "Vetrina" ha 1 scaffale: eliminalo prima da Impostazioni › Scaffali.');
    expect(locationShelvesError('Sartoria', shelves, 'sartoria')).toBeNull();
    expect(shelvesOfCategory(shelves, 'pellicce')).toBe(1);
    expect(shelvesOfCategory(shelves, 'visone')).toBe(1);
    expect(shelvesOfCategory(shelves, 'altro')).toBe(0);
  });
});

describe('codici', () => {
  const sources = { products: [{ id: 'cmp-1', sku: 'VIS-0142' }], locations, categories: [...categories.map((c) => ({ ...c })), { id: 'borse', name: 'Borse', barcode: 'LIB-BORSE' }], shelves };
  it('un codice già usato da prodotto, posizione, categoria o scaffale si rifiuta (dove guarda lo Scanner)', () => {
    expect(codeOwner('vis-0142', sources)).toBe('dal prodotto VIS-0142');
    expect(codeOwner('cmp-1', sources)).toBe('dal prodotto VIS-0142');
    expect(codeOwner('LOC-MAGAZZINO', sources)).toBe('dalla posizione "Magazzino"');
    expect(codeOwner('vetrina', sources)).toBe('dalla posizione "Vetrina"');
    expect(codeOwner('LIB-BORSE', sources)).toBe('dalla categoria "Borse"');
    expect(codeOwner('visone', sources)).toBe('dalla categoria "Pellicce › Visone"');
    expect(codeOwner(' scaf-a10 ', sources)).toBe('dallo scaffale "Magazzino › A10"');
    expect(codeOwner(a1.id, sources)).toBe('dallo scaffale "Magazzino › A1"');
    expect(codeError('SCAF-A10', sources)).toBe('Il codice "SCAF-A10" è già usato dallo scaffale "Magazzino › A10".');
    // moduli di Posizioni e Categorie: solo gli scaffali, col nome della posizione dato a parte
    expect(codeOwner('SCAF-A10', { shelves, placeLabel: (id) => (id === 'magazzino' ? 'Magazzino' : id) })).toBe('dallo scaffale "Magazzino › A10"');
    expect(codeOwner('LOC-MAGAZZINO', { shelves })).toBeNull();
  });
  it('lo scaffale che si modifica può tenere il suo codice; un codice nuovo o vuoto va bene', () => {
    expect(codeOwner('SCAF-A10', sources, { kind: 'shelf', id: a10.id })).toBeNull();
    expect(codeOwner('SCAF-NUOVO', sources)).toBeNull();
    expect(codeError('  ', sources)).toBeNull();
  });
  it('suggestShelfCode: dalla posizione e dal nome, con un numero se è già usato', () => {
    expect(suggestShelfCode('Magazzino', 'Scaffale à 1', () => false)).toBe('SCAF-MAGAZZINO-SCAFFALE-A-1');
    const taken = new Set(['SCAF-MAGAZZINO-A1', 'SCAF-MAGAZZINO-A1-2']);
    expect(suggestShelfCode('Magazzino', 'A1', (c) => taken.has(c))).toBe('SCAF-MAGAZZINO-A1-3');
    expect(suggestShelfCode('Magazzino', '  ', () => false)).toBe('');
  });
});

describe('CSV', () => {
  it('shelfIdFromCsv: per nome (maiuscole indifferenti) o id, solo tra gli scaffali della posizione del prodotto', () => {
    expect(shelfIdFromCsv(' a10 ', 'magazzino', shelves)).toBe(a10.id);
    expect(shelfIdFromCsv(a1.id, 'magazzino', shelves)).toBe(a1.id);
    expect(shelfIdFromCsv('V1', 'magazzino', shelves)).toBeUndefined();
    expect(shelfIdFromCsv('A1', '', shelves)).toBeUndefined();
    expect(shelfIdFromCsv('', 'magazzino', shelves)).toBeUndefined();
  });
  it('isShelfPlace: una posizione o una chiave della giacenza che è uno scaffale (id o codice)', () => {
    expect(isShelfPlace(shelves, ['magazzino', a1.id])).toBe(true);
    expect(isShelfPlace(shelves, ['SCAF-A10'])).toBe(true);
    expect(isShelfPlace(shelves, ['magazzino', 'vetrina', 'A1'])).toBe(false);
    expect(isShelfPlace(shelves, [''])).toBe(false);
  });
});

// S1b (ticket 13): giacenza degli articoli a quantità sugli scaffali, chiavi «posizione/idScaffale»
describe('giacenza sugli scaffali (S1b)', () => {
  const K1 = `magazzino/${a1.id}`;
  const label = (id: string) => locations.find((l) => l.id === id)?.label ?? id;

  it('shelfUsage conta anche gli articoli a quantità con giacenza sullo scaffale, anche nel cestino', () => {
    const usage = shelfUsage([
      piece({ stock: { [K1]: 3 } }),
      piece({ id: 'p2', stock: { magazzino: 1, [K1]: 2 }, deletedAt: NOW }),
      piece({ id: 'p3', stock: { [K1]: 0, magazzino: 4 } }),
      piece({ id: 'p4', stock: { [`magazzino/sparito`]: 1 } }),
      piece({ id: 'p5', shelfId: a1.id }),
      piece({ id: 'p6', stock: { [`vetrina/${a1.id}`]: 2 }, location: 'vetrina' }),
    ], shelves);
    expect(usage).toEqual({ [a1.id]: { active: 2, trashed: 1 } });
  });

  it('uno scaffale con giacenza non si elimina', () => {
    const usage = shelfUsage([piece({ stock: { [K1]: 3 } })], shelves);
    expect(shelfDeleteError(a1, usage[a1.id])).toMatch(/^Lo scaffale "A1" ha 1 prodotto\./);
  });

  it('stockPlaceLabel: «Magazzino», «Magazzino › A1», scaffale che questo dispositivo non conosce', () => {
    expect(stockPlaceLabel('magazzino', label, shelves)).toBe('Magazzino');
    expect(stockPlaceLabel(K1, label, shelves)).toBe('Magazzino › A1');
    expect(stockPlaceLabel('magazzino/sparito', label, shelves)).toBe(`Magazzino › ${UNKNOWN_SHELF}`);
    expect(stockPlaceLabel('deposito', label, shelves)).toBe('deposito');
    // A1 è di Magazzino: in una chiave di Vetrina (dato arrivato da fuori) non si nomina
    expect(stockPlaceLabel(`vetrina/${a1.id}`, label, shelves)).toBe(`Vetrina › ${UNKNOWN_SHELF}`);
  });

  it('withShelfRead: un pezzo unico con lo scaffale di un\'altra posizione si muove senza; uno sconosciuto resta', () => {
    const stray = piece({ location: 'vetrina', shelfId: a1.id });
    expect('shelfId' in withShelfRead(stray, shelves)).toBe(false);
    // Sconosciuto (o elenco non ancora letto, revisore): resta, la chiave magazzino/sparito resta in Magazzino
    const unknown = piece({ shelfId: 'sparito' });
    expect(withShelfRead(unknown, shelves)).toBe(unknown);
    expect(withShelfRead(piece({ shelfId: a1.id }), [])).toEqual(piece({ shelfId: a1.id }));
    const good = piece({ shelfId: a1.id });
    expect(withShelfRead(good, shelves)).toBe(good);
    const stocked = piece({ shelfId: a1.id, stock: { [K1]: 1 } });
    expect(withShelfRead(stocked, shelves)).toBe(stocked);
    // Il primo movimento parte allora dalla posizione: nessuna chiave «vetrina/<A1>»
    const r = movementOf(withShelfRead(stray, shelves), { kind: 'carico', qty: 2, to: 'vetrina' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.patch.stock).toEqual({ vetrina: 3 });
  });

  it('stockKeyFromCsv: la chiave esportata, posizione/nome, id o codice da solo; sconosciuto o rovinato → undefined', () => {
    expect(stockKeyFromCsv(K1, shelves)).toBe(K1);
    expect(stockKeyFromCsv('magazzino/ a10 ', shelves)).toBe(`magazzino/${a10.id}`);
    expect(stockKeyFromCsv(a1.id, shelves)).toBe(K1);
    expect(stockKeyFromCsv('SCAF-A10', shelves)).toBe(`magazzino/${a10.id}`);
    expect(stockKeyFromCsv('vetrina', shelves)).toBe('vetrina');
    expect(stockKeyFromCsv('A1', shelves)).toBe('A1'); // un nome da solo resta una posizione (sconosciuta), come prima
    expect(stockKeyFromCsv('magazzino/Z9', shelves)).toBeUndefined();
    expect(stockKeyFromCsv('vetrina/A1', shelves)).toBeUndefined(); // A1 è di Magazzino
    expect(stockKeyFromCsv('magazzino/', shelves)).toBeUndefined();
    expect(stockKeyFromCsv('/A1', shelves)).toBeUndefined();
  });

  it('productShelfId resta dei soli pezzi unici: lo scaffale di un articolo a quantità sta nella chiave', () => {
    expect(productShelfId(piece({ shelfId: a1.id, stock: { [K1]: 2 } }), shelves)).toBeUndefined();
    expect(keptShelfId(shelves, piece({ shelfId: a1.id, stock: { [K1]: 2 } }))).toBeUndefined();
  });
});

// ---- S2 (ticket 14 e 15): capacità, controllo del singolo prodotto, carico, riempimento, quanti ne entrano ----
describe('capacità degli scaffali (S2)', () => {
  const ripiano: Shelf = { id: '1700000000000-cap', name: 'A1', locationId: 'magazzino', length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 };
  const K = `magazzino/${ripiano.id}`;
  const box = (length?: number, width?: number, height?: number, weight?: number) => ({ length, width, height, weight });

  it('legge le misure e i limiti validi; uno scaffale di prima si rilegge e si riscrive identico', () => {
    const old = { id: 's1', name: 'A1', locationId: 'magazzino', barcode: 'SCAF-A1', createdAt: NOW };
    const [back] = parseShelves(JSON.stringify([old]));
    expect(JSON.stringify(back)).toBe(JSON.stringify(old));
    expect(JSON.stringify({ id: back.id, ...shelfData(back), createdAt: back.createdAt })).toBe(JSON.stringify(old));
    const [full] = parseShelves(JSON.stringify([{ ...old, kind: 'ripiano', length: 50, depth: 50.0004, height: 30, maxWeight: 10, maxPieces: 20 }]));
    expect(full).toEqual({ ...old, length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20 }); // «ripiano» non si salva
    const [bad] = parseShelves(JSON.stringify([{ ...old, kind: 'cassa', length: -1, depth: 0, height: '30', maxWeight: null, maxPieces: 2.5 }]));
    expect(bad).toEqual(old);
  });

  it('la barra tiene grucce, peso e altezza libera; lunghezza e profondità non contano', () => {
    expect(shelfCapacity({ kind: 'barra', length: 120, depth: 40, height: 150, maxWeight: 30, maxPieces: 15 }))
      .toEqual({ kind: 'barra', height: 150, maxWeight: 30, maxPieces: 15 });
    expect(shelfCapacity({ kind: 'ripiano', length: 50 })).toEqual({ length: 50 });
    expect(shelfCapacity({})).toEqual({});
  });

  it('fitsShelf: la scatola si gira', () => {
    expect(fitsShelf(box(25, 45, 48), ripiano)).toEqual({ fits: true }); // alta 48 ma si sdraia: 48 e 45 sotto 50, 25 sotto 30
    expect(fitsShelf(box(60, 40, 20), ripiano)).toEqual({ fits: false, reason: 'un lato di 60 cm è più grande di 50 cm' });
    expect(fitsShelf(box(50, 50, 30), ripiano)).toEqual({ fits: true }); // uguale entra
    expect(fitsShelf(box(45, 45, 31), ripiano)).toEqual({ fits: false, reason: 'un lato di 31 cm è più grande di 30 cm' });
  });

  it('fitsShelf: i lati che mancano al prodotto non si controllano, quelli che mancano al ripiano non limitano', () => {
    expect(fitsShelf(box(45), ripiano).fits).toBe(true);
    expect(fitsShelf(box(undefined, 60), ripiano)).toEqual({ fits: false, reason: 'un lato di 60 cm è più grande di 50 cm' });
    expect(fitsShelf(box(), ripiano).fits).toBe(true);
    const soloAltezza = { height: 30 };
    expect(fitsShelf(box(200, 150, 20), soloAltezza).fits).toBe(true);
    expect(fitsShelf(box(200, 150, 35), soloAltezza)).toEqual({ fits: false, reason: 'un lato di 35 cm è più grande di 30 cm' });
    expect(fitsShelf(box(500, 400, 300, 90), {}).fits).toBe(true); // nessuna misura: nessun limite
  });

  it('fitsShelf: la barra guarda il lato più lungo sotto l\'altezza libera', () => {
    const barra = { kind: 'barra' as const, height: 100, maxPieces: 15 };
    expect(fitsShelf(box(120, 50), barra)).toEqual({ fits: false, reason: 'è lungo 120 cm, sotto la barra ce ne sono 100' });
    expect(fitsShelf(box(95, 60, 10), barra).fits).toBe(true);
    expect(fitsShelf(box(300), { kind: 'barra' as const, maxPieces: 15 }).fits).toBe(true);
  });

  it('fitsShelf: il peso di un pezzo contro il peso massimo', () => {
    expect(fitsShelf(box(10, 10, 10, 12), ripiano)).toEqual({ fits: false, reason: 'pesa 12 kg, lo scaffale ne regge 10' });
    expect(fitsShelf(box(10, 10, 10, 10), ripiano).fits).toBe(true);
    expect(fitsShelf(box(10, 10, 10, 2.5), { maxWeight: 2 })).toEqual({ fits: false, reason: 'pesa 2,5 kg, lo scaffale ne regge 2' });
  });

  it('shelfLoad: pezzi unici e articoli a quantità sulla chiave dello scaffale, per il peso e il volume di ciascuno', () => {
    const products = [
      piece({ id: 'u1', shelfId: ripiano.id, weight: 2, length: 10, width: 10, height: 10 }), // 1 pezzo, 2 kg, 1000 cm³
      piece({ id: 'u2', shelfId: ripiano.id, status: 'sold', weight: 5 }), // venduto: non c'è
      piece({ id: 'u3', shelfId: ripiano.id, deletedAt: NOW, weight: 5 }), // nel cestino: non c'è
      piece({ id: 'u4', shelfId: ripiano.id, location: 'vetrina', weight: 5 }), // scaffale di un'altra posizione: non c'è
      piece({ id: 'q1', stock: { magazzino: 4, [K]: 3 }, unit: 'pz', weight: 1.5 }), // 3 sullo scaffale, senza misure
      piece({ id: 'q2', stock: { [`magazzino/${a1.id}`]: 9 }, weight: 1 }), // un altro scaffale
      piece({ id: 'q3', stock: { [K]: 2 } }), // senza peso: conta solo per i pezzi
    ];
    expect(shelfLoad(ripiano, products)).toEqual({ pieces: 6, weight: 6.5, volume: 1000 });
    expect(shelfLoad(ripiano, [])).toEqual({ pieces: 0, weight: 0, volume: 0 });
  });

  it('shelvesOfProduct: gli scaffali dove il prodotto sta davvero', () => {
    const list = [a1, ripiano, a2];
    expect(shelvesOfProduct(piece({ shelfId: ripiano.id }), list)).toEqual([ripiano]);
    expect(shelvesOfProduct(piece({ shelfId: ripiano.id, status: 'sold' }), list)).toEqual([]);
    expect(shelvesOfProduct(piece({ stock: { magazzino: 2, [K]: 1, [`magazzino/${a2.id}`]: 3 } }), list)).toEqual([ripiano, a2]);
    expect(shelvesOfProduct(piece({ stock: { [K]: 1 }, deletedAt: NOW }), list)).toEqual([]);
    expect(shelvesOfProduct(piece(), list)).toEqual([]);
  });

  it('fillLevel: il più alto dei tre; verde fino al 50%, blu fino all\'80%, rosso oltre, pieno al 100%', () => {
    const load = (pieces: number, weight = 0, volume = 0) => ({ pieces, weight, volume });
    expect(fillLevel({}, load(5))).toBeNull(); // senza limiti niente barra
    expect(fillLevel({ length: 50, height: 30 }, load(5))).toBeNull(); // due lati: niente volume
    expect(fillLevel(ripiano, load(0))).toEqual({ percent: 0, band: 'verde', full: false, by: 'pezzi' });
    expect(fillLevel(ripiano, load(10))).toMatchObject({ percent: 50, band: 'verde', full: false });
    expect(fillLevel(ripiano, load(11))).toMatchObject({ percent: 55, band: 'blu' });
    expect(fillLevel(ripiano, load(16))).toMatchObject({ percent: 80, band: 'blu' });
    expect(fillLevel(ripiano, load(17))).toMatchObject({ percent: 85, band: 'rosso', full: false });
    expect(fillLevel(ripiano, load(20))).toMatchObject({ percent: 100, band: 'rosso', full: true });
    expect(fillLevel(ripiano, load(22))).toMatchObject({ percent: 110, full: true });
    expect(fillLevel({ maxPieces: 200 }, load(199))).toMatchObject({ percent: 99, full: false });
    expect(fillLevel(ripiano, load(2, 9))).toMatchObject({ percent: 90, band: 'rosso', by: 'peso' });
    expect(fillLevel(ripiano, load(2, 1, 37500))).toMatchObject({ percent: 50, band: 'verde', by: 'volume' }); // 37.500 di 75.000 cm³
    expect(fillLevel({ maxWeight: 3 }, load(0, 0.9))).toMatchObject({ percent: 30 }); // 0,9 / 3 senza errori di arrotondamento
  });

  it('fitCount: il minimo tra pezzi, peso e volume liberi; 0 se pieno; non entra; nessun limite; non calcolabile', () => {
    const empty = { pieces: 0, weight: 0, volume: 0 };
    expect(fitCount(ripiano, box(60, 40, 20), empty)).toEqual({ kind: 'non-entra', reason: 'un lato di 60 cm è più grande di 50 cm' });
    expect(fitCount(ripiano, box(10, 10, 10, 12), empty)).toEqual({ kind: 'non-entra', reason: 'pesa 12 kg, lo scaffale ne regge 10' });
    expect(fitCount(ripiano, box(), empty)).toEqual({ kind: 'numero', count: 20, by: 'pezzi' }); // senza misure: solo i pezzi
    expect(fitCount(ripiano, box(10, 10, 10, 2), empty)).toEqual({ kind: 'numero', count: 5, by: 'peso' });
    expect(fitCount(ripiano, box(40, 30, 20, 0.1), empty)).toEqual({ kind: 'numero', count: 3, by: 'volume' }); // 75.000 / 24.000
    expect(fitCount(ripiano, box(), { pieces: 18, weight: 0, volume: 0 })).toEqual({ kind: 'numero', count: 2, by: 'pezzi' });
    expect(fitCount(ripiano, box(), { pieces: 23, weight: 0, volume: 0 })).toEqual({ kind: 'numero', count: 0, by: 'pezzi' }); // oltre: 0
    expect(fitCount(ripiano, box(10, 10, 10, 0.3), { pieces: 0, weight: 9.4, volume: 0 })).toEqual({ kind: 'numero', count: 2, by: 'peso' }); // 0,6 / 0,3
    expect(fitCount({ maxPieces: 4 }, box(), { pieces: 2.5, weight: 0, volume: 0 })).toEqual({ kind: 'numero', count: 1, by: 'pezzi' });
    expect(fitCount({}, box(40, 30, 20, 2), empty)).toEqual({ kind: 'nessun-limite' });
    expect(fitCount({ height: 30 }, box(40, 30, 20, 2), empty)).toEqual({ kind: 'nessun-limite' });
    expect(fitCount({ maxWeight: 10 }, box(40, 30, 20), empty)).toEqual({ kind: 'non-calcolabile', missing: 'peso' });
    expect(fitCount({ length: 50, depth: 50, height: 30 }, box(40, 30, undefined, 2), empty)).toEqual({ kind: 'non-calcolabile', missing: 'misure' });
    expect(fitCount({ length: 50, depth: 50, height: 30, maxWeight: 10 }, box(40, 30), empty)).toEqual({ kind: 'non-calcolabile', missing: 'peso e misure' });
    const barra = { kind: 'barra' as const, maxPieces: 15, height: 150 };
    expect(fitCount(barra, box(110, 60), { pieces: 15, weight: 0, volume: 0 })).toEqual({ kind: 'numero', count: 0, by: 'pezzi' });
    expect(fitCount(barra, box(160), empty)).toEqual({ kind: 'non-entra', reason: 'è lungo 160 cm, sotto la barra ce ne sono 150' });
    // Revisore di S2: un limite già pieno vale 0 anche se al prodotto manca il dato per quel limite
    expect(fitCount(ripiano, box(), { pieces: 5, weight: 12, volume: 0 })).toEqual({ kind: 'numero', count: 0, by: 'peso' });
    expect(fitCount(ripiano, box(), { pieces: 5, weight: 0, volume: 80000 })).toEqual({ kind: 'numero', count: 0, by: 'volume' });
    expect(fitCount({ maxWeight: 10 }, box(), { pieces: 0, weight: 10, volume: 0 })).toEqual({ kind: 'numero', count: 0, by: 'peso' });
    expect(fitCount({ maxWeight: 10 }, box(), { pieces: 0, weight: 9.9, volume: 0 })).toEqual({ kind: 'non-calcolabile', missing: 'peso' });
  });

  it('testi in italiano semplice, senza sigle', () => {
    expect(fitCountText({ kind: 'numero', count: 5, by: 'pezzi' }, 'A1')).toBe('Su A1 ne entrano ancora 5 come questo');
    expect(fitCountText({ kind: 'numero', count: 1, by: 'peso' }, 'A1')).toBe('Su A1 ne entra ancora 1 come questo');
    expect(fitCountText({ kind: 'numero', count: 3, by: 'volume' }, 'A1', 'come VIS-0142')).toBe('Su A1 ne entrano ancora circa 3 come VIS-0142');
    expect(fitCountText({ kind: 'numero', count: 0, by: 'pezzi' }, 'A1')).toBe('Su A1 non ne entrano altri: pezzi al massimo');
    expect(fitCountText({ kind: 'non-entra', reason: 'un lato di 60 cm è più grande di 50 cm' }, 'A1')).toBe('Su A1 non entra: un lato di 60 cm è più grande di 50 cm');
    expect(fitCountText({ kind: 'nessun-limite' }, 'A1')).toBe('A1: nessun limite');
    expect(fitCountText({ kind: 'non-calcolabile', missing: 'peso' }, 'A1')).toBe('A1: per sapere quanti ne entrano serve il peso del prodotto');
    expect(fitCountText({ kind: 'non-calcolabile', missing: 'misure' }, 'A1')).toBe('A1: per sapere quanti ne entrano servono le tre misure del prodotto');
    expect(capacityText(ripiano)).toBe('Base 50 × 50 cm, alta 30 cm · fino a 10 kg · fino a 20 pezzi');
    expect(capacityText({ length: 50, depth: 40 })).toBe('Base 50 × 40 cm');
    expect(capacityText({ length: 50, height: 30 })).toBe('Lunghezza 50 cm · altezza 30 cm');
    expect(capacityText({ height: 30, maxPieces: 1 })).toBe('Altezza 30 cm · fino a 1 pezzo');
    expect(capacityText({ kind: 'barra', height: 150, maxPieces: 15 })).toBe('Barra appendiabiti · altezza libera 150 cm · fino a 15 grucce');
    expect(capacityText({ kind: 'barra' })).toBe('Barra appendiabiti');
    expect(capacityText({})).toBe('');
    expect(freeText(ripiano, { pieces: 9, weight: 4.5, volume: 0 })).toBe('Liberi: 11 pezzi · 5,5 kg · 100% dello spazio');
    expect(freeText({ maxPieces: 20, maxWeight: 10 }, { pieces: 9, weight: 4.5, volume: 0 })).toBe('Liberi: 11 pezzi · 5,5 kg');
    expect(freeText({ kind: 'barra', maxPieces: 15 }, { pieces: 16, weight: 0, volume: 0 })).toBe('Liberi: 0 grucce');
    expect(freeText({ length: 50, depth: 50, height: 30 }, { pieces: 1, weight: 0, volume: 30000 })).toBe('Liberi: 60% dello spazio');
    expect(freeText({ length: 50, depth: 50 }, { pieces: 1, weight: 0, volume: 10 })).toBe('');
    expect(freeText(ripiano, { pieces: 1, weight: 1, volume: 80000 })).toBe('Liberi: 19 pezzi · 9 kg · 0% dello spazio');
    expect(fillText({ percent: 45, band: 'verde', full: false, by: 'pezzi' })).toBe('45%');
    expect(fillText({ percent: 100, band: 'rosso', full: true, by: 'pezzi' })).toBe('Pieno');
    expect(fillText({ percent: 110, band: 'rosso', full: true, by: 'peso' })).toBe('Pieno (110%)');
    expect(measuresText(box(40, 30, 20, 2.1))).toBe('40 × 30 × 20 cm · 2,1 kg');
    expect(measuresText(box())).toBe('');
  });

  it('capacityFromForm: vuoto = nessun limite, numeri con la virgola, errori chiari', () => {
    expect(capacityFromForm('ripiano', {})).toEqual({ capacity: {} });
    expect(capacityFromForm('ripiano', { length: '50', depth: ' 50 ', height: '30', maxWeight: '10,5', maxPieces: '20' }))
      .toEqual({ capacity: { length: 50, depth: 50, height: 30, maxWeight: 10.5, maxPieces: 20 } });
    expect(capacityFromForm('ripiano', { maxWeight: '-1' })).toEqual({ error: 'Peso massimo: scrivi un numero maggiore di zero, oppure lascialo vuoto.' });
    expect(capacityFromForm('ripiano', { length: 'tanto' }).error).toMatch(/^Lunghezza: /);
    expect(capacityFromForm('ripiano', { maxPieces: '2,5' })).toEqual({ error: 'Pezzi massimi: scrivi un numero intero.' });
    expect(capacityFromForm('barra', { length: 'x', maxPieces: '15', height: '150' })).toEqual({ capacity: { kind: 'barra', height: 150, maxPieces: 15 } });
    expect(capacityFromForm('barra', { maxPieces: '0' })).toEqual({ error: 'Grucce massime: scrivi un numero maggiore di zero, oppure lascialo vuoto.' });
    // Revisore di S2: un numero che si arrotonda a 0 non si salva in silenzio come «nessun limite»
    expect(capacityFromForm('ripiano', { maxWeight: '0,0004' }).error).toMatch(/^Peso massimo: /);
    expect(capacityFromForm('ripiano', { maxWeight: '0,0006' })).toEqual({ capacity: { maxWeight: 0.001 } });
  });
});
