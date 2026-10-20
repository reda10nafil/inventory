const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function driveRequest<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

export async function ensureOrganizationDriveFolder(token: string, organizationId: string) {
  const escapedOrgId = organizationId.replace(/'/g, "\\'");
  const query = encodeURIComponent(`name = 'Syncro Flow ${escapedOrgId}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const found = await driveRequest<{ files?: Array<{ id: string }> }>(
    `${DRIVE_API}/files?q=${query}&fields=files(id)&pageSize=1`, token,
  );
  if (found.files?.[0]?.id) return found.files[0].id;
  const folder = await driveRequest<{ id: string }>(`${DRIVE_API}/files?fields=id`, token, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `Syncro Flow ${organizationId}`, mimeType: 'application/vnd.google-apps.folder' }),
  });
  return folder.id;
}

export async function uploadDriveFile(token: string, folderId: string, fileName: string, content: Blob, mimeType?: string) {
  const boundary = `syncroflow_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType || content.type || 'application/octet-stream'}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ]);
  return driveRequest<{ id: string; name: string; webViewLink?: string; mimeType?: string }>(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink,mimeType`, token, {
      method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body,
    },
  );
}

export async function uploadLocalUriToDrive(token: string, folderId: string, uri: string, fileName: string) {
  const source = await fetch(uri);
  if (!source.ok) throw new Error('Il file locale non è leggibile.');
  const blob = await source.blob();
  return uploadDriveFile(token, folderId, fileName, blob, blob.type);
}

export async function createGoogleSheetBackup(token: string, title: string, values: string[][]) {
  const spreadsheet = await driveRequest<{ spreadsheetId: string; spreadsheetUrl: string }>(
    'https://sheets.googleapis.com/v4/spreadsheets', token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ properties: { title }, sheets: [{ properties: { title: 'Inventario' } }] }),
    },
  );
  await driveRequest<Record<string, unknown>>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheet.spreadsheetId}/values/Inventario!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    token, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    },
  );
  return spreadsheet;
}
