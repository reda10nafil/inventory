import type { Product, TimelineEvent } from '../types';
import {
  applyMovement,
  formatQty,
  isAt,
  isLowStock,
  isOutOfStock,
  isStocked,
  drawsAt,
  keysAt,
  mainLocation,
  movementErrorText,
  newLocationId,
  parseQty,
  parseSalePrice,
  placeOfKey,
  positionsOf,
  qtyAt,
  qtyIn,
  replayStock,
  round3,
  SHELF_KEY_SEPARATOR,
  splitStockKey,
  stockGroups,
  stockKey,
  stockOf,
  takesContact,
  takesPrice,
  totalStock,
  type Movement,
} from '../utils/stock';

const NOW = '2026-11-22T10:00:00.000Z';
const base: Product = {
  id: 'p1', sku: 'VIS-1', furType: 'visone', location: 'vetrina', status: 'available', images: [], customData: [],
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const item = (extra: Partial<Product> = {}): Product => ({ ...base, ...extra });

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') { Object.values(o).forEach(deepFreeze); Object.freeze(o); }
  return o;
}

/** Applica i movimenti in fila e raccoglie gli eventi (come farà il contesto). */
function run(start: Product, moves: Movement[]) {
  let p = start;
  const events: Omit<TimelineEvent, 'id'>[] = [];
  for (const m of moves) {
    const r = applyMovement(p, m, NOW);
    if (!r.ok) throw new Error(`${m.kind}: ${r.error}`);
    p = r.product;
    events.push(...r.events);
  }
  return { p, events };
}

describe('lettura della giacenza', () => {
  it('un pezzo unico disponibile vale 1 nella sua posizione', () => {
    expect(isStocked(item())).toBe(false);
    expect(stockOf(item())).toEqual({ vetrina: 1 });
    expect(totalStock(item())).toBe(1);
  });
  it('un pezzo unico venduto o nel cestino vale 0', () => {
    expect(stockOf(item({ status: 'sold' }))).toEqual({});
    expect(totalStock(item({ deletedAt: NOW }))).toBe(0);
  });
  it('un articolo a quantità legge la giacenza salvata, senza zeri né valori rovinati', () => {
    const p = item({ stock: { vetrina: 0, magazzino: 2.5, x: Number.NaN, y: -1 } as any });
    expect(stockOf(p)).toEqual({ magazzino: 2.5 });
    expect(totalStock(p)).toBe(2.5);
  });
  it('un articolo a quantità nel cestino vale 0 ma le sue posizioni restano in uso', () => {
    const p = item({ stock: { vetrina: 3, magazzino: 1 }, deletedAt: NOW });
    expect(totalStock(p)).toBe(0);
    expect(positionsOf(p).sort()).toEqual(['magazzino', 'vetrina']);
  });
  it('esaurito: articolo a quantità a 0, mai un pezzo unico', () => {
    expect(isOutOfStock(item({ stock: { vetrina: 0 } }))).toBe(true);
    expect(isStocked(item({ stock: {} }))).toBe(true);
    expect(isOutOfStock(item({ status: 'sold' }))).toBe(false);
  });
  it('isAt: posizione principale o giacenza in quella posizione', () => {
    const p = item({ stock: { vetrina: 0, magazzino: 4 } });
    expect(isAt(p, 'vetrina')).toBe(true);
    expect(isAt(p, 'magazzino')).toBe(true);
    expect(isAt(p, 'sartoria')).toBe(false);
    expect(isAt(item({ status: 'sold' }), 'vetrina')).toBe(true); // come prima per i pezzi unici
  });
  it('mainLocation resta se ha giacenza, altrimenti va dove ce n\'è di più', () => {
    expect(mainLocation({ vetrina: 1, magazzino: 5 }, 'vetrina')).toBe('vetrina');
    expect(mainLocation({ vetrina: 0, magazzino: 5, stand_a: 2 }, 'vetrina')).toBe('magazzino');
    expect(mainLocation({ vetrina: 0 }, 'vetrina')).toBe('vetrina');
  });
});

describe('numeri', () => {
  it('0,1 + 0,2 fa 0,3', () => expect(round3(0.1 + 0.2)).toBe(0.3));
  it('parseQty accetta «2,5» e arrotonda a 3 decimali', () => {
    expect(parseQty('2,5')).toBe(2.5);
    expect(parseQty('1,23456')).toBe(1.235);
    expect(parseQty('0')).toBe(0);
    expect(parseQty('')).toBeUndefined();
    expect(parseQty('-2')).toBeUndefined();
    expect(parseQty('abc')).toBeUndefined();
  });
  it('parseQty segue i moduli: «2.125» scritto a mano è 2125 (punto delle migliaia); l\'import userà parseStoredNumber', () => {
    expect(parseQty('2.125')).toBe(2125);
  });
  it('parseSalePrice (M10): vuoto = nessun prezzo, non valido o negativo = null, al centesimo', () => {
    expect(parseSalePrice('')).toBeUndefined();
    expect(parseSalePrice('   ')).toBeUndefined();
    expect(parseSalePrice('120')).toBe(120);
    expect(parseSalePrice('1.250,50')).toBe(1250.5);
    expect(parseSalePrice('12,345')).toBe(12.35);
    expect(parseSalePrice('0')).toBe(0);
    expect(parseSalePrice('-3')).toBeNull();
    expect(parseSalePrice('abc')).toBeNull();
  });
  it('formatQty scrive la quantità con l\'unità', () => {
    expect(formatQty(2.5, 'kg')).toBe('2,5 kg');
    expect(formatQty(1200)).toBe('1.200 pz');
  });
});

describe('applyMovement', () => {
  const stocked = (stock: Record<string, number>, extra: Partial<Product> = {}) => item({ stock, unit: 'kg', ...extra });

  it('carico, scarico e trasferimento aggiornano giacenza, posizione principale ed evento', () => {
    const r = applyMovement(stocked({ vetrina: 2 }), { kind: 'carico', qty: 3, to: 'magazzino', reason: 'acquisto', note: ' fattura 12 ' }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.product.stock).toEqual({ vetrina: 2, magazzino: 3 });
    expect(r.product.location).toBe('vetrina');
    expect(r.product.updatedAt).toBe(NOW);
    expect(r.product.lastScannedAt).toBe(NOW);
    expect(r.events).toEqual([{ productId: 'p1', type: 'stock', timestamp: NOW, details: { movement: 'carico', qty: 3, to: 'magazzino', reason: 'acquisto', note: 'fattura 12', before: 2, after: 5 } }]);
  });

  it('svuotare la posizione principale la sposta dove c\'è più giacenza', () => {
    const { p } = run(stocked({ vetrina: 2, magazzino: 3 }), [{ kind: 'trasferimento', qty: 2, from: 'vetrina', to: 'stand_a' }]);
    expect(p.location).toBe('magazzino');
    expect(p.stock).toEqual({ magazzino: 3, stand_a: 2 });
  });

  it('a giacenza 0 resta articolo a quantità, con la posizione principale a 0', () => {
    const { p } = run(stocked({ vetrina: 1.5 }), [{ kind: 'scarico', qty: 1.5, from: 'vetrina', reason: 'vendita', finalPrice: 30 }]);
    expect(p.stock).toEqual({ vetrina: 0 });
    expect(isStocked(p)).toBe(true);
    expect(isOutOfStock(p)).toBe(true);
    // e un nuovo carico funziona
    const { p: p2 } = run(p, [{ kind: 'carico', qty: 4, to: 'magazzino' }]);
    expect(p2.stock).toEqual({ magazzino: 4 });
    expect(p2.location).toBe('magazzino');
  });

  it('M10: il contatto entra nell\'evento solo per carico e scarico, mai per trasferimento e rettifica', () => {
    const start = stocked({ vetrina: 5 });
    const details = (m: Movement) => {
      const r = applyMovement(start, m, NOW);
      if (!r.ok) throw new Error(r.error);
      return r.events[r.events.length - 1].details;
    };
    expect(details({ kind: 'carico', qty: 1, to: 'vetrina', contactId: 'c1' }).contactId).toBe('c1');
    expect(details({ kind: 'scarico', qty: 1, from: 'vetrina', contactId: 'c2' }).contactId).toBe('c2');
    expect(details({ kind: 'trasferimento', qty: 1, from: 'vetrina', to: 'magazzino', contactId: 'c1' })).not.toHaveProperty('contactId');
    expect(details({ kind: 'rettifica', at: 'vetrina', counted: 2, contactId: 'c1' })).not.toHaveProperty('contactId');
    expect(details({ kind: 'carico', qty: 1, to: 'vetrina' })).not.toHaveProperty('contactId');
  });

  it('M10: lo scarico con causale vendita porta prezzo per unità e contatto insieme', () => {
    const r = applyMovement(stocked({ vetrina: 5 }), { kind: 'scarico', qty: 3, from: 'vetrina', reason: 'vendita', finalPrice: 120, contactId: 'c2' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.events[0].details).toEqual({ movement: 'scarico', qty: 3, from: 'vetrina', reason: 'vendita', contactId: 'c2', finalPrice: 120, before: 5, after: 2 });
  });

  it('M10: chi può avere un contatto e chi un prezzo', () => {
    expect((['carico', 'scarico', 'trasferimento', 'rettifica'] as const).map(takesContact)).toEqual([true, true, false, false]);
    expect(takesPrice('scarico', 'vendita')).toBe(true);
    expect(takesPrice('scarico', 'danno')).toBe(false);
    expect(takesPrice('scarico', undefined)).toBe(false);
    expect(takesPrice('carico', 'vendita')).toBe(false);
  });

  it('scarica 0,3 da 0,1 + 0,2 senza rifiutarlo', () => {
    const { p } = run(stocked({ vetrina: 0.1 }), [{ kind: 'carico', qty: 0.2, to: 'vetrina' }, { kind: 'scarico', qty: 0.3, from: 'vetrina' }]);
    expect(p.stock).toEqual({ vetrina: 0 });
  });

  it('rifiuta quantità non positive, posizioni mancanti o uguali, scarichi oltre la giacenza', () => {
    const p = stocked({ vetrina: 2 });
    expect(applyMovement(p, { kind: 'carico', qty: 0, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'bad_qty' });
    expect(applyMovement(p, { kind: 'carico', qty: 0.0004, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'bad_qty' });
    expect(applyMovement(p, { kind: 'carico', qty: Number.NaN, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'bad_qty' });
    expect(applyMovement(p, { kind: 'carico', qty: 1, to: '' }, NOW)).toEqual({ ok: false, error: 'no_place' });
    expect(applyMovement(p, { kind: 'trasferimento', qty: 1, from: 'vetrina', to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'same_place' });
    expect(applyMovement(p, { kind: 'scarico', qty: 2.001, from: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'over_stock', available: 2 });
    expect(applyMovement(p, { kind: 'scarico', qty: 1, from: 'magazzino' }, NOW)).toEqual({ ok: false, error: 'over_stock', available: 0 });
    expect(applyMovement(p, { kind: 'rettifica', at: 'vetrina', counted: -1 }, NOW)).toEqual({ ok: false, error: 'bad_qty' });
    expect(applyMovement(p, { kind: 'rettifica', at: 'vetrina', counted: 2 }, NOW)).toEqual({ ok: false, error: 'no_change' });
  });

  it('rifiuta i prodotti nel cestino o venduti, ma non un articolo esaurito', () => {
    expect(applyMovement(stocked({ vetrina: 2 }, { deletedAt: NOW }), { kind: 'carico', qty: 1, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'not_allowed' });
    expect(applyMovement(item({ status: 'sold' }), { kind: 'carico', qty: 1, to: 'vetrina' }, NOW)).toEqual({ ok: false, error: 'not_allowed' });
    expect(applyMovement(stocked({ vetrina: 0 }), { kind: 'carico', qty: 1, to: 'vetrina' }, NOW).ok).toBe(true);
  });

  it('la rettifica porta la posizione alla quantità contata e scrive la differenza', () => {
    const r = applyMovement(stocked({ vetrina: 5, magazzino: 1 }), { kind: 'rettifica', at: 'vetrina', counted: 3.5, reason: 'conta' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.product.stock).toEqual({ vetrina: 3.5, magazzino: 1 });
    expect(r.events[0].details).toMatchObject({ movement: 'rettifica', qty: 1.5, from: 'vetrina', before: 6, after: 4.5 });
    const up = applyMovement(stocked({ vetrina: 5 }), { kind: 'rettifica', at: 'magazzino', counted: 2 }, NOW);
    if (!up.ok) throw new Error(up.error);
    expect(up.events[0].details).toMatchObject({ qty: 2, to: 'magazzino' });
  });

  it('il primo movimento di un pezzo unico registra prima il carico iniziale di 1', () => {
    const r = applyMovement(item(), { kind: 'carico', qty: 4, to: 'vetrina' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.product.stock).toEqual({ vetrina: 5 });
    expect(r.product.unit).toBe('pz');
    expect(r.events.map((e) => [e.details.movement, e.details.reason, e.details.qty, e.details.before, e.details.after]))
      .toEqual([['carico', 'iniziale', 1, 0, 1], ['carico', undefined, 4, 1, 5]]);
  });

  it('una rettifica che conta 1 su un pezzo unico non cambia nulla (resta pezzo unico)', () => {
    expect(applyMovement(item(), { kind: 'rettifica', at: 'vetrina', counted: 1 }, NOW)).toEqual({ ok: false, error: 'no_change' });
  });

  it('un movimento rifiutato non dà `stock` a un pezzo unico', () => {
    const p = item();
    expect(applyMovement(p, { kind: 'scarico', qty: 2, from: 'vetrina' }, NOW).ok).toBe(false);
    expect(p.stock).toBeUndefined();
  });

  it('non modifica il prodotto di partenza', () => {
    const p = deepFreeze(stocked({ vetrina: 2 }));
    expect(() => applyMovement(p, { kind: 'trasferimento', qty: 1, from: 'vetrina', to: 'magazzino' }, NOW)).not.toThrow();
    expect(p.stock).toEqual({ vetrina: 2 });
    const u = deepFreeze(item());
    expect(applyMovement(u, { kind: 'carico', qty: 1, to: 'vetrina' }, NOW).ok).toBe(true);
  });

  it('la quantità iniziale di un articolo nuovo è un evento (carico iniziale da giacenza vuota)', () => {
    const r = applyMovement(stocked({}), { kind: 'carico', qty: 12, to: 'magazzino', reason: 'iniziale' }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].details).toMatchObject({ movement: 'carico', reason: 'iniziale', qty: 12, before: 0, after: 12 });
    expect(r.product.location).toBe('magazzino');
  });

  it('il messaggio di rifiuto dice quanto c\'è', () => {
    expect(movementErrorText({ error: 'over_stock', available: 2.5 }, 'kg')).toBe('In quella posizione ci sono solo 2,5 kg.');
  });
});

describe('replayStock', () => {
  it('rigiocare gli eventi (in qualsiasi ordine) ridà la giacenza salvata', () => {
    const moves: Movement[] = [
      { kind: 'carico', qty: 10, to: 'magazzino' },
      { kind: 'trasferimento', qty: 2.5, from: 'magazzino', to: 'vetrina' },
      { kind: 'scarico', qty: 0.1, from: 'vetrina', reason: 'vendita' },
      { kind: 'carico', qty: 0.2, to: 'vetrina' },
      { kind: 'rettifica', at: 'magazzino', counted: 7 },
      { kind: 'trasferimento', qty: 2.6, from: 'vetrina', to: 'stand_a' },
    ];
    const { p, events } = run(item(), moves); // parte da un pezzo unico: c'è anche il carico iniziale
    const salvata = Object.fromEntries(Object.entries(p.stock!).filter(([, q]) => q !== 0));
    expect(replayStock(events)).toEqual(salvata);
    expect(replayStock([...events].reverse())).toEqual(salvata);
    expect(replayStock(events)).toEqual(stockOf(p));
  });
  it('ignora gli eventi che non sono movimenti', () => {
    const other = [{ type: 'moved' as const, details: { from: 'a', to: 'b' } }, { type: 'sold' as const, details: { finalPrice: 3 } }];
    expect(replayStock(other)).toEqual({});
  });
});

describe('isLowStock (ticket 05)', () => {
  const s = (stock: Record<string, number>, extra: Partial<Product> = {}) => item({ stock, unit: 'pz', ...extra });
  it('sotto scorta solo strettamente sotto la scorta minima, sommando le posizioni', () => {
    expect(isLowStock(s({ vetrina: 2, magazzino: 2 }, { minStock: 5 }))).toBe(true);
    expect(isLowStock(s({ vetrina: 3, magazzino: 2 }, { minStock: 5 }))).toBe(false);
    expect(isLowStock(s({ vetrina: 0 }, { minStock: 1 }))).toBe(true);
    expect(isLowStock(s({ vetrina: 0.1, magazzino: 0.2 }, { minStock: 0.3 }))).toBe(false);
  });
  it('senza scorta minima, pezzo unico o nel cestino: mai', () => {
    expect(isLowStock(s({ vetrina: 0 }))).toBe(false);
    expect(isLowStock(s({ vetrina: 0 }, { minStock: 0 }))).toBe(false);
    expect(isLowStock(item({ minStock: 5 }))).toBe(false);
    expect(isLowStock(s({ vetrina: 0 }, { minStock: 5, deletedAt: '2026-11-22' }))).toBe(false);
  });
});

// S1b (ticket 13): giacenza sugli scaffali con la forma 2 delle chiavi, «posizione/idScaffale»
describe('scaffali nella giacenza (S1b)', () => {
  const S1 = '1732300000000-gen1';
  const K1 = `magazzino/${S1}`;
  const K2 = `magazzino/${S1}-2`;
  const s = (stock: Record<string, number>, extra: Partial<Product> = {}) => item({ stock, unit: 'pz', location: 'magazzino', ...extra });

  it('chiavi: la posizione da sola, oppure posizione e scaffale; la posizione è tutto prima dell\'ultimo «/»', () => {
    expect(SHELF_KEY_SEPARATOR).toBe('/');
    expect(stockKey('magazzino')).toBe('magazzino');
    expect(stockKey('magazzino', S1)).toBe(K1);
    expect(splitStockKey(K1)).toEqual({ place: 'magazzino', shelfId: S1 });
    expect(splitStockKey('magazzino')).toEqual({ place: 'magazzino' });
    expect(splitStockKey(`a/b/${S1}`)).toEqual({ place: 'a/b', shelfId: S1 });
    expect(splitStockKey('magazzino/')).toEqual({ place: 'magazzino/' });
    expect(splitStockKey(`/${S1}`)).toEqual({ place: `/${S1}` });
    expect(placeOfKey(K1)).toBe('magazzino');
  });

  it('id di una posizione nuova dal nome: mai il separatore', () => {
    expect(newLocationId('Stand A/B')).toBe('stand_a_b');
    expect(newLocationId('Magazzino')).toBe('magazzino');
    expect(newLocationId('Retro / Scala')).not.toContain('/');
  });

  it('5 in Magazzino e 3 su A1: totale 8, Magazzino 8 (scaffali compresi), senza scaffale 5, A1 3', () => {
    const p = s({ magazzino: 5, [K1]: 3 });
    expect(totalStock(p)).toBe(8);
    expect(qtyAt(p, 'magazzino')).toBe(8);
    expect(qtyIn(p, 'magazzino')).toBe(5);
    expect(qtyAt(p, K1)).toBe(3);
    expect(qtyIn(p, K1)).toBe(3);
    expect(isAt(s({ [K1]: 3 }, { location: 'vetrina' }), 'magazzino')).toBe(true);
    expect(isAt(s({ [K1]: 0, vetrina: 1 }, { location: 'vetrina' }), 'magazzino')).toBe(false);
  });

  it('positionsOf dà sempre posizioni, anche per la giacenza su uno scaffale (anche nel cestino)', () => {
    expect(positionsOf(s({ [K1]: 3 }, { location: 'vetrina', deletedAt: NOW })).sort()).toEqual(['magazzino', 'vetrina']);
    expect(positionsOf(s({ [K1]: 0 }, { location: 'vetrina' }))).toEqual(['vetrina']);
  });

  it('mainLocation somma gli scaffali della posizione e dà sempre una posizione', () => {
    expect(mainLocation({ [K1]: 3 }, 'magazzino')).toBe('magazzino');
    expect(mainLocation({ [K1]: 3, vetrina: 2 }, 'stand_a')).toBe('magazzino');
    expect(mainLocation({ [K1]: 1, [K2]: 2, vetrina: 2.5 }, 'vetrina')).toBe('vetrina');
    expect(mainLocation({ [K1]: 1, [K2]: 2, vetrina: 2.5 }, 'stand_a')).toBe('magazzino');
  });

  it('trasferimento dalla posizione al suo scaffale: permesso, nessuno zero in più, la posizione principale resta', () => {
    const r = applyMovement(s({ magazzino: 2 }), { kind: 'trasferimento', qty: 2, from: 'magazzino', to: K1 }, NOW);
    if (!r.ok) throw new Error(r.error);
    expect(r.product.stock).toEqual({ [K1]: 2 });
    expect(r.product.location).toBe('magazzino');
    expect(applyMovement(s({ [K1]: 2 }), { kind: 'trasferimento', qty: 1, from: K1, to: K1 }, NOW)).toEqual({ ok: false, error: 'same_place' });
  });

  it('dallo scaffale a un\'altra posizione e scarico fino a 0: la posizione resta una posizione', () => {
    const { p } = run(s({ [K1]: 3 }), [{ kind: 'trasferimento', qty: 3, from: K1, to: 'stand_b' }]);
    expect(p.stock).toEqual({ stand_b: 3 });
    expect(p.location).toBe('stand_b');
    const { p: q } = run(s({ [K1]: 1 }), [{ kind: 'scarico', qty: 1, from: K1 }]);
    expect(q.stock).toEqual({ magazzino: 0 });
    expect(q.location).toBe('magazzino');
    expect(isOutOfStock(q)).toBe(true);
    expect(applyMovement(s({ magazzino: 5, [K1]: 3 }), { kind: 'scarico', qty: 4, from: K1 }, NOW)).toEqual({ ok: false, error: 'over_stock', available: 3 });
  });

  it('pezzo unico su uno scaffale: vale 1 su quello scaffale; al primo movimento la giacenza resta lì', () => {
    const piece = item({ location: 'magazzino', shelfId: S1 });
    expect(stockOf(piece)).toEqual({ [K1]: 1 });
    expect(qtyAt(piece, 'magazzino')).toBe(1);
    const { p, events } = run(piece, [{ kind: 'carico', qty: 2, to: K1 }]);
    expect(p.stock).toEqual({ [K1]: 3 });
    expect(events[0].details).toMatchObject({ movement: 'carico', qty: 1, to: K1, reason: 'iniziale' });
    expect(replayStock(events)).toEqual(p.stock);
  });

  it('rettifica di uno scaffale: solo quella chiave', () => {
    const { p } = run(s({ magazzino: 5, [K1]: 3 }), [{ kind: 'rettifica', at: K1, counted: 1 }]);
    expect(p.stock).toEqual({ magazzino: 5, [K1]: 1 });
  });

  it('keysAt e drawsAt: prima la posizione senza scaffale, poi gli scaffali; null se non basta', () => {
    const p = s({ [K2]: 1, magazzino: 5, vetrina: 4, [K1]: 3 });
    expect(keysAt(p, 'magazzino')).toEqual([['magazzino', 5], [K1, 3], [K2, 1]]);
    expect(drawsAt(p, 'magazzino', 7)).toEqual([['magazzino', 5], [K1, 2]]);
    expect(drawsAt(p, 'magazzino', 9)).toEqual([['magazzino', 5], [K1, 3], [K2, 1]]);
    expect(drawsAt(p, 'magazzino', 9.5)).toBeNull();
    expect(drawsAt(p, 'magazzino', 0)).toBeNull();
    expect(drawsAt(s({ [K1]: 0.3 }), 'magazzino', 0.1 + 0.2)).toEqual([[K1, 0.3]]);
  });

  it('stockGroups: per posizione dalla più grande, con la parte senza scaffale e gli scaffali', () => {
    expect(stockGroups({ vetrina: 9, magazzino: 5, [K1]: 3 })).toEqual([
      { place: 'vetrina', qty: 9, keys: [{ key: 'vetrina', qty: 9 }] },
      { place: 'magazzino', qty: 8, keys: [{ key: 'magazzino', qty: 5 }, { key: K1, shelfId: S1, qty: 3 }] },
    ]);
    expect(stockGroups({ [K1]: 3 })).toEqual([{ place: 'magazzino', qty: 3, keys: [{ key: K1, shelfId: S1, qty: 3 }] }]);
  });

  it('giacenza salvata = eventi rigiocati, con eventi di prima (senza scaffale) e nuovi (con lo scaffale)', () => {
    const moves: Movement[] = [
      { kind: 'carico', qty: 5, to: 'magazzino' },
      { kind: 'trasferimento', qty: 3, from: 'magazzino', to: K1 },
      { kind: 'trasferimento', qty: 2, from: K1, to: 'stand_b' },
      { kind: 'scarico', qty: 1, from: K1, reason: 'vendita' },
      { kind: 'rettifica', at: 'magazzino', counted: 1 },
    ];
    const { p, events } = run(item({ location: 'magazzino' }), moves);
    const salvata = Object.fromEntries(Object.entries(p.stock!).filter(([, q]) => q !== 0));
    expect(replayStock(events)).toEqual(salvata);
    expect(p.location).toBe('magazzino');
    // pezzo unico 1 + 5 in Magazzino; 3 su A1, 2 di questi a Stand B, 1 venduto; Magazzino senza scaffale 3 → 1
    expect(p.stock).toEqual({ magazzino: 1, stand_b: 2 });
    expect(totalStock(p)).toBe(3);
  });
});
