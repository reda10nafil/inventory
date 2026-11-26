// 26/11: le foto dei prodotti vanno online da sole nell'archivio pubblico «product-photos» di Supabase (scelta
// dell'utente: link pubblico e permanente). Il link prende il posto del file del telefono: il CSV lo porta (prima le
// foto locali non c'erano: «non c'è il link») e un altro telefono lo vede. Anche senza account: la cartella è un uuid
// del telefono, oppure lo spazio di lavoro quando c'è l'accesso. L'archivio accetta solo aggiunte di immagini con
// percorso «<uuid>/<file>» e non si può elencare: le foto si vedono solo da chi ha il link.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { supabase } from '../backend-auth/supabase/client';
import * as FileSystem from '../src/lib/fileSystem';

export const PHOTO_BUCKET = 'product-photos';
const FOLDER_KEY = 'photoCloud:folder:v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};

/** Già online (link http o https): non si carica. */
export const isRemote = (uri: unknown): uri is string => typeof uri === 'string' && /^https?:\/\//i.test(uri);

export function newUuid(random: () => number = Math.random): string {
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(random() * 16).toString(16)).join('');
  const variant = (8 + Math.floor(random() * 4)).toString(16);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

let folderPromise: Promise<string> | null = null;
/** Cartella di questo telefono nell'archivio, scelta una volta e tenuta. */
export function deviceFolder(): Promise<string> {
  if (!folderPromise) {
    folderPromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(FOLDER_KEY);
        if (saved && UUID.test(saved)) return saved;
      } catch { /* si crea */ }
      const created = newUuid();
      try { await AsyncStorage.setItem(FOLDER_KEY, created); } catch { /* resta per questa apertura */ }
      return created;
    })();
  }
  return folderPromise;
}

/** Estensione e tipo dall'indirizzo del file; senza estensione nota vale jpg. */
export function photoType(uri: string): { ext: string; mime: string } {
  const ext = uri.match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i)?.[1]?.toLowerCase();
  if (ext && MIME[ext]) return { ext: ext === 'jpeg' ? 'jpg' : ext, mime: MIME[ext] };
  return { ext: 'jpg', mime: 'image/jpeg' };
}

/** Percorso nell'archivio: «<cartella>/<prodotto>_<istante>_<n>.<ext>», solo caratteri ammessi dalla regola. */
export function photoPath(folder: string, productId: string, index: number, ext: string, now = Date.now()): string {
  const safe = productId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) || 'prodotto';
  return `${folder}/${safe}_${now}_${index + 1}.${ext}`;
}

// Byte del file: sul telefono letti in base64 (un Blob caricato da React Native può arrivare vuoto), sul web dal browser
async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web' || /^(blob|data):/i.test(uri)) return (await fetch(uri)).arrayBuffer();
  return decode(await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }));
}

/** Carica una foto e dà il suo link pubblico permanente. `folder`: lo spazio di lavoro (uuid), se no il telefono. */
// 26/11: prima di andare online la foto diventa WebP (formato dei siti e-commerce, molto più leggero) con il lato
// lungo al massimo di 1600 px. Solo sul telefono; se la conversione non riesce si carica l'originale.
export const WEB_MAX_SIDE = 1600;
export function webSize(width: number, height: number, max = WEB_MAX_SIDE): { width: number; height: number } | null {
  if (!(width > 0 && height > 0) || Math.max(width, height) <= max) return null; // già piccola: niente ridimensionamento
  return width >= height
    ? { width: max, height: Math.round((height * max) / width) }
    : { width: Math.round((width * max) / height), height: max };
}

async function toWebp(uri: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const original = await manipulateAsync(uri, []);
    const size = webSize(original.width, original.height);
    const result = await manipulateAsync(uri, size ? [{ resize: size }] : [], { compress: 0.8, format: SaveFormat.WEBP });
    return result?.uri ?? null;
  } catch {
    return null;
  }
}

export async function uploadPhoto(uri: string, productId: string, index: number, folder?: string | null): Promise<string> {
  const target = folder && UUID.test(folder) ? folder : await deviceFolder();
  const webp = await toWebp(uri);
  const source = webp ?? uri;
  const { ext, mime } = webp ? { ext: 'webp', mime: 'image/webp' } : photoType(uri);
  const bytes = await readBytes(source);
  if (!bytes.byteLength) throw new Error('foto vuota');
  const path = photoPath(target, productId, index, ext);
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw error;
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Foto di un prodotto: quante ce ne sono e quante sono già online (per la riga di Esporta). */
export function photoCounts(products: readonly { images?: string[]; deletedAt?: string | null }[]): { total: number; online: number } {
  let total = 0;
  let online = 0;
  for (const product of products) {
    if (product.deletedAt) continue;
    for (const uri of product.images || []) {
      if (!uri) continue;
      total += 1;
      if (isRemote(uri)) online += 1;
    }
  }
  return { total, online };
}
