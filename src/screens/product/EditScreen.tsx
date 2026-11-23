// FurInventory Pro - Edit Product Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, useWindowDimensions, Modal, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import * as ImagePicker from '../../lib/imagePicker';
import * as DocumentPicker from '../../lib/documentPicker';
import { Image } from '../../lib/ExpoImage';
import BarcodeScanner from '../../../components/BarcodeScanner';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from '../../lib/sharing';
import { useInventory } from '../../../contexts/InventoryContext';
import { formatNumberInput, parseNumber } from '../../../utils/number';
import { DEFAULT_UNIT, formatQty, isStocked, stockOf, totalStock } from '../../../utils/stock';
import { parseMinStock } from '../../../utils/alerts';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { categoryPath, categoryTree } from '../../../utils/categories';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { editableFields } from '../../../utils/layoutOrder';
import type { Product } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Glass } from '../../../components/ui/Glass';
import { GradientFill } from '../../../components/ui/GradientFill';
import { Text, TextInput } from '../../../components/ui/Text';
import { choiceList, formStyles, isChoiceSelected, toggleChoice } from '../../../components/ui/formStyles';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { useShelves } from '../../../contexts/ShelvesContext';
import { shelvesFor } from '../../../utils/shelves';
import { ShelfPicker } from '../../../components/ShelfPicker';
import { PhotoGallery } from '../../../components/PhotoGallery';
import { addPhotos, photosPatch, type Photos } from '../../../utils/photos';

// Il modulo nasce solo quando il prodotto c'è. Aperta dall'indirizzo o ricaricata, la schermata partiva prima
// che i prodotti fossero letti e il modulo restava vuoto: salvando si sovrascriveva il prodotto (P04).
export default function EditProductScreen() {
  const styles = useStyles();
  const { id } = useLocalSearchParams();
  const { getProductById } = useInventory();
  const product = getProductById(id as string);

  if (!product) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prodotto non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }
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
  const placeLabel = (place: string) => locations.find((l) => l.id === place)?.label ?? place;

  const { customFields } = useCustomFields();
  const { layout } = useLayout();
  const { products } = useInventory();

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(
    product?.customData?.reduce((acc: Record<string, any>, current) => {
      if (current.fieldSnapshot?.id) {
        acc[current.fieldSnapshot.id] = current.value;
      }
      return acc;
    }, {}) || {}
  );
  const [showDatePickerMap, setShowDatePickerMap] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    sku: product?.sku || '',
    furType: product?.furType || '',
    location: product?.location || '',
    purchasePrice: formatNumberInput(product?.purchasePrice),
    sellPrice: formatNumberInput(product?.sellPrice),
    length: formatNumberInput(product?.length),
    width: formatNumberInput(product?.width),
    weight: formatNumberInput(product?.weight),
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

  const [selectModalConfig, setSelectModalConfig] = useState<{ fieldId: string; name: string; options: any[]; isMulti: boolean } | null>(null);
  const [scanFieldId, setScanFieldId] = useState<string | null>(null); // campo che riceve il codice letto

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

    // Un campo nel cestino non è più tra i campi attivi: il suo valore resta con la sua scheda di prima (P02)
    const previous = new Map((product.customData || []).map((entry) => [entry.fieldSnapshot?.id, entry.fieldSnapshot]));

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
      technicalNotes: formData.technicalNotes || undefined,
      libraryId: formData.libraryId || undefined,
      customData: Object.keys(customFieldValues)
        .map(fieldId => {
          const field = customFields.find(f => f.id === fieldId) ?? previous.get(fieldId);
          return field ? { value: customFieldValues[fieldId], fieldSnapshot: field } : null;
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

          {/* Campi personalizzati: quelli del modulo Aggiungi più quelli che il prodotto ha già (D03) */}
          {(() => {
            const productFieldIds = (product.customData || []).map(d => d.fieldSnapshot?.id).filter(Boolean) as string[];
            const existingFields = editableFields(customFields, layout.fields, productFieldIds);

            if (existingFields.length === 0) return null;

            const getDynamicOptionsList = (cf: any) => {
              if (cf.linkTo === 'locations') return locations.map((l: any) => ({ id: l.id, label: l.label }));
              if (cf.linkTo === 'libraries') return categoryTree(libraries).map(({ category: l }) => ({ id: l.id, label: categoryPath(libraries, l.id) }));
              if (cf.linkTo === 'furType') return furTypes.map((c) => ({ id: c.id, label: c.label }));

              return cf.dataset && Array.isArray(cf.dataset)
                ? cf.dataset.map((val: string, i: number) => ({ id: `ds_${i}`, label: String(val) }))
                : cf.options || [];
            };

            // Icon priority: Layout Override > Custom Field Definition > Type Default
            const getIcon = (field: any): string => {
              const layoutField = layout.fields.find(lf => lf.id === field.id);
              if (layoutField?.icon) return layoutField.icon;

              if (field.icon) return field.icon;

              switch (field.type) {
                case 'number': return 'tag';
                case 'currency': return 'euro';
                case 'text_long': return 'notes';
                default: return 'short-text';
              }
            };

            return (
              <>
                {renderSection('Campi personalizzati')}

                {/* Quick Settings Grid for Choice Fields */}
                {existingFields.filter(f => f.type === 'single_choice' || f.type === 'multi_choice').map((field) => {
                  const isMulti = field.type === 'multi_choice';

                  if (field.uiType === 'picker' || field.uiType === 'modal_list') {
                    const optionsList = getDynamicOptionsList(field);
                    const val = customFieldValues[field.id];
                    const count = choiceList(val).length;
                    const hasValue = isMulti ? count > 0 : !!val;
                    const displayValue = isMulti
                      ? (count ? `${count} selezionati` : 'Seleziona...')
                      : (val || 'Seleziona...');

                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <Pressable
                          style={styles.inputBox}
                          onPress={() => setSelectModalConfig({ fieldId: field.id, name: field.name, options: optionsList, isMulti })}
                        >
                          <AppIcon name={getIcon(field)} size={18} color={t.colors.fieldIcon} />
                          <Text style={[styles.valueText, !hasValue && styles.valuePlaceholder]} numberOfLines={1}>
                            {displayValue}
                          </Text>
                          <AppIcon name="keyboard-arrow-down" size={20} color={t.colors.textMuted} />
                        </Pressable>
                      </View>
                    );
                  }

                  return (
                    <View key={field.id} style={styles.inputGroup}>
                      {renderLabel(field.name, field.required)}
                      <View style={styles.tileGrid}>
                        {getDynamicOptionsList(field).map((option: any) => {
                          const isSelected = isChoiceSelected(customFieldValues[field.id], option, isMulti);
                          const icon = isMulti
                            ? (isSelected ? 'check-box' : 'check-box-outline-blank')
                            : (isSelected ? 'check-circle' : 'radio-button-unchecked');

                          return (
                            <Pressable
                              key={option.id}
                              style={[styles.tile, { width: tileWidth }, isSelected && styles.tileSelected]}
                              onPress={() => setCustomFieldValues(prev => ({ ...prev, [field.id]: toggleChoice(prev[field.id], option, isMulti) }))}
                            >
                              <AppIcon name={icon} size={22} color={isSelected ? t.colors.checkOn : t.colors.checkRing} />
                              <Text style={[styles.tileText, isSelected && styles.tileTextSelected]} numberOfLines={2}>
                                {option.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {/* Input Fields for Text/Number/Document Types */}
                {existingFields.filter(f => !['single_choice', 'multi_choice'].includes(f.type)).map((field) => {
                  if (field.type === 'document' || field.uiType === 'document') {
                    const docs = customFieldValues[field.id] || [];
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <View style={styles.docList}>
                          {docs.map((docUri: string, index: number) => (
                            <Pressable key={index} style={styles.docRow} onPress={() => (/^https?:\/\//i.test(docUri) ? Linking.openURL(docUri) : Sharing.shareAsync(docUri)).catch(console.error)}>
                              <AppIcon name="insert-drive-file" size={20} color={t.colors.accentInk} />
                              <Text style={styles.docName} numberOfLines={1}>{docUri.split('/').pop() || 'Documento'}</Text>
                              <Pressable style={styles.docRemove} onPress={() => {
                                const newDocs = [...docs];
                                newDocs.splice(index, 1);
                                setCustomFieldValues(prev => ({ ...prev, [field.id]: newDocs }));
                              }}>
                                <AppIcon name="delete" size={20} color={t.colors.error} />
                              </Pressable>
                            </Pressable>
                          ))}
                          <Pressable
                            style={styles.docAdd}
                            onPress={async () => {
                              try {
                                const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
                                if (!result.canceled && result.assets && result.assets.length > 0) {
                                  setCustomFieldValues(prev => ({ ...prev, [field.id]: [...(customFieldValues[field.id] || []), result.assets[0].uri] }));
                                }
                              } catch (e) { console.error('Doc Picker err', e); }
                            }}
                          >
                            <AppIcon name="upload-file" size={20} color={t.colors.accentInk} />
                            <Text style={styles.docAddText}>Allega Documento</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  if (field.type === 'images') {
                    const customImages = customFieldValues[field.id] || [];
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                          {customImages.map((uri: string, index: number) => (
                            <View key={index}>
                              <Image source={{ uri }} style={styles.smallPhoto} contentFit="cover" />
                              <Pressable
                                style={styles.smallPhotoRemove}
                                onPress={() => {
                                  const newImages = [...customImages];
                                  newImages.splice(index, 1);
                                  setCustomFieldValues(prev => ({ ...prev, [field.id]: newImages }));
                                }}
                              >
                                <AppIcon name="close" size={16} color={t.colors.onData} />
                              </Pressable>
                            </View>
                          ))}
                          {customImages.length < 10 && (
                            <Pressable
                              style={styles.smallPhotoAdd}
                              onPress={async () => {
                                const result = await ImagePicker.launchImageLibraryAsync({
                                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                  allowsMultipleSelection: true,
                                  quality: 0.8,
                                });
                                if (!result.canceled) {
                                  const newUris = result.assets.map(a => a.uri);
                                  setCustomFieldValues(prev => ({ ...prev, [field.id]: [...(prev[field.id] || []), ...newUris].slice(0, 10) }));
                                }
                              }}
                            >
                              <AppIcon name="add-photo-alternate" size={26} color={t.colors.accentInk} />
                            </Pressable>
                          )}
                        </ScrollView>
                      </View>
                    );
                  }

                  if (field.type === 'date') {
                    const val = customFieldValues[field.id];
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <Pressable
                          style={styles.inputBox}
                          onPress={() => setShowDatePickerMap(prev => ({ ...prev, [field.id]: true }))}
                        >
                          <Text style={[styles.valueText, !val && styles.valuePlaceholder]} numberOfLines={1}>
                            {val ? new Date(val).toLocaleDateString('it-IT') : `Seleziona Data`}
                          </Text>
                          <AppIcon name="calendar-today" size={18} color={t.colors.info} />
                        </Pressable>
                        {showDatePickerMap[field.id] && (
                          <DateTimePicker
                            value={val ? new Date(val) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(_, selectedDate) => {
                              setShowDatePickerMap(prev => ({ ...prev, [field.id]: false }));
                              if (selectedDate) setCustomFieldValues(prev => ({ ...prev, [field.id]: selectedDate.toISOString() }));
                            }}
                          />
                        )}
                      </View>
                    );
                  }

                  if (field.type === 'text_short' && field.isBarcode) {
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <View style={styles.inputRow}>
                          <View style={[styles.inputBox, styles.inputFill]}>
                            <AppIcon name={getIcon(field)} size={18} color={t.colors.fieldIcon} />
                            <TextInput
                              style={styles.inputText}
                              placeholder="Scansiona o scrivi il codice"
                              placeholderTextColor={t.colors.placeholder}
                              value={customFieldValues[field.id]?.toString() || ''}
                              onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                            />
                          </View>
                          <Pressable
                            style={styles.sideButton}
                            onPress={() => setScanFieldId(field.id)} // lettore vero (D02: prima un codice finto)
                          >
                            <AppIcon name="qr-code-scanner" size={22} color={t.colors.accentInk} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  if (field.type === 'text_long') {
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        {renderLabel(field.name, field.required)}
                        <View style={styles.area}>
                          <AppIcon name={getIcon(field)} size={18} color={t.colors.fieldIcon} style={styles.areaIcon} />
                          <TextInput
                            style={styles.areaText}
                            placeholder={`Inserisci ${field.name.toLowerCase()}...`}
                            placeholderTextColor={t.colors.placeholder}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            value={customFieldValues[field.id] || ''}
                            onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                          />
                        </View>
                      </View>
                    );
                  }

                  const isNumeric = field.type === 'number' || field.type === 'currency';
                  const unit = field.unit || (field.type === 'currency' ? '€' : undefined);
                  return (
                    <View key={field.id} style={styles.inputGroup}>
                      {renderLabel(field.name, field.required)}
                      <View style={styles.inputBox}>
                        <AppIcon name={getIcon(field)} size={18} color={t.colors.fieldIcon} />
                        <TextInput
                          style={styles.inputText}
                          placeholder={isNumeric ? '0' : 'Inserisci...'}
                          placeholderTextColor={t.colors.placeholder}
                          keyboardType={isNumeric ? 'numeric' : 'default'}
                          value={customFieldValues[field.id]?.toString() || ''}
                          onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                        />
                        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
                      </View>
                    </View>
                  );
                })}
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

      {/* Lettore del codice per i campi con scanner: il codice letto va nel campo */}
      {scanFieldId && (
        <Modal visible={true} animationType="slide" onRequestClose={() => setScanFieldId(null)}>
          <BarcodeScanner
            onScan={({ data }) => { setCustomFieldValues(prev => ({ ...prev, [scanFieldId]: data })); setScanFieldId(null); }}
            onClose={() => setScanFieldId(null)}
          />
        </Modal>
      )}

      {/* Select Modal */}
      {selectModalConfig && (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setSelectModalConfig(null)}>
          <View style={styles.sheetScrim}>
            <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{selectModalConfig.name}</Text>
                <Pressable onPress={() => setSelectModalConfig(null)}>
                  <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectModalConfig.options.map(opt => {
                  const isSelected = isChoiceSelected(customFieldValues[selectModalConfig.fieldId], opt, selectModalConfig.isMulti);

                  return (
                    <Pressable
                      key={opt.id}
                      style={styles.sheetRow}
                      onPress={() => {
                        setCustomFieldValues(prev => ({ ...prev, [selectModalConfig.fieldId]: toggleChoice(prev[selectModalConfig.fieldId], opt, selectModalConfig.isMulti) }));
                        if (!selectModalConfig.isMulti) setSelectModalConfig(null);
                      }}
                    >
                      <Text style={[styles.sheetRowText, isSelected && styles.sheetRowTextSelected]}>
                        {opt.label}
                      </Text>
                      {isSelected && <AppIcon name="check" size={24} color={t.colors.accentInk} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
              {selectModalConfig.isMulti && (
                <Pressable style={[styles.primaryButton, styles.sheetConfirm]} onPress={() => setSelectModalConfig(null)}>
                  <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                  <Text style={styles.primaryButtonText}>Conferma Selezione</Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>
      )}
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...t.typography.cardTitle,
    fontSize: 18,
  },
}));
