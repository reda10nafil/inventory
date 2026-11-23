// Editor dei valori di un campo a scelta con id stabili (C2, ticket 21; forma del ticket 23). Lavora su
// `{ id, label, color?, icon? }[]`: aggiungere crea un valore, rinominare cambia solo l'etichetta (l'id salvato nei
// prodotti resta lo stesso, quindi i prodotti seguono il nome nuovo), eliminare toglie un valore che nessuno usa.
// I controlli (nome vuoto o doppio, valore usato, ultimo valore) li passa chi lo usa: per «Tipo di pelle» sono in
// `utils/furTypes.ts`. Oggi lo usa Campi Personalizzati › Tipo di pelle; le fette VAL ed EDC lo riuseranno per le
// opzioni dei campi a scelta. Colore e icona, se ci sono, si mostrano accanto al nome (Tipo di pelle non li ha).
import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { cardSurface } from './ui/surfaces';
import { Text, TextInput } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';

export interface EditorOption {
  id: string;
  label: string;
  color?: string;
  icon?: string;
}

interface Props {
  options: readonly EditorOption[];
  /** Testo d'uso accanto a ogni valore («3 prodotti», «Nessun prodotto»). */
  usedBy: (id: string) => string;
  /** Errore del nome (vuoto, già usato) oppure null; `editingId` è il valore che si rinomina. */
  nameError: (label: string, editingId?: string) => string | null;
  /** Errore dell'eliminazione (valore usato, ultimo rimasto) oppure null. */
  deleteError: (id: string) => string | null;
  onAdd: (label: string) => void | Promise<void>;
  onRename: (id: string, label: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  placeholder?: string;
  hint?: string;
}

export function OptionsEditor({ options, usedBy, nameError, deleteError, onAdd, onRename, onDelete, placeholder, hint }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = options.find((o) => o.id === editingId);

  const reset = () => { setName(''); setEditingId(null); };

  const save = async () => {
    const error = nameError(name, editingId ?? undefined);
    if (error) { Alert.alert('Errore', error); return; }
    if (editingId) await onRename(editingId, name.trim());
    else await onAdd(name.trim());
    reset();
  };

  const remove = (option: EditorOption) => {
    const error = deleteError(option.id);
    if (error) { Alert.alert('Attenzione', error); return; }
    Alert.alert('Conferma eliminazione', `Eliminare il valore "${option.label}"?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await onDelete(option.id);
          if (editingId === option.id) reset();
        },
      },
    ]);
  };

  return (
    <View>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editing ? `Rinomina «${editing.label}»` : 'Aggiungi un valore'}</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder ?? 'Nome del valore'}
          placeholderTextColor={t.colors.placeholder}
          value={name}
          onChangeText={setName}
          onSubmitEditing={save}
          accessibilityLabel={editing ? `Nuovo nome di ${editing.label}` : 'Nome del valore nuovo'}
        />
        <View style={styles.actionButtons}>
          {editing && (
            <Pressable style={styles.cancelButton} onPress={reset} accessibilityRole="button">
              <Text style={styles.cancelButtonText}>Annulla</Text>
            </Pressable>
          )}
          <Pressable style={styles.saveButton} onPress={save} accessibilityRole="button">
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <Text style={styles.saveButtonText}>{editing ? 'Salva nome' : 'Aggiungi valore'}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.listTitle}>Valori ({options.length})</Text>
      {options.map((option) => (
        // Due pulsanti affiancati (non uno dentro l'altro: sul web un <button> non può contenerne un altro)
        <View key={option.id} style={[styles.item, editingId === option.id && styles.itemEditing]}>
          <Pressable
            style={styles.itemMain}
            onPress={() => { setName(option.label); setEditingId(option.id); }}
            accessibilityRole="button"
            accessibilityLabel={`Rinomina ${option.label}`}
          >
            {option.color ? <View style={[styles.swatch, { backgroundColor: option.color }]} /> : null}
            {option.icon ? <AppIcon name={option.icon} size={20} color={t.colors.textSecondary} /> : null}
            <View style={styles.itemInfo}>
              <Text style={styles.itemLabel}>{option.label}</Text>
              <Text style={styles.itemMeta}>{usedBy(option.id)}</Text>
            </View>
            <AppIcon name="edit" size={18} color={t.colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => remove(option)} hitSlop={8} style={styles.deleteButton} accessibilityRole="button" accessibilityLabel={`Elimina ${option.label}`}>
            <AppIcon name="delete" size={20} color={t.colors.error} />
          </Pressable>
        </View>
      ))}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  formCard: { ...cardSurface(t), padding: 16, marginBottom: 20 },
  formTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 12,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
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
    marginBottom: 14,
  },
  actionButtons: { flexDirection: 'row', gap: 12 },
  saveButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.button,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  saveButtonText: { textAlign: 'center', ...t.typography.buttonPrimary, color: t.colors.onButton },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.colors.buttonSecondary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  cancelButtonText: { textAlign: 'center', ...t.typography.buttonSecondary, color: t.colors.onButtonSecondary },
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  item: { ...cardSurface(t), flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 10 },
  itemMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemEditing: { borderWidth: 1, borderColor: t.colors.accent },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  // Un nome lungo va a capo invece di spingere fuori le icone
  itemInfo: { flex: 1, minWidth: 0 },
  itemLabel: { ...t.typography.cardTitle, fontSize: 16, fontWeight: t.weights.strong },
  itemMeta: { ...t.typography.caption, marginTop: 4 },
  deleteButton: { padding: 4 },
  hint: { ...t.typography.caption, marginTop: 6 },
}));
