// S3 (ticket 15): avviso, blocco e proposta al carico degli scaffali; capienza delle posizioni in pezzi (AU-V13);
// scaffale come destinazione negli spostamenti (`moveOf`, `runStep`).
import type { Product } from '../types';
import {
  checkLoadAt, checkPlaceCount, checkPlaceLoad, checkShelfLoad, fitCountText, fitsShelf, freeText, incomingLoad, loadOf, loadWarningText,
  noProposalText, overLimitText, proposalLabel, shelfLoad, type LoadData, type Shelf,
} from '../utils/shelves';
import { moveOf, moveSources } from '../utils/inventoryOps';
import { runStep, type RunContext } from '../utils/automationRun';
import { replayStock, stockOf } from '../utils/stock';

const NOW = '2026-11-24T10:00:00.000Z';
const categories = [
  { id: 'pellicce', name: 'Pellicce' },
  { id: 'visone', name: 'Visone', parentId: 'pellicce' },
  { id: 'borse', name: 'Borse' },
];
const piece = (extra: Partial<Product> = {}): Product => ({
  id: 'p1', sku: 'VIS-1', furType: 'visone', location: 'magazzino', status: 'available', images: [], customData: [],
  createdAt: NOW, updatedAt: NOW, ...extra,
});
const box = (length?: number, width?: number, height?: number, weight?: number) => ({ length, width, height, weight });
const shelf = (id: string, name: string, extra: Partial<Shelf> = {}): Shelf => ({ id: `1700000000000-${id}`, name, locationId: 'magazzino', ...extra });
/** `n` pezzi unici senza misure su uno scaffale. */
const onShelf = (s: Shelf, n: number, extra: Partial<Product> = {}): Product[] =>
  Array.from({ length: n }, (_, i) => piece({ id: `${s.id}-${i}`, sku: `P-${s.name}-${i}`, shelfId: s.id, ...extra }));
const arriving = (product: ReturnType<typeof box> & { libraryId?: string; unit?: string } = box(), add = 1, before = 0) => ({ product, before, add });

describe('checkShelfLoad: soglie', () => {
  const r2 = shelf('r2', 'R2', { maxPieces: 2 });
  const others = { shelves: [r2], categories };
  it('ripiano da 2 pezzi: il 1° entra, il 2° dà l\'avviso («sarà pieno»), il 3° il blocco coi numeri', () => {
    expect(checkShelfLoad(r2, [], arriving(), others)).toMatchObject({ level: 'ok', fill: { percent: 50 } });
    const second = checkShelfLoad(r2, onShelf(r2, 1), arriving(), others);
    expect(second).toMatchObject({ level: 'avviso', fill: { percent: 100, full: true } });
    expect(loadWarningText(second)).toBe('R2 sarà pieno');
    expect(checkShelfLoad(r2, onShelf(r2, 2), arriving(), others)).toMatchObject({ level: 'blocco', reason: '3 pezzi, il massimo è 2' });
  });
  it('50% ok, 79% ok, 80% avviso (dall\'80%, la percentuale per difetto come accanto alla barra), 85% avviso', () => {
    const a = shelf('a', 'A1', { maxPieces: 20 });
    const at = (n: number) => checkShelfLoad(a, onShelf(a, n), arriving(), { shelves: [a], categories });
    expect(at(9)).toMatchObject({ level: 'ok', fill: { percent: 50 } });
    expect(at(14)).toMatchObject({ level: 'ok', fill: { percent: 75 } });
    expect(at(15)).toMatchObject({ level: 'avviso', fill: { percent: 80 } });
    expect(loadWarningText(at(15))).toBe('A1 sarà pieno all\'80%');
    expect(loadWarningText(at(16))).toBe('A1 sarà pieno all\'85%');
    expect(loadWarningText(at(17))).toBe('A1 sarà pieno al 90%');
    expect(at(19)).toMatchObject({ level: 'avviso', fill: { percent: 100 } }); // il 20° pezzo: pieno, entra
    expect(at(20)).toMatchObject({ level: 'blocco', reason: '21 pezzi, il massimo è 20' }); // il 21°
    expect(checkShelfLoad(a, onShelf(a, 1), arriving(box(), 199 / 10), { shelves: [a], categories }).fill?.percent).toBe(104); // per difetto
  });
  it('blocco sulla quantità vera: 30,2 kg su 30 non entrano anche se la percentuale per difetto è 100', () => {
    const p = shelf('p', 'P1', { maxWeight: 30 });
    const r = checkShelfLoad(p, [], arriving(box(undefined, undefined, undefined, 30.2)), { shelves: [p], categories });
    expect(r).toMatchObject({ level: 'blocco', reason: 'Pesa 30,2 kg, lo scaffale ne regge 30' }); // un pezzo solo: fitsShelf
    const two = checkShelfLoad(p, [], arriving(box(undefined, undefined, undefined, 15.1), 2), { shelves: [p], categories });
    expect(two).toMatchObject({ level: 'blocco', reason: '30,2 kg, il massimo è 30 kg', fill: { percent: 100 } });
  });
  it('scaffale senza misure né limiti: sempre ok, niente riempimento', () => {
    const g = shelf('g', 'G1');
    expect(checkShelfLoad(g, onShelf(g, 50), arriving(box(200, 200, 200, 500), 10), { shelves: [g], categories })).toEqual({ level: 'ok', name: 'G1', place: 'scaffale', fill: null });
  });
});

describe('checkShelfLoad: blocco per lato, peso, pezzi, volume e grucce', () => {
  const a1 = shelf('a1', 'A1', { length: 50, depth: 50, height: 30, maxWeight: 10, maxPieces: 20, libraryId: 'borse' });
  const others = { shelves: [a1], categories };
  it('un prodotto 60×40×20 su un ripiano 50×50×30 vuoto: non entra, col motivo di fitsShelf', () => {
    const r = checkShelfLoad(a1, [], arriving(box(60, 40, 20)), others);
    expect(r).toMatchObject({ level: 'blocco', reason: 'Un lato di 60 cm è più grande di 50 cm' });
    expect(fitsShelf(box(60, 40, 20), a1)).toEqual({ fits: false, reason: 'un lato di 60 cm è più grande di 50 cm' }); // testo di S2 invariato
  });
  it('un prodotto da 12 kg su uno scaffale da 10 kg: blocco', () => {
    expect(checkShelfLoad(a1, [], arriving(box(10, 10, 10, 12)), others)).toMatchObject({ level: 'blocco', reason: 'Pesa 12 kg, lo scaffale ne regge 10' });
  });
  it('peso sommato: 4 kg + 7 kg su 10 kg', () => {
    const loaded = onShelf(a1, 1, { weight: 4 });
    expect(checkShelfLoad(a1, loaded, arriving(box(undefined, undefined, undefined, 7)), others)).toMatchObject({ level: 'blocco', reason: '11 kg, il massimo è 10 kg' });
  });
  it('volume: 4 scatole 40×30×20 (96.000 cm³) su 75.000 cm³', () => {
    const r = checkShelfLoad(a1, [], arriving(box(40, 30, 20, 0.1), 4), others);
    expect(r).toMatchObject({ level: 'blocco', reason: 'Lo spazio non basta: si arriverebbe al 128%' });
  });
  it('barra appendiabiti da 15 grucce: il 16° capo è bloccato («grucce»)', () => {
    const barra = shelf('b', 'Barra giacche', { kind: 'barra', maxPieces: 15, height: 150 });
    const r = checkShelfLoad(barra, onShelf(barra, 15), arriving(box(110, 50)), { shelves: [barra], categories });
    expect(r).toMatchObject({ level: 'blocco', reason: '16 grucce, il massimo è 15' });
    expect(checkShelfLoad(barra, [], arriving(box(160, 50)), { shelves: [barra], categories })).toMatchObject({ level: 'blocco', reason: 'È lungo 160 cm, sotto la barra ce ne sono 150' });
  });
});

describe('proposta (Scaffale proposto del ticket 15)', () => {
  const a1 = shelf('a1', 'A1', { maxPieces: 2, libraryId: 'borse' });
  const b2 = shelf('b2', 'B2', { maxPieces: 10, libraryId: 'borse' });
  const g1 = shelf('g1', 'G1', { maxPieces: 10 });
  const g2 = shelf('g2', 'G2', { maxPieces: 10 });
  const gl = shelf('gl', 'Libero'); // generico senza limiti
  const p1 = shelf('p1', 'P1', { maxPieces: 10, libraryId: 'pellicce' });
  const v1 = shelf('v1', 'V1', { maxPieces: 10, locationId: 'vetrina' });
  const all = [a1, b2, g1, g2, gl, p1, v1];
  const borsa = { ...box(), libraryId: 'borse' };
  it('prima la categoria del prodotto, poi i generici; mai un\'altra categoria o un\'altra posizione', () => {
    const r = checkShelfLoad(a1, onShelf(a1, 2), arriving(borsa), { shelves: all, categories });
    expect(r.proposal).toMatchObject({ name: 'B2', shelfId: b2.id, key: `magazzino/${b2.id}`, freePercent: 90, why: 'Su B2 ne entrano ancora 10 come questo' });
    expect(proposalLabel(r.proposal!)).toBe('Metti in B2 (libero al 90%)');
    const noB2 = checkShelfLoad(a1, [...onShelf(a1, 2), ...onShelf(b2, 8)], arriving(borsa), { shelves: all, categories });
    expect(noB2.proposal?.name).toBe('G1'); // B2 all'90% dopo il carico: generici, il più libero (a parità, per nome)
  });
  it('una categoria che contiene quella del prodotto vale come la sua (Pellicce per Visone)', () => {
    const visone = { ...box(), libraryId: 'visone' };
    expect(checkShelfLoad(a1, onShelf(a1, 2), arriving(visone), { shelves: all, categories }).proposal?.name).toBe('P1');
  });
  it('a parità di gruppo quello con più spazio libero; quelli senza limiti dopo', () => {
    const loaded = [...onShelf(a1, 2), ...onShelf(b2, 9), ...onShelf(g1, 5), ...onShelf(g2, 1)];
    const r = checkShelfLoad(a1, loaded, arriving(borsa), { shelves: all, categories });
    expect(r.proposal).toMatchObject({ name: 'G2', freePercent: 80 });
    const full = [...onShelf(a1, 2), ...onShelf(b2, 9), ...onShelf(g1, 9), ...onShelf(g2, 9)];
    const r2 = checkShelfLoad(a1, full, arriving(borsa), { shelves: all, categories });
    expect(r2.proposal).toMatchObject({ name: 'Libero', why: 'Libero: nessun limite' });
    expect(r2.proposal?.freePercent).toBeUndefined();
    expect(proposalLabel(r2.proposal!)).toBe('Metti in Libero');
  });
  it('una proposta deve far entrare il prodotto (lato) e restare sotto l\'80%; nessuna adatta: nessuna proposta', () => {
    const big = shelf('big', 'Grande', { length: 100, depth: 100, height: 100, maxPieces: 10 });
    const small = shelf('sm', 'Piccolo', { length: 30, depth: 30, height: 30, maxPieces: 10 });
    const r = checkShelfLoad(small, [], arriving(box(60, 40, 20)), { shelves: [small, big], categories });
    expect(r.proposal?.name).toBe('Grande');
    const none = checkShelfLoad(a1, onShelf(a1, 2), arriving(borsa), { shelves: [a1, v1], categories });
    expect(none).toMatchObject({ level: 'blocco' });
    expect(none.proposal).toBeUndefined();
    expect(noProposalText(none)).toBe('Nessun altro scaffale di questa posizione ha posto.');
  });
  it('anche l\'avviso porta la proposta', () => {
    const a = shelf('a', 'A', { maxPieces: 10 });
    expect(checkShelfLoad(a, onShelf(a, 8), arriving(), { shelves: [a, g1], categories })).toMatchObject({ level: 'avviso', proposal: { name: 'G1' } });
  });
});

describe('kg e metri: una cosa sola per scaffale (decisione 1 dell\'orchestratore, 24/11)', () => {
  const k = shelf('k', 'K1', { maxPieces: 3, maxWeight: 50 });
  const kgItem = (qty: number, extra: Partial<Product> = {}) => piece({ id: `kg-${qty}`, unit: 'kg', stock: { [`magazzino/${k.id}`]: qty }, ...extra });
  it('loadOf: kg = 1 pezzo e la quantità come peso; metri = 1 pezzo col suo peso; pz come prima', () => {
    expect(loadOf({ unit: 'kg', weight: 2 }, 12.5)).toEqual({ pieces: 1, weight: 12.5, volume: 0 });
    expect(loadOf({ unit: 'm', weight: 8, length: 150, width: 30, height: 30 }, 40)).toEqual({ pieces: 1, weight: 8, volume: 135000 });
    expect(loadOf({ unit: 'pz', weight: 2 }, 3)).toEqual({ pieces: 3, weight: 6, volume: 0 });
    expect(loadOf({ weight: 2 }, 1)).toEqual({ pieces: 1, weight: 2, volume: 0 });
    expect(loadOf({ unit: 'kg' }, 0)).toEqual({ pieces: 0, weight: 0, volume: 0 });
  });
  it('shelfLoad e il carico in arrivo: altri kg dello stesso articolo non sono un pezzo in più', () => {
    expect(shelfLoad(k, [kgItem(20)])).toEqual({ pieces: 1, weight: 20, volume: 0 });
    expect(incomingLoad({ product: { unit: 'kg' }, before: 20, add: 10 })).toEqual({ pieces: 0, weight: 10, volume: 0 });
    expect(incomingLoad({ product: { unit: 'kg' }, before: 0, add: 10 })).toEqual({ pieces: 1, weight: 10, volume: 0 });
    const r = checkShelfLoad(k, [kgItem(20)], { product: { unit: 'kg' }, before: 20, add: 35 }, { shelves: [k], categories });
    expect(r).toMatchObject({ level: 'blocco', reason: '55 kg, il massimo è 50 kg' });
  });
});

describe('capienza delle posizioni in pezzi (AU-V13)', () => {
  const places = [
    { id: 'magazzino', label: 'Magazzino' },
    { id: 'vetrina', label: 'Vetrina', capacity: 4 },
    { id: 'stand_a', label: 'Stand A', capacity: 10 },
    { id: 'stand_b', label: 'Stand B' },
  ];
  const vetrina = places[1];
  const inVetrina = [
    piece({ id: 'u1', location: 'vetrina' }),
    piece({ id: 'q1', location: 'vetrina', unit: 'pz', stock: { vetrina: 2 } }),
  ];
  it('conta i pezzi e non i prodotti: 1 pezzo unico + 2 pz = 3; il 4° pezzo dà l\'avviso, il 5° il blocco', () => {
    expect(checkPlaceLoad(vetrina, inVetrina, arriving(), places)).toMatchObject({ level: 'avviso', place: 'posizione', fill: { percent: 100 } });
    const r = checkPlaceLoad(vetrina, inVetrina, arriving(box(), 2), places);
    expect(r).toMatchObject({ level: 'blocco', reason: '5 pezzi, il massimo è 4' });
    expect(loadWarningText({ ...r, fill: { percent: 85, band: 'rosso', full: false, by: 'pezzi' } })).toBe('Vetrina sarà piena all\'85%');
  });
  it('la proposta è la posizione dopo nell\'elenco con posto (senza capienza entra sempre)', () => {
    const r = checkPlaceLoad(vetrina, inVetrina, arriving(box(), 2), places);
    expect(r.proposal).toMatchObject({ key: 'stand_a', locationId: 'stand_a', name: 'Stand A', freePercent: 80 });
    expect(proposalLabel(r.proposal!)).toBe('Metti in Stand A (libero all\'80%)');
    const standFull = [...inVetrina, piece({ id: 'q2', location: 'stand_a', unit: 'pz', stock: { stand_a: 9 } })];
    expect(checkPlaceLoad(vetrina, standFull, arriving(box(), 2), places).proposal).toMatchObject({ name: 'Stand B', why: 'Stand B: nessun limite' });
    expect(noProposalText({ place: 'posizione' })).toBe('Nessun\'altra posizione ha posto.');
  });
  it('senza capienza: sempre ok; un articolo in kg conta 1', () => {
    expect(checkPlaceLoad(places[0], inVetrina, arriving(box(), 100), places).level).toBe('ok');
    expect(checkPlaceLoad(vetrina, inVetrina, { product: { unit: 'kg' }, before: 0, add: 30 }, places).level).toBe('avviso'); // 3 + 1
  });
  it('checkPlaceCount (Conta, solo informazione): le quantità contate al posto delle registrate', () => {
    expect(checkPlaceCount(vetrina, inVetrina, { q1: 3 })).toMatchObject({ level: 'avviso', fill: { percent: 100 } });
    const over = checkPlaceCount(vetrina, inVetrina, { q1: 5 });
    expect(over).toMatchObject({ level: 'blocco', reason: '6 pezzi, il massimo è 4' });
    expect(overLimitText(over)).toBe('Vetrina è oltre il limite: 6 pezzi, il massimo è 4');
    expect(checkPlaceCount(places[0], inVetrina, { q1: 50 }).level).toBe('ok');
  });
});

describe('testi', () => {
  it('freeText non scende mai sotto 0 (carico oltre il volume del 10%: «0% dello spazio», non «-10%»)', () => {
    const r = { length: 50, depth: 50, height: 30 };
    expect(freeText(r, { pieces: 1, weight: 0, volume: 82500 })).toBe('Liberi: 0% dello spazio');
    expect(freeText({ maxPieces: 2, maxWeight: 5 }, { pieces: 3, weight: 6, volume: 0 })).toBe('Liberi: 0 pezzi · 0 kg');
  });
  it('fitCountText resta quello di S2', () => {
    expect(fitCountText({ kind: 'numero', count: 5, by: 'pezzi' }, 'A2')).toBe('Su A2 ne entrano ancora 5 come questo');
  });
  it('oltre il limite in una frase', () => {
    expect(overLimitText({ name: 'A1', reason: 'Un lato di 60 cm è più grande di 50 cm' })).toBe('A1 è oltre il limite: un lato di 60 cm è più grande di 50 cm');
  });
});

describe('scaffale come destinazione: moveOf e runStep (S3, da FLU1)', () => {
  const A1 = '1700000000000-a1';
  const A2 = '1700000000000-a2';
  const names = (id: string) => (id === A1 ? 'A1' : id === A2 ? 'A2' : '?');
  it('pezzo unico in un\'altra posizione: «spostato» con lo scaffale nel prodotto', () => {
    const r = moveOf(piece({ location: 'vetrina' }), `magazzino/${A1}`, NOW, names);
    expect(r).toEqual({
      ok: true,
      patch: { location: 'magazzino', shelfId: A1, updatedAt: NOW, lastScannedAt: NOW },
      events: [{ productId: 'p1', type: 'moved', timestamp: NOW, details: { from: 'vetrina', to: 'magazzino' } }],
    });
  });
  it('pezzo unico nella stessa posizione: il cambio di scaffale di Modifica; già su quello scaffale: «già lì»', () => {
    const r = moveOf(piece(), `magazzino/${A1}`, NOW, names);
    expect(r.ok && r.events).toEqual([{ productId: 'p1', type: 'modified', timestamp: NOW, details: { changes: ['Scaffale: — → A1'] } }]);
    const r2 = moveOf(piece({ shelfId: A1 }), `magazzino/${A2}`, NOW, names);
    expect(r2.ok && r2.events[0].details.changes).toEqual(['Scaffale: A1 → A2']);
    expect(moveOf(piece({ shelfId: A1 }), `magazzino/${A1}`, NOW, names)).toEqual({ ok: false, reason: 'same_place' });
    expect(moveOf(piece({ deletedAt: NOW }), `magazzino/${A1}`, NOW)).toEqual({ ok: false, reason: 'trash' });
    // verso la sola posizione resta come prima
    expect(moveOf(piece({ shelfId: A1 }), 'magazzino', NOW)).toEqual({ ok: false, reason: 'same_place' });
  });
  it('articolo a quantità: tutte le chiavi della posizione principale sullo scaffale, tranne quella dello scaffale; replay = giacenza', () => {
    const p = piece({ unit: 'pz', stock: { magazzino: 3, [`magazzino/${A1}`]: 2, [`magazzino/${A2}`]: 1, vetrina: 4 } });
    expect(moveSources(p, `magazzino/${A1}`)).toEqual([{ from: 'magazzino', qty: 3 }, { from: `magazzino/${A2}`, qty: 1 }]);
    const r = moveOf(p, `magazzino/${A1}`, NOW);
    expect(r.ok && r.patch.stock).toEqual({ [`magazzino/${A1}`]: 6, vetrina: 4 });
    const start = [{ type: 'stock' as const, details: { movement: 'carico' as const, qty: 3, to: 'magazzino' } },
      { type: 'stock' as const, details: { movement: 'carico' as const, qty: 2, to: `magazzino/${A1}` } },
      { type: 'stock' as const, details: { movement: 'carico' as const, qty: 1, to: `magazzino/${A2}` } },
      { type: 'stock' as const, details: { movement: 'carico' as const, qty: 4, to: 'vetrina' } }];
    expect(r.ok && replayStock([...start, ...r.events])).toEqual(r.ok && stockOf({ ...p, ...r.patch }));
    expect(moveOf(piece({ unit: 'pz', stock: { [`magazzino/${A1}`]: 2 } }), `magazzino/${A1}`, NOW)).toEqual({ ok: false, reason: 'same_place' });
    expect(moveOf(piece({ unit: 'pz', stock: { magazzino: 0 } }), `magazzino/${A1}`, NOW)).toEqual({ ok: false, reason: 'out_of_stock' });
    expect(moveSources(piece({ location: 'vetrina', shelfId: A2 }), `magazzino/${A1}`)).toEqual([{ from: `vetrina/${A2}`, qty: 1 }]);
  });
  it('runStep: «Sposta in» con l\'ultima posizione letta porta sullo scaffale letto con «Scansiona Posizione»', () => {
    const ctx = (extra: Partial<RunContext> = {}): RunContext => ({
      locationId: 'magazzino', locations: [{ id: 'magazzino', label: 'Magazzino' }, { id: 'vetrina', label: 'Vetrina' }], fields: [], now: NOW, ...extra,
    });
    const step = { type: 'move_to', config: { useLastScannedLocation: true } };
    expect(runStep(piece({ location: 'vetrina' }), step, ctx({ shelf: { id: A1, name: 'A1' } }))).toEqual({ ok: true, op: 'move', to: `magazzino/${A1}`, text: '📦 Spostato in Magazzino › A1' });
    expect(runStep(piece({ shelfId: A1 }), step, ctx({ shelf: { id: A1, name: 'A1' } }))).toMatchObject({ ok: true, op: 'patch', text: '📦 VIS-1 è già in Magazzino › A1' });
    expect(runStep(piece({ location: 'vetrina' }), step, ctx())).toEqual({ ok: true, op: 'move', to: 'magazzino', text: '📦 Spostato in Magazzino' });
    // una posizione fissa del passo non usa lo scaffale letto
    expect(runStep(piece(), { type: 'move_to', config: { locationId: 'vetrina' } }, ctx({ shelf: { id: A1, name: 'A1' } }))).toMatchObject({ op: 'move', to: 'vetrina' });
  });
});

describe('checkLoadAt: il controllo delle schermate (correzioni del revisore di S3)', () => {
  const data = (extra: Partial<LoadData>): LoadData => ({ products: [], shelves: [], categories, locations: [], ...extra });
  it('la proposta di uno spostamento si ricontrolla con la merce che partirebbe davvero (prima: 11 pezzi su A2 da 5)', () => {
    const a1 = shelf('ra1', 'A1', { maxPieces: 10 });
    const a2 = shelf('ra2', 'A2', { maxPieces: 5 });
    const a3 = shelf('ra3', 'A3', { maxPieces: 20 });
    const art = piece({ unit: 'pz', stock: { magazzino: 1, [`magazzino/${a1.id}`]: 10 } });
    const d = data({ products: [art], shelves: [a1, a2] });
    const to = `magazzino/${a1.id}`;
    const r = checkLoadAt(d, art, to, moveSources(art, to), { sourcesFor: (key) => moveSources(art, key) });
    expect(r).toMatchObject({ level: 'blocco', reason: '11 pezzi, il massimo è 10' });
    expect(r.proposal).toBeUndefined(); // A2 riceverebbe 11 pezzi: scartata
    const conA3 = checkLoadAt({ ...d, shelves: [a1, a2, a3] }, art, to, moveSources(art, to), { sourcesFor: (key) => moveSources(art, key) });
    expect(conA3.proposal?.name).toBe('A3'); // 11 su 20: entra (sotto l'80%)
  });
  it('scaffale e posizione bloccati: vince la posizione con la sua proposta, mai un altro scaffale della posizione piena', () => {
    const y1 = shelf('ry1', 'Y1', { maxPieces: 1, locationId: 'y' });
    const y2 = shelf('ry2', 'Y2', { maxPieces: 10, locationId: 'y' });
    const there = [piece({ id: 'a', location: 'y', shelfId: y1.id }), piece({ id: 'b', location: 'y' })];
    const locations = [{ id: 'y', label: 'Y', capacity: 2 }, { id: 'w', label: 'W' }];
    const r = checkLoadAt(data({ products: there, shelves: [y1, y2], locations }), {}, `y/${y1.id}`, [{ qty: 1 }]);
    expect(r).toMatchObject({ level: 'blocco', place: 'posizione', name: 'Y', reason: '3 pezzi, il massimo è 2', proposal: { name: 'W', key: 'w' } });
    // senza un'altra posizione: il blocco della posizione, senza proposta
    const sola = checkLoadAt(data({ products: there, shelves: [y1, y2], locations: [locations[0]] }), {}, `y/${y1.id}`, [{ qty: 1 }]);
    expect(sola).toMatchObject({ level: 'blocco', place: 'posizione' });
    expect(sola.proposal).toBeUndefined();
  });
  it('la proposta non è mai il posto di partenza (trasferimento da A1 verso A2 pieno; pezzo unico da W verso Y piena)', () => {
    const a1 = shelf('pa1', 'A1', { maxPieces: 10 });
    const a2 = shelf('pa2', 'A2', { maxPieces: 1 });
    const art = piece({ unit: 'pz', stock: { [`magazzino/${a1.id}`]: 2, [`magazzino/${a2.id}`]: 1 } });
    const from = `magazzino/${a1.id}`;
    const r = checkLoadAt(data({ products: [art], shelves: [a1, a2] }), art, `magazzino/${a2.id}`, [{ from, qty: 1 }]);
    expect(r.level).toBe('blocco');
    expect(r.proposal).toBeUndefined(); // prima proponeva A1, da dove parte la merce
    const unico = piece({ id: 'u', location: 'w' });
    const locations = [{ id: 'y', label: 'Y', capacity: 1 }, { id: 'w', label: 'W' }];
    const pieno = [piece({ id: 'x', location: 'y' }), unico];
    const s = checkLoadAt(data({ products: pieno, locations }), unico, 'y', moveSources(unico, 'y'), { sourcesFor: (key) => moveSources(unico, key) });
    expect(s.level).toBe('blocco');
    expect(s.proposal).toBeUndefined(); // prima proponeva W, dove il pezzo già sta
  });
  it('un pezzo unico venduto non occupa posto: si sposta verso una posizione piena senza blocco', () => {
    const venduto = piece({ id: 'v', location: 'w', status: 'sold' });
    expect(moveSources(venduto, 'y')).toEqual([]);
    const locations = [{ id: 'y', label: 'Y', capacity: 1 }];
    expect(checkLoadAt(data({ products: [piece({ id: 'x', location: 'y' }), venduto], locations }), venduto, 'y', moveSources(venduto, 'y')).level).toBe('ok');
  });
  it('soloScaffale: senza la capienza della posizione; senza nulla in arrivo: ok col nome del posto', () => {
    const a = shelf('sa', 'A', { maxPieces: 10 });
    const locations = [{ id: 'magazzino', label: 'Magazzino', capacity: 1 }];
    const d = data({ products: [piece({ id: 'x' })], shelves: [a], locations });
    expect(checkLoadAt(d, {}, `magazzino/${a.id}`, [{ qty: 1 }]).level).toBe('blocco');
    expect(checkLoadAt(d, {}, `magazzino/${a.id}`, [{ qty: 1 }], { soloScaffale: true }).level).toBe('ok');
    expect(checkLoadAt(d, {}, `magazzino/${a.id}`, [])).toEqual({ level: 'ok', name: 'A', place: 'scaffale', fill: null });
  });
});

describe('checkLoadAt: seconda revisione di S3', () => {
  const data = (extra: Partial<LoadData>): LoadData => ({ products: [], shelves: [], categories, locations: [], ...extra });
  it('posizione in avviso (non oltre): lo scaffale libero della stessa posizione si propone', () => {
    const y1 = shelf('qy1', 'Y1', { maxPieces: 1, locationId: 'y' });
    const y2 = shelf('qy2', 'Y2', { maxPieces: 10, locationId: 'y' });
    const there = [piece({ id: 'a', location: 'y', shelfId: y1.id }), piece({ id: 'q', location: 'y', unit: 'pz', stock: { y: 7 } })];
    const unico = piece({ id: 'u', location: 'w' });
    const locations = [{ id: 'y', label: 'Y', capacity: 10 }, { id: 'w', label: 'W' }];
    const r = checkLoadAt(data({ products: [...there, unico], shelves: [y1, y2], locations }), unico, `y/${y1.id}`, moveSources(unico, `y/${y1.id}`), { sourcesFor: (key) => moveSources(unico, key) });
    expect(r).toMatchObject({ level: 'blocco', name: 'Y1', proposal: { name: 'Y2', freePercent: 90 } }); // Y a 9 su 10: avviso, va bene
  });
  it('«libero al» e la scelta col carico vero: tutta la posizione principale va sullo scaffale proposto', () => {
    const a1 = shelf('qa1', 'A1', { maxPieces: 10 });
    const a2 = shelf('qa2', 'A2', { maxPieces: 20 });
    const art = piece({ unit: 'pz', stock: { magazzino: 1, [`magazzino/${a1.id}`]: 10 } });
    const to = `magazzino/${a1.id}`;
    const r = checkLoadAt(data({ products: [art], shelves: [a1, a2] }), art, to, moveSources(art, to), { sourcesFor: (key) => moveSources(art, key) });
    expect(r.proposal).toMatchObject({ name: 'A2', freePercent: 45 }); // 11 su 20 = 55%, non «libero al 95%»
  });
  it('uno scaffale che col carico vero va bene non si scarta per la stima', () => {
    const a1 = shelf('qb1', 'A1', { maxPieces: 2 });
    const a2 = shelf('qb2', 'A2', { maxPieces: 10 });
    const art = piece({ unit: 'pz', stock: { magazzino: 1, [`magazzino/${a2.id}`]: 4, [`magazzino/${a1.id}`]: 2 } });
    const to = `magazzino/${a1.id}`;
    const r = checkLoadAt(data({ products: [art], shelves: [a1, a2] }), art, to, moveSources(art, to), { sourcesFor: (key) => moveSources(art, key) });
    expect(r).toMatchObject({ level: 'blocco', reason: '7 pezzi, il massimo è 2' });
    expect(r.proposal).toMatchObject({ name: 'A2', freePercent: 30 }); // su A2 arrivano 1 + 2 (A2 ha già 4): 7 su 10
  });
});
