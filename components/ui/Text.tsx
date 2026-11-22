import React, { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

// `Text` e `TextInput` dell'app (ticket 05, opzione b): le schermate li importano da qui invece che da
// `react-native`, così il carattere dello stile attivo arriva a ogni testo in un punto solo.
// Per ora passano solo lo stile; il carattere arriva con il lavoro L5a.

export const Text = forwardRef<RNText, TextProps>(function AppText(props, ref) {
  return <RNText ref={ref} {...props} />;
});
export type Text = RNText;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function AppTextInput(props, ref) {
  return <RNTextInput ref={ref} {...props} />;
});
export type TextInput = RNTextInput;
