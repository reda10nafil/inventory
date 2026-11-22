// FurInventory Pro - Root App (ejected from expo-router)
// Estratto da app/_layout.tsx:1 — mantiene identici provider + BatteryMonitor + theme
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { InventoryProvider } from './contexts/InventoryContext';
import { LocationsProvider } from './contexts/LocationsContext';
import { CategoriesProvider } from './contexts/CategoriesContext';
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
import { Text, fontStyle } from './components/ui/Text';
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
    fonts: t.font.family
      ? {
          regular: fontStyle(t, '400') as NavigationTheme['fonts']['regular'],
          medium: fontStyle(t, '500') as NavigationTheme['fonts']['medium'],
          bold: fontStyle(t, '600') as NavigationTheme['fonts']['bold'],
          heavy: fontStyle(t, '700') as NavigationTheme['fonts']['heavy'],
        }
      : DefaultTheme.fonts,
  };
}

// Barre del sistema e fondo della pagina web secondo lo stile (chiaro o scuro). Con edge-to-edge su Android la
// barra di navigazione è trasparente: si cambia solo il colore dei pulsanti. Non provato su un telefono.
function SystemBars() {
  const t = useTheme();
  useEffect(() => {
    if (Platform.OS === 'android') {
      try { NavigationBar.setStyle(t.dark ? 'dark' : 'light'); } catch {}
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = t.colors.background;
      // anche gli elementi HTML scritti a mano (zona di trascinamento del CSV) usano il carattere dello stile
      document.body.style.fontFamily = fontStyle(t).fontFamily ?? 'system-ui, sans-serif';
    }
  }, [t]);
  return <StatusBar style={t.dark ? 'light' : 'dark'} />;
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
        <CategoriesProvider>
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
        </CategoriesProvider>
      </LocationsProvider>
    </AutomationsProvider>
  );
}

export default function App() {
  return <SafeAreaProvider><ThemeProvider><SystemBars /><AuthProvider><SignedInApp /></AuthProvider></ThemeProvider></SafeAreaProvider>;
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: t.colors.background },
  loadingText: { color: t.colors.textSecondary, marginTop: 12, textAlign: 'center' },
  signOut: { color: t.colors.accentInk, marginTop: 20, fontWeight: '600' },
}));
