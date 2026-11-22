// Ricerca e filtri dell'Inventario (C09).
// P14: la ricerca confrontava l'id della posizione («stand_a»), non il nome («Stand A»), e nei filtri
// Cestino e Attenzione veniva ignorata. P15: la pillola Attenzione contava gli avvisi, non i prodotti.
import type { Product } from '../types';
import { positionsOf } from './stock';

export type InventoryFilter = 'all' | 'available' | 'sold' | 'alert' | 'trash';

type Named = { id: string; label: string };

/** Il prodotto corrisponde alla ricerca: SKU, tipo (id o nome) o posizione (id o nome), maiuscole indifferenti.
 *  Per un articolo a quantità contano tutte le posizioni dove ha giacenza (M03). */
export function matchesSearch(
  product: Pick<Product, 'sku' | 'furType' | 'location' | 'stock'>,
  query: string,
  locations: readonly Named[],
  types: readonly Named[] = [],
): boolean {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return true;
  const label = (list: readonly Named[], id: string) => list.find((x) => x.id === id)?.label ?? '';
  const places = positionsOf(product).flatMap((id) => [id, label(locations, id)]);
  return [product.sku, product.furType, label(types, product.furType), ...places]
    .some((text) => String(text || '').toLocaleLowerCase().includes(q));
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
