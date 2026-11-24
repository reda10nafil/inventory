// FurInventory Pro - Manage Locations Screen
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import QRCode from 'react-native-qrcode-svg';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { usage } from '../../../utils/productRules';
import { useShelves } from '../../../contexts/ShelvesContext';
import { locationShelvesError } from '../../../utils/shelves';
import { newLocationId } from '../../../utils/stock';
import { codeCheck } from '../../../utils/codes';
import { useAutomations } from '../../../contexts/AutomationsContext';
import { automationsUsing, locationInUseText } from '../../../utils/automationRun';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#D4AF37', // Gold
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#111827', // Black
];

export default function ManageLocationsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locations, loading, addLocation, updateLocation, deleteLocation } = useLocations();
  const { products, libraries } = useInventory();
  const { shelves } = useShelves();
  const { automations } = useAutomations();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [barcode, setBarcode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  // Codice mostrato nella finestra grande del QR: uno stato suo, non il campo del modulo (NG24: il QR di un'altra
  // riga riscriveva il codice della posizione che si stava modificando)
  const [qrCode, setQrCode] = useState<string | null>(null);

  // COD (NG25): il codice scritto, controllato mentre lo si scrive e al salvataggio
  const codeHint = codeCheck(barcode, editingId ? locations.find((l) => l.id === editingId)?.barcode : undefined,
    { products, locations, categories: libraries, shelves }, editingId ? { kind: 'location', id: editingId } : undefined);

  const resetForm = () => {
    setName('');
    setSelectedColor(COLOR_OPTIONS[0]);
    setBarcode('');
    setEditingId(null);
  };

  const handleEdit = (loc: Location) => {
    setName(loc.label);
    setSelectedColor(loc.color);
    setBarcode(loc.barcode || '');
    setEditingId(loc.id);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Errore', 'Inserisci un nome per la posizione');
      return;
    }
    // COD (NG25): un codice nuovo già usato da un prodotto, una posizione, una categoria o uno scaffale si rifiuta (lo
    // Scanner non saprebbe quale aprire); un doppione già salvato prima non blocca il salvataggio, ma si segnala
    const check = codeHint;
    if (check.error) {
      Alert.alert('Errore', check.error);
      return;
    }

    if (editingId) {
      // Update existing
      await updateLocation(editingId, {
        label: name,
        color: selectedColor,
        barcode: barcode || undefined,
      });
      if (check.warning) Alert.alert('Posizione aggiornata', check.warning);
      else Alert.alert('Successo', 'Posizione aggiornata');
      resetForm();
    } else {
      // Create new
      // Mai il separatore delle chiavi della giacenza (`/`, S1b): `newLocationId` tiene solo a-z, 0-9 e _
      const newId = newLocationId(name);

      if (locations.some((l) => l.id === newId)) {
        Alert.alert('Errore', 'Esiste già una posizione con questo ID (basato sul nome)');
        return;
      }

      await addLocation({
        id: newId,
        label: name,
        color: selectedColor,
        barcode: barcode || undefined,
      });
      Alert.alert('Successo', 'Posizione creata');
      resetForm();
    }
  };

  const handleDeleteLocation = (id: string) => {
    if (locations.length <= 1) {
      Alert.alert('Attenzione', 'Devi avere almeno una posizione');
      return;
    }
    // Ogni prodotto deve avere una posizione che esiste: prima si spostano (P08)
    const used = usage(products, { location: id });
    if (used.active + used.trashed > 0) {
      const label = locations.find((l) => l.id === id)?.label ?? id;
      const parts = [used.active && `${used.active} prodotti`, used.trashed && `${used.trashed} nel cestino`].filter(Boolean).join(' e ');
      const trash = used.trashed ? ' Quelli nel cestino si possono anche eliminare per sempre dal Cestino.' : '';
      Alert.alert('Attenzione', `La posizione "${label}" contiene ${parts}. Spostali in un'altra posizione prima di eliminarla.${trash}`);
      return;
    }
    // S1a: ogni scaffale sta in una posizione che esiste
    const withShelves = locationShelvesError(locations.find((l) => l.id === id)?.label ?? id, shelves, id);
    if (withShelves) {
      Alert.alert('Attenzione', withShelves);
      return;
    }
    // ESE (AU-V05): si avvisa se un passo «Sposta in» di un'automazione va qui (dopo si rifiuta, non sposta nel vuoto);
    // senza automazioni il testo è quello di prima
    const inUse = locationInUseText(automationsUsing(automations, id).map((a) => a.name));
    Alert.alert(
      'Conferma Eliminazione',
      inUse ? ['Eliminare questa posizione?', inUse].join(' ') : 'Eliminare questa posizione?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => await deleteLocation(id),
        },
      ]
    );
  };

  const generateBarcode = () => {
    // If editing, use ID. If new, use name to generate temp ID
    const baseId = editingId || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!baseId) {
      Alert.alert('Errore', 'Inserisci prima un nome per generare il codice.');
      return;
    }
    setBarcode(`LOC-${baseId.toUpperCase()}`);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string, data: string }) => {
    setBarcode(data);
    setShowScanner(false);
    Alert.alert('Scansionato', `Codice acquisito: ${data}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Backdrop />
        <ActivityIndicator size="large" color={t.colors.accentInk} />
      </View>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Form Section */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId ? 'Modifica posizione' : 'Aggiungi posizione'}
          </Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Es. Magazzino A, Scaffale 1"
            placeholderTextColor={t.colors.placeholder}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Colore</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorRow}>
            {COLOR_OPTIONS.map((color) => (
              <Pressable
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && <AppIcon name="check" size={20} color={t.colors.onData} />}
              </Pressable>
            ))}
          </ScrollView>

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
          {codeHint.error || codeHint.warning ? (
            <Text style={[styles.codeHint, codeHint.error ? styles.codeHintError : styles.codeHintWarning]}>{codeHint.error ?? codeHint.warning}</Text>
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
                {editingId ? 'Salva Modifiche' : 'Crea Posizione'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* List Section */}
        <Text style={styles.listTitle}>Posizioni ({locations.length})</Text>
        {locations.map((loc) => (
          <Pressable key={loc.id} style={styles.locationItem} onPress={() => handleEdit(loc)}>
            <View style={[styles.locationColor, { backgroundColor: loc.color }]} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>{loc.label}</Text>
              <Text style={styles.locationMeta}>
                ID: {loc.id}
                {loc.barcode ? ` • 🏷️ ${loc.barcode}` : ''}
              </Text>
            </View>

            <View style={styles.itemActions}>
              {loc.barcode && (
                <Pressable onPress={() => setQrCode(loc.barcode!)} style={{ marginRight: 8 }}>
                  <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
                </Pressable>
              )}
              <Pressable onPress={() => handleDeleteLocation(loc.id)}>
                <AppIcon name="delete" size={20} color={t.colors.error} />
              </Pressable>
            </View>
          </Pressable>
        ))}

      </ScrollView>

      {/* Scanner Modal */}
      {showScanner && (
        <View style={StyleSheet.absoluteFill}>
          <BarcodeScanner onScan={handleBarCodeScanned} onClose={() => setShowScanner(false)} />
        </View>
      )}

      {/* Large QR Modal */}
      <Modal visible={qrCode !== null} transparent animationType="fade" onRequestClose={() => setQrCode(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setQrCode(null)}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Codice Posizione</Text>
            <QRCode value={qrCode || 'empty'} size={200} />
            <Text style={styles.qrBigText}>{qrCode}</Text>
            <Text style={styles.qrHint}>Scansiona per spostare prodotti qui</Text>
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
  colorRow: {
    flexDirection: 'row',
    marginBottom: 16,
    height: 50,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: t.colors.textPrimary,
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
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  locationItem: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  locationColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    ...t.typography.cardTitle,
    fontSize: 16,
    fontWeight: t.weights.strong,
  },
  locationMeta: {
    ...t.typography.caption,
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: withAlpha(t.colors.qrInk, 0.7),
    marginTop: 8,
    textAlign: 'center',
  },
  // COD: avviso sotto il codice mentre lo si scrive (già usato: rosso, si rifiuta; doppione di prima: si segnala)
  codeHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  codeHintError: {
    color: t.colors.error,
  },
  codeHintWarning: {
    color: t.colors.warningText,
  },
}));
