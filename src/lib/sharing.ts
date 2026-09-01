// Fase 3: expo-sharing -> react-native-share
let Share: any = null;
try { Share = require('react-native-share').default; } catch {}

import * as ExpoSharing from 'expo-sharing';

export async function shareAsync(uri: string, options?: any) {
  if (Share && Share.open) {
    return Share.open({ url: uri, type: options?.mimeType || 'application/pdf' });
  }
  return (ExpoSharing as any).shareAsync(uri, options);
}
export async function isAvailableAsync() {
  if (Share) return true;
  return (ExpoSharing as any).isAvailableAsync?.();
}
