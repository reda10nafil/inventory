// Fase 3: expo-camera -> react-native-vision-camera (stub fallback a expo)
let VisionCamera: any = null;
try { VisionCamera = require('react-native-vision-camera'); } catch {}

let ExpoCamera: any = null;
try { ExpoCamera = require('expo-camera'); } catch {}

export const CameraView = ExpoCamera?.CameraView || VisionCamera?.Camera || ((props:any)=>null);
export const Camera = ExpoCamera?.Camera || { requestCameraPermissionsAsync: async()=>({status:'granted'}) };
