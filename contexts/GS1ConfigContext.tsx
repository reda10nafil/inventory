// FurInventory Pro - GS1 Digital Link Configuration Context
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GS1Config, DEFAULT_GS1_CONFIG } from '../utils/gs1';

const STORAGE_KEY = 'furinventory_gs1_config';

interface GS1ConfigContextType {
  gs1Config: GS1Config;
  loading: boolean;
  updateGS1Config: (updates: Partial<GS1Config>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const GS1ConfigContext = createContext<GS1ConfigContextType | undefined>(undefined);

export function GS1ConfigProvider({ children }: { children: ReactNode }) {
  const [gs1Config, setGS1Config] = useState<GS1Config>(DEFAULT_GS1_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields added in updates
        setGS1Config({ ...DEFAULT_GS1_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading GS1 config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (config: GS1Config) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving GS1 config:', error);
    }
  };

  const updateGS1Config = useCallback(async (updates: Partial<GS1Config>) => {
    const newConfig = { ...gs1Config, ...updates };
    setGS1Config(newConfig);
    await saveConfig(newConfig);
  }, [gs1Config]);

  const resetToDefaults = useCallback(async () => {
    setGS1Config(DEFAULT_GS1_CONFIG);
    await saveConfig(DEFAULT_GS1_CONFIG);
  }, []);

  return (
    <GS1ConfigContext.Provider value={{ gs1Config, loading, updateGS1Config, resetToDefaults }}>
      {children}
    </GS1ConfigContext.Provider>
  );
}

export function useGS1Config() {
  const context = useContext(GS1ConfigContext);
  if (context === undefined) {
    throw new Error('useGS1Config must be used within a GS1ConfigProvider');
  }
  return context;
}
