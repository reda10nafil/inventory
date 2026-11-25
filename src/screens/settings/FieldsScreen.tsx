// Campi Personalizzati (Impostazioni › Campi): l'elenco dei campi e l'editor del campo in **tre domande** (EDC, ticket
// 23): 1. che cosa contiene (Testo breve, Testo lungo, Numero o misura, Prezzo, Data, Sì/No, Scelta da un elenco, Più
// scelte, Foto, Documento); 2. come si compila (lo scrivo io, col lettore, contatore e ruota con da/a/passo, scelgo da un
// elenco o «scelgo o scrivo», da dove vengono i valori); 3. come si vede (riquadri, pillole scorrevoli, menu a tendina,
// elenco dal basso; icona; «Mostra nella card»). Più il valore predefinito e «obbligatorio». Testi in italiano semplice
// (CAM-F9). Il tipo si cambia dove i valori salvati si leggono uguali, altrimenti l'editor dice perché no (CAM-F10,
// `typeChangeError`). Le domande 2 e 3 hanno già una risposta: si salva anche subito dopo tipo e nome.
// Campi Base: «Tipo di pelle» apre i suoi valori (C2); Lunghezza, Larghezza e Peso solo «Come si compila» (scrivo o
// ruota, ticket 23 punto 4). Nessun dato riscritto: un campo non toccato tiene `uiType`, le proprietà nuove sono
// facoltative e un campo senza si comporta come prima.
import React, { useState } from 'react';
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
import {
  BASE_LOOK_FIELDS, BASE_LOOKS, baseLook, canShowInCard, choiceLook, defaultOf, fieldOptions, inputMode, isChoiceField, lookFields, newOptionId, optionDeleteError, optionNameError,
  optionUsage, rangeFromText, retiredNameError, SHORT_TEXT_MAX, showInCardError, takesDefault, typeChangeError, type ChoiceLook, type FieldOption,
} from '../../../utils/fieldValues';
import { formatNumber, formatNumberInput, parseNumber } from '../../../utils/number';
import { OptionsEditor } from '../../../components/OptionsEditor';
import { OptionMark } from '../../../components/OptionMark';
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

/** Misure Base che si possono compilare con la ruota (punto 4 del ticket 23); l'altezza è di S2 (ticket 14). */
const BASE_MEASURES = ['length', 'width', 'weight', 'height'];
/** Limiti proposti per la ruota di una misura che non ne ha ancora. */
const RANGE_PROPOSAL = (unit?: string) => (unit === 'kg' ? { min: '0', max: '20', step: '0,1' } : { min: '0', max: '200', step: '1' });

type Compile = 'write' | 'barcode' | 'stepper' | 'wheel' | 'choose' | 'choose_or_write';

/** Seconda domanda: i modi di compilare che il tipo permette (il primo è quello proposto). */
function compileChoices(type: FieldType | null, linked = false): { id: Compile; label: string; hint: string }[] {
  switch (type) {
    case 'text_short':
      return [
        { id: 'write', label: 'Lo scrivo io', hint: 'Una riga, al massimo 100 caratteri.' },
        { id: 'barcode', label: 'Lo leggo col lettore o lo scrivo', hint: 'Accanto al campo c\'è il pulsante del lettore di codici.' },
      ];
    case 'number':
      return [
        { id: 'write', label: 'Lo scrivo io', hint: 'Con la virgola per i decimali, per esempio 12,5.' },
        { id: 'stepper', label: 'Contatore + e −', hint: 'Si tocca + o −: parte dal minimo e va avanti del passo.' },
        { id: 'wheel', label: 'Ruota', hint: 'Per le misure: si sceglie il valore in una fila da «da» ad «a», col passo.' },
      ];
    case 'single_choice':
      return linked
        ? [{ id: 'choose', label: 'Scelgo da un elenco', hint: 'I valori sono quelli della lista dell\'app.' }]
        : [
          { id: 'choose', label: 'Scelgo da un elenco', hint: 'Solo i valori pronti.' },
          { id: 'choose_or_write', label: 'Scelgo o scrivo', hint: 'Si può scrivere un valore che non c\'è: diventa uno dei valori solo se lo confermi.' },
        ];
    case 'multi_choice':
      return [{ id: 'choose', label: 'Scelgo da un elenco', hint: 'Si possono scegliere più valori.' }];
    default:
      return [];
  }
}

/** Seconda domanda per i tipi che si compilano in un modo solo. */
const COMPILE_FIXED: Partial<Record<FieldType, string>> = {
  text_long: 'Si scrive su più righe, senza limite.',
  currency: 'Si scrive il prezzo, con la virgola per i centesimi.',
  date: 'Si sceglie dal calendario.',
  boolean: 'Si tocca «Sì» oppure «No».',
  images: 'Si aggiungono fino a 10 foto.',
  document: 'Si allega un file (PDF, Excel o altro).',
};

// Aspetti delle scelte (richiesta dell'utente del 24): il binario orizzontale è il predefinito delle pillole
const LOOKS: { id: ChoiceLook; label: string }[] = [
  { id: 'chips', label: 'Binario orizzontale' },
  { id: 'wrap', label: 'A capo' },
  { id: 'tiles', label: 'Riquadri' },
  { id: 'list', label: 'Elenco verticale' },
  { id: 'dropdown', label: 'Menu a tendina' },
  { id: 'sheet', label: 'Elenco dal basso' },
  { id: 'wheel', label: 'Ruota' },
];
const lookLabel = (look: ChoiceLook) => LOOKS.find((l) => l.id === look)?.label ?? '';

// Gruppi dell'elenco dei campi, per tipo (richiesta dell'utente del 24), ognuno col numero dei campi
const GROUPS: { id: string; label: string }[] = [
  { id: 'text_short', label: 'Testo breve' },
  { id: 'text_long', label: 'Testo lungo' },
  { id: 'number', label: 'Numero' },
  { id: 'measure', label: 'Misura' },
  { id: 'currency', label: 'Valuta' },
  { id: 'date', label: 'Data' },
  { id: 'choice', label: 'Scelta' },
  { id: 'boolean', label: 'Sì/No' },
  { id: 'images', label: 'Immagini' },
  { id: 'document', label: 'Documenti' },
];
/** Gruppo di un campo: Posizione, Tipo di pelle e Categoria sono scelte; le misure Base e i numeri con l'unità o la
 *  ruota sono misure. */
function groupOf(field: CustomField): string {
  if (field.isSystem && ['furType', 'location', 'folder'].includes(field.id)) return 'choice';
  if (field.isSystem && BASE_MEASURES.includes(field.id)) return 'measure';
  if (field.type === 'number') return field.unit || inputMode(field) === 'wheel' ? 'measure' : 'number';
  if (isChoiceField(field)) return 'choice';
  return GROUPS.some((g) => g.id === field.type) ? field.type : 'text_short';
}

const SOURCES: { id: CustomField['linkTo'] | null; label: string }[] = [
  { id: null, label: 'Li scrivo io' },
  { id: 'locations', label: 'Le posizioni' },
  { id: 'libraries', label: 'Le categorie' },
  { id: 'furType', label: 'I tipi di pelle' },
];

const compileOf = (field: CustomField): Compile => {
  const mode = inputMode(field);
  return mode === 'write' && field.type === 'text_short' && field.isBarcode ? 'barcode' : mode;
};

/** Riga sotto il nome nell'elenco: tipo, modo, aspetto, unità, card (al posto di «(UI: grid)», CAM-F9). */
function fieldSummary(field: CustomField): string {
  const baseChoice = field.isSystem && ['furType', 'location', 'folder'].includes(field.id);
  const parts = [baseChoice ? FIELD_TYPE_INFO.single_choice.label : FIELD_TYPE_INFO[field.type]?.label ?? field.type];
  const compile = compileOf(field);
  if (compile === 'barcode') parts.push('col lettore');
  if (compile === 'stepper') parts.push('contatore');
  if (compile === 'wheel') parts.push('ruota');
  if (compile === 'choose_or_write') parts.push('scelgo o scrivo');
  if (isChoiceField(field) && !field.isSystem) parts.push(lookLabel(choiceLook(field)).toLowerCase());
  if (field.isSystem && BASE_LOOK_FIELDS.includes(field.id)) parts.push(lookLabel(baseLook(field)).toLowerCase());
  if (field.unit) parts.push(field.unit);
  if (field.showInCard) parts.push('nella card');
  return parts.filter(Boolean).join(' · ');
}

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
  // Campo Base: le misure (Lunghezza, Larghezza, Peso) mostrano solo «Come si compila», Posizione solo «Come si vede»
  const [baseKind, setBaseKind] = useState<null | 'compile' | 'look'>(null);
  const baseMode = baseKind !== null;
  // «Cambia tipo» di un campo già salvato: elenco dei tipi con quelli non permessi spiegati (CAM-F10)
  const [choosingType, setChoosingType] = useState(false);
  const [selectedBaseType, setSelectedBaseType] = useState<FieldType | null>(null);
  const [compile, setCompile] = useState<Compile>('write');
  const [look, setLook] = useState<ChoiceLook>('chips');
  const [selectedIcon, setSelectedIcon] = useState<string>('tune');
  const [fieldName, setFieldName] = useState('');
  const [fieldUnit, setFieldUnit] = useState('');

  // Limiti del contatore e della ruota, scritti con la virgola
  const [stepperOptions, setStepperOptions] = useState({ min: '0', max: '100', step: '1' });
  // Valori di un campo a scelta (VAL, CAM-F1): bozza a id stabili, salvata con «Aggiorna» / «Salva Campo»
  const [options, setOptions] = useState<FieldOption[]>([]);
  // Nome scritto nell'editor dei valori e non ancora aggiunto o salvato: «Aggiorna» non lo deve perdere
  const [pendingName, setPendingName] = useState(false);
  const [isRequired, setIsRequired] = useState(false);
  const [linkTo, setLinkTo] = useState<CustomField['linkTo'] | null>(null);
  // Valore predefinito: testo o numero scritto, oppure Sì/No o l'id di un valore
  const [defaultText, setDefaultText] = useState('');
  const [defaultPick, setDefaultPick] = useState<string | boolean | null>(null);
  const [showInCard, setShowInCard] = useState(false);

  const isChoice = selectedBaseType === 'single_choice' || selectedBaseType === 'multi_choice';
  const compileList = compileChoices(selectedBaseType, !!linkTo);

  const resetForm = () => {
    setSelectedBaseType(null);
    setCompile('write');
    setLook('chips');
    setSelectedIcon('tune');
    setFieldName('');
    setFieldUnit('');
    setStepperOptions({ min: '0', max: '100', step: '1' });
    setIsRequired(false);
    setOptions([]);
    setPendingName(false);
    setLinkTo(null);
    setDefaultText('');
    setDefaultPick(null);
    setShowInCard(false);
    setChoosingType(false);
    setBaseKind(null);
    setEditingField(null);
  };

  const closeModal = () => { resetForm(); setShowAddModal(false); };

  const rangeText = (dataset: unknown, fallback: { min: string; max: string; step: string }) => {
    const d = dataset && typeof dataset === 'object' && !Array.isArray(dataset) ? dataset as Record<string, unknown> : null;
    if (!d) return fallback;
    const n = (v: unknown, f: string) => (typeof v === 'number' ? formatNumberInput(v) : typeof v === 'string' && v ? v : f);
    return { min: n(d.min, fallback.min), max: n(d.max, fallback.max), step: n(d.step, fallback.step) };
  };

  const pickType = (type: FieldType) => {
    setSelectedBaseType(type);
    setSelectedIcon(FIELD_TYPE_INFO[type].icon);
    setCompile(compileChoices(type)[0]?.id ?? 'write');
    setLook('chips'); // scelte nuove: binario orizzontale
    setDefaultText('');
    setDefaultPick(null);
  };

  const openEditModal = (field: CustomField) => {
    setEditingField(field);
    setFieldName(field.name);
    setSelectedBaseType(field.type);
    setCompile(compileOf(field));
    setLook(choiceLook(field));
    setSelectedIcon(field.icon || 'tune');
    setFieldUnit(field.unit || '');
    setIsRequired(field.required);
    setLinkTo(field.linkTo || null);
    setShowInCard(!!field.showInCard);
    setDefaultText(typeof field.defaultValue === 'number' ? formatNumberInput(field.defaultValue) : typeof field.defaultValue === 'string' && !isChoiceField(field) ? field.defaultValue : '');
    setDefaultPick(typeof field.defaultValue === 'boolean' || (typeof field.defaultValue === 'string' && isChoiceField(field)) ? field.defaultValue : null);
    if (isChoiceField(field)) setOptions(fieldOptions(field));
    else setStepperOptions(rangeText(field.dataset, { min: '0', max: '100', step: '1' }));
    setShowAddModal(true);
  };

  // Misura Base: «Lo scrivo io» o «Ruota» (con i limiti proposti se non ne ha)
  const openBaseModal = (field: CustomField) => {
    setEditingField(field);
    setBaseKind('compile');
    setFieldName(field.name);
    setSelectedBaseType(field.type);
    setCompile(inputMode(field) === 'wheel' ? 'wheel' : 'write');
    setStepperOptions(rangeText(field.dataset, RANGE_PROPOSAL(field.unit)));
    setShowAddModal(true);
  };

  // Posizione: solo «Come si vede» (binario orizzontale se non è stato scelto altro)
  const openBaseLook = (field: CustomField) => {
    setEditingField(field);
    setBaseKind('look');
    setFieldName(field.name);
    setLook(baseLook(field));
    setShowAddModal(true);
  };

  // Aspetto di «Tipo di pelle», dalla finestra dei suoi valori: vale subito, come i valori
  const furTypeField = customFields.find((f) => f.id === 'furType');
  const setFurTypeLook = (next: ChoiceLook) => updateField('furType', { look: next === 'chips' ? undefined : next as CustomField['look'] });

  // Cambio di tipo scelto in «Cambia tipo»: il modo di compilare resta se il tipo nuovo lo permette
  const changeType = (type: FieldType) => {
    setSelectedBaseType(type);
    const choices = compileChoices(type, !!linkTo);
    if (!choices.some((c) => c.id === compile)) setCompile(choices[0]?.id ?? 'write');
    if (type !== 'single_choice' && typeof defaultPick === 'string') setDefaultPick(null);
    if (!canShowInCard({ type })) setShowInCard(false);
    if (type === 'multi_choice' && look === 'wheel') setLook('chips'); // la ruota sceglie un valore solo
    // Il prezzo è in euro: un'unità di misura non resta; da prezzo a numero non resta «€»
    if (type === 'currency' || (type === 'number' && fieldUnit.trim() === '€')) setFieldUnit('');
    setChoosingType(false);
  };

  const toggleShowInCard = () => {
    if (showInCard) { setShowInCard(false); return; }
    const error = selectedBaseType ? showInCardError(customFields, { id: editingField?.id ?? '', type: selectedBaseType }) : null;
    if (error) { Alert.alert('Mostra nella card', error); return; }
    setShowInCard(true);
  };

  const saveBase = async (field: CustomField) => {
    if (baseKind === 'look') {
      await updateField(field.id, { look: look === 'chips' ? undefined : look as CustomField['look'] });
    } else if (compile === 'wheel') {
      const r = rangeFromText(stepperOptions, true);
      if (!r.ok) { Alert.alert('Ruota da correggere', r.error); return; }
      await updateField(field.id, { input: 'wheel', dataset: r.range });
    } else {
      await updateField(field.id, { input: undefined, dataset: undefined });
    }
    Alert.alert('Successo', `Campo "${field.name}" aggiornato!`);
    closeModal();
  };

  const handleSaveField = async () => {
    if (baseMode && editingField) { await saveBase(editingField); return; }
    if (!selectedBaseType || !fieldName.trim()) {
      Alert.alert('Errore', 'Inserisci il nome del campo e scegli un tipo');
      return;
    }

    const name = fieldName.trim();
    const baseType = selectedBaseType;
    const choice = baseType === 'single_choice' || baseType === 'multi_choice';
    const numeric = baseType === 'number' || baseType === 'currency';
    const mode: Compile = compileChoices(baseType, !!linkTo).some((c) => c.id === compile) ? compile : (compileChoices(baseType, !!linkTo)[0]?.id ?? 'write');

    // Come si vede: lo stesso aspetto di prima non riscrive `uiType` (`segmented`, `modal_list` restano)
    let uiType: FieldUIType = 'text';
    let lookValue: CustomField['look'];
    if (choice) ({ uiType, look: lookValue } = lookFields(look, editingField && isChoiceField(editingField) ? editingField : null));
    else if (baseType === 'number' && mode === 'stepper') uiType = 'stepper';
    else if (baseType === 'document') uiType = 'document';
    else if (baseType === 'images') uiType = 'images';
    else if (baseType === 'date') uiType = 'date';

    let dataset: any = null;
    let savedOptions: FieldOption[] | undefined = undefined;

    if (choice) {
      if (!linkTo) {
        if (pendingName) {
          Alert.alert('Nome non salvato', 'Nei valori c\'è un nome scritto e non ancora salvato: tocca «Salva nome» (o «Aggiungi valore») per tenerlo, oppure «Annulla».');
          return;
        }
        if (options.length === 0) {
          Alert.alert('Errore', 'Aggiungi almeno un valore da scegliere, oppure scegli da dove vengono i valori (posizioni, categorie o tipi di pelle).');
          return;
        }
        // Gli id restano quelli di prima (mai rinumerati: i prodotti li salvano); `dataset` allineato alle etichette
        dataset = options.map((o) => o.label);
        savedOptions = options;
      }
    } else if (baseType === 'number' && (mode === 'stepper' || mode === 'wheel')) {
      const r = rangeFromText(stepperOptions, mode === 'wheel');
      if (!r.ok) { Alert.alert(mode === 'wheel' ? 'Ruota da correggere' : 'Contatore da correggere', r.error); return; }
      dataset = r.range;
    }

    const input: CustomField['input'] = baseType === 'single_choice' && !linkTo && mode === 'choose_or_write' ? 'choose_or_write' : baseType === 'number' && mode === 'wheel' ? 'wheel' : undefined;

    // Valore predefinito, nella forma salvata; uno scritto che non va bene si dice
    let defaultValue: CustomField['defaultValue'];
    if (takesDefault({ type: baseType, linkTo: linkTo || undefined })) {
      if (baseType === 'boolean') defaultValue = typeof defaultPick === 'boolean' ? defaultPick : undefined;
      else if (baseType === 'single_choice') defaultValue = typeof defaultPick === 'string' && (savedOptions ?? []).some((o) => o.id === defaultPick) ? defaultPick : undefined;
      else if (numeric) {
        if (defaultText.trim()) {
          const n = parseNumber(defaultText);
          const ok = n !== undefined && defaultOf({ type: baseType, uiType, input, dataset, defaultValue: n }) !== undefined;
          if (!ok) {
            const why = n === undefined ? 'Scrivi un numero, per esempio 12,5.'
              : mode === 'wheel' ? 'Deve essere uno dei valori della ruota.'
                : `Deve stare tra ${formatNumber(dataset.min)} e ${formatNumber(dataset.max)}.`;
            Alert.alert('Valore predefinito', why);
            return;
          }
          defaultValue = n;
        }
      } else if (defaultText.trim()) defaultValue = baseType === 'text_short' ? defaultText.trim().slice(0, SHORT_TEXT_MAX) : defaultText.trim();
    }

    // «Mostra nella card»: al massimo 2 campi (anche se nel frattempo se n'è acceso un altro)
    const inCard = showInCard && canShowInCard({ type: baseType });
    if (inCard) {
      const error = showInCardError(customFields, { id: editingField?.id ?? '', type: baseType });
      if (error) { Alert.alert('Mostra nella card', error); return; }
    }

    const payload = {
      name,
      type: baseType,
      uiType,
      look: lookValue,
      input,
      dataset,
      options: savedOptions,
      required: isRequired,
      icon: selectedIcon,
      unit: numeric ? (fieldUnit.trim() || undefined) : undefined,
      isBarcode: baseType === 'text_short' && mode === 'barcode' ? true : undefined,
      linkTo: choice ? (linkTo || undefined) : undefined,
      defaultValue,
      showInCard: inCard ? true : undefined,
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

    closeModal();
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

  // Pillola di una scelta dell'editor (modo, aspetto, sorgente, predefinito)
  const pill = (key: string, label: string, on: boolean, onPress: () => void, a11y?: string) => (
    <Pressable key={key} onPress={onPress} style={[styles.chip, on && styles.chipActive]} accessibilityRole="button" accessibilityLabel={a11y}>
      {on && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
      <Text style={[styles.chipText, on && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  // Da, a, passo (contatore e ruota)
  const renderRange = (wheel: boolean) => (
    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
      {([['min', wheel ? 'Da' : 'Minimo'], ['max', wheel ? 'A' : 'Massimo'], ['step', 'Passo']] as const).map(([key, label]) => (
        <View key={key} style={{ flex: 1 }}>
          <Text style={styles.subtext}>{label}</Text>
          <TextInput
            style={styles.input}
            value={stepperOptions[key]}
            onChangeText={(v) => setStepperOptions((prev) => ({ ...prev, [key]: v }))}
            keyboardType="numeric"
            accessibilityLabel={`${label} ${wheel ? 'della ruota' : 'del contatore'}`}
          />
        </View>
      ))}
    </View>
  );

  const compileHint = compileList.find((c) => c.id === compile)?.hint;

  const renderTypeList = (current: CustomField | null) => Object.entries(FIELD_TYPE_INFO).map(([key, info]) => {
    const type = key as FieldType;
    const refused = current ? typeChangeError(current, type, products) : null;
    const isCurrent = current?.type === type || (current && selectedBaseType === type);
    return (
      <Pressable
        key={key}
        style={[styles.typeOption, refused && styles.typeOptionOff, isCurrent && styles.typeOptionOn]}
        disabled={!!refused}
        onPress={() => (current ? changeType(type) : pickType(type))}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!refused }}
      >
        <View style={styles.typeOptionIcon}>
          <AppIcon name={info.icon as any} size={24} color={refused ? t.colors.textMuted : t.colors.accentInk} />
        </View>
        <View style={styles.typeOptionContent}>
          <Text style={[styles.typeOptionLabel, refused && styles.textOff]}>{info.label}</Text>
          <Text style={styles.typeOptionDesc}>{refused ?? info.description}</Text>
        </View>
        {!refused && <AppIcon name={isCurrent ? 'check-circle' : 'add-circle'} size={24} color={t.colors.accentInk} />}
      </Pressable>
    );
  });

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
            {GROUPS.map((group) => ({ group, fields: customFields.filter((f) => groupOf(f) === group.id) })).filter((g) => g.fields.length > 0).map(({ group, fields }) => (
            <View key={group.id} accessibilityLabel={`Gruppo ${group.label}`}>
            <Text style={styles.groupTitle}>{group.label} ({fields.length})</Text>
            {fields.map((field) => (
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
                      <View style={styles.systemBadge} accessibilityLabel="Campo sempre presente">
                        <AppIcon name="lock" size={11} color={t.colors.textSecondary} />
                        <Text style={styles.systemBadgeText}>sempre presente</Text>
                      </View>
                    )}
                    {field.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Obbligatorio</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.fieldType}>{fieldSummary(field)}</Text>
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

                {/* Posizione: la matita apre solo «Come si vede» (binario orizzontale, a capo, elenco, tendina, ruota) */}
                {field.isSystem && field.id === 'location' && (
                  <View style={styles.fieldActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openBaseLook(field)}
                      accessibilityRole="button"
                      accessibilityLabel={`Come si vede ${field.name}`}
                    >
                      <AppIcon name="edit" size={18} color={t.colors.accentInk} />
                    </Pressable>
                  </View>
                )}

                {/* Misure Base: la matita apre solo «Come si compila» (scrivo o ruota, EDC) */}
                {field.isSystem && BASE_MEASURES.includes(field.id) && (
                  <View style={styles.fieldActions}>
                    <Pressable
                      style={styles.editButton}
                      onPress={() => openBaseModal(field)}
                      accessibilityRole="button"
                      accessibilityLabel={`Come si compila ${field.name}`}
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
            Un campo eliminato va nel Cestino e si può ripristinare. I prodotti già salvati continuano a mostrarlo.
          </Text>
        </View>
      </ScrollView>

      {/* EDITOR DEL CAMPO: tre domande */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={closeModal} accessibilityRole="button" accessibilityLabel="Chiudi senza salvare">
              <AppIcon name="close" size={24} color={t.colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {baseMode ? editingField?.name : editingField ? 'Modifica campo' : 'Campo nuovo'}
            </Text>
            <Pressable onPress={handleSaveField}>
              <Text style={styles.saveButton}>
                {editingField ? 'Aggiorna' : 'Salva Campo'}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

            {baseKind === 'look' && editingField ? (
              /* POSIZIONE: solo come si vede */
              <>
                <Text style={styles.modalSectionTitle}>Come si vede?</Text>
                <Text style={styles.subtextLarge}>
                  Campo Base: nome e valori restano quelli di Impostazioni › Posizioni. Vale in Aggiungi e in Modifica. In una colonna da 1/2 o 1/3 del modulo di Aggiungi il binario prende la riga intera; a capo, elenco verticale e ruota si vedono come menu a tendina.
                </Text>
                <View style={styles.chipWrap}>
                  {LOOKS.filter((l) => BASE_LOOKS.includes(l.id)).map((l) => pill(l.id, l.label, look === l.id, () => setLook(l.id)))}
                </View>
              </>
            ) : baseMode && editingField ? (
              /* MISURA BASE: solo come si compila */
              <>
                <Text style={styles.modalSectionTitle}>Come si compila?</Text>
                <Text style={styles.subtextLarge}>
                  Campo Base: nome, tipo e unità ({editingField.unit || '–'}) restano fissi. Vale in Aggiungi e in Modifica.
                </Text>
                <View style={styles.chipWrap}>
                  {pill('write', 'Lo scrivo io', compile === 'write', () => setCompile('write'))}
                  {pill('wheel', 'Ruota', compile === 'wheel', () => setCompile('wheel'))}
                </View>
                {compile === 'wheel' && (
                  <>
                    <Text style={styles.subtextLarge}>La misura si sceglie toccando un valore della fila, da «Da» ad «A» col passo.</Text>
                    {renderRange(true)}
                  </>
                )}
              </>
            ) : !selectedBaseType || choosingType ? (
              /* 1. CHE COSA CONTIENE */
              <>
                <Text style={styles.modalSectionTitle}>1. Che cosa contiene?</Text>
                {choosingType && editingField && (
                  <>
                    <Text style={styles.subtextLarge}>
                      Si può cambiare solo dove i valori già salvati si leggono uguali: testo breve e lungo, numero e prezzo, scelta di uno o più valori. Gli altri tipi dicono perché no.
                    </Text>
                    <Pressable style={styles.linkButton} onPress={() => setChoosingType(false)} accessibilityRole="button">
                      <Text style={styles.changeTypeText}>Annulla</Text>
                    </Pressable>
                  </>
                )}
                {renderTypeList(choosingType ? editingField : null)}
              </>
            ) : (
              /* CONFIGURAZIONE DEL CAMPO */
              <>
                <Text style={styles.modalSectionTitle}>1. Che cosa contiene?</Text>
                <View style={styles.selectedTypeHeader}>
                  <AppIcon
                    name={FIELD_TYPE_INFO[selectedBaseType].icon as any}
                    size={32}
                    color={t.colors.accentInk}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedTypeLabel}>{FIELD_TYPE_INFO[selectedBaseType].label}</Text>
                    {editingField && editingField.type !== selectedBaseType && (
                      <Text style={styles.subtext}>Era {FIELD_TYPE_INFO[editingField.type]?.label}: vale con «Aggiorna».</Text>
                    )}
                  </View>
                  {editingField ? (
                    <Pressable style={styles.changeTypeButton} onPress={() => setChoosingType(true)} accessibilityRole="button">
                      <Text style={styles.changeTypeText}>Cambia tipo</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={styles.changeTypeButton} onPress={() => setSelectedBaseType(null)}>
                      <Text style={styles.changeTypeText}>Cambia</Text>
                    </Pressable>
                  )}
                </View>

                {/* NOME */}
                <Text style={styles.inputLabel}>Nome del Campo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Es: Taglia Pantalone, PDF Manuale"
                  placeholderTextColor={t.colors.placeholder}
                  value={fieldName}
                  onChangeText={setFieldName}
                  maxLength={SHORT_TEXT_MAX}
                />

                {/* UNITÀ (numero e prezzo) */}
                {(selectedBaseType === 'number' || selectedBaseType === 'currency') && (
                  <>
                    <Text style={styles.inputLabel}>Unità di misura (facoltativa)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Es: cm, kg, €, ml"
                      placeholderTextColor={t.colors.placeholder}
                      value={fieldUnit}
                      onChangeText={setFieldUnit}
                    />
                  </>
                )}

                {/* 2. COME SI COMPILA */}
                <Text style={styles.modalSectionTitle}>2. Come si compila?</Text>
                {isChoice && (
                  <>
                    <Text style={styles.inputLabel}>Da dove vengono i valori?</Text>
                    <View style={styles.chipWrap}>
                      {SOURCES.map((s) => pill(String(s.id), s.label, linkTo === s.id, () => {
                        setLinkTo(s.id);
                        if (s.id && compile === 'choose_or_write') setCompile('choose');
                        if (s.id) setDefaultPick(null);
                      }))}
                    </View>
                  </>
                )}
                {compileList.length > 0 ? (
                  <>
                    {isChoice && <Text style={styles.inputLabel}>Come si sceglie?</Text>}
                    <View style={[styles.chipWrap, !isChoice && { marginTop: 4 }]}>
                      {compileList.map((c) => pill(c.id, c.label, compile === c.id, () => setCompile(c.id)))}
                    </View>
                    {compileHint ? <Text style={styles.subtextLarge}>{compileHint}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.subtextLarge}>{COMPILE_FIXED[selectedBaseType]}</Text>
                )}
                {selectedBaseType === 'number' && (compile === 'stepper' || compile === 'wheel') && renderRange(compile === 'wheel')}

                {/* Valori a id stabili (VAL, CAM-F1): rinominare cambia solo l'etichetta, i prodotti restano collegati */}
                {isChoice && !linkTo && (
                  <View style={styles.datasetBox}>
                    <Text style={[styles.inputLabel, { marginTop: 0 }]}>Valori da scegliere</Text>
                    <OptionsEditor
                      options={options}
                      usedBy={(id) => furTypeUsageText(optionUsed(id))}
                      nameError={(label, editingId) => optionNameError(label, options, editingId) ?? retiredNameError(label, products, editingField, options, editingId)}
                      deleteError={(id) => optionDeleteError(options, id, optionUsed(id))}
                      onAdd={(label) => setOptions((prev) => [...prev, { id: newOptionId(prev), label }])}
                      onRename={(id, label) => setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, label } : o)))}
                      onDelete={(id) => { setOptions((prev) => prev.filter((o) => o.id !== id)); if (defaultPick === id) setDefaultPick(null); }}
                      onStyle={(id, style) => setOptions((prev) => prev.map((o) => (o.id === id ? { id: o.id, label: o.label, ...(style.color && { color: style.color }), ...(style.icon && { icon: style.icon }) } : o)))}
                      onPendingChange={setPendingName}
                      placeholder="Es. S, M, L"
                      hint="Tocca un valore per rinominarlo o dargli un colore e un'icona: i prodotti che lo usano restano collegati e mostrano il nome nuovo. Un valore usato da un prodotto, anche venduto o nel cestino, non si elimina. Le modifiche valgono con «Aggiorna»."
                    />
                  </View>
                )}

                {/* 3. COME SI VEDE */}
                <Text style={styles.modalSectionTitle}>3. Come si vede?</Text>
                {isChoice && (
                  <>
                    <Text style={styles.inputLabel}>Aspetto delle scelte</Text>
                    <View style={styles.chipWrap}>
                      {LOOKS.filter((l) => l.id !== 'wheel' || selectedBaseType === 'single_choice').map((l) => pill(l.id, l.label, look === l.id, () => setLook(l.id)))}
                    </View>
                    <Text style={styles.subtextLarge}>In una colonna da 1/2 o 1/3 del modulo di Aggiungi il binario prende la riga intera; a capo, elenco verticale e ruota si vedono come menu a tendina.</Text>
                  </>
                )}
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
                {canShowInCard({ type: selectedBaseType }) && (
                  <Pressable style={styles.requiredToggle} onPress={toggleShowInCard} accessibilityRole="button">
                    <AppIcon
                      name={showInCard ? 'check-box' : 'check-box-outline-blank'}
                      size={24}
                      color={showInCard ? t.colors.checkOn : t.colors.checkRing}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requiredToggleText}>Mostra nella card dell'Inventario</Text>
                      <Text style={styles.subtext}>Al massimo 2 campi, con l'icona e il colore del valore.</Text>
                    </View>
                  </Pressable>
                )}

                {/* VALORE PREDEFINITO */}
                {takesDefault({ type: selectedBaseType, linkTo: linkTo || undefined }) && (
                  <>
                    <Text style={styles.modalSectionTitle}>Valore predefinito (facoltativo)</Text>
                    <Text style={styles.subtextLarge}>In Aggiungi il campo parte già compilato: si salva com'è, oppure si cambia.</Text>
                    {selectedBaseType === 'boolean' ? (
                      <View style={styles.chipWrap}>
                        {pill('none', 'Nessuno', defaultPick === null, () => setDefaultPick(null), 'Nessun valore predefinito')}
                        {pill('yes', 'Sì', defaultPick === true, () => setDefaultPick(true), 'Predefinito Sì')}
                        {pill('no', 'No', defaultPick === false, () => setDefaultPick(false), 'Predefinito No')}
                      </View>
                    ) : selectedBaseType === 'single_choice' ? (
                      <View style={styles.chipWrap}>
                        {pill('none', 'Nessuno', defaultPick === null, () => setDefaultPick(null), 'Nessun valore predefinito')}
                        {options.map((o) => (
                          <Pressable
                            key={o.id}
                            onPress={() => setDefaultPick(o.id)}
                            style={[styles.chip, defaultPick === o.id && styles.chipActive]}
                            accessibilityRole="button"
                            accessibilityLabel={`Predefinito ${o.label}`}
                          >
                            {defaultPick === o.id && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                            <OptionMark option={o} iconColor={defaultPick === o.id ? t.colors.chipActiveText : undefined} />
                            <Text style={[styles.chipText, defaultPick === o.id && styles.chipTextActive]}>{o.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder={selectedBaseType === 'number' || selectedBaseType === 'currency' ? 'Es. 12,5' : 'Vuoto = nessuno'}
                        placeholderTextColor={t.colors.placeholder}
                        value={defaultText}
                        onChangeText={setDefaultText}
                        keyboardType={selectedBaseType === 'number' || selectedBaseType === 'currency' ? 'numeric' : 'default'}
                        maxLength={selectedBaseType === 'text_short' ? SHORT_TEXT_MAX : undefined}
                        accessibilityLabel="Valore predefinito"
                      />
                    )}
                  </>
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
            {/* Come si vede in Aggiungi e Modifica (richiesta dell'utente del 24): vale subito */}
            <Text style={styles.lookTitle}>Come si vede?</Text>
            <View style={[styles.chipWrap, { marginBottom: 8 }]}>
              {LOOKS.filter((l) => BASE_LOOKS.includes(l.id)).map((l) => pill(l.id, l.label, baseLook(furTypeField) === l.id, () => setFurTypeLook(l.id), `Tipo di pelle: ${l.label}`))}
            </View>
            <Text style={[styles.subtextLarge, { marginTop: 0, marginBottom: 16 }]}>In una colonna da 1/2 o 1/3 del modulo di Aggiungi il binario prende la riga intera; a capo, elenco verticale e ruota si vedono come menu a tendina.</Text>
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

  // Gruppo di campi dello stesso tipo
  groupTitle: { ...t.typography.caption, fontSize: 13, fontWeight: t.weights.strong, color: t.colors.textSecondary, marginTop: 8, marginBottom: 8 },
  lookTitle: { fontSize: t.label.size, fontWeight: t.label.weight, color: t.label.color, lineHeight: 18, marginBottom: 8 },
  fieldCard: { ...cardSurface(t), flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  fieldIcon: { width: 48, height: 48, borderRadius: t.radius.iconWrap, backgroundColor: t.colors.iconWrap, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  fieldContent: { flex: 1 },
  fieldHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 },
  fieldName: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
  systemBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: t.colors.iconWrap, borderRadius: t.radius.badge, paddingHorizontal: 6, paddingVertical: 2 },
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
  typeOptionOn: { borderColor: t.colors.tileSelectedBorder },
  typeOptionOff: { opacity: 0.75 },
  typeOptionIcon: { width: 48, height: 48, borderRadius: t.radius.iconWrap, backgroundColor: t.colors.iconWrap, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  typeOptionContent: { flex: 1 },
  typeOptionLabel: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong, marginBottom: 2 },
  typeOptionDesc: { ...t.typography.caption, fontSize: 12 },
  textOff: { color: t.colors.textSecondary },

  selectedTypeHeader: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 8 },
  selectedTypeLabel: { ...t.typography.cardTitle, fontSize: 16, fontWeight: t.weights.strong },
  changeTypeButton: { padding: 8 },
  changeTypeText: { color: t.colors.accentInk, fontWeight: '600' },
  linkButton: { alignSelf: 'flex-start', paddingVertical: 8, marginBottom: 8 },

  inputLabel: { fontSize: t.label.size, fontWeight: t.label.weight, color: t.label.color, lineHeight: 18, marginBottom: 6, marginTop: 16 },
  input: { minHeight: t.input.height, backgroundColor: t.colors.input, borderRadius: t.radius.input, paddingHorizontal: 14, fontSize: 15, color: t.colors.inputText, borderWidth: 1, borderColor: t.colors.inputBorder },
  subtext: { ...t.typography.caption, fontSize: 11, marginBottom: 4, color: t.colors.textSecondary },
  subtextLarge: { ...t.typography.caption, fontSize: 12, lineHeight: 17, marginTop: 8, color: t.colors.textSecondary },

  // Scelta dell'icona: riquadri come le scelte a riquadri di Aggiungi
  iconTile: { ...tileSurface(t), width: 48, height: 48, borderRadius: t.radius.iconWrap, justifyContent: 'center', alignItems: 'center' },
  iconTileSelected: { backgroundColor: t.colors.tileSelected, borderColor: t.colors.tileSelectedBorder },
  // Pillole (modo, aspetto, sorgente dei valori, predefinito)
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: t.radius.chip, backgroundColor: t.colors.chip, borderWidth: 1, borderColor: t.colors.chipBorder, overflow: 'hidden' },
  chipActive: { backgroundColor: t.colors.chipActive, borderColor: t.colors.chipActiveBorder },
  chipText: { fontSize: 13, fontWeight: '500', color: t.colors.chipText },
  chipTextActive: { fontWeight: '600', color: t.colors.chipActiveText },

  datasetBox: { ...tileSurface(t), padding: 16, marginTop: 16 },

  requiredToggle: { ...tileSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, padding: 16 },
  requiredToggleText: { ...t.typography.body, fontSize: 15 },
}));
