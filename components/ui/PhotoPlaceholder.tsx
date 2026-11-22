// Riquadro al posto della foto per i prodotti senza foto (D18: prima Aggiungi salvava un'immagine d'esempio
// presa da internet, che sembrava la foto vera e senza rete non si vedeva).
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../contexts/ThemeContext';

export function PhotoPlaceholder({ size = 40, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      accessibilityLabel="Nessuna foto"
      style={[{ alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.backgroundSecondary }, style]}
    >
      <AppIcon name="image-not-supported" size={size} color={t.colors.textMuted} />
    </View>
  );
}
