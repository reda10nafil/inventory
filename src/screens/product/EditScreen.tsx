// FurInventory Pro - Edit Product Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { ProductNotFound } from '../../components/ProductNotFound';
import * as ImagePicker from '../../lib/imagePicker';
import { useInventory } from '../../../contexts/InventoryContext';
import { formatNumberInput, parseNumber } from '../../../utils/number';
import { DEFAULT_UNIT, formatQty, isStocked, stockOf, totalStock } from '../../../utils/stock';
import { parseMinStock } from '../../../utils/alerts';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { editableFields } from '../../../utils/layoutOrder';
import type { Product } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Glass } from '../../../components/ui/Glass';
import { GradientFill } from '../../../components/ui/GradientFill';
import { Text, TextInput } from '../../../components/ui/Text';
import { formStyles } from '../../../components/ui/formStyles';
import { FieldInput, fieldIcon } from '../../../components/FieldInput';
import { missingRequiredFields } from '../../../utils/formValidation';
import { fieldError, formValue, invalidNumberFields, NO_FLAGS, savedValue, type FlaggedFields } from '../../../utils/fieldValues';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { useShelves } from '../../../contexts/ShelvesContext';
import { usePlaceLabel } from '../../../hooks/usePlaceLabel';
import { shelvesFor } from '../../../utils/shelves';
import { ShelfPicker } from '../../../components/ShelfPicker';
import { PhotoGallery } from '../../../components/PhotoGallery';
import { addPhotos, photosPatch, type Photos } from '../../../utils/photos';

// Il modulo nasce solo quando il prodotto c'è. Aperta dall'indirizzo o ricaricata, la schermata partiva prima
// che i prodotti fossero letti e il modulo restava vuoto: salvando si sovrascriveva il prodotto (P04).
export default function EditProductScreen() {
  const { id } = useLocalSearchParams();
  const { getProductById } = useInventory();
  const product = getProductById(id as string);

  // IND-P6 (ticket 28): con «Torna all'inventario», non più una pagina senza uscita
  if (!product) return <ProductNotFound />;
  return <EditProductForm key={product.id} product={product} />;
}

function EditProductForm({ product }: { product: Product }) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const id = product.id;
  const { updateProduct, libraries } = useInventory();
  const { locations } = useLocations();
  const { furTypes } = useFurTypes();
  // Articolo a quantità (M03): posizione e giacenza non si modificano qui
  const stocked = isStocked(product);
  // S1b: «Magazzino › A1» per la giacenza sugli scaffali (la posizione che non c'è più resta col suo id)
  const placeLabel = usePlaceLabel();

  const { customFields } = useCustomFields();
  const { layout, getVisibleFields } = useLayout();

  // Valori dei campi personalizzati nel modulo (i numeri salvati scritti con la virgola, il resto com'è) e quelli di
  // partenza: un campo che non si tocca resta com'era, valore e copia del campo (VAL: nessuna riscrittura dei prodotti)
  const [initialValues] = useState<Record<string, any>>(() =>
    (product.customData || []).reduce((acc: Record<string, any>, entry) => {
      if (entry.fieldSnapshot?.id) acc[entry.fieldSnapshot.id] = formValue(entry.fieldSnapshot, entry.value);
      return acc;
    }, {})
  );
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(initialValues);
  // Campi segnati dall'ultimo salvataggio rifiutato (riga rossa sotto il campo)
  const [flagged, setFlagged] = useState<FlaggedFields>(NO_FLAGS);

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    furType: product?.furType || '',
    location: product?.location || '',
    purchasePrice: formatNumberInput(product?.purchasePrice),
    sellPrice: formatNumberInput(product?.sellPrice),
    length: formatNumberInput(product?.length),
    width: formatNumberInput(product?.width),
    weight: formatNumberInput(product?.weight),
    height: formatNumberInput(product?.height), // S2
    technicalNotes: product?.technicalNotes || '',
    libraryId: product?.libraryId || '',
    minStock: formatNumberInput(product?.minStock),
  });

  // Scaffale (S1a): solo per i pezzi unici, tra quelli della posizione e della categoria scelte (più quello di adesso)
  const { shelves, loading: shelvesLoading } = useShelves();
  const [shelfId, setShelfId] = useState(product.shelfId ?? '');
  const shelfChoices = stocked ? [] : shelvesFor(shelves, libraries, { location: formData.location, libraryId: formData.libraryId || undefined }, product.shelfId);
  const chosenShelf = shelfChoices.some((s) => s.id === shelfId) ? shelfId : '';
  // Uno scaffale che questo dispositivo non conosce (o l'elenco non ancora letto) non si tocca da qui: decide il contesto
  const shelfKnown = !shelvesLoading && (!product.shelfId || shelves.some((s) => s.id === product.shelfId));

  // Foto con i loro percorsi cloud, se ci sono: ordine ed eliminazioni li spostano insieme (GAL, CSV-G6)
  const [photos, setPhotos] = useState<Photos>({
    images: product.images || [],
    ...(product.storageImagePaths && { storageImagePaths: product.storageImagePaths }),
  });
  const images = photos.images;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.max(1, screenWidth - 32);
  // Riquadri delle scelte: tre per riga, 10 px tra l'uno e l'altro, come in Aggiungi
  const tileWidth = Math.floor((imageWidth - 20) / 3);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso Negato', 'Abilita accesso alla galleria nelle impostazioni');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - images.length,
    });

    if (!result.canceled) {
      const newImages = result.assets.map((asset) => asset.uri);
      setPhotos((prev) => addPhotos(prev, newImages));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso Negato', 'Abilita accesso alla fotocamera nelle impostazioni');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotos((prev) => addPhotos(prev, [result.assets[0].uri]));
    }
  };

  // `withoutPhoto === true` solo dalla conferma qui sotto (onPress passa l'evento, che non è `true`)
  const handleSave = (withoutPhoto?: unknown) => {
    // C1: il tipo di pelle è facoltativo
    if (!formData.sku || !formData.location) {
      Alert.alert('Campi Obbligatori', 'Compila almeno SKU e Posizione');
      return;
    }

    // Scorta minima (M06): solo per gli articoli a quantità; scritta ma non valida → si dice
    const minStock = stocked ? parseMinStock(formData.minStock) : undefined;
    if (minStock === null) {
      Alert.alert('Scorta minima non valida', 'Scrivi un numero maggiore o uguale a zero, per esempio 5 o 2,5. Vuota = nessun avviso.');
      return;
    }

    // Un campo nel cestino non è più tra i campi attivi: il suo valore resta con la sua scheda di prima (P02).
    // Un campo non toccato resta com'era (valore e copia); uno toccato si salva nella forma di VAL (id, numero)
    const previous = new Map((product.customData || []).map((entry) => [entry.fieldSnapshot?.id, entry]));
    const untouched = (fieldId: string) => previous.has(fieldId) && JSON.stringify(customFieldValues[fieldId]) === JSON.stringify(initialValues[fieldId]);

    // VAL (CAM-F4): gli obbligatori come in Aggiungi, sui campi personalizzati che il modulo mostra
    const missing = missingRequiredFields(getVisibleFields(), customFields, customFieldValues);
    if (missing.length > 0) {
      setFlagged({ missing: missing.map((f) => f.id), wrong: [] });
      Alert.alert('Campi obbligatori', `Compila anche: ${missing.map((f) => f.name).join(', ')}`);
      return;
    }
    // VAL (CAM-F2): i numeri si salvano come numero; un testo che non è un numero si dice. Solo nei campi toccati: un
    // valore scritto prima di VAL che non è un numero resta com'era e non blocca il salvataggio
    const wrong = invalidNumberFields(customFields, customFieldValues).filter((f) => !untouched(f.id));
    if (wrong.length > 0) {
      setFlagged({ missing: [], wrong: wrong.map((f) => f.id) });
      Alert.alert('Numero non valido', `Scrivi un numero in: ${wrong.map((f) => f.name).join(', ')} (per esempio 12,5).`);
      return;
    }
    setFlagged(NO_FLAGS);

    // Foto facoltativa come in Aggiungi: un prodotto senza foto si deve poter modificare (D18)
    if (images.length === 0 && withoutPhoto !== true) {
      Alert.alert('Attenzione', 'Il prodotto non ha foto', [
        { text: 'Salva Senza Foto', onPress: () => handleSave(true) },
        { text: 'Aggiungi Foto', style: 'cancel' },
      ]);
      return;
    }

    // Link GS1 (COD, NG02 e NG27, vincolo 5 di map-3): la Modifica non lo crea e non lo riscrive mai, nemmeno con un
    // lotto o uno SKU nuovi; etichette e tag già fatti restano validi e il lettore unico (`utils/codes.ts`) li riconosce.
    // Il link non è tra i campi salvati qui: resta quello che c'è.

    updateProduct(id as string, {
      sku: formData.sku.trim(),
      furType: formData.furType,
      // Articolo a quantità: la posizione cambia solo con i movimenti (M03; il contesto la ignora comunque).
      // Pezzo unico: lo scaffale scelto, che il contesto tiene solo se è in quella posizione (S1a)
      ...(stocked ? { minStock } : { location: formData.location, ...(shelfKnown && { shelfId: chosenShelf || undefined }) }),
      ...photosPatch(product, photos),
      purchasePrice: parseNumber(formData.purchasePrice),
      sellPrice: parseNumber(formData.sellPrice),
      length: parseNumber(formData.length),
      width: parseNumber(formData.width),
      weight: parseNumber(formData.weight),
      height: parseNumber(formData.height), // S2 (ticket 14)
      technicalNotes: formData.technicalNotes || undefined,
      libraryId: formData.libraryId || undefined,
      customData: Object.keys(customFieldValues)
        .map(fieldId => {
          if (untouched(fieldId)) return previous.get(fieldId);
          const field = customFields.find(f => f.id === fieldId) ?? previous.get(fieldId)?.fieldSnapshot;
          if (!field) return null;
          const saved = savedValue(field, customFieldValues[fieldId]);
          return saved.ok && saved.value !== undefined ? { value: saved.value, fieldSnapshot: field } : null;
        }).filter(Boolean) as any,
    });

    Alert.alert(
      'Modifiche Salvate',
      `${formData.sku} è stato aggiornato`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  // Titolo di sezione scritto nel codice: iniziale maiuscola, filetto solo se lo stile lo prevede
  const renderSection = (title: React.ReactNode) => (
    <View style={[styles.section, styles.sectionBlock]}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  // Etichetta del campo, al massimo due righe
  const renderLabel = (label: string, required?: boolean) => (
    <Text style={styles.label} numberOfLines={2}>
      {label}{required && <Text style={styles.required}> *</Text>}
    </Text>
  );

  // Campo a una riga senza icona (campi di base); `small` per i tre campi delle misure
  const renderInput = (props: { placeholder: string; value: string; onChangeText: (v: string) => void; numeric?: boolean; small?: boolean }) => (
    <View style={[styles.inputBox, props.small && styles.inputBoxSmall]}>
      <TextInput
        style={styles.inputText}
        placeholder={props.placeholder}
        placeholderTextColor={t.colors.placeholder}
        keyboardType={props.numeric ? 'numeric' : 'default'}
        value={props.value}
        onChangeText={props.onChangeText}
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.screenPadding,
            paddingBottom: insets.bottom + 96,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Modifica prodotto</Text>
            <AppIcon name="edit" size={26} color={t.colors.accentInk} />
          </View>

          {/* Images Section - Main Preview */}
          {renderSection(<>Foto prodotto <Text style={styles.labelMuted}>{images.length}/10</Text></>)}

          {/* Galleria (GAL): la miniatura porta alla foto; sotto la foto i comandi per quella scelta (Sposta, principale,
              Elimina con conferma), al posto del cestino su ogni foto che cancellava quella che si vedeva (CSV-G1) */}
          <View style={styles.inputGroup}>
            <PhotoGallery
              variant="modulo"
              images={images}
              index={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
              width={imageWidth}
              height={280}
              edit={{ paths: photos.storageImagePaths, onChange: (next, index) => { setPhotos(next); setCurrentImageIndex(index); } }}
              thumbnails
              thumbnailsExtra={images.length < 10 && (
                <>
                  <Pressable style={styles.photoAdd} onPress={pickImages}>
                    <AppIcon name="add-photo-alternate" size={26} color={t.colors.accentInk} />
                    <Text style={styles.photoAddText}>Galleria</Text>
                  </Pressable>
                  <Pressable style={styles.photoAdd} onPress={takePhoto}>
                    <AppIcon name="camera-alt" size={26} color={t.colors.accentInk} />
                    <Text style={styles.photoAddText}>Fotocamera</Text>
                  </Pressable>
                </>
              )}
            />
          </View>

          {/* Form Sections */}
          {renderSection(<>Informazioni base <Text style={styles.required}>*</Text></>)}

          <View style={styles.inputGroup}>
            {renderLabel('SKU / Codice Prodotto')}
            {renderInput({
              placeholder: 'es: VIS-001-2024',
              value: formData.sku,
              onChangeText: (value) => updateField('sku', value),
            })}
          </View>

          <View style={styles.inputGroup}>
            {renderLabel('Tipo di pelle')}
            {/* Tipo di pelle (M01, C1): facoltativo, «Nessuno» lo toglie; a capo come Posizione e Categoria (D09) */}
            <View style={styles.chipWrap}>
              <Pressable
                style={[styles.chip, !formData.furType && styles.chipActive]}
                onPress={() => updateField('furType', '')}
              >
                {!formData.furType && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                <Text style={[styles.chipText, !formData.furType && styles.chipTextActive]}>Nessuno</Text>
              </Pressable>
              {furTypes.map((type) => {
                const active = formData.furType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateField('furType', type.id)}
                  >
                    {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* D09: pillole di Posizione e Categoria a capo, come in Aggiungi */}
          {stocked ? (
            // Articolo a quantità (M03): posizione e giacenza in sola lettura
            <View style={styles.inputGroup}>
              {renderLabel('Posizione e giacenza')}
              <View style={[styles.area, styles.readonlyBox]}>
                <Text style={styles.readonlyText}>
                  {placeLabel(product.location)} (principale) · totale {formatQty(totalStock(product), product.unit)}
                </Text>
                {Object.entries(stockOf(product)).sort((a, b) => b[1] - a[1]).map(([place, qty]) => (
                  <Text key={place} style={styles.readonlyText}>{placeLabel(place)}: {formatQty(qty, product.unit)}</Text>
                ))}
                <Text style={styles.readonlyNote}>
                  Posizione e quantità cambiano solo con i movimenti: usa «Movimenta» nella Scheda.
                </Text>
              </View>
              <View style={styles.minStockGroup}>
                {renderLabel(`Scorta minima (${product.unit || DEFAULT_UNIT})`)}
                {renderInput({ placeholder: 'Vuota = nessun avviso', value: formData.minStock, onChangeText: (v) => updateField('minStock', v), numeric: true })}
              </View>
            </View>
          ) : (
          <View style={styles.inputGroup}>
            {renderLabel('Posizione')}
            <View style={styles.chipWrap}>
              {locations.map((location) => {
                const active = formData.location === location.id;
                return (
                  <Pressable
                    key={location.id}
                    style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                    onPress={() => updateField('location', location.id)}
                  >
                    {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <View style={[styles.chipDot, active && styles.chipDotActive, { backgroundColor: location.color }]} />
                    <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={1}>
                      {location.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          )}

          {shelfChoices.length > 0 && (
            <View style={styles.inputGroup}>
              {renderLabel('Scaffale (facoltativo)')}
              <ShelfPicker shelves={shelfChoices} categories={libraries} value={chosenShelf} onChange={setShelfId} />
            </View>
          )}

          <View style={styles.inputGroup}>
            {renderLabel('Categoria')}
            {/* C1: categoria e, se ne ha, sottocategoria (la cartella di prima); «Nessuna» la toglie */}
            <CategoryPicker categories={libraries} value={formData.libraryId} onChange={(id) => updateField('libraryId', id)} showNone />
          </View>

          {renderSection('Prezzi')}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              {renderLabel('Prezzo Acquisto (€)')}
              {renderInput({
                placeholder: '2500',
                value: formData.purchasePrice,
                onChangeText: (value) => updateField('purchasePrice', value),
                numeric: true,
              })}
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              {renderLabel('Prezzo Vendita (€)')}
              {renderInput({
                placeholder: '4200',
                value: formData.sellPrice,
                onChangeText: (value) => updateField('sellPrice', value),
                numeric: true,
              })}
            </View>
          </View>

          {renderSection('Misure')}

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              {renderLabel('Lunghezza (cm)')}
              {renderInput({
                placeholder: '85',
                value: formData.length,
                onChangeText: (value) => updateField('length', value),
                numeric: true,
                small: true,
              })}
            </View>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              {renderLabel('Larghezza (cm)')}
              {renderInput({
                placeholder: '120',
                value: formData.width,
                onChangeText: (value) => updateField('width', value),
                numeric: true,
                small: true,
              })}
            </View>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              {renderLabel('Peso (kg)')}
              {renderInput({
                placeholder: '1,2',
                value: formData.weight,
                onChangeText: (value) => updateField('weight', value),
                numeric: true,
                small: true,
              })}
            </View>
          </View>

          {/* S2 (ticket 14): altezza del prodotto per gli scaffali, in una riga a sé sotto le misure */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              {renderLabel('Altezza (cm)')}
              {renderInput({
                placeholder: '40',
                value: formData.height,
                onChangeText: (value) => updateField('height', value),
                numeric: true,
                small: true,
              })}
            </View>
          </View>

          {renderSection('Note tecniche')}

          <View style={[styles.area, styles.inputGroup]}>
            <TextInput
              style={styles.areaText}
              placeholder="Inserisci dettagli tecnici, tipo di cucitura, caratteristiche speciali..."
              placeholderTextColor={t.colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.technicalNotes}
              onChangeText={(value) => updateField('technicalNotes', value)}
            />
          </View>

          {/* Campi personalizzati: quelli del modulo Aggiungi più quelli che il prodotto ha già (D03), prima le scelte.
              Un disegnatore solo per Aggiungi e Modifica (VAL, `components/FieldInput.tsx`), contatore compreso (CAM-F5) */}
          {(() => {
            const entries = new Map((product.customData || []).map((d) => [d.fieldSnapshot?.id, d]));
            const existingFields = editableFields(customFields, layout.fields, [...entries.keys()].filter(Boolean) as string[]);
            if (existingFields.length === 0) return null;
            const isChoice = (f: { type: string }) => f.type === 'single_choice' || f.type === 'multi_choice';
            const render = (field: typeof existingFields[number]) => (
              <FieldInput
                key={field.id}
                field={field}
                value={customFieldValues[field.id]}
                onChange={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                snapshot={entries.get(field.id)?.fieldSnapshot}
                icon={fieldIcon(field, layout.fields.find(lf => lf.id === field.id)?.icon)}
                tileWidth={tileWidth}
                style={styles.inputGroup}
                error={fieldError(field, customFieldValues[field.id], flagged)}
              />
            );
            return (
              <>
                {renderSection('Campi personalizzati')}
                {existingFields.filter(isChoice).map(render)}
                {existingFields.filter((f) => !isChoice(f)).map(render)}
              </>
            );
          })()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
          <Glass />
          <Pressable style={[styles.secondaryButton, styles.actionButtonSecondary]} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Annulla</Text>
          </Pressable>
          <Pressable style={[styles.primaryButton, styles.actionButtonPrimary]} onPress={handleSave}>
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <AppIcon name="save" size={20} color={t.colors.onButton} />
            <Text style={styles.primaryButtonText}>Salva Modifiche</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  // Sezioni fisse: 24 px sopra il titolo (16 del campo precedente + 8), 16 sotto
  sectionBlock: {
    marginTop: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  // Posizione e giacenza di un articolo a quantità: riquadro del modulo, solo testo (M03)
  readonlyBox: {
    minHeight: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 4,
  },
  readonlyText: {
    fontSize: 15,
    lineHeight: 20,
    color: t.colors.textPrimary,
  },
  readonlyNote: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  minStockGroup: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  // Barra fissa Annulla / Salva (regola 9): vetro, filetto in alto
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
  },
  actionButtonPrimary: {
    flex: 2,
    paddingVertical: 14,
  },
}));
