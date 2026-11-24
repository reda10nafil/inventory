// Spostamento, vendita, quantità iniziale e modifica per i due tipi di prodotto (M03, ticket 01 e 03).
// Funzioni pure: il contesto dell'inventario le chiama sulla copia più recente del prodotto e scrive nello stato
// solo i campi restituiti in `patch`, più gli eventi della Cronologia.
// - Pezzo unico (senza `stock`): come prima, eventi `moved` e `sold`, stato «venduto».
// - Articolo a quantità: tutto passa da `applyMovement` ed eventi `stock`; lo stato resta «disponibile», il prezzo
//   della vendita sta nell'evento e `sellPrice` (prezzo di listino) non si sovrascrive.
// S1b (ticket 13): la giacenza può stare sugli scaffali (chiavi `posizione/scaffale`). Spostare prende tutta la
// posizione principale, scaffali compresi; vendere e il calo della Conta prendono prima dalla parte senza scaffale,
// poi dagli scaffali (`drawsAt`), con un evento per chiave.
import type { Product } from '../types';
import { canMove, canSell } from './productRules';
import {
  applyMovement, DEFAULT_UNIT, drawsAt, isAt, isOutOfStock, isStocked, keysAt, movementErrorText, placeOfKey, qtyAt, qtyIn,
  round3, splitStockKey, stockKey, type Movement, type MovementError, type NewEvent,
} from './stock';

export type OpRefusal = 'missing' | 'trash' | 'same_place' | 'sold' | 'out_of_stock' | 'over_stock' | 'bad_qty' | 'not_allowed';
export type OpResult = { ok: true; patch: Partial<Product>; events: NewEvent[] } | { ok: false; reason: OpRefusal };

/** Toglie lo scaffale a chi lo aveva (S1a): i prodotti senza scaffale non ricevono il campo. */
const noShelf = (p: Pick<Product, 'shelfId'>): Partial<Product> => (p.shelfId !== undefined ? { shelfId: undefined } : {});

/** I campi che un movimento cambia: solo questi entrano nello stato, il resto del prodotto non si tocca. Un articolo
 *  a quantità non ha `shelfId`: il suo scaffale sta nella chiave della giacenza (S1b). Un pezzo unico che diventa
 *  articolo a quantità perde il campo, ma la sua giacenza resta sullo scaffale (`applyMovement`). */
const stockPatch = (p: Product): Partial<Product> => ({
  stock: p.stock, unit: p.unit, location: p.location, updatedAt: p.updatedAt, lastScannedAt: p.lastScannedAt, ...noShelf(p),
});

/** Movimenti in fila sullo stesso prodotto (uno per chiave): il prodotto alla fine e tutti gli eventi, oppure il
 *  primo rifiuto (in quel caso nulla cambia). */
function applyAll(product: Product, movements: readonly Movement[], now: string):
  { ok: true; product: Product; events: NewEvent[] } | { ok: false; error: MovementError; available?: number } {
  let current = product;
  const events: NewEvent[] = [];
  for (const movement of movements) {
    const r = applyMovement(current, movement, now);
    if (!r.ok) return r;
    current = r.product;
    events.push(...r.events);
  }
  return { ok: true, product: current, events };
}

/** Sposta il prodotto: un pezzo unico cambia posizione, un articolo a quantità trasferisce tutta la giacenza
 *  della posizione principale, scaffali compresi (un trasferimento per chiave, S1b).
 *  S3 (scaffale come destinazione, preso da FLU1): `to` può essere `posizione/idScaffale`. Un pezzo unico va su quello
 *  scaffale (`shelfId`): cambiando posizione l'evento è «spostato» come prima, nella stessa posizione è il cambio di
 *  scaffale di Modifica («Scaffale: — → A1», col nome da `shelfName`). Un articolo a quantità trasferisce sullo
 *  scaffale tutte le chiavi della posizione principale tranne quella dello scaffale stesso; già tutto lì: «già lì». */
export function moveOf(product: Product | undefined, to: string, now: string, shelfName?: (id: string) => string): OpResult {
  if (!product) return { ok: false, reason: 'missing' };
  if (product.deletedAt) return { ok: false, reason: 'trash' };
  const { place, shelfId } = splitStockKey(to);
  if (shelfId) return moveToShelf(product, place, shelfId, now, shelfName);
  if (!canMove(product, to)) return { ok: false, reason: 'same_place' };
  if (!isStocked(product)) {
    return {
      ok: true,
      // Lo scaffale è dentro la posizione di prima: cambiando posizione si toglie (S1a)
      patch: { location: to, updatedAt: now, lastScannedAt: now, ...noShelf(product) },
      events: [{ productId: product.id, type: 'moved', timestamp: now, details: { from: product.location, to } }],
    };
  }
  const keys = keysAt(product, product.location);
  if (!keys.length) return { ok: false, reason: 'out_of_stock' };
  const r = applyAll(product, keys.map(([from, qty]) => ({ kind: 'trasferimento' as const, qty, from, to })), now);
  if (!r.ok) return { ok: false, reason: r.error === 'over_stock' ? 'over_stock' : 'not_allowed' };
  return { ok: true, patch: stockPatch(r.product), events: r.events };
}

/** `moveOf` verso uno scaffale (S3). */
function moveToShelf(product: Product, place: string, shelfId: string, now: string, shelfName?: (id: string) => string): OpResult {
  const to = stockKey(place, shelfId);
  if (!isStocked(product)) {
    if (product.location === place && product.shelfId === shelfId) return { ok: false, reason: 'same_place' };
    const name = (id?: string) => (id ? shelfName?.(id) ?? 'sconosciuto' : '—');
    return {
      ok: true,
      patch: { location: place, shelfId, updatedAt: now, lastScannedAt: now },
      events: [product.location !== place
        ? { productId: product.id, type: 'moved', timestamp: now, details: { from: product.location, to: place } }
        : { productId: product.id, type: 'modified', timestamp: now, details: { changes: [`Scaffale: ${name(product.shelfId)} → ${name(shelfId)}`] } }],
    };
  }
  const all = keysAt(product, product.location);
  if (!all.length) return { ok: false, reason: 'out_of_stock' };
  const keys = all.filter(([key]) => key !== to);
  if (!keys.length) return { ok: false, reason: 'same_place' };
  const r = applyAll(product, keys.map(([from, qty]) => ({ kind: 'trasferimento' as const, qty, from, to })), now);
  if (!r.ok) return { ok: false, reason: r.error === 'over_stock' ? 'over_stock' : 'not_allowed' };
  return { ok: true, patch: stockPatch(r.product), events: r.events };
}

/**
 * Che cosa arriva in `to` con `moveOf` (S3, per il controllo del carico): le chiavi da cui parte la merce, con la
 * quantità. Pezzo unico disponibile: 1 dalla sua chiave; articolo a quantità: le chiavi della posizione principale tranne
 * `to`. Vuoto se non si sposta nulla (anche un pezzo unico venduto o nel cestino, che non occupa posto).
 */
export function moveSources(product: Product, to: string): { from: string; qty: number }[] {
  // Un pezzo unico venduto o nel cestino non occupa posto (revisore di S3: prima bloccava un venduto spostato)
  if (!isStocked(product)) return product.status === 'available' && !product.deletedAt ? [{ from: stockKey(product.location, product.shelfId), qty: 1 }] : [];
  return keysAt(product, product.location).filter(([key]) => key !== to).map(([from, qty]) => ({ from, qty }));
}

/**
 * Prezzo **per unità** di una vendita di un articolo a quantità: quello scritto, altrimenti il listino (come nella
 * Vendita flash). Vale per le due strade della vendita, `saleOf` e lo scarico con causale vendita di Movimenta
 * (M10), così `finalPrice` nell'evento ha un solo significato.
 */
export const salePrice = (product: Pick<Product, 'sellPrice'>, written: number | undefined): number | undefined =>
  written ?? product.sellPrice;

/** Vende: un pezzo unico diventa «venduto»; un articolo a quantità scarica `qty` dalla posizione principale, prima
 *  dalla parte senza scaffale e poi dagli scaffali (S1b: uno scarico per chiave, ognuno col prezzo per unità). */
export function saleOf(product: Product | undefined, finalPrice: number | undefined, qty: number, now: string): OpResult {
  if (!product) return { ok: false, reason: 'missing' };
  if (product.deletedAt) return { ok: false, reason: 'trash' };
  if (!canSell(product)) return { ok: false, reason: 'sold' };
  if (!isStocked(product)) {
    return {
      ok: true,
      patch: {
        status: 'sold', soldAt: now, updatedAt: now, lastScannedAt: now,
        ...(finalPrice ? { sellPrice: finalPrice } : {}),
      },
      events: [{ productId: product.id, type: 'sold', timestamp: now, details: { finalPrice } }],
    };
  }
  if (isOutOfStock(product)) return { ok: false, reason: 'out_of_stock' };
  const price = salePrice(product, finalPrice);
  const sale = (from: string, q: number): Movement => ({
    kind: 'scarico', qty: q, from, reason: 'vendita', ...(price != null && { finalPrice: price }),
  });
  // Quantità non valida o posizione principale che non basta: il rifiuto di prima (scarico dalla posizione)
  const draws = drawsAt(product, product.location, qty) ?? [[product.location, qty]];
  const r = applyAll(product, draws.map(([from, q]) => sale(from, q)), now);
  if (!r.ok) return { ok: false, reason: r.error === 'over_stock' ? 'over_stock' : r.error === 'bad_qty' ? 'bad_qty' : 'not_allowed' };
  return { ok: true, patch: stockPatch(r.product), events: r.events };
}

export type StartResult = { ok: true; product: Product; events: NewEvent[] } | { ok: false; reason: 'bad_qty' | 'not_allowed' };

/**
 * Prodotto nuovo con la sua giacenza per posizione (import CSV, M08): articolo a quantità con un carico
 * «iniziale» per ogni posizione con quantità, così gli eventi ridanno la giacenza salvata. Si carica prima la
 * posizione del prodotto, che resta la principale se ha quantità. Tutto a 0: articolo esaurito senza eventi.
 */
export function withStartingStock(product: Product, stock: Readonly<Record<string, number>>, now: string): StartResult {
  const entries = Object.entries(stock);
  if (entries.some(([place, qty]) => !place || !Number.isFinite(qty) || qty < 0)) return { ok: false, reason: 'bad_qty' };
  const loads = entries.filter(([, qty]) => round3(qty) > 0);
  // Prima la posizione del prodotto, poi i suoi scaffali (S1b), poi le altre
  const rank = (key: string) => (key === product.location ? 2 : placeOfKey(key) === product.location ? 1 : 0);
  loads.sort(([a], [b]) => rank(b) - rank(a));
  // Articolo a quantità: nessun `shelfId`, lo scaffale sta nella chiave della giacenza (S1b)
  const base: Product = { ...product };
  delete base.shelfId;
  let current: Product = { ...base, unit: product.unit || DEFAULT_UNIT, stock: {} };
  const events: NewEvent[] = [];
  for (const [to, qty] of loads) {
    const r = applyMovement(current, { kind: 'carico', qty, to, reason: 'iniziale' }, now);
    if (!r.ok) return { ok: false, reason: r.error === 'bad_qty' ? 'bad_qty' : 'not_allowed' };
    current = r.product;
    events.push(...r.events);
  }
  if (!loads.length) {
    if (product.deletedAt || product.status !== 'available') return { ok: false, reason: 'not_allowed' };
    const location = product.location || placeOfKey(entries[0]?.[0] ?? '') || '';
    return { ok: true, product: { ...current, location, stock: { [location]: 0 } }, events: [] };
  }
  // Il carico iniziale non è una scansione: date del prodotto come per un pezzo unico appena creato
  return { ok: true, product: { ...current, updatedAt: product.updatedAt, lastScannedAt: product.lastScannedAt }, events };
}

/**
 * Prodotto nuovo con una quantità (Aggiungi): diventa articolo a quantità con un carico «iniziale» nella sua
 * posizione, sullo scaffale scelto se c'è (S1b), così gli eventi ridanno la giacenza salvata. Quantità 0: articolo
 * a quantità esaurito, senza eventi.
 */
export function withInitialStock(product: Product, qty: number, now: string): StartResult {
  return withStartingStock(product, { [stockKey(product.location, product.shelfId)]: qty }, now);
}

/**
 * Movimento scelto dall'utente nella Scheda (M04, ticket 02): carico, scarico, trasferimento o rettifica.
 * Vale anche per un pezzo unico, che al primo movimento diventa articolo a quantità (carico «iniziale» di 1).
 */
export function movementOf(
  product: Product | undefined,
  movement: Movement,
  now: string,
): { ok: true; patch: Partial<Product>; events: NewEvent[] } | { ok: false; error: MovementError; available?: number } {
  if (!product) return { ok: false, error: 'not_allowed' };
  const r = applyMovement(product, movement, now);
  if (!r.ok) return r;
  return { ok: true, patch: stockPatch(r.product), events: r.events };
}

/** Riga della Conta (M07, ticket 06): un articolo a quantità che si aspetta in una posizione. */
export type CountRow = { id: string; sku: string; furType: string; libraryId?: string; unit: string; expected: number };

/** Si possono contare (e rettificare) solo gli articoli a quantità disponibili e non nel cestino. */
const countable = (p: Product) => isStocked(p) && !p.deletedAt && p.status === 'available';

/**
 * Articoli da contare in una posizione, in ordine di SKU: articoli a quantità che sono qui (`isAt`), anche
 * esauriti con la posizione principale qui (previsti 0). I pezzi unici non entrano: si verificano con l'Audit,
 * perché un conteggio diverso da 1 li trasformerebbe in articoli a quantità (vedi `uniqueAt`).
 * S1b: la quantità prevista è il totale della posizione, scaffali compresi (la Conta per scaffale arriva con CON).
 */
export function countRows(products: readonly Product[], at: string): CountRow[] {
  return products
    .filter((p) => countable(p) && isAt(p, at))
    .map((p) => ({ id: p.id, sku: p.sku, furType: p.furType, libraryId: p.libraryId, unit: p.unit || DEFAULT_UNIT, expected: qtyAt(p, at) }))
    .sort((a, b) => a.sku.localeCompare(b.sku));
}

/** Pezzi unici disponibili in questa posizione (la Conta li lascia all'Audit e lo dice). */
export function uniqueAt(products: readonly Product[], at: string): number {
  return products.filter((p) => !isStocked(p) && qtyAt(p, at) > 0).length;
}

export type CountDiff = CountRow & { counted: number; delta: number };

/** Differenze da rettificare: le righe con una quantità contata diversa dalla prevista (le vuote non contano). */
export function countDiffs(rows: readonly CountRow[], counts: Readonly<Record<string, number>>): CountDiff[] {
  const out: CountDiff[] = [];
  for (const row of rows) {
    const counted = counts[row.id];
    if (counted == null) continue;
    const delta = round3(counted - row.expected);
    if (delta !== 0) out.push({ ...row, counted, delta });
  }
  return out;
}

/**
 * Rettifiche «conta» per portare la posizione `at` (scaffali compresi) a `counted`. Con un rifiuto da dire (prodotto
 * non disponibile, posizione mancante, quantità non valida) o nessuna differenza, una rettifica sola della parte senza
 * scaffale, che `applyMovement` rifiuta col motivo di prima (`no_change` quando il totale è già quello).
 */
function countMoves(product: Product, at: string, counted: number): Movement[] {
  const plain = (value: number): Movement[] => [{ kind: 'rettifica', at, counted: value, reason: 'conta' }];
  if (!at || !Number.isFinite(counted) || counted < 0 || product.deletedAt || product.status !== 'available') return plain(counted);
  const delta = round3(counted - qtyAt(product, at));
  if (delta >= 0) return plain(round3(qtyIn(product, at) + delta));
  const draws = drawsAt(product, at, -delta);
  // Non dovrebbe mancare (il calo non supera il totale): se manca, il rifiuto di `applyMovement`, mai una rettifica vuota
  if (!draws?.length) return plain(counted);
  return draws.map(([key, take]) => ({
    kind: 'rettifica' as const, at: key, counted: round3(qtyIn(product, key) - take), reason: 'conta' as const,
  }));
}

export type CountRefusal = MovementError | 'missing' | 'unique';
export type CountResult = {
  patches: { id: string; patch: Partial<Product> }[];
  events: NewEvent[];
  /** SKU rettificati, uguali (nessun evento) e rifiutati col motivo. */
  adjusted: string[];
  unchanged: string[];
  refused: { sku: string; reason: CountRefusal }[];
};

/**
 * Conferma della Conta: per ogni prodotto contato (id → quantità contata, solo quelli scritti) una rettifica
 * con causale «conta» nella posizione `at`, calcolata sui prodotti più recenti. La quantità contata è assoluta,
 * quindi vale anche se la giacenza è cambiata dopo aver aperto la conta. Uguale alla registrata: nessun evento.
 * Prodotto sparito, pezzo unico o non più disponibile: rifiutato e detto, gli altri si rettificano lo stesso.
 * S1b: si conta il totale della posizione, scaffali compresi. Un aumento va sulla parte senza scaffale; un calo
 * prende prima da lì e poi dagli scaffali (`drawsAt`), con una rettifica per chiave. Senza scaffali, come prima.
 */
export function countOf(products: readonly Product[], at: string, counts: Readonly<Record<string, number>>, now: string): CountResult {
  const result: CountResult = { patches: [], events: [], adjusted: [], unchanged: [], refused: [] };
  for (const [id, counted] of Object.entries(counts)) {
    const product = products.find((p) => p.id === id);
    if (!product) { result.refused.push({ sku: id, reason: 'missing' }); continue; }
    if (!isStocked(product)) { result.refused.push({ sku: product.sku, reason: 'unique' }); continue; }
    const r = applyAll(product, countMoves(product, at, counted), now);
    if (!r.ok) {
      if (r.error === 'no_change') result.unchanged.push(product.sku);
      else result.refused.push({ sku: product.sku, reason: r.error });
      continue;
    }
    result.patches.push({ id, patch: stockPatch(r.product) });
    result.events.push(...r.events);
    result.adjusted.push(product.sku);
  }
  return result;
}

/** Perché un articolo della Conta non è stato rettificato. */
export function countRefusalText(reason: CountRefusal, unit?: string): string {
  if (reason === 'missing') return 'prodotto non trovato';
  if (reason === 'unique') return 'pezzo unico: si verifica con l\'Audit';
  if (reason === 'not_allowed') return 'non più disponibile (venduto o nel cestino)';
  return movementErrorText({ error: reason }, unit);
}

/** Modifica: per un articolo a quantità posizione, giacenza e scaffale non si cambiano a mano (solo con i movimenti). */
export function editableUpdates(product: Pick<Product, 'stock'>, updates: Partial<Product>): Partial<Product> {
  if (!isStocked(product)) return updates;
  const rest = { ...updates };
  delete rest.location;
  delete rest.stock;
  delete rest.shelfId; // S1a: niente scaffale per gli articoli a quantità
  return rest;
}

/** Messaggio per l'utente quando uno spostamento o una vendita viene rifiutato. */
export function refusalText(reason: OpRefusal, sku = 'Il prodotto'): string {
  switch (reason) {
    case 'missing': return 'Prodotto non trovato.';
    case 'trash': return `${sku} è nel cestino.`;
    case 'same_place': return `${sku} è già in quella posizione.`;
    case 'sold': return `${sku} risulta già venduto.`;
    case 'out_of_stock': return `${sku} è esaurito.`;
    case 'over_stock': return `${sku}: nella posizione principale non c'è abbastanza giacenza.`;
    case 'bad_qty': return 'Scrivi una quantità maggiore di zero (fino a 3 decimali).';
    case 'not_allowed': return `${sku} non si può movimentare.`;
  }
}
