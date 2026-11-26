// Sul web: scheda in testo con i link delle foto online in fondo (niente file da allegare).
import { Share } from 'react-native';

export function messageWithPhotoLinks(message: string, images: readonly string[] | undefined): string {
  const links = (images || []).filter((uri) => /^https?:\/\//i.test(uri));
  return links.length ? `${message}\n\n📷 FOTO:\n${links.join('\n')}` : message;
}

export async function shareWithPhotos(message: string, title: string, images: readonly string[] | undefined): Promise<void> {
  await Share.share({ title, message: messageWithPhotoLinks(message, images) });
}
