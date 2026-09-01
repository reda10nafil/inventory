// Fase 3: expo-file-system/legacy -> react-native-fs
let RNFS: any = null;
try { RNFS = require('react-native-fs'); } catch {}

import * as ExpoFS from 'expo-file-system/legacy';

export const documentDirectory = RNFS ? RNFS.DocumentDirectoryPath + '/' : (ExpoFS as any).documentDirectory;

export async function writeAsStringAsync(uri: string, content: string, options?: any) {
  if (RNFS) {
    const path = uri.replace('file://', '');
    return RNFS.writeFile(path, content, 'utf8');
  }
  return (ExpoFS as any).writeAsStringAsync(uri, content, options);
}

export async function readAsStringAsync(uri: string, options?: any) {
  if (RNFS) {
    const path = uri.replace('file://', '');
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    return RNFS.readFile(path, encoding);
  }
  return (ExpoFS as any).readAsStringAsync(uri, options);
}

export const EncodingType = (ExpoFS as any).EncodingType || { Base64: 'base64', UTF8: 'utf8' };

export async function getInfoAsync(uri: string) {
  if (RNFS) {
    const path = uri.replace('file://', '');
    const exists = await RNFS.exists(path);
    return { exists };
  }
  return (ExpoFS as any).getInfoAsync?.(uri);
}
