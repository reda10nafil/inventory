// 26/11: backup su Google Drive come WhatsApp, con l'account Google del telefono (permesso `drive.file`: solo i file
// creati dall'app). Nella cartella «Syncro Flow» del Drive dell'account: il CSV dell'inventario (lo stesso di Esporta,
// con i link delle foto) e un foglio Google. Si fa da Impostazioni e da solo una volta al giorno con l'accesso attivo;
// l'ultimo backup (quando, link) resta sul telefono per mostrarlo.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createGoogleSheetBackup, ensureOrganizationDriveFolder, moveDriveFileToFolder, uploadDriveFile } from '../backend-auth/google/driveApi';
import { stringifyCsv } from './csv';
import { googleAccessToken } from './googleAccount';

export interface DriveBackupInfo { at: string; sheetUrl?: string; csvUrl?: string }

export const DRIVE_BACKUP_EVERY_MS = 24 * 60 * 60 * 1000;
const lastKey = (cloudOrganizationId: string) => `driveBackup:last:${cloudOrganizationId}`;

export async function lastDriveBackup(cloudOrganizationId: string): Promise<DriveBackupInfo | null> {
  try {
    const saved = await AsyncStorage.getItem(lastKey(cloudOrganizationId));
    return saved ? JSON.parse(saved) as DriveBackupInfo : null;
  } catch {
    return null;
  }
}

/** Serve un backup: mai fatto, o l'ultimo è più vecchio di un giorno. */
export function driveBackupDue(last: DriveBackupInfo | null, now = Date.now()): boolean {
  if (!last?.at) return true;
  const at = Date.parse(last.at);
  return !Number.isFinite(at) || now - at >= DRIVE_BACKUP_EVERY_MS;
}

/** «oggi alle 05:10», «ieri alle 22:03», altrimenti «24/11 alle 09:15». */
export function backupWhen(iso: string, now = new Date()): string {
  const at = new Date(iso);
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  const day = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (day(at) === day(now)) return `oggi alle ${time}`;
  if (day(at) === day(yesterday)) return `ieri alle ${time}`;
  return `${String(at.getDate()).padStart(2, '0')}/${String(at.getMonth() + 1).padStart(2, '0')} alle ${time}`;
}

/** CSV e foglio Google nella cartella «Syncro Flow» del Drive dell'account; salva quando e i link. */
export async function runDriveBackup(cloudOrganizationId: string, rows: readonly (readonly unknown[])[]): Promise<DriveBackupInfo> {
  const token = await googleAccessToken();
  if (!token) throw new Error('Accedi con Google (Impostazioni › Dati e backup) per fare il backup su Drive.');
  const now = new Date();
  const folderId = await ensureOrganizationDriveFolder(token, cloudOrganizationId);
  const csv = await uploadDriveFile(
    token, folderId, `inventario_${now.toISOString().slice(0, 10)}.csv`,
    new Blob([stringifyCsv(rows)], { type: 'text/csv' }), 'text/csv',
  );
  const sheet = await createGoogleSheetBackup(
    token, `Syncro Flow – inventario ${now.toLocaleDateString('it-IT')}`,
    rows.map((row) => row.map((cell) => (cell == null ? '' : String(cell)))),
  );
  try { await moveDriveFileToFolder(token, sheet.spreadsheetId, folderId); } catch { /* resta nella radice di Drive */ }
  const info: DriveBackupInfo = { at: now.toISOString(), sheetUrl: sheet.spreadsheetUrl, csvUrl: csv.webViewLink };
  try { await AsyncStorage.setItem(lastKey(cloudOrganizationId), JSON.stringify(info)); } catch { /* il backup c'è comunque */ }
  return info;
}
