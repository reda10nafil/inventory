import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

/**
 * Crea un client OAuth2 per Google Drive
 */
export function createDriveClient(accessToken: string) {
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });
  return drive;
}

/**
 * Carica un'immagine su Google Drive e restituisce il link scaricabile
 */
export async function uploadImageToDrive(
  accessToken: string,
  fileName: string,
  imageBase64: string
): Promise<string> {
  const drive = createDriveClient(accessToken);

  // Converti base64 in buffer
  const buffer = Buffer.from(imageBase64, 'base64');

  // Crea il file su Drive
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      mimeType: 'image/jpeg'
    },
    media: {
      mimeType: 'image/jpeg',
      body: buffer
    },
    fields: 'id, webContentLink'
  });

  const fileId = response.data.id;
  
  // Rendi il file accessibile pubblicamente (solo lettura)
  await drive.permissions.create({
    fileId: fileId!,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });

  // Ottieni il link di download
  const file = await drive.files.get({
    fileId: fileId!,
    fields: 'webContentLink'
  });

  return file.data.webContentLink!;
}

/**
 * Scarica un'immagine da Google Drive
 */
export async function downloadImageFromDrive(
  accessToken: string,
  fileId: string
): Promise<Buffer> {
  const drive = createDriveClient(accessToken);

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export default { uploadImageToDrive, downloadImageFromDrive, createDriveClient };
