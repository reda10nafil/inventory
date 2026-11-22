// Categorie dei prodotti = le cartelle (C1, ticket 19): `libraries` di InventoryContext, il prodotto ne salva l'id in
// `libraryId`. Una categoria può avere un genitore facoltativo (`parentId`): è una sottocategoria. Le schermate
// creano un solo livello; queste funzioni reggono anche alberi più profondi, genitori spariti e cicli (dati vecchi,
// importati o sincronizzati): un genitore che non c'è più, o un giro, fa leggere la categoria come principale.
// Nessuna migrazione: le cartelle di prima non hanno `parentId` e sono categorie principali.

/** Forma minima di una categoria per queste funzioni (la `Library` di InventoryContext la soddisfa). */
export interface CategoryNode {
  id: string;
  name: string;
  parentId?: string;
}

/** Separatore del nome completo «Pellicce › Visone» (a schermo, nel PDF e nella colonna «Categoria» del CSV). */
export const CATEGORY_SEPARATOR = ' › ';

// Maiuscole e accenti indifferenti: «Cincillà» e «cincilla» sono lo stesso nome.
const fold = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

/** Id del genitore valido: esiste, non è la categoria stessa e risalendo non si torna a lei. Altrimenti nessuno. */
export function parentIdOf(list: readonly CategoryNode[], id: string): string | undefined {
  const byId = new Map(list.map((c) => [c.id, c]));
  const start = byId.get(id)?.parentId;
  if (!start || start === id || !byId.has(start)) return undefined;
  const seen = new Set([id]);
  for (let at: string | undefined = start; at; at = byId.get(at)?.parentId) {
    if (seen.has(at)) return at === id ? undefined : start; // giro che torna qui: principale; giro più su: non è nostro
    if (!byId.has(at)) break;
    seen.add(at);
  }
  return start;
}

/** Genitori dalla categoria principale in giù (senza la categoria stessa). */
export function categoryAncestors<T extends CategoryNode>(list: readonly T[], id: string): T[] {
  const byId = new Map(list.map((c) => [c.id, c]));
  const out: T[] = [];
  const seen = new Set([id]);
  for (let at = parentIdOf(list, id); at && !seen.has(at); at = parentIdOf(list, at)) {
    seen.add(at);
    const node = byId.get(at);
    if (node) out.unshift(node);
  }
  return out;
}

/** Sottocategorie dirette, nell'ordine della lista. */
export function childrenOf<T extends CategoryNode>(list: readonly T[], id: string | undefined): T[] {
  return list.filter((c) => parentIdOf(list, c.id) === id);
}

/** Categorie principali (senza un genitore valido), nell'ordine della lista. */
export function rootCategories<T extends CategoryNode>(list: readonly T[]): T[] {
  return childrenOf(list, undefined);
}

/** Albero in fila: ogni principale seguita dalle sue sottocategorie, con la profondità (0 = principale). */
export function categoryTree<T extends CategoryNode>(list: readonly T[]): { category: T; depth: number }[] {
  const out: { category: T; depth: number }[] = [];
  const visit = (parent: string | undefined, depth: number) => {
    for (const category of childrenOf(list, parent)) {
      out.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(undefined, 0);
  return out;
}

/** La categoria e tutte le sue sottocategorie (a ogni livello): il filtro per categoria le include. */
export function categoryWithDescendants(list: readonly CategoryNode[], id: string): Set<string> {
  const out = new Set([id]);
  for (let added = true; added;) {
    added = false;
    for (const c of list) {
      const parent = parentIdOf(list, c.id);
      if (parent && out.has(parent) && !out.has(c.id)) { out.add(c.id); added = true; }
    }
  }
  return out;
}

/** Nome completo «Pellicce › Visone»; '' senza categoria; un id che non è più in lista si mostra com'è. */
export function categoryPath(list: readonly CategoryNode[], id: string | undefined): string {
  if (!id) return '';
  const node = list.find((c) => c.id === id);
  if (!node) return id;
  return [...categoryAncestors(list, id), node].map((c) => c.name).join(CATEGORY_SEPARATOR);
}

/** Nome della sola categoria («Visone»), per le righe corte; un id che non è più in lista si mostra com'è. */
export function categoryName(list: readonly CategoryNode[], id: string | undefined): string {
  if (!id) return '';
  return list.find((c) => c.id === id)?.name ?? id;
}

/**
 * Stato delle pillole a due righe (Aggiungi, Modifica, Inventario): la principale da accendere e, sotto, le sue
 * sottocategorie con quella scelta. Vale anche per un id di sottocategoria arrivato da fuori (codice letto).
 */
export function categoryPicker<T extends CategoryNode>(list: readonly T[], selectedId: string | undefined): { rootId?: string; childId?: string; children: T[] } {
  if (!selectedId || !list.some((c) => c.id === selectedId)) return { children: [] };
  const chain = [...categoryAncestors(list, selectedId).map((c) => c.id), selectedId];
  return { rootId: chain[0], childId: chain[1], children: childrenOf(list, chain[0]) };
}

/**
 * Genitori che si possono scegliere per una categoria (un solo livello): le principali, tranne lei. Una categoria
 * che ha già sottocategorie resta principale (nessuna scelta).
 */
export function parentOptions<T extends CategoryNode>(list: readonly T[], editingId?: string): T[] {
  if (editingId && childrenOf(list, editingId).length > 0) return [];
  return rootCategories(list).filter((c) => c.id !== editingId);
}

/** Errore per un nome nuovo o cambiato: vuoto, oppure già usato da una categoria allo stesso livello. */
export function categoryNameError(list: readonly CategoryNode[], name: string, parentId: string | undefined, editingId?: string): string | null {
  const clean = name.trim();
  if (!clean) return 'Inserisci un nome per la categoria';
  const parent = parentId && list.some((c) => c.id === parentId) ? parentId : undefined;
  const twin = list.find((c) => c.id !== editingId && parentIdOf(list, c.id) === parent && fold(c.name) === fold(clean));
  if (!twin) return null;
  return parent
    ? `"${categoryName(list, parent)}" ha già la sottocategoria "${twin.name}"`
    : `Esiste già la categoria "${twin.name}"`;
}

/**
 * Perché una categoria non si elimina: ha sottocategorie, oppure prodotti non nel cestino (quelli nel cestino la
 * perdono, come prima di C1). `null` = si può eliminare.
 */
export function categoryDeleteError(
  list: readonly CategoryNode[],
  products: readonly { libraryId?: string; deletedAt?: string }[],
  id: string,
): string | null {
  const name = categoryName(list, id);
  const subs = childrenOf(list, id).length;
  if (subs > 0) {
    return `La categoria "${name}" ha ${subs === 1 ? '1 sottocategoria' : `${subs} sottocategorie`}: spostale o eliminale prima.`;
  }
  const count = products.filter((p) => p.libraryId === id && !p.deletedAt).length;
  if (count > 0) return `La categoria "${name}" contiene ${count} prodott${count === 1 ? 'o' : 'i'}. Spostarli prima di eliminare.`;
  return null;
}

/**
 * Categoria scritta nel CSV → id di una categoria esistente, altrimenti nessuna. Si confronta prima col nome
 * completo di ogni categoria («Pellicce › Visone», anche con «>»), poi con l'id, poi col solo nome (la prima
 * nell'ordine dell'albero): due principali possono avere una sottocategoria con lo stesso nome.
 */
export function categoryIdFromCsv(value: string, list: readonly CategoryNode[]): string | undefined {
  const key = (text: string) => fold(text).replace(/\s*[›>]\s*/g, ' › ');
  const v = key(value);
  if (!v) return undefined;
  const tree = categoryTree(list).map(({ category }) => category);
  return (tree.find((c) => key(categoryPath(list, c.id)) === v)
    ?? tree.find((c) => fold(c.id) === v)
    ?? tree.find((c) => fold(c.name) === v))?.id;
}

/**
 * Riga corta di card ed elenchi: nome della categoria e tipo di pelle, «Visone · Volpe»; quello che manca si salta
 * e due nomi uguali si scrivono una volta. Per la Scheda, il PDF e il CSV si usa il nome completo (`categoryPath`).
 */
export function kindLine(category: string, furType: string): string {
  if (category && furType && fold(category) === fold(furType)) return category;
  return [category, furType].filter(Boolean).join(' · ');
}

/** Nomi del prodotto per le schermate: nome completo e nome della categoria, tipo di pelle, riga corta e completa. */
export function productKind(
  product: { libraryId?: string; furType?: string },
  list: readonly CategoryNode[],
  furTypeLabel: (id: string) => string,
): { path: string; name: string; furType: string; line: string; full: string } {
  const path = categoryPath(list, product.libraryId);
  const name = categoryName(list, product.libraryId);
  const furType = product.furType ? furTypeLabel(product.furType) : '';
  const same = !!name && !!furType && fold(name) === fold(furType);
  return { path, name, furType, line: kindLine(name, furType), full: same ? path : kindLine(path, furType) };
}
