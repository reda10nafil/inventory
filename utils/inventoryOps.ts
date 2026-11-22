// Spostamento, vendita, quantità iniziale e modifica per i due tipi di prodotto (M03, ticket 01 e 03).
// Funzioni pure: il contesto dell'inventario le chiama sulla copia più recente del prodotto e scrive nello stato
// solo i campi restituiti in `patch`, più gli eventi della Cronologia.
// - Pezzo unico (senza `stock`): come prima, eventi `moved` e `sold`, stato «venduto».
// - Articolo a quantità: tutto passa da `applyMovement` ed eventi `stock`; lo stato resta «disponibile», il prezzo
//   della vendita sta nell'evento e `sellPrice` (prezzo di listino) non si sovrascrive.
import type { Product } from '../types';
import { canMove, canSell } from './productRules';
import {
  applyMovement, DEFAULT_UNIT, isAt, isOutOfStock, isStocked, movementErrorText, qtyAt, round3,
  type Movement, type MovementError, type NewEvent,
} from './stock';

export type OpRefusal = 'missing' | 'trash' | 'same_place' | 'sold' | 'out_of_stock' | 'over_stock' | 'bad_qty' | 'not_allowed';
export type OpResult = { ok: true; patch: Partial<Product>; events: NewEvent[] } | { ok: false; reason: OpRefusal };

/** I campi che un movimento cambia: solo questi entrano nello stato, il resto del prodotto non si tocca. */
const stockPatch = (p: Product): Partial<Product> => ({
  stock: p.stock, unit: p.unit, location: p.location, updatedAt: p.updatedAt, lastScannedAt: p.lastScannedAt,
});

/** Sposta il prodotto: un pezzo unico cambia posizione, un articolo a quantità trasferisce tutta la giacenza
 *  della posizione principale. */
export function moveOf(product: Product | undefined, to: string, now: string): OpResult {
  if (!product) return { ok: false, reason: 'missing' };
  if (product.deletedAt) return { ok: false, reason: 'trash' };
  if (!canMove(product, to)) return { ok: false, reason: 'same_place' };
  if (!isStocked(product)) {
    return {
      ok: true,
      patch: { location: to, updatedAt: now, lastScannedAt: now },
      events: [{ productId: product.id, type: 'moved', timestamp: now, details: { from: product.location, to } }],
    };
  }
  const qty = qtyAt(product, product.location);
  if (qty <= 0) return { ok: false, reason: 'out_of_stock' };
  const r = applyMovement(product, { kind: 'trasferimento', qty, from: product.location, to }, now);
  if (!r.ok) return { ok: false, reason: r.error === 'over_stock' ? 'over_stock' : 'not_allowed' };
  return { ok: true, patch: stockPatch(r.product), events: r.events };
}

/** Vende: un pezzo unico diventa «venduto»; un articolo a quantità scarica `qty` dalla posizione principale. */
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
  // Senza prezzo scritto vale quello di listino, come nella Vendita flash
  const price = finalPrice ?? product.sellPrice;
  const r = applyMovement(product, {
    kind: 'scarico', qty, from: product.location, reason: 'vendita', ...(price != null && { finalPrice: price }),
  }, now);
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
  loads.sort(([a], [b]) => Number(b === product.location) - Number(a === product.location));
  let current: Product = { ...product, unit: product.unit || DEFAULT_UNIT, stock: {} };
  const events: NewEvent[] = [];
  for (const [to, qty] of loads) {
    const r = applyMovement(current, { kind: 'carico', qty, to, reason: 'iniziale' }, now);
    if (!r.ok) return { ok: false, reason: r.error === 'bad_qty' ? 'bad_qty' : 'not_allowed' };
    current = r.product;
    events.push(...r.events);
  }
  if (!loads.length) {
    if (product.deletedAt || product.status !== 'available') return { ok: false, reason: 'not_allowed' };
    const location = product.location || entries[0]?.[0] || '';
    return { ok: true, product: { ...current, location, stock: { [location]: 0 } }, events: [] };
  }
  // Il carico iniziale non è una scansione: date del prodotto come per un pezzo unico appena creato
  return { ok: true, product: { ...current, updatedAt: product.updatedAt, lastScannedAt: product.lastScannedAt }, events };
}

/**
 * Prodotto nuovo con una quantità (Aggiungi): diventa articolo a quantità con un carico «iniziale» nella sua
 * posizione, così gli eventi ridanno la giacenza salvata. Quantità 0: articolo a quantità esaurito, senza eventi.
 */
export function withInitialStock(product: Product, qty: number, now: string): StartResult {
  return withStartingStock(product, { [product.location]: qty }, now);
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
export type CountRow = { id: string; sku: string; furType: string; unit: string; expected: number };

/** Si possono contare (e rettificare) solo gli articoli a quantità disponibili e non nel cestino. */
const countable = (p: Product) => isStocked(p) && !p.deletedAt && p.status === 'available';

/**
 * Articoli da contare in una posizione, in ordine di SKU: articoli a quantità che sono qui (`isAt`), anche
 * esauriti con la posizione principale qui (previsti 0). I pezzi unici non entrano: si verificano con l'Audit,
 * perché un conteggio diverso da 1 li trasformerebbe in articoli a quantità (vedi `uniqueAt`).
 */
export function countRows(products: readonly Product[], at: string): CountRow[] {
  return products
    .filter((p) => countable(p) && isAt(p, at))
    .map((p) => ({ id: p.id, sku: p.sku, furType: p.furType, unit: p.unit || DEFAULT_UNIT, expected: qtyAt(p, at) }))
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
 */
export function countOf(products: readonly Product[], at: string, counts: Readonly<Record<string, number>>, now: string): CountResult {
  const result: CountResult = { patches: [], events: [], adjusted: [], unchanged: [], refused: [] };
  for (const [id, counted] of Object.entries(counts)) {
    const product = products.find((p) => p.id === id);
    if (!product) { result.refused.push({ sku: id, reason: 'missing' }); continue; }
    if (!isStocked(product)) { result.refused.push({ sku: product.sku, reason: 'unique' }); continue; }
    const r = applyMovement(product, { kind: 'rettifica', at, counted, reason: 'conta' }, now);
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

/** Modifica: per un articolo a quantità posizione e giacenza non si cambiano a mano (solo con i movimenti). */
export function editableUpdates(product: Pick<Product, 'stock'>, updates: Partial<Product>): Partial<Product> {
  if (!isStocked(product)) return updates;
  const rest = { ...updates };
  delete rest.location;
  delete rest.stock;
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
