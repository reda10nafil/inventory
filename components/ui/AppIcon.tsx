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

/** Nome MaterialIcons di oggi → icona nuova (ticket 07), uguale in tutti gli stili e in ogni punto dell'app. */
export const ICON_REPLACEMENTS: Record<string, Replacement> = {
  // barra in basso (la versione piena per la voce attiva)
  'grid-view': { family: 'community', name: 'view-grid-outline', activeName: 'view-grid' },
  timeline: { family: 'community', name: 'history' },
  'account-tree': { family: 'community', name: 'lightning-bolt-outline', activeName: 'lightning-bolt' },
  'add-circle': { family: 'community', name: 'plus-circle-outline', activeName: 'plus-circle' },
  settings: { family: 'community', name: 'cog-outline', activeName: 'cog' },
  // campi e misure
  'fitness-center': { family: 'community', name: 'weight' },
  straighten: { family: 'community', name: 'tape-measure' },
  'width-wide': { family: 'community', name: 'arrow-expand-horizontal' },
  // «Tutti» delle cartelle
  apps: { family: 'community', name: 'folder-multiple' },
};

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
