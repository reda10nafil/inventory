// Tipi di pelle (M01, ticket 04; C1, ticket 19): lista modificabile per spazio che parte dai tipi di pelle di sempre.
// Il dato sul prodotto è `furType` (l'id del tipo), **facoltativo** da C1: un prodotto che non è una pelliccia
// non ne ha uno (stringa vuota). In M01 questa lista si chiamava «Categorie»; da C1 le categorie sono le cartelle
// (`utils/categories.ts`). Nessuna migrazione: id e chiave `furinventory_categories:{org}` restano quelli di M01.
import { FUR_TYPES } from '../constants/config';

export interface FurType {
  id: string;
  label: string;
}

/** Predefiniti = i tipi di pelle di sempre, stessi id. */
export const DEFAULT_FUR_TYPES: readonly FurType[] = FUR_TYPES.map(({ id, label }) => ({ id, label }));

/** Nome del campo di sistema `furType` adesso e quelli scritti prima (pre-M01, M01-M10). */
export const FUR_TYPE_FIELD_NAME = 'Tipo di pelle';
const OLD_FUR_TYPE_FIELD_NAMES = ['Tipo Pelle', 'Categoria'];
/** Nome del campo di sistema `folder` (la categoria, C1) adesso e quello scritto prima. */
export const CATEGORY_FIELD_NAME = 'Categoria';
const OLD_CATEGORY_FIELD_NAMES = ['Cartella'];

/** Lista salvata → tipi di pelle. Assente, vuota o rovinata → predefiniti (chi legge non scrive nulla). */
export function parseFurTypes(raw: string | null | undefined): FurType[] {
  if (!raw) return [...DEFAULT_FUR_TYPES];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [...DEFAULT_FUR_TYPES];
    const seen = new Set<string>();
    const list: FurType[] = [];
    for (const item of value) {
      const id = item && typeof item.id === 'string' ? item.id.trim() : '';
      const label = item && typeof item.label === 'string' ? item.label.trim() : '';
      if (!id || !label || seen.has(id)) continue;
      seen.add(id);
      list.push({ id, label });
    }
    return list.length ? list : [...DEFAULT_FUR_TYPES];
  } catch {
    return [...DEFAULT_FUR_TYPES];
  }
}

// Maiuscole e accenti indifferenti: «Cincillà» e «cincilla» sono lo stesso nome.
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

/** Id per un tipo nuovo: dal nome senza accenti («Cincillà» → «cincilla»), unico nella lista. */
export function furTypeIdFor(label: string, existing: readonly Pick<FurType, 'id'>[]): string {
  // «categoria» come ripiego resta quello di M01: gli id già salvati non cambiano significato
  const base = fold(label).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'categoria';
  const ids = new Set(existing.map((c) => c.id));
  if (!ids.has(base)) return base;
  let n = 2;
  while (ids.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/** Errore per un nome nuovo o rinominato (`editingId` = il tipo che si rinomina), altrimenti null. */
export function furTypeNameError(label: string, existing: readonly FurType[], editingId?: string): string | null {
  const name = label.trim();
  if (!name) return 'Inserisci un nome per il tipo di pelle';
  if (existing.some((c) => c.id !== editingId && fold(c.label) === fold(name))) return `Esiste già il tipo di pelle "${name}"`;
  return null;
}

/** Nome da mostrare per l'id salvato sul prodotto; un id che non è più in lista si mostra com'è (come le posizioni). */
export function furTypeLabel(furTypes: readonly FurType[], id: string | undefined): string {
  if (!id) return '';
  return furTypes.find((c) => c.id === id)?.label ?? id;
}

/**
 * Tipo di pelle scritto in un CSV → id da salvare: l'id o il nome di un tipo in lista (maiuscole e accenti
 * indifferenti) danno l'id; un valore sconosciuto resta com'è (come prima di C1); vuoto = nessun tipo.
 */
export function furTypeFromCsv(value: string, furTypes: readonly FurType[]): string {
  const v = value.trim();
  if (!v) return '';
  const key = fold(v);
  return furTypes.find((c) => fold(c.id) === key)?.id ?? furTypes.find((c) => fold(c.label) === key)?.id ?? v;
}

/**
 * Campi di sistema salvati dalle versioni di prima, letti con i nomi di C1 senza riscrivere nulla: `furType`
 * col vecchio nome predefinito («Tipo Pelle» prima di M01, «Categoria» da M01) si chiama «Tipo di pelle», `folder`
 * («Cartella») si chiama «Categoria». Il tipo di pelle non è più obbligatorio. Un nome scelto dall'utente resta.
 */
export function withSystemFieldNames<T extends { id: string; name: string; isSystem?: boolean; required?: boolean }>(fields: T[]): T[] {
  return fields.map((f) => {
    if (!f.isSystem) return f;
    if (f.id === 'furType') {
      const name = OLD_FUR_TYPE_FIELD_NAMES.includes(f.name) ? FUR_TYPE_FIELD_NAME : f.name;
      return name === f.name && !f.required ? f : { ...f, name, required: false };
    }
    if (f.id === 'folder' && OLD_CATEGORY_FIELD_NAMES.includes(f.name)) return { ...f, name: CATEGORY_FIELD_NAME };
    return f;
  });
}
