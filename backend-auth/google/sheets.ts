import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const GOOGLE_SHEETS_SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

/**
 * Crea un client OAuth2 per Google Sheets
 */
function createSheetsClient(accessToken: string) {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken
  });

  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  return sheets;
}

/**
 * Esporta i prodotti in un Google Sheet
 */
export async function exportToSheets(
  accessToken: string,
  products: Array<{
    id: string;
    name: string;
    description: string;
    image_url: string;
    quantity: number;
  }>
) {
  const sheets = createSheetsClient(accessToken);

  // Prepara i dati
  const values = [
    ['ID', 'Nome', 'Descrizione', 'Immagine URL', 'Quantità¹¹'],
    ...products.map((p) => [
      p.id,
      p.name,
      p.description || '',
      p.image_url || '',
      p.quantity || 0
    ])
  ];

  // Scrivi nello sheet
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values
    }
  });

  return GOOGLE_SHEETS_SPREADSHEET_ID;
}

/**
 * Importa i prodotti da un Google Sheet
 */
export async function importFromSheets(accessToken: string) {
  const sheets = createSheetsClient(accessToken);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEETS_SPREADSHEET_ID,
    range: 'Sheet1!A2:E'
  });

  const rows = response.data.values || [];

  return rows.map((row) => ({
    id: row[0],
    name: row[1],
    description: row[2] || '',
    image_url: row[3] || '',
    quantity: parseInt(row[4]) || 0
  }));
}

/**
 * Crea un nuovo spreadsheet per l'export
 */
export async function createNewSpreadsheet(accessToken: string, title: string) {
  const sheets = google.sheets({
    version: 'v4',
    auth: new OAuth2Client(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    ).setCredentials({ access_token: accessToken })
  });

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title
      }
    }
  });

  return response.data.spreadsheetId;
}

export default { exportToSheets, importFromSheets, createNewSpreadsheet };
