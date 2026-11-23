// Scaffali per spazio (S1a, ticket 13). Contesto piccolo e separato come Fornitori e clienti, fuori dall'elenco di
// chiavi di InventoryContext; sta sopra InventoryProvider, che lo legge per tenere lo scaffale dei prodotti dentro
// la loro posizione (`keptShelfId`). Nei prodotti resta solo l'id dello scaffale (`shelfId`).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { newShelfId, parseShelves, productShelf, shelfData, type Shelf, type ShelfInput } from '../utils/shelves';
import type { Product } from '../types';

const STORAGE_KEY = 'furinventory_shelves';

interface ShelvesContextType {
  shelves: Shelf[];
  loading: boolean;
  /** Aggiunge uno scaffale (nome, posizione e codice vanno controllati prima) e lo restituisce. */
  addShelf: (data: ShelfInput) => Promise<Shelf>;
  /** Cambia nome, categoria, codice e tag; la posizione resta quella della creazione. */
  updateShelf: (id: string, data: Omit<ShelfInput, 'locationId'>) => Promise<void>;
  /** Elimina (chi chiama controlla prima che sia vuoto, `shelfDeleteError`). */
  deleteShelf: (id: string) => Promise<void>;
  /** Scaffale del prodotto se torna (pezzo unico, nella sua posizione), altrimenti undefined. */
  shelfOf: (product: Pick<Product, 'location' | 'stock' | 'shelfId'>) => Shelf | undefined;
}

const ShelvesContext = createContext<ShelvesContextType | undefined>(undefined);

export function ShelvesProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  // Elenco più recente: due modifiche di seguito non partono dalla stessa copia (come i contatti)
  const listRef = useRef(shelves);
  listRef.current = shelves;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        // Nessuna scrittura alla lettura: la chiave nasce al primo scaffale creato dall'utente
        if (alive) setShelves(parseShelves(stored));
      } catch (error) {
        console.error('Error loading shelves:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const commit = useCallback(async (next: Shelf[]) => {
    listRef.current = next;
    setShelves(next);
    try {
      if (organizationId) await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next));
    } catch (error) {
      console.error('Error saving shelves:', error);
    }
  }, [organizationId]);

  const addShelf = useCallback(async (data: ShelfInput) => {
    const shelf: Shelf = { id: newShelfId(listRef.current), ...shelfData(data), createdAt: new Date().toISOString() };
    await commit([...listRef.current, shelf]);
    return shelf;
  }, [commit]);

  const updateShelf = useCallback(async (id: string, data: Omit<ShelfInput, 'locationId'>) => {
    await commit(listRef.current.map((s) => (s.id === id
      ? { id, ...shelfData({ ...data, locationId: s.locationId }), ...(s.createdAt && { createdAt: s.createdAt }) }
      : s)));
  }, [commit]);

  const deleteShelf = useCallback(async (id: string) => {
    await commit(listRef.current.filter((s) => s.id !== id));
  }, [commit]);

  const shelfOf = useCallback((product: Pick<Product, 'location' | 'stock' | 'shelfId'>) => productShelf(product, shelves), [shelves]);

  const value = useMemo(
    () => ({ shelves, loading, addShelf, updateShelf, deleteShelf, shelfOf }),
    [shelves, loading, addShelf, updateShelf, deleteShelf, shelfOf],
  );

  return <ShelvesContext.Provider value={value}>{children}</ShelvesContext.Provider>;
}

export function useShelves() {
  const context = useContext(ShelvesContext);
  if (context === undefined) throw new Error('useShelves must be used within a ShelvesProvider');
  return context;
}
