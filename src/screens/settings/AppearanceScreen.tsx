// Impostazioni › Aspetto: scelta dello stile dell'app (lavoro L3). La scelta vale per questo dispositivo, si
// applica subito e si salva (`@syncro/stile`, fuori dallo spazio di lavoro). Elenca solo gli stili pronti.
import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, fontStyle } from '../../../components/ui/Text';
import { makeStyles, useStyleChoice, useTheme } from '../../../contexts/ThemeContext';
import { DEFAULT_STYLE, THEMES } from '../../../constants/themes';
import type { AppTheme, StyleId } from '../../../constants/themes';
import { loadThemeFonts } from '../../../constants/themes/fonts';

const STYLES = Object.entries(THEMES) as [StyleId, AppTheme][];

export default function AppearanceScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { activeId, setStyle } = useStyleChoice();
  const [, setFontsLoaded] = useState(false);

  // Sul web i campioni del carattere hanno bisogno dei file di ogni stile (sul telefono sono già nell'app).
  useEffect(() => {
    let alive = true;
    Promise.all(STYLES.map(([, th]) => loadThemeFonts(th).catch(() => {}))).then(() => { if (alive) setFontsLoaded(true); });
    return () => { alive = false; };
  }, []);

  return (
    <View style={styles.container}>
    <Backdrop />
    <ScrollView contentContainerStyle={{ padding: t.spacing.screenPadding, paddingBottom: insets.bottom + 24 }}>
      <Text style={styles.intro}>Lo stile cambia colori, caratteri e forme. Schermate e dati restano uguali. La scelta vale per questo dispositivo.</Text>

      {STYLES.map(([id, th]) => {
        const selected = activeId === id;
        return (
          <Pressable
            key={id}
            style={[styles.row, selected && styles.rowSelected]}
            onPress={() => setStyle(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={th.name}
          >
            <View style={[styles.strip, { borderColor: t.colors.border }]}>
              <View style={[styles.swatch, { backgroundColor: th.colors.background }]} />
              <View style={[styles.swatch, { backgroundColor: th.colors.surface }]} />
              <View style={[styles.swatch, { backgroundColor: th.colors.accent }]} />
            </View>
            <View style={styles.texts}>
              <Text style={styles.name}>{th.name}</Text>
              <Text style={[styles.sample, fontStyle(th, '400')]}>Aa · Visone 4.200 €</Text>
              {id === DEFAULT_STYLE && <Text style={styles.note}>Predefinito</Text>}
            </View>
            <AppIcon
              name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={24}
              color={selected ? t.colors.checkOn : t.colors.checkRing}
            />
          </Pressable>
        );
      })}
    </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  intro: {
    ...t.typography.caption,
    marginBottom: 16,
  },
  row: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowSelected: {
    backgroundColor: t.colors.tileSelected,
    borderColor: t.colors.tileSelectedBorder,
  },
  strip: {
    flexDirection: 'row',
    width: 72,
    height: 48,
    borderRadius: t.radius.small,
    borderWidth: 1,
    overflow: 'hidden',
  },
  swatch: {
    flex: 1,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...t.typography.cardTitle,
    fontSize: 15,
  },
  sample: {
    fontSize: 14,
    color: t.colors.textSecondary,
  },
  note: {
    ...t.typography.caption,
    fontSize: 12,
    color: t.colors.textMuted,
  },
}));
