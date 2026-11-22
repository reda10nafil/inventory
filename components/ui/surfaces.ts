import type { ViewStyle } from 'react-native';
import type { AppTheme } from '../../constants/themes';

// Superfici comuni della tela (lavoro L6), da usare dentro `makeStyles`: `card: { ...cardSurface(t), padding: 12 }`.

/** Card e pannelli (`--surface`, `--surface-border`, `--card-radius`, `--card-shadow`). */
export const cardSurface = (t: AppTheme): ViewStyle => ({
  backgroundColor: t.colors.surface,
  borderRadius: t.radius.card,
  borderWidth: 1,
  borderColor: t.colors.border,
  ...t.shadows.card,
});

/** Riquadri: statistiche, campi della Scheda, scelte a riquadri (`--tile-bg`, `--tile-border`, `--tile-radius`). */
export const tileSurface = (t: AppTheme): ViewStyle => ({
  backgroundColor: t.colors.tile,
  borderRadius: t.radius.tile,
  borderWidth: 1,
  borderColor: t.colors.tileBorder,
});
