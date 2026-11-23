// COD (ticket 22 e 29): **lettore unico dei codici**. Funzioni pure: lo Scanner (fotocamera, inserimento a mano,
// immagine dalla galleria) e le 5 automazioni (con «Scrivi il codice» di `BarcodeScanner`) chiedono qui che cosa è un
// codice letto; Posizioni, Categorie e Scaffali chiedono qui se un codice è già usato (`codeOwner`, `codeCheck`).
// Vincolo 5 di `map-3.md`: i link GS1 già stampati o scritti sui tag si riconoscono sempre (anche con un altro
// dominio, con il lotto in `?10=` e con lo SKU al posto del GTIN); i `gs1DigitalLink` salvati non si riscrivono.
// Ordine della lettura (ticket 22, punto 2):
//   1. link salvato identico;
//   2. link GS1 di qualunque dominio (`/01/…`, `/10/…` o `?10=`, `/21/…`): GTIN (o SKU) **e** seriale insieme; il
//      seriale da solo o il GTIN da solo valgono se portano a un prodotto solo (con NG03 due prodotti hanno già lo
//      stesso seriale);
//   3. SKU e id senza maiuscole (un GTIN di 8, 12, 13 o 14 cifre vale anche con gli zeri davanti);
//   4. stringhe GS1 (`]C1…`, `]d2…`, `(01)…(21)…`, separatore FNC1);
//   5. codici, tag NFC (testo o UID, con o senza «:») e id di posizioni (anche il nome), scaffali e categorie;
//   6. `AUTO:` delle automazioni;
//   7. indirizzi `syncroflow://` del prodotto o dell'esecuzione.
// Più cose con lo stesso codice danno «ambiguo» con i candidati (si chiede quale, mai il primo a caso); un prodotto
// trovato solo nel cestino dà «nel cestino». I prodotti vengono prima dei posti, come nello Scanner di prima.
import type { Product } from '../types';
import { categoryPath, type CategoryNode } from './categories';
import { placeWithShelf, type Shelf } from './shelves';

export type CodeKind = 'product' | 'location' | 'shelf' | 'category' | 'automation';
export interface CodeRef { kind: CodeKind; id: string }
export type CodeResult =
  | { status: 'found'; kind: CodeKind; id: string }
  | { status: 'trashed'; kind: 'product'; id: string }
  | { status: 'ambiguous'; candidates: CodeRef[] }
  | { status: 'unknown' };

type CodeProduct = Pick<Product, 'id' | 'sku' | 'gs1DigitalLink' | 'deletedAt'>;
interface CodePlace { id: string; barcode?: string; nfcTag?: string }

/** Dove si cerca un codice. Ogni elenco è facoltativo (chi non lo passa non lo cerca). */
export interface CodeSources {
  products?: readonly CodeProduct[];
  locations?: readonly (CodePlace & { label: string })[];
  categories?: readonly (CategoryNode & { barcode?: string; nfcTag?: string })[];
  shelves?: readonly Shelf[];
  automations?: readonly { id: string; name?: string; qrValue?: string }[];
  /** Nome di una posizione per descrivere uno scaffale, quando `locations` non si passa. */
  placeLabel?: (id: string) => string;
}

// Maiuscole, accenti e spazi ai lati indifferenti (come i nomi degli scaffali)
const fold = (value: string | undefined): string =>
  (value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();
// GTIN di 8, 12, 13 o 14 cifre portato a 14 (gli zeri davanti non contano), altrimenti null
const gtin14 = (value: string | undefined): string | null => {
  const v = (value ?? '').trim();
  return /^(\d{8}|\d{12,14})$/.test(v) ? v.padStart(14, '0') : null;
};
/** Stesso codice: senza maiuscole e accenti, oppure lo stesso GTIN. */
const sameCode = (a: string | undefined, b: string): boolean => {
  if (!fold(a) || !fold(b)) return false;
  if (fold(a) === fold(b)) return true;
  const g = gtin14(a);
  return !!g && g === gtin14(b);
};
// UID di un tag NFC («04:A2:3B:1C», «04A23B1C», «04-a2-3b-1c»): solo le cifre esadecimali
const uid = (value: string | undefined): string | null => {
  const v = (value ?? '').trim();
  return /^[0-9a-f]{2}([:\-\s]?[0-9a-f]{2})+$/i.test(v) ? v.replace(/[:\-\s]/g, '').toLowerCase() : null;
};
/** Stesso tag: stesso testo o stesso UID scritto in un altro modo. */
const sameTag = (tag: string | undefined, code: string): boolean => {
  if (sameCode(tag, code)) return true;
  const a = uid(tag);
  return !!a && a === uid(code);
};
const decode = (value: string): string => {
  try { return decodeURIComponent(value); } catch { return value; }
};

/** Parti GS1 di un codice letto: GTIN (AI 01), lotto (AI 10), seriale (AI 21). */
export interface GS1Parts { gtin?: string; lot?: string; serial?: string }

/**
 * Parti di un GS1 Digital Link con qualunque dominio e percorso davanti: `…/01/{gtin}[/22/…][/10/{lotto}][/21/{seriale}]`,
 * lotto e seriale anche in `?10=` / `?21=` (i link fatti dall'app prima di COD). Null se non è un link con `/01/`.
 */
export function gs1LinkParts(text: string): GS1Parts | null {
  const m = (text ?? '').trim().match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]+(\/[^?#\s]*)?(\?[^#\s]*)?/i);
  if (!m) return null;
  const segs = (m[1] ?? '').split('/').filter(Boolean);
  const i = segs.indexOf('01');
  if (i < 0 || i + 1 >= segs.length) return null;
  const parts: GS1Parts = { gtin: decode(segs[i + 1]) };
  for (let k = i + 2; k + 1 < segs.length; k += 2) {
    if (segs[k] === '10') parts.lot = decode(segs[k + 1]);
    else if (segs[k] === '21') parts.serial = decode(segs[k + 1]);
  }
  for (const pair of (m[2] ?? '').slice(1).split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === '10' && parts.lot === undefined) parts.lot = decode(value.replace(/\+/g, ' '));
    if (key === '21' && parts.serial === undefined) parts.serial = decode(value.replace(/\+/g, ' '));
  }
  return parts;
}

const FNC1 = '\u001d';
// Application Identifier a lunghezza fissa (cifre del valore); gli altri riconosciuti finiscono con FNC1
const FIXED_AI: Record<string, number> = { '00': 18, '01': 14, '02': 14, '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6, '20': 2 };
const VARIABLE_AI = new Set(['10', '21', '22']);

/**
 * Parti di una stringa GS1 di un GS1-128, DataMatrix o QR GS1: con le parentesi (`(01)08001234567897(21)A1`) oppure
 * con l'identificatore della simbologia (`]C1`, `]d2`, `]Q3`, `]e0`, `]J1`) o con il separatore FNC1. Null altrimenti
 * (uno SKU che comincia con «01» non è una stringa GS1).
 */
export function gs1ElementParts(text: string): GS1Parts | null {
  const raw = (text ?? '').trim();
  const parts: GS1Parts = {};
  const put = (ai: string, value: string) => {
    if ((ai === '01' || ai === '02') && parts.gtin === undefined) parts.gtin = value;
    else if (ai === '10' && parts.lot === undefined) parts.lot = value;
    else if (ai === '21' && parts.serial === undefined) parts.serial = value;
  };
  if (/^\(\d{2,4}\)/.test(raw)) {
    const re = /\((\d{2,4})\)([^(]*)/g;
    for (let m = re.exec(raw); m; m = re.exec(raw)) put(m[1], m[2].split(FNC1).join('').trim());
    return parts.gtin || parts.serial ? parts : null;
  }
  const sym = raw.match(/^\](C1|d2|Q3|e0|J1)/);
  if (!sym && !raw.includes(FNC1)) return null;
  const t = sym ? raw.slice(3) : raw;
  let pos = 0;
  while (pos < t.length) {
    if (t[pos] === FNC1) { pos += 1; continue; }
    const ai = t.slice(pos, pos + 2);
    if (FIXED_AI[ai]) {
      put(ai, t.slice(pos + 2, pos + 2 + FIXED_AI[ai]));
      pos += 2 + FIXED_AI[ai];
    } else if (VARIABLE_AI.has(ai)) {
      const end = t.indexOf(FNC1, pos + 2);
      put(ai, t.slice(pos + 2, end < 0 ? t.length : end));
      pos = end < 0 ? t.length : end;
    } else break; // AI che il lettore non conosce: ci si ferma a ciò che si è letto
  }
  return parts.gtin || parts.serial ? parts : null;
}

const unique = <T extends { id: string }>(list: readonly T[]): T[] => list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i);

// Prodotti di un link GS1 o di una stringa GS1, confrontati con lo SKU e con le parti del link salvato
function productsByGS1(parts: GS1Parts, products: readonly CodeProduct[]): CodeProduct[] {
  const saved = (p: CodeProduct) => (p.gs1DigitalLink ? gs1LinkParts(p.gs1DigitalLink) : null);
  const byGtin = parts.gtin ? products.filter((p) => sameCode(p.sku, parts.gtin!) || sameCode(saved(p)?.gtin, parts.gtin!)) : [];
  if (!parts.serial) return byGtin;
  const both = byGtin.filter((p) => saved(p)?.serial === parts.serial);
  if (both.length) return both;
  const bySerial = products.filter((p) => saved(p)?.serial === parts.serial);
  return unique([...byGtin, ...bySerial]);
}

// Prodotti che corrispondono al testo, al primo passo che ne trova (punti 1-4 dell'ordine)
function productMatches(t: string, products: readonly CodeProduct[]): CodeProduct[] {
  const identical = products.filter((p) => !!p.gs1DigitalLink && p.gs1DigitalLink.trim() === t);
  if (identical.length) return identical;
  const link = gs1LinkParts(t);
  if (link) return productsByGS1(link, products);
  const byId = products.filter((p) => p.id === t);
  if (byId.length) return byId;
  const bySku = products.filter((p) => sameCode(p.sku, t));
  if (bySku.length > 1) {
    // Più SKU uguali senza maiuscole: prima quelli non nel cestino, poi quello scritto proprio così
    const active = bySku.filter((p) => !p.deletedAt);
    const pool = active.length ? active : bySku;
    const exact = pool.filter((p) => p.sku.trim() === t);
    return exact.length === 1 ? exact : pool;
  }
  if (bySku.length) return bySku;
  const element = gs1ElementParts(t);
  if (element) return productsByGS1(element, products);
  return products.filter((p) => fold(p.id) === fold(t));
}

function productResult(list: readonly CodeProduct[]): CodeResult | null {
  const all = unique(list);
  if (!all.length) return null;
  const active = all.filter((p) => !p.deletedAt);
  if (active.length === 1) return { status: 'found', kind: 'product', id: active[0].id };
  if (active.length > 1) return { status: 'ambiguous', candidates: active.map((p) => ({ kind: 'product' as const, id: p.id })) };
  return { status: 'trashed', kind: 'product', id: all[0].id };
}

// Posizioni, scaffali e categorie con questo codice (punto 5)
function placeMatches(t: string, sources: CodeSources, self?: CodeRef): CodeRef[] {
  const other = (kind: CodeKind, id: string) => !(self && self.kind === kind && self.id === id);
  const place = (p: CodePlace) => sameCode(p.barcode, t) || sameTag(p.nfcTag, t) || fold(p.id) === fold(t);
  return [
    ...(sources.locations ?? []).filter((l) => other('location', l.id) && (place(l) || fold(l.label) === fold(t))).map((l) => ({ kind: 'location' as const, id: l.id })),
    ...(sources.shelves ?? []).filter((s) => other('shelf', s.id) && place(s)).map((s) => ({ kind: 'shelf' as const, id: s.id })),
    ...(sources.categories ?? []).filter((c) => other('category', c.id) && place(c)).map((c) => ({ kind: 'category' as const, id: c.id })),
  ];
}

/** Che cosa è il codice letto (QR, barcode, testo o UID di un tag, scritto a mano). Non lancia mai errori. */
export function resolveCode(text: string, sources: CodeSources): CodeResult {
  const t = typeof text === 'string' ? text.trim() : '';
  if (!t) return { status: 'unknown' };
  const products = sources.products ?? [];

  const product = productResult(productMatches(t, products));
  if (product) return product;

  const places = placeMatches(t, sources);
  if (places.length === 1) return { status: 'found', ...places[0] };
  if (places.length > 1) return { status: 'ambiguous', candidates: places };

  if (/^auto:/i.test(t)) {
    const list = sources.automations ?? [];
    const auto = list.find((a) => a.qrValue === t) ?? list.find((a) => fold(a.qrValue) === fold(t)) ?? list.find((a) => fold(`AUTO:${a.id}`) === fold(t));
    if (auto) return { status: 'found', kind: 'automation', id: auto.id };
  }

  const deep = t.match(/^syncroflow:\/\/\/?(.+)$/i);
  if (deep) {
    const path = deep[1].split(/[?#]/)[0].split('/').filter(Boolean).map(decode);
    if (path[0] === 'product' && path[1] && path[1] !== 'edit') return productResult(products.filter((p) => p.id === path[1])) ?? { status: 'unknown' };
    if (path[0] === 'automations' && path[1] === 'custom-runner' && path[2]) {
      const auto = (sources.automations ?? []).find((a) => a.id === path[2]);
      if (auto) return { status: 'found', kind: 'automation', id: auto.id };
    }
  }
  return { status: 'unknown' };
}

// ── Che cosa vuole il passo ───────────────────────────────

/** Lettura per un passo che vuole un prodotto (Vendita flash, Tagging, Audit, Spostamento rapido, Esecuzione). */
export type ProductRead =
  | { status: 'product'; id: string }
  | { status: 'choose'; candidates: CodeRef[] }
  | { status: 'trashed'; id: string }
  | { status: 'other'; ref: CodeRef }
  | { status: 'unknown' };

export function productRead(result: CodeResult): ProductRead {
  switch (result.status) {
    case 'found': return result.kind === 'product' ? { status: 'product', id: result.id } : { status: 'other', ref: { kind: result.kind, id: result.id } };
    case 'trashed': return { status: 'trashed', id: result.id };
    case 'ambiguous': {
      const products = result.candidates.filter((c) => c.kind === 'product');
      return products.length ? { status: 'choose', candidates: products } : { status: 'other', ref: result.candidates[0] };
    }
    default: return { status: 'unknown' };
  }
}

/**
 * Lettura per un passo che vuole una posizione («Scansiona Posizione», destinazione dello Spostamento rapido, Audit).
 * Uno scaffale vale **la sua posizione** (AU-V14): metterci il prodotto è della fetta S1b/FLU1 (`shelfId` lo dice).
 */
export type PlaceRead =
  | { status: 'location'; id: string; shelfId?: string }
  | { status: 'choose'; candidates: CodeRef[] }
  | { status: 'other'; ref: CodeRef }
  | { status: 'unknown' };

export function placeRead(result: CodeResult, sources: CodeSources): PlaceRead {
  const asPlace = (ref: CodeRef): PlaceRead | null => {
    if (ref.kind === 'location') return { status: 'location', id: ref.id };
    const shelf = ref.kind === 'shelf' ? sources.shelves?.find((s) => s.id === ref.id) : undefined;
    return shelf ? { status: 'location', id: shelf.locationId, shelfId: shelf.id } : null;
  };
  switch (result.status) {
    case 'found': return asPlace(result) ?? { status: 'other', ref: { kind: result.kind, id: result.id } };
    case 'trashed': return { status: 'other', ref: { kind: 'product', id: result.id } };
    case 'ambiguous': {
      const usable = result.candidates.filter((c) => c.kind === 'location' || c.kind === 'shelf');
      if (usable.length === 1) return asPlace(usable[0]) ?? { status: 'other', ref: usable[0] };
      return usable.length ? { status: 'choose', candidates: usable } : { status: 'other', ref: result.candidates[0] };
    }
    default: return { status: 'unknown' };
  }
}

// ── Testi ─────────────────────────────────────────────────

const placeOf = (sources: CodeSources, locationId: string) =>
  sources.locations?.find((l) => l.id === locationId)?.label ?? sources.placeLabel?.(locationId) ?? locationId;

/** Nome breve di una cosa: «VIS-0142», «Magazzino», «Magazzino › A1», «Pellicce › Visone», nome dell'automazione. */
export function codeName(ref: CodeRef, sources: CodeSources): string {
  switch (ref.kind) {
    case 'product': return sources.products?.find((p) => p.id === ref.id)?.sku ?? ref.id;
    case 'location': return sources.locations?.find((l) => l.id === ref.id)?.label ?? sources.placeLabel?.(ref.id) ?? ref.id;
    case 'shelf': {
      const shelf = sources.shelves?.find((s) => s.id === ref.id);
      return shelf ? placeWithShelf(placeOf(sources, shelf.locationId), shelf) : ref.id;
    }
    case 'category': return sources.categories?.some((c) => c.id === ref.id) ? categoryPath(sources.categories ?? [], ref.id) : ref.id;
    case 'automation': return sources.automations?.find((a) => a.id === ref.id)?.name ?? ref.id;
  }
}

const KIND_NAME: Record<CodeKind, string> = { product: 'Prodotto', location: 'Posizione', shelf: 'Scaffale', category: 'Categoria', automation: 'Automazione' };

/** Voce di una scelta tra più cose con lo stesso codice: «Prodotto VIS-0142 (Vetrina)», «Posizione Banco Uno». */
export function codeChoiceLabel(ref: CodeRef, sources: CodeSources): string {
  const name = codeName(ref, sources);
  if (ref.kind === 'product') {
    const p = sources.products?.find((x) => x.id === ref.id) as (CodeProduct & { location?: string }) | undefined;
    return p?.location ? `${KIND_NAME.product} ${name} (${placeOf(sources, p.location)})` : `${KIND_NAME.product} ${name}`;
  }
  return `${KIND_NAME[ref.kind]} ${name}`;
}

/** «del prodotto VIS-0142», «della posizione "Magazzino"»… per i messaggi. */
function ownerText(ref: CodeRef, sources: CodeSources): string {
  const name = codeName(ref, sources);
  switch (ref.kind) {
    case 'product': return `dal prodotto ${name}`;
    case 'location': return `dalla posizione "${name}"`;
    case 'shelf': return `dallo scaffale "${name}"`;
    case 'category': return `dalla categoria "${name}"`;
    case 'automation': return `dall'automazione "${name}"`;
  }
}

/** Testo per un codice che non è quello che il passo chiede: «"LOC-MAGAZZINO" è la posizione "Magazzino"». */
export function codeIsText(code: string, ref: CodeRef, sources: CodeSources): string {
  const name = codeName(ref, sources);
  const what = { product: `il prodotto ${name}`, location: `la posizione "${name}"`, shelf: `lo scaffale "${name}"`, category: `la categoria "${name}"`, automation: `l'automazione "${name}"` }[ref.kind];
  return `"${code.trim()}" è ${what}.`;
}

/** Testo di uno scaffale letto dove serve una posizione (AU-V14): lo scaffale vale la sua posizione, per ora. */
export function shelfAsLocationText(shelf: Pick<Shelf, 'name' | 'locationId'>, sources: CodeSources): string {
  const place = placeOf(sources, shelf.locationId);
  return `${shelf.name} è uno scaffale di ${place}: si usa la posizione ${place} (lo scaffale non si registra nel prodotto).`;
}

// ── Codici già usati ──────────────────────────────────────

/**
 * Chi usa già questo codice, come lo direbbe un messaggio («dalla posizione "Magazzino"»), altrimenti null. Si guarda
 * dove guarda il lettore: SKU e id dei prodotti; codice, tag (anche l'UID scritto in un altro modo) e id di posizioni
 * (anche il nome), scaffali e categorie. `self` è la cosa che si sta modificando.
 */
export function codeOwner(code: string, sources: CodeSources, self?: CodeRef): string | null {
  const ref = ownerRef(code, sources, self);
  return ref ? ownerText(ref, sources) : null;
}

// Chi usa già il codice (prima i prodotti, come nel lettore), altrimenti null
function ownerRef(code: string, sources: CodeSources, self?: CodeRef): CodeRef | null {
  const c = (code ?? '').trim();
  if (!fold(c)) return null;
  const product = sources.products?.find((p) => !(self?.kind === 'product' && self.id === p.id) && (sameCode(p.sku, c) || fold(p.id) === fold(c)));
  if (product) return { kind: 'product', id: product.id };
  return placeMatches(c, sources, self)[0] ?? null;
}

/** Errore per un codice già usato, altrimenti null. */
export function codeError(code: string, sources: CodeSources, self?: CodeRef): string | null {
  const owner = codeOwner(code, sources, self);
  return owner ? `Il codice "${code.trim()}" è già usato ${owner}.` : null;
}

/**
 * Controllo del codice al salvataggio (NG25): un codice **nuovo** già usato blocca (`error`); un codice già salvato
 * prima e doppio (come dopo NG24) non blocca il salvataggio di un altro campo, ma si segnala (`warning`).
 */
export function codeCheck(code: string, saved: string | undefined, sources: CodeSources, self?: CodeRef): { error: string | null; warning: string | null } {
  const ref = ownerRef(code, sources, self);
  if (!ref) return { error: null, warning: null };
  const owner = ownerText(ref, sources);
  if (fold(saved) && fold(saved) === fold(code)) {
    // Con un prodotto lo Scanner non chiede: i prodotti vengono prima (`resolveCode`), questa cosa non si apre più dal codice
    const scanner = ref.kind === 'product' ? 'lo Scanner apre il prodotto' : 'lo Scanner chiederà quale aprire';
    return { error: null, warning: `Il codice "${code.trim()}" è usato anche ${owner}: ${scanner}. Cambialo in uno dei due per non confonderli.` };
  }
  return { error: `Il codice "${code.trim()}" è già usato ${owner}.`, warning: null };
}
