// FurInventory Pro - Custom Fields Builder Screen with Edit Modal
import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomFields, FieldType, FIELD_TYPE_INFO } from '../../../contexts/CustomFieldsContext';
import { FieldUIType, CustomField } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';

const COMMON_ICONS = [
  'tune', 'text-fields', 'tag', 'calendar-today', 'image', 'list', 'check-box',
  'attach-money', 'straighten', 'place', 'description', 'person', 'local-shipping',
  'palette', 'architecture', 'speed', 'inventory', 'qr-code', 'category', 'sell',
  'star', 'diamond', 'watch', 'devices', 'local-bar', 'science', 'brush',
  'visibility', 'eco', 'fitness-center', 'layers', 'verified', 'ac-unit',
  'wb-sunny', 'style', 'fingerprint', 'medication', 'public', 'thermostat',
];

export default function CustomFieldsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { customFields, loading, addField, deleteField, updateField } = useCustomFields();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedBaseType, setSelectedBaseType] = useState<FieldType | null>(null);
  const [selectedUIType, setSelectedUIType] = useState<FieldUIType | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('tune');
  const [fieldName, setFieldName] = useState('');
  const [fieldUnit, setFieldUnit] = useState('');

  const [stepperOptions, setStepperOptions] = useState({ min: '0', max: '100', step: '1' });
  const [options, setOptions] = useState<string[]>(['']);
  const [isRequired, setIsRequired] = useState(false);

  // Advanced Inteligence Features
  const [isBarcode, setIsBarcode] = useState(false);
  const [linkTo, setLinkTo] = useState<'locations' | 'libraries' | 'furType' | null>(null);

  const resetForm = () => {
    setSelectedBaseType(null);
    setSelectedUIType(null);
    setSelectedIcon('tune');
    setFieldName('');
    setFieldUnit('');
    setStepperOptions({ min: '0', max: '100', step: '1' });
    setIsRequired(false);
    setOptions(['']);
    setIsBarcode(false);
    setLinkTo(null);
    setEditingField(null);
  };

  const openEditModal = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.name);
    setSelectedBaseType(field.type);
    setSelectedUIType(field.uiType);
    setSelectedIcon(field.icon || 'tune');
    setFieldUnit(field.unit || '');
    setIsRequired(field.required);
    setIsBarcode(field.isBarcode || false);
    setLinkTo(field.linkTo || null);

    if (field.dataset && Array.isArray(field.dataset)) {
      setOptions(field.dataset);
    } else if (field.dataset && typeof field.dataset === 'object') {
      setStepperOptions({
        min: String(field.dataset.min ?? '0'),
        max: String(field.dataset.max ?? '100'),
        step: String(field.dataset.step ?? '1'),
      });
    }

    setShowAddModal(true);
  };

  const handleSaveField = async () => {
    if (!selectedBaseType || !fieldName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del campo e scegli un tipo');
      return;
    }

    const name = fieldName.trim();
    const baseType = selectedBaseType;
    let finalUIType = selectedUIType || 'text';

    if (baseType === 'single_choice' && !selectedUIType) finalUIType = 'grid';
    if (baseType === 'multi_choice' && !selectedUIType) finalUIType = 'grid';
    if (baseType === 'document') finalUIType = 'document';
    if (baseType === 'date' && !selectedUIType) finalUIType = 'date';
    if (baseType === 'images') finalUIType = 'images';

    let dataset: any = null;
    let fieldOptions: any = undefined;

    if (baseType === 'single_choice' || baseType === 'multi_choice') {
      if (!linkTo) {
        const validOptions = options.map(o => o.trim()).filter(Boolean);
        if (validOptions.length === 0) {
          Alert.alert('Errore', 'Aggiungi almeno una opzione nel Dataset oppure seleziona una Sorgente Dati dinamica');
          return;
        }
        dataset = validOptions;
        fieldOptions = validOptions.map((o, i) => ({ id: `opt_${i}`, label: o }));
      }
    } else if (finalUIType === 'stepper') {
      dataset = {
        min: parseFloat(stepperOptions.min) || 0,
        max: parseFloat(stepperOptions.max) || 100,
        step: parseFloat(stepperOptions.step) || 1,
      };
    }

    const payload = {
      name,
      type: baseType,
      uiType: finalUIType,
      dataset,
      options: fieldOptions,
      required: isRequired,
      icon: selectedIcon,
      unit: fieldUnit || undefined,
      isBarcode: isBarcode ? true : undefined,
      linkTo: linkTo || undefined,
    };

    if (editingField) {
      // Update existing field
      await updateField(editingField.id, payload);
      Alert.alert('Successo', `Campo "${name}" aggiornato!`);
    } else {
      // Add new field
      await addField(payload);
      Alert.alert('Successo', `Campo "${name}" creato nel Registro!`);
    }

    resetForm();
    setShowAddModal(false);
  };

  const handleDeleteField = (field: CustomField) => {
    Alert.alert(
      'Sposta nel Cestino',
      `Il campo "${field.name}" verrà spostato nel cestino. Potrai ripristinarlo in qualsiasi momento.`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Cestina', style: 'destructive', onPress: () => deleteField(field.id) },
      ]
    );
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={styles.container}>
        <Backdrop />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={t.colors.accentInk} />
          <Text style={styles.loadingText}>Caricamento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.screenPadding,
          paddingBottom: insets.bottom + 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Existing Fields Section */}
        {customFields.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Campi attivi ({customFields.length})</Text>
            {customFields.map((field) => (
              <View key={field.id} style={styles.fieldCard}>
                <View style={styles.fieldIcon}>
                  <AppIcon
                    name={field.icon as any || 'text-fields'}
                    size={24}
                    color={field.isSystem ? t.colors.textSecondary : t.colors.accentInk}
                  />
                </View>
                <View style={styles.fieldContent}>
                  <View style={styles.fieldHeader}>
                    <Text style={styles.fieldName}>{field.name}</Text>
                    {field.isSystem && (
                      <View style={styles.systemBadge}>
                        <Text style={styles.systemBadgeText}>Base</Text>
                      </View>
                    )}
                    {field.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Obblig</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.fieldType}>
                    {FIELD_TYPE_INFO[field.type]?.label} {field.uiType && !field.isSystem ? `(UI: ${field.uiType})` : ''}
                    {field.unit ? ` • ${field.unit}` : ''}
                  </Text>
                  {field.dataset && Array.isArray(field.dataset) && (
                    <Text style={styles.fieldOptions} numberOfLines={1}>
                      Valori: {field.dataset.join(', ')}
                    </Text>
                  )}
                </View>

                {/* Edit & Delete buttons for non-system fields */}
                {!field.isSystem && (
                  <View style={styles.fieldActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openEditModal(field)}
                    >
                      <AppIcon name="edit" size={18} color={t.colors.accentInk} />
                    </Pressable>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={() => handleDeleteField(field)}
                    >
                      <AppIcon name="delete" size={18} color={t.colors.error} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Add Field Button */}
        <Pressable
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <AppIcon name="add-circle" size={24} color={t.colors.onButton} />
          <Text style={styles.addButtonText}>Crea Nuovo Campo</Text>
        </Pressable>

        <View style={styles.infoCard}>
          <AppIcon name="security" size={24} color={t.colors.accentInk} />
          <Text style={styles.infoText}>
            Immutabilità Storica Attiva: Se elimini un campo, finirà nel Cestino.
            I prodotti già generati continueranno a visualizzarlo nei loro dettagli.
          </Text>
        </View>
      </ScrollView>

      {/* FIELD BUILDER / EDITOR MODAL */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          resetForm();
          setShowAddModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { resetForm(); setShowAddModal(false); }}>
              <AppIcon name="close" size={24} color={t.colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editingField ? 'Modifica Campo' : 'Field Builder'}
            </Text>
            <Pressable onPress={handleSaveField}>
              <Text style={styles.saveButton}>
                {editingField ? 'Aggiorna' : 'Salva Campo'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>

            {/* 1. SELEZIONE TIPO BASE */}
            {!selectedBaseType ? (
              <>
                <Text style={styles.modalSectionTitle}>Tipi di campo disponibili</Text>
                {Object.entries(FIELD_TYPE_INFO).map(([key, info]) => (
                  <Pressable
                    key={key}
                    style={styles.typeOption}
                    onPress={() => {
                      setSelectedBaseType(key as FieldType);
                      setSelectedIcon(info.icon);
                    }}
                  >
                    <View style={styles.typeOptionIcon}>
                      <AppIcon name={info.icon as any} size={24} color={t.colors.accentInk} />
                    </View>
                    <View style={styles.typeOptionContent}>
                      <Text style={styles.typeOptionLabel}>{info.label}</Text>
                      <Text style={styles.typeOptionDesc}>{info.description}</Text>
                    </View>
                    <AppIcon name="add-circle" size={24} color={t.colors.accentInk} />
                  </Pressable>
                ))}
              </>
            ) : (
              /* 2. CONFIGURAZIONE CAMPO */
              <>
                <View style={styles.selectedTypeHeader}>
                  <AppIcon
                    name={FIELD_TYPE_INFO[selectedBaseType].icon as any}
                    size={32}
                    color={t.colors.accentInk}
                  />
                  <Text style={styles.selectedTypeLabel}>
                    {FIELD_TYPE_INFO[selectedBaseType].label}
                  </Text>
                  {!editingField && (
                    <Pressable
                      style={styles.changeTypeButton}
                      onPress={() => setSelectedBaseType(null)}
                    >
                      <Text style={styles.changeTypeText}>Cambia</Text>
                    </Pressable>
                  )}
                </View>

                {/* A. NOME CAMPO */}
                <Text style={styles.inputLabel}>Nome del Campo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es: Taglia Pantalone, PDF Manuale"
                  placeholderTextColor={t.colors.placeholder}
                  value={fieldName}
                  onChangeText={setFieldName}
                />

                {/* A2. UNITÀ DI MISURA (for number/currency) */}
                {(selectedBaseType === 'number' || selectedBaseType === 'currency') && (
                  <>
                    <Text style={styles.inputLabel}>Unità di Misura (opzionale)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Es: cm, kg, €, ml"
                      placeholderTextColor={t.colors.placeholder}
                      value={fieldUnit}
                      onChangeText={setFieldUnit}
                    />
                  </>
                )}

                {/* B. ICONA CAMPO */}
                <Text style={styles.inputLabel}>Scegli un'icona</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                  {COMMON_ICONS.map(icon => (
                    <Pressable
                      key={icon}
                      onPress={() => setSelectedIcon(icon)}
                      style={[styles.iconTile, selectedIcon === icon && styles.iconTileSelected]}
                    >
                      <AppIcon name={icon as any} size={24} color={selectedIcon === icon ? t.colors.tileSelectedText : t.colors.textSecondary} />
                    </Pressable>
                  ))}
                </ScrollView>

                {/* C. OPZIONI UI SPECIFICHE */}
                {selectedBaseType === 'text_short' && (
                  <View style={styles.datasetBox}>
                    <Text style={styles.inputLabel}>Intelligenza Avanzata</Text>
                    <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }} onPress={() => setIsBarcode(!isBarcode)}>
                      <AppIcon name={isBarcode ? 'qr-code-scanner' : 'qr-code'} size={24} color={isBarcode ? t.colors.checkOn : t.colors.textSecondary} />
                      <Text style={styles.requiredToggleText}>Abilita Scanner Barcode / QR</Text>
                    </Pressable>
                    <Text style={[styles.subtext, { marginTop: 6, marginLeft: 36 }]}>
                      Visualizza un bottone per aprire la fotocamera e scannerizzare direttamente nel campo.
                    </Text>
                  </View>
                )}

                {(selectedBaseType === 'single_choice' || selectedBaseType === 'multi_choice') && (
                  <View style={styles.datasetBox}>
                    <Text style={styles.inputLabel}>Aspetto UI (Opzionale)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                      {['grid', 'segmented', 'picker', 'modal_list'].map(ui => (
                        <Pressable
                          key={ui}
                          onPress={() => setSelectedUIType(ui as FieldUIType)}
                          style={[styles.chip, selectedUIType === ui && styles.chipActive]}
                        >
                          {selectedUIType === ui && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                          <Text style={[styles.chipText, selectedUIType === ui && styles.chipTextActive]}>{ui.toUpperCase()}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    <Text style={styles.inputLabel}>Sorgente Dati (Intelligenza Avanzata)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
                      {[
                        { id: null, label: 'Manuale (Digita tu)' },
                        { id: 'locations', label: 'Libreria Posizioni' },
                        { id: 'libraries', label: 'Libreria Cartelle' },
                        { id: 'furType', label: 'Libreria Categorie' },
                      ].map(l => (
                        <Pressable
                          key={String(l.id)}
                          onPress={() => setLinkTo(l.id as any)}
                          style={[styles.chip, linkTo === l.id && styles.chipActive]}
                        >
                          {linkTo === l.id && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                          <Text style={[styles.chipText, linkTo === l.id && styles.chipTextActive]}>{l.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {!linkTo && (
                      <>
                        <Text style={styles.inputLabel}>Opzioni del menu (Dataset manuale)</Text>
                        {options.map((option, index) => (
                          <View key={index} style={styles.optionRow}>
                            <TextInput
                              style={[styles.input, styles.optionInput]}
                              placeholder={`Valore ${index + 1}`}
                              placeholderTextColor={t.colors.placeholder}
                              value={option}
                              onChangeText={(text) => updateOption(index, text)}
                            />
                            {options.length > 1 && (
                              <Pressable style={styles.removeOptionButton} onPress={() => removeOption(index)}>
                                <AppIcon name="remove-circle" size={24} color={t.colors.error} />
                              </Pressable>
                            )}
                          </View>
                        ))}
                        <Pressable style={styles.addOptionButton} onPress={() => setOptions([...options, ''])}>
                          <AppIcon name="add" size={20} color={t.colors.accentInk} />
                          <Text style={styles.addOptionText}>Aggiungi Opzione</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                {selectedBaseType === 'number' && (
                  <View style={styles.datasetBox}>
                    <Text style={styles.inputLabel}>Contatore UI (Opzionale)</Text>
                    <Pressable
                      onPress={() => setSelectedUIType(selectedUIType === 'stepper' ? null : 'stepper')}
                      style={[styles.chip, selectedUIType === 'stepper' && styles.chipActive, { alignSelf: 'flex-start', marginBottom: 16 }]}
                    >
                      {selectedUIType === 'stepper' && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                      <Text style={[styles.chipText, selectedUIType === 'stepper' && styles.chipTextActive]}>STEPPER (+ / -)</Text>
                    </Pressable>

                    {selectedUIType === 'stepper' && (
                      <View style={styles.datasetBox}>
                        <Text style={styles.inputLabel}>C. Limiti Contatore (Dataset)</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subtext}>Minimo</Text>
                            <TextInput style={styles.input} value={stepperOptions.min} onChangeText={v => setStepperOptions({ ...stepperOptions, min: v })} keyboardType="numeric" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.subtext}>Massimo</Text>
                            <TextInput style={styles.input} value={stepperOptions.max} onChangeText={v => setStepperOptions({ ...stepperOptions, max: v })} keyboardType="numeric" />
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <Pressable style={styles.requiredToggle} onPress={() => setIsRequired(!isRequired)}>
                  <AppIcon
                    name={isRequired ? 'check-box' : 'check-box-outline-blank'}
                    size={24}
                    color={isRequired ? t.colors.checkOn : t.colors.checkRing}
                  />
                  <Text style={styles.requiredToggleText}>Campo obbligatorio in fase di aggiunta</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...t.typography.body, marginTop: 12 },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 24,
    marginBottom: 10,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },

  fieldCard: { ...cardSurface(t), flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  fieldIcon: { width: 48, height: 48, borderRadius: t.radius.iconWrap, backgroundColor: t.colors.iconWrap, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fieldContent: { flex: 1 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  fieldName: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
  systemBadge: { backgroundColor: t.colors.iconWrap, borderRadius: t.radius.badge, paddingHorizontal: 6, paddingVertical: 2 },
  systemBadgeText: { fontSize: 10, color: t.colors.textSecondary, fontWeight: '600' },
  requiredBadge: { backgroundColor: t.colors.warningSoft, borderRadius: t.radius.badge, paddingHorizontal: 6, paddingVertical: 2 },
  requiredText: { fontSize: 10, color: t.colors.warningText, fontWeight: '600' },
  fieldType: { ...t.typography.caption, fontSize: 12 },
  fieldOptions: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, marginTop: 2 },
  fieldActions: { flexDirection: 'row', gap: 4 },
  editButton: { padding: 8, backgroundColor: t.colors.accentSoft, borderRadius: t.radius.inputSmall },
  deleteButton: { padding: 8 },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 54,
    backgroundColor: t.colors.button, borderRadius: t.radius.button, ...t.shadows.button, overflow: 'hidden', padding: 16, marginTop: 16,
  },
  addButtonText: { ...t.typography.buttonPrimary, fontSize: 16, color: t.colors.onButton },
  infoCard: { ...cardSurface(t), flexDirection: 'row', gap: 12, padding: 16, marginTop: 16 },
  infoText: { ...t.typography.caption, fontSize: 13, lineHeight: 18, flex: 1 },

  // Finestra del costruttore: fondo opaco (sta sopra la schermata)
  modalContainer: { flex: 1, backgroundColor: t.colors.backgroundSecondary },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.screenPadding, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.colors.border },
  modalTitle: { ...t.typography.cardTitle, fontSize: 18, fontWeight: t.title.weight, letterSpacing: t.title.tracking },
  saveButton: { color: t.colors.accentInk, fontWeight: '600', fontSize: 16 },
  modalContent: { flex: 1, paddingHorizontal: t.spacing.screenPadding },
  modalSectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 24,
    marginBottom: 12,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },

  typeOption: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  typeOptionIcon: { width: 48, height: 48, borderRadius: t.radius.iconWrap, backgroundColor: t.colors.iconWrap, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  typeOptionContent: { flex: 1 },
  typeOptionLabel: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong, marginBottom: 2 },
  typeOptionDesc: { ...t.typography.caption, fontSize: 12 },

  selectedTypeHeader: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginTop: 24, marginBottom: 8 },
  selectedTypeLabel: { ...t.typography.cardTitle, fontSize: 16, fontWeight: t.weights.strong, flex: 1 },
  changeTypeButton: { padding: 8 },
  changeTypeText: { color: t.colors.accentInk, fontWeight: '600' },

  inputLabel: { fontSize: t.label.size, fontWeight: t.label.weight, color: t.label.color, lineHeight: 18, marginBottom: 6, marginTop: 16 },
  input: { minHeight: t.input.height, backgroundColor: t.colors.input, borderRadius: t.radius.input, paddingHorizontal: 14, fontSize: 15, color: t.colors.inputText, borderWidth: 1, borderColor: t.colors.inputBorder },
  subtext: { ...t.typography.caption, fontSize: 11, marginBottom: 4, color: t.colors.textSecondary },

  // Scelta dell'icona: riquadri come le scelte a riquadri di Aggiungi
  iconTile: { ...tileSurface(t), width: 48, height: 48, borderRadius: t.radius.iconWrap, justifyContent: 'center', alignItems: 'center' },
  iconTileSelected: { backgroundColor: t.colors.tileSelected, borderColor: t.colors.tileSelectedBorder },
  // Pillole (aspetto, sorgente dati, contatore)
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.chip, backgroundColor: t.colors.chip, borderWidth: 1, borderColor: t.colors.chipBorder, overflow: 'hidden' },
  chipActive: { backgroundColor: t.colors.chipActive, borderColor: t.colors.chipActiveBorder },
  chipText: { fontSize: 13, fontWeight: '500', color: t.colors.chipText },
  chipTextActive: { fontWeight: '600', color: t.colors.chipActiveText },

  datasetBox: { ...tileSurface(t), padding: 16, marginTop: 16 },

  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  optionInput: { flex: 1, minWidth: 0 },
  removeOptionButton: { padding: 4 },
  addOptionButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginTop: 8 },
  addOptionText: { color: t.colors.accentInk, fontWeight: '600' },
  requiredToggle: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 16, marginBottom: 40 },
  requiredToggleText: { ...t.typography.body, fontSize: 15 },
}));
