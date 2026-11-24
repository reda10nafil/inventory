// Righe «modificato» della Cronologia: cosa è cambiato in un prodotto (P13).
// Prima si registravano solo posizione, prezzi, note e foto: peso, misure, tipo, SKU, cartella e campi
// personalizzati cambiavano senza lasciare traccia.
import type { CustomField, Product, ProductCustomData } from '../types';
import { formatNumberInput } from './number';
import { formatPrice } from './price';
import { isReorder } from './photos';
import { fieldOptions, sameValue, valueText, type FieldOption } from './fieldValues';

const show = (value: unknown): string => {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '—';
  const text = Array.isArray(value) ? value.map((v) => (v && typeof v === 'object' && 'label' in v ? (v as any).label : String(v))).join(', ') : String(value);
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
};
// Vuoto e assente valgono uguale: un testo '' (es. note dei prodotti importati da CSV) contro undefined
// non è una modifica.
const empty = (v: unknown) => (v === '' || (Array.isArray(v) && v.length === 0) ? null : v ?? null);
const same = (a: unknown, b: unknown) => JSON.stringify(empty(a)) === JSON.stringify(empty(b));
const num = (v?: number) => (v == null ? '—' : formatNumberInput(v));
const price = (v?: number) => (v == null ? '—' : formatPrice(v));

/**
 * Righe leggibili per i campi che `updates` cambia davvero rispetto a `before`. `labels.shelf` dà il nome di uno
 * scaffale (S1a): il suo id è opaco e non si scrive mai; senza, il cambio di scaffale non ha una riga.
 * `labels.options` dà le opzioni di un campo collegato a una lista dell'app (i tipi di pelle salvano l'id, VAL).
 */
export function describeChanges(
  before: Product,
  updates: Partial<Product>,
  labels?: { shelf?: (id: string) => string; options?: (field: CustomField) => readonly FieldOption[] | undefined },
): string[] {
  const changed = <K extends keyof Product>(k: K) => k in updates && !same(updates[k], before[k]);
  const out: string[] = [];
  if (changed('sku')) out.push(`SKU: ${show(before.sku)} → ${show(updates.sku)}`);
  // C1: il campo `furType` è il tipo di pelle, la categoria è `libraryId` (la cartella di prima)
  if (changed('furType')) out.push(`Tipo di pelle: ${show(before.furType)} → ${show(updates.furType)}`);
  if (changed('location')) out.push(`Posizione: ${show(before.location)} → ${show(updates.location)}`);
  if (changed('libraryId')) out.push(`Categoria: ${show(before.libraryId)} → ${show(updates.libraryId)}`);
  const shelf = labels?.shelf;
  if (shelf && changed('shelfId')) {
    const name = (id?: string) => show(id ? shelf(id) : undefined);
    out.push(`Scaffale: ${name(before.shelfId)} → ${name(updates.shelfId)}`);
  }
  if (changed('sellPrice')) out.push(`Prezzo vendita: ${price(before.sellPrice)} → ${price(updates.sellPrice)}`);
  if (changed('purchasePrice')) out.push(`Prezzo acquisto: ${price(before.purchasePrice)} → ${price(updates.purchasePrice)}`);
  if (changed('length')) out.push(`Lunghezza: ${num(before.length)} → ${num(updates.length)}`);
  if (changed('width')) out.push(`Larghezza: ${num(before.width)} → ${num(updates.width)}`);
  if (changed('weight')) out.push(`Peso: ${num(before.weight)} → ${num(updates.weight)}`);
  if (changed('height')) out.push(`Altezza: ${num(before.height)} → ${num(updates.height)}`); // S2
  if (changed('productionDate')) out.push(`Data produzione: ${show(before.productionDate)} → ${show(updates.productionDate)}`);
  if (changed('minStock')) out.push(`Scorta minima: ${num(before.minStock)} → ${num(updates.minStock)}`);
  if (changed('technicalNotes')) out.push('Note aggiornate');
  if (updates.images && updates.images.length < (before.images || []).length) {
    out.push(`${before.images.length - updates.images.length} foto tolte`);
  }
  // GAL: «Metti come principale» e «Sposta» cambiano solo l'ordine (la prima è la foto della card, del PDF e della
  // condivisione)
  if (updates.images && isReorder(before.images || [], updates.images)) out.push('Foto riordinate');
  if (updates.customData) out.push(...describeCustomChanges(before.customData || [], updates.customData, labels?.options));
  return out;
}

// VAL: i valori si confrontano e si scrivono come li legge la Scheda: un'etichetta salvata prima e l'id della stessa
// opzione non sono una modifica («M» → «opt_2»), e nella riga c'è l'etichetta, mai l'id; «3» e 3 sono uguali.
function describeCustomChanges(
  before: ProductCustomData[],
  after: ProductCustomData[],
  linked?: (field: CustomField) => readonly FieldOption[] | undefined,
): string[] {
  const value = (list: ProductCustomData[]) => new Map(list.map((d) => [d.fieldSnapshot?.id, d]));
  const old = value(before);
  const now = value(after);
  const ids = [...new Set([...old.keys(), ...now.keys()])].filter(Boolean);
  const text = (field: CustomField, entry: ProductCustomData | undefined, options: readonly FieldOption[]) => {
    const t = entry ? valueText(field, entry.value, { options, snapshot: entry.fieldSnapshot }) : '';
    return t ? (t.length > 40 ? `${t.slice(0, 39)}…` : t) : '—';
  };
  return ids.flatMap((id) => {
    const o = old.get(id);
    const n = now.get(id);
    const field = (n?.fieldSnapshot ?? o?.fieldSnapshot) as CustomField | undefined;
    if (!field) return same(o?.value, n?.value) ? [] : [`${id}: ${show(o?.value)} → ${show(n?.value)}`];
    const options = (field.linkTo ? linked?.(field) : undefined) ?? fieldOptions(field);
    if (sameValue(field, o?.value, n?.value, { options, snapshots: [o?.fieldSnapshot, n?.fieldSnapshot] })) return [];
    return [`${field.name ?? id}: ${text(field, o, options)} → ${text(field, n, options)}`];
  });
}
