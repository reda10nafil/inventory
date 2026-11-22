import type { AppTheme, StyleId } from './types';
import { oggi } from './oggi';
import { attuale } from './attuale';

export type { AppTheme, StyleId, ThemeId } from './types';
export { oggi } from './oggi';

/** Stili pronti, nell'ordine del selettore. Si aggiungono uno alla volta (lavoro L5). */
export const THEMES: Partial<Record<StyleId, AppTheme>> = { attuale };

/** Stile per chi non ha ancora scelto (Attuale rifinito). */
export const DEFAULT_STYLE: StyleId = 'attuale';

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value);
}

export function themeFor(id: StyleId | null): AppTheme {
  return (id && THEMES[id]) || THEMES[DEFAULT_STYLE] || oggi;
}
