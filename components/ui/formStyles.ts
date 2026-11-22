import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import type { AppTheme } from '../../constants/themes';
import { tileSurface } from './surfaces';
import { withAlpha } from '../../utils/color';

// Controlli del modulo comuni ad Aggiungi e Modifica (lavoro L6c/L6d), come nella tavola `Aggiungi` della tela:
// `const useStyles = makeStyles((t) => ({ ...formStyles(t), … }))`. Le varianti `…Small` sono per i campi a 1/3.

type Named<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
const sheet = <T extends Named<T>>(styles: T & Named<any>): T => styles;

export const formStyles = (t: AppTheme) => {
  const inputFrame: ViewStyle = {
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.input,
  };
  return sheet({
    // Intestazione della schermata
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 12 },
    headerTitle: {
      flex: 1,
      fontSize: t.title.size,
      lineHeight: Math.round(t.title.size * 1.15),
      fontWeight: t.title.weight,
      letterSpacing: t.title.tracking,
      color: t.colors.textPrimary,
    },

    // Titolo di sezione: filetto solo se lo stile lo prevede
    section: {
      paddingBottom: 6,
      borderBottomWidth: t.section.line ? 1 : 0,
      borderBottomColor: t.section.line ?? 'transparent',
    },
    sectionTitle: { ...t.typography.sectionHeader, lineHeight: 18 },

    // Etichetta del campo (al massimo due righe, `numberOfLines={2}`)
    label: { fontSize: t.label.size, lineHeight: 18, fontWeight: t.label.weight, color: t.label.color, marginBottom: 6 },
    labelMuted: { color: t.colors.textMuted, fontWeight: '400' },
    required: { color: t.colors.error },
    /** Controllo spinto in basso: nella stessa riga i campi restano allineati anche con etichette di 1 o 2 righe. */
    bottom: { marginTop: 'auto' },

    // Campo a una riga: riquadro con icona, testo e unità
    inputBox: {
      ...inputFrame,
      height: t.input.height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
    },
    inputBoxSmall: { borderRadius: t.radius.inputSmall, paddingHorizontal: 10, gap: 6 },
    inputFill: { flex: 1, minWidth: 0 },
    inputText: {
      flex: 1,
      minWidth: 0,
      alignSelf: 'stretch',
      padding: 0,
      fontSize: 15,
      color: t.colors.inputText,
    },
    /** Testo mostrato da scelte e date (non modificabile a mano). */
    valueText: { flex: 1, minWidth: 0, fontSize: 15, color: t.colors.inputText },
    valuePlaceholder: { color: t.colors.placeholder },
    valueTextSmall: { fontSize: 13 },
    unit: { fontSize: 13, color: t.colors.textMuted },
    unitSmall: { fontSize: 12 },
    inputRow: { flexDirection: 'row', gap: 8 },
    /** Pulsante quadrato accanto al campo (genera SKU, scansiona codice): ruoli del pulsante secondario. */
    sideButton: {
      width: t.input.height,
      height: t.input.height,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.buttonSecondary,
      borderWidth: 1,
      borderColor: t.colors.buttonSecondaryBorder,
      borderRadius: t.radius.input,
    },
    helper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    helperText: { flex: 1, fontSize: 12, lineHeight: 16, color: t.colors.textSecondary },

    // Testo lungo
    area: {
      ...inputFrame,
      borderRadius: t.radius.area,
      minHeight: 96,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    areaIcon: { marginTop: 2 },
    areaText: {
      flex: 1,
      minWidth: 0,
      minHeight: 66,
      padding: 0,
      fontSize: 15,
      lineHeight: 22,
      color: t.colors.inputText,
      textAlignVertical: 'top',
    },

    // Contatore − valore +
    stepper: { ...inputFrame, height: t.input.height, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
    stepperSmall: { borderRadius: t.radius.inputSmall },
    stepperButton: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.inputSmall },
    stepperPlus: { backgroundColor: t.colors.accentSoft },
    stepperValue: { fontSize: 16, fontWeight: '600', color: t.colors.inputText },

    // Pillole: in fila scorrevole (tipo di pelle) o a capo (posizione, cartella)
    chipRow: { flexDirection: 'row', gap: 8 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
      height: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      backgroundColor: t.colors.chip,
      borderWidth: 1,
      borderColor: t.colors.chipBorder,
      borderRadius: t.radius.chip,
      overflow: 'hidden',
    },
    chipSmall: { height: 34, paddingHorizontal: 10, maxWidth: '100%' },
    chipActive: { backgroundColor: t.colors.chipActive, borderColor: t.colors.chipActiveBorder },
    chipText: { fontSize: 14, fontWeight: '500', color: t.colors.chipText },
    chipTextSmall: { fontSize: 13, flexShrink: 1 },
    chipTextActive: { fontWeight: '600', color: t.colors.chipActiveText },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    /** Anello bianco del pallino sulla pillola attiva (il pallino è un colore di dati). */
    chipDotActive: { width: 11, height: 11, borderRadius: 5.5, borderWidth: 1.5, borderColor: withAlpha(t.colors.onData, 0.9) },
    chipEmpty: { fontSize: 13, color: t.colors.textMuted, fontStyle: 'italic' },

    // Scelte a riquadri, tre per riga (larghezza calcolata dalla schermata)
    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: { ...tileSurface(t), height: 76, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
    tileSelected: { backgroundColor: t.colors.tileSelected, borderColor: t.colors.tileSelectedBorder },
    tileText: { fontSize: 14, lineHeight: 17, fontWeight: '500', color: t.colors.textPrimary, textAlign: 'center' },
    tileTextSelected: { fontWeight: '600', color: t.colors.tileSelectedText },

    // Foto
    photoRow: { flexDirection: 'row', gap: 12 },
    photoAdd: {
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: t.colors.accentSoft,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      borderRadius: t.radius.tile,
    },
    photoAddText: { fontSize: 12, fontWeight: '600', color: t.colors.accentInk },
    thumb: { width: 88, height: 88, borderRadius: t.radius.tile, backgroundColor: t.colors.surface, borderWidth: 2, borderColor: 'transparent' },
    thumbActive: { borderColor: t.colors.accent },
    mainImage: { height: 280, borderRadius: t.radius.card, backgroundColor: t.colors.surface },
    mainImageBox: { position: 'relative', marginBottom: 12 },
    removeMainImage: {
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
    imageCounter: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: t.colors.scrimStrong,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: t.radius.badge,
    },
    imageCounterText: { fontSize: 13, fontWeight: '600', color: t.colors.onData },
    dots: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: withAlpha(t.colors.onData, 0.5) },
    dotActive: { width: 24, backgroundColor: t.colors.accent },
    // Foto di un campo personalizzato: miniature 80 px
    smallPhoto: { width: 80, height: 80, borderRadius: t.radius.tile },
    smallPhotoAdd: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      borderRadius: t.radius.tile,
    },
    smallPhotoRemove: { position: 'absolute', top: 4, right: 4, padding: 4, borderRadius: 12, backgroundColor: t.colors.scrim },

    // Documenti
    docList: { gap: 8 },
    docRow: {
      ...inputFrame,
      borderRadius: t.radius.inputSmall,
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 12,
      paddingRight: 6,
    },
    docName: { flex: 1, minWidth: 0, fontSize: 14, color: t.colors.inputText },
    docRemove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    docAdd: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      backgroundColor: t.colors.accentSoft,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.dash,
      borderRadius: t.radius.inputSmall,
    },
    docAddText: { fontSize: 14, fontWeight: '600', color: t.colors.accentInk },

    // Pulsanti (con `<GradientFill gradient={t.gradients.button} />` come primo figlio del principale)
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: t.colors.button,
      borderRadius: t.radius.button,
      overflow: 'hidden',
      ...t.shadows.button,
    },
    primaryButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.onButton },
    secondaryButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.buttonSecondary,
      borderWidth: 1,
      borderColor: t.colors.buttonSecondaryBorder,
      borderRadius: t.radius.button,
    },
    secondaryButtonText: { fontSize: 16, fontWeight: '600', color: t.colors.onButtonSecondary },

    // Finestra di scelta dal basso: fondo opaco sopra il velo
    sheetScrim: { flex: 1, backgroundColor: t.colors.scrim, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: t.colors.backgroundSecondary,
      borderTopLeftRadius: t.radius.card,
      borderTopRightRadius: t.radius.card,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: t.colors.border,
      padding: 24,
      maxHeight: '80%',
    },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
    sheetTitle: { ...t.typography.h3, flex: 1 },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.border,
    },
    sheetRowText: { flex: 1, fontSize: 16, color: t.colors.textPrimary },
    sheetRowTextSelected: { fontWeight: '600', color: t.colors.accentInk },
    sheetConfirm: { height: 54, marginTop: 16 },
  });
};

// Scelte singole e multiple (riquadri e finestra), uguali in Aggiungi e Modifica. Si salva l'etichetta dell'opzione;
// un valore salvato con l'id resta riconosciuto. D01: è multipla ogni scelta di tipo `multi_choice`, qualunque sia
// l'aspetto (prima i riquadri la trattavano da singola, quindi un vecchio valore può essere una stringa sola).

export type ChoiceOption = { id: string; label?: string };

/** Valori scelti di una scelta multipla, anche se salvati da singola. */
export function choiceList(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  return value ? [String(value)] : [];
}

export function isChoiceSelected(value: unknown, option: ChoiceOption, multi: boolean): boolean {
  if (multi) {
    const list = choiceList(value);
    return list.includes(option.id) || (!!option.label && list.includes(option.label));
  }
  return value === option.id || (!!option.label && value === option.label);
}

/** Nuovo valore dopo il tocco di un'opzione: la singola si sceglie o si toglie, la multipla aggiunge o toglie. */
export function toggleChoice(value: unknown, option: ChoiceOption, multi: boolean): string | string[] | null {
  const saved = option.label || option.id;
  const selected = isChoiceSelected(value, option, multi);
  if (!multi) return selected ? null : saved;
  const list = choiceList(value);
  return selected ? list.filter((v) => v !== saved && v !== option.id) : [...list, saved];
}
