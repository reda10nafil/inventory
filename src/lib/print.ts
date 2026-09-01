// Fase 3: expo-print -> react-native-html-to-pdf
// Mantiene interfaccia printToFileAsync({html}) -> {uri}
let RNHTMLtoPDF: any = null;
try { RNHTMLtoPDF = require('react-native-html-to-pdf'); } catch {}
import * as ExpoPrint from 'expo-print';

export async function printToFileAsync(options: { html: string }): Promise<{ uri: string }> {
  if (RNHTMLtoPDF && RNHTMLtoPDF.convert) {
    const res = await RNHTMLtoPDF.convert({ html: options.html, fileName: `print_${Date.now()}`, base64: false });
    return { uri: res.filePath };
  }
  return ExpoPrint.printToFileAsync(options);
}
