// Nome di una chiave della giacenza (S1b, ticket 13) per tutte le schermate: «Magazzino» oppure «Magazzino › A1»,
// con «scaffale sconosciuto» per uno scaffale che questo dispositivo non conosce; una posizione che non c'è più resta
// col suo id, come prima. Scheda, Modifica, Cronologia, Fornitori e clienti, Azione rapida, Movimenta e report.
import { useCallback } from 'react';
import { useLocations } from '../contexts/LocationsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { stockPlaceLabel } from '../utils/shelves';

export function usePlaceLabel(): (key: string) => string {
  const { locations } = useLocations();
  const { shelves } = useShelves();
  return useCallback(
    (key: string) => stockPlaceLabel(key, (id) => locations.find((l) => l.id === id)?.label ?? id, shelves),
    [locations, shelves],
  );
}
