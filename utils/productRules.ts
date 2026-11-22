// Regole su cosa si può fare con un prodotto, usate dal contesto dell'inventario.
import type { Product } from '../types';

type P = Pick<Product, 'status' | 'deletedAt' | 'location'> | undefined;

/** Si vende solo un prodotto che esiste, non è nel cestino e non è già venduto (P05, P06). */
export const canSell = (product: P): boolean => !!product && !product.deletedAt && product.status !== 'sold';

/** Si sposta solo un prodotto che esiste, non è nel cestino e non è già in quella posizione. */
export const canMove = (product: P, to: string): boolean => !!product && !product.deletedAt && product.location !== to;
