import React from 'react';
import { StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from '../../src/lib/LinearGradient';
import { gradientPoints } from './Backdrop';
import type { Gradient } from '../../constants/themes/types';

// Riempimento sfumato facoltativo (lavoro L6) per pulsante principale, pillola attiva e voce attiva della barra:
// `<GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />` come primo figlio
// dell'elemento, che tiene il suo `backgroundColor` pieno (l'ultimo colore della sfumatura). Senza sfumatura: nulla.
export function GradientFill({ gradient, style }: { gradient?: Gradient; style?: StyleProp<ViewStyle> }) {
  if (!gradient) return null;
  return (
    <LinearGradient
      pointerEvents="none"
      colors={gradient.colors}
      locations={gradient.locations}
      {...gradientPoints(gradient)}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}

export default GradientFill;
