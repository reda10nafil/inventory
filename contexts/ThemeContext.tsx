import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isStyleId, oggi, themeFor } from '../constants/themes';
import type { AppTheme, StyleId } from '../constants/themes';

// Stile attivo dell'app (Impostazioni › Aspetto). La scelta è del dispositivo: chiave fuori dallo spazio di
// lavoro (`inventory:v1:<org>:…`), quindi non entra in esportazione, importazione né sincronizzazione.
export const STYLE_STORAGE_KEY = '@syncro/stile';

interface ThemeContextValue {
  theme: AppTheme;
  /** Stile scelto dall'utente; `null` = non ha ancora scelto (vale il predefinito). */
  styleId: StyleId | null;
  setStyle: (id: StyleId) => void;
}

// Fuori dal fornitore (jest, componenti isolati) vale il tema `oggi`.
const ThemeContext = createContext<ThemeContextValue>({ theme: oggi, styleId: null, setStyle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [styleId, setStyleId] = useState<StyleId | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STYLE_STORAGE_KEY)
      .then((value) => { if (alive && isStyleId(value)) setStyleId(value); })
      .catch(() => {})
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  const setStyle = useCallback((id: StyleId) => {
    setStyleId(id);
    AsyncStorage.setItem(STYLE_STORAGE_KEY, id).catch(() => {});
  }, []);

  const value = useMemo(() => ({ theme: themeFor(styleId), styleId, setStyle }), [styleId, setStyle]);

  // Finché la scelta non è letta non si disegna nulla, così non si vede lo stile sbagliato per un istante.
  if (!ready) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Tema attivo, per i valori usati fuori dagli stili (`color={t.colors.accent}`). */
export function useTheme(): AppTheme {
  return useContext(ThemeContext).theme;
}

/** Stile scelto e funzione per cambiarlo (selettore in Impostazioni). */
export function useStyleChoice() {
  const { styleId, setStyle, theme } = useContext(ThemeContext);
  return { styleId, activeId: theme.id, setStyle };
}

/**
 * Stili come funzione del tema: `const useStyles = makeStyles((t) => ({ … }))` a livello di modulo,
 * poi `const styles = useStyles()` in ogni componente. Il foglio si crea una volta per tema.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (t: AppTheme) => T) {
  const cache = new WeakMap<AppTheme, T>();
  return function useStyles(): T {
    const t = useTheme();
    let sheet = cache.get(t);
    if (!sheet) {
      sheet = StyleSheet.create(factory(t) as T & StyleSheet.NamedStyles<any>);
      cache.set(t, sheet);
    }
    return sheet;
  };
}
