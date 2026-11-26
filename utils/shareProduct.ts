// 26/11: «Condividi prodotto» = la scheda di sempre (testo) con in fondo i link delle foto online. Richiesta
// dell'utente: inviare le foto come file faceva arrivare una sola immagine e perdere le specifiche. Su WhatsApp il
// primo link mostra l'anteprima della foto. Le foto non ancora online (senza link) non si possono mettere nel testo.
import { Share } from 'react-native';

export function messageWithPhotoLinks(message: string, images: readonly string[] | undefined): string {
  const links = (images || []).filter((uri) => /^https?:\/\//i.test(uri));
  return links.length ? `${message}\n\n📷 FOTO:\n${links.join('\n')}` : message;
}

export async function shareWithPhotos(message: string, title: string, images: readonly string[] | undefined): Promise<void> {
  await Share.share({ title, message: messageWithPhotoLinks(message, images) });
}
