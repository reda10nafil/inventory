import { Model } from '@nozbe/watermelondb';
import {
  field,
  text,
  date,
  json,
  readonly,
  writer,
} from '@nozbe/watermelondb/decorators';

// Sanitizer per JSON stringified arrays — evita crash su parse
const jsonSanitizer = (value: unknown): string[] => {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export default class Product extends Model {
  static table = 'products';

  // Associations (timeline 1:N via query, non relation per performance)
  // static associations = { timeline: { type: 'has_many', foreignKey: 'product_id' } }

  @text('sku') sku!: string;
  @text('fur_type') furType!: string;
  @text('location') location!: string;
  @text('status') status!: 'available' | 'sold' | 'archived';
  // images: JSON stringified string[] di path WebP locali
  @json('images', jsonSanitizer) images!: string[];
  @field('purchase_price') purchasePrice?: number;
  @field('sell_price') sellPrice?: number;
  @field('length') length?: number;
  @field('width') width?: number;
  @field('weight') weight?: number;
  @text('technical_notes') technicalNotes?: string;
  @text('library_id') libraryId?: string;
  @text('gs1_digital_link') gs1DigitalLink?: string;

  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @date('deleted_at') deletedAt?: Date;
  @date('last_scanned_at') lastScannedAt?: Date;

  @text('sync_status') syncStatus!: string;
  @text('updated_by') updatedBy?: string;

  @readonly @date('created_at') rawCreatedAt!: Date;

  // Helpers write — rispettano permessi team condiviso (check fuori dal model)
  @writer async markScanned() {
    await this.update((p) => {
      // @ts-ignore — Watermelon types
      p.lastScannedAt = new Date();
      // @ts-ignore
      p.syncStatus = 'updated';
    });
  }

  @writer async softDelete() {
    await this.update((p) => {
      // @ts-ignore
      p.deletedAt = new Date();
      // @ts-ignore
      p.syncStatus = 'deleted';
    });
  }

  @writer async restore() {
    await this.update((p) => {
      // @ts-ignore
      p.deletedAt = undefined;
      // @ts-ignore
      p.syncStatus = 'updated';
    });
  }
}
