import type { CustomField, ProductCustomData } from '../types';

// D03: in Modifica i campi personalizzati da mostrare sono quelli che il modulo Aggiungi mostra (nel layout e
// visibili) più quelli che il prodotto ha già (anche se tolti dal layout dopo), nell'ordine del layout.
// Prima comparivano solo i campi già compilati: un campo vuoto o creato dopo non si poteva più compilare.
export function editableFields<F extends Pick<CustomField, 'id'>>(
  activeFields: readonly F[],
  layoutFields: readonly { id: string; type: string; visible: boolean }[],
  productFieldIds: readonly string[],
): F[] {
  const position = new Map(layoutFields.map((f, i) => [f.id, i]));
  const shown = new Set(layoutFields.filter((f) => f.type === 'custom' && f.visible).map((f) => f.id));
  const has = new Set(productFieldIds);
  return activeFields
    .map((field, i) => ({ field, i, at: position.get(field.id) ?? Number.MAX_SAFE_INTEGER }))
    .filter(({ field }) => shown.has(field.id) || has.has(field.id))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ field }) => field);
}

// D04: i campi personalizzati della Scheda nell'ordine del layout di Aggiungi, non in quello in cui sono stati
// compilati. I campi che il layout non contiene (tolti o nascosti dopo) vanno in fondo, nell'ordine di prima.
export function orderByLayout(customData: ProductCustomData[], layoutIds: string[]): ProductCustomData[] {
  const position = new Map(layoutIds.map((id, i) => [id, i]));
  return customData
    .map((item, i) => ({ item, i, at: position.get(item.fieldSnapshot?.id) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ item }) => item);
}
