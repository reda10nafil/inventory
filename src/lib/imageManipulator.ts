// Fase 3: expo-image-manipulator -> react-native-image-resizer
let Resizer: any = null;
try { Resizer = require('react-native-image-resizer'); } catch {}

import * as ExpoManipulator from 'expo-image-manipulator';

export const SaveFormat = (ExpoManipulator as any).SaveFormat || { JPEG: 'JPEG', PNG: 'PNG' };

export async function manipulateAsync(uri: string, actions: any[], saveOptions?: any) {
  if (Resizer && Resizer.createResizedImage) {
    // Mappa actions resize width 600 -> Resizer
    let width = 600, height = 600;
    for (const a of actions) if (a.resize) { width = a.resize.width || width; height = a.resize.height || height; }
    const format = saveOptions?.format === SaveFormat.PNG ? 'PNG' : 'JPEG';
    const quality = (saveOptions?.compress ?? 1) * 100;
    const res = await Resizer.createResizedImage(uri, width, height, format, quality);
    return { uri: res.uri };
  }
  return (ExpoManipulator as any).manipulateAsync(uri, actions, saveOptions);
}
