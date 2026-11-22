// Barra in basso ridisegnata (lavoro L6f, tavola «Barra» della tela), stesse 5 voci in tutti gli stili.
// Varianti lette dal tema: sospesa con margini e raggio o ancorata al fondo (`t.bar.floating`), vetro o fondo pieno
// (`Glass`), voce attiva su pillola sfumata, riquadro, lineetta sopra o solo colore (`t.tab`).
// La barra occupa il suo spazio (le schermate non le passano sotto): intorno alla barra sospesa si vede lo sfondo
// dello stile, disegnato allineato a quello delle schermate.
import React from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../../components/ui/Backdrop';
import { Glass } from '../../components/ui/Glass';
import { GradientFill } from '../../components/ui/GradientFill';
import { Text } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const floating = t.bar.floating;

  return (
    <View style={styles.wrapper}>
      {floating && (
        <View pointerEvents="none" style={[styles.backdropSlice, { height }]}>
          <Backdrop />
        </View>
      )}
      <View
        style={[
          styles.bar,
          floating
            ? { marginHorizontal: t.bar.marginHorizontal, marginBottom: t.bar.marginBottom + insets.bottom, paddingBottom: t.bar.paddingBottom }
            : { paddingBottom: Math.max(t.bar.paddingBottom, insets.bottom + 8) },
        ]}
        accessibilityRole="tablist"
      >
        <Glass style={{ borderRadius: t.radius.bar }} />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const color = focused ? t.tab.activeColor : t.tab.color;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={[styles.item, focused && styles.itemActive]}
            >
              {focused && <GradientFill gradient={t.gradients.tabActive} style={{ borderRadius: t.radius.tabActive }} />}
              {focused && t.tab.activeIndicator === 'line' && <View style={styles.line} />}
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              <Text numberOfLines={1} style={[styles.label, { color }, focused && styles.labelActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: {
    backgroundColor: t.bar.floating ? t.colors.background : 'transparent',
    overflow: 'hidden',
  },
  backdropSlice: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    gap: 2,
    paddingTop: 8,
    paddingHorizontal: 6,
    borderRadius: t.radius.bar,
    borderWidth: t.bar.borderWidth,
    borderColor: t.bar.borderColor,
    ...t.shadows.bar,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 3,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: t.radius.tabActive,
  },
  itemActive: {
    backgroundColor: t.tab.activeBackground,
    ...t.shadows.tabActive,
  },
  line: {
    position: 'absolute',
    top: -8,
    left: '50%',
    width: 22,
    marginLeft: -11,
    height: 2,
    borderRadius: 2,
    backgroundColor: t.colors.accent,
  },
  label: {
    fontSize: t.tab.labelSize,
    lineHeight: 14,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: t.tab.activeWeight,
  },
}));

export default TabBar;
