import type { ProductCustomData } from '../types';

// D04: i campi personalizzati della Scheda nell'ordine del layout di Aggiungi, non in quello in cui sono stati
// compilati. I campi che il layout non contiene (tolti o nascosti dopo) vanno in fondo, nell'ordine di prima.
export function orderByLayout(customData: ProductCustomData[], layoutIds: string[]): ProductCustomData[] {
  const position = new Map(layoutIds.map((id, i) => [id, i]));
  return customData
    .map((item, i) => ({ item, i, at: position.get(item.fieldSnapshot?.id) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ item }) => item);
}
