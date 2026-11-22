// FurInventory Pro - Edit Product Screen
import React, { useState } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert, useWindowDimensions, Modal, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import * as ImagePicker from '../../lib/imagePicker';
import * as DocumentPicker from '../../lib/documentPicker';
import { Image } from '../../lib/ExpoImage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Sharing from '../../lib/sharing';
import { useInventory } from '../../../contexts/InventoryContext';
import { FUR_TYPES } from '../../../constants/config';
import { useLocations } from '../../../contexts/LocationsContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useGS1Config } from '../../../contexts/GS1ConfigContext';
import { generateGS1DigitalLink } from '../../../utils/gs1';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function EditProductScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getProductById, updateProduct, libraries } = useInventory();
  const { locations } = useLocations();

  const product = getProductById(id as string);
  const { customFields } = useCustomFields();
  const { layout } = useLayout();
  const { gs1Config } = useGS1Config();
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
    purchasePrice: product?.purchasePrice?.toString() || '',
    sellPrice: product?.sellPrice?.toString() || '',
    length: product?.length?.toString() || '',
    width: product?.width?.toString() || '',
    weight: product?.weight?.toString() || '',
    technicalNotes: product?.technicalNotes || '',
    libraryId: product?.libraryId || '',
  });

  const [images, setImages] = useState<string[]>(product?.images || []);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const imageWidth = Math.max(1, screenWidth - 32);

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
      setImages((prev) => [...prev, ...newImages].slice(0, 10));
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

  const pickDocument = async (fieldId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const file = result.assets[0];
        setCustomFieldValues(prev => ({ ...prev, [fieldId]: file.name })); // Store name or URI
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Errore', 'Impossibile selezionare il documento');
    }
  };

  const [selectModalConfig, setSelectModalConfig] = useState<{ fieldId: string; name: string; options: any[]; isMulti: boolean } | null>(null);

  const handleSave = () => {
    if (!formData.sku || !formData.furType || !formData.location) {
      Alert.alert('Campi Obbligatori', 'Compila almeno SKU, Tipo di Pelle e Posizione');
      return;
    }

    if (images.length === 0) {
      Alert.alert('Attenzione', 'Aggiungi almeno una foto del prodotto');
      return;
    }

    // GS1 Digital Link generation
    let gs1DigitalLink = product?.gs1DigitalLink;
    if (gs1Config.baseUrl) {
      const lottoValue = gs1Config.enableLotto && gs1Config.lottoFieldId
        ? customFieldValues[gs1Config.lottoFieldId]?.toString()
        : undefined;
      // We pass products.length here for the progressive serial fallback if regenerating.
      // Ideally, if the product already has a serial, we shouldn't overwrite it unless GTIN changes,
      // but for this MVP, regenerating or ensuring it's attached is fine.
      gs1DigitalLink = generateGS1DigitalLink(
        gs1Config,
        formData.sku.trim(),
        products.length,
        lottoValue,
      );
    }

    updateProduct(id as string, {
      sku: formData.sku.trim(),
      furType: formData.furType,
      location: formData.location,
      images,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      sellPrice: formData.sellPrice ? parseFloat(formData.sellPrice) : undefined,
      length: formData.length ? parseFloat(formData.length) : undefined,
      width: formData.width ? parseFloat(formData.width) : undefined,
      weight: formData.weight ? parseFloat(formData.weight) : undefined,
      technicalNotes: formData.technicalNotes || undefined,
      libraryId: formData.libraryId || undefined,
      gs1DigitalLink,
      customData: Object.keys(customFieldValues)
        .map(fieldId => {
          const field = customFields.find(f => f.id === fieldId);
          return field ? { value: customFieldValues[fieldId], fieldSnapshot: field } : null;
        }).filter(Boolean) as any,
    });

    Alert.alert(
      'Modifiche Salvate',
      `${formData.sku} è stato aggiornato`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  if (!product) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Prodotto non trovato</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: t.spacing.screenPadding,
            paddingBottom: insets.bottom + 80,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Modifica Prodotto</Text>
            <AppIcon name="edit" size={32} color={t.colors.accentInk} />
          </View>

          {/* Images Section - Main Preview */}
          <Text style={styles.sectionTitle}>FOTO PRODOTTO ({images.length}/10)</Text>

          {images.length > 0 && (
            <View style={styles.mainImageContainer}>
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
                  <View key={index} style={styles.mainImageWrapper}>
                    <Image
                      source={{ uri }}
                      style={[styles.mainImage, { width: imageWidth }]}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeMainImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <AppIcon name="delete" size={20} color={t.colors.onData} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>

              {images.length > 1 && (
                <View style={styles.imageIndicator}>
                  <Text style={styles.imageIndicatorText}>
                    {currentImageIndex + 1} / {images.length}
                  </Text>
                </View>
              )}

              {images.length > 1 && (
                <View style={styles.dotsContainer}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dotIndicator,
                        index === currentImageIndex && styles.dotIndicatorActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Thumbnails */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
            {images.map((uri, index) => (
              <Pressable
                key={index}
                style={styles.imageContainer}
                onPress={() => setCurrentImageIndex(index)}
              >
                <Image
                  source={{ uri }}
                  style={[
                    styles.imageThumb,
                    index === currentImageIndex && styles.imageThumbActive,
                  ]}
                  contentFit="cover"
                />
              </Pressable>
            ))}
            {images.length < 10 && (
              <>
                <Pressable style={styles.addImageButton} onPress={pickImages}>
                  <AppIcon name="add-photo-alternate" size={32} color={t.colors.accentInk} />
                  <Text style={styles.addImageText}>Galleria</Text>
                </Pressable>
                <Pressable style={styles.addImageButton} onPress={takePhoto}>
                  <AppIcon name="camera-alt" size={32} color={t.colors.accentInk} />
                  <Text style={styles.addImageText}>Fotocamera</Text>
                </Pressable>
              </>
            )}
          </ScrollView>

          {/* Form Sections */}
          <Text style={styles.sectionTitle}>INFORMAZIONI BASE *</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU / Codice Prodotto</Text>
            <TextInput
              style={styles.input}
              placeholder="es: VIS-001-2024"
              placeholderTextColor={t.colors.placeholder}
              value={formData.sku}
              onChangeText={(value) => updateField('sku', value)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo di Pelle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {FUR_TYPES.map((type) => (
                  <Pressable
                    key={type.id}
                    style={[
                      styles.chip,
                      formData.furType === type.id && styles.chipActive,
                    ]}
                    onPress={() => updateField('furType', type.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.furType === type.id && styles.chipTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Posizione</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                {locations.map((location) => (
                  <Pressable
                    key={location.id}
                    style={[
                      styles.chip,
                      formData.location === location.id && styles.chipActive,
                    ]}
                    onPress={() => updateField('location', location.id)}
                  >
                    <View style={[styles.chipDot, { backgroundColor: location.color }]} />
                    <Text
                      style={[
                        styles.chipText,
                        formData.location === location.id && styles.chipTextActive,
                      ]}
                    >
                      {location.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cartella</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chipContainer}>
                <Pressable
                  style={[
                    styles.chip,
                    !formData.libraryId && styles.chipActive,
                  ]}
                  onPress={() => updateField('libraryId', '')}
                >
                  <AppIcon name="folder-off" size={16} color={!formData.libraryId ? t.colors.chipActiveText : t.colors.chipText} />
                  <Text style={[styles.chipText, !formData.libraryId && styles.chipTextActive]}>
                    Nessuna
                  </Text>
                </Pressable>

                {libraries.map((lib) => (
                  <Pressable
                    key={lib.id}
                    style={[
                      styles.chip,
                      formData.libraryId === lib.id && styles.chipActive,
                    ]}
                    onPress={() => updateField('libraryId', lib.id)}
                  >
                    <AppIcon
                      name={lib.icon as any}
                      size={16}
                      color={formData.libraryId === lib.id ? t.colors.chipActiveText : t.colors.chipText}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        formData.libraryId === lib.id && styles.chipTextActive,
                      ]}
                    >
                      {lib.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          <Text style={styles.sectionTitle}>PREZZI</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Prezzo Acquisto (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="2500"
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={formData.purchasePrice}
                onChangeText={(value) => updateField('purchasePrice', value)}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Prezzo Vendita (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="4200"
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={formData.sellPrice}
                onChangeText={(value) => updateField('sellPrice', value)}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>MISURE</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              <Text style={styles.label}>Lunghezza (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="85"
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={formData.length}
                onChangeText={(value) => updateField('length', value)}
              />
            </View>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              <Text style={styles.label}>Larghezza (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="120"
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={formData.width}
                onChangeText={(value) => updateField('width', value)}
              />
            </View>
            <View style={[styles.inputGroup, styles.thirdWidth]}>
              <Text style={styles.label}>Peso (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="1.2"
                placeholderTextColor={t.colors.placeholder}
                keyboardType="numeric"
                value={formData.weight}
                onChangeText={(value) => updateField('weight', value)}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>NOTE TECNICHE</Text>

          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Inserisci dettagli tecnici, tipo di cucitura, caratteristiche speciali..."
              placeholderTextColor={t.colors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.technicalNotes}
              onChangeText={(value) => updateField('technicalNotes', value)}
            />
          </View>

          {/* Custom Fields Section - Only show fields that exist in this product */}
          {(() => {
            // Get the field IDs that this product actually has
            const productFieldIds = product?.customData?.map(d => d.fieldSnapshot?.id).filter(Boolean) || [];
            // Filter to only show fields that exist in the product
            const existingFields = customFields.filter(f => productFieldIds.includes(f.id));

            if (existingFields.length === 0) return null;

            const getDynamicOptionsList = (cf: any) => {
              if (cf.linkTo === 'locations') return locations.map((l: any) => ({ id: l.id, label: l.label }));
              if (cf.linkTo === 'libraries') return libraries.map((l: any) => ({ id: l.id, label: l.name }));
              if (cf.linkTo === 'furType') return FUR_TYPES.map((f: any) => ({ id: f.id, label: f.label }));

              return cf.dataset && Array.isArray(cf.dataset)
                ? cf.dataset.map((val: string, i: number) => ({ id: `ds_${i}`, label: String(val) }))
                : cf.options || [];
            };

            return (
              <>
                <Text style={styles.sectionTitle}>CAMPI PERSONALIZZATI</Text>

                {/* Quick Settings Grid for Choice Fields */}
                {existingFields.filter(f => f.type === 'single_choice' || f.type === 'multi_choice').length > 0 && (
                  <View style={styles.quickSettingsContainer}>
                    {existingFields.filter(f => f.type === 'single_choice' || f.type === 'multi_choice').map((field) => {
                      if (field.uiType === 'picker' || field.uiType === 'modal_list') {
                        const optionsList = getDynamicOptionsList(field);
                        const isMulti = field.type === 'multi_choice';
                        const val = customFieldValues[field.id];
                        const displayValue = isMulti
                          ? (val?.length ? `${val.length} selezionati` : 'Seleziona...')
                          : (val || 'Seleziona...');

                        return (
                          <View key={field.id} style={styles.inputGroup}>
                            <Text style={styles.label}>{field.name}{field.required && ' *'}</Text>
                            <Pressable
                              style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                              onPress={() => setSelectModalConfig({ fieldId: field.id, name: field.name, options: optionsList, isMulti })}
                            >
                              <Text style={{ color: val && (!isMulti || val.length > 0) ? t.colors.inputText : t.colors.placeholder, fontSize: 16 }}>
                                {displayValue}
                              </Text>
                              <AppIcon name="keyboard-arrow-down" size={24} color={t.colors.fieldIcon} />
                            </Pressable>
                          </View>
                        );
                      }

                      return (
                        <View key={field.id} style={styles.quickSettingsGroup}>
                          <Text style={styles.quickSettingsLabel}>
                            {field.name}{field.required && ' *'}
                          </Text>
                          <View style={styles.quickSettingsGrid}>
                            {getDynamicOptionsList(field).map((option: any) => {
                              const isSelected = field.type === 'single_choice'
                                ? customFieldValues[field.id] === option.id || customFieldValues[field.id] === option.label
                                : (customFieldValues[field.id] || []).includes(option.id) || (customFieldValues[field.id] || []).includes(option.label);

                              return (
                                <Pressable
                                  key={option.id}
                                  style={[
                                    styles.quickSettingsTile,
                                    isSelected && styles.quickSettingsTileActive,
                                  ]}
                                  onPress={() => {
                                    const valToSave = option.label || option.id;
                                    if (field.type === 'single_choice') {
                                      setCustomFieldValues(prev => ({
                                        ...prev,
                                        [field.id]: isSelected ? null : valToSave
                                      }));
                                    } else {
                                      const current = customFieldValues[field.id] || [];
                                      const updated = isSelected
                                        ? current.filter((id: string) => id !== option.id && id !== valToSave)
                                        : [...current, valToSave];
                                      setCustomFieldValues(prev => ({ ...prev, [field.id]: updated }));
                                    }
                                  }}
                                >
                                  <View style={[
                                    styles.quickSettingsIconContainer,
                                    isSelected && styles.quickSettingsIconContainerActive,
                                  ]}>
                                    <AppIcon
                                      name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
                                      size={28}
                                      color={isSelected ? t.colors.onAccent : t.colors.textSecondary}
                                    />
                                  </View>
                                  <Text style={[
                                    styles.quickSettingsTileText,
                                    isSelected && styles.quickSettingsTileTextActive,
                                  ]} numberOfLines={2}>
                                    {option.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Input Fields for Text/Number/Document Types */}
                {existingFields.filter(f => !['single_choice', 'multi_choice'].includes(f.type)).map((field) => {
                  if (field.type === 'document' || field.uiType === 'document') {
                    const docs = customFieldValues[field.id] || [];
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        <Text style={styles.label}>{field.name}{field.required && ' *'}</Text>
                        <View style={{ gap: 8 }}>
                          {docs.map((docUri: string, index: number) => (
                            <Pressable key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: t.colors.border }} onPress={() => (/^https?:\/\//i.test(docUri) ? Linking.openURL(docUri) : Sharing.shareAsync(docUri)).catch(console.error)}>
                              <AppIcon name="insert-drive-file" size={24} color={t.colors.accentInk} />
                              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: t.colors.textPrimary }} numberOfLines={1}>{docUri.split('/').pop() || 'Documento'}</Text>
                              <Pressable onPress={() => {
                                const newDocs = [...docs];
                                newDocs.splice(index, 1);
                                setCustomFieldValues(prev => ({ ...prev, [field.id]: newDocs }));
                              }}>
                                <AppIcon name="delete" size={24} color={t.colors.error} />
                              </Pressable>
                            </Pressable>
                          ))}
                          <Pressable
                            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: t.colors.accent, backgroundColor: withAlpha(t.colors.accent, 0.063), marginTop: 4 }}
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
                            <Text style={{ marginLeft: 8, color: t.colors.accentInk, fontWeight: 'bold' }}>Allega Documento</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  if (field.type === 'images') {
                    const customImages = customFieldValues[field.id] || [];
                    return (
                      <View key={field.id} style={styles.inputGroup}>
                        <Text style={styles.label}>{field.name}{field.required && ' *'}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                          {customImages.map((uri: string, index: number) => (
                            <View key={index} style={{ marginRight: 8, position: 'relative' }}>
                              <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" />
                              <Pressable
                                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: t.colors.scrim, borderRadius: 12, padding: 4 }}
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
                              style={{ width: 80, height: 80, backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.dash, borderRadius: 12, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}
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
                              <AppIcon name="add-a-photo" size={24} color={t.colors.accentInk} />
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
                        <Text style={styles.label}>{field.name}{field.required && ' *'}</Text>
                        <Pressable
                          style={[styles.quickSettingsInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                          onPress={() => setShowDatePickerMap(prev => ({ ...prev, [field.id]: true }))}
                        >
                          <Text style={{ color: val ? t.colors.inputText : t.colors.placeholder, fontSize: 16 }}>
                            {val ? new Date(val).toLocaleDateString('it-IT') : `Seleziona Data`}
                          </Text>
                          <AppIcon name="calendar-today" size={24} color={t.colors.fieldIcon} />
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
                      <View key={field.id} style={styles.quickSettingsInputCard}>
                        <Text style={styles.quickSettingsInputLabel}>
                          {field.name}{field.required && ' *'}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                          <TextInput
                            style={[styles.quickSettingsInput, { flex: 1, marginTop: 0 }]}
                            placeholder={`Scan or enter ${field.name.toLowerCase()}`}
                            placeholderTextColor={t.colors.textMuted}
                            value={customFieldValues[field.id]?.toString() || ''}
                            onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                          />
                          <Pressable
                            style={{ padding: 12, backgroundColor: t.colors.surface, borderRadius: 8, borderWidth: 1, borderColor: t.colors.border, alignItems: 'center', justifyContent: 'center' }}
                            onPress={() => setCustomFieldValues(prev => ({ ...prev, [field.id]: `SCAN-${Math.floor(Math.random() * 10000)}` }))}
                          >
                            <AppIcon name="qr-code-scanner" size={24} color={t.colors.accentInk} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  }

                  return (
                    <View key={field.id} style={styles.quickSettingsInputCard}>
                      <View style={styles.quickSettingsInputHeader}>
                        <View style={styles.quickSettingsInputIcon}>
                          <AppIcon
                            name={
                              // Icon priority: Layout Override > Custom Field Definition > Type Default
                              (() => {
                                const layoutField = layout.fields.find(lf => lf.id === field.id);
                                if (layoutField?.icon) return layoutField.icon;

                                if (field.icon) return field.icon;

                                switch (field.type) {
                                  case 'number': return 'tag';
                                  case 'currency': return 'euro';
                                  case 'text_long': return 'notes';
                                  default: return 'short-text';
                                }
                              })() as any
                            }
                            size={20}
                            color={t.colors.accentInk}
                          />
                        </View>
                        <Text style={styles.quickSettingsInputLabel}>
                          {field.name}{field.required && ' *'}
                        </Text>
                        {field.unit && (
                          <View style={styles.unitBadge}>
                            <Text style={styles.unitBadgeText}>{field.unit}</Text>
                          </View>
                        )}
                      </View>
                      {field.type === 'text_long' ? (
                        <TextInput
                          style={[styles.quickSettingsInput, styles.quickSettingsTextArea]}
                          placeholder={`Inserisci ${field.name.toLowerCase()}...`}
                          placeholderTextColor={t.colors.textMuted}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                          value={customFieldValues[field.id] || ''}
                          onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                        />
                      ) : (
                        <TextInput
                          style={styles.quickSettingsInput}
                          placeholder={
                            field.type === 'number' ? '0' :
                              field.type === 'currency' ? '€ 0,00' : `Inserisci...`
                          }
                          placeholderTextColor={t.colors.textMuted}
                          keyboardType={field.type === 'number' || field.type === 'currency' ? 'numeric' : 'default'}
                          value={customFieldValues[field.id]?.toString() || ''}
                          onChangeText={(value) => setCustomFieldValues(prev => ({ ...prev, [field.id]: value }))}
                        />
                      )}
                    </View>
                  );
                })}
              </>
            );
          })()}
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.actionButtonSecondary} onPress={() => router.back()}>
            <Text style={styles.actionButtonTextSecondary}>Annulla</Text>
          </Pressable>
          <Pressable style={styles.actionButtonPrimary} onPress={handleSave}>
            <AppIcon name="save" size={20} color={t.colors.onButton} />
            <Text style={styles.actionButtonTextPrimary}>Salva Modifiche</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Select Modal */}
      {selectModalConfig && (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setSelectModalConfig(null)}>
          <View style={{ flex: 1, backgroundColor: t.colors.scrim, justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: t.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ ...t.typography.h3 }}>{selectModalConfig.name}</Text>
                <Pressable onPress={() => setSelectModalConfig(null)}>
                  <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectModalConfig.options.map(opt => {
                  const valToSave = opt.label || opt.id;
                  const isSelected = selectModalConfig.isMulti
                    ? (customFieldValues[selectModalConfig.fieldId] || []).includes(valToSave)
                    : customFieldValues[selectModalConfig.fieldId] === valToSave;

                  return (
                    <Pressable
                      key={opt.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: t.colors.border
                      }}
                      onPress={() => {
                        if (selectModalConfig.isMulti) {
                          const current = customFieldValues[selectModalConfig.fieldId] || [];
                          const updated = isSelected
                            ? current.filter((v: string) => v !== valToSave)
                            : [...current, valToSave];
                          setCustomFieldValues(prev => ({ ...prev, [selectModalConfig.fieldId]: updated }));
                        } else {
                          setCustomFieldValues(prev => ({ ...prev, [selectModalConfig.fieldId]: isSelected ? null : valToSave }));
                          setSelectModalConfig(null);
                        }
                      }}
                    >
                      <Text style={{ fontSize: 16, color: isSelected ? t.colors.accentInk : t.colors.textPrimary, fontWeight: isSelected ? '600' : '400' }}>
                        {opt.label}
                      </Text>
                      {isSelected && <AppIcon name="check" size={24} color={t.colors.accentInk} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
              {selectModalConfig.isMulti && (
                <Pressable
                  style={{ backgroundColor: t.colors.button, padding: 16, borderRadius: t.radius.button, alignItems: 'center', marginTop: 16 }}
                  onPress={() => setSelectModalConfig(null)}
                >
                  <Text style={{ color: t.colors.onButton, fontWeight: 'bold', fontSize: 16 }}>Conferma Selezione</Text>
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
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerTitle: {
    ...t.typography.cardTitle,
    fontSize: 24,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    marginTop: 24,
    marginBottom: 12,
  },
  mainImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  mainImageWrapper: {
    position: 'relative',
  },
  mainImage: {
    height: 280,
    borderRadius: t.radius.large,
    backgroundColor: t.colors.surface,
  },
  removeMainImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.scrimStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: t.colors.scrimStrong,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.medium,
  },
  imageIndicatorText: {
    ...t.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.onData,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotIndicatorActive: {
    backgroundColor: t.colors.accent,
    width: 24,
  },
  imagesScroll: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  imageThumb: {
    width: 80,
    height: 80,
    borderRadius: t.radius.medium,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageThumbActive: {
    borderColor: t.colors.accent,
  },

  addImageButton: {
    width: 80,
    height: 80,
    borderRadius: t.radius.medium,
    backgroundColor: t.colors.surface,
    borderWidth: 2,
    borderColor: t.colors.dash,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addImageText: {
    ...t.typography.caption,
    fontSize: 11,
    marginTop: 4,
    color: t.colors.accentInk,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    ...t.typography.caption,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    padding: 14,
    fontSize: 16,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: t.colors.chip,
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    gap: 6,
  },
  chipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    ...t.typography.caption,
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  chipTextActive: {
    color: t.colors.chipActiveText,
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
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 16,
    backgroundColor: t.colors.background,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  actionButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  actionButtonTextSecondary: {
    ...t.typography.buttonSecondary,
    fontSize: 16,
  },
  actionButtonPrimary: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
  },
  actionButtonTextPrimary: {
    ...t.typography.buttonPrimary,
    fontSize: 16,
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
  // Quick Settings Style - Custom Fields
  quickSettingsContainer: {
    marginBottom: 16,
  },
  quickSettingsGroup: {
    marginBottom: 20,
  },
  quickSettingsLabel: {
    ...t.typography.sectionHeader,
    fontSize: 13,
    marginBottom: 12,
    color: t.colors.textSecondary,
  },
  quickSettingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickSettingsTile: {
    width: '30%',
    minWidth: 100,
    aspectRatio: 1,
    backgroundColor: t.colors.tile,
    borderRadius: t.radius.large,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickSettingsTileActive: {
    backgroundColor: withAlpha(t.colors.accent, 0.145),
    borderColor: t.colors.tileSelectedBorder,
    shadowColor: t.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  quickSettingsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickSettingsIconContainerActive: {
    backgroundColor: t.colors.checkOn,
  },
  quickSettingsTileText: {
    ...t.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  quickSettingsTileTextActive: {
    color: t.colors.tileSelectedText,
  },
  quickSettingsInputCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.medium,
    padding: 16,
    marginBottom: 12,
  },
  quickSettingsInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickSettingsInputIcon: {
    width: 36,
    height: 36,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSettingsInputLabel: {
    ...t.typography.cardTitle,
    fontSize: 14,
    flex: 1,
  },
  unitBadge: {
    backgroundColor: t.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.colors.onAccent,
  },
  quickSettingsInput: {
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.input,
    padding: 14,
    fontSize: 16,
    color: t.colors.inputText,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
  },
  quickSettingsTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
}));
