// FurInventory Pro - Hardware Config Context
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'furinventory_hardware_config';

export type ScanMode = 'nfc_only' | 'qr_only' | 'both';

export interface HardwareConfig {
  scanMode: ScanMode;
  autoWriteNfcOnSave: boolean;
}

const DEFAULT_HARDWARE_CONFIG: HardwareConfig = {
  scanMode: 'both',
  autoWriteNfcOnSave: false,
};

interface HardwareConfigContextType {
  hwConfig: HardwareConfig;
  loading: boolean;
  updateHwConfig: (updates: Partial<HardwareConfig>) => Promise<void>;
  resetHwConfig: () => Promise<void>;
}

const HardwareConfigContext = createContext<HardwareConfigContextType | undefined>(undefined);

export function HardwareConfigProvider({ children }: { children: ReactNode }) {
  const [hwConfig, setHwConfig] = useState<HardwareConfig>(DEFAULT_HARDWARE_CONFIG);
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
        setHwConfig({ ...DEFAULT_HARDWARE_CONFIG, ...parsed });
      }
    } catch (error) {
      console.error('Error loading Hardware config:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (config: HardwareConfig) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving Hardware config:', error);
    }
  };

  const updateHwConfig = useCallback(async (updates: Partial<HardwareConfig>) => {
    const newConfig = { ...hwConfig, ...updates };
    setHwConfig(newConfig);
    await saveConfig(newConfig);
  }, [hwConfig]);

  const resetHwConfig = useCallback(async () => {
    setHwConfig(DEFAULT_HARDWARE_CONFIG);
    await saveConfig(DEFAULT_HARDWARE_CONFIG);
  }, []);

  return (
    <HardwareConfigContext.Provider value={{ hwConfig, loading, updateHwConfig, resetHwConfig }}>
      {children}
    </HardwareConfigContext.Provider>
  );
}

export function useHardwareConfig() {
  const context = useContext(HardwareConfigContext);
  if (context === undefined) {
    throw new Error('useHardwareConfig must be used within a HardwareConfigProvider');
  }
  return context;
}
