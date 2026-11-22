import type { CustomField } from '../types';
import type { LayoutField } from '../contexts/LayoutContext';

// D24: «Obbligatorio» sui campi personalizzati controllato davvero al salvataggio di Aggiungi.
// Contano solo i campi che il modulo mostra (nel layout e visibili): un campo obbligatorio che l'utente non vede non
// può bloccare il salvataggio. Un numero vale anche se è 0; testo vuoto, elenco vuoto o nessun valore no.
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'number') return Number.isNaN(value);
  return false;
}

export function missingRequiredFields(
  layoutFields: Pick<LayoutField, 'id' | 'type' | 'visible'>[],
  customFields: CustomField[],
  values: Record<string, unknown>,
): CustomField[] {
  return layoutFields
    .filter((lf) => lf.type === 'custom' && lf.visible)
    .map((lf) => customFields.find((cf) => cf.id === lf.id && !cf.deletedAt))
    .filter((cf): cf is CustomField => !!cf && cf.required && isEmptyValue(values[cf.id]));
}
