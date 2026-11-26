// 26/11: «Condividi prodotto» manda anche le foto (prima solo il testo: su Android `Share.share` ignora `url`).
// Le foto online (link http) si scaricano nella cache del telefono, poi si condividono tutte insieme al testo con
// `react-native-share` 12.3.1: WhatsApp e simili ricevono le foto con la scheda come didascalia. Al massimo 10 foto.
// Una foto che non si scarica si salta; senza nessuna foto resta la condivisione del solo testo.
import * as ExpoFS from 'expo-file-system/legacy';
import { Share as RNShare } from 'react-native';
import Share from 'react-native-share';

const MAX_PHOTOS = 10;

async function localCopy(uri: string, index: number): Promise<string | null> {
  if (!/^https?:\/\//i.test(uri)) return uri; // già sul telefono
  const ext = uri.match(/\.(jpe?g|png|webp|heic)(?:[?#]|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const target = `${(ExpoFS as any).cacheDirectory}condividi_${Date.now()}_${index + 1}.${ext}`;
  try {
    const result = await (ExpoFS as any).downloadAsync(uri, target);
    return result?.status === 200 ? result.uri : null;
  } catch {
    return null;
  }
}

/** Condivide testo e foto del prodotto in un'unica volta (l'utente sceglie l'app). */
export async function shareWithPhotos(message: string, title: string, images: readonly string[] | undefined): Promise<void> {
  const files: string[] = [];
  for (const [index, uri] of (images || []).filter(Boolean).slice(0, MAX_PHOTOS).entries()) {
    const file = await localCopy(uri, index);
    if (file) files.push(file);
  }
  if (!files.length) {
    await RNShare.share({ message, title });
    return;
  }
  await Share.open({ title, message, urls: files, type: 'image/*', failOnCancel: false });
}
