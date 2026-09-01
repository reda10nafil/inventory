// Fase 3: expo-document-picker -> react-native-document-picker
let RNDocumentPicker: any = null;
let types: any = null;
try {
  const mod = require('react-native-document-picker');
  RNDocumentPicker = mod.default || mod;
  types = mod.types;
} catch {}

import * as ExpoDocumentPicker from 'expo-document-picker';

export async function getDocumentAsync(options?: any) {
  if (RNDocumentPicker && RNDocumentPicker.pick) {
    try {
      const res = await RNDocumentPicker.pick({ type: types ? [types.images, types.pdf] : undefined });
      const file = Array.isArray(res) ? res[0] : res;
      return { canceled: false, assets: [{ uri: file.uri, name: file.name, mimeType: file.type }] };
    } catch (e: any) {
      if (e?.code === 'DOCUMENT_PICKED_CANCEL') return { canceled: true, assets: [] };
      throw e;
    }
  }
  return (ExpoDocumentPicker as any).getDocumentAsync(options);
}
