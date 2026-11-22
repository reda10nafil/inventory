import React from 'react';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

// Icona dell'app: stesso uso di `MaterialIcons` (name, size, color, style), con una tabella di corrispondenza
// applicata al momento del disegno, così i nomi salvati nei dati e nei cataloghi non cambiano (ticket 04 e 07).
// Un nome sconosciuto disegna un'icona di riserva invece del «?».

type IconProps = Omit<React.ComponentProps<typeof MaterialIcons>, 'name'> & {
  name: string;
  /** Versione piena dell'icona, per la voce attiva della barra in basso. */
  active?: boolean;
};

type Replacement = { family: 'community'; name: string; activeName?: string };

/** Nome MaterialIcons di oggi → icona nuova. Vuota finché il lavoro L4 non la riempie. */
export const ICON_REPLACEMENTS: Record<string, Replacement> = {};

const FALLBACK = 'label-outline';

export function AppIcon({ name, active, ...rest }: IconProps) {
  const replacement = ICON_REPLACEMENTS[name];
  if (replacement) {
    const glyph = (active && replacement.activeName) || replacement.name;
    return <MaterialCommunityIcons {...rest} name={glyph as React.ComponentProps<typeof MaterialCommunityIcons>['name']} />;
  }
  const known = Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, name);
  return <MaterialIcons {...rest} name={(known ? name : FALLBACK) as React.ComponentProps<typeof MaterialIcons>['name']} />;
}

export default AppIcon;
