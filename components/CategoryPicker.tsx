// Scelta della categoria di un prodotto (C1) in Aggiungi e Modifica: pillole delle categorie principali e, sotto,
// quelle della sottocategoria quando la principale scelta ne ha. Il valore è l'id della categoria ('' = nessuna).
// Riusabile da altre schermate (per esempio gli scaffali «di una categoria», S1).
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { formStyles } from './ui/formStyles';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { categoryPicker, rootCategories, type CategoryNode } from '../utils/categories';

type Category = CategoryNode & { icon?: string };

interface Props {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
  /** Pillola «Nessuna» per prima (Modifica). Senza, toccare la principale scelta la toglie (Aggiungi). */
  showNone?: boolean;
}

export function CategoryPicker({ categories, value, onChange, showNone = false }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const roots = rootCategories(categories);
  const picker = categoryPicker(categories, value || undefined);

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

  return (
    <View>
      <View style={styles.chipWrap}>
        {showNone && chip('none', 'Nessuna', 'folder-off', !value, () => onChange(''), 'Nessuna categoria')}
        {roots.length === 0 && !showNone ? (
          <Text style={styles.chipEmpty}>Nessuna categoria</Text>
        ) : (
          roots.map((root) => {
            const active = picker.rootId === root.id;
            // Aggiungi: la principale scelta (senza sottocategoria) si toglie col secondo tocco, come prima di C1
            const next = active && !showNone && value === root.id ? '' : root.id;
            return chip(root.id, root.name, root.icon || 'folder', active, () => onChange(next), `Categoria ${root.name}`);
          })
        )}
      </View>
      {picker.rootId && picker.children.length > 0 && (
        <>
          <Text style={styles.subLabel}>Sottocategoria</Text>
          <View style={styles.chipWrap}>
            {picker.children.map((child) => {
              const active = picker.childId === child.id;
              return chip(child.id, child.name, child.icon || 'subdirectory-arrow-right', active, () => onChange(active ? picker.rootId! : child.id), `Sottocategoria ${child.name}`);
            })}
          </View>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  // Un nome lungo va a capo dentro la pillola invece di essere tagliato (la pillola cresce in altezza)
  chipGrow: { height: 'auto', minHeight: 34, paddingVertical: 6 },
  subLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: t.colors.textSecondary, marginTop: 10, marginBottom: 6 },
}));
