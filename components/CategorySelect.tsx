// Tendina della categoria (UX0, regola R2; S2 per lo scaffale): ha l'aspetto di un campo, con il valore e la freccia;
// le categorie sono un albero, quindi si sceglie in una finestra dal basso (R14) con la voce «senza categoria» per
// prima («Generico») e la ricerca oltre gli 8 valori. Ogni voce ha l'etichetta accessibile «Categoria <nome>»
// (sottocategorie col nome completo, «Categoria Pellicce › Visone»).
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { formStyles } from './ui/formStyles';
import { Text, TextInput } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { categoryPath, categoryTree, type CategoryNode } from '../utils/categories';

const SEARCH_FROM = 9;
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

export function CategorySelect({
  categories, value, onChange, noneLabel = 'Generico', label = 'Categoria',
}: {
  categories: readonly CategoryNode[];
  /** Id della categoria, '' = nessuna. */
  value: string;
  onChange: (id: string) => void;
  noneLabel?: string;
  /** Etichetta accessibile del campo. */
  label?: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const known = !!value && categories.some((c) => c.id === value);
  const shown = known ? categoryPath(categories, value) : noneLabel;
  const rows = useMemo(() => {
    const all = [
      { id: '', name: noneLabel, path: noneLabel, depth: 0 },
      ...categoryTree(categories).map(({ category, depth }) => ({ id: category.id, name: category.name, path: categoryPath(categories, category.id), depth })),
    ];
    const q = fold(query);
    return q ? all.filter((r) => fold(r.path).includes(q)) : all;
  }, [categories, noneLabel, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <>
      <Pressable style={styles.inputBox} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label}>
        <AppIcon name="folder" size={18} color={t.colors.fieldIcon} />
        <Text style={styles.valueText} numberOfLines={1}>{shown}</Text>
        <AppIcon name="expand-more" size={22} color={t.colors.textSecondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Chiudi la scelta della categoria" />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <Text style={styles.title}>{label}</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityLabel="Chiudi">
                <AppIcon name="close" size={24} color={t.colors.textSecondary} />
              </Pressable>
            </View>
            {categories.length + 1 >= SEARCH_FROM && (
              <View style={[styles.inputBox, styles.search]}>
                <AppIcon name="search" size={18} color={t.colors.fieldIcon} />
                <TextInput
                  style={styles.inputText}
                  placeholder="Cerca categoria"
                  placeholderTextColor={t.colors.placeholder}
                  value={query}
                  onChangeText={setQuery}
                  accessibilityLabel="Cerca categoria"
                />
              </View>
            )}
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {rows.map((row) => {
                const active = row.id === (known ? value : '');
                return (
                  <Pressable
                    key={row.id || '-'}
                    style={[styles.row, active && styles.rowActive, { paddingLeft: 14 + row.depth * 18 }]}
                    onPress={() => choose(row.id)}
                    accessibilityLabel={`Categoria ${row.depth ? row.path : row.name}`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.rowText, active && styles.rowTextActive]} numberOfLines={1}>{row.name}</Text>
                    {active && <AppIcon name="check" size={20} color={t.colors.accentInk} />}
                  </Pressable>
                );
              })}
              {rows.length === 0 && <Text style={styles.empty}>Nessuna categoria con questo nome.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: t.colors.scrim,
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: t.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
  },
  search: {
    marginHorizontal: 18,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 14,
    borderRadius: t.radius.input,
  },
  rowActive: {
    backgroundColor: t.colors.accentSoft,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: t.colors.textPrimary,
  },
  rowTextActive: {
    fontWeight: t.weights.strong,
  },
  empty: {
    ...t.typography.caption,
    lineHeight: 18,
    padding: 14,
  },
}));
