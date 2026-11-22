import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';

// Fondo di una barra (lavoro L6, ticket 05): vetro sfocato dove lo stile lo prevede (`t.bar.glass`), altrimenti il
// velo pieno `t.bar.background`. Solo per la barra in basso e la barra Indietro/Modifica della Scheda, mai su card.
// Va messo come primo figlio della barra, con lo stesso raggio. Su Android la sfocatura non è provata su un telefono.
export function Glass({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const fill = [StyleSheet.absoluteFill, { backgroundColor: t.bar.background }, style];
  if (!t.bar.glass) return <View pointerEvents="none" style={fill} />;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]}>
      <BlurView
        intensity={Math.min(100, t.bar.glass.blur * 3)}
        tint={t.dark ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bar.background }]} />
    </View>
  );
}

export default Glass;
