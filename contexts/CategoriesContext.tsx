// Categorie dei prodotti per spazio (M01, ticket 04). Contesto piccolo e separato come Posizioni, fuori
// dall'elenco di chiavi di InventoryContext. Il prodotto salva l'id della categoria in `furType`.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Category, DEFAULT_CATEGORIES, categoryIdFor, categoryLabel, parseCategories } from '../utils/categories';

const STORAGE_KEY = 'furinventory_categories';

interface CategoriesContextType {
  categories: Category[];
  loading: boolean;
  /** Aggiunge una categoria (il nome va controllato prima con `categoryNameError`) e la restituisce. */
  addCategory: (label: string) => Promise<Category>;
  /** Cambia solo il nome: l'id salvato sui prodotti resta lo stesso. */
  renameCategory: (id: string, label: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  /** Nome da mostrare per l'id di un prodotto (l'id stesso se la categoria non c'è più). */
  labelOf: (id: string | undefined) => string;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { organizationId } = useAuth();
  const [categories, setCategories] = useState<Category[]>(() => [...DEFAULT_CATEGORIES]);
  const [loading, setLoading] = useState(true);
  // Elenco più recente: due modifiche di seguito non partono dalla stessa copia (come i campi, D12)
  const listRef = useRef(categories);
  listRef.current = categories;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const stored = organizationId ? await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`) : null;
        // Nessuna scrittura alla lettura: la chiave nasce alla prima modifica dell'utente
        if (alive) setCategories(parseCategories(stored));
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [organizationId]);

  const commit = useCallback(async (next: Category[]) => {
    listRef.current = next;
    setCategories(next);
    try {
      if (organizationId) await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next));
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  }, [organizationId]);

  const addCategory = useCallback(async (label: string) => {
    const category = { id: categoryIdFor(label, listRef.current), label: label.trim() };
    await commit([...listRef.current, category]);
    return category;
  }, [commit]);

  const renameCategory = useCallback(async (id: string, label: string) => {
    await commit(listRef.current.map((c) => (c.id === id ? { ...c, label: label.trim() } : c)));
  }, [commit]);

  const deleteCategory = useCallback(async (id: string) => {
    await commit(listRef.current.filter((c) => c.id !== id));
  }, [commit]);

  const labelOf = useCallback((id: string | undefined) => categoryLabel(categories, id), [categories]);

  const value = useMemo(
    () => ({ categories, loading, addCategory, renameCategory, deleteCategory, labelOf }),
    [categories, loading, addCategory, renameCategory, deleteCategory, labelOf],
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) throw new Error('useCategories must be used within a CategoriesProvider');
  return context;
}
