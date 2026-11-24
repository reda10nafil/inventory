// Scelta della categoria di un prodotto (C1) in Aggiungi e Modifica: binario delle categorie principali e, sotto,
// quello della sottocategoria quando la principale scelta ne ha. Il valore è l'id della categoria ('' = nessuna).
// Riusabile da altre schermate (per esempio gli scaffali «di una categoria», S1).
// UX1-0 (richiesta dell'utente del 24): sempre **binario orizzontale** (`ChoiceRail`: la scelta in vista all'apertura,
// l'ultima pillola a vista tagliata), anche quando nel modulo di Aggiungi la Categoria sta in una colonna, dove prende la
// riga intera (`choiceRowSize`). La tendina della categoria, con l'albero in una finestra dal basso, è `CategorySelect`.
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { ChoiceRail, RAIL_HIT_SLOP, RAIL_PILL } from './ui/ChoiceRail';
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
  /** Testo della pillola senza categoria (S1a: «Generico» per gli scaffali). */
  noneLabel?: string;
}

export function CategoryPicker({ categories, value, onChange, showNone = false, noneLabel }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const roots = rootCategories(categories);
  const picker = categoryPicker(categories, value || undefined);

  const chip = (key: string, label: string, icon: string, active: boolean, onPress: () => void, a11y: string) => (
    <Pressable
      key={key}
      style={[styles.chip, styles.railChip, active && styles.chipActive]}
      onPress={onPress}
      hitSlop={RAIL_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected: active }}
    >
      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
      {/* La scelta ha la spunta, non solo il colore (R1 di UX0) */}
      <AppIcon name={active ? 'check' : icon} size={16} color={active ? t.colors.chipActiveText : t.colors.textMuted} />
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );

  // Indice della pillola scelta in ogni binario (all'apertura entra in vista)
  const rootIndex = roots.findIndex((root) => root.id === picker.rootId);
  const rootSelected = showNone ? (value ? (rootIndex < 0 ? -1 : rootIndex + 1) : 0) : rootIndex;
  return (
    <View>
      {roots.length === 0 && !showNone ? (
        <Text style={styles.chipEmpty}>Nessuna categoria</Text>
      ) : (
        <ChoiceRail label="Categorie" selected={rootSelected}>
          {showNone && chip('none', noneLabel ?? 'Nessuna', 'folder-off', !value, () => onChange(''), noneLabel ?? 'Nessuna categoria')}
          {roots.map((root) => {
            const active = picker.rootId === root.id;
            // Aggiungi: la principale scelta (senza sottocategoria) si toglie col secondo tocco, come prima di C1
            const next = active && !showNone && value === root.id ? '' : root.id;
            return chip(root.id, root.name, root.icon || 'folder', active, () => onChange(next), `Categoria ${root.name}`);
          })}
        </ChoiceRail>
      )}
      {picker.rootId && picker.children.length > 0 && (
        <>
          <Text style={styles.subLabel}>Sottocategoria</Text>
          {/* Le sottocategorie di un'altra principale ripartono da capo: binario nuovo (misure e scelta in vista) */}
          <ChoiceRail key={picker.rootId} label="Sottocategorie" selected={picker.children.findIndex((child) => child.id === picker.childId)}>
            {picker.children.map((child) => {
              const active = picker.childId === child.id;
              return chip(child.id, child.name, child.icon || 'subdirectory-arrow-right', active, () => onChange(active ? picker.rootId! : child.id), `Sottocategoria ${child.name}`);
            })}
          </ChoiceRail>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  // Pillole del binario (R1): alte 36, il nome su una riga (il binario scorre, niente nomi tagliati)
  railChip: RAIL_PILL,
  subLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: t.colors.textSecondary, marginTop: 10, marginBottom: 6 },
}));
