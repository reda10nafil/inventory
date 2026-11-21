/**
 * Adapter WatermelonDB per Android/iOS: SQLite con JSI.
 * Sul web Metro usa adapter.web.ts (LokiJS + IndexedDB), perché SQLite nativo lì non esiste.
 */
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import syncroFlowSchema from './schema';

export const adapter = new SQLiteAdapter({
  schema: syncroFlowSchema,
  // JSI — sync reads su UI thread (critico per hydration chat)
  // Richiede WatermelonDB >=0.27 + autolinking bare. Fallback automatico se JSI non disponibile.
  jsi: true,
  // @ts-ignore — onSetUpError compat
  onSetUpError: (error: Error) => console.error('[DB] setup error', error),
  // migrations opzionale v2+ (aggiungere qui)
  // migrations,
});
