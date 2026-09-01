// Compat layer expo-router → React Navigation per Fase 2
// Permette a src/screens/* di mantenere router.push/back/replace e useLocalSearchParams senza modifiche massicce
import { useNavigation, useRoute } from '@react-navigation/native';

type Href = string | { pathname: string; params?: Record<string, any> };

function parseHref(href: Href): { name: string; params?: any } {
  if (typeof href === 'string') {
    // Gestore casi comuni: /product/xxx, /(tabs), /scanner, /settings/xxx, /automations/xxx, /scanner-action, /+not-found
    if (href.startsWith('/product/edit/')) {
      return { name: 'ProductEdit', params: { id: href.replace('/product/edit/', '').split('?')[0] } };
    }
    if (href.startsWith('/product/')) {
      const id = href.split('/product/')[1].split('?')[0];
      return { name: 'ProductDetail', params: { id } };
    }
    if (href === '/' || href === '/(tabs)' || href.startsWith('/(tabs)')) {
      return { name: '(tabs)' };
    }
    if (href.startsWith('/scanner-action')) {
      // /scanner-action con query? gestito via params
      return { name: 'ScannerAction' };
    }
    if (href === '/scanner') return { name: 'Scanner' };
    if (href.startsWith('/settings/')) {
      const map: Record<string,string> = {
        '/settings/locations': 'SettingsLocations',
        '/settings/fields': 'SettingsFields',
        '/settings/folders': 'SettingsFolders',
        '/settings/layout-builder': 'SettingsLayoutBuilder',
        '/settings/gs1-config': 'SettingsGs1',
        '/settings/hardware': 'SettingsHardware',
        '/settings/trash': 'SettingsTrash',
        '/settings/share': 'SettingsShare',
        '/settings/sector-templates': 'SettingsSector',
        '/settings/automation-builder': 'SettingsAutomationBuilder',
      };
      return { name: map[href.split('?')[0]] || href };
    }
    if (href.startsWith('/automations/')) {
      const map: Record<string,string> = {
        '/automations/automation-flow': 'AutomationFlow',
        '/automations/custom-runner': 'CustomRunner',
        '/automations/audit': 'Audit',
        '/automations/batch-move': 'BatchMove',
        '/automations/scan-sell': 'ScanSell',
        '/automations/quick-tag': 'QuickTag',
      };
      const base = href.split('?')[0];
      return { name: map[base] || base };
    }
    // fallback tabs
    if (href.startsWith('/?library=')) return { name: '(tabs)', params: { library: href.split('=')[1] } };
    return { name: href as any };
  } else {
    const { pathname, params } = href;
    const parsed = parseHref(pathname as any);
    return { name: parsed.name, params: { ...parsed.params, ...params } };
  }
}

export function useRouter() {
  const navigation: any = useNavigation();
  return {
    push: (href: Href) => {
      const { name, params } = parseHref(href as any);
      navigation.navigate(name, params);
    },
    replace: (href: Href) => {
      const { name, params } = parseHref(href as any);
      // @ts-ignore
      if (navigation.replace) navigation.replace(name, params);
      else navigation.navigate(name, params);
    },
    back: () => navigation.goBack(),
    // @ts-ignore per compatibilità as any in 11 file
    pushAsAny: (href: any) => navigation.navigate(href),
  };
}

export function useLocalSearchParams<T = any>(): T {
  const route: any = useRoute();
  return (route.params || {}) as T;
}

// Re-export per compat Stack/Tabs se necessario (non usato in src/screens)
export const Stack = () => null;
export const Tabs = () => null;
