// Impostazioni › Scaffali (S1a, ticket 13): ogni scaffale sta in una posizione (scelta alla creazione, poi fissa),
// è generico o di una categoria e ha un codice (QR) e un tag NFC facoltativi. Elenco per posizione con i prodotti
// che ci stanno; uno scaffale con prodotti non si elimina, come una posizione. Logica in utils/shelves.ts.
import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import {
  shelfDeleteError, shelfKind, shelfNameError, shelfUsage, shelvesByLocation, suggestShelfCode, type Shelf,
} from '../../../utils/shelves';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { codeCheck, codeOwner } from '../../../utils/codes';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { formStyles } from '../../../components/ui/formStyles';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { CodeSheet } from '../../../components/CodeSheet'; // ETI: finestra «Codice ed etichetta»

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
  // COD (NG25): codice e tag controllati mentre si scrivono e al salvataggio
  const savedShelf = editingId ? shelves.find((x) => x.id === editingId) : undefined;
  const shelfSelf = editingId ? { kind: 'shelf' as const, id: editingId } : undefined;
  const barcodeHint = codeCheck(barcode, savedShelf?.barcode, sources, shelfSelf);
  const tagHint = codeCheck(nfcTag, savedShelf?.nfcTag, sources, shelfSelf);
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
    // COD (NG25): codice e tag (anche l'UID scritto in un altro modo) già usati altrove si rifiutano se sono nuovi;
    // un doppione già salvato prima non blocca il salvataggio di un altro campo, ma si segnala
    const codeChecks = [barcodeHint, tagHint];
    const error = shelfNameError(shelves, name, locationId, editingId ?? undefined) ?? codeChecks.find((c) => c.error)?.error;
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    const warning = codeChecks.map((c) => c.warning).filter(Boolean).join('\n\n');
    const data = { name, libraryId, barcode, nfcTag };
    if (editingId) {
      await updateShelf(editingId, data);
      Alert.alert(warning ? 'Scaffale aggiornato' : 'Fatto', warning || 'Scaffale aggiornato');
    } else {
      const created = await addShelf({ ...data, locationId });
      // ETI: al «OK» si apre «Codice ed etichetta» dello scaffale nuovo, per stamparne subito l'etichetta (CF-D1)
      Alert.alert('Fatto', `Scaffale "${name.trim()}" creato in ${placeLabel(locationId)}`, [{ text: 'OK', onPress: () => setQrShelf(created) }]);
    }
    resetForm();
  };

  const generateCode = () => {
    if (!locationId) {
      Alert.alert('Errore', 'Scegli prima la posizione dello scaffale.');
      return;
    }
    const code = suggestShelfCode(placeLabel(locationId), name, (c) => codeOwner(c, sources, editingId ? { kind: 'shelf', id: editingId } : undefined) !== null);
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
            {barcodeHint.error || barcodeHint.warning ? (
              <Text style={[styles.codeHint, barcodeHint.error ? styles.codeHintError : styles.codeHintWarning]}>{barcodeHint.error ?? barcodeHint.warning}</Text>
            ) : null}

            {field('Tag NFC (facoltativo)', nfcTag, setNfcTag, 'Es. 04:A2:3B:1C')}
            {tagHint.error || tagHint.warning ? (
              <Text style={[styles.codeHint, tagHint.error ? styles.codeHintError : styles.codeHintWarning]}>{tagHint.error ?? tagHint.warning}</Text>
            ) : null}
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
                  {/* ETI: «Codice ed etichetta» su ogni riga, anche senza codice («Crea il codice») */}
                  <Pressable onPress={() => setQrShelf(shelf)} hitSlop={8} accessibilityLabel={`Codice QR di ${shelf.name}`}>
                    <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
                  </Pressable>
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
          Lo scaffale si sceglie tra quelli della posizione: in Aggiungi e Modifica per i pezzi unici, in Aggiungi e Movimenta per la giacenza degli articoli a quantità. Lo Scanner riconosce il suo codice.
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

      {/* ETI: «Codice ed etichetta» dello scaffale (dalla riga e dopo la creazione), con lo scaffale salvato più recente.
          «Cambia codice» riscrive tutto lo scaffale salvato col solo codice nuovo (misure e limiti di S2 restano). */}
      {(() => {
        const shelf = qrShelf ? shelves.find((s) => s.id === qrShelf.id) : undefined;
        if (!shelf) return null;
        const self = { kind: 'shelf' as const, id: shelf.id };
        return (
          <CodeSheet
            visible
            onClose={() => setQrShelf(null)}
            kind="scaffale"
            items={[{ code: shelf.barcode ?? '', name: `${placeLabel(shelf.locationId)} › ${shelf.name}` }]}
            changeCode={{
              check: (code) => codeCheck(code, shelf.barcode, sources, self),
              suggest: () => suggestShelfCode(placeLabel(shelf.locationId), shelf.name, (c) => codeOwner(c, sources, self) !== null),
              save: async (code) => {
                const { id, createdAt: _created, locationId: _place, ...rest } = shelf;
                await updateShelf(id, { ...rest, barcode: code });
                if (editingId === id) setBarcode(code); // il modulo aperto non riscrive il codice di prima
              },
            }}
          />
        );
      })()}
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
