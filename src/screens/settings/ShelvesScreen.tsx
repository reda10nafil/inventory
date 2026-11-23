// Impostazioni › Scaffali (S1a, ticket 13): ogni scaffale sta in una posizione (scelta alla creazione, poi fissa),
// è generico o di una categoria e ha un codice (QR) e un tag NFC facoltativi. Elenco per posizione con i prodotti
// che ci stanno; uno scaffale con prodotti non si elimina, come una posizione. Logica in utils/shelves.ts.
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import {
  codeError, codeOwner, shelfDeleteError, shelfKind, shelfNameError, shelfUsage, shelvesByLocation, suggestShelfCode, type Shelf,
} from '../../../utils/shelves';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { formStyles } from '../../../components/ui/formStyles';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

const productsText = (n: number) => (n === 0 ? 'Nessun prodotto' : n === 1 ? '1 prodotto' : `${n} prodotti`);

export default function ShelvesScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { shelves, loading, addShelf, updateShelf, deleteShelf } = useShelves();
  const { products, libraries } = useInventory();
  const { locations } = useLocations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [libraryId, setLibraryId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [nfcTag, setNfcTag] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [qrShelf, setQrShelf] = useState<Shelf | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const usage = useMemo(() => shelfUsage(products, shelves), [products, shelves]);
  const groups = useMemo(() => shelvesByLocation(shelves, locations), [shelves, locations]);
  const editing = shelves.find((s) => s.id === editingId);
  const placeLabel = (id: string) => locations.find((l) => l.id === id)?.label ?? id;
  const sources = { products, locations, categories: libraries, shelves };
  // Senza scaffali il modulo è già aperto: è la prima cosa da fare
  const showForm = formOpen || shelves.length === 0;

  const resetForm = () => {
    setName(''); setLocationId(''); setLibraryId(''); setBarcode(''); setNfcTag('');
    setEditingId(null); setFormOpen(false);
  };

  const startEdit = (shelf: Shelf) => {
    setName(shelf.name); setLocationId(shelf.locationId); setLibraryId(shelf.libraryId ?? '');
    setBarcode(shelf.barcode ?? ''); setNfcTag(shelf.nfcTag ?? '');
    setEditingId(shelf.id); setFormOpen(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSave = async () => {
    const error = shelfNameError(shelves, name, locationId, editingId ?? undefined)
      ?? codeError(barcode, sources, editingId ?? undefined);
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    const data = { name, libraryId, barcode, nfcTag };
    if (editingId) {
      await updateShelf(editingId, data);
      Alert.alert('Fatto', 'Scaffale aggiornato');
    } else {
      await addShelf({ ...data, locationId });
      Alert.alert('Fatto', `Scaffale "${name.trim()}" creato in ${placeLabel(locationId)}`);
    }
    resetForm();
  };

  const generateCode = () => {
    if (!locationId) {
      Alert.alert('Errore', 'Scegli prima la posizione dello scaffale.');
      return;
    }
    const code = suggestShelfCode(placeLabel(locationId), name, (c) => codeOwner(c, sources, editingId ?? undefined) !== null);
    if (!code) {
      Alert.alert('Errore', 'Inserisci prima un nome per generare il codice.');
      return;
    }
    setBarcode(code);
  };

  const handleDelete = (shelf: Shelf) => {
    const error = shelfDeleteError(shelf, usage[shelf.id]);
    if (error) {
      Alert.alert('Attenzione', error);
      return;
    }
    Alert.alert('Conferma eliminazione', `Eliminare lo scaffale "${shelf.name}" di ${placeLabel(shelf.locationId)}?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await deleteShelf(shelf.id);
          if (editingId === shelf.id) resetForm();
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

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.inputText}
          placeholder={placeholder}
          placeholderTextColor={t.colors.placeholder}
          value={value}
          onChangeText={onChange}
          accessibilityLabel={label}
        />
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <Backdrop />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingId ? 'Modifica scaffale' : 'Nuovo scaffale'}</Text>
            {field('Nome', name, setName, 'Es. A1, Ripiano giacche')}

            <Text style={styles.label}>Posizione</Text>
            {editing ? (
              <>
                <View style={[styles.inputBox, styles.readonly]}>
                  <AppIcon name="location-on" size={18} color={t.colors.fieldIcon} />
                  <Text style={styles.valueText}>{placeLabel(editing.locationId)}</Text>
                </View>
                <Text style={styles.hint}>La posizione si sceglie alla creazione e poi resta quella.</Text>
              </>
            ) : (
              <View style={styles.chipWrap}>
                {locations.map((loc) => {
                  const active = locationId === loc.id;
                  return (
                    <Pressable
                      key={loc.id}
                      style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                      onPress={() => setLocationId(loc.id)}
                      accessibilityLabel={`Posizione ${loc.label}`}
                      accessibilityState={{ selected: active }}
                    >
                      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                      <View style={[styles.chipDot, active && styles.chipDotActive, { backgroundColor: loc.color }]} />
                      <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{loc.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Text style={styles.label}>Categoria</Text>
            <CategoryPicker categories={libraries} value={libraryId} onChange={setLibraryId} showNone noneLabel="Generico" />
            <Text style={styles.hint}>
              Generico: per prodotti di ogni categoria. Uno scaffale di una categoria vale anche per le sue sottocategorie.
            </Text>

            <Text style={styles.label}>Codice (QR, facoltativo)</Text>
            <View style={styles.inputRow}>
              <View style={[styles.inputBox, styles.inputFill]}>
                <TextInput
                  style={styles.inputText}
                  placeholder="Scansiona o genera"
                  placeholderTextColor={t.colors.placeholder}
                  value={barcode}
                  onChangeText={setBarcode}
                  autoCapitalize="characters"
                  accessibilityLabel="Codice dello scaffale"
                />
              </View>
              <Pressable style={styles.sideButton} onPress={() => setShowScanner(true)} accessibilityLabel="Scansiona il codice">
                <AppIcon name="qr-code-scanner" size={22} color={t.colors.accentInk} />
              </Pressable>
              <Pressable style={styles.sideButton} onPress={generateCode} accessibilityLabel="Genera il codice">
                <AppIcon name="autorenew" size={22} color={t.colors.accentInk} />
              </Pressable>
            </View>
            {barcode.trim() ? (
              <View style={styles.qrPreview}>
                <QRCode value={barcode.trim()} size={60} />
                <Text style={styles.qrText}>{barcode.trim()}</Text>
              </View>
            ) : null}

            {field('Tag NFC (facoltativo)', nfcTag, setNfcTag, 'Es. 04:A2:3B:1C')}
            <Text style={styles.hint}>Il tag si salva con lo scaffale; la lettura col telefono arriverà più avanti.</Text>

            <View style={styles.actionButtons}>
              {(editingId || shelves.length > 0) && (
                <Pressable style={[styles.secondaryButton, styles.button]} onPress={resetForm}>
                  <Text style={styles.secondaryButtonText}>Annulla</Text>
                </Pressable>
              )}
              <Pressable style={[styles.primaryButton, styles.button]} onPress={handleSave} accessibilityLabel={editingId ? 'Salva scaffale' : 'Crea scaffale'}>
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <Text style={styles.primaryButtonText}>{editingId ? 'Salva' : 'Crea scaffale'}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.primaryButton, styles.newButton]} onPress={() => setFormOpen(true)} accessibilityLabel="Nuovo scaffale">
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <AppIcon name="add" size={20} color={t.colors.onButton} />
            <Text style={styles.primaryButtonText}>Nuovo scaffale</Text>
          </Pressable>
        )}

        <Text style={styles.listTitle}>Scaffali ({shelves.length})</Text>
        {groups.map((group) => (
          <View key={group.locationId}>
            <Text style={styles.groupTitle}>{group.label} · {group.shelves.length}</Text>
            {group.shelves.map((shelf) => {
              const used = usage[shelf.id];
              const count = (used?.active ?? 0) + (used?.trashed ?? 0);
              return (
                <Pressable
                  key={shelf.id}
                  style={[styles.item, editingId === shelf.id && styles.itemEditing]}
                  onPress={() => startEdit(shelf)}
                  accessibilityLabel={`Modifica scaffale ${shelf.name}`}
                >
                  <View style={styles.itemIcon}>
                    <AppIcon name="shelves" size={18} color={t.colors.accentInk} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemLabel} numberOfLines={2}>{shelf.name}</Text>
                    <Text style={styles.itemMeta} numberOfLines={3}>
                      {shelfKind(shelf, libraries)} · {productsText(count)}
                    </Text>
                    {/* Codice e tag per intero, ognuno sulla sua riga (un codice lungo va a capo) */}
                    {shelf.barcode ? <Text style={styles.itemMeta}>Codice {shelf.barcode}</Text> : null}
                    {shelf.nfcTag ? <Text style={styles.itemMeta}>NFC {shelf.nfcTag}</Text> : null}
                  </View>
                  {shelf.barcode ? (
                    <Pressable onPress={() => setQrShelf(shelf)} hitSlop={8} accessibilityLabel={`Codice QR di ${shelf.name}`}>
                      <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => handleDelete(shelf)} hitSlop={8} accessibilityLabel={`Elimina scaffale ${shelf.name}`}>
                    <AppIcon name="delete" size={20} color={t.colors.error} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        ))}
        {shelves.length === 0 && <Text style={styles.empty}>Nessuno scaffale: crea il primo qui sopra.</Text>}
        <Text style={styles.hint}>
          Lo scaffale si sceglie in Aggiungi e Modifica per i pezzi unici, tra quelli della loro posizione; lo Scanner riconosce il suo codice.
        </Text>
      </ScrollView>

      {showScanner && (
        <View style={StyleSheet.absoluteFill}>
          <BarcodeScanner
            onScan={({ data }) => { setBarcode(data); setShowScanner(false); }}
            onClose={() => setShowScanner(false)}
          />
        </View>
      )}

      <Modal visible={!!qrShelf} transparent animationType="fade" onRequestClose={() => setQrShelf(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setQrShelf(null)}>
          {qrShelf?.barcode ? (
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Codice scaffale</Text>
              <QRCode value={qrShelf.barcode} size={200} />
              <Text style={styles.qrBigText}>{qrShelf.barcode}</Text>
              <Text style={styles.qrHint}>{placeLabel(qrShelf.locationId)} › {qrShelf.name}</Text>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
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
    marginBottom: 12,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  label: {
    fontSize: t.label.size,
    fontWeight: t.label.weight,
    color: t.label.color,
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 6,
  },
  readonly: {
    opacity: 0.8,
  },
  hint: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 6,
  },
  qrPreview: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: t.colors.qrPaper,
    borderRadius: t.radius.tile,
    marginTop: 10,
    alignSelf: 'center',
  },
  qrText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 'bold',
    color: t.colors.qrInk,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  button: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  newButton: {
    minHeight: 48,
    marginBottom: 24,
  },
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  groupTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: t.weights.strong,
    color: t.colors.textSecondary,
    marginTop: 6,
    marginBottom: 8,
  },
  item: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemEditing: {
    borderWidth: 1,
    borderColor: t.colors.accent,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentSoft,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemLabel: {
    ...t.typography.cardTitle,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: t.weights.strong,
  },
  itemMeta: {
    ...t.typography.caption,
    lineHeight: 18,
    marginTop: 2,
  },
  empty: {
    ...t.typography.caption,
    lineHeight: 18,
    marginBottom: 6,
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
}));
