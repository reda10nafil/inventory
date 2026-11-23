// Impostazioni › Categorie (C1, ticket 19): le categorie dei prodotti sono le cartelle di prima, con le
// sottocategorie (un genitore facoltativo, un solo livello). Una categoria con sottocategorie o con prodotti
// non si elimina. Indirizzo `settings/folders` come prima.
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useInventory, Library } from '../../../contexts/InventoryContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { categoryDeleteError, categoryNameError, categoryTree, childrenOf, parentIdOf, parentOptions } from '../../../utils/categories';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { codeError } from '../../../utils/shelves';

const ICON_OPTIONS = [
  'folder',
  'inventory',
  'warehouse',
  'store',
  'shopping-bag',
  'category',
  'collections',
  'layers',
];

export default function ManageFoldersScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { libraries, products, addLibrary, updateLibrary, deleteLibrary } = useInventory();
  const { shelves } = useShelves();
  const { getLocation } = useLocations();

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [barcode, setBarcode] = useState('');
  const [parentId, setParentId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  // Prodotti (non nel cestino) direttamente nella categoria
  const getItemCount = (libraryId: string): number => {
    return products.filter((p) => p.libraryId === libraryId && !p.deletedAt).length;
  };
  const parents = parentOptions(libraries, editingId ?? undefined);
  const editingHasChildren = !!editingId && childrenOf(libraries, editingId).length > 0;

  const resetForm = () => {
    setName('');
    setSelectedIcon('folder');
    setBarcode('');
    setParentId('');
    setEditingId(null);
  };

  const handleEdit = (lib: Library) => {
    setName(lib.name);
    setSelectedIcon(lib.icon);
    setBarcode(lib.barcode || '');
    setParentId(parentIdOf(libraries, lib.id) ?? '');
    setEditingId(lib.id);
  };

  const handleSave = () => {
    // Un genitore che nel frattempo non si può più scegliere vale «nessuno»
    const parent = parents.some((p) => p.id === parentId) ? parentId : undefined;
    // S1a: un codice già usato da uno scaffale non si riusa (lo Scanner aprirebbe la categoria al suo posto)
    const error = categoryNameError(libraries, name, parent, editingId ?? undefined) ?? codeError(barcode, { shelves, placeLabel: (id) => getLocation(id)?.label ?? id });
    if (error) {
      Alert.alert('Errore', error);
      return;
    }

    if (editingId) {
      updateLibrary(editingId, {
        name: name.trim(),
        icon: selectedIcon,
        barcode: barcode || undefined,
        parentId: parent,
      });
      Alert.alert('Successo', 'Categoria aggiornata');
      resetForm();
    } else {
      // Il codice si salva modificando la categoria dopo averla creata (limite di prima, vedi l'avviso sotto)
      addLibrary(name.trim(), selectedIcon, parent);
      Alert.alert('Successo', parent ? `Sottocategoria "${name.trim()}" creata` : `Categoria "${name.trim()}" creata`);
      resetForm();
    }
  };

  const generateBarcode = () => {
    const baseName = editingId || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!baseName) {
      Alert.alert('Errore', 'Inserisci un nome prima.');
      return;
    }
    setBarcode(`LIB-${baseName.toUpperCase().substring(0, 10)}-${Date.now().toString().slice(-4)}`);
  };

  const handleDeleteLibrary = (id: string) => {
    const library = libraries.find((l) => l.id === id);
    const refusal = categoryDeleteError(libraries, products, id, shelves);
    if (refusal) {
      Alert.alert('Attenzione', refusal, [{ text: 'OK' }]);
      return;
    }

    Alert.alert(
      'Conferma Eliminazione',
      `Eliminare la categoria "${library?.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            const success = deleteLibrary(id);
            if (!success) {
              Alert.alert('Errore', 'Impossibile eliminare la categoria');
            } else if (editingId === id) {
              resetForm();
            }
          },
        },
      ]
    );
  };

  const handleBarCodeScanned = ({ data }: { type: string, data: string }) => {
    setBarcode(data);
    setShowScanner(false);
    Alert.alert('Scansionato', `Codice acquisito: ${data}`);
  };

  const parentChip = (id: string, label: string) => {
    const active = parentId === id;
    return (
      <Pressable key={id || 'none'} style={[styles.parentChip, active && styles.parentChipActive]} onPress={() => setParentId(id)}>
        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
        <Text style={[styles.parentChipText, active && styles.parentChipTextActive]} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? 'Modifica categoria' : 'Crea nuova categoria'}
          </Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome categoria (es: Giacche)"
            placeholderTextColor={t.colors.placeholder}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Icona</Text>
          <View style={styles.iconPicker}>
            {ICON_OPTIONS.map((icon) => (
              <Pressable
                key={icon}
                style={[
                  styles.iconOption,
                  selectedIcon === icon && styles.iconOptionSelected,
                ]}
                onPress={() => setSelectedIcon(icon)}
              >
                <AppIcon
                  name={icon as any}
                  size={28}
                  color={selectedIcon === icon ? t.colors.tileSelectedText : t.colors.textSecondary}
                />
              </Pressable>
            ))}
          </View>

          {/* C1: sottocategoria di una categoria principale (un solo livello) */}
          <Text style={styles.label}>Sottocategoria di</Text>
          {editingHasChildren ? (
            <Text style={styles.parentHint}>Ha delle sottocategorie: resta una categoria principale.</Text>
          ) : (
            <View style={styles.parentWrap}>
              {parentChip('', 'Nessuna (principale)')}
              {parents.map((p) => parentChip(p.id, p.name))}
            </View>
          )}

          <Text style={styles.label}>Barcode / NFC (Opzionale)</Text>
          <View style={styles.barcodeRow}>
            <TextInput
              style={[styles.input, { flex: 1, minWidth: 0, marginBottom: 0 }]}
              placeholder="Scansiona o Genera..."
              placeholderTextColor={t.colors.placeholder}
              value={barcode}
              onChangeText={setBarcode}
            />
            <Pressable style={styles.iconButton} onPress={() => setShowScanner(true)}>
              <AppIcon name="qr-code-scanner" size={24} color={t.colors.accentInk} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={generateBarcode}>
              <AppIcon name="autorenew" size={24} color={t.colors.accentInk} />
            </Pressable>
          </View>

          {/* QR Preview if barcode exists */}
          {barcode ? (
            <View style={styles.qrPreview}>
              <QRCode value={barcode} size={60} />
              <Text style={styles.qrText}>{barcode}</Text>
            </View>
          ) : null}

          <View style={styles.actionButtons}>
            {editingId && (
              <Pressable style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Annulla</Text>
              </Pressable>
            )}
            <Pressable style={styles.saveButton} onPress={handleSave}>
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.saveButtonText}>
                {editingId ? 'Salva Modifiche' : 'Crea Categoria'}
              </Text>
            </Pressable>
          </View>

          {!editingId && barcode ? (
            <Text style={styles.warningText}>
              Nota: Il barcode verrà salvato solo se modifichi la categoria dopo averla creata (limite attuale).
            </Text>
          ) : null}

        </View>

        {/* Elenco ad albero: ogni categoria principale seguita dalle sue sottocategorie, rientrate */}
        <Text style={styles.listTitle}>Categorie esistenti ({libraries.length})</Text>

        {categoryTree(libraries).map(({ category: library, depth }) => {
          const subs = childrenOf(libraries, library.id).length;
          const count = getItemCount(library.id);
          return (
            <Pressable
              key={library.id}
              style={[styles.libraryItem, depth > 0 && { marginLeft: 24 * Math.min(depth, 2) }, editingId === library.id && styles.libraryItemEditing]}
              onPress={() => handleEdit(library)}
            >
              <View style={[styles.libraryIcon, depth > 0 && styles.libraryIconSub]}>
                <AppIcon name={library.icon as any} size={depth > 0 ? 22 : 28} color={t.colors.accentInk} />
              </View>
              <View style={styles.libraryInfo}>
                <Text style={styles.libraryName}>{library.name}</Text>
                <Text style={styles.libraryCount}>
                  {count === 1 ? '1 prodotto' : `${count} prodotti`}
                  {subs > 0 ? ` · ${subs === 1 ? '1 sottocategoria' : `${subs} sottocategorie`}` : ''}
                </Text>
                <Text style={styles.libraryId}>
                  ID: {library.id}
                  {library.barcode ? ` • 🏷️ ${library.barcode}` : ''}
                </Text>
              </View>

              <View style={styles.itemActions}>
                {library.barcode && (
                  <Pressable onPress={() => { setBarcode(library.barcode!); setShowQRModal(true); }} style={{ marginRight: 8 }}>
                    <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
                  </Pressable>
                )}
                <Pressable onPress={() => handleDeleteLibrary(library.id)} accessibilityLabel={`Elimina ${library.name}`}>
                  <AppIcon name="delete" size={20} color={t.colors.error} />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        <View style={styles.infoCard}>
          <AppIcon name="info-outline" size={24} color={t.colors.accentInk} />
          <Text style={styles.infoText}>
            Le categorie raggruppano i prodotti (per esempio pellicce, abbigliamento, borse); una sottocategoria sta dentro una categoria principale. Usa i barcode per aprire una categoria dallo scanner.
          </Text>
        </View>

      </ScrollView>

      {/* Scanner Modal */}
      {showScanner && (
        <View style={StyleSheet.absoluteFill}>
          <BarcodeScanner onScan={handleBarCodeScanned} onClose={() => setShowScanner(false)} />
        </View>
      )}

      {/* Large QR Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowQRModal(false)}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Codice Categoria</Text>
            <QRCode value={barcode || 'empty'} size={200} />
            <Text style={styles.qrBigText}>{barcode}</Text>
            <Text style={styles.qrHint}>Scansiona per filtrare prodotti di questa categoria</Text>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
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
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  iconOption: {
    ...tileSurface(t),
    width: 50,
    height: 50,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    backgroundColor: t.colors.tileSelected,
    borderColor: t.colors.tileSelectedBorder,
  },
  parentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  parentChip: {
    height: 34,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    overflow: 'hidden',
  },
  parentChipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  parentChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: t.colors.chipText,
    flexShrink: 1,
  },
  parentChipTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  parentHint: {
    ...t.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  barcodeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconButton: {
    width: t.input.height,
    height: t.input.height,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  qrPreview: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: t.colors.qrPaper,
    borderRadius: t.radius.tile,
    marginBottom: 16,
    alignSelf: 'center',
  },
  qrText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: t.colors.qrInk,
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
  warningText: {
    fontSize: 12,
    color: t.colors.warning,
    marginTop: 8,
    fontStyle: 'italic',
  },
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  libraryItem: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  libraryItemEditing: {
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  libraryIconSub: {
    width: 40,
    height: 40,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryName: {
    ...t.typography.cardTitle,
    fontSize: 15,
    fontWeight: t.weights.strong,
    marginBottom: 2,
  },
  libraryCount: {
    ...t.typography.caption,
    fontSize: 12,
  },
  libraryId: {
    ...t.typography.caption,
    fontSize: 10,
    color: t.colors.textMuted,
    fontFamily: 'monospace',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    ...cardSurface(t),
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  infoText: {
    ...t.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: withAlpha(t.colors.shadow, 0.85),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCard: {
    backgroundColor: t.colors.qrPaper,
    padding: 32,
    borderRadius: t.radius.card,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: t.colors.qrInk,
  },
  qrBigText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: t.colors.qrInk,
    textAlign: 'center',
  },
  qrHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
}));
