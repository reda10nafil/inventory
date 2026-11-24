// S3 (ticket 15): il controllo del carico, uno solo per tutte le schermate (Aggiungi, Modifica, Movimenta, Azione
// rapida, Spostamento rapido, esecuzione delle automazioni; Conta, Audit e import solo per l'informazione).
// Il calcolo è in `utils/shelves.ts` (`checkLoadAt`, `checkPlaceCount`); qui i dati dei contesti, con la copia più
// recente dei prodotti (`latestProducts`): due letture nello stesso istante contano l'una l'altra.
import { useCallback } from 'react';
import type { Product } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { moveSources } from '../utils/inventoryOps';
import {
  checkLoadAt, checkPlaceCount, type LoadCheck, type LoadData, type LoadProduct, type LoadSource,
} from '../utils/shelves';

export type { LoadProduct, LoadSource };

export function useLoadCheck() {
  const { latestProducts, libraries } = useInventory();
  const { shelves } = useShelves();
  const { locations } = useLocations();
  const data = useCallback((): LoadData => ({ products: latestProducts(), shelves, categories: libraries, locations }), [latestProducts, shelves, libraries, locations]);

  /**
   * Controllo di un carico verso `to` (una posizione, o `posizione/idScaffale`) con la merce di `sources` (chiave di
   * partenza, assente per un carico, e quantità). Scaffale e posizione con capienza, vale il più grave; le proposte
   * ricontrollate col carico vero (`checkLoadAt`). `soloScaffale`: senza la posizione.
   */
  const check = useCallback((product: LoadProduct, to: string, sources: readonly LoadSource[], opts?: { soloScaffale?: boolean }): LoadCheck =>
    checkLoadAt(data(), product, to, sources, opts), [data]);

  /** Controllo di uno spostamento con `moveProduct` (Spostamento rapido, esecuzione, Azione rapida, Audit): la merce
   *  che parte (`moveSources`), anche per ricontrollare la proposta (dal posto proposto partirebbe altro). */
  const checkMove = useCallback((product: Product, to: string): LoadCheck =>
    checkLoadAt(data(), product, to, moveSources(product, to), { sourcesFor: (key) => moveSources(product, key) }), [data]);

  /** Capienza della posizione dopo una Conta (solo informazione). */
  const checkCount = useCallback((at: string, counted: Readonly<Record<string, number>>): LoadCheck => {
    const location = locations.find((l) => l.id === at);
    return location ? checkPlaceCount(location, latestProducts(), counted) : { level: 'ok', name: at, place: 'posizione', fill: null };
  }, [locations, latestProducts]);

  return { check, checkMove, checkCount };
}
