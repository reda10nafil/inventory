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
import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from '../src/lib/imagePicker';
import * as DocumentPicker from '../src/lib/documentPicker';
import * as Sharing from '../src/lib/sharing';
import { Image } from '../src/lib/ExpoImage';
import BarcodeScanner from './BarcodeScanner';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text, TextInput } from './ui/Text';
import { formStyles } from './ui/formStyles';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { useFieldOptions } from '../hooks/useFieldOptions';
import type { CustomField } from '../types';
import { choiceLabel, choiceList, isChoiceField, isSelected, numberOf, savesLabel, stepFrom, stepperRange, toggleOption } from '../utils/fieldValues';
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
}

export function FieldInput({ field, value, onChange, snapshot, size = 'full', icon, tileWidth, style, error }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const optionsOf = useFieldOptions();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const small = size === 'small';
  const full = size === 'full';
  const iconName = icon ?? fieldIcon(field);
  const multi = field.type === 'multi_choice';
  const byLabel = savesLabel(field);
  const text = value == null ? '' : String(value);
  // I segnaposto lunghi solo a larghezza intera, altrimenti finirebbero tagliati
  const textPlaceholder = full ? 'Inserisci...' : 'Scrivi';

  // Riquadri, foto e documenti sono sempre a larghezza intera
  let wide = false;
  let control: React.ReactNode;

  if (isChoiceField(field) && (field.uiType === 'picker' || field.uiType === 'modal_list')) {
    // === Scelte: elenco dal basso. A 1/3 testo in 13 px e diciture corte; un valore lungo finisce con «…» ===
    const options = optionsOf(field);
    const chosen = choiceList(value);
    const shown = multi
      ? (chosen.length ? `${chosen.length} ${small ? 'scelti' : 'selezionati'}` : (small ? 'Scegli' : 'Seleziona...'))
      : (chosen.length ? choiceLabel(chosen[0], options, snapshot) : (small ? 'Scegli' : 'Seleziona...'));
    control = (
      <>
        <Pressable style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]} onPress={() => setSheetOpen(true)}>
          {!small && <AppIcon name={iconName} size={18} color={t.colors.fieldIcon} />}
          <Text style={[styles.valueText, small && styles.valueTextSmall, !chosen.length && styles.valuePlaceholder]} numberOfLines={1}>
            {shown}
          </Text>
          <AppIcon name="keyboard-arrow-down" size={20} color={t.colors.textMuted} />
        </Pressable>
        {sheetOpen && (
          <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setSheetOpen(false)}>
            <View style={styles.sheetScrim}>
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{field.name}</Text>
                  <Pressable onPress={() => setSheetOpen(false)}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {options.map((opt) => {
                    const on = isSelected(value, opt, options, snapshot);
                    return (
                      <Pressable
                        key={opt.id}
                        style={styles.sheetRow}
                        onPress={() => {
                          onChange(toggleOption(value, opt, options, multi, { snapshot, byLabel }));
                          if (!multi) setSheetOpen(false);
                        }}
                      >
                        <Text style={[styles.sheetRowText, on && styles.sheetRowTextSelected]}>{opt.label}</Text>
                        {on && <AppIcon name="check" size={24} color={t.colors.accentInk} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {multi && (
                  <Pressable style={[styles.primaryButton, styles.sheetConfirm]} onPress={() => setSheetOpen(false)}>
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <Text style={styles.primaryButtonText}>Conferma Selezione</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Modal>
        )}
      </>
    );
  } else if (isChoiceField(field)) {
    // === Scelte: riquadri (D01: la multipla ha i quadratini di spunta, la singola i cerchi) ===
    const options = optionsOf(field);
    wide = true;
    control = (
      <View style={styles.tileGrid}>
        {options.map((option) => {
          const on = isSelected(value, option, options, snapshot);
          const tick = multi ? (on ? 'check-box' : 'check-box-outline-blank') : (on ? 'check-circle' : 'radio-button-unchecked');
          return (
            <Pressable
              key={option.id}
              style={[styles.tile, { width: tileWidth }, on && styles.tileSelected]}
              onPress={() => onChange(toggleOption(value, option, options, multi, { snapshot, byLabel }))}
            >
              <AppIcon name={tick} size={22} color={on ? t.colors.checkOn : t.colors.checkRing} />
              <Text style={[styles.tileText, on && styles.tileTextSelected]} numberOfLines={2}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  } else if (field.uiType === 'stepper') {
    // === Contatore: mostra il valore che si salva (CAM-F3), «–» se non c'è ===
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
        placeholder={full ? 'Scansiona o scrivi il codice' : 'Codice'}
        placeholderTextColor={t.colors.placeholder}
        value={text}
        onChangeText={onChange}
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
              onScan={({ data }) => { onChange(data); setScanning(false); }}
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
          placeholder={full ? `Inserisci ${field.name.toLowerCase()}...` : 'Scrivi'}
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
          placeholder={numeric ? '0' : textPlaceholder}
          placeholderTextColor={t.colors.placeholder}
          keyboardType={numeric ? 'numeric' : 'default'}
          value={text}
          onChangeText={onChange}
        />
        {unit ? <Text style={[styles.unit, small && styles.unitSmall]}>{unit}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[style, wide && styles.wide]}>
      <Text style={styles.label} numberOfLines={2}>
        {field.name}{field.required && <Text style={styles.required}> *</Text>}
      </Text>
      {control}
      {error ? <Text style={styles.errorText} accessibilityRole="alert">{error}</Text> : null}
    </View>
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
}));
