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

// BatteryMonitor — Fase 4: expo-battery -> react-native-device-info
import * as Battery from './src/lib/battery';

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
                      <RootNavigator />
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
