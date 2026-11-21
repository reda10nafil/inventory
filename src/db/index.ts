/**
 * SyncroFlow — Database init (Bare RN 0.81.5, JSI enabled)
 * Import: import { database } from '@/db';
 */
import { Database } from '@nozbe/watermelondb';
import syncroFlowSchema from './schema';
// adapter.ts su Android/iOS (SQLite), adapter.web.ts sul browser (LokiJS)
import { adapter } from './adapter';
import Product from './models/Product';
import Automation from './models/Automation';
import TimelineEvent from './models/TimelineEvent';
import ChatMessage from './models/ChatMessage';
import TeamMember from './models/TeamMember';

export const database = new Database({
  adapter,
  modelClasses: [Product, Automation, TimelineEvent, ChatMessage, TeamMember],
  actionsEnabled: true,
});

export { syncroFlowSchema };
export * from './sync';
