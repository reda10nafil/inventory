// Righe dell'export CSV dei prodotti (Impostazioni › Esporta) e lettura della cartella all'import.
// P07: l'export includeva i prodotti nel cestino senza segnarli e non aveva la cartella, che si perdeva
// nel giro esporta-importa. Le foto salvate sul dispositivo non entrano nel CSV (solo i link http).
import type { Library, Product } from '../types';

export const PRODUCT_CSV_HEADER = ['SKU', 'Categoria', 'Posizione', 'Status', 'Prezzo Acquisto', 'Prezzo Vendita', 'Lunghezza', 'Larghezza', 'Peso', 'Note', 'Data Produzione', 'Immagini URL', 'Dati Personalizzati JSON', 'GS1 Digital Link', 'Link allegati Drive JSON', 'Cartella'];

/** Intestazione più una riga per ogni prodotto non nel cestino. */
export function productCsvRows(products: readonly Product[], libraries: readonly Pick<Library, 'id' | 'name'>[]): unknown[][] {
  const folder = (id?: string) => (id ? libraries.find((l) => l.id === id)?.name ?? id : '');
  return [
    PRODUCT_CSV_HEADER,
    ...products.filter((p) => !p.deletedAt).map((product) => [
      product.sku,
      product.furType,
      product.location,
      product.status,
      product.purchasePrice,
      product.sellPrice,
      product.length,
      product.width,
      product.weight,
      product.technicalNotes,
      product.productionDate,
      JSON.stringify(product.backupImageLinks?.length ? product.backupImageLinks : (product.images || []).filter((uri) => /^https?:\/\//i.test(uri))),
      JSON.stringify(product.customData || []),
      product.gs1DigitalLink,
      JSON.stringify(product.backupCustomDataLinks || {}),
      folder(product.libraryId),
    ]),
  ];
}

/** Cartella scritta nel CSV (nome o id, maiuscole indifferenti) → id di una cartella esistente, altrimenti nessuna. */
export function libraryIdFromCsv(value: string, libraries: readonly Pick<Library, 'id' | 'name'>[]): string | undefined {
  const v = value.trim().toLocaleLowerCase();
  if (!v) return undefined;
  return libraries.find((l) => l.id.toLocaleLowerCase() === v || l.name.trim().toLocaleLowerCase() === v)?.id;
}
