// FurInventory Pro - Manage Locations Screen
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import QRCode from 'react-native-qrcode-svg';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { usage } from '../../../utils/productRules';
import { useShelves } from '../../../contexts/ShelvesContext';
import { locationShelvesError } from '../../../utils/shelves';
import { newLocationId } from '../../../utils/stock';
import { codeCheck, codeTaken, suggestCode } from '../../../utils/codes';
import { isAt } from '../../../utils/stock';
import { placeWithShelf } from '../../../utils/shelves';
import { useProductKind } from '../../../hooks/useProductKind';
import { CodeSheet } from '../../../components/CodeSheet';
import { labelCountText } from '../../../utils/labelHtml';
import { useAutomations } from '../../../contexts/AutomationsContext';
import { automationsUsing, locationInUseText } from '../../../utils/automationRun';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

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
  const kindOf = useProductKind();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [barcode, setBarcode] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [showScanner, setShowScanner] = useState(false);
  // ETI: finestra «Codice ed etichetta» di una posizione (dalla riga, o dopo la creazione con la riga «creata»). Uno
  // stato suo, non il campo del modulo (NG24: il QR di un'altra riga riscriveva il codice della posizione aperta)
  const [codeSheet, setCodeSheet] = useState<{ id: string; notice?: string } | null>(null);

  // COD (NG25): il codice scritto, controllato mentre lo si scrive e al salvataggio
  const sources = { products, locations, categories: libraries, shelves };
  const codeHint = codeCheck(barcode, editingId ? locations.find((l) => l.id === editingId)?.barcode : undefined,
    sources, editingId ? { kind: 'location', id: editingId } : undefined);

  const sheetFor = codeSheet ? locations.find((l) => l.id === codeSheet.id) : undefined;
  // AU-A8: «Stampa tutte le etichette di questa posizione»: lei, i suoi scaffali, i prodotti disponibili che ci stanno
  const seriesFor = (loc: Location) => {
    const here = shelves.filter((s) => s.locationId === loc.id && s.barcode);
    const items = products.filter((p) => !p.deletedAt && p.status !== 'sold' && isAt(p, loc.id));
    const list = [
      ...(loc.barcode ? [{ code: loc.barcode, name: loc.label }] : []),
      ...here.map((s) => ({ code: s.barcode!, name: placeWithShelf(loc.label, s) })),
      ...items.map((p) => ({ code: p.sku, name: kindOf(p).full })),
    ];
    const parts = [
      here.length === 1 ? '1 scaffale' : `${here.length} scaffali`,
      items.length === 1 ? '1 prodotto' : `${items.length} prodotti`,
    ];
    return { label: 'Stampa tutte le etichette di questa posizione', detail: `${loc.label}, ${parts.join(' e ')}: ${labelCountText(list.length)}`, items: list };
  };

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

      // ETI: un codice vuoto nasce da solo (stessa regola degli scaffali, mai uno già usato), poi «Codice ed etichetta»
      const code = barcode.trim() || suggestCode('LOC', [name], codeTaken(sources));
      await addLocation({
        id: newId,
        label: name,
        color: selectedColor,
        barcode: code || undefined,
      });
      const notice = `Posizione "${name.trim()}" creata.`;
      Alert.alert('Successo', 'Posizione creata', [{ text: 'OK', onPress: () => setCodeSheet({ id: newId, notice }) }]);
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
    // ETI: stessa regola del codice che nasce da solo («LOC-DEPOSITO-NORD»), mai uno già usato da altro
    const code = suggestCode('LOC', [name], codeTaken(sources, editingId ? { kind: 'location', id: editingId } : undefined));
    if (!code) {
      Alert.alert('Errore', 'Inserisci prima un nome per generare il codice.');
      return;
    }
    setBarcode(code);
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

          {/* ETI: «Codice»; se resta vuoto nasce da solo alla creazione (UX0, lessico) */}
          <Text style={styles.label}>Codice</Text>
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
          ) : !editingId && !barcode.trim() ? (
            <Text style={styles.codeHintEmpty}>Vuoto: si crea da solo quando salvi.</Text>
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
              {/* ETI: «Codice ed etichetta» su ogni riga (senza codice lo si crea lì) */}
              <Pressable onPress={() => setCodeSheet({ id: loc.id })} style={{ marginRight: 8 }} accessibilityLabel={`Codice ed etichetta di ${loc.label}`}>
                <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
              </Pressable>
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

      {/* ETI: «Codice ed etichetta» della posizione, con le etichette di tutto quello che c'è dentro (AU-A8) */}
      {sheetFor ? (
        <CodeSheet
          visible
          onClose={() => setCodeSheet(null)}
          kind="posizione"
          notice={codeSheet?.notice}
          items={[{ code: sheetFor.barcode ?? '', name: sheetFor.label }]}
          changeCode={{
            check: (code) => codeCheck(code, sheetFor.barcode, sources, { kind: 'location', id: sheetFor.id }),
            suggest: () => suggestCode('LOC', [sheetFor.label], codeTaken(sources, { kind: 'location', id: sheetFor.id })),
            save: async (code) => {
              await updateLocation(sheetFor.id, { barcode: code });
              if (editingId === sheetFor.id) setBarcode(code); // il modulo aperto non riscrive il codice di prima
            },
          }}
          series={seriesFor(sheetFor)}
        />
      ) : null}

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
  // ETI: il codice vuoto nasce da solo al salvataggio
  codeHintEmpty: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
    color: t.colors.textMuted,
  },
}));
