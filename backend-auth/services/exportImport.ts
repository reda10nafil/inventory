import { supabase } from '../supabase/client';
import { exportToSheets, importFromSheets } from '../google/sheets';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Esporta tutti i prodotti in CSV
 */
export async function exportToCSV(products: any[], filename = 'inventory_export.csv') {
  // Crea contenuto CSV
  const headers = ['ID', 'Nome', 'Descrizione', 'Immagine URL', 'Quantità¹¹'];
  const rows = products.map((p) => [
    p.id,
    `"${p.name}"`,
    `"${p.description || ''}"`,
    p.image_url || '',
    p.quantity || 0
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // Salva file temporaneo
  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, csvContent);

  // Condividi file
  await Sharing.shareAsync(fileUri);

  return fileUri;
}

/**
 * Importa prodotti da CSV
 */
export async function importFromCSV(csvContent: string, operatorId: string) {
  const lines = csvContent.split('\n');
  const products = [];

  // Salta header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    
    if (columns.length >= 5) {
      products.push({
        id: columns[0],
        name: columns[1],
        description: columns[2],
        image_url: columns[3],
        quantity: parseInt(columns[4]) || 0,
        operator_id: operatorId
      });
    }
  }

  // Inserisci nel database
  for (const product of products) {
    await supabase.from('products').upsert(product);
  }

  return products;
}

/**
 * Esporta in Google Sheets (con immagini)
 */
export async function exportToGoogleSheets(accessToken: string, operatorId: string) {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('operator_id', operatorId);

  if (!products) return null;

  const spreadsheetId = await exportToSheets(accessToken, products);
  return spreadsheetId;
}

/**
 * Importa da Google Sheets
 */
export async function importFromGoogleSheets(accessToken: string, operatorId: string) {
  const products = await importFromSheets(accessToken);

  // Inserisci nel database
  for (const product of products) {
    await supabase.from('products').upsert({
      ...product,
      operator_id: operatorId
    });
  }

  return products;
}

/**
 * Parser per linee CSV (gestisce virgolette)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export default {
  exportToCSV,
  importFromCSV,
  exportToGoogleSheets,
  importFromGoogleSheets
};
