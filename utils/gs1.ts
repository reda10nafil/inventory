// FurInventory Pro - GS1 Digital Link Utility Functions

export interface GS1Config {
  baseUrl: string;                    // Resolution endpoint, e.g. "https://syncroflow.app/id"
  enableSerial: boolean;              // AI 21 toggle
  serialMode: 'uuid' | 'progressive'; // Serial generation strategy
  enableLotto: boolean;               // AI 10 toggle
  lottoFieldId: string;               // Custom field ID mapped to Lotto
}

export const DEFAULT_GS1_CONFIG: GS1Config = {
  baseUrl: 'https://syncroflow.app/id',
  enableSerial: true,
  serialMode: 'uuid',
  enableLotto: false,
  lottoFieldId: '',
};

/**
 * Validate that a GTIN/EAN code is present (AI 01 - mandatory).
 * Returns an error message or null if valid.
 */
export function validateGTIN(gtin: string | undefined): string | null {
  if (!gtin || gtin.trim().length === 0) {
    return 'Il codice GTIN/EAN (SKU) è obbligatorio per generare il Digital Link GS1.';
  }
  return null;
}

/**
 * Generate a unique serial number for AI 21.
 *  - 'uuid': timestamp + random base-36 string (compact UUID‑like)
 *  - 'progressive': zero-padded incremental number based on existing count
 */
export function generateSerial(
  mode: 'uuid' | 'progressive',
  existingCount: number = 0,
): string {
  if (mode === 'progressive') {
    return String(existingCount + 1).padStart(6, '0');
  }
  // UUID-like: timestamp (base36) + random suffix
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${ts}-${rand}`.toUpperCase();
}

/**
 * Compose the GS1 Digital Link URI following the standard path structure:
 *   {baseUrl}/01/{gtin}[/21/{serial}][?10={lotto}]
 */
export function generateGS1DigitalLink(
  config: GS1Config,
  gtin: string,
  existingProductCount: number,
  lottoValue?: string,
): string {
  // Normalize base URL – remove trailing slash
  const base = config.baseUrl.replace(/\/+$/, '');

  // AI 01 – GTIN (mandatory)
  let uri = `${base}/01/${encodeURIComponent(gtin.trim())}`;

  // AI 21 – Serial Number
  if (config.enableSerial) {
    const serial = generateSerial(config.serialMode, existingProductCount);
    uri += `/21/${encodeURIComponent(serial)}`;
  }

  // AI 10 – Lotto (query parameter)
  if (config.enableLotto && lottoValue && lottoValue.trim().length > 0) {
    uri += `?10=${encodeURIComponent(lottoValue.trim())}`;
  }

  return uri;
}

/**
 * Build a preview string with sample data for the settings page live preview.
 */
export function buildPreviewLink(config: GS1Config): string {
  const base = config.baseUrl.replace(/\/+$/, '') || 'https://esempio.dominio.it';
  let uri = `${base}/01/8001234567890`;
  if (config.enableSerial) {
    uri += `/21/${config.serialMode === 'progressive' ? '000042' : 'M5X2K-A3B7'}`;
  }
  if (config.enableLotto) {
    uri += `?10=LOTTO-2026A`;
  }
  return uri;
}
