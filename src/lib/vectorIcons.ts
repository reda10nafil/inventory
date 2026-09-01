// Fase 3: @expo/vector-icons -> react-native-vector-icons
let RNVector: any = null;
try { RNVector = require('react-native-vector-icons/MaterialIcons').default; } catch {}
let ExpoIcons: any = null;
try { ExpoIcons = require('@expo/vector-icons').MaterialIcons; } catch {}

export const MaterialIcons = RNVector || ExpoIcons;
