import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from '../../src/lib/LinearGradient';
import { useTheme } from '../../contexts/ThemeContext';
import type { Gradient } from '../../constants/themes/types';

// Sfondo dello stile dietro una schermata (lavoro L6): sfumatura lineare e bagliori radiali sopra
// `colors.background`, come `--bg-img` nella tela. Senza sfumatura né bagliori non disegna nulla.
// Va messo come primo figlio del contenitore della schermata (che ha già `backgroundColor: t.colors.background`).

/** Punti di inizio e fine di una sfumatura CSS (`angle` in gradi, 180 = dall'alto in basso). */
export function gradientPoints(g: Gradient) {
  const a = (g.angle * Math.PI) / 180;
  const dx = Math.sin(a) / 2;
  const dy = -Math.cos(a) / 2;
  return { start: { x: 0.5 - dx, y: 0.5 - dy }, end: { x: 0.5 + dx, y: 0.5 + dy } };
}

export function Backdrop() {
  const t = useTheme();
  const { width, height } = useWindowDimensions();
  const { glows, gradient } = t.backdrop;
  if (!glows.length && !gradient) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {gradient && (
        <LinearGradient
          colors={gradient.colors}
          locations={gradient.locations}
          {...gradientPoints(gradient)}
          style={StyleSheet.absoluteFill}
        />
      )}
      {glows.length > 0 && (
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            {glows.map((g, i) => (
              <RadialGradient key={i} id={`bagliore${i}`} cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset={0} stopColor={g.color} />
                <Stop offset={g.stop} stopColor={g.color} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {glows.map((g, i) => (
            <Ellipse key={i} cx={g.x * width} cy={g.y * height} rx={g.rx} ry={g.ry} fill={`url(#bagliore${i})`} />
          ))}
        </Svg>
      )}
    </View>
  );
}

export default Backdrop;
