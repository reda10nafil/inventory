// Fase 3: expo-print -> react-native-html-to-pdf
// Mantiene interfaccia printToFileAsync({html}) -> {uri}
let RNHTMLtoPDF: any = null;
try { RNHTMLtoPDF = require('react-native-html-to-pdf'); } catch {}
import * as ExpoPrint from 'expo-print';
import { Platform } from 'react-native';
import * as Sharing from './sharing';

export async function printToFileAsync(options: { html: string }): Promise<{ uri: string }> {
  if (RNHTMLtoPDF && RNHTMLtoPDF.convert) {
    const res = await RNHTMLtoPDF.convert({ html: options.html, fileName: `print_${Date.now()}`, base64: false });
    return { uri: res.filePath };
  }
  return ExpoPrint.printToFileAsync(options);
}

// ETI (ticket 22): stampa e condivisione di un HTML (etichette, scheda PDF). Sul web `expo-print` stampa la pagina
// dell'app e non restituisce un file (NG21): qui l'HTML si apre in una finestra sua e si stampa quella.

/**
 * Web: la finestra della stampa. Va aperta nel tocco, prima di ogni attesa, altrimenti il browser la blocca; null se il
 * browser l'ha bloccata (o fuori dal web, dove non serve).
 */
export function openPrintWindow(): Window | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.open('', '_blank');
}

/**
 * Stampa un HTML. Web: lo scrive nella finestra aperta con `openPrintWindow` e stampa quella, mai la pagina dell'app;
 * `false` se la finestra non c'è (il browser l'ha bloccata). Telefono: la finestra di stampa del sistema.
 */
export async function printHtml(html: string, win?: Window | null): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (!win || win.closed) return false;
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    return true;
  }
  await ExpoPrint.printAsync({ html });
  return true;
}

/**
 * Condivide un HTML. Telefono: diventa un PDF e si apre la condivisione del sistema. Web: il file `.html` (si apre in
 * qualunque browser, pronto da stampare), condiviso se il browser sa condividere file, altrimenti scaricato.
 */
export async function shareHtml(html: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    const file = new File([html], `${name}.html`, { type: 'text/html' });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: name });
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const { uri } = await printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
}

/**
 * Scheda PDF: sul telefono un PDF da condividere, come prima; sul web la finestra della stampa aperta nel tocco (lì si
 * sceglie «Salva come PDF»). `false` se il browser ha bloccato la finestra.
 */
export async function savePdf(html: string, name: string, win?: Window | null): Promise<boolean> {
  if (Platform.OS === 'web') return printHtml(html, win);
  await shareHtml(html, name);
  return true;
}
