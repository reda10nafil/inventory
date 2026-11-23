// Ordine delle foto di un prodotto (GAL, ticket 27). `storageImagePaths` è allineato a `images` per posizione (il
// percorso i è la copia cloud della foto i, `types/index.ts`): ogni spostamento ed eliminazione sposta i due elenchi
// insieme (CSV-G6, vincolo 4 di `map-3.md`), altrimenti al prossimo avvio con il cloud una foto prenderebbe il link
// firmato di un'altra. La principale è la prima (`images[0]`: card, condivisione, PDF). Funzioni pure, senza React.
import type { Product } from '../types';

export const MAX_PHOTOS = 10;

export interface Photos {
  images: string[];
  /** Assente se il prodotto non ha copie cloud: resta assente. */
  storageImagePaths?: string[];
}

/** Percorsi lunghi quanto le foto ('' dove manca la copia), o undefined se il prodotto non ne ha. */
function pathsOf(photos: Photos): string[] | undefined {
  const paths = photos.storageImagePaths;
  return paths ? photos.images.map((_, i) => paths[i] ?? '') : undefined;
}

const withPaths = (images: string[], paths: string[] | undefined): Photos => (paths ? { images, storageImagePaths: paths } : { images });

/** Indice valido per `length` foto (0 se non ce ne sono). */
export function clampPhotoIndex(index: number, length: number): number {
  if (length <= 0 || !Number.isFinite(index)) return 0;
  return Math.min(Math.max(0, Math.round(index)), length - 1);
}

function moved<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

/** Sposta la foto `from` alla posizione `to` (con il suo percorso). Indici fuori misura: nessun cambio. */
export function movePhoto(photos: Photos, from: number, to: number): Photos {
  const n = photos.images.length;
  const paths = pathsOf(photos);
  if (from < 0 || from >= n || to < 0 || to >= n || from === to) return withPaths([...photos.images], paths);
  return withPaths(moved(photos.images, from, to), paths && moved(paths, from, to));
}

/** «Metti come principale»: la foto `index` va in testa, le altre scalano di uno nell'ordine di prima. */
export function makeMainPhoto(photos: Photos, index: number): Photos {
  return movePhoto(photos, index, 0);
}

/** Toglie la foto `index` e il suo percorso. */
export function removePhoto(photos: Photos, index: number): Photos {
  const paths = pathsOf(photos);
  if (index < 0 || index >= photos.images.length) return withPaths([...photos.images], paths);
  const keep = (_: unknown, i: number) => i !== index;
  return withPaths(photos.images.filter(keep), paths && paths.filter(keep));
}

/** Aggiunge foto in fondo, fino a `max`; le nuove non hanno ancora una copia cloud (''). */
export function addPhotos(photos: Photos, uris: string[], max = MAX_PHOTOS): Photos {
  const images = [...photos.images, ...uris].slice(0, max);
  const paths = pathsOf(photos);
  return withPaths(images, paths && images.map((_, i) => paths[i] ?? ''));
}

/** Foto da mostrare dopo aver tolto la `removed` mentre si guardava la `index`: la stessa foto, se resta; la
 *  successiva al posto di quella tolta (la precedente se era l'ultima). */
export function indexAfterRemove(index: number, removed: number, lengthAfter: number): number {
  if (lengthAfter <= 0) return 0;
  if (removed < index) return index - 1;
  return clampPhotoIndex(index, lengthAfter);
}

/** Campi da salvare: `storageImagePaths` solo se il prodotto li aveva (un prodotto solo locale resta com'è). */
export function photosPatch(before: Pick<Product, 'storageImagePaths'>, photos: Photos): Pick<Product, 'images' | 'storageImagePaths'> {
  if (!before.storageImagePaths && !photos.storageImagePaths) return { images: photos.images };
  return { images: photos.images, storageImagePaths: pathsOf({ images: photos.images, storageImagePaths: photos.storageImagePaths ?? [] }) };
}

/** Stesse foto in un altro ordine (per la riga «Foto riordinate» della Cronologia). */
export function isReorder(before: readonly string[], after: readonly string[]): boolean {
  if (before.length !== after.length || before.every((u, i) => u === after[i])) return false;
  const count = (list: readonly string[]) => list.reduce((m, u) => m.set(u, (m.get(u) ?? 0) + 1), new Map<string, number>());
  const a = count(before);
  const b = count(after);
  return a.size === b.size && [...a].every(([u, n]) => b.get(u) === n);
}
