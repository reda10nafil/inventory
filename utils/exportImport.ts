import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../backend-auth/supabase/client';

export async function exportProductsToCSV(operatorId: string, filename = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`) {
  try {
    const { data: products, error } = await supabase.from('products').select('*').eq('operator_id', operatorId).order('created_at', { ascending: false });
    if (error) throw error;

    const headers = ['ID', 'Nome', 'Descrizione', 'Immagine URL', 'Quantità¹¹', 'Creato', 'Aggiornato'];
    const rows = products.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.image_url || '', // FIX: include link immagine
      p.quantity || 0,
      p.created_at,
      p.updated_at
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const fileUri = FileSystem.documentDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
    return { success: true, fileUri };
  } catch (error) {
    return { success: false, error };
  }
}

export async function importProductsFromCSV(fileUri: string, operatorId: string) {
  try {
    const csvContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const lines = csvContent.split('\n').filter((line) => line.trim());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      const columns = parseCSVLine(lines[i]);
      if (columns.length >= 7) {
        products.push({
          id: columns[0],
          name: unescapeCSV(columns[1]),
          description: unescapeCSV(columns[2]),
          image_url: columns[3] || null, // FIX: legge image_url
          quantity: parseInt(columns[4]) || 0,
          created_at: columns[5],
          updated_at: columns[6],
          operator_id: operatorId,
        });
      }
    }

    for (const product of products) {
      await supabase.from('products').upsert(product, { onConflict: 'id' });
    }

    return { success: true, count: products.length };
  } catch (error) {
    return { success: false, error };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) { result.push(current); current = ''; }
    else current += char;
  }
  result.push(current);
  return result;
}

function unescapeCSV(field: string): string {
  return field.replace(/^"|"$/g, '').replace(/""/g, '"');
}

export default { exportProductsToCSV, importProductsFromCSV };
