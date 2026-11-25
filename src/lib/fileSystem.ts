// Fase 3: expo-file-system/legacy -> react-native-fs
let RNFS: any = null;
try { RNFS = require('react-native-fs'); } catch {}

import * as ExpoFS from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export const documentDirectory = RNFS ? RNFS.DocumentDirectoryPath + '/' : (ExpoFS as any).documentDirectory;

export async function writeAsStringAsync(uri: string, content: string, options?: any) {
  if (RNFS) {
    const path = uri.replace('file://', '');
    // EXP (DATI): lo ZIP di «Esporta con le foto» si scrive in base64
    return RNFS.writeFile(path, content, options?.encoding === 'base64' ? 'base64' : 'utf8');
  }
  return (ExpoFS as any).writeAsStringAsync(uri, content, options);
}

// Sul web expo-file-system non legge i file: quelli scelti dall'utente hanno un indirizzo blob: o data:,
// che il browser legge da sé (P18: «Importa prodotti CSV» col pulsante falliva).
async function readOnWeb(uri: string, base64: boolean): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  if (!base64) return blob.text();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export async function readAsStringAsync(uri: string, options?: any) {
  if (Platform.OS === 'web') return readOnWeb(uri, options?.encoding === 'base64' || options?.encoding === EncodingType.Base64);
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
