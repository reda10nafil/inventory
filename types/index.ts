// FurInventory Pro - Type Definitions

export interface Product {
  id: string;
  sku: string;
  furType: string;
  location: string;
  status: 'available' | 'sold' | 'archived';
  images: string[];
  /** Private Google Drive links created for photo backup; kept separate from local image sources. */
  backupImageLinks?: string[];
  /** Organization-scoped private Supabase Storage paths, aligned with `images`. */
  storageImagePaths?: string[];
  /** Storage object paths for custom document/image fields, keyed by custom field id. */
  storageCustomDataPaths?: Record<string, string[]>;
  /** Private Drive backup links for custom document/image fields, keyed by custom field id. */
  backupCustomDataLinks?: Record<string, string[]>;
  purchasePrice?: number;
  sellPrice?: number;
  length?: number;
  width?: number;
  weight?: number;
  productionDate?: string;
  technicalNotes?: string;
  customData: ProductCustomData[];
  createdAt: string;
  updatedAt: string;
  lastScannedAt?: string;
  soldAt?: string;
  deletedAt?: string;
  /** ID of the library/folder this product belongs to (slug format for Google Sheets) */
  libraryId?: string;
  /** GS1 Digital Link URI generated at save time */
  gs1DigitalLink?: string;
  /** Whether the product is marked as fragile */
  isFragile?: boolean;
  /** Unità di misura degli articoli a quantità («pz», «kg», «m», «l», «conf.»). M02, ticket 01. */
  unit?: string;
  /**
   * Giacenza per posizione (id posizione → quantità, fino a 3 decimali). C'è solo negli articoli a quantità:
   * i prodotti senza `stock` sono pezzi unici. Si legge con `stockOf` e si scrive solo con `applyMovement`
   * (`utils/stock.ts`). La posizione principale (`location`) resta anche a 0.
   */
  stock?: Record<string, number>;
  /** Scorta minima per l'avviso di riordino (ticket 05). */
  minStock?: number;
}

export interface ProductCustomData {
  value: any;
  fieldSnapshot: CustomField;
}

export type FieldUIType = 'grid' | 'stepper' | 'segmented' | 'text' | 'gps-link' | 'date' | 'images' | 'picker' | 'modal_list' | 'document';

export interface TimelineEvent {
  id: string;
  productId: string;
  type: 'created' | 'moved' | 'modified' | 'sold' | 'scanned' | 'photo_added' | 'deleted' | 'restored' | 'stock';
  timestamp: string;
  details: {
    from?: string;
    to?: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
    finalPrice?: number;
    photoCount?: number;
    changes?: string[];
    // Movimenti di magazzino (`type: 'stock'`, ticket 02): `qty` sempre positiva, tolta da `from` e/o
    // aggiunta a `to`; `before`/`after` = giacenza totale. Per la vendita `finalPrice` è il prezzo per unità.
    // `contactId` (M10): fornitore o cliente di un carico o di uno scarico, id di `utils/contacts.ts`.
    movement?: MovementKind;
    qty?: number;
    reason?: MovementReason;
    note?: string;
    before?: number;
    after?: number;
    contactId?: string;
  };
}

export type MovementKind = 'carico' | 'scarico' | 'trasferimento' | 'rettifica';
export type MovementReason = 'iniziale' | 'acquisto' | 'reso' | 'vendita' | 'uso_interno' | 'danno' | 'conta' | 'altro';

export interface Library {
  id: string;
  name: string;
  icon: string;
  fields: CustomField[];
  createdAt: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'number' | 'currency' | 'date' | 'text_short' | 'text_long' | 'images' | 'single_choice' | 'multi_choice' | 'document';
  uiType: FieldUIType;
  dataset?: any;
  unit?: string;
  icon?: string;
  options?: any[];
  required: boolean;
  order: number;
  isSystem?: boolean;
  deletedAt?: string;

  // Advanced Inteligence Features
  isBarcode?: boolean; // If true, show barcode scanner button
  linkTo?: 'locations' | 'libraries' | 'furType'; // Dynamically link options to app libraries
}

export interface Alert {
  id: string;
  productId: string;
  /** `low_stock`: articolo a quantità sotto la scorta minima (M06, ticket 05). */
  type: 'dormant' | 'promotion_suggestion' | 'low_stock';
  message: string;
  createdAt: string;
  updatedAt?: string;
  dismissed: boolean;
}
