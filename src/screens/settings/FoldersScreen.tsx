// Impostazioni › Categorie (C1, ticket 19; CAT1, ticket 33): le categorie dei prodotti sono le cartelle di prima, con
// le sottocategorie (un genitore facoltativo, un solo livello). In cima si crea una categoria principale col solo nome;
// l'elenco è l'albero: ogni principale ha la freccia che apre le sue sottocategorie e «+ Sottocategoria». Toccando una
// riga si apre la finestra della categoria (nome, icona, «Dove sta», codice, Elimina). Elimina dice che cosa succede:
// con dei prodotti chiede dove spostarli («Sposta ed elimina»), con sottocategorie o scaffali si rifiuta come prima.
// Indirizzo `settings/folders` come prima. Nessun dato cambia forma: `libraries`, `parentId`, `libraryId`.
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
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
import {
  categoryDeleteStep, categoryMoveTargets, categoryName, categoryNameError, categoryPath, categoryTree, childrenOf,
  moveQuestion, parentIdOf, parentOptions, productsInCategory,
} from '../../../utils/categories';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { codeCheck } from '../../../utils/codes';

// Icone della categoria, con il nome che legge chi non vede l'icona
const ICON_OPTIONS: { name: string; label: string }[] = [
  { name: 'folder', label: 'Cartella' },
  { name: 'inventory', label: 'Scatola' },
  { name: 'warehouse', label: 'Magazzino' },
  { name: 'store', label: 'Negozio' },
  { name: 'shopping-bag', label: 'Borsa' },
  { name: 'category', label: 'Forme' },
  { name: 'collections', label: 'Raccolta' },
  { name: 'layers', label: 'Strati' },
];

/** Eliminazione in corso con lo spostamento: `target` undefined = non ancora scelto, null = «Senza categoria». */
type Deleting = { id: string; target: string | null | undefined; missing: boolean };

export default function ManageFoldersScreen() {
  const styles = useStyles();
  const t = useTheme();
  const { libraries, products, addLibrary, updateLibrary, deleteLibrary, updateProduct } = useInventory();
  const { shelves } = useShelves();
  const { locations } = useLocations();

  // In cima: solo il nome di una categoria principale
  const [newName, setNewName] = useState('');

  // Albero: aperta o chiusa per scelta dell'utente; senza scelta è aperta solo se ha sottocategorie
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] ?? childrenOf(libraries, id).length > 0;
  const setOpenFor = (id: string, value: boolean) => setOpen((prev) => ({ ...prev, [id]: value }));

  // «+ Sottocategoria» sulla riga di una principale (una alla volta)
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [subName, setSubName] = useState('');
  const [subError, setSubError] = useState<string | null>(null);

  // Finestra della categoria
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [barcode, setBarcode] = useState('');
  const [parentId, setParentId] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // «Dove li sposto?» (stessa finestra, al posto della modifica)
  const [deleting, setDeleting] = useState<Deleting | null>(null);

  // Codice della finestra grande del QR: uno stato suo, non il campo della finestra (NG24)
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Prodotti (non nel cestino) direttamente nella categoria
  const getItemCount = (libraryId: string): number => productsInCategory(products, libraryId).length;
  const parents = parentOptions(libraries, editingId ?? undefined);
  const editingHasChildren = !!editingId && childrenOf(libraries, editingId).length > 0;

  // COD (NG25): il codice scritto, controllato mentre lo si scrive e al salvataggio
  const codeHint = codeCheck(barcode, editingId ? libraries.find((l) => l.id === editingId)?.barcode : undefined,
    { products, locations, categories: libraries, shelves }, editingId ? { kind: 'category', id: editingId } : undefined);

  // ---- In cima: crea una categoria principale ----
  const handleCreate = () => {
    const error = categoryNameError(libraries, newName, undefined);
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    addLibrary(newName.trim(), 'folder');
    Alert.alert('Successo', `Categoria "${newName.trim()}" creata`);
    setNewName('');
  };

  // ---- «+ Sottocategoria» ----
  const startSub = (parent: string) => {
    setAddingUnder(parent);
    setSubName('');
    setSubError(null);
  };
  const closeSub = () => {
    setAddingUnder(null);
    setSubName('');
    setSubError(null);
  };
  const handleAddSub = () => {
    if (!addingUnder) return;
    const error = categoryNameError(libraries, subName, addingUnder);
    if (error) {
      setSubError(error);
      return;
    }
    addLibrary(subName.trim(), 'folder', addingUnder);
    setOpenFor(addingUnder, true);
    closeSub();
  };

  // ---- Finestra della categoria ----
  const openEdit = (lib: Library) => {
    setName(lib.name);
    setSelectedIcon(lib.icon);
    setBarcode(lib.barcode || '');
    setParentId(parentIdOf(libraries, lib.id) ?? '');
    setEditingId(lib.id);
    closeSub();
  };
  const closeEdit = () => {
    setEditingId(null);
    setShowScanner(false);
    setName('');
    setSelectedIcon('folder');
    setBarcode('');
    setParentId('');
  };

  const handleSave = () => {
    if (!editingId) return;
    // Un genitore che nel frattempo non si può più scegliere vale «principale»
    const parent = parents.some((p) => p.id === parentId) ? parentId : undefined;
    // COD (NG25): un codice nuovo già usato da un prodotto, una posizione, una categoria o uno scaffale si rifiuta; un
    // doppione già salvato prima non blocca il salvataggio, ma si segnala
    const check = codeHint;
    const error = categoryNameError(libraries, name, parent, editingId) ?? check.error;
    if (error) {
      Alert.alert('Errore', error);
      return;
    }
    updateLibrary(editingId, {
      name: name.trim(),
      icon: selectedIcon,
      barcode: barcode || undefined,
      parentId: parent,
    });
    // La categoria spostata sotto un'altra si vede subito, con l'albero aperto lì
    if (parent) setOpenFor(parent, true);
    if (check.warning) Alert.alert('Categoria aggiornata', check.warning);
    else Alert.alert('Successo', 'Categoria aggiornata');
    closeEdit();
  };

  const generateBarcode = () => {
    const baseName = editingId || name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (!baseName) {
      Alert.alert('Errore', 'Inserisci un nome prima.');
      return;
    }
    setBarcode(`LIB-${baseName.toUpperCase().substring(0, 10)}-${Date.now().toString().slice(-4)}`);
  };

  const handleBarCodeScanned = ({ data }: { type: string, data: string }) => {
    setBarcode(data);
    setShowScanner(false);
    Alert.alert('Scansionato', `Codice acquisito: ${data}`);
  };

  // ---- Elimina (dalla riga o dalla finestra) ----
  const handleDelete = (id: string) => {
    const library = libraries.find((l) => l.id === id);
    if (!library) return;
    const step = categoryDeleteStep(libraries, products, id, shelves);
    if (step.kind === 'refused') {
      // Con sottocategorie l'albero si apre e le mostra, ognuna col suo «Elimina»
      if (step.reason === 'children') {
        setOpenFor(id, true);
        if (editingId === id) closeEdit();
      }
      Alert.alert('Attenzione', step.message, [{ text: 'OK' }]);
      return;
    }
    if (step.kind === 'move') {
      setShowScanner(false);
      setDeleting({ id, target: undefined, missing: false });
      return;
    }
    Alert.alert(
      'Conferma Eliminazione',
      `Eliminare la categoria "${library.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            const success = deleteLibrary(id);
            if (!success) {
              Alert.alert('Errore', 'Impossibile eliminare la categoria');
            } else {
              if (editingId === id) closeEdit();
              if (addingUnder === id) closeSub();
            }
          },
        },
      ]
    );
  };

  // «Sposta ed elimina»: ogni prodotto con `updateProduct` (la Cronologia scrive il cambio di categoria), poi la
  // categoria. `updateProduct` aggiorna subito la copia dei prodotti che `deleteLibrary` conta (prova cat1, caso 8).
  const handleMoveAndDelete = () => {
    if (!deleting) return;
    if (deleting.target === undefined) {
      setDeleting({ ...deleting, missing: true });
      return;
    }
    const { id, target } = deleting;
    const from = categoryName(libraries, id);
    const to = target ? categoryPath(libraries, target) : null;
    const moved = productsInCategory(products, id);
    moved.forEach((p) => updateProduct(p.id, { libraryId: target ?? undefined }));
    const success = deleteLibrary(id);
    setDeleting(null);
    if (editingId === id) closeEdit();
    if (addingUnder === id) closeSub();
    const what = moved.length === 1 ? '1 prodotto spostato' : `${moved.length} prodotti spostati`;
    if (!success) {
      Alert.alert('Errore', `${what} ${to ? `in "${to}"` : 'senza categoria'}, ma "${from}" non si è potuta eliminare. Riprova.`);
    } else {
      Alert.alert('Fatto', `${what} ${to ? `in "${to}"` : 'senza categoria'}. "${from}" eliminata.`);
    }
  };

  // Chiudere la finestra: da «Dove li sposto?» si torna alla modifica (se c'era), altrimenti si chiude tutto
  const closeSheet = () => {
    if (deleting) setDeleting(null);
    else closeEdit();
  };

  // ---- Pezzi della schermata ----
  const choiceChip = (key: string, label: string, active: boolean, onPress: () => void, a11y: string) => (
    <Pressable key={key} style={[styles.chip, active && styles.chipActive]} onPress={onPress} accessibilityLabel={a11y} accessibilityState={{ selected: active }}>
      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
      {active && <AppIcon name="check" size={16} color={t.colors.chipActiveText} />}
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );

  const categoryRow = (library: Library, depth: number) => {
    const subs = childrenOf(libraries, library.id).length;
    const count = getItemCount(library.id);
    return (
      <Pressable style={styles.row} onPress={() => openEdit(library)}>
        <View style={[styles.rowIcon, depth > 0 && styles.rowIconSub]}>
          <AppIcon name={library.icon} size={depth > 0 ? 18 : 20} color={t.colors.accentInk} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={2}>{library.name}</Text>
          <Text style={styles.rowCount}>
            {count === 1 ? '1 prodotto' : `${count} prodotti`}
            {subs > 0 ? ` · ${subs === 1 ? '1 sottocategoria' : `${subs} sottocategorie`}` : ''}
          </Text>
          <Text style={styles.rowId}>
            ID: {library.id}
            {library.barcode ? ` • 🏷️ ${library.barcode}` : ''}
          </Text>
        </View>
        <View style={styles.rowActions}>
          {library.barcode && (
            <Pressable onPress={() => setQrCode(library.barcode!)} style={styles.rowAction} accessibilityLabel={`Codice di ${library.name}`} hitSlop={4}>
              <AppIcon name="qr-code" size={20} color={t.colors.textPrimary} />
            </Pressable>
          )}
          <Pressable onPress={() => handleDelete(library.id)} style={styles.rowAction} accessibilityLabel={`Elimina ${library.name}`} hitSlop={4}>
            <AppIcon name="delete" size={20} color={t.colors.error} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const subForm = (root: Library) => (
    <View style={styles.subForm}>
      <View style={styles.subFormRow}>
        <TextInput
          style={[styles.input, styles.subInput]}
          placeholder="Es: Zaini"
          placeholderTextColor={t.colors.placeholder}
          value={subName}
          onChangeText={(v) => { setSubName(v); setSubError(null); }}
          onSubmitEditing={handleAddSub}
          returnKeyType="done"
          autoFocus
          accessibilityLabel={`Nome della sottocategoria di ${root.name}`}
        />
        <Pressable style={styles.subAdd} onPress={handleAddSub} accessibilityLabel={`Aggiungi la sottocategoria a ${root.name}`}>
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <Text style={styles.subAddText}>Aggiungi</Text>
        </Pressable>
        <Pressable style={styles.subClose} onPress={closeSub} accessibilityLabel="Annulla la sottocategoria" hitSlop={4}>
          <AppIcon name="close" size={22} color={t.colors.textSecondary} />
        </Pressable>
      </View>
      {subError ? <Text style={styles.errorText}>{subError}</Text> : null}
    </View>
  );

  // L'albero per gruppi: ogni principale con le sue sottocategorie (anche più livelli di dati vecchi, rientrati)
  const groups: { root: Library; subs: { category: Library; depth: number }[] }[] = [];
  for (const node of categoryTree(libraries)) {
    if (node.depth === 0) groups.push({ root: node.category, subs: [] });
    else groups[groups.length - 1]?.subs.push(node);
  }

  const editing = editingId ? libraries.find((l) => l.id === editingId) : undefined;
  const deletingLib = deleting ? libraries.find((l) => l.id === deleting.id) : undefined;

  const editSheet = (
    <>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle} numberOfLines={1}>Modifica categoria</Text>
        <Pressable onPress={closeEdit} accessibilityLabel="Chiudi" hitSlop={8}>
          <AppIcon name="close" size={24} color={t.colors.textSecondary} />
        </Pressable>
      </View>
      {editing && parentIdOf(libraries, editing.id) ? (
        <Text style={styles.sheetPath} numberOfLines={1}>{categoryPath(libraries, editing.id)}</Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder="Es: Giacche"
          placeholderTextColor={t.colors.placeholder}
          value={name}
          onChangeText={setName}
          accessibilityLabel="Nome della categoria"
        />

        <Text style={styles.label}>Icona</Text>
        <View style={styles.iconPicker}>
          {ICON_OPTIONS.map((icon) => (
            <Pressable
              key={icon.name}
              style={[styles.iconOption, selectedIcon === icon.name && styles.iconOptionSelected]}
              onPress={() => setSelectedIcon(icon.name)}
              accessibilityLabel={`Icona ${icon.label}`}
              accessibilityState={{ selected: selectedIcon === icon.name }}
            >
              <AppIcon
                name={icon.name}
                size={26}
                color={selectedIcon === icon.name ? t.colors.tileSelectedText : t.colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>

        {/* «Dove sta» (C1 «Sottocategoria di»): principale o dentro un'altra principale, un solo livello */}
        {editingHasChildren ? (
          <Text style={styles.hint}>Ha delle sottocategorie: resta principale.</Text>
        ) : (
          <>
            <Text style={styles.label}>Dove sta</Text>
            <View style={styles.chipWrap}>
              {choiceChip('root', 'Categoria principale', parentId === '', () => setParentId(''), 'Dove sta: Categoria principale')}
              {parents.map((p) => choiceChip(p.id, `Dentro ${p.name}`, parentId === p.id,
                () => setParentId(parentId === p.id ? '' : p.id), `Dove sta: Dentro ${p.name}`))}
            </View>
          </>
        )}

        {/* Codice: il blocco di prima, così com'è (ETI e N1 lo sostituiscono) */}
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
        {barcode ? (
          <View style={styles.qrPreview}>
            <QRCode value={barcode} size={60} />
            <Text style={styles.qrText}>{barcode}</Text>
          </View>
        ) : null}
        {codeHint.error || codeHint.warning ? (
          <Text style={[styles.codeHint, codeHint.error ? styles.codeHintError : styles.codeHintWarning]}>{codeHint.error ?? codeHint.warning}</Text>
        ) : null}

        {editing ? (
          <Pressable style={styles.deleteLink} onPress={() => handleDelete(editing.id)}>
            <AppIcon name="delete" size={20} color={t.colors.error} />
            <Text style={styles.deleteLinkText}>Elimina categoria</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={styles.sheetActions}>
        <Pressable style={styles.secondary} onPress={closeEdit}>
          <Text style={styles.secondaryText}>Annulla</Text>
        </Pressable>
        <Pressable style={styles.primary} onPress={handleSave}>
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <Text style={styles.primaryText}>Salva Modifiche</Text>
        </Pressable>
      </View>
    </>
  );

  const moveSheet = deleting && deletingLib ? (
    <>
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle} numberOfLines={1}>Elimina {deletingLib.name}</Text>
        <Pressable onPress={() => setDeleting(null)} accessibilityLabel="Chiudi" hitSlop={8}>
          <AppIcon name="close" size={24} color={t.colors.textSecondary} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
        <Text style={styles.question}>{moveQuestion(deletingLib.name, getItemCount(deletingLib.id))}</Text>
        <View style={styles.chipWrap}>
          {categoryMoveTargets(libraries, deletingLib.id).map((c) => choiceChip(c.id, c.label, deleting.target === c.id,
            () => setDeleting({ ...deleting, target: c.id, missing: false }), `Sposta in ${c.label}`))}
          {choiceChip('none', 'Senza categoria', deleting.target === null,
            () => setDeleting({ ...deleting, target: null, missing: false }), 'Sposta in Senza categoria')}
        </View>
        {deleting.missing ? <Text style={styles.errorText}>Scegli dove spostare i prodotti.</Text> : null}
        <Text style={styles.hint}>La Cronologia di ogni prodotto scrive lo spostamento.</Text>
      </ScrollView>
      <View style={styles.sheetActions}>
        <Pressable style={styles.secondary} onPress={() => setDeleting(null)}>
          <Text style={styles.secondaryText}>Annulla</Text>
        </Pressable>
        <Pressable style={[styles.primary, styles.destructive]} onPress={handleMoveAndDelete}>
          <Text style={[styles.primaryText, styles.destructiveText]}>Sposta ed elimina</Text>
        </Pressable>
      </View>
    </>
  ) : null;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* In cima: solo il nome; icona e codice si mettono nella finestra della categoria */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Crea nuova categoria</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome categoria (es: Giacche)"
            placeholderTextColor={t.colors.placeholder}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleCreate}
            returnKeyType="done"
          />
          <Pressable style={styles.saveButton} onPress={handleCreate}>
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <Text style={styles.saveButtonText}>Crea Categoria</Text>
          </Pressable>
        </View>

        {/* Elenco ad albero: una card per ogni principale, con le sue sottocategorie rientrate e «+ Sottocategoria» */}
        <Text style={styles.listTitle}>Categorie esistenti ({libraries.length})</Text>
        {groups.length === 0 ? (
          <Text style={styles.empty}>Nessuna categoria. Scrivi un nome qui sopra e tocca «Crea Categoria».</Text>
        ) : null}

        {groups.map(({ root, subs }) => {
          const opened = isOpen(root.id);
          return (
            <View key={root.id} style={styles.group}>
              <View style={styles.rowLine}>
                <Pressable
                  style={styles.chevron}
                  onPress={() => setOpenFor(root.id, !opened)}
                  accessibilityLabel={`${opened ? 'Chiudi' : 'Apri'} ${root.name}`}
                  accessibilityState={{ expanded: opened }}
                >
                  <AppIcon name={opened ? 'expand-more' : 'chevron-right'} size={26} color={t.colors.textSecondary} />
                </Pressable>
                {categoryRow(root, 0)}
              </View>
              {opened ? (
                <>
                  {subs.map(({ category, depth }) => (
                    <View key={category.id} style={[styles.rowLine, styles.subLine, { paddingLeft: 60 + 20 * (depth - 1) }]}>
                      {categoryRow(category, depth)}
                    </View>
                  ))}
                  {addingUnder === root.id ? subForm(root) : (
                    <Pressable style={styles.addSubRow} onPress={() => startSub(root.id)} accessibilityLabel={`Aggiungi una sottocategoria a ${root.name}`}>
                      <Text style={styles.addSubText}>+ Sottocategoria</Text>
                    </Pressable>
                  )}
                </>
              ) : null}
            </View>
          );
        })}

        <View style={styles.infoCard}>
          <AppIcon name="info-outline" size={24} color={t.colors.accentInk} />
          <Text style={styles.infoText}>
            Tocca una categoria per cambiarla o eliminarla. Con la freccia apri le sottocategorie e ne aggiungi una.
          </Text>
        </View>

      </ScrollView>

      {/* Finestra della categoria, sopra l'elenco nel punto dove si è (D3); «Dove li sposto?» nella stessa finestra */}
      <Modal visible={editingId !== null || deleting !== null} transparent animationType="fade" onRequestClose={closeSheet}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            {deleting ? moveSheet : editSheet}
          </View>
          {showScanner && (
            <View style={StyleSheet.absoluteFill}>
              <BarcodeScanner onScan={handleBarCodeScanned} onClose={() => setShowScanner(false)} />
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Large QR Modal */}
      <Modal visible={qrCode !== null} transparent animationType="fade" onRequestClose={() => setQrCode(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setQrCode(null)}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Codice Categoria</Text>
            <QRCode value={qrCode || 'empty'} size={200} />
            <Text style={styles.qrBigText}>{qrCode}</Text>
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
    marginBottom: 20,
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
    marginBottom: 12,
  },
  saveButton: {
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
  listTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  empty: {
    ...t.typography.caption,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  // Una card per ogni principale (R9): righe con un filetto tra l'una e l'altra
  group: {
    ...cardSurface(t),
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subLine: {
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  chevron: {
    width: 44,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 8,
    paddingRight: 8,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconSub: {
    width: 32,
    height: 32,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    ...t.typography.cardTitle,
    fontSize: 15,
    fontWeight: t.weights.strong,
    marginBottom: 2,
  },
  rowCount: {
    ...t.typography.caption,
    fontSize: 13,
  },
  rowId: {
    ...t.typography.caption,
    fontSize: 10,
    color: t.colors.textMuted,
    fontFamily: 'monospace',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowAction: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingLeft: 60,
    paddingRight: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  addSubText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: t.weights.strong,
    color: t.colors.accentInk,
  },
  subForm: {
    paddingLeft: 44,
    paddingRight: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  subFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subInput: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  subAdd: {
    height: t.input.height,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    overflow: 'hidden',
  },
  subAddText: {
    ...t.typography.buttonPrimary,
    fontSize: 14,
    color: t.colors.onButton,
  },
  subClose: {
    width: 36,
    height: t.input.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.error,
    marginTop: 6,
  },
  infoCard: {
    ...cardSurface(t),
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  infoText: {
    ...t.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  // Finestra della categoria: come Movimenta (MovementSheet), fondo opaco
  overlay: {
    flex: 1,
    backgroundColor: t.colors.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadows.cardElevated,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  sheetTitle: {
    flex: 1,
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
  },
  sheetPath: {
    ...t.typography.caption,
    fontSize: 13,
    paddingHorizontal: 18,
  },
  sheetBody: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  secondary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  secondaryText: {
    ...t.typography.buttonSecondary,
    fontSize: 15,
    color: t.colors.onButtonSecondary,
  },
  primary: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  primaryText: {
    ...t.typography.buttonPrimary,
    fontSize: 15,
    color: t.colors.onButton,
  },
  destructive: {
    backgroundColor: t.colors.error,
  },
  destructiveText: {
    color: t.colors.onAccent,
  },
  question: {
    ...t.typography.cardTitle,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 12,
  },
  hint: {
    ...t.typography.caption,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  iconOption: {
    ...tileSurface(t),
    width: 48,
    height: 48,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    backgroundColor: t.colors.tileSelected,
    borderColor: t.colors.tileSelectedBorder,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    minHeight: 36,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    overflow: 'hidden',
  },
  chipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: t.colors.chipText,
    flexShrink: 1,
  },
  chipTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  barcodeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginBottom: 12,
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
    marginBottom: 12,
    alignSelf: 'center',
  },
  qrText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: t.colors.qrInk,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  deleteLinkText: {
    fontSize: 15,
    fontWeight: t.weights.strong,
    color: t.colors.error,
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
    marginTop: -4,
    marginBottom: 8,
  },
  codeHintError: {
    color: t.colors.error,
  },
  codeHintWarning: {
    color: t.colors.warningText,
  },
}));
