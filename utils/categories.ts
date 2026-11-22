// Categorie dei prodotti (M01, ticket 04): lista modificabile per spazio che parte dai tipi di pelle di oggi.
// Il dato sul prodotto resta `furType` (l'id della categoria): nessuna migrazione dei prodotti.
import { FUR_TYPES } from '../constants/config';

export interface Category {
  id: string;
  label: string;
}

/** Predefinite = i tipi di pelle di oggi, stessi id: chi ha pellicce vede le stesse voci. */
export const DEFAULT_CATEGORIES: readonly Category[] = FUR_TYPES.map(({ id, label }) => ({ id, label }));

/** Nome del campo di sistema `furType` scritto dalle versioni di prima e quello di adesso. */
export const OLD_CATEGORY_FIELD_NAME = 'Tipo Pelle';
export const CATEGORY_FIELD_NAME = 'Categoria';

/** Lista salvata → categorie. Assente, vuota o rovinata → predefinite (chi legge non scrive nulla). */
export function parseCategories(raw: string | null | undefined): Category[] {
  if (!raw) return [...DEFAULT_CATEGORIES];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [...DEFAULT_CATEGORIES];
    const seen = new Set<string>();
    const list: Category[] = [];
    for (const item of value) {
      const id = item && typeof item.id === 'string' ? item.id.trim() : '';
      const label = item && typeof item.label === 'string' ? item.label.trim() : '';
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      list.push({ id, label });
    }
    return list.length ? list : [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

// Maiuscole e accenti indifferenti: «Cincillà» e «cincilla» sono lo stesso nome.
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

/** Id per una categoria nuova: dal nome senza accenti («Cincillà» → «cincilla»), unico nella lista. */
export function categoryIdFor(label: string, existing: readonly Pick<Category, 'id'>[]): string {
  const base = fold(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'categoria';
  const ids = new Set(existing.map((c) => c.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** Errore per un nome nuovo o rinominato (`editingId` = la categoria che si rinomina), altrimenti null. */
export function categoryNameError(label: string, existing: readonly Category[], editingId?: string): string | null {
  const name = label.trim();
  if (!name) return 'Inserisci un nome per la categoria';
  if (existing.some((c) => c.id !== editingId && fold(c.label) === fold(name))) return `Esiste già la categoria "${name}"`;
  return null;
}

/** Nome da mostrare per l'id salvato sul prodotto; un id che non è più in lista si mostra com'è (come le posizioni). */
export function categoryLabel(categories: readonly Category[], id: string | undefined): string {
  if (!id) return '';
  return categories.find((c) => c.id === id)?.label ?? id;
}

/** Il campo di sistema `furType` salvato con il vecchio nome predefinito si legge come «Categoria» (senza riscrivere). */
export function withCategoryFieldName<T extends { id: string; name: string; isSystem?: boolean }>(fields: T[]): T[] {
  return fields.map((f) => (f.id === 'furType' && f.isSystem && f.name === OLD_CATEGORY_FIELD_NAME ? { ...f, name: CATEGORY_FIELD_NAME } : f));
}
