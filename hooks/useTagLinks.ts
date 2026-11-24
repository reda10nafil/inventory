// N1 (ticket 22, NG17, NG18): salva o toglie l'UID di un tag (`nfcTag`) di una posizione, uno scaffale o una categoria,
// come i campi di prima: nessuna chiave nuova, nessuna migrazione. Un prodotto non ha il tag salvato (il suo tag porta
// lo SKU). Per «Collega un tag», «Scrivi tag NFC» e il tag che passa da una cosa all'altra («sostituirlo?»).
import { useCallback } from 'react';
import { useInventory } from '../contexts/InventoryContext';
import { useLocations } from '../contexts/LocationsContext';
import { useShelves } from '../contexts/ShelvesContext';
import { useCodeReader } from './useCodeReader';
import type { CodeRef } from '../utils/codes';

export function useTagLinks() {
  const { updateLibrary } = useInventory();
  const { updateLocation } = useLocations();
  const { shelves, updateShelf } = useShelves();
  const { sources } = useCodeReader();

  /** `uid` = l'UID da salvare (formato «04:A2:3B:1C»); vuoto = tag tolto. */
  const saveTag = useCallback(async (ref: CodeRef, uid?: string) => {
    const nfcTag = uid || undefined;
    if (ref.kind === 'location') await updateLocation(ref.id, { nfcTag });
    else if (ref.kind === 'category') updateLibrary(ref.id, { nfcTag });
    else if (ref.kind === 'shelf') {
      const shelf = shelves.find((s) => s.id === ref.id);
      if (!shelf) return;
      // `updateShelf` riscrive lo scaffale con quello che `shelfData` conserva: si passa tutto il resto com'è (oggi nome,
      // categoria e codice; dopo l'unione con S2 anche misure e limiti, se il suo `shelfData` li tiene)
      const { id, createdAt: _created, locationId: _place, ...rest } = shelf;
      await updateShelf(id, { ...rest, nfcTag: nfcTag ?? '' });
    }
  }, [updateLocation, updateLibrary, shelves, updateShelf]);

  /** Il tag passa a `self` (se può averlo) e lo perde chi lo aveva (`clear`). */
  const moveTag = useCallback(async (self: CodeRef | undefined, uid: string | null, clear: readonly CodeRef[]) => {
    for (const ref of clear) await saveTag(ref, undefined);
    if (self && uid && self.kind !== 'product') await saveTag(self, uid);
  }, [saveTag]);

  return { sources, saveTag, moveTag };
}
