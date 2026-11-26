// 26/11: «Condividi prodotto» come i messaggi dei canali WhatsApp: UNA foto con la scheda come didascalia (sotto, i
// link di tutte le foto). Con più foto insieme WhatsApp scartava il testo; con nessuna foto: solo testo.
// La prima foto (online o del telefono) si scarica nella cache e si manda con `react-native-share` 12.3.1 in un solo
// invio (ACTION_SEND con immagine e testo).
import * as ExpoFS from 'expo-file-system/legacy';
import { Share as RNShare } from 'react-native';
import Share from 'react-native-share';

export function messageWithPhotoLinks(message: string, images: readonly string[] | undefined): string {
  const links = (images || []).filter((uri) => /^https?:\/\//i.test(uri));
  return links.length ? `${message}\n\n📷 FOTO:\n${links.join('\n')}` : message;
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

async function firstPhotoFile(images: readonly string[] | undefined): Promise<{ uri: string; type: string } | null> {
  const uri = (images || []).find(Boolean);
  if (!uri) return null;
  const ext = uri.match(/\.(jpe?g|png|webp|heic)(?:[?#]|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const type = MIME[ext] ?? 'image/jpeg';
  if (!/^https?:\/\//i.test(uri)) return { uri, type }; // già sul telefono
  try {
    const result = await (ExpoFS as any).downloadAsync(uri, `${(ExpoFS as any).cacheDirectory}condividi_${Date.now()}.${ext}`);
    return result?.status === 200 ? { uri: result.uri, type } : null;
  } catch {
    return null;
  }
}

export async function shareWithPhotos(message: string, title: string, images: readonly string[] | undefined): Promise<void> {
  const text = messageWithPhotoLinks(message, images);
  const photo = await firstPhotoFile(images);
  if (!photo) {
    await RNShare.share({ title, message: text });
    return;
  }
  await Share.open({ title, message: text, url: photo.uri, type: photo.type, failOnCancel: false });
}
