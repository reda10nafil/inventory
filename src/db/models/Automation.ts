import { Model } from '@nozbe/watermelondb';
import { text, date, json } from '@nozbe/watermelondb/decorators';

export type AutomationStep = {
  id: string;
  type: 'move' | 'tag' | 'sell' | 'notify' | 'custom';
  params?: Record<string, unknown>;
  order: number;
};

const stepsSanitizer = (v: unknown): AutomationStep[] => {
  if (Array.isArray(v)) return v as AutomationStep[];
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default class Automation extends Model {
  static table = 'automations';

  @text('name') name!: string;
  @text('description') description?: string;
  @text('icon') icon?: string;
  @text('color') color?: string;
  @json('steps', stepsSanitizer) steps!: AutomationStep[];
  @date('created_at') createdAt!: Date;
  @text('updated_by') updatedBy?: string;
  @text('sync_status') syncStatus!: string;
}
