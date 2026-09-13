import { Model } from '@nozbe/watermelondb';
import { text, date, json } from '@nozbe/watermelondb/decorators';

/**
 * Payload leggero su LAN — solo SKU + automationIds
 * Hydration: receiver fa query locale WatermelonDB per ogni sku -> Product card
 */
export type ChatPayload = {
  sku: string[]; // es. ["LOG-2026-001", "LOG-2026-002"]
  automationIds: string[];
  text?: string;
};

export type HydratedCache = {
  products?: Array<Record<string, unknown>>;
  automations?: Array<Record<string, unknown>>;
  generatedAt: number;
} | null;

const payloadSanitizer = (v: unknown): ChatPayload => {
  const fallback: ChatPayload = { sku: [], automationIds: [] };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.sku) && Array.isArray(o.automationIds)) return o as ChatPayload;
  }
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p && Array.isArray(p.sku) && Array.isArray(p.automationIds)) return p;
    } catch {}
  }
  return fallback;
};

const hydratedSanitizer = (v: unknown): HydratedCache => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    if (!v) return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  if (typeof v === 'object') return v as HydratedCache;
  return null;
};

export default class ChatMessage extends Model {
  static table = 'chat_messages';

  @text('sender_id') senderId!: string;
  @json('payload', payloadSanitizer) payload!: ChatPayload;
  @json('hydrated_cache', hydratedSanitizer) hydratedCache!: HydratedCache;
  @date('created_at') createdAt!: Date;
  @text('sync_status') syncStatus!: string;

  /** Helper: sku[] per withObservables hydration */
  get skuList(): string[] {
    return this.payload?.sku ?? [];
  }

  get automationIdList(): string[] {
    return this.payload?.automationIds ?? [];
  }
}
