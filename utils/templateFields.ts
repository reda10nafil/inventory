// Campi dei modelli (Layout builder › MODELLI, Modelli di settore) e dei campi nuovi da mettere nel layout.
// D12: il modello salvava un solo campo e non lo metteva nel layout; P11: un campo nuovo non compariva in Aggiungi.
import type { CustomField } from '../types';
import type { FieldSize, LayoutField } from '../contexts/LayoutContext';

const key = (name: string) => name.trim().toLocaleLowerCase();

/** Per ogni campo del modello: il campo attivo con lo stesso nome se c'è già, altrimenti da creare. */
export function matchTemplateFields<T extends { name: string }>(
  templateFields: readonly T[],
  existing: readonly Pick<CustomField, 'id' | 'name' | 'deletedAt'>[],
): { field: T; existingId?: string }[] {
  const byName = new Map(existing.filter((f) => !f.deletedAt).map((f) => [key(f.name), f.id]));
  const seen = new Set<string>();
  return templateFields
    .filter((f) => (seen.has(key(f.name)) ? false : (seen.add(key(f.name)), true)))
    .map((field) => ({ field, existingId: byName.get(key(field.name)) }));
}

/** Aggiunge in fondo al layout i campi che non ci sono già, visibili e della misura data. */
export function appendLayoutFields(current: readonly LayoutField[], ids: readonly string[], size: FieldSize = 'medium'): LayoutField[] {
  const present = new Set(current.map((f) => f.id));
  const added = [...new Set(ids)].filter((id) => !present.has(id)).map((id) => ({ id, type: 'custom' as const, size, visible: true }));
  return [...current, ...added];
}
