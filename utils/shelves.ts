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
/** Prodotto per il carico di uno scaffale (S3: con l'unità, per kg e metri). */
type Loaded = Measured & Pick<Product, 'location' | 'status' | 'deletedAt' | 'stock' | 'shelfId'> & Partial<Pick<Product, 'unit'>>;

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

/** Unità contate come una cosa sola su uno scaffale (un rotolo, un sacco): decisione 1 dell'orchestratore, 24/11. */
const BULK_UNITS: readonly string[] = ['kg', 'm'];

/**
 * Che cosa porta su uno scaffale (o in una posizione) un prodotto che ci ha `qty` (S3). Un articolo in kg o in metri è
 * **una cosa sola** (1 pezzo, il suo volume una volta); in kg la quantità è anche il suo peso, in metri pesa il suo peso
 * una volta. Gli altri: `qty` pezzi, `qty` × peso e `qty` × volume, come in S2.
 */
export function loadOf(product: Measured & Partial<Pick<Product, 'unit'>>, qty: number): ShelfLoad {
  if (!(qty > 0)) return { pieces: 0, weight: 0, volume: 0 };
  const bulk = !!product.unit && BULK_UNITS.includes(product.unit);
  const n = bulk ? 1 : qty;
  const weight = bulk && product.unit === 'kg' ? qty : positive(product.weight) ? n * product.weight : 0;
  const v = productVolume(product);
  return { pieces: n, weight, volume: v != null ? n * v : 0 };
}

/**
 * Carico dello scaffale: per ogni prodotto la sua quantità su `posizione/scaffale` (`qtyAt`, esatta: un pezzo unico
 * disponibile sul suo scaffale vale 1; venduti e cestino 0), con il suo peso e il suo volume se li ha (`loadOf`).
 */
export function shelfLoad(shelf: ShelfRef, products: readonly Loaded[]): ShelfLoad {
  return placeLoad(stockKey(shelf.locationId, shelf.id), products);
}

/** Carico di una chiave della giacenza: uno scaffale (`posizione/scaffale`) o una posizione con i suoi scaffali. */
export function placeLoad(key: string, products: readonly Loaded[]): ShelfLoad {
  let pieces = 0;
  let weight = 0;
  let volume = 0;
  for (const product of products) {
    const one = loadOf(product, qtyAt(product, key));
    pieces += one.pieces;
    weight += one.weight;
    volume += one.volume;
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

// ---- Avviso, blocco e proposta (S3, ticket 15; capienza delle posizioni in pezzi, AU-V13) ----
// Un solo calcolo: `checkShelfLoad` per uno scaffale, `checkPlaceLoad` per una posizione con `capacity`; le schermate
// li chiamano tramite `hooks/useLoadCheck.ts`. Prima di un carico o di uno spostamento il controllo dice se si va
// avanti (`ok`), se serve l'avviso (dall'80%) o se scatta il blocco (il prodotto non entra), con la proposta di un
// altro posto adatto. Con il blocco non si scrive nulla.

/** Esito del controllo. */
export type LoadLevel = 'ok' | 'avviso' | 'blocco';

/** Un altro posto proposto: dove il prodotto entra e che resta sotto l'80% dopo il carico. */
export interface LoadProposal {
  /** Chiave della giacenza: `posizione/scaffale` per uno scaffale, la posizione per una posizione. */
  key: string;
  locationId: string;
  shelfId?: string;
  name: string;
  /** Libero dopo il carico, in percentuale (per difetto); assente se il posto non ha limiti. */
  freePercent?: number;
  /** Perché va bene: «Su A2 ne entrano ancora 5 come questo», «A2: nessun limite». */
  why: string;
}

export interface LoadCheck {
  level: LoadLevel;
  /** Nome del posto: «A1», «Vetrina». */
  name: string;
  /** Scaffale o posizione (per il testo dell'avviso). */
  place: 'scaffale' | 'posizione';
  /** Riempimento dopo il carico (null senza limiti). */
  fill: FillLevel | null;
  /** Motivo del blocco, coi numeri: «21 pezzi, il massimo è 20», «Un lato di 60 cm è più grande di 50 cm». */
  reason?: string;
  /** Con l'avviso o il blocco: il posto proposto, se ce n'è uno. */
  proposal?: LoadProposal;
}

/** Il prodotto in arrivo: `before` è la sua quantità già lì (0 per un prodotto nuovo), `add` quella che arriva. */
export interface Incoming {
  product: Measured & Partial<Pick<Product, 'unit' | 'libraryId'>>;
  before: number;
  add: number;
}

const sumLoad = (a: ShelfLoad, b: ShelfLoad): ShelfLoad => ({
  pieces: round3(a.pieces + b.pieces), weight: round3(a.weight + b.weight), volume: round3(a.volume + b.volume),
});
const minusLoad = (a: ShelfLoad, b: ShelfLoad): ShelfLoad => ({
  pieces: round3(a.pieces - b.pieces), weight: round3(a.weight - b.weight), volume: round3(a.volume - b.volume),
});
/** Che cosa aggiunge il prodotto in arrivo (per kg e metri: niente pezzi in più se c'era già). */
export const incomingLoad = ({ product, before, add }: Incoming): ShelfLoad =>
  minusLoad(loadOf(product, before + add), loadOf(product, before));
const upperFirst = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Limiti dopo il carico: il primo superato (pezzi, poi peso, poi spazio) dà il blocco col motivo, sulla quantità vera
 * e non sulla percentuale per difetto (30,2 kg su 30 non entrano anche se la barra direbbe «Pieno»). Altrimenti avviso
 * dall'80% (con la percentuale per difetto, la stessa accanto alla barra: decisione 2 dell'orchestratore, 24/11).
 */
function limitsAfter(shelf: ShelfCapacity, after: ShelfLoad): { level: LoadLevel; reason?: string; fill: FillLevel | null } {
  const fill = fillLevel(shelf, after);
  const barra = shelf.kind === 'barra';
  if (positive(shelf.maxPieces) && after.pieces > shelf.maxPieces + EPS) {
    return { level: 'blocco', fill, reason: `${formatNumber(after.pieces)} ${piecesWord(after.pieces, barra)}, il massimo è ${formatNumber(shelf.maxPieces)}` };
  }
  if (positive(shelf.maxWeight) && after.weight > shelf.maxWeight + EPS) {
    return { level: 'blocco', fill, reason: `${kg(after.weight)}, il massimo è ${kg(shelf.maxWeight)}` };
  }
  const room = shelfVolume(shelf);
  if (room != null && after.volume > room + EPS) {
    return { level: 'blocco', fill, reason: `Lo spazio non basta: si arriverebbe al ${Math.floor((after.volume / room) * 100 + EPS)}%` };
  }
  return { level: fill && fill.percent >= 80 ? 'avviso' : 'ok', fill };
}

/**
 * Come cercare la proposta (revisore di S3): `incomingFor` dà la merce che arriverebbe davvero in un altro posto (per
 * uno spostamento parte altro: `moveSources` verso quel posto), `null` se lì non arriva nulla (il posto di partenza);
 * `accept` scarta una proposta per un altro motivo (la posizione che la contiene oltre la capienza); `noProposal` salta
 * la ricerca (il ricontrollo di una proposta non ne cerca altre).
 */
export interface ProposalOptions {
  incomingFor?: (key: string) => Incoming | null;
  accept?: (proposal: LoadProposal) => boolean;
  noProposal?: boolean;
}

/** Libero dopo il carico in percentuale (per difetto), o assente senza limiti. */
const freeAfter = (fill: FillLevel | null): number | undefined => (fill ? Math.max(0, 100 - fill.percent) : undefined);

/**
 * Controllo del carico su uno scaffale (S3). `products` sono i prodotti salvati (il carico di adesso), `incoming` il
 * prodotto che arriva. Blocco se un pezzo non entra nemmeno a scaffale vuoto (`fitsShelf`: lato, altezza della barra,
 * peso di un pezzo) o se dopo il carico si supera un limite; avviso dall'80%. Con l'avviso e il blocco, la proposta
 * (`proposeShelf`) tra gli altri scaffali della stessa posizione. Uno scaffale senza misure né limiti dà sempre ok.
 */
export function checkShelfLoad(
  shelf: Shelf,
  products: readonly Loaded[],
  incoming: Incoming,
  others: { shelves: readonly Shelf[]; categories: readonly CategoryNode[] } & ProposalOptions,
): LoadCheck {
  const base = { name: shelf.name, place: 'scaffale' as const };
  if (!hasMeasures(shelf)) return { ...base, level: 'ok', fill: null };
  const fit = fitsShelf(incoming.product, shelf);
  const after = sumLoad(shelfLoad(shelf, products), incomingLoad(incoming));
  const result = fit.fits ? limitsAfter(shelf, after) : { level: 'blocco' as const, reason: upperFirst(fit.reason), fill: fillLevel(shelf, after) };
  if (result.level === 'ok' || others.noProposal) return { ...base, ...result };
  const proposal = proposeShelf(shelf, products, incoming, others);
  return { ...base, ...result, ...(proposal && { proposal }) };
}

/**
 * Scaffale proposto (ticket 15, «Scaffale proposto»): tra gli altri scaffali della stessa posizione in cui il prodotto
 * entra e che restano sotto l'80% dopo il carico, prima quelli della sua categoria (o di una sopra), poi i generici;
 * a parità quello con più spazio libero; quelli senza limiti dopo quelli con i limiti (non si sa quanto spazio
 * hanno), per nome. Nessuno adatto: `undefined`. Filtro, ordine e «libero al» si calcolano con la merce che arriverebbe
 * davvero in ogni scaffale (`incomingFor`, revisore di S3); `accept` scarta per la posizione (`checkLoadAt`).
 */
export function proposeShelf(
  shelf: Shelf,
  products: readonly Loaded[],
  incoming: Incoming,
  { shelves, categories, accept, incomingFor }: { shelves: readonly Shelf[]; categories: readonly CategoryNode[] } & ProposalOptions,
): LoadProposal | undefined {
  const { product } = incoming;
  const own = product.libraryId ? [product.libraryId, ...categoryAncestors(categories, product.libraryId).map((c) => c.id)] : [];
  const candidates = shelvesFor(shelves, categories, { location: shelf.locationId, libraryId: product.libraryId })
    .filter((s) => s.id !== shelf.id && fitsShelf(product, s).fits)
    .flatMap((s) => {
      // La merce che arriverebbe davvero qui (senza `incomingFor`: quella in arrivo, come se lì non ce ne fosse)
      const inc = incomingFor ? incomingFor(stockKey(s.locationId, s.id)) : { ...incoming, before: 0 };
      if (!inc || !(inc.add > 0)) return [];
      const now = shelfLoad(s, products);
      const fill = hasCapacity(s) ? fillLevel(s, sumLoad(now, incomingLoad(inc))) : null;
      return [{ s, now, fill, group: s.libraryId && own.includes(s.libraryId) ? 0 : 1 }];
    })
    // Sotto l'80% dopo il carico (il riempimento è il più alto dei limiti: sotto l'80% nessuno è superato)
    .filter(({ fill }) => !fill || fill.percent < 80);
  candidates.sort((a, b) => a.group - b.group
    || Number(!a.fill) - Number(!b.fill)
    || (a.fill && b.fill ? a.fill.percent - b.fill.percent : 0)
    || byName(a.s, b.s));
  for (const best of candidates) {
    const free = freeAfter(best.fill);
    const proposal: LoadProposal = {
      key: stockKey(best.s.locationId, best.s.id),
      locationId: best.s.locationId,
      shelfId: best.s.id,
      name: best.s.name,
      ...(free != null && { freePercent: free }),
      why: fitCountText(fitCount(best.s, product, best.now), best.s.name),
    };
    if (!accept || accept(proposal)) return proposal;
  }
  return undefined;
}

/** Posizione con la capienza in pezzi (`Location.capacity`, Impostazioni › Posizioni). */
export interface CappedPlace { id: string; label: string; capacity?: number }
const placeCapacity = (place: CappedPlace): ShelfCapacity => {
  const max = positive(place.capacity) ? Math.floor(place.capacity + EPS) : 0;
  return max > 0 ? { maxPieces: max } : {};
};

/**
 * Controllo della capienza di una posizione (AU-V13): la stessa regola degli scaffali, contando i **pezzi** (un pezzo
 * unico 1, un articolo a quantità la sua quantità, uno in kg o metri 1) e non i prodotti. Senza `capacity`: ok. La
 * proposta è la prima posizione dopo questa nell'elenco (poi quelle prima) dove entra e resta sotto l'80%; una
 * posizione senza capienza entra sempre.
 */
export function checkPlaceLoad(
  place: CappedPlace,
  products: readonly Loaded[],
  incoming: Incoming,
  places: readonly CappedPlace[],
  { accept, incomingFor, noProposal }: ProposalOptions = {},
): LoadCheck {
  const base = { name: place.label, place: 'posizione' as const };
  const cap = placeCapacity(place);
  if (!positive(cap.maxPieces)) return { ...base, level: 'ok', fill: null };
  const result = limitsAfter(cap, sumLoad(placeLoad(place.id, products), incomingLoad(incoming)));
  if (result.level === 'ok' || noProposal) return { ...base, ...result };
  const at = places.findIndex((p) => p.id === place.id);
  const order = at >= 0 ? [...places.slice(at + 1), ...places.slice(0, at)] : places.filter((p) => p.id !== place.id);
  for (const other of order) {
    const inc = incomingFor ? incomingFor(other.id) : { ...incoming, before: 0 };
    if (!inc || !(inc.add > 0)) continue; // lì non arriverebbe nulla: è da dove parte
    const otherCap = placeCapacity(other);
    const now = placeLoad(other.id, products);
    const fill = positive(otherCap.maxPieces) ? fillLevel(otherCap, sumLoad(now, incomingLoad(inc))) : null;
    if (fill && fill.percent >= 80) continue;
    const free = freeAfter(fill);
    const proposal: LoadProposal = {
      key: other.id, locationId: other.id, name: other.label, ...(free != null && { freePercent: free }),
      why: fitCountText(fitCount(otherCap, incoming.product, now), other.label),
    };
    if (!accept || accept(proposal)) return { ...base, ...result, proposal };
  }
  return { ...base, ...result };
}

/** Da dove arriva la merce: la chiave di partenza (assente per un carico) e la quantità. */
export type LoadSource = { from?: string; qty: number };
/** Il prodotto che arriva: salvato (con `id`) o nuovo (Aggiungi), con misure, unità e categoria. */
export type LoadProduct = Incoming['product'] & Partial<Pick<Product, 'id'>>;
/** I dati per il controllo: prodotti salvati (la copia più recente), scaffali, categorie e posizioni. */
export interface LoadData {
  products: readonly (Loaded & Partial<Pick<Product, 'id'>>)[];
  shelves: readonly Shelf[];
  categories: readonly CategoryNode[];
  locations: readonly CappedPlace[];
}
const RANK: Record<LoadLevel, number> = { ok: 0, avviso: 1, blocco: 2 };

/** Quanto arriva davvero in `to` da `sources`: per uno scaffale la merce che non è già lì, per una posizione quella
 *  che viene da fuori. 0 = non si sposta nulla (la partenza è già lì). */
function arrivingAt(to: string, sources: readonly LoadSource[]): number {
  const { place, shelfId } = splitStockKey(to);
  const from = (s: LoadSource) => (shelfId ? s.from !== to : !s.from || splitStockKey(s.from).place !== place);
  return round3(sources.filter(from).reduce((a, s) => a + (s.qty > 0 ? s.qty : 0), 0));
}

/**
 * Il controllo completo di un carico verso `to` (una posizione o `posizione/idScaffale`), quello che chiamano tutte le
 * schermate (`hooks/useLoadCheck.ts`): lo scaffale (`checkShelfLoad`) e, se la posizione ha una capienza, la posizione
 * (`checkPlaceLoad`, con la merce che arriva da fuori). Vale il più grave; a parità quello con una proposta, poi la
 * posizione (revisore di S3: la proposta di un altro scaffale non deve scavalcare una posizione piena). Ogni proposta
 * si cerca con la merce che ci arriverebbe davvero (`sourcesFor`, per uno spostamento `moveSources` verso quel posto):
 * sotto l'80% dopo il carico vero, mai il posto di partenza (nulla da spostare); uno scaffale proposto solo se la sua
 * posizione non va oltre la capienza (l'avviso della posizione basta). Il ricontrollo della posizione non cerca altre
 * proposte (`noProposal`).
 * `soloScaffale`: senza la posizione (l'import la controlla a parte, con la somma della riga).
 */
export function checkLoadAt(
  data: LoadData,
  product: LoadProduct,
  to: string,
  sources: readonly LoadSource[],
  opts: { sourcesFor?: (key: string) => readonly LoadSource[]; soloScaffale?: boolean } = {},
): LoadCheck {
  const sourcesFor = opts.sourcesFor ?? (() => sources);
  const saved = product.id ? data.products.find((p) => p.id === product.id) : undefined;
  /** La merce che arriverebbe in `key` (uno scaffale o una posizione) da `from`; `null` se non ne arriva. */
  const incomingAt = (key: string, from: readonly LoadSource[]): Incoming | null => {
    const add = arrivingAt(key, from);
    return add > 0 ? { product, before: saved ? qtyAt(saved, key) : 0, add } : null;
  };
  const results = (key: string, from: readonly LoadSource[], proposals: ProposalOptions, soloScaffale = false): LoadCheck[] => {
    const { place, shelfId } = splitStockKey(key);
    const location = data.locations.find((l) => l.id === place);
    const shelf = shelfId ? data.shelves.find((s) => s.id === shelfId && s.locationId === place) : undefined;
    const out: LoadCheck[] = [];
    const toShelf = shelf ? incomingAt(key, from) : null;
    if (shelf && toShelf) out.push(checkShelfLoad(shelf, data.products, toShelf, { shelves: data.shelves, categories: data.categories, ...proposals }));
    const toPlace = !soloScaffale && location?.capacity ? incomingAt(place, from) : null;
    if (location && toPlace) out.push(checkPlaceLoad(location, data.products, toPlace, data.locations, proposals));
    return out;
  };
  // Le proposte si cercano con la merce che arriverebbe davvero in ogni posto (`sourcesFor`); uno scaffale proposto
  // dentro una posizione con capienza va bene solo se la posizione non va oltre il limite (l'avviso basta)
  const proposals: ProposalOptions = {
    incomingFor: (key) => incomingAt(key, sourcesFor(key)),
    accept: (p) => !p.shelfId || results(p.key, sourcesFor(p.key), { noProposal: true })
      .every((r) => r.place === 'scaffale' || r.level !== 'blocco'),
  };
  const found = results(to, sources, proposals, opts.soloScaffale);
  if (!found.length) {
    const { place, shelfId } = splitStockKey(to);
    const shelf = shelfId ? data.shelves.find((s) => s.id === shelfId) : undefined;
    return { level: 'ok', name: shelf ? shelf.name : data.locations.find((l) => l.id === place)?.label ?? place, place: shelf ? 'scaffale' : 'posizione', fill: null };
  }
  const worst = Math.max(...found.map((r) => RANK[r.level]));
  const top = found.filter((r) => RANK[r.level] === worst);
  return top.find((r) => r.proposal && r.place === 'posizione') ?? top.find((r) => r.proposal)
    ?? top.find((r) => r.place === 'posizione') ?? top[0];
}

/**
 * Capienza di una posizione dopo una Conta (solo informazione, ticket 15): i pezzi che ci saranno con le quantità
 * contate (`counted`: id → quantità, solo le scritte; gli altri prodotti come sono). Senza `capacity`: ok.
 */
export function checkPlaceCount(
  place: CappedPlace,
  products: readonly (Loaded & Pick<Product, 'id'>)[],
  counted: Readonly<Record<string, number>>,
): LoadCheck {
  const base = { name: place.label, place: 'posizione' as const };
  const cap = placeCapacity(place);
  if (!positive(cap.maxPieces)) return { ...base, level: 'ok', fill: null };
  let after: ShelfLoad = { pieces: 0, weight: 0, volume: 0 };
  for (const product of products) after = sumLoad(after, loadOf(product, counted[product.id] ?? qtyAt(product, place.id)));
  return { ...base, ...limitsAfter(cap, after) };
}

/** «all'85%», «al 90%» (l'articolo davanti al numero). */
const atPercent = (n: number) => (/^(8\d?|11|1)$/.test(String(n)) ? `all'${n}%` : `al ${n}%`);

/** Avviso in una riga (UX0): «A1 sarà pieno all'85%», «A1 sarà pieno»; per una posizione «Vetrina sarà piena…». */
export function loadWarningText(check: Pick<LoadCheck, 'name' | 'place' | 'fill'>): string {
  const full = check.place === 'posizione' ? 'piena' : 'pieno';
  const percent = check.fill?.percent ?? 0;
  return percent >= 100 ? `${check.name} sarà ${full}` : `${check.name} sarà ${full} ${atPercent(percent)}`;
}

/** Titolo della finestra del blocco: «Non entra in A1». */
export const loadBlockTitle = (check: Pick<LoadCheck, 'name'>): string => `Non entra in ${check.name}`;

/** Pulsante della proposta: «Metti in A2 (libero al 40%)»; senza limiti «Metti in A2». */
export const proposalLabel = (proposal: Pick<LoadProposal, 'name' | 'freePercent'>): string =>
  (proposal.freePercent != null ? `Metti in ${proposal.name} (libero ${atPercent(proposal.freePercent)})` : `Metti in ${proposal.name}`);

/** Riga quando nessun posto basta (il primario non c'è). */
export const noProposalText = (check: Pick<LoadCheck, 'place'>): string =>
  (check.place === 'posizione' ? "Nessun'altra posizione ha posto." : 'Nessun altro scaffale di questa posizione ha posto.');

/** Solo informazione (Conta, Audit, import): l'etichetta piccola sulla riga. */
export const OVER_LIMIT = 'oltre il limite';

/** Informazione in una frase (Audit, import, Conta): «A1 è oltre il limite: 21 pezzi, il massimo è 20». */
export const overLimitText = (check: Pick<LoadCheck, 'name' | 'reason'>): string =>
  `${check.name} è ${OVER_LIMIT}${check.reason ? `: ${check.reason.charAt(0).toLowerCase()}${check.reason.slice(1)}` : ''}`;
