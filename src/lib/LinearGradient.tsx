// Fase 3: expo-linear-gradient -> react-native-linear-gradient
let RNLinear: any = null;
try { RNLinear = require('react-native-linear-gradient').default; } catch {}
let ExpoLinear: any = null;
try { ExpoLinear = require('expo-linear-gradient').LinearGradient; } catch {}

export function LinearGradient(props: any) {
  if (RNLinear) return <RNLinear {...props} />;
  if (ExpoLinear) return <ExpoLinear {...props} />;
  return null;
}
