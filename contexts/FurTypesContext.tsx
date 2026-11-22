// Tipi di pelle per spazio (M01, ticket 04; C1, ticket 19). Contesto piccolo e separato come Posizioni, fuori
// dall'elenco di chiavi di InventoryContext. Il prodotto salva l'id del tipo in `furType` (facoltativo da C1).
// In M01 si chiamava CategoriesContext: la chiave salvata resta `furinventory_categories:{org}`, nessuna migrazione.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { FurType, DEFAULT_FUR_TYPES, furTypeIdFor, furTypeLabel, parseFurTypes } from '../utils/furTypes';

const STORAGE_KEY = 'furinventory_categories';

interface FurTypesContextType {
  furTypes: FurType[];
  loading: boolean;
  /** Aggiunge un tipo (il nome va controllato prima con `furTypeNameError`) e lo restituisce. */
  addFurType: (label: string) => Promise<FurType>;
  /** Cambia solo il nome: l'id salvato sui prodotti resta lo stesso. */
  renameFurType: (id: string, label: string) => Promise<void>;
  deleteFurType: (id: string) => Promise<void>;
  /** Nome da mostrare per l'id di un prodotto (l'id stesso se il tipo non c'è più, '' se il prodotto non ne ha). */
  labelOf: (id: string | undefined) => string;
}

const FurTypesContext = createContext<FurTypesContextType | undefined>(undefined);

export function FurTypesProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [furTypes, setFurTypes] = useState<FurType[]>(() => [...DEFAULT_FUR_TYPES]);
  const [loading, setLoading] = useState(true);
  // Elenco più recente: due modifiche di seguito non partono dalla stessa copia (come i campi, D12)
  const listRef = useRef(furTypes);
  listRef.current = furTypes;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        // Nessuna scrittura alla lettura: la chiave nasce alla prima modifica dell'utente
        if (alive) setFurTypes(parseFurTypes(stored));
      } catch (error) {
        console.error('Error loading fur types:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const commit = useCallback(async (next: FurType[]) => {
    listRef.current = next;
    setFurTypes(next);
    try {
      if (organizationId) await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next));
    } catch (error) {
      console.error('Error saving fur types:', error);
    }
  }, [organizationId]);

  const addFurType = useCallback(async (label: string) => {
    const furType = { id: furTypeIdFor(label, listRef.current), label: label.trim() };
    await commit([...listRef.current, furType]);
    return furType;
  }, [commit]);

  const renameFurType = useCallback(async (id: string, label: string) => {
    await commit(listRef.current.map((c) => (c.id === id ? { ...c, label: label.trim() } : c)));
  }, [commit]);

  const deleteFurType = useCallback(async (id: string) => {
    await commit(listRef.current.filter((c) => c.id !== id));
  }, [commit]);

  const labelOf = useCallback((id: string | undefined) => furTypeLabel(furTypes, id), [furTypes]);

  const value = useMemo(
    () => ({ furTypes, loading, addFurType, renameFurType, deleteFurType, labelOf }),
    [furTypes, loading, addFurType, renameFurType, deleteFurType, labelOf],
  );

  return <FurTypesContext.Provider value={value}>{children}</FurTypesContext.Provider>;
}

export function useFurTypes() {
  const context = useContext(FurTypesContext);
  if (context === undefined) throw new Error('useFurTypes must be used within a FurTypesProvider');
  return context;
}
