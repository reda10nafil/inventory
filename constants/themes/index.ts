import type { AppTheme, StyleId } from './types';
import { oggi } from './oggi';
import { attuale } from './attuale';
import { babilonia } from './babilonia';
import { ishtar } from './ishtar';
import { ardesia } from './ardesia';
import { minimal } from './minimal';

export type { AppTheme, StyleId, ThemeId } from './types';
export { oggi } from './oggi';

/** I 5 stili, nell'ordine del selettore (il predefinito per primo, poi come nella tela). */
export const THEMES: Partial<Record<StyleId, AppTheme>> = { attuale, babilonia, ishtar, ardesia, minimal };

/** Stile per chi non ha ancora scelto (Attuale rifinito). */
export const DEFAULT_STYLE: StyleId = 'attuale';

export function isStyleId(value: unknown): value is StyleId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(THEMES, value);
}

export function themeFor(id: StyleId | null): AppTheme {
  return (id && THEMES[id]) || THEMES[DEFAULT_STYLE] || oggi;
}
