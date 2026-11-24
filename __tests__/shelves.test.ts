import type { Product } from '../types';
import {
  GENERIC_SHELF, isShelfPlace, keptShelfId, locationShelvesError, newShelfId, parseShelves, placeWithShelf,
  productShelf, productShelfId, shelfData, shelfDeleteError, shelfIdFromCsv, shelfKind, shelfNameError, shelfPatch,
  shelfUsage, shelvesByLocation, shelvesFor, shelvesOfCategory, stockKeyFromCsv, stockPlaceLabel, suggestShelfCode,
  UNKNOWN_SHELF, withKeptShelf, withShelfRead, type Shelf,
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

  it('withShelfRead: un pezzo unico con uno scaffale che non torna si legge senza; gli altri uguali', () => {
    const stray = piece({ location: 'vetrina', shelfId: a1.id });
    expect('shelfId' in withShelfRead(stray, shelves)).toBe(false);
    expect('shelfId' in withShelfRead(piece({ shelfId: 'sparito' }), shelves)).toBe(false);
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
