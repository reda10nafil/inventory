// Opzioni di un campo a scelta (VAL, ticket 23): le sue (`fieldOptions`, id stabili) oppure la lista dell'app a cui è
// collegato (Posizioni, Categorie col nome completo, Tipi di pelle). Lo usano il disegnatore dei campi (`FieldInput`)
// e la Scheda, così Aggiungi, Modifica e lettura vedono le stesse opzioni.
import { useCallback } from 'react';
import { useLocations } from '../contexts/LocationsContext';
import { useInventory } from '../contexts/InventoryContext';
import { useFurTypes } from '../contexts/FurTypesContext';
import { categoryPath, categoryTree } from '../utils/categories';
import { choiceOptions, type FieldOption } from '../utils/fieldValues';
import type { CustomField } from '../types';

export function useFieldOptions(): (field: Pick<CustomField, 'options' | 'dataset' | 'linkTo'>) => FieldOption[] {
  const { locations } = useLocations();
  const { libraries } = useInventory();
  const { furTypes } = useFurTypes();
  return useCallback((field) => choiceOptions(field, {
    locations,
    categories: field.linkTo === 'libraries'
      ? categoryTree(libraries).map(({ category }) => ({ id: category.id, label: categoryPath(libraries, category.id) }))
      : [],
    furTypes,
  }), [locations, libraries, furTypes]);
}
