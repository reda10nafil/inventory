// Scaffali (S1a, ticket 13): un posto dentro una posizione, generico o di una categoria, con un codice (QR) e un
// tag NFC solo memorizzato. Funzioni pure: il contesto degli scaffali, quello dell'inventario e le schermate le
// chiamano. In S1a lo scaffale vale **solo per i pezzi unici** (`shelfId` del prodotto): nessuna chiave di `stock`
// è uno scaffale e un articolo a quantità non ha `shelfId` (la giacenza sugli scaffali è la fetta S1b).
// Due regole tengono i dati coerenti senza riscriverli:
// - lettura (`productShelfId`): uno `shelfId` che non torna (scaffale sconosciuto, di un'altra posizione, prodotto a
//   quantità) si ignora;
// - scrittura (`keptShelfId` / `shelfPatch`): lo scaffale resta solo se è nella posizione del prodotto.
import type { Product } from '../types';
import { categoryAncestors, categoryPath, type CategoryNode } from './categories';

export interface Shelf {
  /** Opaco e per sempre (`newShelfId`): gli id di posizioni e categorie sono parole e non devono scontrarsi. */
  id: string;
  name: string;
  /** Posizione in cui sta. Si sceglie alla creazione e poi non cambia (S1b potrà contarci). */
  locationId: string;
  /** Categoria (id di `libraries`); assente = scaffale generico. */
  libraryId?: string;
  /** Codice (QR o barcode) che lo Scanner riconosce. */
  barcode?: string;
  /** Tag NFC, solo memorizzato: la lettura arriva con la fetta N1. */
  nfcTag?: string;
  createdAt?: string;
}

/** Dati del modulo, senza id. */
export type ShelfInput = Omit<Shelf, 'id' | 'createdAt'>;

/** Campi del prodotto che contano per lo scaffale. */
type Holder = Pick<Product, 'location' | 'stock' | 'shelfId'>;
type ShelfRef = Pick<Shelf, 'id' | 'locationId'>;

/** Separatore di «Magazzino › A1», come il nome completo delle categorie. */
export const SHELF_SEPARATOR = ' › ';
/** Etichetta di uno scaffale senza categoria. */
export const GENERIC_SHELF = 'Generico';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
// Maiuscole e accenti indifferenti: «Scaffale à» e «scaffale a» sono lo stesso nome.
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();
// Ordine naturale: «A2» prima di «A10».
const byName = (a: Pick<Shelf, 'name' | 'id'>, b: Pick<Shelf, 'name' | 'id'>) =>
  a.name.localeCompare(b.name, 'it', { numeric: true, sensitivity: 'base' }) || a.id.localeCompare(b.id);

/** Dati del modulo puliti: spazi tolti, campi facoltativi vuoti non salvati. */
export function shelfData(input: ShelfInput): ShelfInput {
  const libraryId = text(input.libraryId);
  const barcode = text(input.barcode);
  const nfcTag = text(input.nfcTag);
  return {
    name: text(input.name),
    locationId: text(input.locationId),
    ...(libraryId && { libraryId }),
    ...(barcode && { barcode }),
    ...(nfcTag && { nfcTag }),
  };
}

/**
 * Lista salvata → scaffali. Assente o rovinata → elenco vuoto (chi legge non scrive nulla). Le voci malformate (senza
 * id, nome o posizione, id già visto, non oggetti) si scartano una per una, senza eccezioni.
 */
export function parseShelves(raw: string | null | undefined): Shelf[] {
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const list: Shelf[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const id = text(item.id);
    const data = shelfData({ name: item.name, locationId: item.locationId, libraryId: item.libraryId, barcode: item.barcode, nfcTag: item.nfcTag });
    if (!id || !data.name || !data.locationId || seen.has(id)) continue;
    seen.add(id);
    const createdAt = text(item.createdAt);
    list.push({ id, ...data, ...(createdAt && { createdAt }) });
  }
  return list;
}

/**
 * Id di uno scaffale nuovo, come quello dei prodotti e dei contatti (`istante-casuale`) e **non** dal nome: un id
 * fatto di parole potrebbe essere uguale a quello di una posizione o di una categoria (`magazzino`, `visone`).
 */
export function newShelfId(existing: readonly Pick<Shelf, 'id'>[], now: number = Date.now(), random: number = Math.random()): string {
  const ids = new Set(existing.map((s) => s.id));
  const base = `${now}-${random.toString(36).slice(2, 11) || '0'}`;
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Errore per uno scaffale nuovo o modificato (`editingId`), altrimenti null. Il nome è unico **dentro la posizione**. */
export function shelfNameError(shelves: readonly Shelf[], name: string, locationId: string, editingId?: string): string | null {
  const clean = name.trim();
  if (!clean) return 'Inserisci un nome per lo scaffale';
  if (!locationId) return 'Scegli la posizione dello scaffale';
  const twin = shelves.find((s) => s.id !== editingId && s.locationId === locationId && fold(s.name) === fold(clean));
  return twin ? `In questa posizione c'è già lo scaffale "${twin.name}"` : null;
}

/**
 * Lettura: lo scaffale del prodotto se torna (pezzo unico, scaffale in elenco e nella posizione del prodotto),
 * altrimenti nessuno. Schede, card, export e «usato» passano tutti da qui.
 */
export function productShelfId(product: Holder, shelves: readonly ShelfRef[]): string | undefined {
  if (product.stock != null || !product.shelfId) return undefined;
  const shelf = shelves.find((s) => s.id === product.shelfId);
  return shelf && shelf.locationId === product.location ? shelf.id : undefined;
}

export function productShelf<T extends ShelfRef>(product: Holder, shelves: readonly T[]): T | undefined {
  const id = productShelfId(product, shelves);
  return id ? shelves.find((s) => s.id === id) : undefined;
}

/**
 * Scrittura: lo `shelfId` che il prodotto può tenere dopo una scrittura (`next`, il prodotto com'è dopo;
 * `previous`, com'era prima, se esisteva). È l'unica regola, chiamata a ogni scrittura dei prodotti
 * (Aggiungi, Modifica, spostamenti, movimenti, import):
 * - articolo a quantità: nessuno scaffale (S1a);
 * - scaffale in elenco: resta solo se è nella posizione del prodotto;
 * - scaffale che questo dispositivo non conosce (elenco non ancora letto, dato arrivato da fuori): resta solo se la
 *   scrittura non tocca né lo scaffale né la posizione, così una modifica del prezzo non cancella ciò che non vede.
 */
export function keptShelfId(shelves: readonly ShelfRef[], next: Holder, previous?: Pick<Product, 'location' | 'shelfId'>): string | undefined {
  if (next.stock != null || !next.shelfId) return undefined;
  const shelf = shelves.find((s) => s.id === next.shelfId);
  if (shelf) return shelf.locationId === next.location ? shelf.id : undefined;
  return previous && previous.shelfId === next.shelfId && previous.location === next.location ? next.shelfId : undefined;
}

/**
 * Patch di una scrittura con lo scaffale giusto (`keptShelfId`). I prodotti senza scaffale non ricevono il campo:
 * il loro stato salvato resta identico a prima. Un prodotto che lo perde riceve `shelfId: undefined` (il salvataggio
 * in JSON lo toglie).
 */
export function shelfPatch<P extends Partial<Product>>(before: Product | undefined, patch: P, shelves: readonly ShelfRef[]): P {
  const next = { ...(before ?? {}), ...patch } as Holder;
  const kept = keptShelfId(shelves, next, before);
  if (kept === undefined && before?.shelfId === undefined) {
    if (!('shelfId' in patch)) return patch;
    const rest = { ...patch };
    delete rest.shelfId;
    return rest;
  }
  if (kept === next.shelfId) return patch;
  return { ...patch, shelfId: kept };
}

/** Prodotto nuovo (Aggiungi, import) con lo scaffale giusto: senza scaffale valido il campo non c'è. */
export function withKeptShelf<T extends Holder>(product: T, shelves: readonly ShelfRef[]): T {
  const kept = keptShelfId(shelves, product);
  if (kept === product.shelfId) return product;
  const rest = { ...product };
  delete rest.shelfId;
  return kept ? { ...rest, shelfId: kept } : rest;
}

/**
 * Scaffali da proporre per un prodotto: quelli della sua posizione di una categoria che lo contiene (la sua o una
 * principale sopra: uno scaffale «Pellicce» va bene per «Pellicce › Visone»), poi i generici. Senza categoria, solo
 * i generici. Con `currentShelfId` (Modifica) c'è anche lo scaffale di adesso, se è in quella posizione.
 */
export function shelvesFor<T extends Shelf>(
  shelves: readonly T[],
  categories: readonly CategoryNode[],
  product: { location: string; libraryId?: string },
  currentShelfId?: string,
): T[] {
  if (!product.location) return [];
  const own = product.libraryId ? [product.libraryId, ...categoryAncestors(categories, product.libraryId).map((c) => c.id)] : [];
  const here = shelves.filter((s) => s.locationId === product.location);
  const ofCategory = here.filter((s) => s.libraryId && own.includes(s.libraryId)).sort(byName);
  const generic = here.filter((s) => !s.libraryId).sort(byName);
  const out = [...ofCategory, ...generic];
  const current = here.find((s) => s.id === currentShelfId);
  if (current && !out.includes(current)) out.push(current);
  return out;
}

/** «Generico» oppure il nome completo della categoria («Pellicce › Visone»). */
export function shelfKind(shelf: Pick<Shelf, 'libraryId'>, categories: readonly CategoryNode[]): string {
  return shelf.libraryId ? categoryPath(categories, shelf.libraryId) : GENERIC_SHELF;
}

/** «Magazzino › A1» per card e Scheda; senza scaffale, la sola posizione. */
export function placeWithShelf(placeLabel: string, shelf?: Pick<Shelf, 'name'>): string {
  return shelf ? `${placeLabel}${SHELF_SEPARATOR}${shelf.name}` : placeLabel;
}

/** Scaffali raggruppati per posizione (Impostazioni › Scaffali), nell'ordine delle posizioni, poi quelli di una
 *  posizione che non c'è più (con l'id come nome). Dentro ogni gruppo, in ordine di nome. */
export function shelvesByLocation<T extends Shelf>(
  shelves: readonly T[],
  locations: readonly { id: string; label: string }[],
): { locationId: string; label: string; shelves: T[] }[] {
  const known = new Set(locations.map((l) => l.id));
  const groups = locations.map((l) => ({ locationId: l.id, label: l.label, shelves: shelves.filter((s) => s.locationId === l.id).sort(byName) }));
  const orphans = [...new Set(shelves.filter((s) => !known.has(s.locationId)).map((s) => s.locationId))];
  for (const id of orphans) groups.push({ locationId: id, label: id, shelves: shelves.filter((s) => s.locationId === id).sort(byName) });
  return groups.filter((g) => g.shelves.length > 0);
}

/** Quanti prodotti stanno su ogni scaffale (id → attivi e nel cestino), con la stessa lettura delle schede. */
export function shelfUsage(
  products: readonly (Holder & Pick<Product, 'deletedAt'>)[],
  shelves: readonly ShelfRef[],
): Record<string, { active: number; trashed: number }> {
  const out: Record<string, { active: number; trashed: number }> = {};
  for (const product of products) {
    const id = productShelfId(product, shelves);
    if (!id) continue;
    const entry = out[id] ?? (out[id] = { active: 0, trashed: 0 });
    if (product.deletedAt) entry.trashed += 1; else entry.active += 1;
  }
  return out;
}

/**
 * Perché uno scaffale non si elimina, come le posizioni: ha prodotti, anche venduti o nel cestino (ripristinati
 * tornerebbero su uno scaffale che non c'è). `null` = si può eliminare.
 */
export function shelfDeleteError(shelf: Pick<Shelf, 'name'>, used: { active: number; trashed: number } | undefined): string | null {
  const active = used?.active ?? 0;
  const trashed = used?.trashed ?? 0;
  const total = active + trashed;
  if (total === 0) return null;
  const products = (n: number) => `${n} prodott${n === 1 ? 'o' : 'i'}`;
  const parts = !active ? `${products(trashed)} nel cestino` : trashed ? `${products(active)} e ${trashed} nel cestino` : products(active);
  const trash = !trashed ? '' : trashed === 1
    ? ' Quello nel cestino si può anche eliminare per sempre dal Cestino.'
    : ' Quelli nel cestino si possono anche eliminare per sempre dal Cestino.';
  return `Lo scaffale "${shelf.name}" ha ${parts}. ${total === 1 ? 'Spostalo' : 'Spostali'} in un altro scaffale o posizione prima di eliminarlo.${trash}`;
}

/** Perché una posizione non si elimina per via dei suoi scaffali, altrimenti null. */
export function locationShelvesError(label: string, shelves: readonly Pick<Shelf, 'locationId'>[], locationId: string): string | null {
  const count = shelves.filter((s) => s.locationId === locationId).length;
  if (count === 0) return null;
  return `La posizione "${label}" ha ${count === 1 ? '1 scaffale: eliminalo' : `${count} scaffali: eliminali`} prima da Impostazioni › Scaffali.`;
}

/** Quanti scaffali sono di questa categoria (una categoria usata da uno scaffale non si elimina). */
export const shelvesOfCategory = (shelves: readonly Pick<Shelf, 'libraryId'>[], libraryId: string): number =>
  shelves.filter((s) => s.libraryId === libraryId).length;

// Codici già usati (`codeOwner`, `codeError`, `codeCheck`) e lettura dei codici: `utils/codes.ts` (COD, ticket 22).

/**
 * Codice proposto per uno scaffale nuovo: `SCAF-MAGAZZINO-A1` dalla posizione e dal nome, con `-2`, `-3`… se è già
 * usato (`taken`). '' senza nome.
 */
export function suggestShelfCode(placeLabel: string, name: string, taken: (code: string) => boolean): string {
  const slug = (value: string) => fold(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase();
  const base = [slug(placeLabel), slug(name)].filter(Boolean);
  if (!slug(name)) return '';
  const code = `SCAF-${base.join('-')}`;
  if (!taken(code)) return code;
  let n = 2;
  while (taken(`${code}-${n}`)) n += 1;
  return `${code}-${n}`;
}

/** Colonna «Scaffale» del CSV → id di uno scaffale della posizione del prodotto (per nome o per id), altrimenti nessuno. */
export function shelfIdFromCsv(value: string, locationId: string, shelves: readonly Shelf[]): string | undefined {
  const v = fold(value);
  if (!v || !locationId) return undefined;
  const here = shelves.filter((s) => s.locationId === locationId);
  return (here.find((s) => fold(s.name) === v) ?? here.find((s) => s.id === value.trim()))?.id;
}

/** Vero se una di queste posizioni (posizione del prodotto o chiavi della giacenza) è uno scaffale, per id o per
 *  codice: in S1a non si accetta (l'import salta la riga), la giacenza sugli scaffali è la fetta S1b. */
export const isShelfPlace = (shelves: readonly Pick<Shelf, 'id' | 'barcode'>[], places: readonly string[]): boolean =>
  places.some((place) => !!place && shelves.some((s) => s.id === place || (!!s.barcode && s.barcode === place)));
