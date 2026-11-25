// Binario di pillole (R1 di UX0; UX1-0, è `ChipRail` di EDC spostato qui): una riga sola che scorre in orizzontale,
// **sempre a larghezza intera** (in un modulo a colonne il campo prende la riga intera, `choiceRowSize`). Lo usano
// `ChoicePicker` (aspetto «Binario orizzontale»: Tipo di pelle, Posizione, campi a scelta) e `CategoryPicker`
// (categorie e sottocategorie); le fette dopo per ogni scelta nuova a pillole (MOD, MCAT, MSET).
// - Le pillole le disegna chi lo usa, ognuna con la sua `key`, con `RAIL_PILL` (alte 36, margine interno 14) e
//   `RAIL_HIT_SLOP` (44 da toccare), la spunta sulla scelta e `chipActive` (il colore da solo non basta); `selected` è
//   l'indice della pillola scelta (−1 nessuna).
// - Il binario arriva fino al bordo dello schermo (`bleed`, di solito il margine laterale della schermata): la prima
//   pillola resta allineata al modulo e le pillole scorrono fino al bordo.
// - All'apertura **la scelta entra in vista** e **l'ultima pillola a vista è tagliata**: lo spazio tra le pillole è 8,
//   e cambia (da 4 a 16) solo se altrimenti l'ultima starebbe quasi tutta dentro o appena affacciata (`railGap` in
//   `utils/choiceRail.ts`). Si decide quando le pillole sono misurate, e di nuovo solo se cambiano le pillole (le loro
//   chiavi), la larghezza o lo stile: un tocco su una pillola non fa scorrere né cambia lo spazio. Un binario che deve
//   ripartire da capo con pillole nuove (le sottocategorie di un'altra categoria) si monta con una `key` nuova.
// - Sul bordo una sfumatura col fondo della schermata (`background`) finché il binario continua.
// Solo ruoli del tema; `label` è l'etichetta della riga per lo screen reader e le prove («Scelte di Posizione»).
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { LinearGradient } from '../../src/lib/LinearGradient';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';
import { withAlpha } from '../../utils/color';
import { RAIL_FADE, RAIL_GAP, railGap, railOpenScroll } from '../../utils/choiceRail';

/** Misure di una pillola del binario (R1): alta 36, margine interno 14. */
export const RAIL_PILL = { height: 36, paddingHorizontal: 14 } as const;
/** Zona toccabile della pillola fino a 44. */
export const RAIL_HIT_SLOP = { top: 4, bottom: 4 } as const;

interface Props {
  children: React.ReactNode;
  label?: string;
  /** Indice della pillola scelta, −1 nessuna. */
  selected?: number;
  /** Quanto il binario esce dai lati fino al bordo dello schermo (predefinito il margine laterale della schermata). */
  bleed?: number;
}

export function ChoiceRail({ children, label, selected = -1, bleed }: Props) {
  const t = useTheme();
  const styles = useStyles();
  const side = bleed ?? t.spacing.screenPadding;
  const items = React.Children.toArray(children);
  const keys = items.map((child, i) => String(React.isValidElement(child) && child.key != null ? child.key : i));
  const ref = useRef<ScrollView>(null);
  const pendingScroll = useRef<number | null>(null);
  const [width, setWidth] = useState(0);
  // Larghezza di ogni pillola per chiave: una pillola nuova non prende la misura di quella che stava al suo posto
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [layout, setLayout] = useState<{ gap: number; signature: string } | null>(null);
  const [content, setContent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const sizes = keys.map((k) => widths[k] ?? 0);
  const measured = width > 0 && items.length > 0 && sizes.every((w) => w > 0);
  const signature = `${keys.join('|')}#${width}#${side}#${t.id}`;
  const gap = layout?.gap ?? RAIL_GAP;
  const more = content > width + 1 && !atEnd;

  // Pillole misurate (all'apertura, o con pillole, larghezza o stile nuovi): lo spazio che taglia l'ultima a vista e
  // la scelta in vista
  useEffect(() => {
    if (!measured || layout?.signature === signature) return;
    const visible = width - side; // dall'inizio della prima pillola al bordo dello schermo
    const next = railGap(sizes, visible);
    pendingScroll.current = railOpenScroll(sizes, visible, next, selected);
    setLayout({ gap: next, signature });
  }, [measured, signature]);
  useEffect(() => {
    // Si riparte dall'inizio, o dalla scelta se non è a vista
    if (pendingScroll.current != null) ref.current?.scrollTo({ x: pendingScroll.current, animated: false });
    pendingScroll.current = null;
  }, [layout]);

  const measure = (key: string) => (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setWidths((prev) => (prev[key] === w ? prev : { ...prev, [key]: w }));
  };
  // Solo «c'è ancora qualcosa a destra?» nello stato: lo scorrere non ridisegna le pillole
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const end = contentOffset.x + layoutMeasurement.width >= contentSize.width - 4;
    if (end !== atEnd) setAtEnd(end);
  };

  return (
    <View style={[styles.rail, { marginHorizontal: -side }]} onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { gap, paddingLeft: side, paddingRight: side + RAIL_GAP }]}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={onScroll}
        scrollEventThrottle={32}
        accessibilityLabel={label}
      >
        {items.map((child, i) => (
          <View key={keys[i]} onLayout={measure(keys[i])}>
            {child}
          </View>
        ))}
      </ScrollView>
      {more && (
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(t.colors.background, 0), t.colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fade}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  rail: { position: 'relative' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  fade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: RAIL_FADE },
}));
