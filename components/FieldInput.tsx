// Disegnatore unico di un campo personalizzato (VAL, ticket 23) per Aggiungi e Modifica: prima ogni schermata ne aveva
// una copia sua (`AddScreen` e `EditScreen`), e Modifica non aveva il contatore (CAM-F5). Secondo tipo e aspetto:
// elenco dal basso (picker, modal_list), riquadri (le altre scelte), contatore, foto, data, documento, testo con il
// lettore dei codici, testo lungo, testo o numero. La finestra delle scelte, il calendario e il lettore stanno qui.
// I valori seguono `utils/fieldValues.ts`: una scelta toccata salva l'id dell'opzione (le etichette salvate prima si
// riconoscono, anche rinominate, grazie alla copia del campo nel prodotto, `snapshot`); il contatore mostra il valore
// che si salva («–» se non c'è). I numeri restano il testo scritto finché la schermata non salva (`savedValue`).
// `size` è la misura nel modulo di Aggiungi (a 1/3 diciture e icone più corte); Modifica disegna a tutta larghezza.
// Etichetta e controllo sono fratelli nel contenitore (le prove cercano il campo dall'etichetta); `error` è una riga
// rossa sotto il controllo dopo un salvataggio rifiutato.
// EDC: le scelte in ogni aspetto con `ChoicePicker` (binario orizzontale, a capo, riquadri, elenco verticale, menu a
// tendina in linea, elenco dal basso, ruota; colore e icona delle opzioni con `OptionMark`), «Scelgo o scrivo» (il
// testo scritto resta testo e diventa un'opzione solo dopo la conferma), ruota a scatti per le misure (da, a, passo),
// Sì/No, testo breve fino a 100 caratteri. Le misure Base (Lunghezza, Larghezza, Peso) passano di qui con
// `placeholder` e `label`.
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from '../src/lib/imagePicker';
import * as DocumentPicker from '../src/lib/documentPicker';
import * as Sharing from '../src/lib/sharing';
import { Image } from '../src/lib/ExpoImage';
import BarcodeScanner from './BarcodeScanner';
import { BottomSheet, ChoicePicker, Wheel, effectiveLook, isWideLook } from './ChoicePicker';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text, TextInput } from './ui/Text';
import { formStyles } from './ui/formStyles';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { useCustomFields } from '../contexts/CustomFieldsContext';
import { useInventory } from '../contexts/InventoryContext';
import { useFieldOptions } from '../hooks/useFieldOptions';
import type { CustomField } from '../types';
import {
  choiceLabel, choiceList, choiceLook, freeText, inputMode, isChoiceField, isSelected, numberOf, optionNameError, optionOf, retiredNameError,
  savesLabel, SHORT_TEXT_MAX, stepFrom, stepperRange, toggleOption, typedChoice, wheelValues, type FieldOption,
} from '../utils/fieldValues';
import { formatNumber } from '../utils/number';

export type FieldSize = 'small' | 'medium' | 'full';

/** Icona del campo: quella scelta nel modulo (layout builder), poi quella del campo, poi una per tipo. */
export function fieldIcon(field: Pick<CustomField, 'icon' | 'type'>, layoutIcon?: string): string {
  if (layoutIcon) return layoutIcon;
  if (field.icon) return field.icon;
  switch (field.type) {
    case 'number': return 'tag';
    case 'currency': return 'euro';
    case 'date': return 'event';
    case 'text_long': return 'notes';
    case 'boolean': return 'toggle-on';
    default: return 'text-fields';
  }
}

interface Props {
  /** Campo del registro (o la copia del prodotto, per un campo che non c'è più). */
  field: CustomField;
  value: unknown;
  onChange: (value: unknown) => void;
  /** Copia del campo salvata col prodotto (Modifica): fa riconoscere le etichette salvate prima di VAL. */
  snapshot?: CustomField;
  size?: FieldSize;
  /** Icona del campo (`fieldIcon`). */
  icon?: string;
  /** Larghezza di un riquadro delle scelte (tre per riga). */
  tileWidth: number;
  /** Contenitore: larghezza nel modulo di Aggiungi, margine sotto in Modifica. */
  style?: StyleProp<ViewStyle>;
  /** Riga rossa sotto il campo dopo un salvataggio rifiutato (`fieldError`). */
  error?: string;
  /** Etichetta e segnaposto al posto di quelli del campo (misure Base: «Lunghezza (cm)», «85»). */
  label?: string;
  placeholder?: string;
}

export function FieldInput({ field, value, onChange, snapshot, size = 'full', icon, tileWidth, style, error, label, placeholder }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const optionsOf = useFieldOptions();
  const [dateOpen, setDateOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const small = size === 'small';
  const full = size === 'full';
  const iconName = icon ?? fieldIcon(field);
  const multi = field.type === 'multi_choice';
  const byLabel = savesLabel(field);
  const mode = inputMode(field);
  const text = value == null ? '' : String(value);
  // I segnaposto lunghi solo a larghezza intera, altrimenti finirebbero tagliati
  const textPlaceholder = full ? 'Inserisci...' : 'Scrivi';
  // Testo breve: al massimo 100 caratteri, anche da un codice letto (CAM-F9); un valore salvato più lungo resta
  const shortText = (next: string) => onChange(field.type === 'text_short' ? next.slice(0, SHORT_TEXT_MAX) : next);

  // Riquadri, pillole, foto e documenti sono sempre a larghezza intera
  let wide = false;
  let control: React.ReactNode;

  if (isChoiceField(field)) {
    // === Scelte nell'aspetto del campo (`ChoicePicker`: binario, a capo, riquadri, elenco verticale, tendina, elenco
    // dal basso, ruota). A 1/3 diciture corte; un valore lungo finisce con «…» ===
    const options = optionsOf(field);
    const look = choiceLook(field);
    const chosen = choiceList(value);
    const placeholderText = small ? 'Scegli' : 'Seleziona...';
    const shown = multi
      ? (chosen.length ? `${chosen.length} ${small ? 'scelti' : 'selezionati'}` : placeholderText)
      : (chosen.length ? choiceLabel(chosen[0], options, snapshot) : placeholderText);
    // In una colonna (1/2, 1/3) binario, a capo, elenco e ruota diventano tendina (R1 di UX0); i riquadri restano interi
    wide = isWideLook(effectiveLook(look, !full));
    const choices = (
      <ChoicePicker
        name={field.name}
        look={look}
        options={options}
        selected={(opt) => isSelected(value, opt, options, snapshot)}
        onPick={(opt) => onChange(toggleOption(value, opt, options, multi, { snapshot, byLabel }))}
        onClear={() => onChange(null)}
        multi={multi}
        small={small}
        narrow={!full}
        tileWidth={tileWidth}
        icon={iconName}
        shown={shown}
        empty={!chosen.length}
      />
    );
    control = mode === 'choose_or_write' ? (
      <>
        {choices}
        <TypedValue field={field} value={value} onChange={onChange} options={options} snapshot={snapshot} small={small} />
      </>
    ) : choices;
  } else if (mode === 'stepper') {
    // === Contatore: mostra il valore che si salva (CAM-F3), «–» se non c'è; va avanti del passo ===
    const range = stepperRange(field);
    const current = numberOf(value);
    control = (
      <View style={[styles.stepper, small && styles.stepperSmall, styles.bottom]}>
        <Pressable style={styles.stepperButton} onPress={() => onChange(stepFrom(value, range, -1))} accessibilityRole="button" accessibilityLabel={`Diminuisci ${field.name}`}>
          <AppIcon name="remove" size={20} color={current === undefined || current <= range.min ? t.colors.textMuted : t.colors.textSecondary} />
        </Pressable>
        <Text style={styles.stepperValue}>{current === undefined ? '–' : formatNumber(current)}</Text>
        <Pressable style={[styles.stepperButton, styles.stepperPlus]} onPress={() => onChange(stepFrom(value, range, 1))} accessibilityRole="button" accessibilityLabel={`Aumenta ${field.name}`}>
          <AppIcon name="add" size={20} color={current !== undefined && current >= range.max ? t.colors.textMuted : t.colors.accentInk} />
        </Pressable>
      </View>
    );
  } else if (mode === 'wheel') {
    control = <NumberWheel field={field} value={value} onChange={onChange} small={small} narrow={!full} placeholder={placeholder} icon={iconName} />;
  } else if (field.type === 'boolean') {
    // === Sì/No: il secondo tocco toglie la risposta ===
    control = (
      <View style={[styles.boolRow, styles.bottom]}>
        {[true, false].map((answer) => {
          const on = value === answer;
          return (
            <Pressable
              key={String(answer)}
              style={[styles.chip, small && styles.chipSmall, styles.boolButton, on && styles.chipActive]}
              onPress={() => onChange(on ? null : answer)}
              accessibilityRole="button"
              accessibilityLabel={`${field.name}: ${answer ? 'Sì' : 'No'}`}
            >
              {on && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
              <AppIcon name={answer ? 'check' : 'close'} size={16} color={on ? t.colors.chipActiveText : t.colors.textSecondary} />
              <Text style={[styles.chipText, small && styles.chipTextSmall, on && styles.chipTextActive]}>{answer ? 'Sì' : 'No'}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  } else if (field.type === 'images') {
    // === Foto ===
    const photos: string[] = Array.isArray(value) ? value : [];
    wide = true;
    control = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
        {photos.map((uri, index) => (
          <View key={index}>
            <Image source={{ uri }} style={styles.smallPhoto} contentFit="cover" />
            <Pressable style={styles.smallPhotoRemove} onPress={() => onChange(photos.filter((_, i) => i !== index))}>
              <AppIcon name="close" size={16} color={t.colors.onData} />
            </Pressable>
          </View>
        ))}
        {photos.length < 10 && (
          <Pressable
            style={styles.smallPhotoAdd}
            onPress={async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
              });
              if (!result.canceled) onChange([...photos, ...result.assets.map((a) => a.uri)].slice(0, 10));
            }}
          >
            <AppIcon name="add-photo-alternate" size={26} color={t.colors.accentInk} />
          </Pressable>
        )}
      </ScrollView>
    );
  } else if (field.type === 'date') {
    // === Data ===
    const date = typeof value === 'string' && value ? value : undefined;
    control = (
      <>
        <Pressable
          style={[styles.inputBox, small && styles.inputBoxSmall, small && styles.dateBoxSmall, styles.bottom]}
          onPress={() => setDateOpen(true)}
        >
          <Text style={[styles.valueText, small && styles.valueTextSmall, !date && styles.valuePlaceholder]} numberOfLines={1}>
            {date ? new Date(date).toLocaleDateString('it-IT') : (small ? 'Data' : 'Seleziona Data')}
          </Text>
          <AppIcon name="calendar-today" size={small ? 15 : 18} color={t.colors.info} />
        </Pressable>
        {dateOpen && (
          <DateTimePicker
            value={date ? new Date(date) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setDateOpen(false);
              if (selected) onChange(selected.toISOString());
            }}
          />
        )}
      </>
    );
  } else if (field.type === 'document' || field.uiType === 'document') {
    // === Documento (un link si apre nel browser, un file si condivide) ===
    const docs: string[] = Array.isArray(value) ? value : [];
    wide = true;
    control = (
      <View style={styles.docList}>
        {docs.map((uri, index) => (
          <Pressable key={index} style={styles.docRow} onPress={() => (/^https?:\/\//i.test(uri) ? Linking.openURL(uri) : Sharing.shareAsync(uri)).catch(console.error)}>
            <AppIcon name="insert-drive-file" size={20} color={t.colors.accentInk} />
            <Text style={styles.docName} numberOfLines={1}>{uri.split('/').pop() || 'Documento'}</Text>
            <Pressable style={styles.docRemove} onPress={() => onChange(docs.filter((_, i) => i !== index))}>
              <AppIcon name="delete" size={20} color={t.colors.error} />
            </Pressable>
          </Pressable>
        ))}
        <Pressable
          style={styles.docAdd}
          onPress={async () => {
            try {
              const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
              if (!result.canceled && result.assets && result.assets.length > 0) onChange([...docs, result.assets[0].uri]);
            } catch (e) { console.error('Doc Picker err', e); }
          }}
        >
          <AppIcon name="upload-file" size={20} color={t.colors.accentInk} />
          <Text style={styles.docAddText}>Allega Documento</Text>
        </Pressable>
      </View>
    );
  } else if (field.type === 'text_short' && field.isBarcode) {
    // === Testo con il lettore dei codici (D02: lettore vero). A 1/3 il pulsante diventa un'icona dentro il campo ===
    const input = (
      <TextInput
        style={styles.inputText}
        placeholder={placeholder ?? (full ? 'Scansiona o scrivi il codice' : 'Codice')}
        placeholderTextColor={t.colors.placeholder}
        value={text}
        onChangeText={shortText}
        maxLength={SHORT_TEXT_MAX}
      />
    );
    control = (
      <>
        {small ? (
          <View style={[styles.inputBox, styles.inputBoxSmall, styles.bottom]}>
            {input}
            <Pressable onPress={() => setScanning(true)} hitSlop={10}>
              <AppIcon name="qr-code-scanner" size={20} color={t.colors.accentInk} />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.inputRow, styles.bottom]}>
            <View style={[styles.inputBox, styles.inputFill]}>
              <AppIcon name={iconName} size={18} color={t.colors.fieldIcon} />
              {input}
            </View>
            <Pressable style={styles.sideButton} onPress={() => setScanning(true)}>
              <AppIcon name="qr-code-scanner" size={22} color={t.colors.accentInk} />
            </Pressable>
          </View>
        )}
        {scanning && (
          <Modal visible={true} animationType="slide" onRequestClose={() => setScanning(false)}>
            <BarcodeScanner
              onScan={({ data }) => { shortText(data); setScanning(false); }}
              onClose={() => setScanning(false)}
            />
          </Modal>
        )}
      </>
    );
  } else if (field.type === 'text_long') {
    // === Testo lungo (a 1/3 senza icona, per lasciare spazio al testo) ===
    control = (
      <View style={[styles.area, styles.bottom]}>
        {!small && <AppIcon name={iconName} size={18} color={t.colors.fieldIcon} style={styles.areaIcon} />}
        <TextInput
          style={styles.areaText}
          placeholder={placeholder ?? (full ? `Inserisci ${field.name.toLowerCase()}...` : 'Scrivi')}
          placeholderTextColor={t.colors.placeholder}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={text}
          onChangeText={onChange}
        />
      </View>
    );
  } else {
    // === Testo, numero, valuta: icona a sinistra, unità a destra ===
    const numeric = field.type === 'number' || field.type === 'currency';
    const unit = field.unit || (field.type === 'currency' ? '€' : undefined);
    control = (
      <View style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]}>
        <AppIcon name={iconName} size={small ? 17 : 18} color={t.colors.fieldIcon} />
        <TextInput
          style={styles.inputText}
          placeholder={placeholder ?? (numeric ? '0' : textPlaceholder)}
          placeholderTextColor={t.colors.placeholder}
          keyboardType={numeric ? 'numeric' : 'default'}
          value={text}
          onChangeText={shortText}
          maxLength={field.type === 'text_short' ? SHORT_TEXT_MAX : undefined}
        />
        {unit ? <Text style={[styles.unit, small && styles.unitSmall]}>{unit}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[style, wide && styles.wide]}>
      <Text style={styles.label} numberOfLines={2}>
        {label ?? field.name}{field.required && <Text style={styles.required}> *</Text>}
      </Text>
      {control}
      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}

/**
 * «Scelgo o scrivo» (EDC): sotto le scelte una casella per un valore che non c'è. Il testo uguale a un'opzione (maiuscole
 * e accenti indifferenti) la sceglie; un testo nuovo si salva com'è e diventa un'opzione del campo solo con «Aggiungi
 * ai valori» e la conferma (stessi controlli dell'editor dei valori: nome doppio o ancora salvato per un'altra opzione).
 */
function TypedValue({ field, value, onChange, options, snapshot, small }: {
  field: CustomField; value: unknown; onChange: (value: unknown) => void; options: readonly FieldOption[]; snapshot?: CustomField; small: boolean;
}) {
  const styles = useStyles();
  const t = useTheme();
  const { addOption } = useCustomFields();
  const { products } = useInventory();
  const [draft, setDraft] = useState(() => freeText(value, options, snapshot));
  // Un tocco su un'opzione (o il modulo svuotato) svuota la casella; scrivere il nome di un'opzione la lascia com'è
  useEffect(() => {
    const option = optionOf(value, options, snapshot);
    if ((value == null || value === '') || (option && typedChoice(draft, options) !== option.id)) setDraft('');
  }, [value]);
  const typed = draft.trim();
  const isNew = !!typed && typedChoice(typed, options) === typed;

  const confirm = () => {
    const error = optionNameError(typed, options) ?? retiredNameError(typed, products, field, options);
    if (error) { Alert.alert('Attenzione', error); return; }
    Alert.alert('Nuovo valore', `Aggiungere «${typed}» ai valori di «${field.name}»? Si potrà scegliere anche per gli altri prodotti.`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Aggiungi',
        onPress: async () => {
          const option = await addOption(field.id, typed);
          if (option) { setDraft(''); onChange(option.id); }
        },
      },
    ]);
  };

  return (
    <View style={styles.typedBox}>
      <View style={[styles.inputBox, small && styles.inputBoxSmall]}>
        <AppIcon name="edit" size={small ? 15 : 17} color={t.colors.fieldIcon} />
        <TextInput
          style={styles.inputText}
          placeholder={small ? 'Altro' : 'Oppure scrivi un altro valore'}
          placeholderTextColor={t.colors.placeholder}
          value={draft}
          onChangeText={(next) => { setDraft(next); onChange(typedChoice(next, options)); }}
          maxLength={SHORT_TEXT_MAX}
          accessibilityLabel={`Altro valore di ${field.name}`}
        />
      </View>
      {isNew && (
        <Pressable style={styles.typedAdd} onPress={confirm} accessibilityRole="button" accessibilityLabel={`Aggiungi ${typed} ai valori di ${field.name}`}>
          <AppIcon name="add-circle" size={16} color={t.colors.accentInk} />
          <Text style={styles.typedAddText} numberOfLines={2}>Aggiungi «{typed}» ai valori</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Ruota per le misure (EDC, R3 di UX0): rullo verticale a scatti (`Wheel`) con i valori da «da» ad «a» col passo; la
 * prima voce «–» è nessun valore, e senza un tocco o uno scorrere nulla si salva. A larghezza intera sta nel modulo; in
 * una colonna (1/2, 1/3) è un campo «90 cm ▾» che apre la ruota in una finestra dal basso con «Fatto». C'è sempre
 * «Scrivi il valore» per chi non vuole scorrere; un valore fuori dalla ruota resta e si legge.
 */
function NumberWheel({ field, value, onChange, small, narrow, placeholder, icon }: {
  field: CustomField; value: unknown; onChange: (value: unknown) => void; small: boolean; narrow: boolean; placeholder?: string; icon: string;
}) {
  const styles = useStyles();
  const t = useTheme();
  const [open, setOpen] = useState(false);
  // «Scrivi il valore»: vale quando si esce dalla casella o con Invio
  const [typed, setTyped] = useState('');
  // un testo che non è un numero resta nella casella con la riga rossa, non si perde
  const commitTyped = () => { const n = numberOf(typed); if (n !== undefined) { onChange(n); setTyped(''); } };
  const typedWrong = typed.trim() !== '' && numberOf(typed) === undefined;
  const range = stepperRange(field);
  const values = useMemo(() => wheelValues(range), [range.min, range.max, range.step]);
  const unit = field.unit ? ` ${field.unit}` : '';
  const items = useMemo(() => values.map((v) => ({ key: String(v), text: `${formatNumber(v)}${unit}`, a11y: `${field.name} ${formatNumber(v)}${unit}` })), [values, unit, field.name]);
  const current = numberOf(value);
  const index = current === undefined ? -1 : values.findIndex((v) => Math.abs(v - current) < 1e-9);
  // Un valore salvato che non è un numero («circa 90», scritto prima della ruota) si legge com'è
  const saved = value == null || value === '' ? '' : String(value);
  const shown = current === undefined ? saved : `${formatNumber(current)}${unit}`;
  const wheel = (
    <>
      <Wheel name={field.name} items={items} index={index} onSelect={(i) => onChange(i < 0 ? null : values[i])} />
      {shown && index < 0 ? <Text style={styles.wheelOutside}>Valore scritto: {shown}</Text> : null}
      <View style={[styles.inputBox, styles.wheelWrite]}>
        <AppIcon name="edit" size={16} color={t.colors.fieldIcon} />
        <TextInput
          style={styles.inputText}
          placeholder="Scrivi il valore"
          placeholderTextColor={t.colors.placeholder}
          keyboardType="numeric"
          value={typed}
          onChangeText={setTyped}
          onBlur={commitTyped}
          onSubmitEditing={commitTyped}
          accessibilityLabel={`Scrivi il valore di ${field.name}`}
        />
        {field.unit ? <Text style={styles.unit}>{field.unit}</Text> : null}
      </View>
      {typedWrong ? <Text style={styles.errorText} accessibilityRole="alert">Scrivi un numero, per esempio 12,5.</Text> : null}
    </>
  );
  if (!narrow) return <View style={styles.bottom}>{wheel}</View>;
  return (
    <>
      <Pressable
        style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${field.name}: ${shown || 'nessun valore'}`}
      >
        {!small && <AppIcon name={icon} size={18} color={t.colors.fieldIcon} />}
        <Text style={[styles.valueText, small && styles.valueTextSmall, !shown && styles.valuePlaceholder]} numberOfLines={1}>
          {shown || '–'}
        </Text>
        <AppIcon name="keyboard-arrow-down" size={20} color={t.colors.textMuted} />
      </Pressable>
      <BottomSheet title={field.name} open={open} onClose={() => setOpen(false)}>{wheel}</BottomSheet>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  wide: { width: '100%' },
  // A 1/3 la data (13 px) deve stare intera accanto al calendario: margini interni più stretti
  dateBoxSmall: {
    paddingLeft: 8,
    paddingRight: 6,
    gap: 2,
  },
  errorText: { marginTop: 6, fontSize: 12, lineHeight: 16, color: t.colors.error },
  // Sì/No
  boolRow: { flexDirection: 'row', gap: 8 },
  boolButton: { flex: 1, justifyContent: 'center', paddingHorizontal: 8 },
  // «Scelgo o scrivo»
  typedBox: { marginTop: 8, gap: 6 },
  typedAdd: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  typedAddText: { flex: 1, fontSize: 13, fontWeight: '600', color: t.colors.accentInk },
  // Ruota: valore salvato che non è tra quelli della ruota
  wheelOutside: { marginTop: 4, fontSize: 12, color: t.colors.textSecondary },
  wheelWrite: { marginTop: 8 },
}));
