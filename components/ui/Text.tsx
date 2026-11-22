import React, { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/themes';
import type { FontWeight } from '../../constants/themes/types';

// `Text` e `TextInput` dell'app (ticket 05, opzione b): le schermate li importano da qui invece che da
// `react-native`, così il carattere dello stile attivo arriva a ogni testo in un punto solo.
// Ogni peso è un file a sé (Inter_600SemiBold, …): si sceglie il file del peso e si azzera `fontWeight`,
// altrimenti Android ricade sul carattere di sistema e il web aggiunge un finto grassetto.
// Restano intatti i testi con un `fontFamily` proprio (i 4 `monospace`). Un testo annidato senza peso
// proprio eredita carattere e peso dal testo che lo contiene.

const InsideText = createContext(false);

const WEIGHTS: Record<string, string> = { normal: '400', bold: '700', '100': '400', '200': '400', '300': '400', '900': '800' };

/**
 * Carattere dello stile attivo per un peso, per i testi che non passano da questo `Text` (intestazioni e barra di
 * React Navigation). Senza famiglia (tema `oggi`) resta il solo peso, come prima.
 */
export function fontStyle(t: AppTheme, weight: string | number = '400'): TextStyle {
  const raw = String(weight);
  const w = (WEIGHTS[raw] ?? raw) as FontWeight;
  const file = t.font.family ? t.font.files[w] ?? t.font.files['400'] : undefined;
  return file ? { fontFamily: file, fontWeight: 'normal' } : { fontWeight: w };
}

function withFont(t: AppTheme, style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  if (!t.font.family) return style;
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style;
  if (nested && flat.fontWeight === undefined) return style;
  const font = fontStyle(t, flat.fontWeight ?? '400');
  return font.fontFamily ? [style, font] : style;
}

export const Text = forwardRef<RNText, TextProps>(function AppText({ style, ...props }, ref) {
  const t = useTheme();
  const nested = useContext(InsideText);
  const text = <RNText ref={ref} style={withFont(t, style, nested)} {...props} />;
  return nested ? text : <InsideText.Provider value>{text}</InsideText.Provider>;
});
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  const t = useTheme();
  return <RNTextInput ref={ref} style={withFont(t, style, false)} {...props} />;
});
export type TextInput = RNTextInput;
