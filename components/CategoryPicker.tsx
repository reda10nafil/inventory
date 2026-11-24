// Scelta della categoria di un prodotto (C1) in Aggiungi e Modifica: pillole delle categorie principali e, sotto,
// quelle della sottocategoria quando la principale scelta ne ha. Il valore è l'id della categoria ('' = nessuna).
// Riusabile da altre schermate (per esempio gli scaffali «di una categoria», S1).
import React from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { ChipRail, ChoicePicker } from './ChoicePicker';
import { GradientFill } from './ui/GradientFill';
import { formStyles } from './ui/formStyles';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { categoryPath, categoryPicker, categoryTree, rootCategories, type CategoryNode } from '../utils/categories';

type Category = CategoryNode & { icon?: string };

interface Props {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
  /** Pillola «Nessuna» per prima (Modifica). Senza, toccare la principale scelta la toglie (Aggiungi). */
  showNone?: boolean;
  /** Testo della pillola senza categoria (S1a: «Generico» per gli scaffali). */
  noneLabel?: string;
  /** In una colonna da 1/2 o 1/3 (Aggiungi): tendina con l'albero invece del binario (EDC, R1 di UX0). */
  narrow?: boolean;
}

export function CategoryPicker({ categories, value, onChange, showNone = false, noneLabel, narrow = false }: Props) {
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
      {/* La scelta ha la spunta, non solo il colore (R1 di UX0) */}
      <AppIcon name={active ? 'check' : icon} size={16} color={active ? t.colors.chipActiveText : t.colors.textMuted} />
      <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={3}>{label}</Text>
    </Pressable>
  );

  // EDC: in una colonna (1/2, 1/3) la categoria è una tendina con l'albero («Pellicce», «Pellicce › Visone»), mai un
  // binario stretto né pillole a capo (R1 di UX0, D09)
  if (narrow) {
    const none = { id: '', label: noneLabel ?? 'Nessuna', a11y: noneLabel ?? 'Nessuna categoria' };
    const tree = categoryTree(categories).map(({ category }) => ({
      id: category.id,
      label: categoryPath(categories, category.id),
      a11y: `${category.parentId ? 'Sottocategoria' : 'Categoria'} ${category.name}`,
    }));
    return (
      <ChoicePicker
        name="Categoria"
        look="dropdown"
        options={showNone ? [none, ...tree] : tree}
        selected={(o) => (value || '') === o.id}
        onPick={(o) => onChange(!showNone && value === o.id ? '' : o.id)}
        icon="folder"
        shown={value ? categoryPath(categories, value) : 'Seleziona...'}
        empty={!value}
        small
      />
    );
  }
  // EDC (richiesta dell'utente del 24): a larghezza intera binario orizzontale, una riga che scorre con la sfumatura
  // dove continua, al posto delle pillole a capo di D09
  return (
    <View>
      {roots.length === 0 && !showNone ? (
        <Text style={styles.chipEmpty}>Nessuna categoria</Text>
      ) : (
        <ChipRail label="Categorie">
          {showNone && chip('none', noneLabel ?? 'Nessuna', 'folder-off', !value, () => onChange(''), noneLabel ?? 'Nessuna categoria')}
          {roots.map((root) => {
            const active = picker.rootId === root.id;
            // Aggiungi: la principale scelta (senza sottocategoria) si toglie col secondo tocco, come prima di C1
            const next = active && !showNone && value === root.id ? '' : root.id;
            return chip(root.id, root.name, root.icon || 'folder', active, () => onChange(next), `Categoria ${root.name}`);
          })}
        </ChipRail>
      )}
      {picker.rootId && picker.children.length > 0 && (
        <>
          <Text style={styles.subLabel}>Sottocategoria</Text>
          <ChipRail label="Sottocategorie">
            {picker.children.map((child) => {
              const active = picker.childId === child.id;
              return chip(child.id, child.name, child.icon || 'subdirectory-arrow-right', active, () => onChange(active ? picker.rootId! : child.id), `Sottocategoria ${child.name}`);
            })}
          </ChipRail>
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
