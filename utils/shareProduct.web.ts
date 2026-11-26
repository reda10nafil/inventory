// 26/11: sul web la condivisione resta di solo testo, con i link delle foto online in fondo.
import { Share } from 'react-native';

export async function shareWithPhotos(message: string, title: string, images: readonly string[] | undefined): Promise<void> {
  const links = (images || []).filter((uri) => /^https?:\/\//i.test(uri));
  await Share.share({ title, message: links.length ? `${message}\n\nFoto:\n${links.join('\n')}` : message });
}
