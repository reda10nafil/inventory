// FurInventory Pro - Root App (ejected from expo-router)
// Estratto da app/_layout.tsx:1 — mantiene identici provider + BatteryMonitor + theme
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { InventoryProvider } from './contexts/InventoryContext';
import { LocationsProvider } from './contexts/LocationsContext';
import { CustomFieldsProvider } from './contexts/CustomFieldsContext';
import { LayoutProvider } from './contexts/LayoutContext';
import { AutomationsProvider } from './contexts/AutomationsContext';
import { GS1ConfigProvider } from './contexts/GS1ConfigContext';
import { HardwareConfigProvider } from './contexts/HardwareConfigContext';
import { soundService } from './services/SoundService';
import RootNavigator from './src/navigation/RootNavigator';
import { linking } from './src/navigation/linking';

// BatteryMonitor — identico a app/_layout.tsx:15, sostituito expo-battery con device-info in Fase 4
// Per Fase 1 mantiamo expo-battery se presente, altrimenti fallback no-op via try import
let Battery: any = null;
try {
  Battery = require('expo-battery');
} catch {}

function BatteryMonitor() {
  const [lastAlertTime, setLastAlertTime] = useState(0);

  useEffect(() => {
    let interval: number;

    const checkBattery = async () => {
      try {
        if (!Battery) return;
        const level = await Battery.getBatteryLevelAsync();
        const state = await Battery.getBatteryStateAsync();
        if (level > 0 && level < 0.15 && state !== Battery.BatteryState.CHARGING) {
          const now = Date.now();
          if (now - lastAlertTime > 60000) {
            soundService.playBatteryLow();
            setLastAlertTime(now);
          }
        }
      } catch (err) {}
    };

    checkBattery();
    // @ts-ignore setInterval returns NodeJS.Timeout in TS but number in RN
    interval = setInterval(checkBattery, 15000) as unknown as number;
    return () => clearInterval(interval);
  }, [lastAlertTime]);

  return null;
}

export default function App() {
  // Fase 1: wrapping NavigationContainer con linking syncroflow://
  // Fase 2: RootNavigator conterrà lo Stack migrato da expo-router
  // Fallback temporaneo se RootNavigator non esiste ancora (Fase 1) → renderizza null con provider
  const Nav = (() => {
    try {
      return <RootNavigator />;
    } catch {
      return null;
    }
  })();

  return (
    <SafeAreaProvider>
      <AutomationsProvider>
        <LocationsProvider>
          <CustomFieldsProvider>
            <LayoutProvider>
              <HardwareConfigProvider>
                <GS1ConfigProvider>
                  <InventoryProvider>
                    <BatteryMonitor />
                    <NavigationContainer linking={linking as any} fallback={null}>
                      {Nav}
                    </NavigationContainer>
                  </InventoryProvider>
                </GS1ConfigProvider>
              </HardwareConfigProvider>
            </LayoutProvider>
          </CustomFieldsProvider>
        </LocationsProvider>
      </AutomationsProvider>
    </SafeAreaProvider>
  );
}
