// Regole su cosa si può fare con un prodotto, usate dal contesto dell'inventario.
import type { Product } from '../types';
import { positionsOf } from './stock';

type P = Pick<Product, 'status' | 'deletedAt' | 'location'> | undefined;

/** Si vende solo un prodotto che esiste, non è nel cestino e non è già venduto (P05, P06). */
export const canSell = (product: P): boolean => !!product && !product.deletedAt && product.status !== 'sold';

/** Quanti prodotti usano una posizione, una cartella o una categoria, separando quelli nel cestino (P08, P09, M01).
 *  Una posizione è usata se è la principale del prodotto o se ci ha giacenza (M03). */
export function usage(
  products: readonly Pick<Product, 'location' | 'libraryId' | 'furType' | 'deletedAt' | 'stock'>[],
  where: { location: string } | { libraryId: string } | { furType: string },
): { active: number; trashed: number } {
  const uses = (p: Pick<Product, 'location' | 'libraryId' | 'furType' | 'stock'>) =>
    'location' in where ? positionsOf(p).includes(where.location)
      : 'libraryId' in where ? p.libraryId === where.libraryId
        : p.furType === where.furType;
  const used = products.filter(uses);
  const trashed = used.filter((p) => p.deletedAt).length;
  return { active: used.length - trashed, trashed };
}

/** Si sposta solo un prodotto che esiste, non è nel cestino e non è già in quella posizione. */
export const canMove = (product: P, to: string): boolean => !!product && !product.deletedAt && product.location !== to;
