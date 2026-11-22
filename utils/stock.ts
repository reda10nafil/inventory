// Giacenza e movimenti di magazzino (M02, ticket 01-03). Funzioni pure: le schermate e il contesto le chiamano,
// i calcoli sullo stato si fanno dentro `setProducts(prev => …)`.
//
// Due tipi di prodotto, distinti solo da `stock`:
// - pezzo unico (senza `stock`, tutti i prodotti di prima): giacenza 1 nella sua `location` se disponibile e
//   non nel cestino, altrimenti 0;
// - articolo a quantità (`stock` presente, anche se a 0): la giacenza salvata è la verità e si cambia solo con
//   `applyMovement`, che restituisce anche gli eventi `stock` della Cronologia da salvare insieme.
// I conti si fanno in millesimi interi: 0,1 + 0,2 fa 0,3 e uno scarico di 0,3 non viene rifiutato.
import type { MovementKind, MovementReason, Product, TimelineEvent } from '../types';
import { formatNumber, parseNumber } from './number';

export const UNITS = ['pz', 'kg', 'm', 'l', 'conf.'] as const;
export const DEFAULT_UNIT = 'pz';

export const REASON_LABELS: Record<MovementReason, string> = {
  iniziale: 'Giacenza iniziale',
  acquisto: 'Acquisto',
  reso: 'Reso',
  vendita: 'Vendita',
  uso_interno: 'Uso interno',
  danno: 'Danno',
  conta: 'Conta',
  altro: 'Altro',
};

export const MOVEMENT_LABELS: Record<MovementKind, string> = {
  carico: 'Carico',
  scarico: 'Scarico',
  trasferimento: 'Trasferimento',
  rettifica: 'Rettifica',
};

type Stock = Record<string, number>;
type StockProduct = Pick<Product, 'location' | 'status' | 'deletedAt' | 'stock'>;

const toMilli = (value: number) => Math.round(value * 1000);
const fromMilli = (milli: number) => milli / 1000;

/** Quantità a 3 decimali (0,1 + 0,2 → 0,3). */
export const round3 = (value: number): number => fromMilli(toMilli(value));

/** Articolo a quantità: ha `stock`, anche vuoto o a 0 (un articolo esaurito non torna pezzo unico). */
export const isStocked = (product: Pick<Product, 'stock'>): boolean => product.stock != null;

/** Giacenza in millesimi, solo le posizioni con quantità positiva e valida. */
function milliOf(product: StockProduct): Record<string, number> {
  if (product.deletedAt) return {};
  if (!isStocked(product)) {
    return product.status === 'available' && product.location ? { [product.location]: 1000 } : {};
  }
  const out: Record<string, number> = {};
  for (const [place, qty] of Object.entries(product.stock ?? {})) {
    if (typeof qty !== 'number' || !Number.isFinite(qty)) continue;
    const milli = toMilli(qty);
    if (place && milli > 0) out[place] = milli;
  }
  return out;
}

/** Giacenza per posizione da mostrare e contare (nel cestino: niente). Solo le posizioni con quantità. */
export function stockOf(product: StockProduct): Stock {
  const out: Stock = {};
  for (const [place, milli] of Object.entries(milliOf(product))) out[place] = fromMilli(milli);
  return out;
}

/** Giacenza totale (0 = esaurito per un articolo a quantità). */
export function totalStock(product: StockProduct): number {
  return fromMilli(Object.values(milliOf(product)).reduce((a, b) => a + b, 0));
}

/** Esaurito: articolo a quantità, non nel cestino, con giacenza 0. I pezzi unici non sono mai «esauriti». */
export const isOutOfStock = (product: StockProduct): boolean =>
  isStocked(product) && !product.deletedAt && totalStock(product) === 0;

/** Il prodotto è in questa posizione: è la sua posizione principale o ci ha giacenza. Sostituisce `p.location === x`. */
export function isAt(product: StockProduct, place: string): boolean {
  return product.location === place || (milliOf(product)[place] ?? 0) > 0;
}

/** Tutte le posizioni scritte sul prodotto, anche nel cestino o a 0: per non eliminare una posizione in uso. */
export function positionsOf(product: Pick<Product, 'location' | 'stock'>): string[] {
  const places = new Set<string>(product.location ? [product.location] : []);
  for (const [place, qty] of Object.entries(product.stock ?? {})) if (place && typeof qty === 'number' && qty > 0) places.add(place);
  return [...places];
}

/** Posizione principale dopo un movimento: resta se ha ancora giacenza, altrimenti quella con più quantità. */
export function mainLocation(stock: Readonly<Record<string, number>>, current: string): string {
  if ((stock[current] ?? 0) > 0) return current;
  let best = current;
  let bestQty = 0;
  for (const [place, qty] of Object.entries(stock)) {
    if (qty > bestQty) { best = place; bestQty = qty; }
  }
  return best;
}

/** Quantità scritta dall'utente («2,5», «3») a 3 decimali; vuota, negativa o non valida → undefined. */
export function parseQty(input: string | number | null | undefined): number | undefined {
  const value = parseNumber(input);
  if (value == null || value < 0) return undefined;
  return round3(value);
}

/** «2,5 kg», «12 pz». */
export const formatQty = (qty: number, unit?: string): string => `${formatNumber(qty)} ${unit || DEFAULT_UNIT}`;

type Common = { reason?: MovementReason; note?: string; contactId?: string };
export type Movement =
  | (Common & { kind: 'carico'; qty: number; to: string })
  | (Common & { kind: 'scarico'; qty: number; from: string; finalPrice?: number })
  | (Common & { kind: 'trasferimento'; qty: number; from: string; to: string })
  | (Common & { kind: 'rettifica'; at: string; counted: number });

export type MovementError = 'not_allowed' | 'bad_qty' | 'no_place' | 'same_place' | 'over_stock' | 'no_change';
export type NewEvent = Omit<TimelineEvent, 'id'>;
export type MovementResult =
  | { ok: true; product: Product; events: NewEvent[] }
  | { ok: false; error: MovementError; available?: number };

/** Messaggio per l'utente quando un movimento viene rifiutato. */
export function movementErrorText(result: { error: MovementError; available?: number }, unit?: string): string {
  switch (result.error) {
    case 'not_allowed': return 'Si movimentano solo prodotti disponibili e non nel cestino.';
    case 'bad_qty': return 'Scrivi una quantità maggiore di zero (fino a 3 decimali).';
    case 'no_place': return 'Scegli la posizione.';
    case 'same_place': return 'Le due posizioni devono essere diverse.';
    case 'over_stock': return `In quella posizione ci sono solo ${formatQty(result.available ?? 0, unit)}.`;
    case 'no_change': return 'La quantità contata è uguale a quella registrata: niente da rettificare.';
  }
}

/**
 * Applica un movimento a un prodotto e restituisce il prodotto nuovo più gli eventi da salvare, oppure il
 * motivo del rifiuto (in quel caso nulla cambia). Non modifica `product`.
 * Il primo movimento di un pezzo unico lo rende articolo a quantità: prima dell'evento chiesto si registra un
 * carico «iniziale» di 1 nella sua posizione, così gli eventi `stock` da soli ridanno la giacenza salvata.
 */
export function applyMovement(product: Product, movement: Movement, now: string): MovementResult {
  if (product.deletedAt || product.status !== 'available') return { ok: false, error: 'not_allowed' };

  const start = milliOf(product);
  const next: Record<string, number> = { ...start };
  const total = (s: Record<string, number>) => Object.values(s).reduce((a, b) => a + b, 0);
  let qty: number; // millesimi, sempre positivi
  let from: string | undefined;
  let to: string | undefined;

  if (movement.kind === 'rettifica') {
    if (!movement.at) return { ok: false, error: 'no_place' };
    if (!Number.isFinite(movement.counted) || movement.counted < 0) return { ok: false, error: 'bad_qty' };
    const delta = toMilli(movement.counted) - (start[movement.at] ?? 0);
    if (delta === 0) return { ok: false, error: 'no_change' };
    qty = Math.abs(delta);
    if (delta < 0) from = movement.at; else to = movement.at;
  } else {
    qty = Number.isFinite(movement.qty) ? toMilli(movement.qty) : 0;
    if (qty <= 0) return { ok: false, error: 'bad_qty' };
    if (movement.kind === 'carico') to = movement.to;
    else if (movement.kind === 'scarico') from = movement.from;
    else { from = movement.from; to = movement.to; }
    if ((movement.kind !== 'carico' && !from) || (movement.kind !== 'scarico' && !to)) return { ok: false, error: 'no_place' };
    if (from && from === to) return { ok: false, error: 'same_place' };
    if (from && qty > (start[from] ?? 0)) return { ok: false, error: 'over_stock', available: fromMilli(start[from] ?? 0) };
  }

  if (from) next[from] = (next[from] ?? 0) - qty;
  if (to) next[to] = (next[to] ?? 0) + qty;

  const location = mainLocation(next, product.location);
  const stock: Stock = {};
  for (const [place, milli] of Object.entries(next)) if (milli > 0 || place === location) stock[place] = fromMilli(Math.max(0, milli));
  if (!(location in stock)) stock[location] = 0;

  const events: NewEvent[] = [];
  if (!isStocked(product) && start[product.location]) {
    events.push({
      productId: product.id,
      type: 'stock',
      timestamp: now,
      details: { movement: 'carico', qty: 1, to: product.location, reason: 'iniziale', before: 0, after: 1 },
    });
  }
  const details: TimelineEvent['details'] = {
    movement: movement.kind,
    qty: fromMilli(qty),
    ...(from && { from }),
    ...(to && { to }),
    ...(movement.reason && { reason: movement.reason }),
    ...(movement.note?.trim() && { note: movement.note.trim() }),
    ...(movement.contactId && { contactId: movement.contactId }),
    ...(movement.kind === 'scarico' && movement.finalPrice != null && { finalPrice: movement.finalPrice }),
    before: fromMilli(total(start)),
    after: fromMilli(total(next)),
  };
  events.push({ productId: product.id, type: 'stock', timestamp: now, details });

  return {
    ok: true,
    product: { ...product, stock, unit: product.unit || DEFAULT_UNIT, location, updatedAt: now, lastScannedAt: now },
    events,
  };
}

/** Giacenza ricostruita dai soli eventi `stock` (in qualsiasi ordine): deve coincidere con quella salvata. */
export function replayStock(events: readonly Pick<TimelineEvent, 'type' | 'details'>[]): Stock {
  const milli: Record<string, number> = {};
  for (const e of events) {
    if (e.type !== 'stock' || typeof e.details.qty !== 'number') continue;
    const q = toMilli(e.details.qty);
    if (e.details.from) milli[e.details.from] = (milli[e.details.from] ?? 0) - q;
    if (e.details.to) milli[e.details.to] = (milli[e.details.to] ?? 0) + q;
  }
  const out: Stock = {};
  for (const [place, m] of Object.entries(milli)) if (m !== 0) out[place] = fromMilli(m);
  return out;
}
