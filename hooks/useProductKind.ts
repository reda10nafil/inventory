// Nomi del prodotto per le schermate (C1): categoria (la cartella, col nome completo) e tipo di pelle.
// Riga corta `line` per card ed elenchi, `full` per Scheda, PDF e testi condivisi; quello che manca si salta.
import { useCallback } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useFurTypes } from '../contexts/FurTypesContext';
import { productKind } from '../utils/categories';
import type { Product } from '../types';

export function useProductKind() {
  const { libraries } = useInventory();
  const { labelOf } = useFurTypes();
  return useCallback(
    (product: Pick<Product, 'libraryId' | 'furType'>) => productKind(product, libraries, labelOf),
    [libraries, labelOf],
  );
}
