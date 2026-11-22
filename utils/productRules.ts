// Regole su cosa si può fare con un prodotto, usate dal contesto dell'inventario.
import type { Product } from '../types';

type P = Pick<Product, 'status' | 'deletedAt' | 'location'> | undefined;

/** Si vende solo un prodotto che esiste, non è nel cestino e non è già venduto (P05, P06). */
export const canSell = (product: P): boolean => !!product && !product.deletedAt && product.status !== 'sold';

/** Quanti prodotti usano una posizione, una cartella o una categoria, separando quelli nel cestino (P08, P09, M01). */
export function usage(
  products: readonly Pick<Product, 'location' | 'libraryId' | 'furType' | 'deletedAt'>[],
  where: { location: string } | { libraryId: string } | { furType: string },
): { active: number; trashed: number } {
  const uses = (p: Pick<Product, 'location' | 'libraryId' | 'furType'>) =>
    'location' in where ? p.location === where.location
      : 'libraryId' in where ? p.libraryId === where.libraryId
        : p.furType === where.furType;
  const used = products.filter(uses);
  const trashed = used.filter((p) => p.deletedAt).length;
  return { active: used.length - trashed, trashed };
}

/** Si sposta solo un prodotto che esiste, non è nel cestino e non è già in quella posizione. */
export const canMove = (product: P, to: string): boolean => !!product && !product.deletedAt && product.location !== to;
