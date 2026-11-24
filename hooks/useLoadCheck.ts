// S3 (ticket 15): il controllo del carico, uno solo per tutte le schermate (Aggiungi, Modifica, Movimenta, Azione
// rapida, Spostamento rapido, esecuzione delle automazioni; Conta, Audit e import solo per l'informazione).
// Il calcolo è in `utils/shelves.ts` (`checkShelfLoad`, `checkPlaceLoad`, `checkPlaceCount`); qui i dati dei contesti,
// con la copia più recente dei prodotti (`latestProducts`): due letture nello stesso istante contano l'una l'altra.
import { useCallback } from 'react';
import type { Product } from '../types';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { moveSources } from '../utils/inventoryOps';
import {
  checkPlaceCount, checkPlaceLoad, checkShelfLoad, placeWithShelf, type Incoming, type LoadCheck,
} from '../utils/shelves';
import { placeOfKey, qtyAt, round3, splitStockKey } from '../utils/stock';

/** Da dove arriva la merce: la chiave di partenza (assente per un carico) e la quantità. */
export type LoadSource = { from?: string; qty: number };
/** Il prodotto che arriva: salvato (con `id`) o nuovo (Aggiungi), con misure, unità e categoria. */
export type LoadProduct = Incoming['product'] & Partial<Pick<Product, 'id'>>;

const RANK = { ok: 0, avviso: 1, blocco: 2 } as const;

export function useLoadCheck() {
  const { latestProducts, libraries } = useInventory();
  const { shelves } = useShelves();
  const { locations } = useLocations();

  /**
   * Controllo di un carico verso `to` (una posizione, o `posizione/idScaffale`). Su uno scaffale il controllo dello
   * scaffale; se la posizione ha una capienza, anche quello della posizione (con la merce che arriva da fuori): vale il
   * più grave. Nulla in arrivo, scaffale sconosciuto o posizione senza limiti: ok.
   */
  const check = useCallback((product: LoadProduct, to: string, sources: readonly LoadSource[]): LoadCheck => {
    const list = latestProducts();
    const saved = product.id ? list.find((p) => p.id === product.id) : undefined;
    const { place, shelfId } = splitStockKey(to);
    const location = locations.find((l) => l.id === place);
    const shelf = shelfId ? shelves.find((s) => s.id === shelfId && s.locationId === place) : undefined;
    const results: LoadCheck[] = [];
    const total = (filter: (s: LoadSource) => boolean) => round3(sources.filter(filter).reduce((a, s) => a + (s.qty > 0 ? s.qty : 0), 0));
    if (shelf) {
      const add = total((s) => s.from !== to);
      if (add > 0) {
        results.push(checkShelfLoad(shelf, list, { product, before: saved ? qtyAt(saved, to) : 0, add }, { shelves, categories: libraries }));
      }
    }
    if (location?.capacity) {
      const add = total((s) => !s.from || placeOfKey(s.from) !== place);
      if (add > 0) {
        results.push(checkPlaceLoad(location, list, { product, before: saved ? qtyAt(saved, place) : 0, add }, locations));
      }
    }
    if (!results.length) {
      const name = shelf ? shelf.name : location?.label ?? place;
      return { level: 'ok', name, place: shelf ? 'scaffale' : 'posizione', fill: null };
    }
    return results.reduce((a, b) => (RANK[b.level] > RANK[a.level] ? b : a));
  }, [latestProducts, libraries, shelves, locations]);

  /** Controllo di uno spostamento con `moveProduct` (Spostamento rapido, esecuzione, Azione rapida, Audit). */
  const checkMove = useCallback((product: Product, to: string): LoadCheck => check(product, to, moveSources(product, to)), [check]);

  /** Capienza della posizione dopo una Conta (solo informazione). */
  const checkCount = useCallback((at: string, counted: Readonly<Record<string, number>>): LoadCheck => {
    const location = locations.find((l) => l.id === at);
    return location ? checkPlaceCount(location, latestProducts(), counted) : { level: 'ok', name: at, place: 'posizione', fill: null };
  }, [locations, latestProducts]);

  /** Nome di una chiave per i testi: «Magazzino», «Magazzino › A1». */
  const keyLabel = useCallback((key: string): string => {
    const { place, shelfId } = splitStockKey(key);
    const label = locations.find((l) => l.id === place)?.label ?? place;
    const shelf = shelfId ? shelves.find((s) => s.id === shelfId) : undefined;
    return placeWithShelf(label, shelf);
  }, [locations, shelves]);

  return { check, checkMove, checkCount, keyLabel };
}
