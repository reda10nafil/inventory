// Foto del profilo (ACC1, ticket 32): una foto scelta dalla galleria, ridotta (web: quadrato centrale 160×160;
// telefono: larga 160, proporzioni tenute) e salvata come
// `data:image/jpeg;base64,…`. Un indirizzo `blob:` (web) o di cache (telefono) non resta dopo una ricarica, e lo
// storage del browser ha la stessa quota dell'inventario: per questo si salva piccola. Sul telefono non provato.
import { Platform } from 'react-native';
import * as ImagePicker from './imagePicker';
import * as ImageManipulator from './imageManipulator';
import * as FileSystem from './fileSystem';
import { isProfilePhoto } from '../../utils/profile';

const SIDE = 160;

export type PhotoResult = { photo: string } | { canceled: true } | { error: string };

/** Ritaglio centrale quadrato con un canvas (solo web). */
function squareOnWeb(uri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (globalThis as any).Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) { reject(new Error('vuota')); return; }
      const canvas = document.createElement('canvas');
      canvas.width = SIDE;
      canvas.height = SIDE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIDE, SIDE);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => reject(new Error('non leggibile'));
    img.src = uri;
  });
}

async function squareOnPhone(uri: string): Promise<string> {
  // solo la larghezza: le proporzioni restano (il cerchio mostra il centro, `cover`)
  const out: any = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: SIDE } }], {
    compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true,
  });
  const base64 = out?.base64 || await FileSystem.readAsStringAsync(out.uri, { encoding: FileSystem.EncodingType.Base64 });
  return `data:image/jpeg;base64,${base64}`;
}

/** Sceglie una foto dalla galleria e la rende pronta da salvare; errori in parole. */
export async function pickProfilePhoto(): Promise<PhotoResult> {
  try {
    if (Platform.OS !== 'web') {
      const perm: any = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm && perm.status && perm.status !== 'granted') return { error: 'Serve il permesso per le foto: dallo nelle impostazioni del telefono.' };
    }
    const result: any = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.8,
    });
    const uri: string | undefined = result?.assets?.[0]?.uri;
    if (result?.canceled || !uri) return { canceled: true };
    let photo: string;
    try {
      photo = Platform.OS === 'web' ? await squareOnWeb(uri) : await squareOnPhone(uri);
    } finally {
      // sul web l'indirizzo `blob:` della scelta non serve più
      if (Platform.OS === 'web' && uri.startsWith('blob:')) URL.revokeObjectURL(uri);
    }
    if (!isProfilePhoto(photo)) return { error: 'Foto non salvata: prova con un\'altra immagine.' };
    return { photo };
  } catch {
    return { error: 'Foto non letta: prova con un\'altra immagine.' };
  }
}
