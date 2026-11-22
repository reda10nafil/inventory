// Righe «modificato» della Cronologia: cosa è cambiato in un prodotto (P13).
// Prima si registravano solo posizione, prezzi, note e foto: peso, misure, tipo, SKU, cartella e campi
// personalizzati cambiavano senza lasciare traccia.
import type { Product, ProductCustomData } from '../types';
import { formatNumberInput } from './number';
import { formatPrice } from './price';

const show = (value: unknown): string => {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '—';
  const text = Array.isArray(value) ? value.map((v) => (v && typeof v === 'object' && 'label' in v ? (v as any).label : String(v))).join(', ') : String(value);
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
};
// Vuoto e assente valgono uguale: un testo '' (es. note dei prodotti importati da CSV) contro undefined
// non è una modifica.
const empty = (v: unknown) => (v === '' || (Array.isArray(v) && v.length === 0) ? null : v ?? null);
const same = (a: unknown, b: unknown) => JSON.stringify(empty(a)) === JSON.stringify(empty(b));
const num = (v?: number) => (v == null ? '—' : formatNumberInput(v));
const price = (v?: number) => (v == null ? '—' : formatPrice(v));

/** Righe leggibili per i campi che `updates` cambia davvero rispetto a `before`. */
export function describeChanges(before: Product, updates: Partial<Product>): string[] {
  const changed = <K extends keyof Product>(k: K) => k in updates && !same(updates[k], before[k]);
  const out: string[] = [];
  if (changed('sku')) out.push(`SKU: ${show(before.sku)} → ${show(updates.sku)}`);
  if (changed('furType')) out.push(`Categoria: ${show(before.furType)} → ${show(updates.furType)}`);
  if (changed('location')) out.push(`Posizione: ${show(before.location)} → ${show(updates.location)}`);
  if (changed('libraryId')) out.push(`Cartella: ${show(before.libraryId)} → ${show(updates.libraryId)}`);
  if (changed('sellPrice')) out.push(`Prezzo vendita: ${price(before.sellPrice)} → ${price(updates.sellPrice)}`);
  if (changed('purchasePrice')) out.push(`Prezzo acquisto: ${price(before.purchasePrice)} → ${price(updates.purchasePrice)}`);
  if (changed('length')) out.push(`Lunghezza: ${num(before.length)} → ${num(updates.length)}`);
  if (changed('width')) out.push(`Larghezza: ${num(before.width)} → ${num(updates.width)}`);
  if (changed('weight')) out.push(`Peso: ${num(before.weight)} → ${num(updates.weight)}`);
  if (changed('productionDate')) out.push(`Data produzione: ${show(before.productionDate)} → ${show(updates.productionDate)}`);
  if (changed('minStock')) out.push(`Scorta minima: ${num(before.minStock)} → ${num(updates.minStock)}`);
  if (changed('technicalNotes')) out.push('Note aggiornate');
  if (updates.images && updates.images.length < (before.images || []).length) {
    out.push(`${before.images.length - updates.images.length} foto tolte`);
  }
  if (updates.customData) out.push(...describeCustomChanges(before.customData || [], updates.customData));
  return out;
}

function describeCustomChanges(before: ProductCustomData[], after: ProductCustomData[]): string[] {
  const value = (list: ProductCustomData[]) => new Map(list.map((d) => [d.fieldSnapshot?.id, d]));
  const old = value(before);
  const now = value(after);
  const ids = [...new Set([...old.keys(), ...now.keys()])].filter(Boolean);
  return ids
    .filter((id) => !same(old.get(id)?.value, now.get(id)?.value))
    .map((id) => {
      const name = now.get(id)?.fieldSnapshot?.name ?? old.get(id)?.fieldSnapshot?.name ?? id;
      return `${name}: ${show(old.get(id)?.value)} → ${show(now.get(id)?.value)}`;
    });
}
