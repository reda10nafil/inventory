import { Model } from '@nozbe/watermelondb';
import { text, date, json } from '@nozbe/watermelondb/decorators';

export type TimelineType =
  | 'created'
  | 'moved'
  | 'modified'
  | 'sold'
  | 'scanned'
  | 'photo_added'
  | 'deleted'
  | 'restored';

export type TimelineDetails = {
  from?: string;
  to?: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  finalPrice?: number;
  photoCount?: number;
  changes?: string[];
};

const detailsSanitizer = (v: unknown): TimelineDetails => {
  if (v && typeof v === 'object') return v as TimelineDetails;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return p && typeof p === 'object' ? p : {};
    } catch {
      return {};
    }
  }
  return {};
};

export default class TimelineEvent extends Model {
  static table = 'timeline';

  @text('product_id') productId!: string;
  @text('type') type!: TimelineType;
  @date('timestamp') timestamp!: Date;
  @json('details', detailsSanitizer) details!: TimelineDetails;
  @text('created_by') createdBy?: string;
  @text('sync_status') syncStatus!: string;
}
