import type { Product, TimelineEvent } from '../types';
import {
  countDiffs, countOf, countRefusalText, countRows, editableUpdates, moveOf, movementOf, refusalText, saleOf, uniqueAt,
  withInitialStock, withStartingStock, type OpResult,
} from '../utils/inventoryOps';
import { describeStockEvent, qtyAt, replayStock, stockOf, storedStock } from '../utils/stock';

const NOW = '2026-11-22T10:00:00.000Z';
const base: Product = {
  id: 'p1', sku: 'VIS-1', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', sellPrice: 100,
};
const item = (extra: Partial<Product> = {}): Product => ({ ...base, ...extra });
const stocked = (stock: Record<string, number>, extra: Partial<Product> = {}) => item({ stock, unit: 'kg', ...extra });

/** Come il contesto: applica la patch al prodotto e raccoglie gli eventi. */
function apply(p: Product, r: OpResult, events: Omit<TimelineEvent, 'id'>[]): Product {
  if (!r.ok) throw new Error(r.reason);
  events.push(...r.events);
  return { ...p, ...r.patch };
}

describe('moveOf', () => {
  it('pezzo unico: cambia posizione con un evento «spostato», come prima', () => {
    const r = moveOf(item(), 'magazzino', NOW);
    expect(r).toEqual({
      ok: true,
      patch: { location: 'magazzino', updatedAt: NOW, lastScannedAt: NOW },
      events: [{ productId: 'p1', type: 'moved', timestamp: NOW, details: { from: 'vetrina', to: 'magazzino' } }],
    });
  });
  it('articolo a quantità: trasferisce tutta la giacenza della posizione principale con un evento `stock`', () => {
    const r = moveOf(stocked({ vetrina: 3, magazzino: 1 }), 'stand_a', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.patch).toEqual({ stock: { magazzino: 1, stand_a: 3 }, unit: 'kg', location: 'stand_a', updatedAt: NOW, lastScannedAt: NOW });
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ type: 'stock', details: { movement: 'trasferimento', qty: 3, from: 'vetrina', to: 'stand_a', before: 4, after: 4 } });
  });
  it('la patch tocca solo i campi del movimento', () => {
    const r = moveOf(stocked({ vetrina: 2 }, { technicalNotes: 'nota' }), 'magazzino', NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(Object.keys(r.patch).sort()).toEqual(['lastScannedAt', 'location', 'stock', 'unit', 'updatedAt']);
  });
  it('rifiuta: non trovato, cestino, stessa posizione, esaurito', () => {
    expect(moveOf(undefined, 'magazzino', NOW)).toEqual({ ok: false, reason: 'missing' });
    expect(moveOf(item({ deletedAt: NOW }), 'magazzino', NOW)).toEqual({ ok: false, reason: 'trash' });
    expect(moveOf(item(), 'vetrina', NOW)).toEqual({ ok: false, reason: 'same_place' });
    expect(moveOf(stocked({ vetrina: 0 }), 'magazzino', NOW)).toEqual({ ok: false, reason: 'out_of_stock' });
  });
});

describe('saleOf', () => {
  it('pezzo unico: «venduto» col prezzo, come prima', () => {
    const r = saleOf(item(), 120, 1, NOW);
    expect(r).toEqual({
      ok: true,
      patch: { status: 'sold', soldAt: NOW, updatedAt: NOW, lastScannedAt: NOW, sellPrice: 120 },
      events: [{ productId: 'p1', type: 'sold', timestamp: NOW, details: { finalPrice: 120 } }],
    });
    const senzaPrezzo = saleOf(item(), undefined, 1, NOW);
    if (!senzaPrezzo.ok) throw new Error(senzaPrezzo.reason);
    expect(senzaPrezzo.patch.sellPrice).toBeUndefined();
  });
  it('articolo a quantità: scarico con causale vendita, resta disponibile, il listino non cambia', () => {
    const r = saleOf(stocked({ vetrina: 2.5 }), 30, 1, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.patch).toEqual({ stock: { vetrina: 1.5 }, unit: 'kg', location: 'vetrina', updatedAt: NOW, lastScannedAt: NOW });
    expect(r.patch.status).toBeUndefined();
    expect(r.patch.sellPrice).toBeUndefined();
    expect(r.events[0].details).toMatchObject({ movement: 'scarico', reason: 'vendita', qty: 1, from: 'vetrina', finalPrice: 30, before: 2.5, after: 1.5 });
  });
  it('senza prezzo scritto l\'evento ha il prezzo di listino', () => {
    const r = saleOf(stocked({ vetrina: 2 }), undefined, 1, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.events[0].details.finalPrice).toBe(100);
  });
  it('vende più pezzi insieme e arriva a esaurito', () => {
    const r = saleOf(stocked({ vetrina: 2 }), undefined, 2, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.patch.stock).toEqual({ vetrina: 0 });
    expect(saleOf({ ...stocked({ vetrina: 2 }), ...r.patch }, 10, 1, NOW)).toEqual({ ok: false, reason: 'out_of_stock' });
  });
  it('rifiuta: cestino, già venduto, giacenza insufficiente, quantità non valida', () => {
    expect(saleOf(item({ deletedAt: NOW }), 1, 1, NOW)).toEqual({ ok: false, reason: 'trash' });
    expect(saleOf(item({ status: 'sold' }), 1, 1, NOW)).toEqual({ ok: false, reason: 'sold' });
    expect(saleOf(stocked({ vetrina: 0.5 }), 1, 1, NOW)).toEqual({ ok: false, reason: 'over_stock' });
    expect(saleOf(stocked({ vetrina: 3 }), 1, 0, NOW)).toEqual({ ok: false, reason: 'bad_qty' });
  });
});

describe('withInitialStock', () => {
  it('la quantità iniziale è un carico «iniziale» nella posizione del prodotto', () => {
    const r = withInitialStock(item({ location: 'magazzino', unit: 'kg' }), 12.5, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.product.stock).toEqual({ magazzino: 12.5 });
    expect(r.product.unit).toBe('kg');
    expect(r.product.updatedAt).toBe(base.updatedAt);
    expect(r.product.lastScannedAt).toBeUndefined();
    expect(r.events).toEqual([{ productId: 'p1', type: 'stock', timestamp: NOW, details: { movement: 'carico', qty: 12.5, to: 'magazzino', reason: 'iniziale', before: 0, after: 12.5 } }]);
  });
  it('senza unità vale «pz»; quantità 0 = articolo esaurito senza eventi', () => {
    const r = withInitialStock(item(), 0, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.product).toMatchObject({ stock: { vetrina: 0 }, unit: 'pz' });
    expect(r.events).toEqual([]);
  });
  it('rifiuta quantità negative o non numeriche', () => {
    expect(withInitialStock(item(), -1, NOW)).toEqual({ ok: false, reason: 'bad_qty' });
    expect(withInitialStock(item(), Number.NaN, NOW)).toEqual({ ok: false, reason: 'bad_qty' });
  });
});

describe('withStartingStock (import CSV, M08)', () => {
  it('un carico «iniziale» per posizione, la posizione del prodotto per prima e principale', () => {
    const r = withStartingStock(item({ location: 'vetrina' }), { magazzino: 12, vetrina: 2.5 }, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.product).toMatchObject({ stock: { vetrina: 2.5, magazzino: 12 }, location: 'vetrina', unit: 'pz', updatedAt: base.updatedAt });
    expect(r.events.map((e) => [e.details.to, e.details.qty, e.details.reason, e.details.before, e.details.after])).toEqual([
      ['vetrina', 2.5, 'iniziale', 0, 2.5],
      ['magazzino', 12, 'iniziale', 2.5, 14.5],
    ]);
    expect(replayStock(r.events)).toEqual(stockOf(r.product));
  });
  it('posizione del prodotto senza quantità: diventa principale quella caricata', () => {
    const r = withStartingStock(item({ location: '' }), { magazzino: 3 }, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.product).toMatchObject({ stock: { magazzino: 3 }, location: 'magazzino' });
  });
  it('tutto a 0: esaurito nella sua posizione, senza eventi; posizione vuota → quella del CSV', () => {
    const r = withStartingStock(item(), { vetrina: 0 }, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.product).toMatchObject({ stock: { vetrina: 0 }, location: 'vetrina' });
    expect(r.events).toEqual([]);
    const s = withStartingStock(item({ location: '' }), { magazzino: 0 }, NOW);
    if (!s.ok) throw new Error(s.reason);
    expect(s.product).toMatchObject({ stock: { magazzino: 0 }, location: 'magazzino' });
  });
  it('rifiuta quantità non valide e prodotti non disponibili', () => {
    expect(withStartingStock(item(), { vetrina: -1 }, NOW)).toEqual({ ok: false, reason: 'bad_qty' });
    expect(withStartingStock(item(), { '': 1 }, NOW)).toEqual({ ok: false, reason: 'bad_qty' });
    expect(withStartingStock(item({ status: 'sold' }), { vetrina: 1 }, NOW)).toEqual({ ok: false, reason: 'not_allowed' });
    expect(withStartingStock(item({ status: 'sold' }), { vetrina: 0 }, NOW)).toEqual({ ok: false, reason: 'not_allowed' });
  });
});

describe('editableUpdates', () => {
  it('per un articolo a quantità toglie posizione e giacenza, il resto passa', () => {
    expect(editableUpdates(stocked({ vetrina: 2 }), { location: 'magazzino', stock: { magazzino: 9 }, sellPrice: 5 })).toEqual({ sellPrice: 5 });
  });
  it('per un pezzo unico non cambia nulla', () => {
    const u = { location: 'magazzino', sellPrice: 5 };
    expect(editableUpdates(item(), u)).toBe(u);
  });
});

describe('giro completo: Aggiungi con quantità, spostamento, vendite', () => {
  it('la giacenza salvata è sempre quella che si ottiene rigiocando gli eventi', () => {
    const events: Omit<TimelineEvent, 'id'>[] = [];
    const created = withInitialStock(item({ location: 'magazzino' }), 10, NOW);
    if (!created.ok) throw new Error(created.reason);
    events.push(...created.events);
    let p = created.product;
    p = apply(p, moveOf(p, 'vetrina', NOW), events);
    p = apply(p, saleOf(p, 50, 3, NOW), events);
    p = apply(p, saleOf(p, undefined, 1, NOW), events);
    expect(stockOf(p)).toEqual({ vetrina: 6 });
    expect(replayStock(events)).toEqual(stockOf(p));
    expect(p.status).toBe('available');
    expect(events.every((e) => e.type === 'stock')).toBe(true);
  });
  it('un pezzo unico resta pezzo unico: nessun evento `stock`', () => {
    const events: Omit<TimelineEvent, 'id'>[] = [];
    let p = item();
    p = apply(p, moveOf(p, 'magazzino', NOW), events);
    p = apply(p, saleOf(p, 80, 1, NOW), events);
    expect(p.stock).toBeUndefined();
    expect(events.map((e) => e.type)).toEqual(['moved', 'sold']);
  });
});

describe('testi', () => {
  it('refusalText dice perché', () => {
    expect(refusalText('out_of_stock', 'VIS-1')).toBe('VIS-1 è esaurito.');
    expect(refusalText('trash', 'VIS-1')).toBe('VIS-1 è nel cestino.');
  });
  it('describeStockEvent scrive movimento, quantità e posizioni', () => {
    const label = (id: string) => ({ vetrina: 'Vetrina', magazzino: 'Magazzino' } as Record<string, string>)[id] ?? id;
    expect(describeStockEvent({ movement: 'carico', qty: 12, to: 'magazzino', reason: 'iniziale' }, label)).toBe('Giacenza iniziale: +12 pz in Magazzino');
    expect(describeStockEvent({ movement: 'scarico', qty: 1, from: 'vetrina', reason: 'vendita', finalPrice: 120 }, label)).toBe('Vendita: −1 pz da Vetrina · 120 €');
    expect(describeStockEvent({ movement: 'trasferimento', qty: 2.5, from: 'vetrina', to: 'magazzino' }, label, 'kg')).toBe('Trasferimento: 2,5 kg Vetrina → Magazzino');
    expect(describeStockEvent({ movement: 'rettifica', qty: 1.5, from: 'vetrina', reason: 'conta' }, label, 'kg')).toBe('Rettifica: −1,5 kg in Vetrina');
    expect(describeStockEvent({ movement: 'carico', qty: 3, to: 'sparita' }, label)).toBe('Carico: +3 pz in sparita');
  });
  it('qtyAt: quantità in una posizione, 0 per venduti e cestino', () => {
    expect(qtyAt(stocked({ vetrina: 2.5 }), 'vetrina')).toBe(2.5);
    expect(qtyAt(stocked({ vetrina: 2.5 }), 'magazzino')).toBe(0);
    expect(qtyAt(item(), 'vetrina')).toBe(1);
    expect(qtyAt(item({ status: 'sold' }), 'vetrina')).toBe(0);
    expect(qtyAt(stocked({ vetrina: 2 }, { deletedAt: NOW }), 'vetrina')).toBe(0);
  });
});

describe('movementOf (M04, Movimenta dalla Scheda)', () => {
  it('scrive solo i campi del movimento e gli eventi; carico, scarico, trasferimento e rettifica ridanno la giacenza', () => {
    const events: Omit<TimelineEvent, 'id'>[] = [];
    let p = stocked({ vetrina: 2 }, { sellPrice: 100, technicalNotes: 'nota' });
    const step = (m: Parameters<typeof movementOf>[1]) => {
      const r = movementOf(p, m, NOW);
      if (!r.ok) throw new Error(r.error);
      expect(Object.keys(r.patch).sort()).toEqual(['lastScannedAt', 'location', 'stock', 'unit', 'updatedAt']);
      events.push(...r.events);
      p = { ...p, ...r.patch };
    };
    events.push({ productId: 'p1', type: 'stock', timestamp: NOW, details: { movement: 'carico', qty: 2, to: 'vetrina', reason: 'iniziale' } });
    step({ kind: 'carico', qty: 5, to: 'magazzino', reason: 'acquisto' });
    step({ kind: 'scarico', qty: 0.5, from: 'vetrina', reason: 'danno', note: 'rotto' });
    step({ kind: 'trasferimento', qty: 2, from: 'magazzino', to: 'vetrina' });
    step({ kind: 'rettifica', at: 'magazzino', counted: 2.75, reason: 'conta' });
    expect(p.stock).toEqual({ vetrina: 3.5, magazzino: 2.75 });
    expect(replayStock(events)).toEqual(stockOf(p));
    expect(p.technicalNotes).toBe('nota');
  });
  it('un pezzo unico al primo movimento diventa articolo a quantità con il carico iniziale', () => {
    const r = movementOf(item(), { kind: 'carico', qty: 2, to: 'magazzino' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.patch.stock).toEqual({ vetrina: 1, magazzino: 2 });
    expect(r.patch.unit).toBe('pz');
    expect(r.events.map((e) => e.details.reason)).toEqual(['iniziale', undefined]);
  });
  it('rifiuti con il motivo di applyMovement; prodotto mancante non si movimenta', () => {
    expect(movementOf(stocked({ vetrina: 1 }), { kind: 'scarico', qty: 2, from: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'over_stock', available: 1 });
    expect(movementOf(stocked({ vetrina: 1 }, { deletedAt: NOW }), { kind: 'carico', qty: 1, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'not_allowed' });
    expect(movementOf(undefined, { kind: 'carico', qty: 1, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'not_allowed' });
  });
});

describe('storedStock (M04, cestino)', () => {
  it('un articolo a quantità nel cestino mostra la giacenza salvata, i conteggi restano a 0', () => {
    const p = stocked({ vetrina: 3, magazzino: 0 }, { deletedAt: NOW });
    expect(storedStock(p)).toEqual({ vetrina: 3 });
    expect(stockOf(p)).toEqual({});
  });
  it('un pezzo unico nel cestino resta senza giacenza', () => {
    expect(storedStock(item({ deletedAt: NOW }))).toEqual({});
    expect(storedStock(item())).toEqual({ vetrina: 1 });
  });
});

describe('Conta (M07, ticket 06)', () => {
  const list = (): Product[] => [
    stocked({ magazzino: 5 }, { id: 'a', sku: 'B-2', location: 'magazzino' }),
    stocked({ magazzino: 2, vetrina: 3 }, { id: 'b', sku: 'A-1', location: 'vetrina', unit: 'pz' }),
    stocked({ magazzino: 0 }, { id: 'c', sku: 'C-3', location: 'magazzino' }), // esaurito, principale qui
    item({ id: 'd', sku: 'U-1', location: 'magazzino' }), // pezzo unico
    stocked({ magazzino: 4 }, { id: 'e', sku: 'T-1', location: 'magazzino', deletedAt: NOW }), // nel cestino
    stocked({ vetrina: 1 }, { id: 'f', sku: 'V-1', location: 'vetrina' }), // altrove
  ];

  it('countRows: articoli a quantità qui (anche esauriti), in ordine di SKU; niente pezzi unici né cestino', () => {
    expect(countRows(list(), 'magazzino')).toEqual([
      { id: 'b', sku: 'A-1', furType: 'visone', unit: 'pz', expected: 2 },
      { id: 'a', sku: 'B-2', furType: 'visone', unit: 'kg', expected: 5 },
      { id: 'c', sku: 'C-3', furType: 'visone', unit: 'kg', expected: 0 },
    ]);
    expect(uniqueAt(list(), 'magazzino')).toBe(1);
    expect(uniqueAt(list(), 'vetrina')).toBe(0);
  });

  it('countDiffs: solo le quantità scritte e diverse (vuota = non contata, mai 0)', () => {
    const rows = countRows(list(), 'magazzino');
    expect(countDiffs(rows, { a: 3, b: 2, c: 0.1 + 0.2 }).map((d) => [d.sku, d.counted, d.delta])).toEqual([
      ['B-2', 3, -2],
      ['C-3', 0.30000000000000004, 0.3],
    ]);
    expect(countDiffs(rows, {})).toEqual([]);
  });

  it('countOf: una rettifica «conta» per differenza, uguali senza eventi, giacenza = eventi rigiocati', () => {
    const products = list();
    const events: Omit<TimelineEvent, 'id'>[] = [];
    for (const p of products) {
      for (const [to, qty] of Object.entries(p.stock ?? {})) {
        if (qty > 0) events.push({ productId: p.id, type: 'stock', timestamp: NOW, details: { movement: 'carico', qty, to, reason: 'iniziale' } });
      }
    }
    const r = countOf(products, 'magazzino', { a: 3, b: 2, c: 1.5 }, NOW);
    expect(r.adjusted).toEqual(['B-2', 'C-3']);
    expect(r.unchanged).toEqual(['A-1']);
    expect(r.refused).toEqual([]);
    expect(r.events.map((e) => [e.productId, e.details.movement, e.details.reason, e.details.qty, e.details.from, e.details.to])).toEqual([
      ['a', 'rettifica', 'conta', 2, 'magazzino', undefined],
      ['c', 'rettifica', 'conta', 1.5, undefined, 'magazzino'],
    ]);
    expect(r.events.every((e) => e.timestamp === NOW)).toBe(true);
    const after = products.map((p) => ({ ...p, ...r.patches.find((x) => x.id === p.id)?.patch }));
    expect(after.find((p) => p.id === 'a')?.stock).toEqual({ magazzino: 3 });
    expect(after.find((p) => p.id === 'c')?.stock).toEqual({ magazzino: 1.5 });
    for (const p of after.filter((x) => x.id === 'a' || x.id === 'c')) {
      expect(replayStock([...events, ...r.events].filter((e) => e.productId === p.id))).toEqual(stockOf(p));
    }
    expect(r.patches.map((x) => Object.keys(x.patch).sort())).toEqual([
      ['lastScannedAt', 'location', 'stock', 'unit', 'updatedAt'],
      ['lastScannedAt', 'location', 'stock', 'unit', 'updatedAt'],
    ]);
  });

  it('countOf: posizione secondaria; 0 nella principale sposta la principale dove resta giacenza', () => {
    const products = list();
    const second = countOf(products, 'magazzino', { b: 0 }, NOW);
    expect([second.patches[0].patch.stock, second.patches[0].patch.location]).toEqual([{ vetrina: 3 }, 'vetrina']);
    const main = countOf(products, 'vetrina', { b: 0 }, NOW);
    expect([main.patches[0].patch.stock, main.patches[0].patch.location]).toEqual([{ magazzino: 2 }, 'magazzino']);
  });

  it('countOf: rifiuta pezzi unici, cestino e prodotti spariti, ma rettifica gli altri', () => {
    const r = countOf(list(), 'magazzino', { d: 0, e: 1, zz: 2, a: 6 }, NOW);
    expect(r.adjusted).toEqual(['B-2']);
    expect(r.refused).toEqual([
      { sku: 'U-1', reason: 'unique' },
      { sku: 'T-1', reason: 'not_allowed' },
      { sku: 'zz', reason: 'missing' },
    ]);
    expect(r.patches.map((x) => x.id)).toEqual(['a']);
    expect(countRefusalText('unique')).toMatch(/Audit/);
    expect(countRefusalText('not_allowed')).toMatch(/non più disponibile/);
  });

  it('countOf: niente scritto o tutto uguale → nessuna patch e nessun evento', () => {
    expect(countOf(list(), 'magazzino', {}, NOW)).toEqual({ patches: [], events: [], adjusted: [], unchanged: [], refused: [] });
    const same = countOf(list(), 'magazzino', { a: 5, b: 2, c: 0 }, NOW);
    expect(same.patches).toEqual([]);
    expect(same.events).toEqual([]);
    expect(same.unchanged).toEqual(['B-2', 'A-1', 'C-3']);
  });
});
