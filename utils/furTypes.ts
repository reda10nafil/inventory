// Tipi di pelle (M01, ticket 04; C1, ticket 19): lista modificabile per spazio che parte dai tipi di pelle di sempre.
// Il dato sul prodotto è `furType` (l'id del tipo), **facoltativo** da C1: un prodotto che non è una pelliccia
// non ne ha uno (stringa vuota). In M01 questa lista si chiamava «Categorie»; da C1 le categorie sono le cartelle
// (`utils/categories.ts`). Nessuna migrazione: id e chiave `furinventory_categories:{org}` restano quelli di M01.
import { FUR_TYPES } from '../constants/config';
import { choiceList } from './fieldValues';

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

// ---- C2 (ticket 21): controlli dell'editor dei valori in Campi Personalizzati › Tipo di pelle (OptionsEditor) ----

/** Prodotti che usano un tipo di pelle, cestino compreso (`usage` di `utils/productRules.ts`). */
export interface FurTypeUsage {
  active: number;
  trashed: number;
}

const prodotti = (n: number) => (n === 1 ? '1 prodotto' : `${n} prodotti`);

/** Testo d'uso accanto al valore: «Nessun prodotto», «3 prodotti», «3 prodotti (1 nel cestino)». */
export function furTypeUsageText(used: FurTypeUsage): string {
  const n = used.active + used.trashed;
  if (!n) return 'Nessun prodotto';
  if (!used.trashed) return prodotti(n);
  return used.active ? `${prodotti(n)} (${used.trashed} nel cestino)` : `${prodotti(n)} (nel cestino)`;
}

/**
 * Errore per eliminare il tipo `id`, altrimenti null. Deve restarne almeno uno: `parseFurTypes` legge una lista vuota
 * come i predefiniti, che ricomparirebbero. Un tipo usato da un prodotto, anche venduto o nel cestino, non si elimina
 * (si può rinominare): il prodotto resterebbe con un id senza nome.
 */
export function furTypeDeleteError(furTypes: readonly FurType[], id: string, used: FurTypeUsage): string | null {
  if (furTypes.length <= 1) return 'Deve restare almeno un tipo di pelle.';
  if (used.active + used.trashed === 0) return null;
  const parts = used.active && used.trashed ? `${prodotti(used.active)} e ${used.trashed} nel cestino`
    : used.active ? prodotti(used.active) : `${prodotti(used.trashed)} nel cestino`;
  const trash = used.trashed ? ' Quelli nel cestino si possono anche eliminare per sempre dal Cestino.' : '';
  return `Il tipo di pelle "${furTypeLabel(furTypes, id)}" è usato da ${parts}. Cambia il tipo di pelle di quei prodotti prima di eliminarlo, oppure rinominalo.${trash}`;
}

/** Nomi dei campi personalizzati attivi con «Sorgente Dati: Tipi di pelle» (`linkTo: 'furType'`). */
export function furTypeLinkedFields(fields: readonly { name: string; linkTo?: string; deletedAt?: string }[]): string[] {
  return fields.filter((f) => f.linkTo === 'furType' && !f.deletedAt).map((f) => f.name);
}

// ---- VAL (ticket 23, punto 7): i campi personalizzati con «Sorgente Dati: Tipi di pelle» salvano l'id del tipo ----

type WithCustomData = {
  furType?: string;
  deletedAt?: string;
  customData?: readonly { value: unknown; fieldSnapshot?: { id?: string; name?: string; linkTo?: string } }[];
};
const linkedValues = (p: WithCustomData) =>
  (p.customData || []).filter((d) => d.fieldSnapshot?.linkTo === 'furType').flatMap((d) => choiceList(d.value));

/**
 * Prodotti che usano un tipo di pelle (cestino compreso): come tipo del prodotto, oppure in un campo collegato, con
 * l'id (da VAL) o con il nome scritto prima. Un tipo usato così non si elimina (resterebbe un id senza nome).
 */
export function furTypeUsage(products: readonly WithCustomData[], furType: FurType): FurTypeUsage {
  const used = products.filter((p) => p.furType === furType.id || linkedValues(p).some((v) => v === furType.id || v === furType.label));
  const trashed = used.filter((p) => p.deletedAt).length;
  return { active: used.length - trashed, trashed };
}

/**
 * Campi collegati dove dei prodotti hanno ancora il **nome** del tipo scritto (compilati prima di VAL): dopo un
 * rinomina lì resta il nome vecchio, perché non si riscrive nessun prodotto. `fields` dà il nome di adesso del campo.
 */
export function furTypeLegacyNames(
  products: readonly WithCustomData[],
  fields: readonly { id: string; name: string }[],
  furType: FurType,
): { field: string; count: number }[] {
  const counts = new Map<string, { field: string; count: number }>();
  for (const p of products) {
    const seen = new Set<string>();
    for (const d of p.customData || []) {
      const id = d.fieldSnapshot?.id;
      if (!id || d.fieldSnapshot?.linkTo !== 'furType' || seen.has(id)) continue;
      if (!choiceList(d.value).some((v) => v === furType.label && v !== furType.id)) continue;
      seen.add(id);
      const entry = counts.get(id) ?? { field: fields.find((f) => f.id === id)?.name ?? d.fieldSnapshot?.name ?? id, count: 0 };
      entry.count += 1;
      counts.set(id, entry);
    }
  }
  return [...counts.values()];
}

/**
 * Messaggio dopo il rinomina. I prodotti salvano l'id del tipo, quindi mostrano il nome nuovo, anche nei campi
 * collegati compilati da VAL; dove un campo collegato ha ancora il nome scritto prima (`legacy`) lì resta il vecchio.
 */
export function furTypeRenameMessage(oldLabel: string, newLabel: string, used: FurTypeUsage, legacy: readonly { field: string; count: number }[] = []): string {
  const n = used.active + used.trashed;
  const follow = !n ? '' : n === 1 ? ' Il prodotto che lo usa mostra il nome nuovo.' : ` I ${n} prodotti che lo usano mostrano il nome nuovo.`;
  const note = legacy.filter((l) => l.count > 0).map(({ field, count }) =>
    ` Nel campo «${field}» ${count === 1 ? '1 prodotto compilato prima ha' : `${count} prodotti compilati prima hanno`} il nome scritto: lì resta «${oldLabel}».`).join('');
  return `«${oldLabel}» ora si chiama «${newLabel}».${follow}${note}`;
}
