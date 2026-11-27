// FurInventory Pro - Add Product Screen
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FORM_MODELS, missingModelFields, modelLayout, modelName, type FormModelId } from '../../../constants/formModels';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import * as ImagePicker from '../../lib/imagePicker';
import * as DocumentPicker from '../../lib/documentPicker';
import { ActionSheetIOS } from 'react-native';
import { useInventory } from '../../../contexts/InventoryContext';
import { parseNumber } from '../../../utils/number';
import { useLocations } from '../../../contexts/LocationsContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { CategoryPicker } from '../../../components/CategoryPicker';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { missingRequiredFields } from '../../../utils/formValidation';
import { useLayout, LayoutField, sectionLabel } from '../../../contexts/LayoutContext';
import { useGS1Config } from '../../../contexts/GS1ConfigContext';
import { generateGS1DigitalLink } from '../../../utils/gs1';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { Text, TextInput } from '../../../components/ui/Text';
import { formStyles } from '../../../components/ui/formStyles';
import { FieldInput, fieldIcon } from '../../../components/FieldInput';
import { ChoicePicker } from '../../../components/ChoicePicker';
import { useFieldOptions } from '../../../hooks/useFieldOptions';
import { baseLook, baseMeasureField, choiceRowSize, fieldError, initialValues, invalidNumberFields, isChoiceField, MEASURE_PLACEHOLDERS, measureText, NO_FLAGS, savedValue, valueText, type FlaggedFields } from '../../../utils/fieldValues';
import { PhotoGallery } from '../../../components/PhotoGallery';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { DEFAULT_UNIT, parseQty, UNITS } from '../../../utils/stock';
import { parseMinStock } from '../../../utils/alerts';
import { useShelves } from '../../../contexts/ShelvesContext';
import { shelvesFor } from '../../../utils/shelves';
import { ShelfPicker } from '../../../components/ShelfPicker';
// S3 (ticket 15): avviso e blocco del carico
import { useLoadCheck } from '../../../hooks/useLoadCheck';
import { useLoadBlock } from '../../../components/LoadBlockSheet';
import { LoadNotice } from '../../../components/LoadNotice';
import { Dimmed, PermissionNote } from '../../../components/PermissionNote';
import { usePermission } from '../../../contexts/ProfileContext';
import { stockKey } from '../../../utils/stock';
import { useTagOffer } from '../../../hooks/useTagOffer'; // N1: «Proponi di scrivere il tag» di Scanner e NFC
import { toWebFormat } from '../../../utils/photoCloud';

const MODEL_KEY = 'syncro_add_form_model';

export default function AddProductScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addProduct, products, libraries } = useInventory();
  const { locations } = useLocations();
  const { furTypes } = useFurTypes();
  const { customFields, addField } = useCustomFields();
  // Modello del modulo (27/11): «Pellicce (attuale)» = il layout salvato; «Borse» = i suoi campi raggruppati, in memoria
  const [model, setModel] = useState<FormModelId>('attuale');
  useEffect(() => {
    AsyncStorage.getItem(MODEL_KEY).then((v) => { if (v && FORM_MODELS.some((m) => m.id === v)) setModel(v as FormModelId); }).catch(() => {});
  }, []);
  const chooseModel = async (id: FormModelId) => {
    try {
      for (const def of missingModelFields(id, customFields)) await addField(def);
    } catch {
      Alert.alert('Modello', 'Non sono riuscito a creare i campi del modello. Riprova.');
      return;
    }
    setModel(id);
    AsyncStorage.setItem(MODEL_KEY, id).catch(() => {});
  };
  const showModelPicker = () => {
    Alert.alert('Modello di settore', `Adesso: ${modelName(model)}. Quale modulo vuoi usare?`, [
      ...FORM_MODELS.map((m) => ({ text: m.name, onPress: () => { chooseModel(m.id); } })),
      { text: 'Annulla', style: 'cancel' as const },
    ]);
  };
  const { layout, getVisibleFields: getLayoutFields } = useLayout();
  const getVisibleFields = (): LayoutField[] => modelLayout(model, customFields) ?? getLayoutFields();
  const { gs1Config } = useGS1Config();

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  // Campi segnati dall'ultimo salvataggio rifiutato (riga rossa sotto il campo)
  const [flagged, setFlagged] = useState<FlaggedFields>(NO_FLAGS);
  const optionsOf = useFieldOptions();

  const [formData, setFormData] = useState({
    sku: '',
    furType: '',
    location: '',
    purchasePrice: '',
    sellPrice: '',
    length: '',
    width: '',
    weight: '',
    height: '', // S2
    technicalNotes: '',
    libraryId: '',
  });

  // Magazzino (M03): quantità facoltativa (vuota = pezzo unico) e unità. Fuori dal layout del modulo.
  const [qtyText, setQtyText] = useState('');
  const [unit, setUnit] = useState<string>(DEFAULT_UNIT);
  // Scorta minima (M06): solo per gli articoli a quantità, compare quando c'è una quantità
  const [minText, setMinText] = useState('');
  // Scaffale (S1a), tra quelli della posizione e della categoria scelte: per un pezzo unico è il suo scaffale, con una
  // quantità (S1b) è dove va la giacenza iniziale (`withInitialStock`, chiave `posizione/scaffale`)
  const { shelves } = useShelves();
  const tagOffer = useTagOffer(); // N1
  const [shelfId, setShelfId] = useState('');
  const shelfChoices = shelvesFor(shelves, libraries, { location: formData.location, libraryId: formData.libraryId || undefined });
  const chosenShelf = shelfChoices.some((s) => s.id === shelfId) ? shelfId : '';

  // S3 (ticket 15): il carico iniziale (la quantità, o 1 per un pezzo unico) sullo scaffale scelto o nella posizione
  // con capienza: avviso in linea sotto lo Scaffale, blocco al salvataggio con la proposta
  const { check: checkLoad } = useLoadCheck();
  const load = useLoadBlock();
  const loadCheck = (() => {
    const qty = qtyText.trim() ? parseQty(qtyText) : 1;
    if (!formData.location || qty == null || !(qty > 0)) return null;
    const draft = {
      length: parseNumber(formData.length), width: parseNumber(formData.width), height: parseNumber(formData.height),
      weight: parseNumber(formData.weight), libraryId: formData.libraryId || undefined, ...(qtyText.trim() && { unit }),
    };
    return checkLoad(draft, stockKey(formData.location, chosenShelf || undefined), [{ qty }]);
  })();

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
      const newImages = await toWebFormat(result.assets.map((asset) => asset.uri)); // 26/11: WebP subito
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
        const newImages = await toWebFormat(result.assets.map((asset) => asset.uri)); // 26/11: WebP subito
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
      const [photo] = await toWebFormat([result.assets[0].uri]); // 26/11: WebP subito
      setImages((prev) => [...prev, photo].slice(0, 10));
    }
  };


  const [isSubmitting, setIsSubmitting] = useState(false);
  // ACC1 (ticket 32): «Aggiungi all'Inventario» spento col motivo per un ruolo che non aggiunge (blocco a sé)
  const addPerm = usePermission('aggiungere');

  // Valori dei campi personalizzati: quelli scritti più il minimo dei contatori visibili non toccati, che è il valore
  // vero e si salva (VAL, CAM-F3), e il valore predefinito dei campi che ne hanno uno (EDC). Calcolato a ogni disegno,
  // così vale anche dopo lo svuotamento (D22) e quando i campi arrivano dopo la schermata.
  const visibleCustom = getVisibleFields()
    .filter((f) => f.type === 'custom')
    .map((f) => customFields.find((cf) => cf.id === f.id))
    .filter((cf): cf is NonNullable<typeof cf> => !!cf);
  const values: Record<string, any> = { ...initialValues(visibleCustom), ...customFieldValues };

  const handleSubmit = () => {
    if (isSubmitting) return;
    if (!addPerm.allowed) return; // ACC1: il motivo è scritto sopra il pulsante

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
    const missing = missingRequiredFields(getVisibleFields(), customFields, values);
    if (missing.length > 0) {
      setFlagged({ missing: missing.map((f) => f.id), wrong: [] });
      Alert.alert('Campi obbligatori', `Compila anche: ${missing.map((f) => f.name).join(', ')}`);
      return;
    }
    // VAL (CAM-F2): i numeri si salvano come numero; un testo che non è un numero si dice
    const wrong = invalidNumberFields(customFields, values);
    if (wrong.length > 0) {
      setFlagged({ missing: [], wrong: wrong.map((f) => f.id) });
      Alert.alert('Numero non valido', `Scrivi un numero in: ${wrong.map((f) => f.name).join(', ')} (per esempio 12,5).`);
      return;
    }
    setFlagged(NO_FLAGS);

    // S3: con il blocco non si salva nulla; il tocco sulla proposta salva nel posto proposto
    if (loadCheck?.level === 'blocco') {
      load.show({ check: loadCheck, onUse: (p) => confirmPhotos({ location: p.locationId, shelfId: p.shelfId ?? '' }) });
      return;
    }
    confirmPhotos();
  };

  /** `place`: il posto proposto dalla finestra del blocco (S3); senza, quelli scelti nel modulo. */
  const confirmPhotos = (place?: { location: string; shelfId: string }) => {
    if (images.length === 0) {
      Alert.alert('Attenzione', 'Aggiungi almeno una foto del prodotto', [
        { text: 'Continua Senza Foto', onPress: () => submitProduct(place) },
        { text: 'Aggiungi Foto', style: 'cancel' },
      ]);
      return;
    }

    submitProduct(place);
  };

  const submitProduct = async (place?: { location: string; shelfId: string }) => {
    const location = place?.location ?? formData.location; // S3
    const savedShelf = place ? place.shelfId : chosenShelf; // S3
    setIsSubmitting(true);
    try {
      const finalSKU = formData.sku.trim() || generateSKU();

      // GS1 Digital Link generation
      let gs1DigitalLink: string | undefined;
      if (gs1Config.baseUrl) {
        // Il lotto è il testo del campo: per una scelta il nome dell'opzione, non il suo id (VAL)
        const lotField = gs1Config.enableLotto && gs1Config.lottoFieldId ? customFields.find((f) => f.id === gs1Config.lottoFieldId) : undefined;
        const lotRaw = gs1Config.enableLotto && gs1Config.lottoFieldId ? values[gs1Config.lottoFieldId] : undefined;
        const lottoValue = lotField && isChoiceField(lotField)
          ? valueText(lotField, lotRaw, { options: optionsOf(lotField) }) || undefined
          : lotRaw?.toString();
        gs1DigitalLink = generateGS1DigitalLink(
          gs1Config,
          finalSKU,
          products.length,
          lottoValue,
        );
      }

      const qty = qtyText.trim() ? parseQty(qtyText) : undefined;
      const minStock = qty != null ? parseMinStock(minText) : undefined;
      const height = parseNumber(formData.height); // S2 (ticket 14)
      const added = addProduct({
        sku: finalSKU,
        furType: formData.furType,
        location,
        status: 'available',
        ...(qty != null && { unit }),
        ...(minStock != null && { minStock }),
        ...(savedShelf && { shelfId: savedShelf }), // con la quantità il contesto lo mette nella chiave della giacenza
        images, // senza foto resta vuoto: le schermate mostrano un riquadro (D18, prima un'immagine d'esempio da internet)
        purchasePrice: parseNumber(formData.purchasePrice),
        sellPrice: parseNumber(formData.sellPrice),
        length: parseNumber(formData.length),
        width: parseNumber(formData.width),
        weight: parseNumber(formData.weight),
        ...(height != null && { height }), // S2: senza altezza il campo non c'è
        technicalNotes: formData.technicalNotes || undefined,
        libraryId: formData.libraryId || undefined,
        gs1DigitalLink,
        // VAL: scelte con l'id dell'opzione, numeri come numero (un numero vuoto non si salva), contatori col minimo
        customData: Object.keys(values)
          .filter((fieldId) => model === 'attuale' || visibleCustom.some((cf) => cf.id === fieldId)) // solo i campi del modello
          .map(fieldId => {
            const field = customFields.find(f => f.id === fieldId);
            if (!field) return null;
            const saved = savedValue(field, values[fieldId]);
            return saved.ok && saved.value !== undefined ? { value: saved.value, fieldSnapshot: field } : null;
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
        tagOffer.withTagOffer(finalSKU, [
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
                height: '', // S2
                technicalNotes: '',
                libraryId: '',
              });
              setImages([]);
              setCurrentImageIndex(0);
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
        ])
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

    // Campo personalizzato: un disegnatore solo per Aggiungi e Modifica (VAL, `components/FieldInput.tsx`)
    if (field.type === 'custom') {
      const customField = customFields.find(cf => cf.id === field.id);
      if (!customField) return null;
      return (
        <FieldInput
          key={field.id}
          field={customField}
          value={values[field.id]}
          onChange={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
          size={field.size}
          icon={fieldIcon(customField, layout.fields.find(f => f.id === field.id)?.icon)}
          tileWidth={tileWidth}
          style={sizeStyle}
          error={fieldError(customField, values[field.id], flagged)}
        />
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
            {/* Galleria (GAL): la miniatura porta alla foto; Sposta, principale ed Elimina valgono per la foto scelta
                (prima il cestino su ogni foto cancellava quella che si vedeva, CSV-G1) */}
            <PhotoGallery
              variant="modulo"
              images={images}
              index={currentImageIndex}
              onIndexChange={setCurrentImageIndex}
              width={imageWidth}
              height={280}
              edit={{ onChange: (next, index) => { setImages(next.images); setCurrentImageIndex(index); } }}
              thumbnails
              thumbnailsExtra={images.length < 10 && (
                <Pressable style={styles.photoAdd} onPress={showImageSourcePicker}>
                  <AppIcon name="add-a-photo" size={26} color={t.colors.accentInk} />
                  <Text style={styles.photoAddText}>Importa</Text>
                </Pressable>
              )}
            />
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

      // Tipo di pelle e Posizione (richiesta dell'utente del 24): nell'aspetto scelto in Campi (`baseLook`), di solito il
      // binario orizzontale (una riga che scorre, con la sfumatura dove continua) al posto delle pillole a capo di D09.
      // UX1-0: col binario Posizione prende la riga intera anche se nel modulo sta in una colonna (`choiceRowSize`); con
      // la tendina resta nella colonna. Il modulo salvato non cambia
      case 'furType': {
        const furTypeField = customFields.find((c) => c.id === 'furType');
        const chosen = furTypes.find((ft) => ft.id === formData.furType);
        return (
          <View key="furType" style={{ width: '100%' }}>
            {renderLabel()}
            {/* Tipo di pelle (M01, C1): facoltativo, il secondo tocco toglie la scelta */}
            <ChoicePicker
              name={getFieldLabel('furType')}
              look={baseLook(furTypeField)}
              options={furTypes}
              selected={(o) => formData.furType === o.id}
              onPick={(o) => updateField('furType', formData.furType === o.id ? '' : o.id)}
              onClear={() => updateField('furType', '')}
              icon={getFieldIcon('furType')}
              shown={chosen?.label ?? 'Seleziona...'}
              empty={!chosen}
              tileWidth={tileWidth}
            />
          </View>
        );
      }

      case 'location': {
        const locationField = customFields.find((c) => c.id === 'location');
        const chosen = locationOptions.find((l) => l.id === formData.location);
        const look = baseLook(locationField);
        const drawn = choiceRowSize(field.size, look);
        return (
          <View key="location" style={getSizeStyle(drawn)}>
            {renderLabel(undefined, true)}
            <ChoicePicker
              name={getFieldLabel('location')}
              look={look}
              options={locationOptions}
              selected={(o) => formData.location === o.id}
              onPick={(o) => updateField('location', o.id)}
              onClear={() => updateField('location', '')}
              icon={getFieldIcon('location')}
              shown={chosen?.label ?? (drawn === 'small' ? 'Scegli' : 'Seleziona...')}
              empty={!chosen}
              small={drawn === 'small'}
              narrow={drawn !== 'full'}
              tileWidth={tileWidth}
            />
          </View>
        );
      }

      case 'folder':
        // UX1-0: la Categoria ha solo il binario, quindi prende sempre la riga intera (`choiceRowSize`)
        return (
          <View key="folder" style={getSizeStyle(choiceRowSize(field.size, 'chips'))}>
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

      // Misure Base (EDC, ticket 23 punto 4): lo stesso disegnatore dei campi, scritte o con la ruota se il campo Base
      // lo dice; scritte, uguali a prima (segnaposto, unità, icona del modulo). L'Altezza (S2, ticket 14: su quali
      // scaffali entra e quanti ne entrano) è una misura come le altre
      case 'length':
      case 'width':
      case 'weight':
      case 'height': {
        const base = baseMeasureField(customFields, field.id);
        const key = field.id as 'length' | 'width' | 'weight' | 'height';
        return (
          <FieldInput
            key={field.id}
            field={base}
            value={formData[key]}
            onChange={(value) => updateField(key, measureText(value))}
            size={field.size}
            icon={getFieldIcon(field.id)}
            label={getFieldLabel(field.id)}
            placeholder={MEASURE_PLACEHOLDERS[key]}
            tileWidth={tileWidth}
            style={sizeStyle}
          />
        );
      }

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
            <Pressable
              onPress={showModelPicker}
              accessibilityRole="button"
              accessibilityLabel={`Modello di settore: ${modelName(model)}`}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: t.colors.accentInk }}
            >
              <AppIcon name="dashboard-customize" size={18} color={t.colors.accentInk} />
              <Text style={{ color: t.colors.accentInk, fontWeight: '600' }} numberOfLines={1}>{model === 'attuale' ? 'Pellicce' : modelName(model)}</Text>
              <AppIcon name="expand-more" size={18} color={t.colors.accentInk} />
            </Pressable>
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
            {/* Scaffale (S1a): se la posizione scelta ne ha di adatti; con una quantità (S1b) la giacenza parte da lì */}
            {shelfChoices.length > 0 ? (
              <View>
                <Text style={styles.label}>Scaffale</Text>
                <ShelfPicker shelves={shelfChoices} categories={libraries} value={chosenShelf} onChange={setShelfId} />
                <Text style={styles.stockHint}>
                  {qtyText.trim()
                    ? 'Facoltativo: la quantità iniziale va sullo scaffale scelto, generico o della categoria scelta.'
                    : 'Facoltativo: gli scaffali di questa posizione generici o della categoria scelta.'}
                </Text>
              </View>
            ) : null}
            {/* S3: avviso del carico sotto lo Scaffale, con «Usa A2» se c'è un posto più libero */}
            <LoadNotice
              check={loadCheck}
              onUseProposal={(p) => { if (p.locationId !== formData.location) updateField('location', p.locationId); setShelfId(p.shelfId ?? ''); }}
            />
            {load.sheet}
          </View>

          {/* Submit Button */}
          <PermissionNote text={addPerm.reason} style={{ marginTop: 16, marginBottom: 0 }} />
          <Dimmed off={!addPerm.allowed}>
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
          </Dimmed>

          <Text style={styles.footNote}>
            <Text style={styles.required}>*</Text> Campi obbligatori: Posizione (SKU auto-generato se vuoto)
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {tagOffer.sheet}
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
