// FurInventory Pro - Configuration Constants

export const FIELD_TYPES = {
  NUMBER: 'number',
  CURRENCY: 'currency',
  DATE: 'date',
  TEXT_SHORT: 'text_short',
  TEXT_LONG: 'text_long',
  IMAGES: 'images',
  SINGLE_CHOICE: 'single_choice',
  MULTI_CHOICE: 'multi_choice',
} as const;

// Posizioni predefinite: in contexts/LocationsContext.tsx (D21, prima erano scritte anche qui e in hooks/useLocations.ts).

export const FUR_TYPES = [
  { id: 'visone', label: 'Visone' },
  { id: 'volpe', label: 'Volpe' },
  { id: 'zibellino', label: 'Zibellino' },
  { id: 'cincilla', label: 'Cincillà' },
  { id: 'ermellino', label: 'Ermellino' },
  { id: 'astrakan', label: 'Astrakan' },
  { id: 'altro', label: 'Altro' },
] as const;

export const DORMANT_THRESHOLD_DAYS = 180; // 6 months
export const PROMOTION_THRESHOLD_DAYS = 90; // 3 months

export const STATUS = {
  AVAILABLE: 'available',
  SOLD: 'sold',
  ARCHIVED: 'archived',
} as const;

export const QUICK_ACTIONS = [
  { id: 'moved', label: 'SPOSTATO', icon: 'swap-horiz', color: '#3B82F6' },
  { id: 'sold', label: 'VENDUTO', icon: 'sell', color: '#10B981' },
  { id: 'details', label: 'DETTAGLI/MODIFICA', icon: 'edit', color: '#D4AF37' },
] as const;

export const SHARE_TYPES = {
  CLIENT: 'client',
  PROFESSIONAL: 'professional',
} as const;
