// Ricerca e filtri dell'Inventario (C09).
// P14: la ricerca confrontava l'id della posizione («stand_a»), non il nome («Stand A»), e nei filtri
// Cestino e Attenzione veniva ignorata. P15: la pillola Attenzione contava gli avvisi, non i prodotti.
import type { CustomField, Product } from '../types';
import { positionsOf } from './stock';
import { searchTexts } from './fieldValues';

export type InventoryFilter = 'all' | 'available' | 'sold' | 'alert' | 'trash';

type Named = { id: string; label: string };

/** Il prodotto corrisponde alla ricerca: SKU, tipo di pelle (id o nome), categoria (id o nome completo, C1) o
 *  posizione (id o nome), maiuscole indifferenti. Per un articolo a quantità contano tutte le posizioni dove ha
 *  giacenza (M03). Con il registro dei campi (EDC, ticket 23) anche il testo mostrato dei campi personalizzati
 *  (`searchTexts`: testi brevi, numeri, prezzi, scelte scritte a mano). */
export function matchesSearch(
  product: Pick<Product, 'sku' | 'furType' | 'location' | 'stock'> & { libraryId?: string; customData?: Product['customData'] },
  query: string,
  locations: readonly Named[],
  types: readonly Named[] = [],
  categories: readonly Named[] = [],
  fields?: readonly CustomField[],
): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const label = (list: readonly Named[], id: string) => list.find((x) => x.id === id)?.label ?? '';
  const places = positionsOf(product).flatMap((id) => [id, label(locations, id)]);
  const category = product.libraryId ? [product.libraryId, label(categories, product.libraryId)] : [];
  const has = (text: unknown) => String(text || '').toLocaleLowerCase().includes(q);
  if ([product.sku, product.furType, label(types, product.furType), ...category, ...places].some(has)) return true;
  return !!fields && searchTexts(product.customData, fields).some(has);
}

/** Il prodotto rientra nel filtro di stato (i prodotti nel cestino solo nel filtro Cestino). */
export function matchesFilter(product: Pick<Product, 'id' | 'status' | 'deletedAt'>, filter: InventoryFilter, alertedIds: ReadonlySet<string>): boolean {
  if (filter === 'trash') return !!product.deletedAt;
  if (product.deletedAt) return false;
  if (filter === 'available') return product.status === 'available';
  if (filter === 'sold') return product.status === 'sold';
  if (filter === 'alert') return alertedIds.has(product.id);
  return true;
}
