// Regole su cosa si può fare con un prodotto, usate dal contesto dell'inventario.
import type { Product } from '../types';

type P = Pick<Product, 'status' | 'deletedAt' | 'location'> | undefined;

/** Si vende solo un prodotto che esiste, non è nel cestino e non è già venduto (P05, P06). */
export const canSell = (product: P): boolean => !!product && !product.deletedAt && product.status !== 'sold';

/** Quanti prodotti usano una posizione o una cartella, separando quelli nel cestino (P08, P09). */
export function usage(
  products: readonly Pick<Product, 'location' | 'libraryId' | 'deletedAt'>[],
  where: { location: string } | { libraryId: string },
): { active: number; trashed: number } {
  const uses = (p: Pick<Product, 'location' | 'libraryId'>) =>
    'location' in where ? p.location === where.location : p.libraryId === where.libraryId;
  const used = products.filter(uses);
  const trashed = used.filter((p) => p.deletedAt).length;
  return { active: used.length - trashed, trashed };
}

/** Si sposta solo un prodotto che esiste, non è nel cestino e non è già in quella posizione. */
export const canMove = (product: P, to: string): boolean => !!product && !product.deletedAt && product.location !== to;
