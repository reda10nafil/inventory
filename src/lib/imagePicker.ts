// Fase 3: expo-image-picker -> react-native-image-picker
let RNImagePicker: any = null;
try { RNImagePicker = require('react-native-image-picker'); } catch {}

import * as ExpoImagePicker from 'expo-image-picker';

export const MediaTypeOptions = { All: 'All', Images: 'Images', Videos: 'Videos' };

export async function launchImageLibraryAsync(options?: any) {
  if (RNImagePicker && RNImagePicker.launchImageLibrary) {
    return new Promise((resolve) => {
      RNImagePicker.launchImageLibrary({ mediaType: 'photo', selectionLimit: options?.allowsMultipleSelection ? 10 : 1, quality: options?.quality ?? 0.8 }, (res: any) => {
        if (res.assets) resolve({ canceled: false, assets: res.assets.map((a: any) => ({ uri: a.uri, width: a.width, height: a.height })) });
        else resolve({ canceled: true, assets: [] });
      });
    });
  }
  return (ExpoImagePicker as any).launchImageLibraryAsync(options);
}

export async function launchCameraAsync(options?: any) {
  if (RNImagePicker && RNImagePicker.launchCamera) {
    return new Promise((resolve) => {
      RNImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 }, (res: any) => {
        if (res.assets) resolve({ canceled: false, assets: res.assets });
        else resolve({ canceled: true, assets: [] });
      });
    });
  }
  return (ExpoImagePicker as any).launchCameraAsync(options);
}

export async function requestMediaLibraryPermissionsAsync() {
  return (ExpoImagePicker as any).requestMediaLibraryPermissionsAsync?.();
}
export async function requestCameraPermissionsAsync() {
  return (ExpoImagePicker as any).requestCameraPermissionsAsync?.() || { status: 'granted' };
}
