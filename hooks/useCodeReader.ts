// COD (ticket 22): il lettore unico (`utils/codes.ts`) con i dati dei contesti, per lo Scanner e le 5 automazioni.
// - `read(testo)`: che cosa è un codice; `readProduct` e `readPlace` per i passi che vogliono un prodotto o una
//   posizione (uno scaffale vale la sua posizione);
// - `choose`: chiede quale, quando lo stesso codice è di più cose (mai la prima a caso);
// - `name`, `isText`, `shelfNote`: i testi dei messaggi.
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { useAutomations } from '../contexts/AutomationsContext';
import {
  codeChoiceLabel, codeIsText, codeName, placeRead, productRead, resolveCode, shelfAsLocationText,
  type CodeRef, type CodeSources,
} from '../utils/codes';

export function useCodeReader() {
  const { products, libraries } = useInventory();
  const { locations } = useLocations();
  const { shelves } = useShelves();
  const { automations } = useAutomations();
  const sources: CodeSources = useMemo(
    () => ({ products, locations, categories: libraries, shelves, automations }),
    [products, locations, libraries, shelves, automations],
  );
  const read = useCallback((text: string) => resolveCode(text, sources), [sources]);
  const readProduct = useCallback((text: string) => productRead(resolveCode(text, sources)), [sources]);
  const readPlace = useCallback((text: string) => placeRead(resolveCode(text, sources), sources), [sources]);
  /** Una cosa scelta tra i candidati, letta come posizione. */
  const placeOf = useCallback((ref: CodeRef) => placeRead({ status: 'found', ...ref }, sources), [sources]);
  const name = useCallback((ref: CodeRef) => codeName(ref, sources), [sources]);
  const isText = useCallback((code: string, ref: CodeRef) => codeIsText(code, ref, sources), [sources]);
  /** Avviso per uno scaffale letto dove serve una posizione, oppure '' se `shelfId` manca. */
  const shelfNote = useCallback((shelfId?: string) => {
    const shelf = shelfId ? shelves.find((s) => s.id === shelfId) : undefined;
    return shelf ? shelfAsLocationText(shelf, sources) : '';
  }, [shelves, sources]);
  const choose = useCallback((candidates: CodeRef[], onPick: (ref: CodeRef) => void, onCancel?: () => void) => {
    Alert.alert('Codice usato da più cose', 'Lo stesso codice è salvato in più posti. Quale vuoi usare?', [
      ...candidates.map((ref) => ({ text: codeChoiceLabel(ref, sources), onPress: () => onPick(ref) })),
      { text: 'Annulla', style: 'cancel' as const, onPress: onCancel },
    ]);
  }, [sources]);
  return { sources, read, readProduct, readPlace, placeOf, choose, name, isText, shelfNote };
}
