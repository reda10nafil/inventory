/**
 * Adapter WatermelonDB per il browser: LokiJS con salvataggio in IndexedDB.
 * Metro lo sceglie al posto di adapter.ts quando la piattaforma è web.
 */
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import syncroFlowSchema from './schema';

export const adapter = new LokiJSAdapter({
  schema: syncroFlowSchema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
  dbName: 'syncroflow',
  onSetUpError: (error: Error) => console.error('[DB] setup error', error),
});
