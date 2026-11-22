// Impostazioni › Categorie (M01, ticket 04): aggiungere, rinominare ed eliminare le categorie dei prodotti.
// Una categoria usata da un prodotto (anche venduto o nel cestino) non si elimina: si può solo rinominare.
import React, { useState } from 'react';
import { View, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategories } from '../../../contexts/CategoriesContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { usage } from '../../../utils/productRules';
import { categoryNameError } from '../../../utils/categories';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

export default function CategoriesScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { categories, loading, addCategory, renameCategory, deleteCategory } = useCategories();
  const { products } = useInventory();

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEditingId(null);
  };

  const handleSave = async () => {
    const error = categoryNameError(name, categories, editingId ?? undefined);
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    if (editingId) {
      await renameCategory(editingId, name);
      Alert.alert('Fatto', 'Categoria rinominata');
    } else {
      await addCategory(name);
      Alert.alert('Fatto', 'Categoria creata');
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    const label = categories.find((c) => c.id === id)?.label ?? id;
    if (categories.length <= 1) {
      Alert.alert('Attenzione', 'Devi avere almeno una categoria');
      return;
    }
    const used = usage(products, { furType: id });
    if (used.active + used.trashed > 0) {
      const n = (k: number) => (k === 1 ? '1 prodotto' : `${k} prodotti`);
      const parts = used.active && used.trashed ? `${n(used.active)} e ${used.trashed} nel cestino` : used.active ? n(used.active) : `${n(used.trashed)} nel cestino`;
      const trash = used.trashed ? ' Quelli nel cestino si possono anche eliminare per sempre dal Cestino.' : '';
      Alert.alert('Attenzione', `La categoria "${label}" è usata da ${parts}. Cambia la categoria di quei prodotti prima di eliminarla, oppure rinominala.${trash}`);
      return;
    }
    Alert.alert('Conferma eliminazione', `Eliminare la categoria "${label}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(id);
          if (editingId === id) resetForm();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Backdrop />
        <ActivityIndicator size="large" color={t.colors.accentInk} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{editingId ? 'Rinomina categoria' : 'Aggiungi categoria'}</Text>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Es. Viti, Detersivi, Elettronica"
            placeholderTextColor={t.colors.placeholder}
            value={name}
            onChangeText={setName}
            onSubmitEditing={handleSave}
          />
          <View style={styles.actionButtons}>
            {editingId && (
              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </Pressable>
            )}
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.saveButtonText}>{editingId ? 'Salva nome' : 'Crea categoria'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.listTitle}>Categorie ({categories.length})</Text>
        {categories.map((category) => {
          const used = usage(products, { furType: category.id });
          const count = used.active + used.trashed;
          return (
            <Pressable
              key={category.id}
              style={[styles.item, editingId === category.id && styles.itemEditing]}
              onPress={() => { setName(category.label); setEditingId(category.id); }}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemLabel}>{category.label}</Text>
                <Text style={styles.itemMeta}>
                  {count === 0 ? 'Nessun prodotto' : count === 1 ? '1 prodotto' : `${count} prodotti`}
                </Text>
              </View>
              <Pressable onPress={() => handleDelete(category.id)} hitSlop={8} accessibilityLabel={`Elimina ${category.label}`}>
                <AppIcon name="delete" size={20} color={t.colors.error} />
              </Pressable>
            </Pressable>
          );
        })}
        <Text style={styles.hint}>Tocca una categoria per rinominarla: i prodotti che la usano restano collegati.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    ...cardSurface(t),
    padding: 16,
    marginBottom: 24,
  },
  formTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 16,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  label: {
    fontSize: t.label.size,
    fontWeight: t.label.weight,
    color: t.label.color,
    lineHeight: 18,
    marginBottom: 6,
  },
  input: {
    minHeight: t.input.height,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    paddingHorizontal: 14,
    fontSize: 15,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
    alignItems: 'center',
  },
  saveButtonText: {
    textAlign: 'center',
    ...t.typography.buttonPrimary,
    color: t.colors.onButton,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.radius.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  cancelButtonText: {
    textAlign: 'center',
    ...t.typography.buttonSecondary,
    color: t.colors.onButtonSecondary,
  },
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  item: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  itemEditing: {
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  itemInfo: {
    flex: 1,
  },
  itemLabel: {
    ...t.typography.cardTitle,
    fontSize: 16,
    fontWeight: t.weights.strong,
  },
  itemMeta: {
    ...t.typography.caption,
    marginTop: 4,
  },
  hint: {
    ...t.typography.caption,
    marginTop: 6,
  },
}));
