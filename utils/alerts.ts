// Avvisi di riordino (M06, ticket 05): un articolo a quantità sotto la scorta minima ha l'avviso `low_stock`,
// che entra nel conteggio «Richiedono attenzione», nel filtro «Attenzione» e nel badge della card come gli altri.
import type { Alert, Product } from '../types';
import { formatQty, isLowStock, parseQty, totalStock } from './stock';

/** Avviso di scorta per un prodotto, oppure null se non è sotto scorta. Es. «VIS-0142: 2 pz, scorta minima 5 pz». */
export function lowStockAlert(product: Product, now: string): Alert | null {
  if (!isLowStock(product) || product.status !== 'available') return null;
  return {
    id: `alert-low-${product.id}`,
    productId: product.id,
    type: 'low_stock',
    message: `${product.sku}: ${formatQty(totalStock(product), product.unit)}, scorta minima ${formatQty(product.minStock ?? 0, product.unit)}`,
    createdAt: now,
    dismissed: false,
  };
}

/**
 * Unisce gli avvisi appena calcolati a quelli salvati: quelli scartati dall'utente restano scartati. Un avviso di
 * scorta scartato si dimentica quando il prodotto torna sopra la scorta minima, così riappare alla volta dopo.
 */
export function mergeAlerts(fresh: readonly Alert[], saved: readonly Alert[]): Alert[] {
  const freshIds = new Set(fresh.map((a) => a.id));
  const dismissed = new Map(
    saved.filter((a) => a.dismissed && (a.type !== 'low_stock' || freshIds.has(a.id))).map((a) => [a.id, a]),
  );
  return [...fresh.filter((a) => !dismissed.has(a.id)), ...dismissed.values()];
}

/** Scorta minima scritta nel modulo: vuota o 0 = nessuna; non valida = `null` (si avvisa l'utente). */
export function parseMinStock(text: string): number | undefined | null {
  if (!text.trim()) return undefined;
  const value = parseQty(text);
  if (value === undefined) return null;
  return value > 0 ? value : undefined;
}
