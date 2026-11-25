// EXP (ticket 26, fetta DATI): parti dell'export dei prodotti che `productCsvRows` usa (colonne dei campi
// personalizzati col valore leggibile, JSON dei campi senza foto locali) e quelle di «Esporta con le foto» (quali foto
// vanno nella cartella `immagini/` dello ZIP e con che nome, colonna «Immagini file»). Funzioni pure, test in
// `__tests__/productCsv.test.ts` e `__tests__/productExport.test.ts`.
// Foto del dispositivo: tutto ciò che non è `http(s)` (`data:`, `blob:`, `file:`, e `local-photo:` di FOTO quando arriverà).
import type { CustomField, Product, ProductCustomData } from '../types';
import { choiceLabel, choiceList, choiceOptions, isChoiceField, isNumberField, numberOf } from './fieldValues';
import { extensionOf, safeFileName } from './zip';

export const isWebLink = (uri: unknown): uri is string => typeof uri === 'string' && /^https?:\/\//i.test(uri.trim());
/** Foto o file salvati solo su questo dispositivo (non escono nel CSV). */
export const isLocalPhoto = (uri: unknown): uri is string => typeof uri === 'string' && !!uri.trim() && !isWebLink(uri);

const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();
const fileField = (field: Pick<CustomField, 'type'>) => field.type === 'images' || field.type === 'document';

/** Separatore dei valori multipli nelle colonne leggibili («Cappuccio; Tasche»). */
export const MULTI_SEPARATOR = '; ';

/**
 * Campi da esportare: quelli personalizzati non nel cestino (non i campi Base), nell'ordine del modulo Aggiungi; quelli
 * che il modulo non ha (tolti dal layout) dopo, nell'ordine del registro. Da passare a `formFor` (MCAT)
 * all'unione con la fetta CAMPI.
 */
export function exportFields(registry: readonly CustomField[], layoutIds: readonly string[] = []): CustomField[] {
  const live = registry.filter((f) => !f.isSystem && !f.deletedAt);
  const at = (f: CustomField, n: number) => { const i = layoutIds.indexOf(f.id); return i < 0 ? layoutIds.length + n : i; };
  return live.map((f, n) => ({ f, k: at(f, n) })).sort((a, b) => a.k - b.k).map(({ f }) => f);
}

export interface FieldColumn {
  field: CustomField;
  header: string;
}

/**
 * Intestazioni delle colonne dei campi: il nome del campo; se coincide con una colonna di sistema (`reserved`) o con
 * un altro campo, «Nome (campo)», «Nome (campo 2)»… così l'import non le confonde.
 */
export function fieldColumns(fields: readonly CustomField[], reserved: readonly string[]): FieldColumn[] {
  const used = new Set(reserved.map(fold));
  return fields.map((field) => {
    let header = field.name.trim() || field.id;
    if (used.has(fold(header))) {
      const base = `${header} (campo)`;
      header = base;
      for (let n = 2; used.has(fold(header)); n += 1) header = `${field.name.trim()} (campo ${n})`;
    }
    used.add(fold(header));
    return { field, header };
  });
}

type Lists = Parameters<typeof choiceOptions>[1];

/** Valore salvato di un campo nel prodotto (con la copia del campo salvata con lui), o nessuno. */
export function savedEntry(product: Pick<Product, 'customData'>, fieldId: string): ProductCustomData | undefined {
  return (product.customData || []).find((c) => c?.fieldSnapshot?.id === fieldId);
}

/**
 * Valore leggibile di un campo per la colonna: scelte con le etichette («Cappuccio; Tasche»), Sì/No, numeri come nel
 * resto del file (punto decimale, senza unità), immagini e documenti solo come link `http(s)`, il resto com'è.
 */
export function fieldCell(field: CustomField, product: Pick<Product, 'customData'>, lists: Lists = {}): string {
  const entry = savedEntry(product, field.id);
  if (!entry) return '';
  const value = entry.value;
  if (value === undefined || value === null || value === '') return '';
  if (fileField(field)) return (Array.isArray(value) ? value : [value]).filter(isWebLink).join(MULTI_SEPARATOR);
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (isChoiceField(field)) {
    const options = choiceOptions(field, lists);
    return choiceList(value).map((v) => choiceLabel(v, options, entry.fieldSnapshot)).join(MULTI_SEPARATOR);
  }
  if (isNumberField(field)) {
    const n = numberOf(value);
    return n === undefined ? String(value) : String(n);
  }
  if (Array.isArray(value)) return value.map(String).join(MULTI_SEPARATOR);
  return String(value);
}

/** CSV-E3: nel JSON dei campi le immagini e i documenti restano solo come link `http(s)` (niente base64 di decine di KB). */
export function exportCustomData(customData: Product['customData'] | undefined): ProductCustomData[] {
  return (customData || []).map((c) => {
    if (!c?.fieldSnapshot || !fileField(c.fieldSnapshot)) return c;
    const list = Array.isArray(c.value) ? c.value : c.value == null ? [] : [c.value];
    return { ...c, value: list.filter(isWebLink) };
  });
}

/** Foto del dispositivo che un CSV non porta con sé: quelle dei prodotti e dei campi Immagini (prodotti non nel cestino). */
export function localPhotoCount(products: readonly Product[]): { product: number; fields: number } {
  let product = 0;
  let fields = 0;
  for (const p of products) {
    if (p.deletedAt) continue;
    product += (p.images || []).filter(isLocalPhoto).length;
    for (const c of p.customData || []) {
      if (c?.fieldSnapshot?.type !== 'images') continue;
      fields += (Array.isArray(c.value) ? c.value : [c.value]).filter(isLocalPhoto).length;
    }
  }
  return { product, fields };
}

/** Testo dell'avviso dopo «Esporta CSV»; `null` se tutte le foto sono link. */
export function photosWarning(products: readonly Product[]): string | null {
  const { product, fields } = localPhotoCount(products);
  const n = product + fields;
  if (!n) return null;
  return `${n} ${n === 1 ? 'foto non esportata: è solo' : 'foto non esportate: sono solo'} su questo dispositivo. Per averle usa «Esporta con le foto».`;
}

// ── «Esporta con le foto» ────────────────────────────────────

export const IMAGE_FILES_HEADER = 'Immagini file';
export const ZIP_IMAGES_DIR = 'immagini/';
export const ZIP_CSV_NAME = 'inventario.csv';

export interface PhotoFile {
  productId: string;
  /** Posizione della foto nel prodotto (0 = la principale). */
  index: number;
  /** Nome nella cartella `immagini/` («VIS-0142-1.jpg»). */
  name: string;
  uri: string;
}

/** Tipo della foto dall'indirizzo (`data:image/png…`) o dall'estensione; JPEG se non si sa. */
export function photoMime(uri: string): string {
  const data = /^data:([^;,]+)/i.exec(uri);
  if (data) return data[1].toLowerCase();
  const ext = /\.(jpe?g|png|webp|gif|heic)(?:[?#].*)?$/i.exec(uri)?.[1]?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
}

/**
 * Foto del dispositivo da mettere nello ZIP: per ogni prodotto non nel cestino, `<SKU>-<n>.<ext>` con n la posizione
 * della foto (1 = la principale). SKU resi sicuri per un nome di file; due prodotti con lo stesso nome sicuro prendono
 * «-b», «-c»… così nessun file ne copre un altro.
 */
export function photoFiles(products: readonly Product[]): PhotoFile[] {
  const out: PhotoFile[] = [];
  const bases = new Map<string, string>(); // nome sicuro (minuscolo) → id del prodotto che lo usa
  for (const p of products) {
    if (p.deletedAt) continue;
    const local = (p.images || []).map((uri, index) => ({ uri, index })).filter(({ uri }) => isLocalPhoto(uri));
    if (!local.length) continue;
    let base = safeFileName(p.sku || p.id);
    for (let n = 1; bases.has(base.toLowerCase()) && bases.get(base.toLowerCase()) !== p.id; n += 1) {
      base = `${safeFileName(p.sku || p.id)}-${String.fromCharCode(97 + n)}`;
    }
    bases.set(base.toLowerCase(), p.id);
    for (const { uri, index } of local) out.push({ productId: p.id, index, uri, name: `${base}-${index + 1}.${extensionOf(photoMime(uri))}` });
  }
  return out;
}

/**
 * Righe del CSV di «Esporta con le foto»: quelle di `productCsvRows` più la colonna «Immagini file» con i nomi
 * (separati da «;», nell'ordine delle foto). `rows[i+1]` è la riga di `live[i]` (prodotti non nel cestino, stesso ordine).
 * `skipped`: foto che non si sono potute leggere (un `blob:` scaduto), tolte dalla colonna.
 */
export function rowsWithImageFiles(rows: readonly (readonly unknown[])[], live: readonly Product[], files: readonly PhotoFile[], skipped: ReadonlySet<string> = new Set()): unknown[][] {
  const byProduct = new Map<string, string[]>();
  for (const f of files) {
    if (skipped.has(f.name)) continue;
    byProduct.set(f.productId, [...(byProduct.get(f.productId) ?? []), f.name]);
  }
  return rows.map((row, i) => (i === 0 ? [...row, IMAGE_FILES_HEADER] : [...row, (byProduct.get(live[i - 1]?.id) ?? []).join(MULTI_SEPARATOR)]));
}
