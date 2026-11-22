// FurInventory Pro - Root App (ejected from expo-router)
// Estratto da app/_layout.tsx:1 — mantiene identici provider + BatteryMonitor + theme
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
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
import { AuthProvider, LOGIN_ENABLED, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthScreen from './src/screens/AuthScreen';

// BatteryMonitor — Fase 4: expo-battery -> react-native-device-info
import * as Battery from './src/lib/battery';
import { Text } from './components/ui/Text';
import { makeStyles, useTheme } from './contexts/ThemeContext';
import type { AppTheme } from './constants/themes';

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

// Tema di React Navigation costruito dallo stile attivo: intestazioni native, fondo delle schermate, barra.
function navigationTheme(t: AppTheme): NavigationTheme {
  return {
    dark: t.dark,
    colors: {
      primary: t.colors.accent,
      background: t.colors.background,
      card: t.colors.backgroundSecondary,
      text: t.colors.textPrimary,
      border: t.colors.border,
      notification: t.colors.notification,
    },
    fonts: DefaultTheme.fonts,
  };
}

function SignedInApp() {
  const { session, organizationId, loading, authError, signOut } = useAuth();
  const t = useTheme();
  const styles = useStyles();
  const navTheme = React.useMemo(() => navigationTheme(t), [t]);

  if (loading || (session && !organizationId && !authError)) {
    return <View style={styles.center}><ActivityIndicator color={t.colors.accent} /><Text style={styles.loadingText}>Caricamento spazio di lavoro…</Text></View>;
  }
  if (!session && LOGIN_ENABLED) return <AuthScreen />;
  if (!organizationId) return <View style={styles.center}>
    <Text style={styles.loadingText}>{authError || 'Impossibile aprire lo spazio di lavoro.'}</Text>
    <Pressable onPress={() => void signOut()}><Text style={styles.signOut}>Esci e riprova</Text></Pressable>
  </View>;

  return (
    <AutomationsProvider key={organizationId}>
      <LocationsProvider>
        <CustomFieldsProvider>
          <LayoutProvider>
            <HardwareConfigProvider>
              <GS1ConfigProvider>
                <InventoryProvider>
                  <BatteryMonitor />
                  <NavigationContainer linking={linking as any} fallback={null} theme={navTheme}>
                    <RootNavigator />
                  </NavigationContainer>
                </InventoryProvider>
              </GS1ConfigProvider>
            </HardwareConfigProvider>
          </LayoutProvider>
        </CustomFieldsProvider>
      </LocationsProvider>
    </AutomationsProvider>
  );
}

export default function App() {
  return <SafeAreaProvider><ThemeProvider><AuthProvider><SignedInApp /></AuthProvider></ThemeProvider></SafeAreaProvider>;
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: t.colors.background },
  loadingText: { color: '#D4D4D8', marginTop: 12, textAlign: 'center' },
  signOut: { color: t.colors.accentInk, marginTop: 20, fontWeight: '600' },
}));
