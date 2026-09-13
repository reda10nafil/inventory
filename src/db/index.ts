/**
 * SyncroFlow — Database init (Bare RN 0.81.5, JSI enabled)
 * Import: import { database } from '@/db';
 */
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import syncroFlowSchema from './schema';
import Product from './models/Product';
import Automation from './models/Automation';
import TimelineEvent from './models/TimelineEvent';
import ChatMessage from './models/ChatMessage';
import TeamMember from './models/TeamMember';

const adapter = new SQLiteAdapter({
  schema: syncroFlowSchema,
  // JSI — sync reads su UI thread (critico per hydration chat)
  // Richiede WatermelonDB >=0.27 + autolinking bare. Fallback automatico se JSI non disponibile.
  jsi: true,
  // @ts-ignore — onSetUpError compat
  onSetUpError: (error: Error) => console.error('[DB] setup error', error),
  // migrations opzionale v2+ (aggiungere qui)
  // migrations,
});

export const database = new Database({
  adapter,
  modelClasses: [Product, Automation, TimelineEvent, ChatMessage, TeamMember],
  actionsEnabled: true,
});

export { syncroFlowSchema };
export * from './sync';
