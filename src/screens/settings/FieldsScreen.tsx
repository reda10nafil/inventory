// FurInventory Pro - Custom Fields Builder Screen with Edit Modal
import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useCustomFields, FieldType, FIELD_TYPE_INFO } from '../../../contexts/CustomFieldsContext';
import { useLayout } from '../../../contexts/LayoutContext';
import { useFurTypes } from '../../../contexts/FurTypesContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { FieldUIType, CustomField } from '../../../types';
import { usage } from '../../../utils/productRules';
import { furTypeDeleteError, furTypeLegacyNames, furTypeNameError, furTypeRenameMessage, furTypeUsage, furTypeUsageText } from '../../../utils/furTypes';
import { fieldOptions, newOptionId, optionDeleteError, optionNameError, optionUsage, retiredNameError, type FieldOption } from '../../../utils/fieldValues';
import { OptionsEditor } from '../../../components/OptionsEditor';
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
  const { appendToLayout } = useLayout();
  const { furTypes, loading: furTypesLoading, addFurType, renameFurType, deleteFurType } = useFurTypes();
  const { products } = useInventory();
  const route = useRoute();

  // Valori del campo Base «Tipo di pelle» (C2, ticket 21): la sua matita apre solo questo editor (nome, tipo e icona
  // del campo restano fissi). L'indirizzo `settings/categories` (Impostazioni › Tipi di pelle fino a C1) apre la
  // schermata con l'editor già aperto. Stessa lista e stessa chiave di prima (`useFurTypes`); i prodotti salvano l'id.
  const [showFurTypes, setShowFurTypes] = useState(route.name === 'SettingsCategories');
  const furTypeUsed = (id: string) => usage(products, { furType: id });
  // VAL: anche i campi con «Sorgente Dati: Tipi di pelle» usano un tipo (con l'id, o col nome scritto prima)
  const furTypeInUse = (id: string) => furTypeUsage(products, furTypes.find((f) => f.id === id) ?? { id, label: id });
  const handleRenameFurType = async (id: string, label: string) => {
    const old = furTypes.find((f) => f.id === id)?.label ?? id;
    const legacy = furTypeLegacyNames(products, customFields, { id, label: old });
    await renameFurType(id, label);
    Alert.alert('Fatto', furTypeRenameMessage(old, label, furTypeUsed(id), legacy));
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [selectedBaseType, setSelectedBaseType] = useState<FieldType | null>(null);
  const [selectedUIType, setSelectedUIType] = useState<FieldUIType | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string>('tune');
  const [fieldName, setFieldName] = useState('');
  const [fieldUnit, setFieldUnit] = useState('');

  const [stepperOptions, setStepperOptions] = useState({ min: '0', max: '100', step: '1' });
  // Valori di un campo a scelta (VAL, CAM-F1): bozza a id stabili, salvata con «Aggiorna» / «Salva Campo»
  const [options, setOptions] = useState<FieldOption[]>([]);
  // Nome scritto nell'editor dei valori e non ancora aggiunto o salvato: «Aggiorna» non lo deve perdere
  const [pendingName, setPendingName] = useState(false);
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
    setOptions([]);
    setPendingName(false);
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

    if (field.type === 'single_choice' || field.type === 'multi_choice') {
      setOptions(fieldOptions(field));
    } else if (field.dataset && typeof field.dataset === 'object' && !Array.isArray(field.dataset)) {
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
    let savedOptions: FieldOption[] | undefined = undefined;

    if (baseType === 'single_choice' || baseType === 'multi_choice') {
      if (!linkTo) {
        if (pendingName) {
          Alert.alert('Nome non salvato', 'Nei valori c\'è un nome scritto e non ancora salvato: tocca «Salva nome» (o «Aggiungi valore») per tenerlo, oppure «Annulla».');
          return;
        }
        if (options.length === 0) {
          Alert.alert('Errore', 'Aggiungi almeno una opzione nel Dataset oppure seleziona una Sorgente Dati dinamica');
          return;
        }
        // Gli id restano quelli di prima (mai rinumerati: i prodotti li salvano); `dataset` allineato alle etichette
        dataset = options.map((o) => o.label);
        savedOptions = options;
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
      options: savedOptions,
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
      // Campo nuovo: nel registro e in fondo al modulo Aggiungi, così si vede subito (P11)
      const created = await addField(payload);
      await appendToLayout([created.id]);
      Alert.alert('Successo', `Campo "${name}" creato e aggiunto in fondo al modulo Aggiungi. Puoi spostarlo da Configura Layout Aggiungi.`);
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

  // Uso di un valore nei prodotti (anche salvato con l'etichetta di prima): un valore usato non si elimina
  const optionUsed = (id: string) => (editingField ? optionUsage(products, editingField, id) : { active: 0, trashed: 0 });

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
                  {!field.linkTo && (field.type === 'single_choice' || field.type === 'multi_choice') && fieldOptions(field).length > 0 && (
                    <Text style={styles.fieldOptions} numberOfLines={1}>
                      Valori: {fieldOptions(field).map((o) => o.label).join(', ')}
                    </Text>
                  )}
                  {field.isSystem && field.id === 'furType' && (
                    <Text style={styles.fieldOptions} numberOfLines={1}>
                      Valori: {furTypes.map((v) => v.label).join(', ')}
                    </Text>
                  )}
                </View>

                {/* Campo Base «Tipo di pelle»: la matita apre solo i suoi valori (C2) */}
                {field.isSystem && field.id === 'furType' && (
                  <View style={styles.fieldActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => setShowFurTypes(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`Modifica i valori di ${field.name}`}
                    >
                      <AppIcon name="edit" size={18} color={t.colors.accentInk} />
                    </Pressable>
                  </View>
                )}

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
                        { id: 'libraries', label: 'Libreria Categorie' },
                        { id: 'furType', label: 'Libreria Tipi di pelle' },
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

                    {/* Valori a id stabili (VAL, CAM-F1): rinominare cambia solo l'etichetta, i prodotti restano collegati */}
                    {!linkTo && (
                      <>
                        <Text style={styles.inputLabel}>Valori da scegliere</Text>
                        <OptionsEditor
                          options={options}
                          usedBy={(id) => furTypeUsageText(optionUsed(id))}
                          nameError={(label, editingId) => optionNameError(label, options, editingId) ?? retiredNameError(label, products, editingField, options, editingId)}
                          deleteError={(id) => optionDeleteError(options, id, optionUsed(id))}
                          onAdd={(label) => setOptions((prev) => [...prev, { id: newOptionId(prev), label }])}
                          onRename={(id, label) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)))}
                          onDelete={(id) => setOptions((prev) => prev.filter((o) => o.id !== id))}
                          onPendingChange={setPendingName}
                          placeholder="Es. S, M, L"
                          hint="Tocca un valore per rinominarlo: i prodotti che lo usano restano collegati e mostrano il nome nuovo. Un valore usato da un prodotto, anche venduto o nel cestino, non si elimina. Le modifiche valgono con «Aggiorna»."
                        />
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

      {/* VALORI DI «TIPO DI PELLE» (C2): id stabili, i prodotti seguono il nome nuovo */}
      <Modal
        visible={showFurTypes}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFurTypes(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowFurTypes(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Chiudi i valori di Tipo di pelle">
              <AppIcon name="close" size={24} color={t.colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>Tipo di pelle</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 24 }}>
            <Text style={styles.valuesIntro}>
              Valori del campo Base, da scegliere in Aggiungi e in Modifica. Nome, tipo e icona del campo restano fissi.
            </Text>
            {/* Finché la lista salvata non è letta si aspetta: un valore aggiunto partirebbe dai predefiniti */}
            {furTypesLoading ? <ActivityIndicator size="large" color={t.colors.accentInk} /> : <OptionsEditor
              options={furTypes}
              usedBy={(id) => furTypeUsageText(furTypeInUse(id))}
              nameError={(label, editingId) => furTypeNameError(label, furTypes, editingId)}
              deleteError={(id) => furTypeDeleteError(furTypes, id, furTypeInUse(id))}
              onAdd={async (label) => { await addFurType(label); Alert.alert('Fatto', `«${label}» aggiunto ai tipi di pelle`); }}
              onRename={handleRenameFurType}
              onDelete={deleteFurType}
              placeholder="Es. Lapin, Castoro, Montone"
              hint="Tocca un valore per rinominarlo: i prodotti che lo usano restano collegati e mostrano il nome nuovo. Un valore usato da un prodotto, anche venduto o nel cestino, non si elimina."
            />}
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
  modalHeaderSpacer: { width: 24 },
  valuesIntro: { ...t.typography.caption, fontSize: 13, lineHeight: 18, marginBottom: 16 },
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

  requiredToggle: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 16, marginBottom: 40 },
  requiredToggleText: { ...t.typography.body, fontSize: 15 },
}));
