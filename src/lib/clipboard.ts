// Fase 3: expo-clipboard -> @react-native-clipboard/clipboard (drop-in)
let Clipboard: any;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default;
  if (!Clipboard) Clipboard = require('@react-native-clipboard/clipboard');
} catch {
  Clipboard = require('expo-clipboard');
}
export async function setStringAsync(text: string) {
  if (Clipboard.setString) return Clipboard.setString(text);
  if (Clipboard.setStringAsync) return Clipboard.setStringAsync(text);
}
export default { setStringAsync };
