// Righe dell'export CSV dei prodotti (Impostazioni › Esporta) e lettura del CSV all'import.
// P07: l'export includeva i prodotti nel cestino senza segnarli e non aveva la cartella, che si perdeva
// nel giro esporta-importa. Le foto salvate sul dispositivo non entrano nel CSV (solo i link http).
// M08 (ticket 09): colonne Unità, Giacenza e Scorta minima per gli articoli a quantità, più i due report
// (giacenze e movimenti). Nel CSV dei prodotti le posizioni sono id (l'app lo rilegge), nei report sono nomi.
// C1 (ticket 19): «Categoria» è la cartella, col nome completo «Pellicce › Visone», e «Tipo di pelle» è `furType`.
// Le intestazioni sono cambiate tre volte; l'import riconosce il file dall'intestazione (`productCsvFormat`).
// S1a (ticket 13): colonna «Scaffale» in fondo, col nome dello scaffale (unico dentro la posizione del prodotto).
// S1b: la giacenza sugli scaffali sta nella colonna Giacenza, con le chiavi salvate (`magazzino/<idScaffale>:3`).
import type { Product, TimelineEvent } from '../types';
import { categoryPath, categoryTree, type CategoryNode } from './categories';
import { furTypeFromCsv, type FurType } from './furTypes';
import { parseStoredNumber } from './number';
import { isShelfPlace, productShelf, shelfIdFromCsv, stockKeyFromCsv, type Shelf } from './shelves';
import {
  DEFAULT_UNIT, isLowStock, isStocked, MOVEMENT_LABELS, placeOfKey, REASON_LABELS, round3, SHELF_KEY_SEPARATOR, stockOf,
} from './stock';

/** Ordine delle chiavi nel CSV: la posizione principale, poi i suoi scaffali, poi le altre (come erano). */
const mainFirst = (location: string) => (key: string) => (key === location ? 2 : placeOfKey(key) === location ? 1 : 0);

// Stesse posizioni delle colonne di prima di C1: cambiano solo i nomi della seconda («Categoria» → «Tipo di pelle»)
// e della sedicesima («Cartella» → «Categoria»). «Scaffale» (S1a) è l'ultima: le altre restano dove erano.
export const PRODUCT_CSV_HEADER = ['SKU', 'Tipo di pelle', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON', 'Categoria', 'Unità', 'Giacenza', 'Scorta minima', 'Scaffale'];

/**
 * Giacenza di un articolo a quantità per il CSV: «magazzino:12; vetrina:2.5», con la posizione principale per
 * prima e anche a 0 (così un esaurito resta articolo a quantità). Pezzo unico: vuota. Gli scaffali (S1b) con la
 * chiave salvata, «magazzino/<idScaffale>:3», che l'import rilegge uguale.
 */
export function stockCell(product: Pick<Product, 'location' | 'stock'>): string {
  if (!isStocked(product)) return '';
  const entries = Object.entries(product.stock ?? {})
    .filter(([place, qty]) => place && typeof qty === 'number' && Number.isFinite(qty) && (qty > 0 || place === product.location))
    .map(([place, qty]) => [place, round3(Math.max(0, qty))] as const);
  if (!entries.some(([place]) => placeOfKey(place) === product.location)) entries.push([product.location, 0]);
  const rank = mainFirst(product.location);
  entries.sort(([a], [b]) => rank(b) - rank(a));
  return entries.map(([place, qty]) => `${place}:${qty}`).join('; ');
}

/**
 * Cella Giacenza letta dal CSV: vuota → `null` (pezzo unico, come i CSV di prima); scritta ma non valida
 * (quantità negativa o illeggibile, posizione mancante) → `undefined`, e la riga si salta invece di diventare
 * un pezzo unico. Numeri con `parseStoredNumber` («2.5» del file = 2,5).
 */
export function parseStockCell(text: string): Record<string, number> | null | undefined {
  const parts = text.split(';').map((part) => part.trim()).filter(Boolean);
  if (!text.trim()) return null;
  if (!parts.length) return undefined;
  const stock: Record<string, number> = {};
  for (const part of parts) {
    const at = part.lastIndexOf(':');
    const place = at > 0 ? part.slice(0, at).trim() : '';
    const qty = at > 0 ? parseStoredNumber(part.slice(at + 1)) : undefined;
    if (!place || qty == null || qty < 0) return undefined;
    stock[place] = round3((stock[place] ?? 0) + qty);
  }
  return stock;
}

/** Intestazione più una riga per ogni prodotto non nel cestino. «Scaffale»: il nome, se il pezzo unico ci sta davvero. */
export function productCsvRows(products: readonly Product[], categories: readonly CategoryNode[], shelves: readonly Shelf[] = []): unknown[][] {
  return [
    PRODUCT_CSV_HEADER,
    ...products.filter((p) => !p.deletedAt).map((product) => [
      product.sku,
      product.furType,
      product.location,
      product.status,
      product.purchasePrice,
      product.sellPrice,
      product.length,
      product.width,
      product.weight,
      product.technicalNotes,
      product.productionDate,
      JSON.stringify(product.backupImageLinks?.length ? product.backupImageLinks : (product.images || []).filter((uri) => /^https?:\/\//i.test(uri))),
      JSON.stringify(product.customData || []),
      product.gs1DigitalLink,
      JSON.stringify(product.backupCustomDataLinks || {}),
      categoryPath(categories, product.libraryId),
      isStocked(product) ? product.unit || DEFAULT_UNIT : '',
      stockCell(product),
      product.minStock,
      productShelf(product, shelves)?.name ?? '',
    ]),
  ];
}

// Maiuscole, accenti e spazi indifferenti (anche nelle intestazioni: «Unità» → «unita»)
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

/**
 * Categoria scritta nel CSV → id di una categoria esistente, altrimenti nessuna. Si confronta prima col nome
 * completo di ogni categoria («Pellicce › Visone», anche scritto con «>»), poi con l'id, poi col solo nome (la
 * prima nell'ordine dell'albero): due categorie possono avere una sottocategoria con lo stesso nome.
 */
export function libraryIdFromCsv(value: string, categories: readonly CategoryNode[]): string | undefined {
  const key = (text: string) => fold(text).replace(/\s*[›>]\s*/g, ' › ');
  const v = key(value);
  if (!v) return undefined;
  const tree = categoryTree(categories).map(({ category }) => category);
  return (tree.find((c) => key(categoryPath(categories, c.id)) === v)
    ?? tree.find((c) => fold(c.id) === v)
    ?? tree.find((c) => fold(c.name) === v))?.id;
}

/** I tre formati del CSV dei prodotti, riconosciuti dall'intestazione (ticket 19). */
export type ProductCsvFormat = 'pre-m01' | 'm01' | 'c1';

/**
 * Formato dall'intestazione, non dalla posizione: con la colonna «Cartella», oppure senza «Tipo di pelle», il file
 * è di prima di C1 e «Categoria» vuol dire tipo di pelle (M01-M10; prima di M01 c'era «Tipo Pelle»); altrimenti è
 * di C1 e «Categoria» è la cartella.
 */
export function productCsvFormat(header: readonly string[]): ProductCsvFormat {
  const names = header.map(fold);
  if (names.includes('cartella') || !names.includes('tipo di pelle')) return names.includes('categoria') ? 'm01' : 'pre-m01';
  return 'c1';
}

/** Colonne del CSV dei prodotti: indice di ognuna nell'intestazione (-1 se manca) e formato del file. */
export function productCsvColumns(header: readonly string[]) {
  const names = header.map(fold);
  // La prima colonna del file che ha uno dei nomi (come prima di C1)
  const column = (...options: string[]) => names.findIndex((name) => options.includes(name));
  const format = productCsvFormat(header);
  const old = format !== 'c1';
  return {
    format,
    sku: column('sku', 'codice sku'),
    furType: old ? column('tipo di pelle', 'categoria', 'tipo pelle', 'tipo pelliccia', 'fur type') : column('tipo di pelle', 'tipo pelle', 'tipo pelliccia', 'fur type'),
    category: old ? column('cartella', 'folder', 'library') : column('categoria', 'category', 'folder', 'library'),
    location: column('posizione', 'location'),
    status: column('status', 'stato'),
    purchasePrice: column('prezzo acquisto', 'purchase price'),
    sellPrice: column('prezzo vendita', 'sell price'),
    length: column('lunghezza', 'length'),
    width: column('larghezza', 'width'),
    weight: column('peso', 'weight'),
    notes: column('note', 'note tecniche', 'technical notes'),
    images: column('immagini url', 'immagini', 'foto url', 'images'),
    customData: column('dati personalizzati json', 'custom data json'),
    productionDate: column('data produzione', 'production date'),
    gs1: column('gs1 digital link', 'gs1'),
    backupAttachments: column('link allegati drive json', 'drive attachments json'),
    // M08: articoli a quantità
    unit: column('unita', 'unit'),
    stock: column('giacenza', 'stock'),
    minStock: column('scorta minima', 'min stock'),
    // S1a: scaffale (nome dentro la posizione)
    shelf: column('scaffale', 'shelf'),
  };
}

export type ProductCsvColumns = ReturnType<typeof productCsvColumns>;

/**
 * Una riga del CSV → dati del prodotto da aggiungere, con la giacenza per `addProduct(dati, { stock })`.
 * `null` se la riga si salta: SKU vuoto, giacenza scritta ma non valida, posizione che è uno scaffale o contiene il
 * separatore `/`, giacenza su uno scaffale sconosciuto (lo SKU già presente lo controlla chi importa). La giacenza
 * può stare su uno scaffale (S1b, `stockKeyFromCsv`: chiave esportata, posizione/nome, id o codice dello scaffale).
 * Tipo di pelle e categoria si cercano per id o nome; la categoria anche col nome completo. La colonna Scaffale si
 * cerca per nome tra quelli della posizione del prodotto, solo per i pezzi unici; uno sconosciuto si perde, come una
 * categoria (per un articolo a quantità lo scaffale è nella Giacenza).
 */
export function productFromCsvRow(
  row: readonly string[],
  cols: ProductCsvColumns,
  lists: { categories: readonly CategoryNode[]; furTypes: readonly FurType[]; shelves?: readonly Shelf[] },
): { product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>; stock: Record<string, number> | null } | null {
  const valueAt = (index: number) => (index < 0 ? '' : (row[index] || '').trim());
  const numberAt = (index: number) => parseStoredNumber(valueAt(index)); // «2.125» dell'export = 2,125
  const jsonAt = <T,>(index: number, fallback: T): T => {
    if (index < 0 || !valueAt(index)) return fallback;
    try { return JSON.parse(valueAt(index)) as T; } catch { return fallback; }
  };
  const sku = valueAt(cols.sku);
  if (!sku) return null;
  // Giacenza vuota: pezzo unico come prima; scritta ma non valida: riga saltata (non diventa 1 pezzo)
  const written = parseStockCell(valueAt(cols.stock));
  if (written === undefined) return null;
  const shelves = lists.shelves ?? [];
  const location = valueAt(cols.location);
  if (location.includes(SHELF_KEY_SEPARATOR) || isShelfPlace(shelves, [location])) return null;
  let stock: Record<string, number> | null = null;
  if (written) {
    stock = {};
    for (const [place, qty] of Object.entries(written)) {
      const key = stockKeyFromCsv(place, shelves);
      if (!key) return null;
      stock[key] = round3((stock[key] ?? 0) + qty);
    }
  }
  const shelfId = stock ? undefined : shelfIdFromCsv(valueAt(cols.shelf), location, shelves);
  const minStock = numberAt(cols.minStock);

  const rawStatus = valueAt(cols.status).toLocaleLowerCase();
  // Un articolo a quantità non è mai «venduto» (ticket 03): con la giacenza è disponibile
  const status: Product['status'] = stock
    ? 'available'
    : rawStatus === 'sold' || rawStatus === 'venduto'
      ? 'sold'
      : rawStatus === 'archived' || rawStatus === 'archiviato'
        ? 'archived'
        : 'available';
  const rawImages = valueAt(cols.images);
  const images = jsonAt<string[]>(cols.images, rawImages ? rawImages.split(';').map((image) => image.trim()).filter(Boolean) : []);
  const backupImageLinks = Array.isArray(images) ? images.filter((image) => /^https?:\/\//i.test(image)) : [];

  return {
    stock,
    product: {
      sku,
      furType: furTypeFromCsv(valueAt(cols.furType), lists.furTypes),
      location,
      status,
      images: Array.isArray(images) ? images.filter((image) => !/drive\.google\.com/i.test(image)) : [],
      backupImageLinks,
      backupCustomDataLinks: jsonAt(cols.backupAttachments, {}),
      purchasePrice: numberAt(cols.purchasePrice),
      sellPrice: numberAt(cols.sellPrice),
      length: numberAt(cols.length),
      width: numberAt(cols.width),
      weight: numberAt(cols.weight),
      technicalNotes: valueAt(cols.notes),
      productionDate: valueAt(cols.productionDate) || undefined,
      customData: jsonAt(cols.customData, []),
      gs1DigitalLink: valueAt(cols.gs1) || undefined,
      libraryId: libraryIdFromCsv(valueAt(cols.category), lists.categories),
      isFragile: false,
      ...(stock && { unit: valueAt(cols.unit) || undefined }),
      ...(stock && minStock != null && minStock >= 0 && { minStock }),
      ...(shelfId && { shelfId }),
    },
  };
}

type Labels = { place: (id: string) => string; category: (libraryId: string | undefined) => string; furType: (id: string) => string };

// C1: «Categoria» è la cartella (nome completo) e «Tipo di pelle» il nome del tipo; prima «Categoria» era il tipo.
export const STOCK_CSV_HEADER = ['SKU', 'Categoria', 'Tipo di pelle', 'Posizione', 'Quantità', 'Unità', 'Scorta minima', 'Sotto scorta'];

/**
 * Report delle giacenze: una riga per prodotto e posizione con quantità, prodotti non nel cestino. Un pezzo unico
 * disponibile conta 1 pz; un articolo esaurito ha una riga a 0 nella posizione principale (è quella da riordinare).
 * «Sotto scorta» è del prodotto (totale contro scorta minima) e si ripete su ogni sua riga.
 */
export function stockCsvRows(products: readonly Product[], labels: Labels): unknown[][] {
  const rows: unknown[][] = [STOCK_CSV_HEADER];
  for (const product of products) {
    if (product.deletedAt) continue;
    const stocked = isStocked(product);
    const stock = Object.entries(stockOf(product));
    if (stocked && !stock.length) stock.push([product.location, 0]);
    // Gli scaffali (S1b) hanno una riga ciascuno col loro nome («Magazzino › A1», da `labels.place`)
    const rank = mainFirst(product.location);
    stock.sort(([a], [b]) => rank(b) - rank(a));
    const low = stocked && product.minStock != null ? (isLowStock(product) ? 'sì' : 'no') : '';
    for (const [place, qty] of stock) {
      rows.push([
        product.sku,
        labels.category(product.libraryId),
        product.furType ? labels.furType(product.furType) : '',
        labels.place(place),
        qty,
        stocked ? product.unit || DEFAULT_UNIT : DEFAULT_UNIT,
        stocked ? product.minStock : undefined,
        low,
      ]);
    }
  }
  return rows;
}

export const MOVEMENT_CSV_HEADER = ['Data', 'SKU', 'Tipo', 'Quantità', 'Unità', 'Da', 'A', 'Causale', 'Prezzo', 'Contatto', 'Nota'];

/** «2026-11-22 10:05» nell'ora del dispositivo, leggibile e ordinabile anche in Excel. */
export function csvDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const two = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

/**
 * Report dei movimenti: gli eventi `stock` della Cronologia (gli stessi del filtro «Movimenti»), dal più vecchio.
 * Anche quelli dei prodotti nel cestino o eliminati per sempre: senza prodotto, lo SKU è l'id rimasto.
 * `contact` dà il nome del contatto (M10) e `undefined` per un id che non è in elenco: in quel caso, e senza
 * `contact`, resta l'id scritto nel movimento. Il prezzo è per unità.
 */
export function movementCsvRows(
  timeline: readonly TimelineEvent[],
  products: readonly Product[],
  labels: Pick<Labels, 'place'> & { contact?: (id: string) => string | undefined },
): unknown[][] {
  const byId = new Map(products.map((p) => [p.id, p]));
  // La Cronologia è salvata dal più nuovo: girata prima dell'ordinamento (stabile), il carico «iniziale» resta
  // prima del movimento scritto nello stesso istante.
  const events = timeline
    .filter((e) => e.type === 'stock' && typeof e.details?.qty === 'number')
    .reverse()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return [
    MOVEMENT_CSV_HEADER,
    ...events.map((e) => {
      const p = byId.get(e.productId);
      const d = e.details;
      return [
        csvDateTime(e.timestamp),
        p?.sku ?? e.productId,
        d.movement ? MOVEMENT_LABELS[d.movement] : '',
        d.qty,
        p?.unit || DEFAULT_UNIT,
        d.from ? labels.place(d.from) : '',
        d.to ? labels.place(d.to) : '',
        d.reason ? REASON_LABELS[d.reason] : '',
        d.finalPrice,
        d.contactId ? (labels.contact?.(d.contactId) ?? d.contactId) : '',
        d.note,
      ];
    }),
  ];
}
