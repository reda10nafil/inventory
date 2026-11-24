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

/**
 * Aggiunge in fondo al layout i campi che non ci sono già, visibili e della misura data. `baseIds`: i campi di sistema
 * (un modello che abbina per nome «Altezza» o «Peso» a un campo Base lo mette come Base, non come personalizzato:
 * altrimenti Aggiungi lo salverebbe nei dati personalizzati e non nel campo del prodotto).
 */
export function appendLayoutFields(current: readonly LayoutField[], ids: readonly string[], size: FieldSize = 'medium', baseIds: readonly string[] = []): LayoutField[] {
  const present = new Set(current.map((f) => f.id));
  const added = [...new Set(ids)].filter((id) => !present.has(id))
    .map((id) => ({ id, type: baseIds.includes(id) ? 'base' as const : 'custom' as const, size, visible: true }));
  return [...current, ...added];
}

/**
 * Campi Base nati dopo i layout già salvati (S2, ticket 14: «Altezza»): vanno subito dopo l'ultima delle misure che ci
 * sono (lunghezza, larghezza, peso). Un layout senza nessuna di quelle (misure tolte dall'utente) resta com'è.
 */
const LATE_BASE_FIELDS: { id: string; after: readonly string[]; size: FieldSize }[] = [
  { id: 'height', after: ['length', 'width', 'weight'], size: 'small' },
];
/** Id dei campi Base nati dopo: il layout li ricorda in `lateFields` una volta proposti. */
export const LATE_BASE_FIELD_IDS: readonly string[] = LATE_BASE_FIELDS.map((f) => f.id);

/**
 * Layout letto con i campi Base nuovi, **solo in memoria**: chi lo chiama non lo riscrive e la `version` non cambia
 * (vincolo 1 di map-3, che sostituirebbe il modulo dell'utente). Stesso array se non manca niente.
 * `offered`: campi già proposti a questo layout (`lateFields` salvato): un campo che l'utente ha tolto non torna.
 * Il campo nuovo è visibile se lo è almeno una delle misure accanto (misure tutte nascoste: nascosto anche lui).
 */
export function withLateBaseFields(fields: LayoutField[], offered: readonly string[] = []): LayoutField[] {
  let out = fields;
  for (const late of LATE_BASE_FIELDS) {
    if (offered.includes(late.id) || out.some((f) => f.id === late.id)) continue;
    let at = -1;
    out.forEach((f, i) => { if (late.after.includes(f.id)) at = i; });
    if (at < 0) continue;
    const visible = out.some((f) => late.after.includes(f.id) && f.visible);
    out = [...out.slice(0, at + 1), { id: late.id, type: 'base', size: late.size, visible }, ...out.slice(at + 1)];
  }
  return out;
}
