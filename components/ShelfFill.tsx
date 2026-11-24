// Riempimento di uno scaffale (S2, ticket 14 e 15): barra e percentuale, verde fino al 50%, blu fino all'80%, rosso
// oltre, «Pieno» al 100%. Colori dai ruoli del tema (successo, informazione, errore), mai scritti a mano: uguali nei
// 5 stili. Lo usano Impostazioni › Scaffali e la Scheda (`ShelfSpace`). Il calcolo è in utils/shelves.ts.
import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { withAlpha } from '../utils/color';
import { fillText, type FillBand, type FillLevel } from '../utils/shelves';

/** Colore della fascia dal tema. */
export function useFillColor(): (band: FillBand) => string {
  const t = useTheme();
  return (band) => (band === 'verde' ? t.colors.success : band === 'blu' ? t.colors.info : t.colors.error);
}

/** Barra alta 6 con la percentuale scritta accanto (UX0). `name` entra nell'etichetta accessibile: «Riempimento A1: 45%». */
export function ShelfFill({ fill, name }: { fill: FillLevel; name: string }) {
  const styles = useStyles();
  const color = useFillColor()(fill.band);
  const text = fillText(fill);
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Riempimento ${name}: ${text}`} testID={`riempimento-${fill.band}`}>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${Math.min(100, Math.max(0, fill.percent))}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.text, { color }]} numberOfLines={2}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: withAlpha(t.colors.textSecondary, 0.18),
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: t.weights.strong,
    minWidth: 40,
    maxWidth: '50%',
    textAlign: 'right',
  },
}));
