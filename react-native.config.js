module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
  dependencies: {
    // Temporarily disable native modules failing Kotlin compile — JS fallback active (see src/services/mediaCompressor.ts fallback + TeamScreen stub)
    // Riabilitare dopo fix Kotlin: 'react-native-vision-camera' e 'react-native-compressor' hanno fallback JS che ritorna uri originale / stub camera
    'react-native-vision-camera': { platforms: { android: null, ios: null } },
    'react-native-compressor': { platforms: { android: null, ios: null } },
  },
};
