// FurInventory Pro - Add Product Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, useWindowDimensions, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import * as ImagePicker from '../../lib/imagePicker';
import * as DocumentPicker from '../../lib/documentPicker';
import { ActionSheetIOS } from 'react-native';
import { Image } from '../../lib/ExpoImage';
import BarcodeScanner from '../../../components/BarcodeScanner';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from '../../lib/sharing';
import { useInventory } from '../../../contexts/InventoryContext';
import { parseNumber } from '../../../utils/number';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { categoryPath, categoryTree } from '../../../utils/categories';
import { useCustomFields, CustomField } from '../../../contexts/CustomFieldsContext';
import { missingRequiredFields } from '../../../utils/formValidation';
import { useLayout, LayoutField, sectionLabel } from '../../../contexts/LayoutContext';
import { useGS1Config } from '../../../contexts/GS1ConfigContext';
import { generateGS1DigitalLink } from '../../../utils/gs1';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { Text, TextInput } from '../../../components/ui/Text';
import { choiceList, formStyles, isChoiceSelected, toggleChoice } from '../../../components/ui/formStyles';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { DEFAULT_UNIT, parseQty, UNITS } from '../../../utils/stock';
import { parseMinStock } from '../../../utils/alerts';
import { useShelves } from '../../../contexts/ShelvesContext';
import { shelvesFor } from '../../../utils/shelves';
import { ShelfPicker } from '../../../components/ShelfPicker';

export default function AddProductScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addProduct, products, libraries } = useInventory();
  const { locations } = useLocations();
  const { furTypes } = useFurTypes();
  const { customFields } = useCustomFields();
  const { layout, getVisibleFields } = useLayout();
  const { gs1Config } = useGS1Config();

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [showDatePickerMap, setShowDatePickerMap] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    sku: '',
    furType: '',
    location: '',
    purchasePrice: '',
    sellPrice: '',
    length: '',
    width: '',
    weight: '',
    technicalNotes: '',
    libraryId: '',
  });

  // Magazzino (M03): quantità facoltativa (vuota = pezzo unico) e unità. Fuori dal layout del modulo.
  const [qtyText, setQtyText] = useState('');
  const [unit, setUnit] = useState<string>(DEFAULT_UNIT);
  // Scorta minima (M06): solo per gli articoli a quantità, compare quando c'è una quantità
  const [minText, setMinText] = useState('');
  // Scaffale (S1a): solo per i pezzi unici (quantità vuota), tra quelli della posizione e della categoria scelte
  const { shelves } = useShelves();
  const [shelfId, setShelfId] = useState('');
  const shelfChoices = shelvesFor(shelves, libraries, { location: formData.location, libraryId: formData.libraryId || undefined });
  const chosenShelf = !qtyText.trim() && shelfChoices.some((s) => s.id === shelfId) ? shelfId : '';

  const [images, setImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.max(1, screenWidth - insets.left - insets.right - t.spacing.screenPadding * 2);
  // Riquadri delle scelte: tre per riga, 10 px tra l'uno e l'altro (le scelte a riquadri sono sempre a larghezza intera)
  const tileWidth = Math.floor((imageWidth - 20) / 3);

  // Auto-generate SKU if empty — logistica universale
  const generateSKU = (): string => {
    const year = new Date().getFullYear();
    const prefix = `LOG-${year}-`;
    const existingSKUs = products
      .map((p) => p.sku)
      .filter((sku) => sku.startsWith(prefix));

    let nextNumber = 1;
    if (existingSKUs.length > 0) {
      const numbers = existingSKUs.map((sku) => {
        const match = sku.match(/LOG-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }

    return `LOG-${year}-${String(nextNumber).padStart(3, '0')}`;
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const showImageSourcePicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annulla', 'Galleria Foto', 'Scatta Foto', 'Sfoglia File'],
          cancelButtonIndex: 0,
          title: 'Seleziona Origine Immagine',
          message: 'Scegli da dove importare le immagini',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImages();
          else if (buttonIndex === 2) takePhoto();
          else if (buttonIndex === 3) pickFromFiles();
        }
      );
    } else {
      // Android - use Alert as ActionSheet
      Alert.alert(
        'Seleziona Origine Immagine',
        'Scegli da dove importare le immagini',
        [
          { text: 'Galleria Foto', onPress: pickImages },
          { text: 'Scatta Foto', onPress: takePhoto },
          { text: 'Sfoglia File', onPress: pickFromFiles },
          { text: 'Annulla', style: 'cancel' },
        ]
      );
    }
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
      setImages((prev) => [...prev, ...newImages].slice(0, 10));
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newImages].slice(0, 10));
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Errore', 'Impossibile selezionare i file');
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
      setImages((prev) => [...prev, result.assets[0].uri].slice(0, 10));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectModalConfig, setSelectModalConfig] = useState<{ fieldId: string; name: string; options: any[]; isMulti: boolean } | null>(null);
  const [scanFieldId, setScanFieldId] = useState<string | null>(null); // campo che riceve il codice letto

  const handleSubmit = () => {
    if (isSubmitting) return;

    // D23: lo SKU vuoto si genera da solo al salvataggio (come dicono il suggerimento e la nota)
    // C1: il tipo di pelle è facoltativo (un prodotto che non è una pelliccia non ne ha uno)
    if (!formData.location) {
      Alert.alert('Campi obbligatori', 'Compila almeno la Posizione');
      return;
    }

    // Quantità scritta ma non valida: si dice, non si crea un pezzo unico al suo posto (M03)
    if (qtyText.trim() && parseQty(qtyText) === undefined) {
      Alert.alert('Quantità non valida', 'Scrivi un numero maggiore o uguale a zero, per esempio 12 o 2,5. Vuota = pezzo unico.');
      return;
    }
    if (qtyText.trim() && parseMinStock(minText) === null) {
      Alert.alert('Scorta minima non valida', 'Scrivi un numero maggiore o uguale a zero, per esempio 5 o 2,5. Vuota = nessun avviso.');
      return;
    }

    // D24: anche i campi personalizzati segnati come obbligatori
    const missing = missingRequiredFields(getVisibleFields(), customFields, customFieldValues);
    if (missing.length > 0) {
      Alert.alert('Campi obbligatori', `Compila anche: ${missing.map((f) => f.name).join(', ')}`);
      return;
    }

    if (images.length === 0) {
      Alert.alert('Attenzione', 'Aggiungi almeno una foto del prodotto', [
        { text: 'Continua Senza Foto', onPress: () => submitProduct() },
        { text: 'Aggiungi Foto', style: 'cancel' },
      ]);
      return;
    }

    submitProduct();
  };

  const submitProduct = async () => {
    setIsSubmitting(true);
    try {
      const finalSKU = formData.sku.trim() || generateSKU();

      // GS1 Digital Link generation
      let gs1DigitalLink: string | undefined;
      if (gs1Config.baseUrl) {
        const lottoValue = gs1Config.enableLotto && gs1Config.lottoFieldId
          ? customFieldValues[gs1Config.lottoFieldId]?.toString()
          : undefined;
        gs1DigitalLink = generateGS1DigitalLink(
          gs1Config,
          finalSKU,
          products.length,
          lottoValue,
        );
      }

      const qty = qtyText.trim() ? parseQty(qtyText) : undefined;
      const minStock = qty != null ? parseMinStock(minText) : undefined;
      const added = addProduct({
        sku: finalSKU,
        furType: formData.furType,
        location: formData.location,
        status: 'available',
        ...(qty != null && { unit }),
        ...(minStock != null && { minStock }),
        ...(qty == null && chosenShelf && { shelfId: chosenShelf }),
        images, // senza foto resta vuoto: le schermate mostrano un riquadro (D18, prima un'immagine d'esempio da internet)
        purchasePrice: parseNumber(formData.purchasePrice),
        sellPrice: parseNumber(formData.sellPrice),
        length: parseNumber(formData.length),
        width: parseNumber(formData.width),
        weight: parseNumber(formData.weight),
        technicalNotes: formData.technicalNotes || undefined,
        libraryId: formData.libraryId || undefined,
        gs1DigitalLink,
        customData: Object.keys(customFieldValues)
          .map(fieldId => {
            const field = customFields.find(f => f.id === fieldId);
            return field ? { value: customFieldValues[fieldId], fieldSnapshot: field } : null;
          }).filter(Boolean) as any,
      }, qty != null ? { qty } : undefined);
      if (!added) {
        setIsSubmitting(false);
        Alert.alert('Quantità non valida', 'Il prodotto non è stato aggiunto: controlla la quantità.');
        return;
      }

      // Small delay to prevent double tapping and allow UI update
      await new Promise(resolve => setTimeout(resolve, 500));

      Alert.alert(
        'Prodotto Aggiunto',
        `${formData.sku || finalSKU} è stato aggiunto all'inventario`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                sku: '',
                furType: '',
                location: '',
                purchasePrice: '',
                sellPrice: '',
                length: '',
                width: '',
                weight: '',
                technicalNotes: '',
                libraryId: '',
              });
              setImages([]);
              setQtyText('');
              setUnit(DEFAULT_UNIT);
              setMinText('');
              setShelfId('');
              // D22: si svuotano anche i campi personalizzati, così il prodotto successivo non eredita i valori
              setCustomFieldValues({});
              setIsSubmitting(false);
              router.push('/(tabs)');
            },
          },
        ]
      );
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Errore', 'Si è verificato un errore durante il salvataggio');
    }
  };

  // Size to flex style mapping for dynamic fields - fix overflow con gap 12px
  const getSizeStyle = (size: 'small' | 'medium' | 'full') => {
    switch (size) {
      case 'small': return { width: '31%' as const }; // 31*3=93% +2*gap ~98%
      case 'medium': return { width: '48%' as const }; // 48*2=96% +gap ~100%
      case 'full': return { width: '100%' as const };
    }
  };

  // Map location IDs to display objects
  const locationOptions = locations.map(loc => ({
    id: loc.id,
    label: loc.label,
    color: loc.color,
  }));

  // Render a dynamic field based on LayoutContext configuration
  const renderDynamicField = (field: LayoutField) => {
    const sizeStyle = getSizeStyle(field.size);
    // Campo a 1/3 (circa 106 px a 375): raggio piccolo, unità a destra, icone tolte dove manca spazio.
    // I segnaposto lunghi solo a larghezza intera, altrimenti finirebbero tagliati.
    const small = field.size === 'small';
    const full = field.size === 'full';

    // Section Header
    if (field.type === 'section') {
      return (
        <View key={field.id} style={[styles.section, styles.sectionItem]}>
          <Text style={styles.sectionTitle}>{sectionLabel(field.label) || 'Sezione'}</Text>
        </View>
      );
    }

    const getFieldLabel = (fId: string) => {
      const fItem = layout.fields.find(f => f.id === fId);
      if (fItem?.label) return fItem.label;
      const cf = customFields.find(c => c.id === fId);
      return cf?.name || fId;
    };

    const getFieldIcon = (fId: string) => {
      const fItem = layout.fields.find(f => f.id === fId);
      if (fItem?.icon) return fItem.icon;
      const cf = customFields.find(c => c.id === fId);
      return cf?.icon || 'tune';
    };

    // Etichetta sopra il controllo, al massimo due righe
    const renderLabel = (labelOverride?: string, required?: boolean) => {
      const label = labelOverride || getFieldLabel(field.id);
      return (
        <Text style={styles.label} numberOfLines={2}>
          {label}{required && <Text style={styles.required}> *</Text>}
        </Text>
      );
    };

    // Campo a una riga con l'icona dentro a sinistra e l'unità a destra, spinto in basso nella riga
    const renderInputWithIcon = (inputProps: {
      icon?: string;
      placeholder: string;
      value: string;
      onChangeText: (v: string) => void;
      keyboardType?: 'default' | 'numeric';
      unit?: string;
    }) => {
      const icon = inputProps.icon ?? getFieldIcon(field.id);
      return (
        <View style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]}>
          <AppIcon name={icon} size={small ? 17 : 18} color={t.colors.fieldIcon} />
          <TextInput
            style={styles.inputText}
            placeholder={inputProps.placeholder}
            placeholderTextColor={t.colors.placeholder}
            keyboardType={inputProps.keyboardType || 'default'}
            value={inputProps.value}
            onChangeText={inputProps.onChangeText}
          />
          {inputProps.unit ? <Text style={[styles.unit, small && styles.unitSmall]}>{inputProps.unit}</Text> : null}
        </View>
      );
    };

    // Testo lungo (a 1/3 senza icona, per lasciare spazio al testo)
    const renderTextArea = (areaProps: {
      icon: string;
      placeholder: string;
      value: string;
      onChangeText: (v: string) => void;
      numberOfLines: number;
    }) => (
      <View style={[styles.area, styles.bottom]}>
        {!small && <AppIcon name={areaProps.icon} size={18} color={t.colors.fieldIcon} style={styles.areaIcon} />}
        <TextInput
          style={styles.areaText}
          placeholder={areaProps.placeholder}
          placeholderTextColor={t.colors.placeholder}
          multiline
          numberOfLines={areaProps.numberOfLines}
          textAlignVertical="top"
          value={areaProps.value}
          onChangeText={areaProps.onChangeText}
        />
      </View>
    );

    // Campo con pulsante quadrato accanto (SKU, codice a barre). A 1/3 non c'è posto per il riquadro a parte:
    // il pulsante diventa un'icona dentro il campo, a destra, e l'icona del campo si toglie.
    const renderInputWithButton = (props: {
      icon: string;
      placeholder: string;
      value: string;
      onChangeText: (v: string) => void;
      buttonIcon: string;
      onButtonPress: () => void;
    }) => {
      const input = (
        <TextInput
          style={styles.inputText}
          placeholder={props.placeholder}
          placeholderTextColor={t.colors.placeholder}
          value={props.value}
          onChangeText={props.onChangeText}
        />
      );
      if (small) {
        return (
          <View style={[styles.inputBox, styles.inputBoxSmall, styles.bottom]}>
            {input}
            <Pressable onPress={props.onButtonPress} hitSlop={10}>
              <AppIcon name={props.buttonIcon} size={20} color={t.colors.accentInk} />
            </Pressable>
          </View>
        );
      }
      return (
        <View style={[styles.inputRow, styles.bottom]}>
          <View style={[styles.inputBox, styles.inputFill]}>
            <AppIcon name={props.icon} size={18} color={t.colors.fieldIcon} />
            {input}
          </View>
          <Pressable style={styles.sideButton} onPress={props.onButtonPress}>
            <AppIcon name={props.buttonIcon} size={22} color={t.colors.accentInk} />
          </Pressable>
        </View>
      );
    };

    // If it's a custom field
    if (field.type === 'custom') {
      const customField = customFields.find(cf => cf.id === field.id);
      if (!customField) return null;

      const getDynamicOptionsList = (cf: CustomField) => {
        if (cf.linkTo === 'locations') return locations.map(l => ({ id: l.id, label: l.label }));
        if (cf.linkTo === 'libraries') return categoryTree(libraries).map(({ category: l }) => ({ id: l.id, label: categoryPath(libraries, l.id) }));
        if (cf.linkTo === 'furType') return furTypes.map(c => ({ id: c.id, label: c.label }));

        return cf.dataset && Array.isArray(cf.dataset)
          ? cf.dataset.map((val: string, i: number) => ({ id: `ds_${i}`, label: String(val) }))
          : cf.options || [];
      };

      // Get field icon precedence:
      // 1. Layout configuration (user override in Layout Builder)
      // 2. Custom Field definition (user definition in Fields)
      // 3. Type-based default
      const getCustomFieldIcon = () => {
        // Check layout override first
        const layoutField = layout.fields.find(f => f.id === field.id);
        if (layoutField?.icon) return layoutField.icon;

        // Then Custom Field definition
        if (customField.icon) return customField.icon;

        // Then Type defaults
        switch (customField.type) {
          case 'number': return 'tag';
          case 'currency': return 'euro';
          case 'date': return 'event';
          case 'text_long': return 'notes';
          default: return 'text-fields';
        }
      };

      // === Modals and Pickers ===
      if (customField.uiType === 'picker' || customField.uiType === 'modal_list') {
        const optionsList = getDynamicOptionsList(customField);

        const isMulti = customField.type === 'multi_choice';
        const val = customFieldValues[field.id];
        const count = choiceList(val).length;
        const hasValue = isMulti ? count > 0 : !!val;
        // A 1/3 testo in 13 px e diciture corte; un valore lungo finisce con «…»
        const displayValue = isMulti
          ? (count ? `${count} ${small ? 'scelti' : 'selezionati'}` : (small ? 'Scegli' : 'Seleziona...'))
          : (val || (small ? 'Scegli' : 'Seleziona...'));

        return (
          <View key={field.id} style={sizeStyle}>
            {renderLabel(customField.name, customField.required)}
            <Pressable
              style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]}
              onPress={() => setSelectModalConfig({ fieldId: field.id, name: customField.name, options: optionsList, isMulti })}
            >
              {!small && <AppIcon name={getCustomFieldIcon()} size={18} color={t.colors.fieldIcon} />}
              <Text style={[styles.valueText, small && styles.valueTextSmall, !hasValue && styles.valuePlaceholder]} numberOfLines={1}>
                {displayValue}
              </Text>
              <AppIcon name="keyboard-arrow-down" size={20} color={t.colors.textMuted} />
            </Pressable>
          </View>
        );
      }

      // === Grids and Segmented ===
      if (customField.uiType === 'grid' || customField.uiType === 'segmented' || customField.type === 'single_choice' || customField.type === 'multi_choice') {
        const optionsList = getDynamicOptionsList(customField);
        // D01: la scelta multipla a riquadri resta multipla (quadratini di spunta), la singola ha i cerchi
        const isMulti = customField.type === 'multi_choice';

        return (
          <View key={field.id} style={{ width: '100%' }}>
            {renderLabel(customField.name, customField.required)}
            <View style={styles.tileGrid}>
              {optionsList.map((option: any) => {
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
      }

      if (customField.uiType === 'stepper') {
        const stepMap = customField.dataset || { min: 0, max: 100, step: 1 };
        const val = parseFloat(customFieldValues[field.id]) || stepMap.min;
        return (
          <View key={field.id} style={sizeStyle}>
            {renderLabel(customField.name, customField.required)}
            <View style={[styles.stepper, small && styles.stepperSmall, styles.bottom]}>
              <Pressable style={styles.stepperButton} onPress={() => setCustomFieldValues(prev => ({ ...prev, [field.id]: Math.max(stepMap.min, val - stepMap.step) }))}>
                <AppIcon name="remove" size={20} color={val <= stepMap.min ? t.colors.textMuted : t.colors.textSecondary} />
              </Pressable>
              <Text style={styles.stepperValue}>{val}</Text>
              <Pressable style={[styles.stepperButton, styles.stepperPlus]} onPress={() => setCustomFieldValues(prev => ({ ...prev, [field.id]: Math.min(stepMap.max, val + stepMap.step) }))}>
                <AppIcon name="add" size={20} color={val >= stepMap.max ? t.colors.textMuted : t.colors.accentInk} />
              </Pressable>
            </View>
          </View>
        );
      }

      // === Images ===
      if (customField.type === 'images') {
        const customImages = customFieldValues[field.id] || [];
        return (
          <View key={field.id} style={{ width: '100%' }}>
            {renderLabel(customField.name, customField.required)}
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

      // === Date ===
      if (customField.type === 'date') {
        const val = customFieldValues[field.id];
        return (
          <View key={field.id} style={sizeStyle}>
            {renderLabel(customField.name, customField.required)}
            <Pressable
              style={[styles.inputBox, small && styles.inputBoxSmall, small && styles.dateBoxSmall, styles.bottom]}
              onPress={() => setShowDatePickerMap(prev => ({ ...prev, [field.id]: true }))}
            >
              <Text style={[styles.valueText, small && styles.valueTextSmall, !val && styles.valuePlaceholder]} numberOfLines={1}>
                {val ? new Date(val).toLocaleDateString('it-IT') : (small ? 'Data' : 'Seleziona Data')}
              </Text>
              <AppIcon name="calendar-today" size={small ? 15 : 18} color={t.colors.info} />
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

      // === Document ===
      if (customField.type === 'document') {
        const docs = customFieldValues[field.id] || [];
        return (
          <View key={field.id} style={{ width: '100%' }}>
            {renderLabel(customField.name, customField.required)}
            <View style={styles.docList}>
              {docs.map((docUri: string, index: number) => (
                <Pressable key={index} style={styles.docRow} onPress={() => Sharing.shareAsync(docUri).catch(console.error)}>
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

      // === Short Text w/ Barcode Scanner ===
      if (customField.type === 'text_short' && customField.isBarcode) {
        return (
          <View key={field.id} style={sizeStyle}>
            {renderLabel(customField.name, customField.required)}
            {renderInputWithButton({
              icon: getCustomFieldIcon(),
              placeholder: full ? 'Scansiona o scrivi il codice' : 'Codice',
              value: customFieldValues[field.id]?.toString() || '',
              onChangeText: (value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value })),
              buttonIcon: 'qr-code-scanner',
              onButtonPress: () => setScanFieldId(field.id), // lettore vero (D02: prima scriveva un codice finto)
            })}
          </View>
        );
      }

      const isNumeric = customField.type === 'number' || customField.type === 'currency';
      const textPlaceholder = full ? `Inserisci ${customField.name.toLowerCase()}` : 'Scrivi';

      if (customField.type === 'text_long') {
        return (
          <View key={field.id} style={sizeStyle}>
            {renderLabel(customField.name, customField.required)}
            {renderTextArea({
              icon: getCustomFieldIcon(),
              placeholder: textPlaceholder,
              value: customFieldValues[field.id]?.toString() || '',
              onChangeText: (value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value })),
              numberOfLines: 3,
            })}
          </View>
        );
      }

      return (
        <View key={field.id} style={sizeStyle}>
          {renderLabel(customField.name, customField.required)}
          {renderInputWithIcon({
            icon: getCustomFieldIcon(),
            placeholder: isNumeric ? '0' : textPlaceholder,
            value: customFieldValues[field.id]?.toString() || '',
            onChangeText: (value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value })),
            keyboardType: isNumeric ? 'numeric' : 'default',
            unit: customField.unit || (customField.type === 'currency' ? '€' : undefined),
          })}
        </View>
      );
    }

    // Base fields
    switch (field.id) {
      case 'images':
        return (
          <View key="images" style={{ width: '100%' }}>
            <Text style={styles.label}>
              Foto prodotto <Text style={styles.labelMuted}>{images.length}/10</Text>
            </Text>
            {images.length > 0 && (
              <View style={styles.mainImageBox}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(event) => {
                    const index = Math.round(event.nativeEvent.contentOffset.x / imageWidth);
                    setCurrentImageIndex(Math.min(index, images.length - 1));
                  }}
                  scrollEventThrottle={16}
                >
                  {images.map((uri, index) => (
                    <View key={index}>
                      <Image source={{ uri }} style={[styles.mainImage, { width: imageWidth }]} contentFit="cover" />
                      <Pressable style={styles.removeMainImage} onPress={() => removeImage(index)}>
                        <AppIcon name="delete" size={20} color={t.colors.onData} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
                {images.length > 1 && (
                  <View style={styles.dots}>
                    {images.map((_, index) => (
                      <View key={index} style={[styles.dot, index === currentImageIndex && styles.dotActive]} />
                    ))}
                  </View>
                )}
              </View>
            )}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {images.map((uri, index) => (
                <Pressable key={index} onPress={() => setCurrentImageIndex(index)}>
                  <Image source={{ uri }} style={[styles.thumb, index === currentImageIndex && styles.thumbActive]} contentFit="cover" />
                </Pressable>
              ))}
              {images.length < 10 && (
                <Pressable style={styles.photoAdd} onPress={showImageSourcePicker}>
                  <AppIcon name="add-a-photo" size={26} color={t.colors.accentInk} />
                  <Text style={styles.photoAddText}>Importa</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        );

      case 'sku':
        return (
          <View key="sku" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithButton({
              icon: getFieldIcon('sku'),
              placeholder: full ? `Auto: ${generateSKU()}` : 'Auto',
              value: formData.sku,
              onChangeText: (value) => updateField('sku', value),
              buttonIcon: 'qr-code-2',
              onButtonPress: () => updateField('sku', generateSKU()),
            })}
            {!formData.sku && (
              <View style={styles.helper}>
                <AppIcon name="lightbulb-outline" size={15} color={t.colors.textMuted} />
                <Text style={styles.helperText}>Generato automaticamente se vuoto</Text>
              </View>
            )}
          </View>
        );

      case 'furType':
        return (
          <View key="furType" style={{ width: '100%' }}>
            {renderLabel()}
            {/* Tipo di pelle (M01, C1): facoltativo, il secondo tocco toglie la scelta; a capo come Posizione e Categoria (D09) */}
            <View style={styles.chipWrap}>
              {furTypes.map((type) => {
                const active = formData.furType === type.id;
                return (
                  <Pressable
                    key={type.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => updateField('furType', active ? '' : type.id)}
                  >
                    {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{type.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      // D09: le pillole di Posizione e Categoria vanno a capo invece di scorrere fuori dal campo
      case 'location':
        return (
          <View key="location" style={sizeStyle}>
            {renderLabel(undefined, true)}
            <View style={styles.chipWrap}>
              {locationOptions.map((loc) => {
                const active = formData.location === loc.id;
                return (
                  <Pressable
                    key={loc.id}
                    style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                    onPress={() => updateField('location', loc.id)}
                  >
                    {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <View style={[styles.chipDot, active && styles.chipDotActive, { backgroundColor: loc.color }]} />
                    <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]} numberOfLines={1}>{loc.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );

      case 'folder':
        return (
          <View key="folder" style={sizeStyle}>
            {renderLabel()}
            {/* C1: categoria e, se ne ha, sottocategoria (la cartella di prima) */}
            <CategoryPicker categories={libraries} value={formData.libraryId} onChange={(id) => updateField('libraryId', id)} />
          </View>
        );

      case 'purchasePrice':
        return (
          <View key="purchasePrice" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithIcon({
              placeholder: '2500',
              value: formData.purchasePrice,
              onChangeText: (value) => updateField('purchasePrice', value),
              keyboardType: 'numeric',
              unit: '€',
            })}
          </View>
        );

      case 'sellPrice':
        return (
          <View key="sellPrice" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithIcon({
              placeholder: '4200',
              value: formData.sellPrice,
              onChangeText: (value) => updateField('sellPrice', value),
              keyboardType: 'numeric',
              unit: '€',
            })}
          </View>
        );

      case 'length':
        return (
          <View key="length" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithIcon({
              placeholder: '85',
              value: formData.length,
              onChangeText: (value) => updateField('length', value),
              keyboardType: 'numeric',
              unit: 'cm',
            })}
          </View>
        );

      case 'width':
        return (
          <View key="width" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithIcon({
              placeholder: '120',
              value: formData.width,
              onChangeText: (value) => updateField('width', value),
              keyboardType: 'numeric',
              unit: 'cm',
            })}
          </View>
        );

      case 'weight':
        return (
          <View key="weight" style={sizeStyle}>
            {renderLabel()}
            {renderInputWithIcon({
              placeholder: '1,2',
              value: formData.weight,
              onChangeText: (value) => updateField('weight', value),
              keyboardType: 'numeric',
              unit: 'kg',
            })}
          </View>
        );

      case 'technicalNotes':
        return (
          <View key="technicalNotes" style={{ width: '100%' }}>
            {renderLabel()}
            {renderTextArea({
              icon: getFieldIcon('technicalNotes'),
              placeholder: 'Inserisci dettagli tecnici...',
              value: formData.technicalNotes,
              onChangeText: (value) => updateField('technicalNotes', value),
              numberOfLines: 4,
            })}
          </View>
        );

      default:
        return null;
    }
  };

  // Get visible fields from layout
  const visibleFields = getVisibleFields();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <Backdrop />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.screenPadding,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Aggiungi prodotto</Text>
            <AppIcon name="add-photo-alternate" size={26} color={t.colors.accentInk} />
          </View>

          {/* Dynamic Form Fields - Rendered based on Layout Configuration */}
          <View style={styles.dynamicFieldsRow}>
            {visibleFields.map(renderDynamicField)}
          </View>

          {/* Magazzino (M03): fuori dal layout, così c'è anche con un layout salvato prima */}
          <View style={styles.stockBlock}>
            <View style={[styles.section, styles.sectionItem]}>
              <Text style={styles.sectionTitle}>Magazzino</Text>
            </View>
            <View>
              <Text style={styles.label}>Quantità</Text>
              <View style={styles.inputBox}>
                <AppIcon name="inventory" size={18} color={t.colors.fieldIcon} />
                <TextInput
                  style={styles.inputText}
                  placeholder="Vuota = pezzo unico"
                  placeholderTextColor={t.colors.placeholder}
                  keyboardType="numeric"
                  value={qtyText}
                  onChangeText={setQtyText}
                  accessibilityLabel="Quantità"
                />
                <Text style={styles.unit}>{unit}</Text>
              </View>
              <Text style={styles.stockHint}>
                Con una quantità il prodotto diventa articolo a quantità: la giacenza parte da qui, nella posizione scelta.
              </Text>
            </View>
            <View>
              <Text style={styles.label}>Unità</Text>
              <View style={styles.chipWrap}>
                {UNITS.map((u) => {
                  const active = unit === u;
                  return (
                    <Pressable
                      key={u}
                      style={[styles.chip, styles.chipSmall, active && styles.chipActive]}
                      onPress={() => setUnit(u)}
                      accessibilityLabel={`Unità ${u}`}
                    >
                      {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                      <Text style={[styles.chipText, styles.chipTextSmall, active && styles.chipTextActive]}>{u}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {qtyText.trim() ? (
              <View>
                <Text style={styles.label}>Scorta minima</Text>
                <View style={styles.inputBox}>
                  <AppIcon name="warning" size={18} color={t.colors.fieldIcon} />
                  <TextInput
                    style={styles.inputText}
                    placeholder="Vuota = nessun avviso"
                    placeholderTextColor={t.colors.placeholder}
                    keyboardType="numeric"
                    value={minText}
                    onChangeText={setMinText}
                    accessibilityLabel="Scorta minima"
                  />
                  <Text style={styles.unit}>{unit}</Text>
                </View>
                <Text style={styles.stockHint}>
                  Sotto questa quantità il prodotto finisce tra quelli che richiedono attenzione.
                </Text>
              </View>
            ) : null}
            {/* Scaffale (S1a): solo per un pezzo unico, se la posizione scelta ne ha di adatti */}
            {!qtyText.trim() && shelfChoices.length > 0 ? (
              <View>
                <Text style={styles.label}>Scaffale</Text>
                <ShelfPicker shelves={shelfChoices} categories={libraries} value={chosenShelf} onChange={setShelfId} />
                <Text style={styles.stockHint}>
                  Facoltativo: gli scaffali di questa posizione generici o della categoria scelta.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Submit Button */}
          <Pressable
            style={[styles.primaryButton, styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {!isSubmitting && <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />}
            <AppIcon name="check-circle" size={20} color={isSubmitting ? t.colors.textSecondary : t.colors.onButton} />
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Salvataggio...' : "Aggiungi all'Inventario"}
            </Text>
          </Pressable>

          <Text style={styles.footNote}>
            <Text style={styles.required}>*</Text> Campi obbligatori: Posizione (SKU auto-generato se vuoto)
          </Text>
        </ScrollView>
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
  // Campi del layout in righe che vanno a capo: 12 px tra le colonne, 16 tra le righe
  dynamicFieldsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 16,
    paddingTop: 4,
    marginBottom: 24,
  },
  // Titolo di sezione: 24 px sopra (16 della riga + 8)
  sectionItem: {
    width: '100%',
    marginTop: 8,
  },
  stockBlock: {
    marginTop: 16,
    gap: 16,
  },
  stockHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textSecondary,
  },
  // A 1/3 la data (13 px) deve stare intera accanto al calendario: margini interni più stretti
  dateBoxSmall: {
    paddingLeft: 8,
    paddingRight: 6,
    gap: 2,
  },
  submitButton: {
    height: 54,
  },
  submitButtonDisabled: {
    backgroundColor: t.colors.border,
    opacity: 0.7,
  },
  footNote: {
    fontSize: 12,
    lineHeight: 17,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
}));
