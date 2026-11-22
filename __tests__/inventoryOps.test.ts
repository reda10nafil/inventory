import type { Product, TimelineEvent } from '../types';
import { editableUpdates, moveOf, refusalText, saleOf, withInitialStock, type OpResult } from '../utils/inventoryOps';
import { describeStockEvent, qtyAt, replayStock, stockOf } from '../utils/stock';

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
