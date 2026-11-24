// Scaffali (S1a, ticket 13): un posto dentro una posizione, generico o di una categoria, con un codice (QR) e un
// tag NFC solo memorizzato. Funzioni pure: il contesto degli scaffali, quello dell'inventario e le schermate le
// chiamano. Un pezzo unico ha lo scaffale in `shelfId`; un articolo a quantità (S1b) lo ha nelle chiavi della sua
// giacenza, `posizione/idScaffale` (`stockKey` di utils/stock.ts), e mai in `shelfId`.
// Due regole tengono i dati coerenti senza riscriverli:
// - lettura (`productShelfId`): uno `shelfId` che non torna (scaffale sconosciuto, di un'altra posizione, prodotto a
//   quantità) si ignora;
// - scrittura (`keptShelfId` / `shelfPatch`): lo scaffale resta solo se è nella posizione del prodotto.
import type { Product } from '../types';
import { categoryAncestors, categoryPath, type CategoryNode } from './categories';
import { formatNumber, parseNumber } from './number';
import { qtyAt, round3, SHELF_KEY_SEPARATOR, splitStockKey, stockKey } from './stock';

/** Tipo di scaffale (S2, ticket 14): ripiano (scaffale, cassetto, contenitore) o barra appendiabiti (grucce). */
export type ShelfType = 'ripiano' | 'barra';

export interface Shelf {
  /** Opaco e per sempre (`newShelfId`): gli id di posizioni e categorie sono parole e non devono scontrarsi. */
  id: string;
  name: string;
  /** Posizione in cui sta. Si sceglie alla creazione e poi non cambia (la giacenza la porta anche nella chiave, S1b). */
  locationId: string;
  /** Categoria (id di `libraries`); assente = scaffale generico. */
  libraryId?: string;
  /** Codice (QR o barcode) che lo Scanner riconosce. */
  barcode?: string;
  /** Tag NFC, solo memorizzato: la lettura arriva con la fetta N1. */
  nfcTag?: string;
  // Capacità (S2, ticket 14): tutto facoltativo, da solo o insieme. Assente = nessun limite di quel tipo.
  /** `'barra'` = barra appendiabiti; assente = ripiano (non si salva). */
  kind?: ShelfType;
  /** Misure interne del ripiano in cm. Per la barra conta solo `height`, l'altezza libera sotto la barra. */
  length?: number;
  depth?: number;
  height?: number;
  /** Peso massimo che regge, in kg. */
  maxWeight?: number;
  /** Pezzi massimi (per la barra: grucce). */
  maxPieces?: number;
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
    ...shelfCapacity(input),
  };
}

/** Misure e limiti di uno scaffale (S2). */
export type ShelfCapacity = Pick<Shelf, 'kind' | 'length' | 'depth' | 'height' | 'maxWeight' | 'maxPieces'>;
const CAPACITY_KEYS = ['length', 'depth', 'height', 'maxWeight', 'maxPieces'] as const;

/**
 * Capacità valida di uno scaffale (S2): solo i numeri positivi (i pezzi interi), arrotondati a 3 decimali; `kind`
 * solo se è `'barra'`. Per la barra lunghezza e profondità non contano e non si tengono. Uno scaffale di prima, senza
 * questi campi, resta identico (nessuna chiave in più).
 */
export function shelfCapacity(input: Partial<Record<keyof ShelfCapacity, unknown>>): ShelfCapacity {
  const barra = input.kind === 'barra';
  const out: ShelfCapacity = barra ? { kind: 'barra' } : {};
  for (const key of CAPACITY_KEYS) {
    if (barra && (key === 'length' || key === 'depth')) continue;
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || !(value > 0)) continue;
    if (key === 'maxPieces' && !Number.isInteger(value)) continue;
    out[key] = round3(value);
  }
  return out;
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
    const data = shelfData({
      name: item.name, locationId: item.locationId, libraryId: item.libraryId, barcode: item.barcode, nfcTag: item.nfcTag,
      // S2: capacità, solo i valori validi (gli altri si ignorano alla lettura, senza riscrivere)
      kind: item.kind, length: item.length, depth: item.depth, height: item.height, maxWeight: item.maxWeight, maxPieces: item.maxPieces,
    });
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

/**
 * Il pezzo unico da muovere (S1b): con lo scaffale di **un'altra posizione** (dato arrivato da fuori) torna senza, così
 * il suo primo movimento e Movimenta non scrivono una chiave `posizione/scaffale` sbagliata. Uno scaffale che questo
 * dispositivo non conosce (o un elenco non ancora letto) resta: la chiave `posizione/scaffale` tiene comunque i pezzi
 * nella posizione giusta (forma 2), come la regola di scrittura di S1a. Gli altri prodotti tornano uguali.
 */
export function withShelfRead<T extends Holder>(product: T, shelves: readonly ShelfRef[]): T {
  if (product.stock != null || !product.shelfId) return product;
  const shelf = shelves.find((s) => s.id === product.shelfId);
  if (!shelf || shelf.locationId === product.location) return product;
  const rest = { ...product };
  delete rest.shelfId;
  return rest;
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

/**
 * Quanti prodotti stanno su ogni scaffale (id → attivi e nel cestino): i pezzi unici con la stessa lettura delle
 * schede, gli articoli a quantità con giacenza salvata su `posizione/scaffale` di quella posizione (S1b, anche nel
 * cestino: ripristinati tornerebbero lì).
 */
export function shelfUsage(
  products: readonly (Holder & Pick<Product, 'deletedAt'>)[],
  shelves: readonly ShelfRef[],
): Record<string, { active: number; trashed: number }> {
  const out: Record<string, { active: number; trashed: number }> = {};
  for (const product of products) {
    const ids = new Set<string>();
    const unique = productShelfId(product, shelves);
    if (unique) ids.add(unique);
    for (const [key, qty] of Object.entries(product.stock ?? {})) {
      const { place, shelfId } = splitStockKey(key);
      if (!shelfId || typeof qty !== 'number' || !(qty > 0)) continue;
      const shelf = shelves.find((s) => s.id === shelfId);
      if (shelf && shelf.locationId === place) ids.add(shelf.id);
    }
    for (const id of ids) {
      const entry = out[id] ?? (out[id] = { active: 0, trashed: 0 });
      if (product.deletedAt) entry.trashed += 1; else entry.active += 1;
    }
  }
  return out;
}

/** Nome mostrato per uno scaffale che questo dispositivo non conosce (S1b: la giacenza resta nella sua posizione). */
export const UNKNOWN_SHELF = 'scaffale sconosciuto';

/**
 * Nome di una chiave della giacenza per schede, Cronologia e report: «Magazzino» oppure «Magazzino › A1»; uno
 * scaffale che non è in elenco dice «Magazzino › scaffale sconosciuto» (l'id non si mostra mai).
 */
export function stockPlaceLabel(key: string, placeLabel: (id: string) => string, shelves: readonly Pick<Shelf, 'id' | 'name' | 'locationId'>[]): string {
  const { place, shelfId } = splitStockKey(key);
  if (!shelfId) return placeLabel(key);
  // Uno scaffale di un'altra posizione (dato arrivato da fuori) non si nomina: sarebbe un posto che non c'è
  const shelf = shelves.find((s) => s.id === shelfId && s.locationId === place);
  return placeWithShelf(placeLabel(place), { name: shelf?.name ?? UNKNOWN_SHELF });
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

/** Vero se una di queste posizioni è uno scaffale, per id o per codice. Per la colonna Posizione del CSV, che deve
 *  essere una posizione (l'import salta la riga); la giacenza sugli scaffali passa da `stockKeyFromCsv` (S1b). */
export const isShelfPlace = (shelves: readonly Pick<Shelf, 'id' | 'barcode'>[], places: readonly string[]): boolean =>
  places.some((place) => !!place && shelves.some((s) => s.id === place || (!!s.barcode && s.barcode === place)));

/**
 * Posto scritto nella colonna Giacenza del CSV → chiave di `stock` (S1b). Una posizione resta com'è (anche se non è
 * in elenco, come prima); `posizione/scaffale` con l'id (come esporta l'app) o il nome di uno scaffale di quella
 * posizione; l'id o il codice di uno scaffale da solo vale la sua posizione. `undefined` (riga da saltare): scaffale
 * sconosciuto o di un'altra posizione, separatore con un lato vuoto.
 */
export function stockKeyFromCsv(value: string, shelves: readonly Shelf[]): string | undefined {
  const text = value.trim();
  const { place, shelfId } = splitStockKey(text);
  if (shelfId) {
    const id = shelfIdFromCsv(shelfId, place, shelves);
    return id ? stockKey(place, id) : undefined;
  }
  if (text.includes(SHELF_KEY_SEPARATOR)) return undefined;
  const shelf = shelves.find((s) => s.id === text || (!!s.barcode && s.barcode === text));
  return shelf ? stockKey(shelf.locationId, shelf.id) : text;
}

// ---- Capacità e riempimento (S2, ticket 14 e 15) ----
// Peso e volume del prodotto sono per unità: lo scaffale ne porta quantità × peso (o volume); i pezzi sono la somma
// delle quantità. Un prodotto senza peso o senza le tre misure conta solo per i pezzi.

/** Misure del prodotto che contano per lo scaffale (cm e kg, per unità). */
export type Measured = Pick<Product, 'length' | 'width' | 'height' | 'weight'>;
/** Prodotto per il carico di uno scaffale. */
type Loaded = Measured & Pick<Product, 'location' | 'status' | 'deletedAt' | 'stock' | 'shelfId'>;

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
// Il più grande prima: con i lati in ordine una scatola si confronta in tutti i versi in cui si può girare
const desc = (a: number, b: number) => b - a;
const cm = (value: number) => `${formatNumber(value)} cm`;
const kg = (value: number) => `${formatNumber(value)} kg`;
// Contro gli errori di arrotondamento (0,3 / 0,1 = 2,999…)
const EPS = 1e-9;
const floor = (value: number) => Math.max(0, Math.floor(value + EPS));

/** Lati del prodotto scritti (lunghezza, larghezza, altezza), dal più grande. */
export const productSides = (product: Measured): number[] => [product.length, product.width, product.height].filter(positive).sort(desc);

/** Volume di un pezzo in cm³, solo con le tre misure. */
export function productVolume(product: Measured): number | undefined {
  const { length, width, height } = product;
  return positive(length) && positive(width) && positive(height) ? length * width * height : undefined;
}

/** Volume del ripiano in cm³, solo con le tre misure (la barra non ha volume: conta le grucce). */
export function shelfVolume(shelf: ShelfCapacity): number | undefined {
  if (shelf.kind === 'barra') return undefined;
  const { length, depth, height } = shelf;
  return positive(length) && positive(depth) && positive(height) ? length * depth * height : undefined;
}

/** Vero se lo scaffale ha almeno un limite che dà un riempimento: pezzi, peso o volume. */
export const hasCapacity = (shelf: ShelfCapacity): boolean => positive(shelf.maxPieces) || positive(shelf.maxWeight) || shelfVolume(shelf) != null;
/** Vero se lo scaffale ha qualche misura o limite scritto (anche un solo lato). */
export const hasMeasures = (shelf: ShelfCapacity): boolean => hasCapacity(shelf) || [shelf.length, shelf.depth, shelf.height].some(positive);

export type FitResult = { fits: true } | { fits: false; reason: string };

/**
 * Il singolo prodotto entra nello scaffale vuoto? Ripiano: i lati del prodotto e quelli del ripiano, dal più grande,
 * uno per uno (la scatola si può girare); un lato che manca al prodotto non si controlla, uno che manca al ripiano non
 * limita. Barra: il lato più lungo sotto l'altezza libera. Poi il peso di un pezzo contro il peso massimo.
 */
export function fitsShelf(product: Measured, shelf: ShelfCapacity): FitResult {
  const sides = productSides(product);
  if (shelf.kind === 'barra') {
    if (positive(shelf.height) && sides.length && sides[0] > shelf.height + EPS) {
      return { fits: false, reason: `è lungo ${cm(sides[0])}, sotto la barra ce ne sono ${formatNumber(shelf.height)}` };
    }
  } else {
    const room = [shelf.length, shelf.depth, shelf.height].filter(positive).sort(desc);
    // I lati che mancano al ripiano sono senza limite: stanno davanti, come i più grandi
    const limits = [...Array(3 - room.length).fill(Infinity), ...room];
    const i = sides.findIndex((side, k) => side > limits[k] + EPS);
    if (i >= 0) return { fits: false, reason: `un lato di ${cm(sides[i])} è più grande di ${cm(limits[i])}` };
  }
  if (positive(shelf.maxWeight) && positive(product.weight) && product.weight > shelf.maxWeight + EPS) {
    return { fits: false, reason: `pesa ${kg(product.weight)}, lo scaffale ne regge ${formatNumber(shelf.maxWeight)}` };
  }
  return { fits: true };
}

/** Che cosa occupa uno scaffale: pezzi, kg e cm³. */
export interface ShelfLoad { pieces: number; weight: number; volume: number }

/**
 * Carico dello scaffale: per ogni prodotto la sua quantità su `posizione/scaffale` (`qtyAt`, esatta: un pezzo unico
 * disponibile sul suo scaffale vale 1; venduti e cestino 0), per il suo peso e il suo volume se li ha.
 */
export function shelfLoad(shelf: ShelfRef, products: readonly Loaded[]): ShelfLoad {
  const key = stockKey(shelf.locationId, shelf.id);
  let pieces = 0;
  let weight = 0;
  let volume = 0;
  for (const product of products) {
    const qty = qtyAt(product, key);
    if (!(qty > 0)) continue;
    pieces += qty;
    if (positive(product.weight)) weight += qty * product.weight;
    const v = productVolume(product);
    if (v != null) volume += qty * v;
  }
  return { pieces: round3(pieces), weight: round3(weight), volume: round3(volume) };
}

/**
 * Scaffali su cui sta il prodotto, nell'ordine dell'elenco: il pezzo unico disponibile sul suo, l'articolo a quantità
 * dove ha giacenza su `posizione/scaffale` (stessa lettura di `shelfLoad`). Venduto o nel cestino: nessuno.
 */
export function shelvesOfProduct<T extends Shelf>(product: Loaded, shelves: readonly T[]): T[] {
  return shelves.filter((s) => qtyAt(product, stockKey(s.locationId, s.id)) > 0);
}

/** Fasce del riempimento (ticket 15): verde fino al 50%, blu fino all'80%, rosso oltre. */
export type FillBand = 'verde' | 'blu' | 'rosso';
export type FillBy = 'pezzi' | 'peso' | 'volume';
export interface FillLevel {
  /** Percentuale mostrata, per difetto (199 su 200 è 99%, non «pieno»). Può passare 100. */
  percent: number;
  band: FillBand;
  /** Al 100% o oltre. */
  full: boolean;
  /** Il limite più vicino, che dà il riempimento. */
  by: FillBy;
}

/** Riempimento = il più alto tra pezzi, peso e volume, solo per i limiti scritti. Senza limiti: `null` (niente barra). */
export function fillLevel(shelf: ShelfCapacity, load: ShelfLoad): FillLevel | null {
  const parts: [FillBy, number][] = [];
  if (positive(shelf.maxPieces)) parts.push(['pezzi', load.pieces / shelf.maxPieces]);
  if (positive(shelf.maxWeight)) parts.push(['peso', load.weight / shelf.maxWeight]);
  const volume = shelfVolume(shelf);
  if (volume != null) parts.push(['volume', load.volume / volume]);
  if (!parts.length) return null;
  const [by, ratio] = parts.reduce((a, b) => (b[1] > a[1] ? b : a));
  const percent = Math.floor(ratio * 100 + EPS);
  const band: FillBand = percent <= 50 ? 'verde' : percent <= 80 ? 'blu' : 'rosso';
  return { percent, band, full: percent >= 100, by };
}

/**
 * Quanti pezzi come questo entrano ancora (corsia B, 24/11): il minimo tra pezzi liberi, peso libero / peso del
 * prodotto e volume libero / volume del prodotto, solo per i limiti che si possono calcolare. Quattro esiti:
 * - `non-entra`: un pezzo non entra nemmeno a scaffale vuoto (`fitsShelf`), con il motivo;
 * - `numero`: quanti (anche 0, scaffale pieno), con il limite che decide;
 * - `nessun-limite`: lo scaffale non ha limiti di pezzi, peso o volume;
 * - `non-calcolabile`: lo scaffale ha limiti ma al prodotto mancano il peso o le misure per usarli.
 */
export type FitCount =
  | { kind: 'non-entra'; reason: string }
  | { kind: 'numero'; count: number; by: FillBy }
  | { kind: 'nessun-limite' }
  | { kind: 'non-calcolabile'; missing: 'peso' | 'misure' | 'peso e misure' };

export function fitCount(shelf: ShelfCapacity, product: Measured, load: ShelfLoad): FitCount {
  const fit = fitsShelf(product, shelf);
  if (!fit.fits) return { kind: 'non-entra', reason: fit.reason };
  const counts: [FillBy, number][] = [];
  if (positive(shelf.maxPieces)) counts.push(['pezzi', floor(shelf.maxPieces - load.pieces)]);
  const weightLimit = positive(shelf.maxWeight) ? shelf.maxWeight : undefined;
  // Un limite già pieno vale 0 anche se al prodotto manca il dato per quel limite (revisore di S2: «Pieno» accanto a
  // «ne entrano ancora 15» si contraddicevano)
  if (weightLimit != null && positive(product.weight)) counts.push(['peso', floor((weightLimit - load.weight) / product.weight)]);
  else if (weightLimit != null && load.weight >= weightLimit - EPS) counts.push(['peso', 0]);
  const room = shelfVolume(shelf);
  const one = productVolume(product);
  if (room != null && one != null) counts.push(['volume', floor((room - load.volume) / one)]);
  else if (room != null && load.volume >= room - EPS) counts.push(['volume', 0]);
  if (counts.length) {
    const [by, count] = counts.reduce((a, b) => (b[1] < a[1] ? b : a));
    return { kind: 'numero', count, by };
  }
  if (weightLimit == null && room == null) return { kind: 'nessun-limite' };
  const missing = weightLimit != null && room != null ? 'peso e misure' : weightLimit != null ? 'peso' : 'misure';
  return { kind: 'non-calcolabile', missing };
}

const piecesWord = (n: number, barra?: boolean) => (barra ? (n === 1 ? 'gruccia' : 'grucce') : n === 1 ? 'pezzo' : 'pezzi');

/**
 * Testo di `fitCount` in italiano semplice: «Su A1 ne entrano ancora 5 come questo», «circa» quando decide il volume
 * (le scatole non si incastrano sempre), «Su A1 non entra: un lato di 60 cm è più grande di 50 cm», «A1: nessun limite».
 */
export function fitCountText(result: FitCount, shelfName: string, what = 'come questo'): string {
  switch (result.kind) {
    case 'non-entra':
      return `Su ${shelfName} non entra: ${result.reason}`;
    case 'nessun-limite':
      return `${shelfName}: nessun limite`;
    case 'non-calcolabile':
      return `${shelfName}: per sapere quanti ne entrano ${result.missing === 'peso' ? 'serve il peso' : result.missing === 'misure' ? 'servono le tre misure' : 'servono il peso o le tre misure'} del prodotto`;
    case 'numero': {
      const { count, by } = result;
      if (count === 0) {
        const why = by === 'pezzi' ? 'pezzi al massimo' : by === 'peso' ? 'peso al massimo' : 'spazio finito';
        return `Su ${shelfName} non ne entrano altri: ${why}`;
      }
      const about = by === 'volume' ? 'circa ' : '';
      return `Su ${shelfName} ne ${count === 1 ? 'entra' : 'entrano'} ancora ${about}${formatNumber(count)} ${what}`;
    }
  }
}

/**
 * «Base 50 × 50 cm, alta 30 cm · fino a 10 kg · fino a 20 pezzi» (lunghezza × profondità, poi l'altezza: senza sigle);
 * «Barra appendiabiti · …» con l'altezza libera e le grucce. '' per un ripiano senza misure.
 */
export function capacityText(shelf: ShelfCapacity): string {
  const barra = shelf.kind === 'barra';
  const parts: string[] = [];
  if (barra) {
    parts.push('barra appendiabiti');
    if (positive(shelf.height)) parts.push(`altezza libera ${cm(shelf.height)}`);
  } else {
    const { length, depth, height } = shelf;
    if (positive(length) && positive(depth)) parts.push(`base ${formatNumber(length)} × ${cm(depth)}${positive(height) ? `, alta ${cm(height)}` : ''}`);
    else {
      // Nell'ordine del modulo: Lunghezza, Altezza, Profondità
      if (positive(length)) parts.push(`lunghezza ${cm(length)}`);
      if (positive(height)) parts.push(`altezza ${cm(height)}`);
      if (positive(depth)) parts.push(`profondità ${cm(depth)}`);
    }
  }
  if (positive(shelf.maxWeight)) parts.push(`fino a ${kg(shelf.maxWeight)}`);
  if (positive(shelf.maxPieces)) parts.push(`fino a ${formatNumber(shelf.maxPieces)} ${piecesWord(shelf.maxPieces, barra)}`);
  const text = parts.join(' · ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Percentuale scritta accanto alla barra (UX0: il colore da solo non basta): «72%», «Pieno», «Pieno (110%)». */
export const fillText = (fill: FillLevel): string => (!fill.full ? `${fill.percent}%` : fill.percent > 100 ? `Pieno (${fill.percent}%)` : 'Pieno');

/**
 * Spazio libero in parole: «Liberi: 11 pezzi · 5,5 kg · 60% dello spazio» (il volume in percentuale, non in cm³; quante
 * scatole ci stanno lo dice `fitCount` con un prodotto). '' senza limiti.
 */
export function freeText(shelf: ShelfCapacity, load: ShelfLoad): string {
  const barra = shelf.kind === 'barra';
  const parts: string[] = [];
  if (positive(shelf.maxPieces)) {
    const free = floor(shelf.maxPieces - load.pieces);
    parts.push(`${formatNumber(free)} ${piecesWord(free, barra)}`);
  }
  if (positive(shelf.maxWeight)) parts.push(kg(Math.max(0, round3(shelf.maxWeight - load.weight))));
  const room = shelfVolume(shelf);
  if (room != null) parts.push(`${floor(((room - load.volume) / room) * 100)}% dello spazio`);
  return parts.length ? `Liberi: ${parts.join(' · ')}` : '';
}

/** Misure del prodotto in breve, per «come VIS-0142»: «40 × 30 × 20 cm · 2,1 kg». '' senza misure né peso. */
export function measuresText(product: Measured): string {
  const sides = [product.length, product.width, product.height].filter(positive);
  const parts = [sides.length ? `${sides.map(formatNumber).join(' × ')} cm` : '', positive(product.weight) ? kg(product.weight) : ''];
  return parts.filter(Boolean).join(' · ');
}

/** Campi numerici del modulo degli scaffali, con il nome mostrato (nei messaggi d'errore). */
export const CAPACITY_LABELS: Record<(typeof CAPACITY_KEYS)[number], string> = {
  length: 'Lunghezza', depth: 'Profondità', height: 'Altezza', maxWeight: 'Peso massimo', maxPieces: 'Pezzi massimi',
};
const BARRA_LABELS: Partial<Record<(typeof CAPACITY_KEYS)[number], string>> = { height: 'Altezza libera', maxPieces: 'Grucce massime' };
/** Nome di un campo della capacità per il tipo di scaffale. */
export const capacityLabel = (key: (typeof CAPACITY_KEYS)[number], kind?: ShelfType): string =>
  (kind === 'barra' && BARRA_LABELS[key]) || CAPACITY_LABELS[key];

/**
 * Testi scritti nel modulo → capacità da salvare, oppure il primo errore. Vuoto = nessun limite; un numero deve
 * essere maggiore di zero (i pezzi interi). Per la barra lunghezza e profondità non si leggono.
 */
export function capacityFromForm(
  kind: ShelfType,
  texts: Partial<Record<(typeof CAPACITY_KEYS)[number], string>>,
): { capacity: ShelfCapacity; error?: undefined } | { error: string; capacity?: undefined } {
  const values: Partial<Record<(typeof CAPACITY_KEYS)[number], number>> = {};
  for (const key of CAPACITY_KEYS) {
    if (kind === 'barra' && (key === 'length' || key === 'depth')) continue;
    const raw = (texts[key] ?? '').trim();
    if (!raw) continue;
    const parsed = parseNumber(raw);
    // Arrotondato come si salva: «0,0004» diventerebbe 0 e lo scaffale resterebbe senza quel limite senza dirlo
    const value = parsed == null ? undefined : round3(parsed);
    const name = capacityLabel(key, kind);
    if (value == null || !(value > 0)) return { error: `${name}: scrivi un numero maggiore di zero, oppure lascialo vuoto.` };
    if (key === 'maxPieces' && !Number.isInteger(value)) return { error: `${name}: scrivi un numero intero.` };
    values[key] = value;
  }
  return { capacity: shelfCapacity({ kind, ...values }) };
}
