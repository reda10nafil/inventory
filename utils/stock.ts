// Giacenza e movimenti di magazzino (M02, ticket 01-03). Funzioni pure: le schermate e il contesto le chiamano.
// Il contesto calcola i movimenti sulla copia più recente dei prodotti (`productsRef`, aggiornata subito) e
// scrive nello stato solo i campi del movimento, così due chiamate nello stesso istante non si perdono (M03).
//
// Due tipi di prodotto, distinti solo da `stock`:
// - pezzo unico (senza `stock`, tutti i prodotti di prima): giacenza 1 nella sua `location` se disponibile e
//   non nel cestino, altrimenti 0;
// - articolo a quantità (`stock` presente, anche se a 0): la giacenza salvata è la verità e si cambia solo con
//   `applyMovement`, che restituisce anche gli eventi `stock` della Cronologia da salvare insieme.
// I conti si fanno in millesimi interi: 0,1 + 0,2 fa 0,3 e uno scarico di 0,3 non viene rifiutato.
//
// Scaffali (S1b, ticket 13): una chiave di `stock` è una posizione (`magazzino`) oppure una posizione con uno dei
// suoi scaffali (`magazzino/<idScaffale>`, forma 2 scelta con i test di `__tests__/stockKeyForm.test.ts`). Così il
// totale di una posizione si calcola dal solo prodotto, senza l'elenco degli scaffali: `isAt` e `qtyAt` di una
// posizione sommano i suoi scaffali, `qtyIn` legge una chiave esatta; `positionsOf` e `mainLocation` danno sempre una
// posizione, e `location` del prodotto resta sempre una posizione. Gli eventi di prima, senza scaffale, si rigiocano
// come prima. Un pezzo unico con `shelfId` sta su `posizione/scaffale`.
import type { MovementKind, MovementReason, Product, TimelineEvent } from '../types';
import { formatNumber, parseNumber } from './number';
import { formatPrice } from './price';

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
type StockProduct = Pick<Product, 'location' | 'status' | 'deletedAt' | 'stock' | 'shelfId'>;

const toMilli = (value: number) => Math.round(value * 1000);
const fromMilli = (milli: number) => milli / 1000;

/** Quantità a 3 decimali (0,1 + 0,2 → 0,3). */
export const round3 = (value: number): number => fromMilli(toMilli(value));

/** Separatore tra posizione e scaffale nelle chiavi di `stock` (S1b): non compare negli id di posizioni e scaffali. */
export const SHELF_KEY_SEPARATOR = '/';

/** Chiave della giacenza: la posizione, oppure la posizione con uno dei suoi scaffali (`magazzino/<id>`). */
export const stockKey = (place: string, shelfId?: string): string => (shelfId ? `${place}${SHELF_KEY_SEPARATOR}${shelfId}` : place);

/**
 * Posizione e scaffale di una chiave. La posizione è tutto prima dell'**ultimo** separatore (gli id degli scaffali
 * non lo contengono mai); senza separatore, o con un lato vuoto, la chiave è una posizione così com'è.
 */
export function splitStockKey(key: string): { place: string; shelfId?: string } {
  const at = key.lastIndexOf(SHELF_KEY_SEPARATOR);
  return at > 0 && at < key.length - 1 ? { place: key.slice(0, at), shelfId: key.slice(at + 1) } : { place: key };
}

/** Posizione di una chiave della giacenza. */
export const placeOfKey = (key: string): string => splitStockKey(key).place;

/** La chiave conta per `place`: è proprio quella (anche una posizione con `/` scritta prima di S1b da un CSV a mano)
 *  oppure è uno scaffale di quella posizione. */
const belongsTo = (key: string, place: string): boolean => key === place || placeOfKey(key) === place;

/** Id di una posizione nuova dal nome (Impostazioni › Posizioni): solo a-z, 0-9 e `_`, quindi mai il separatore. */
export const newLocationId = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]/g, '_');

/** Articolo a quantità: ha `stock`, anche vuoto o a 0 (un articolo esaurito non torna pezzo unico). */
export const isStocked = (product: Pick<Product, 'stock'>): boolean => product.stock != null;

/** Giacenza in millesimi, solo le chiavi con quantità positiva e valida. Un pezzo unico sta sul suo scaffale (S1b). */
function milliOf(product: StockProduct): Record<string, number> {
  if (product.deletedAt) return {};
  if (!isStocked(product)) {
    return product.status === 'available' && product.location ? { [stockKey(product.location, product.shelfId)]: 1000 } : {};
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

/**
 * Giacenza salvata di un articolo a quantità anche se è nel cestino (torna col ripristino): per la Scheda e la
 * card del Cestino, così nessuno lo elimina per sempre credendolo vuoto (M04). Per un pezzo unico come `stockOf`.
 */
export function storedStock(product: StockProduct): Stock {
  return stockOf(isStocked(product) ? { ...product, deletedAt: undefined } : product);
}

/** Totale della giacenza salvata (anche nel cestino), per la card del Cestino e la Scheda. */
export function storedTotal(product: StockProduct): number {
  return round3(Object.values(storedStock(product)).reduce((a, b) => a + b, 0));
}

/** Giacenza totale (0 = esaurito per un articolo a quantità). */
export function totalStock(product: StockProduct): number {
  return fromMilli(Object.values(milliOf(product)).reduce((a, b) => a + b, 0));
}

/** Esaurito: articolo a quantità, non nel cestino, con giacenza 0. I pezzi unici non sono mai «esauriti». */
export const isOutOfStock = (product: StockProduct): boolean =>
  isStocked(product) && !product.deletedAt && totalStock(product) === 0;

/**
 * Sotto scorta (ticket 05): articolo a quantità, non nel cestino, con scorta minima scritta e giacenza totale
 * strettamente minore. Un pezzo unico non ha scorta minima. Usata dal CSV delle giacenze (M08) e dagli avvisi (M06).
 */
export function isLowStock(product: StockProduct & Pick<Product, 'minStock'>): boolean {
  const min = product.minStock;
  if (!isStocked(product) || product.deletedAt || typeof min !== 'number' || !Number.isFinite(min) || min <= 0) return false;
  return Object.values(milliOf(product)).reduce((a, b) => a + b, 0) < toMilli(min);
}

/** Millesimi per `place`: una posizione somma anche i suoi scaffali, una chiave con lo scaffale vale da sola. */
function milliAt(milli: Readonly<Record<string, number>>, place: string): number {
  if (splitStockKey(place).shelfId) return milli[place] ?? 0;
  let sum = 0;
  for (const [key, m] of Object.entries(milli)) if (belongsTo(key, place)) sum += m;
  return sum;
}

/** Il prodotto è in questa posizione: è la sua posizione principale o ci ha giacenza (anche su uno dei suoi scaffali).
 *  Sostituisce `p.location === x`. */
export function isAt(product: StockProduct, place: string): boolean {
  return product.location === place || milliAt(milliOf(product), place) > 0;
}

/** Quantità in una posizione, **scaffali compresi** (0 se non c'è, se è venduto o nel cestino); con una chiave
 *  `posizione/scaffale`, solo quello scaffale. Per «che cosa c'è qui» (Audit, Conta, capienza). */
export function qtyAt(product: StockProduct, place: string): number {
  return fromMilli(milliAt(milliOf(product), place));
}

/** Quantità di una chiave esatta (`magazzino` = solo la parte senza scaffale): per scegliere da dove muovere. */
export function qtyIn(product: StockProduct, key: string): number {
  return fromMilli(milliOf(product)[key] ?? 0);
}

/** Tutte le posizioni scritte sul prodotto, anche nel cestino o a 0: per non eliminare una posizione in uso. Una
 *  chiave con lo scaffale vale la sua posizione. */
export function positionsOf(product: Pick<Product, 'location' | 'stock'>): string[] {
  const places = new Set<string>(product.location ? [product.location] : []);
  for (const [place, qty] of Object.entries(product.stock ?? {})) {
    if (place && typeof qty === 'number' && qty > 0) places.add(place === product.location ? place : placeOfKey(place));
  }
  return [...places];
}

/** Posizione principale dopo un movimento: resta se ha ancora giacenza (scaffali compresi), altrimenti quella con più
 *  quantità. È sempre una posizione, mai una chiave con lo scaffale. */
export function mainLocation(stock: Readonly<Record<string, number>>, current: string): string {
  const totals: Record<string, number> = {};
  for (const [key, qty] of Object.entries(stock)) {
    const place = key === current ? current : placeOfKey(key);
    totals[place] = (totals[place] ?? 0) + (qty > 0 ? qty : 0);
  }
  if ((totals[current] ?? 0) > 0) return current;
  let best = current;
  let bestQty = 0;
  for (const [place, qty] of Object.entries(totals)) {
    if (qty > bestQty) { best = place; bestQty = qty; }
  }
  return best;
}

/** Chiavi di una posizione con giacenza: prima quella senza scaffale, poi gli scaffali in ordine di chiave. */
export function keysAt(product: StockProduct, place: string): [string, number][] {
  return Object.entries(milliOf(product))
    .filter(([key]) => belongsTo(key, place))
    .sort(([a], [b]) => Number(b === place) - Number(a === place) || (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, m]) => [key, fromMilli(m)]);
}

/**
 * Da dove prendere `qty` in una posizione (vendita, spostamento, calo della Conta): prima dalla parte senza scaffale,
 * poi dagli scaffali (`keysAt`). `null` se la quantità non è valida o la posizione non ne ha abbastanza.
 */
export function drawsAt(product: StockProduct, place: string, qty: number): [string, number][] | null {
  let left = Number.isFinite(qty) ? toMilli(qty) : 0;
  if (left <= 0) return null;
  const out: [string, number][] = [];
  for (const [key, have] of keysAt(product, place)) {
    if (left <= 0) break;
    const take = Math.min(left, toMilli(have));
    out.push([key, fromMilli(take)]);
    left -= take;
  }
  return left > 0 ? null : out;
}

export type StockGroup = { place: string; qty: number; keys: { key: string; shelfId?: string; qty: number }[] };

/**
 * Giacenza per posizione con i suoi scaffali (Scheda): posizioni dalla più grande; dentro, prima la parte senza
 * scaffale, poi gli scaffali dal più grande. Solo le chiavi con quantità.
 */
export function stockGroups(stock: Readonly<Record<string, number>>): StockGroup[] {
  const groups = new Map<string, { place: string; milli: number; keys: { key: string; shelfId?: string; milli: number }[] }>();
  for (const [key, qty] of Object.entries(stock)) {
    const milli = typeof qty === 'number' && Number.isFinite(qty) ? toMilli(qty) : 0;
    if (!key || milli <= 0) continue;
    const { place, shelfId } = splitStockKey(key);
    const group = groups.get(place) ?? { place, milli: 0, keys: [] };
    group.milli += milli;
    group.keys.push({ key, ...(shelfId && { shelfId }), milli });
    groups.set(place, group);
  }
  return [...groups.values()]
    .sort((a, b) => b.milli - a.milli)
    .map((g) => ({
      place: g.place,
      qty: fromMilli(g.milli),
      keys: g.keys
        .sort((a, b) => Number(!!a.shelfId) - Number(!!b.shelfId) || b.milli - a.milli)
        .map(({ milli, ...k }) => ({ ...k, qty: fromMilli(milli) })),
    }));
}

/** Quantità scritta dall'utente («2,5», «3») a 3 decimali; vuota, negativa o non valida → undefined. */
export function parseQty(input: string | number | null | undefined): number | undefined {
  const value = parseNumber(input);
  if (value == null || value < 0) return undefined;
  return round3(value);
}

/** «2,5 kg», «12 pz». */
export const formatQty = (qty: number, unit?: string): string => `${formatNumber(qty)} ${unit || DEFAULT_UNIT}`;

/** Fornitore o cliente (M10): solo carico e scarico; trasferimento e rettifica sono fatti interni al magazzino. */
export const takesContact = (kind: MovementKind): boolean => kind === 'carico' || kind === 'scarico';

/** Prezzo (M10): solo lo scarico con causale vendita. È sempre un prezzo **per unità**, come il listino. */
export const takesPrice = (kind: MovementKind, reason: MovementReason | undefined): boolean =>
  kind === 'scarico' && reason === 'vendita';

/**
 * Prezzo per unità scritto dall'utente nello scarico con causale vendita («120», «12,50»), al centesimo.
 * Vuoto → undefined (nessun prezzo scritto); negativo o non valido → null (da rifiutare).
 */
export function parseSalePrice(input: string): number | undefined | null {
  if (!input.trim()) return undefined;
  const value = parseNumber(input);
  if (value == null || value < 0) return null;
  return Math.round(value * 100) / 100;
}

// `contactId` vale solo per carico e scarico (`takesContact`); `finalPrice` è il prezzo per unità della vendita.
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
 * carico «iniziale» di 1 nella sua posizione (sul suo scaffale, se ne ha uno: S1b), così gli eventi `stock` da soli
 * ridanno la giacenza salvata. `from`, `to` e `at` sono chiavi: una posizione oppure `posizione/scaffale`.
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
  // La posizione principale resta come chiave a 0 solo se non ha giacenza su un suo scaffale (S1b): niente zeri in più
  const shelved = Object.entries(next).some(([key, milli]) => milli > 0 && key !== location && belongsTo(key, location));
  const stock: Stock = {};
  for (const [place, milli] of Object.entries(next)) if (milli > 0 || (place === location && !shelved)) stock[place] = fromMilli(Math.max(0, milli));
  if (!Object.keys(stock).some((key) => belongsTo(key, location))) stock[location] = 0;

  const events: NewEvent[] = [];
  const home = stockKey(product.location, product.shelfId);
  if (!isStocked(product) && start[home]) {
    events.push({
      productId: product.id,
      type: 'stock',
      timestamp: now,
      details: { movement: 'carico', qty: 1, to: home, reason: 'iniziale', before: 0, after: 1 },
    });
  }
  const details: TimelineEvent['details'] = {
    movement: movement.kind,
    qty: fromMilli(qty),
    ...(from && { from }),
    ...(to && { to }),
    ...(movement.reason && { reason: movement.reason }),
    ...(movement.note?.trim() && { note: movement.note.trim() }),
    ...(movement.contactId && takesContact(movement.kind) && { contactId: movement.contactId }),
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

/**
 * Testo di un evento `stock` per la Cronologia e la Scheda: «Giacenza iniziale: +12 pz in Magazzino»,
 * «Vendita: −1 pz da Vetrina · 120 €», «Trasferimento: 2 kg Vetrina → Magazzino», «Rettifica: −1,5 kg in Vetrina».
 * `placeLabel` dà il nome della posizione (se non c'è più resta l'id), `unit` è quella del prodotto.
 * Il prezzo è per unità: con una quantità diversa da 1 lo dice («· 120 €/pz»).
 * `contactLabel` (M10) dà il nome del fornitore o cliente del movimento («· Fornitore Rossi»); senza risolutore,
 * o se il contatto non è in elenco (`undefined`), il testo non lo cita: l'id non si mostra mai.
 */
export function describeStockEvent(
  details: TimelineEvent['details'],
  placeLabel: (id: string) => string = (id) => id,
  unit?: string,
  contactLabel?: (id: string) => string | undefined,
): string {
  const kind = details.movement;
  const title = (details.reason && details.reason !== 'altro' && kind !== 'trasferimento' && kind !== 'rettifica'
    ? REASON_LABELS[details.reason]
    : kind ? MOVEMENT_LABELS[kind] : 'Movimento');
  const qty = formatQty(details.qty ?? 0, unit);
  const from = details.from ? placeLabel(details.from) : '';
  const to = details.to ? placeLabel(details.to) : '';
  let body: string;
  if (from && to) body = `${qty} ${from} → ${to}`;
  else if (to) body = `+${qty} in ${to}`;
  else if (from) body = kind === 'rettifica' ? `−${qty} in ${from}` : `−${qty} da ${from}`;
  else body = qty;
  const perUnit = (details.qty ?? 1) === 1 ? '' : `/${unit || DEFAULT_UNIT}`;
  const price = details.finalPrice != null ? ` · ${formatPrice(details.finalPrice)}${perUnit}` : '';
  const who = details.contactId ? contactLabel?.(details.contactId) : undefined;
  return `${title}: ${body}${price}${who ? ` · ${who}` : ''}`;
}
