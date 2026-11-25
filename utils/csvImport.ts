// IMP (ticket 26, fetta DATI): logica della schermata «Importa prodotti» (`src/screens/settings/ImportScreen.tsx`).
// Funzioni pure, test in `__tests__/csvImport.test.ts`:
// - `detectDelimiter`: «,» o «;» (Excel in italiano) o tabulazione, contati nella prima riga fuori dalle virgolette;
// - `guessMapping`: colonna → campo, con UNA tabella dei sinonimi (`SYNONYMS`) e i nomi dei campi personalizzati;
// - `previewImport`: le righe già abbinate → prodotti da aggiungere, righe rifiutate col motivo, avvisi per colonna.
//   Non scrive nulla: chi importa scrive dopo «Importa» (`ImportScreen`), con lo stesso risultato;
// - `productFromMappedRow` (dentro `previewImport`): una riga già abbinata → prodotto, coi controlli di Aggiungi
//   (posizione obbligatoria, campi obbligatori del modulo con `requiredFor`, numeri, link GS1 come in Aggiungi).
// L'import aggiunge e basta: uno SKU già presente si salta col motivo (decisione DATI, 25/11).
import type { CustomField, Product, ProductCustomData } from '../types';
import { libraryIdFromCsv, parseStockCell } from './productCsv';
import { furTypeFromCsv, type FurType } from './furTypes';
import type { CategoryNode } from './categories';
import { isShelfPlace, shelfIdFromCsv, stockKeyFromCsv, type Shelf } from './shelves';
import { parseNumber, parseStoredNumber } from './number';
import { choiceOptions, fieldOptions, isChoiceField, isNumberField, newOptionId, SHORT_TEXT_MAX, type FieldOption } from './fieldValues';
import { placeOfKey, round3, SHELF_KEY_SEPARATOR, splitStockKey } from './stock';
import { IMAGE_FILES_HEADER } from './productExport';

export const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();

// ── Separatore ───────────────────────────────────────────────

/** Separatore del file dalla prima riga (fuori dalle virgolette): il più frequente tra «,», «;» e tab; «,» a pari. */
export function detectDelimiter(text: string): ',' | ';' | '\t' {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (const ch of text.replace(/^﻿/, '')) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && (ch === '\n' || ch === '\r')) break;
    else if (!quoted && ch in counts) counts[ch as keyof typeof counts] += 1;
  }
  if (counts[';'] > counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
  return ',';
}

// ── Abbinamento ──────────────────────────────────────────────

export type SystemTarget =
  | 'sku' | 'furType' | 'location' | 'category' | 'status' | 'purchasePrice' | 'sellPrice' | 'length' | 'width' | 'height'
  | 'weight' | 'notes' | 'productionDate' | 'images' | 'imageFiles' | 'customData' | 'gs1' | 'backupAttachments' | 'unit'
  | 'stock' | 'qty' | 'minStock' | 'shelf';
/** Dove va una colonna: «Ignora», un campo di sistema, un campo personalizzato (`field:<id>`). */
export type Target = 'ignore' | SystemTarget | `field:${string}`;

/** Campi di sistema nel selettore, nell'ordine del modulo Aggiungi. */
export const SYSTEM_TARGETS: readonly { id: SystemTarget; label: string }[] = [
  { id: 'sku', label: 'SKU' },
  { id: 'furType', label: 'Tipo di pelle' },
  { id: 'location', label: 'Posizione' },
  { id: 'category', label: 'Categoria' },
  { id: 'status', label: 'Stato' },
  { id: 'purchasePrice', label: 'Prezzo acquisto' },
  { id: 'sellPrice', label: 'Prezzo vendita' },
  { id: 'length', label: 'Lunghezza' },
  { id: 'width', label: 'Larghezza' },
  { id: 'height', label: 'Altezza' },
  { id: 'weight', label: 'Peso' },
  { id: 'notes', label: 'Note' },
  { id: 'productionDate', label: 'Data produzione' },
  { id: 'images', label: 'Immagini (link)' },
  { id: 'imageFiles', label: 'Immagini file (ZIP)' },
  { id: 'qty', label: 'Quantità (nella posizione)' },
  { id: 'stock', label: 'Giacenza per posizione' },
  { id: 'unit', label: 'Unità' },
  { id: 'minStock', label: 'Scorta minima' },
  { id: 'shelf', label: 'Scaffale' },
  { id: 'gs1', label: 'GS1 Digital Link' },
  { id: 'customData', label: 'Campi personalizzati (JSON dell\'app)' },
  { id: 'backupAttachments', label: 'Allegati Drive (JSON dell\'app)' },
];

/** La tabella unica dei sinonimi (nomi già piegati: minuscole, senza accenti). I nomi dell'export dell'app per primi. */
export const SYNONYMS: Record<SystemTarget, readonly string[]> = {
  sku: ['sku', 'codice sku', 'codice articolo', 'codice', 'articolo', 'cod. articolo', 'cod articolo', 'codice prodotto', 'product code', 'item code'],
  furType: ['tipo di pelle', 'tipo pelle', 'tipo pelliccia', 'fur type'],
  location: ['posizione', 'location', 'ubicazione'],
  category: ['categoria', 'category', 'cartella', 'folder', 'library'],
  status: ['status', 'stato'],
  purchasePrice: ['prezzo acquisto', 'prezzo di acquisto', 'purchase price', 'costo', 'cost'],
  sellPrice: ['prezzo vendita', 'prezzo di vendita', 'sell price', 'prezzo', 'price', 'prezzo al pubblico'],
  length: ['lunghezza', 'length'],
  width: ['larghezza', 'width'],
  height: ['altezza', 'height'],
  weight: ['peso', 'weight'],
  notes: ['note', 'note tecniche', 'technical notes', 'descrizione', 'description'],
  productionDate: ['data produzione', 'production date'],
  images: ['immagini url', 'immagini', 'immagine', 'immagine principale', 'foto', 'foto url', 'images', 'image', 'image url', 'image urls', 'url immagine'],
  imageFiles: [fold(IMAGE_FILES_HEADER)],
  customData: ['dati personalizzati json', 'custom data json'],
  gs1: ['gs1 digital link', 'gs1'],
  backupAttachments: ['link allegati drive json', 'drive attachments json'],
  unit: ['unita', 'unit', 'um', 'unita di misura'],
  stock: ['giacenza', 'stock'],
  qty: ['quantita', 'qta', 'qty', 'quantity'],
  minStock: ['scorta minima', 'min stock'],
  shelf: ['scaffale', 'shelf'],
};

/** «Immagine 2», «Foto 3», «Image 1»: colonne di immagini in più (unite nell'ordine, la prima è la principale). */
const NUMBERED_IMAGE = /^(immagin[ei]|foto|image|images|img)( url)? ?\d+$/;

const systemOf = (name: string): SystemTarget | undefined => {
  if (NUMBERED_IMAGE.test(name)) return 'images';
  return (Object.keys(SYNONYMS) as SystemTarget[]).find((k) => SYNONYMS[k].includes(name));
};

/** Le colonne che possono essere più di una (le altre: vale la prima, le seguenti su Ignora). */
const MANY: ReadonlySet<Target> = new Set<Target>(['images']);

export interface MappingLists {
  fields: readonly CustomField[];
  furTypes?: readonly FurType[];
  categories?: readonly CategoryNode[];
}

/** Campi personalizzati che una colonna può riempire (non i campi Base, non nel cestino). */
export const importableFields = (fields: readonly CustomField[]) => fields.filter((f) => !f.isSystem && !f.deletedAt);

/**
 * Proposta di abbinamento per ogni intestazione. Nell'ordine:
 * 1. «Nome (campo)» dell'export → il campo personalizzato «Nome»;
 * 2. «Categoria»: nei file dell'app di prima di C1 (con «Cartella» o «Tipo Pelle») è il tipo di pelle e «Cartella»
 *    è la categoria; in un file senza tipo di pelle si guarda ai valori (tutti tipi di pelle noti → Tipo di pelle);
 * 3. i nomi dell'export e i sinonimi (`SYNONYMS`), un campo di sistema per colonna (le immagini anche più di una);
 * 4. il nome di un campo personalizzato.
 * Con la colonna JSON dei campi dell'app, le colonne leggibili dei campi restano su Ignora (il JSON ha già i valori).
 */
export function guessMapping(header: readonly string[], lists: MappingLists, rows: readonly (readonly string[])[] = []): Target[] {
  const names = header.map(fold);
  const fields = importableFields(lists.fields);
  const fieldByName = (name: string) => fields.find((f) => fold(f.name) === name);
  const oldApp = names.includes('cartella') || names.includes('tipo pelle');
  const hasFurType = names.some((n) => SYNONYMS.furType.includes(n));
  const values = (i: number) => rows.map((r) => (r[i] ?? '').trim()).filter(Boolean);
  const isFurTypeColumn = (i: number) => {
    const v = values(i);
    if (!v.length || !lists.furTypes?.length) return false;
    const fur = v.every((x) => lists.furTypes!.some((t) => fold(t.id) === fold(x) || fold(t.label) === fold(x)));
    const cat = v.every((x) => !!libraryIdFromCsv(x, lists.categories ?? []));
    return fur && !cat;
  };
  const taken = new Set<Target>();
  const out: Target[] = names.map((name, i) => {
    let target: Target | undefined;
    const asField = /^(.*) \(campo(?: \d+)?\)$/.exec(name);
    if (asField && fieldByName(asField[1])) target = `field:${fieldByName(asField[1])!.id}`;
    else if (name === 'categoria' && (oldApp || (!hasFurType && isFurTypeColumn(i)))) target = 'furType';
    else if (name === 'cartella') target = 'category';
    else target = systemOf(name) ?? (fieldByName(name) ? `field:${fieldByName(name)!.id}` : undefined);
    if (!target || (taken.has(target) && !MANY.has(target))) return 'ignore';
    taken.add(target);
    return target;
  });
  if (out.includes('customData')) return out.map((t) => (t.startsWith('field:') ? 'ignore' : t));
  return out;
}

// ── Campi obbligatori ────────────────────────────────────────

/**
 * Campi personalizzati obbligatori per un prodotto, come in Aggiungi: quelli che il modulo mostra (nel layout e
 * visibili) e segnati «Obbligatorio» (D24, `utils/formValidation.ts`). Da passare a `formFor` (MCAT) all'unione con la
 * fetta CAMPI: lì gli obbligatori dipendono dal modulo della categoria.
 */
export function requiredFor(
  _product: Pick<Product, 'libraryId'>,
  layoutFields: readonly { id: string; type: string; visible: boolean }[],
  fields: readonly CustomField[],
): CustomField[] {
  return layoutFields
    .filter((lf) => lf.type === 'custom' && lf.visible)
    .map((lf) => fields.find((f) => f.id === lf.id && !f.deletedAt))
    .filter((f): f is CustomField => !!f && f.required);
}

// ── Anteprima ────────────────────────────────────────────────

export interface ImportContext {
  /** Prodotti di adesso, anche nel Cestino (lo SKU di un prodotto cestinato è già preso). */
  products: readonly Pick<Product, 'sku' | 'deletedAt'>[];
  locations: readonly { id: string; label: string }[];
  categories: readonly CategoryNode[];
  furTypes: readonly FurType[];
  shelves?: readonly Shelf[];
  /** Registro dei campi (anche i Base: si usano solo i personalizzati). */
  fields: readonly CustomField[];
  /** Layout del modulo Aggiungi, per gli obbligatori (`requiredFor`). */
  layoutFields?: readonly { id: string; type: string; visible: boolean }[];
  /** Valore per le righe vuote: id della posizione e della categoria. */
  defaults?: { location?: string; category?: string };
  /** «Usa…» per un valore sconosciuto: valore piegato → id scelto. */
  locationChoice?: Record<string, string>;
  categoryChoice?: Record<string, string>;
  /** Foto dello ZIP: nome del file (senza `immagini/`) → indirizzo `data:`. */
  photos?: ReadonlyMap<string, string>;
  /** Link GS1 come in Aggiungi (solo se la configurazione lo prevede); `n` = quanti prodotti ci sono prima di questo. */
  gs1?: (sku: string, n: number) => string | undefined;
  /** File esportato dall'app (numeri col punto decimale, «2.125» = 2,125); altrimenti «1.250» = 1250. */
  appFile?: boolean;
}

export type NewProduct = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export interface PreviewRow {
  /** Riga del file (1 = intestazione). */
  row: number;
  sku: string;
  product: NewProduct;
  stock: Record<string, number> | null;
}

export interface Rejected {
  row: number;
  sku: string;
  reason: string;
  cells: readonly string[];
}

export interface Warning {
  key: string;
  text: string;
  /** Per «Crea / Usa…»: un valore sconosciuto di Posizione o Categoria. */
  kind?: 'location' | 'category';
  value?: string;
  count: number;
}

export interface Preview {
  toAdd: PreviewRow[];
  rejected: Rejected[];
  warnings: Warning[];
  /** Valori nuovi delle scelte, da aggiungere alle opzioni del campo prima di salvare i prodotti. */
  newOptions: { fieldId: string; options: FieldOption[] }[];
}

/** Il file viene dall'export dell'app? (Per leggere i numeri col punto decimale.) */
export function isAppFile(header: readonly string[], delimiter: string): boolean {
  const names = header.map(fold);
  return delimiter === ',' && ['tipo di pelle', 'tipo pelle', 'cartella', 'dati personalizzati json', 'immagini url'].some((n) => names.includes(n));
}

const STATUS: Record<string, Product['status']> = {
  '': 'available', available: 'available', disponibile: 'available',
  sold: 'sold', venduto: 'sold', venduta: 'sold',
  archived: 'archived', archiviato: 'archived', archiviata: 'archived',
};
const YES = new Set(['si', 'sì', 'yes', 'true', '1', 'x', 'vero']);
const NO = new Set(['no', 'false', '0', 'falso']);

/** Elenco di valori in una cella: un array JSON, oppure separati da «;», «|» o a capo. */
export function splitList(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
    } catch { /* non è JSON: si divide */ }
  }
  return t.split(/[;|\r\n]+/).map((v) => v.trim()).filter(Boolean);
}

/** Numero della foto dal nome «VIS-0142-2.jpg» (2), o nessuno. */
const photoNumber = (name: string): number | undefined => {
  const m = /-(\d+)\.[a-z0-9]+$/i.exec(name);
  return m ? Number(m[1]) : undefined;
};

export function previewImport(rows: readonly (readonly string[])[], mapping: readonly Target[], ctx: ImportContext): Preview {
  const col = (t: Target) => mapping.indexOf(t);
  const cols = (t: Target) => mapping.map((m, i) => (m === t ? i : -1)).filter((i) => i >= 0);
  const fields = importableFields(ctx.fields);
  const fieldCols = mapping.map((m, i) => ({ m, i })).filter(({ m }) => m.startsWith('field:'))
    .map(({ m, i }) => ({ i, field: fields.find((f) => `field:${f.id}` === m) }))
    .filter((x): x is { i: number; field: CustomField } => !!x.field);
  const shelves = ctx.shelves ?? [];
  const num = (text: string) => (ctx.appFile ? parseStoredNumber(text) : parseNumber(text));

  const warnings = new Map<string, Warning>();
  const warn = (key: string, text: (count: number) => string, extra: Partial<Warning> = {}) => {
    const w = warnings.get(key);
    const count = (w?.count ?? 0) + 1;
    warnings.set(key, { key, ...extra, count, text: text(count) });
  };
  const rejected: Rejected[] = [];
  const toAdd: PreviewRow[] = [];
  const taken = new Map(ctx.products.map((p) => [fold(p.sku), p.deletedAt ? 'trash' : 'live'] as const));
  const inFile = new Map<string, number>();
  // Opzioni nuove: per campo, l'elenco di adesso più quelle aggiunte da questo file (stesso id per la stessa etichetta)
  const optionsNow = new Map<string, FieldOption[]>();
  const added = new Map<string, FieldOption[]>();
  const optionFor = (field: CustomField, label: string): string => {
    const list = optionsNow.get(field.id) ?? fieldOptions(field);
    optionsNow.set(field.id, list);
    const found = list.find((o) => o.id === label) ?? list.find((o) => fold(o.label) === fold(label));
    if (found) return found.id;
    const option = { id: newOptionId(list), label };
    list.push(option);
    added.set(field.id, [...(added.get(field.id) ?? []), option]);
    warn(`opt:${field.id}`, () => `${field.name}: valori nuovi ${added.get(field.id)!.map((o) => `«${o.label}»`).join(', ')}, aggiunti alle opzioni`);
    return option.id;
  };
  const locationOf = (raw: string): string | undefined => {
    const v = fold(raw);
    if (!v) return undefined;
    return ctx.locations.find((l) => fold(l.id) === v)?.id ?? ctx.locations.find((l) => fold(l.label) === v)?.id ?? ctx.locationChoice?.[v];
  };
  const categoryOf = (raw: string): string | undefined => {
    const v = fold(raw);
    if (!v) return undefined;
    return libraryIdFromCsv(raw, ctx.categories) ?? ctx.categoryChoice?.[v];
  };
  const required = requiredFor({}, ctx.layoutFields ?? [], ctx.fields);
  const requiredMissingColumn = required.filter((f) => !fieldCols.some((c) => c.field.id === f.id) && col('customData') < 0);
  const defaultLocationLabel = ctx.locations.find((l) => l.id === ctx.defaults?.location)?.id;

  rows.forEach((cells, index) => {
    const row = index + 2;
    const at = (i: number) => (i < 0 ? '' : String(cells[i] ?? '').trim());
    const cell = (t: Target) => at(col(t));
    const reject = (sku: string, reason: string) => rejected.push({ row, sku, reason, cells });
    const sku = cell('sku');
    if (!sku) return reject('', 'SKU vuoto');
    const key = fold(sku);
    if (taken.get(key) === 'live') return reject(sku, 'SKU già presente');
    if (taken.get(key) === 'trash') return reject(sku, 'SKU già presente (nel Cestino)');
    if (inFile.has(key)) return reject(sku, `SKU ripetuto nel file (riga ${inFile.get(key)})`);

    // Giacenza: «posizione:quantità; …» (come esporta l'app) oppure una quantità sola nella posizione del prodotto
    const stockText = cell('stock');
    const written = parseStockCell(stockText);
    if (written === undefined) return reject(sku, `giacenza non valida «${stockText}»`);
    const qtyText = cell('qty');
    const qty = qtyText ? num(qtyText) : undefined;
    if (qtyText && (qty === undefined || qty < 0)) return reject(sku, `quantità non valida «${qtyText}»`);

    // Posizione: id o nome di una posizione; vuota → valore per le righe vuote, oppure il posto della giacenza
    let locationRaw = cell('location');
    if (!locationRaw && written) locationRaw = placeOfKey(Object.keys(written)[0] ?? '');
    if (!locationRaw && defaultLocationLabel) locationRaw = defaultLocationLabel;
    if (!locationRaw) return reject(sku, 'manca la Posizione');
    if (locationRaw.includes(SHELF_KEY_SEPARATOR) || isShelfPlace(shelves, [locationRaw])) return reject(sku, `la Posizione «${locationRaw}» è uno scaffale`);
    const location = locationOf(locationRaw);
    if (!location) {
      warn(`loc:${fold(locationRaw)}`, (n) => `Posizione sconosciuta «${locationRaw}» (${n} ${n === 1 ? 'riga rifiutata' : 'righe rifiutate'})`, { kind: 'location', value: locationRaw });
      return reject(sku, `posizione sconosciuta «${locationRaw}»`);
    }

    let stock: Record<string, number> | null = null;
    if (written) {
      stock = {};
      for (const [place, q] of Object.entries(written)) {
        const { place: p, shelfId } = splitStockKey(place);
        const placeId = locationOf(p) ?? p;
        const keyed = stockKeyFromCsv(shelfId ? `${placeId}${SHELF_KEY_SEPARATOR}${shelfId}` : placeId, shelves);
        if (!keyed) return reject(sku, `giacenza su uno scaffale sconosciuto «${place}»`);
        stock[keyed] = round3((stock[keyed] ?? 0) + q);
      }
    } else if (qty !== undefined) stock = { [location]: round3(qty) };

    // Campi personalizzati: dal JSON dell'app, poi le colonne abbinate (una colonna vince sul JSON per lo stesso campo)
    let customData: ProductCustomData[] = [];
    if (col('customData') >= 0 && cell('customData')) {
      try {
        const parsed = JSON.parse(cell('customData'));
        if (Array.isArray(parsed)) customData = parsed.filter((c) => c && c.fieldSnapshot && c.fieldSnapshot.id);
      } catch { warn('json', (n) => `Campi personalizzati (JSON): ${n} ${n === 1 ? 'valore illeggibile' : 'valori illeggibili'}, lasciati vuoti`); }
    }
    const values: Record<string, unknown> = Object.fromEntries(customData.map((c) => [c.fieldSnapshot.id, c.value]));
    for (const { i, field } of fieldCols) {
      const text = at(i);
      if (!text) continue;
      let value: unknown;
      if (isChoiceField(field)) {
        const parts = field.type === 'multi_choice' ? (/[;|]/.test(text) ? text.split(/[;|]/) : text.split(',')).map((x) => x.trim()).filter(Boolean) : [text];
        if (field.linkTo === 'furType') value = parts.map((p) => furTypeFromCsv(p, ctx.furTypes));
        else if (field.linkTo === 'locations' || field.linkTo === 'libraries') {
          const opts = choiceOptions(field, { locations: ctx.locations, categories: ctx.categories.map((c) => ({ id: c.id, label: c.name })) });
          value = parts.map((p) => opts.find((o) => fold(o.label) === fold(p))?.label ?? p);
        } else value = parts.map((p) => optionFor(field, p));
        if (field.type === 'single_choice') value = (value as string[])[0];
      } else if (isNumberField(field)) {
        const n = num(text);
        if (n === undefined) { warn(`num:${field.id}`, (c) => `${field.name}: ${c} ${c === 1 ? 'valore illeggibile' : 'valori illeggibili'}, lasciati vuoti`); continue; }
        value = n;
      } else if (field.type === 'boolean') {
        const v = fold(text);
        if (YES.has(v)) value = true;
        else if (NO.has(v)) value = false;
        else { warn(`bool:${field.id}`, (c) => `${field.name}: ${c} ${c === 1 ? 'valore non è' : 'valori non sono'} Sì o No, lasciati vuoti`); continue; }
      } else if (field.type === 'images' || field.type === 'document') value = splitList(text);
      else value = field.type === 'text_short' ? text.slice(0, SHORT_TEXT_MAX) : text;
      values[field.id] = value;
      customData = [...customData.filter((c) => c.fieldSnapshot.id !== field.id), { value, fieldSnapshot: field }];
    }
    const missing = required.filter((f) => fieldCols.some((c) => c.field.id === f.id) && (values[f.id] === undefined || values[f.id] === '' || (Array.isArray(values[f.id]) && !(values[f.id] as unknown[]).length)));
    if (missing.length) return reject(sku, `manca ${missing.map((f) => `«${f.name}»`).join(', ')} (obbligatorio)`);

    // Numeri del prodotto: un testo che non è un numero si dice e resta vuoto
    const numberOf = (t: SystemTarget, label: string): number | undefined => {
      const text = cell(t);
      if (!text) return undefined;
      const n = num(text);
      if (n === undefined) warn(`num:${t}`, (c) => `${label}: ${c} ${c === 1 ? 'valore illeggibile' : 'valori illeggibili'}, lasciati vuoti`);
      return n;
    };
    const purchasePrice = numberOf('purchasePrice', 'Prezzo acquisto');
    const sellPrice = numberOf('sellPrice', 'Prezzo vendita');
    const length = numberOf('length', 'Lunghezza');
    const width = numberOf('width', 'Larghezza');
    const weight = numberOf('weight', 'Peso');
    const height = numberOf('height', 'Altezza');
    const minStock = numberOf('minStock', 'Scorta minima');

    const statusText = fold(cell('status'));
    let status: Product['status'] = STATUS[statusText] ?? 'available';
    if (!(statusText in STATUS)) warn(`stato:${statusText}`, (n) => `Stato sconosciuto «${cell('status')}» (${n} ${n === 1 ? 'riga' : 'righe'}): disponibile`);
    if (stock) status = 'available'; // un articolo a quantità non è mai «venduto» (ticket 03)

    const categoryRaw = cell('category');
    let libraryId = categoryOf(categoryRaw);
    if (categoryRaw && !libraryId) warn(`cat:${fold(categoryRaw)}`, (n) => `Categoria sconosciuta «${categoryRaw}» (${n} ${n === 1 ? 'riga' : 'righe'}): lasciata vuota`, { kind: 'category', value: categoryRaw });
    if (!categoryRaw && ctx.defaults?.category) libraryId = ctx.defaults.category;

    // Immagini: link da una o più colonne (la prima è la principale) e foto dello ZIP nella loro posizione
    const links = cols('images').flatMap((i) => splitList(at(i)));
    const drive = links.filter((l) => /drive\.google\.com/i.test(l));
    if (drive.length) warn('drive', (n) => `${n} ${n === 1 ? 'riga ha' : 'righe hanno'} link di Google Drive: le foto private di Drive non si vedono nell'app`);
    const shown = links.filter((l) => !/drive\.google\.com/i.test(l));
    const images: string[] = [];
    const placed: (string | undefined)[] = [];
    for (const name of splitList(cell('imageFiles'))) {
      const uri = ctx.photos?.get(name);
      if (!uri) { warn('zip', (n) => (ctx.photos ? `${n} ${n === 1 ? 'foto non trovata' : 'foto non trovate'} nello ZIP` : `Colonna «${IMAGE_FILES_HEADER}»: le foto ci sono solo importando lo ZIP di «Esporta con le foto»`)); continue; }
      const n = photoNumber(name);
      if (n && n <= 20 && placed[n - 1] === undefined) placed[n - 1] = uri;
      else placed.push(uri);
    }
    const queue = [...shown];
    const total = Math.max(placed.length, 0) + queue.length;
    for (let i = 0; i < total && images.length < 10; i += 1) {
      const next = placed[i] ?? queue.shift();
      if (next) images.push(next);
    }
    const backupImageLinks = links.filter((l) => /^https?:\/\//i.test(l));

    let backupCustomDataLinks: Record<string, string[]> = {};
    if (cell('backupAttachments')) { try { backupCustomDataLinks = JSON.parse(cell('backupAttachments')) ?? {}; } catch { /* vuoto */ } }

    const shelfId = stock ? undefined : shelfIdFromCsv(cell('shelf'), location, shelves);
    // GS1 come in Aggiungi, solo se il file non ha la colonna: un export dell'app con la cella vuota resta senza link
    const gs1DigitalLink = cell('gs1') || (col('gs1') < 0 ? ctx.gs1?.(sku, ctx.products.length + toAdd.length) : undefined) || undefined;

    inFile.set(key, row);
    toAdd.push({
      row,
      sku,
      stock,
      product: {
        sku,
        furType: furTypeFromCsv(cell('furType'), ctx.furTypes),
        location,
        status,
        images,
        backupImageLinks,
        backupCustomDataLinks,
        ...(purchasePrice !== undefined && { purchasePrice }),
        ...(sellPrice !== undefined && { sellPrice }),
        ...(length !== undefined && { length }),
        ...(width !== undefined && { width }),
        ...(weight !== undefined && { weight }),
        ...(height !== undefined && height > 0 && { height }),
        technicalNotes: cell('notes') || undefined, // CSV-I7: vuote = nessuna nota, come Aggiungi
        productionDate: cell('productionDate') || undefined,
        customData,
        gs1DigitalLink,
        libraryId,
        isFragile: false,
        ...(stock && { unit: cell('unit') || undefined }),
        ...(stock && minStock != null && minStock >= 0 && { minStock }),
        ...(shelfId && { shelfId }),
      },
    });
  });

  for (const f of requiredMissingColumn) {
    warnings.set(`req:${f.id}`, { key: `req:${f.id}`, count: 0, text: `«${f.name}» è obbligatorio in Aggiungi ma il file non ha la colonna: i prodotti restano senza (si completa in Modifica)` });
  }
  return {
    toAdd,
    rejected,
    warnings: [...warnings.values()],
    newOptions: [...added].map(([fieldId]) => ({ fieldId, options: optionsNow.get(fieldId)! })),
  };
}

/** Righe rifiutate da scaricare: l'intestazione del file più «Motivo», poi ogni riga com'era con il suo motivo. */
export function rejectedRows(header: readonly string[], rejected: readonly Rejected[]): string[][] {
  return [[...header, 'Motivo'], ...rejected.map((r) => [...header.map((_, i) => String(r.cells[i] ?? '')), r.reason])];
}

// ── «+ Crea campo» ───────────────────────────────────────────

/**
 * Tipo proposto per un campo nuovo dai valori della colonna: numeri → Numero; link → Immagini; pochi valori che si
 * ripetono → Scelta singola (con quei valori come opzioni); testo lungo → Testo lungo; altrimenti Testo breve.
 */
export function guessFieldType(values: readonly string[]): { type: CustomField['type']; options: string[] } {
  const v = values.map((x) => x.trim()).filter(Boolean);
  if (!v.length) return { type: 'text_short', options: [] };
  if (v.every((x) => parseNumber(x) !== undefined)) return { type: 'number', options: [] };
  if (v.every((x) => splitList(x).every((l) => /^https?:\/\//i.test(l)))) return { type: 'images', options: [] };
  const distinct = [...new Map(v.map((x) => [fold(x), x])).values()];
  if (distinct.length <= 12 && distinct.every((x) => x.length <= 30) && (distinct.length < v.length || v.length <= 12)) return { type: 'single_choice', options: distinct };
  if (v.some((x) => x.length > SHORT_TEXT_MAX)) return { type: 'text_long', options: [] };
  return { type: 'text_short', options: [] };
}

/** Testo di una cella come lo salverà l'import (per l'anteprima: «1.250» → «1250»). */
export const previewNumber = (text: string, appFile?: boolean) => (appFile ? parseStoredNumber(text) : parseNumber(text));

/** Id per una posizione creata dall'anteprima (`Crea`): dal nome, unico. */
export function newLocationId(label: string, existing: readonly { id: string }[]): string {
  const base = fold(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'posizione';
  let id = base;
  for (let n = 2; existing.some((l) => l.id === id); n += 1) id = `${base}_${n}`;
  return id;
}

