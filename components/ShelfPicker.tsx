// Scelta dello scaffale di un pezzo unico (S1a, ticket 13) in Aggiungi e Modifica: «Nessuno» e gli scaffali proposti
// (`shelvesFor`: della posizione, della categoria del prodotto o di una sopra, poi i generici). Il valore è l'id dello
// scaffale ('' = nessuno). Modifica non lo mostra per gli articoli a quantità (posizione e giacenza cambiano solo coi
// movimenti); Aggiungi sì (S1b): con una quantità lo scaffale scelto è dove va la giacenza iniziale.
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { formStyles } from './ui/formStyles';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { categoryName, type CategoryNode } from '../utils/categories';
import type { Shelf } from '../utils/shelves';

interface Props {
  /** Scaffali proposti, già nell'ordine giusto (`shelvesFor`). */
  shelves: readonly Shelf[];
  categories: readonly CategoryNode[];
  value: string;
  onChange: (id: string) => void;
}

export function ShelfPicker({ shelves, categories, value, onChange }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const chip = (key: string, label: string, icon: string, active: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      key={key}
      style={[styles.chip, styles.chipSmall, styles.chipGrow, active && styles.chipActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: active }}
    >
      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
      <AppIcon name={icon} size={16} color={active ? t.colors.chipActiveText : t.colors.textMuted} />
      <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={3}>{label}</Text>
    </Pressable>
  );
  const selected = shelves.some((s) => s.id === value) ? value : '';
  return (
    <View style={styles.chipWrap}>
      {chip('none', 'Nessuno', 'layers-clear', !selected, () => onChange(''), 'Nessuno scaffale')}
      {shelves.map((shelf) => {
        const kind = shelf.libraryId ? categoryName(categories, shelf.libraryId) : '';
        const label = kind ? `${shelf.name} · ${kind}` : shelf.name;
        return chip(shelf.id, label, 'shelves', selected === shelf.id, () => onChange(shelf.id), `Scaffale ${shelf.name}`);
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  // Un nome lungo va a capo dentro la pillola invece di essere tagliato, come in CategoryPicker
  chipGrow: { height: 'auto', minHeight: 34, paddingVertical: 6 },
}));
