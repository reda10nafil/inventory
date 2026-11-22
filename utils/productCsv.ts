// Righe dell'export CSV dei prodotti (Impostazioni › Esporta) e lettura della cartella all'import.
// P07: l'export includeva i prodotti nel cestino senza segnarli e non aveva la cartella, che si perdeva
// nel giro esporta-importa. Le foto salvate sul dispositivo non entrano nel CSV (solo i link http).
// M08 (ticket 09): colonne Unità, Giacenza e Scorta minima per gli articoli a quantità, più i due report
// (giacenze e movimenti). Nel CSV dei prodotti le posizioni sono id (l'app lo rilegge), nei report sono nomi.
import type { Library, Product, TimelineEvent } from '../types';
import { parseStoredNumber } from './number';
import { DEFAULT_UNIT, isLowStock, isStocked, MOVEMENT_LABELS, REASON_LABELS, round3, stockOf } from './stock';

export const PRODUCT_CSV_HEADER = ['SKU', 'Categoria', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON', 'Cartella', 'Unità', 'Giacenza', 'Scorta minima'];

/**
 * Giacenza di un articolo a quantità per il CSV: «magazzino:12; vetrina:2.5», con la posizione principale per
 * prima e anche a 0 (così un esaurito resta articolo a quantità). Pezzo unico: vuota.
 */
export function stockCell(product: Pick<Product, 'location' | 'stock'>): string {
  if (!isStocked(product)) return '';
  const entries = Object.entries(product.stock ?? {})
    .filter(([place, qty]) => place && typeof qty === 'number' && Number.isFinite(qty) && (qty > 0 || place === product.location))
    .map(([place, qty]) => [place, round3(Math.max(0, qty))] as const);
  if (!entries.some(([place]) => place === product.location)) entries.push([product.location, 0]);
  entries.sort(([a], [b]) => Number(b === product.location) - Number(a === product.location));
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

/** Intestazione più una riga per ogni prodotto non nel cestino. */
export function productCsvRows(products: readonly Product[], libraries: readonly Pick<Library, 'id' | 'name'>[]): unknown[][] {
  const folder = (id?: string) => (id ? libraries.find((l) => l.id === id)?.name ?? id : '');
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
      folder(product.libraryId),
      isStocked(product) ? product.unit || DEFAULT_UNIT : '',
      stockCell(product),
      product.minStock,
    ]),
  ];
}

/** Cartella scritta nel CSV (nome o id, maiuscole indifferenti) → id di una cartella esistente, altrimenti nessuna. */
export function libraryIdFromCsv(value: string, libraries: readonly Pick<Library, 'id' | 'name'>[]): string | undefined {
  const v = value.trim().toLocaleLowerCase();
  if (!v) return undefined;
  return libraries.find((l) => l.id.toLocaleLowerCase() === v || l.name.trim().toLocaleLowerCase() === v)?.id;
}

type Labels = { place: (id: string) => string; category: (id: string) => string };

export const STOCK_CSV_HEADER = ['SKU', 'Categoria', 'Posizione', 'Quantità', 'Unità', 'Scorta minima', 'Sotto scorta'];

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
    stock.sort(([a], [b]) => Number(b === product.location) - Number(a === product.location));
    const low = stocked && product.minStock != null ? (isLowStock(product) ? 'sì' : 'no') : '';
    for (const [place, qty] of stock) {
      rows.push([
        product.sku,
        labels.category(product.furType),
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
  labels: Labels & { contact?: (id: string) => string | undefined },
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
