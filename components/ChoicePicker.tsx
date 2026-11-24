// Scelte di un campo nell'aspetto scelto (EDC, ticket 23; richieste dell'utente del 24 e regole R1-R3 di UX0): un
// disegno solo per i campi a scelta (`FieldInput`), per i campi Base Posizione e Tipo di pelle in Aggiungi e Modifica e
// per la Categoria in colonna (`CategoryPicker`).
// - `chips` **binario orizzontale** (predefinito delle pillole, R1): una riga sola che scorre, **solo a larghezza
//   intera**; pillole alte 36 (44 da toccare), la scelta ha la spunta, all'apertura la scelta entra in vista, l'ultima
//   pillola resta tagliata e una sfumatura col fondo del tema dice che continua;
// - `wrap` a capo; `tiles` riquadri (tre per riga); `list` elenco verticale; `dropdown` **tendina** in linea (R2: fino
//   a 5 righe da 48 a vista, le altre scorrono); `sheet` elenco dal basso (finestra);
// - `wheel` **ruota** «stile orologio» (R3): rullo verticale di 5 righe da 36, la fascia al centro è il valore; lo
//   scorrere (dito, rotella, trascinamento) si ferma da solo sul valore più vicino; ogni riga si può anche toccare; la
//   prima voce «–» è «nessuno».
// **In una colonna (1/2, 1/3, `narrow`) binario, a capo, elenco verticale e ruota diventano tendina** (R1, R2): mai un
// binario stretto o pillole a capo (D09). Chi lo usa dice quali opzioni sono scelte (`selected`) e che cosa fa un tocco
// (`onPick`); `onClear` toglie la scelta (voce «–» della ruota). Colore e icona delle opzioni con `OptionMark`.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { OptionMark, hasMark } from './OptionMark';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text } from './ui/Text';
import { formStyles } from './ui/formStyles';
import { LinearGradient } from '../src/lib/LinearGradient';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { withAlpha } from '../utils/color';
import type { ChoiceLook, FieldOption } from '../utils/fieldValues';

/** Opzione da disegnare; `a11y` è l'etichetta per lo screen reader (Categoria: «Categoria Pellicce»). */
export type PickOption = FieldOption & { a11y?: string };

/** Aspetto che si disegna davvero: in una colonna binario, a capo, elenco verticale e ruota diventano tendina (R1). */
export function effectiveLook(look: ChoiceLook, narrow: boolean): ChoiceLook {
  return narrow && (look === 'chips' || look === 'wrap' || look === 'list' || look === 'wheel') ? 'dropdown' : look;
}

/** Aspetti a tutta larghezza nel modulo di Aggiungi (i riquadri lo sono sempre). */
export const isWideLook = (look: ChoiceLook): boolean => look === 'tiles' || look === 'chips' || look === 'wrap' || look === 'list' || look === 'wheel';

// ── Binario orizzontale ─────────────────────────────────────

/** Riga sola di pillole che scorre in orizzontale, con la sfumatura a destra finché continua. `scrollRef` per portare
 *  in vista la pillola scelta. */
export function ChipRail({ children, label, scrollRef }: { children: React.ReactNode; label?: string; scrollRef?: React.RefObject<ScrollView | null> }) {
  const styles = useStyles();
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const [content, setContent] = useState(0);
  const [x, setX] = useState(0);
  const more = content > width + 1 && x + width < content - 4;
  return (
    <View style={styles.rail} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railRow}
        onContentSizeChange={(w) => setContent(w)}
        onScroll={(e) => setX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={32}
        accessibilityLabel={label}
      >
        {children}
      </ScrollView>
      {more && (
        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(t.colors.background, 0), t.colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.railFade}
        />
      )}
    </View>
  );
}

// ── Ruota ────────────────────────────────────────────────────

const ROW = 36;
const VISIBLE = 5;
const BAND = 44;

export interface WheelItem { key: string; text: string; a11y: string }

/**
 * Rullo verticale «stile orologio» (R3): 5 righe da 36, la fascia al centro (44) è la scelta. `index` −1 = nessuna (la
 * voce «–» in cima). Lo scorrere si ferma sulla riga più vicina e la sceglie; un tocco su una riga la sceglie e la porta
 * al centro.
 */
export function Wheel({ items, index, onSelect, name }: {
  items: readonly WheelItem[]; index: number; onSelect: (index: number) => void; name: string;
}) {
  const styles = useStyles();
  const ref = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const y = useRef(0);
  const rows = useMemo(() => [{ key: '__none', text: '–', a11y: `${name} nessuno` }, ...items], [items, name]);
  const row = index + 1;

  // Il valore scelto (anche da fuori: modulo svuotato, valore di prima) sta al centro
  useEffect(() => {
    if (Math.abs(y.current - row * ROW) < 1) return;
    ref.current?.scrollTo({ y: row * ROW, animated: false });
    y.current = row * ROW;
  }, [row]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const settle = () => {
    const r = Math.min(rows.length - 1, Math.max(0, Math.round(y.current / ROW)));
    if (r !== row) onSelect(r - 1);
    if (Math.abs(y.current - r * ROW) >= 1) ref.current?.scrollTo({ y: r * ROW, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    y.current = e.nativeEvent.contentOffset.y;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(settle, 160);
  };

  return (
    <View style={styles.wheel} accessibilityLabel={`Ruota ${name}`}>
      <View style={styles.wheelBand} pointerEvents="none" />
      <ScrollView
        ref={ref}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
        decelerationRate="fast"
        contentContainerStyle={styles.wheelContent}
        onScroll={onScroll}
        scrollEventThrottle={32}
        onMomentumScrollEnd={(e) => { y.current = e.nativeEvent.contentOffset.y; if (timer.current) clearTimeout(timer.current); settle(); }}
      >
        {rows.map((item, r) => {
          const on = r === row;
          return (
            <Pressable
              key={item.key}
              style={styles.wheelRow}
              onPress={() => { if (r !== row) onSelect(r - 1); y.current = r * ROW; ref.current?.scrollTo({ y: r * ROW, animated: true }); }}
              accessibilityRole="button"
              accessibilityLabel={item.a11y}
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.wheelText, on && styles.wheelTextOn]} numberOfLines={1}>{item.text}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Finestra dal basso con un contenuto (la ruota nelle colonne, R3) e «Fatto». */
export function BottomSheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  const styles = useStyles();
  const t = useTheme();
  if (!open) return null;
  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetScrim}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi">
              <AppIcon name="close" size={24} color={t.colors.textPrimary} />
            </Pressable>
          </View>
          {children}
          <Pressable style={[styles.primaryButton, styles.sheetConfirm]} onPress={onClose} accessibilityRole="button">
            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
            <Text style={styles.primaryButtonText}>Fatto</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Scelte ───────────────────────────────────────────────────

interface Props {
  /** Nome del campo: titolo dell'elenco dal basso, etichette per lo screen reader. */
  name: string;
  look: ChoiceLook;
  options: readonly PickOption[];
  selected: (option: FieldOption) => boolean;
  onPick: (option: FieldOption) => void;
  /** Toglie la scelta (voce «–» della ruota). */
  onClear?: () => void;
  multi?: boolean;
  small?: boolean;
  /** In una colonna da 1/2 o 1/3: binario, a capo, elenco verticale e ruota diventano tendina (R1). */
  narrow?: boolean;
  /** Larghezza di un riquadro (tre per riga). */
  tileWidth?: number;
  /** Icona del campo nella casella della tendina e dell'elenco dal basso. */
  icon?: string;
  /** Testo della casella (tendina, elenco dal basso): il valore, oppure il segnaposto con `empty`. */
  shown: string;
  empty: boolean;
}

const DROP_ROW = 48;

export function ChoicePicker({ name, look: chosenLook, options, selected, onPick, onClear, multi = false, small = false, narrow = false, tileWidth, icon, shown, empty }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const look = effectiveLook(chosenLook, narrow);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const railRef = useRef<ScrollView>(null);
  const focused = useRef(false);
  const chosen = options.filter(selected);
  const chosenOne = !multi ? chosen[0] : undefined;

  const pill = (opt: PickOption) => {
    const on = selected(opt);
    return (
      <Pressable
        key={opt.id || '__none'}
        style={[styles.chip, styles.railChip, on && styles.chipActive]}
        onPress={() => onPick(opt)}
        hitSlop={{ top: 4, bottom: 4 }}
        accessibilityLabel={opt.a11y}
        // All'apertura la scelta entra in vista (R1), una volta sola
        onLayout={on && !focused.current ? (e) => {
          focused.current = true;
          const x = e.nativeEvent.layout.x;
          if (x > 0) railRef.current?.scrollTo({ x: Math.max(0, x - 24), animated: false });
        } : undefined}
      >
        {on && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
        {multi
          ? <AppIcon name={on ? 'check-box' : 'check-box-outline-blank'} size={16} color={on ? t.colors.chipActiveText : t.colors.checkRing} />
          : on ? <AppIcon name="check" size={16} color={t.colors.chipActiveText} /> : null}
        {hasMark(opt) && <OptionMark option={opt} size={10} iconColor={on ? t.colors.chipActiveText : undefined} />}
        <Text style={[styles.chipText, on && styles.chipTextActive]} numberOfLines={1}>{opt.label}</Text>
      </Pressable>
    );
  };

  if (look === 'chips') return <ChipRail label={`Scelte di ${name}`} scrollRef={railRef}>{options.map(pill)}</ChipRail>;
  if (look === 'wrap') return <View style={styles.wrapRow}>{options.map(pill)}</View>;

  if (look === 'list') {
    // === Elenco verticale: una riga per valore, tutte a vista ===
    return (
      <View style={styles.listBox}>
        {options.map((opt, i) => {
          const on = selected(opt);
          const tick = multi ? (on ? 'check-box' : 'check-box-outline-blank') : (on ? 'radio-button-checked' : 'radio-button-unchecked');
          return (
            <Pressable key={opt.id || '__none'} style={[styles.dropRow, i > 0 && styles.dropRowLine, on && styles.dropRowOn]} onPress={() => onPick(opt)} accessibilityLabel={opt.a11y}>
              <AppIcon name={tick} size={20} color={on ? t.colors.checkOn : t.colors.checkRing} />
              {hasMark(opt) && <OptionMark option={opt} />}
              <Text style={[styles.dropRowText, on && styles.sheetRowTextSelected]} numberOfLines={2}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (look === 'wheel') {
    const index = chosenOne ? options.indexOf(chosenOne) : -1;
    return (
      <View style={styles.bottom}>
        <Wheel
          name={name}
          index={index}
          items={options.map((o) => ({ key: o.id || '__none', text: o.label, a11y: `${name} ${o.label}` }))}
          onSelect={(i) => (i < 0 ? onClear?.() : onPick(options[i]))}
        />
      </View>
    );
  }

  if (look === 'sheet') {
    // === Elenco dal basso. A 1/3 testo in 13 px e diciture corte; un valore lungo finisce con «…» ===
    return (
      <>
        <Pressable style={[styles.inputBox, small && styles.inputBoxSmall, styles.bottom]} onPress={() => setSheetOpen(true)}>
          {!small && icon && <AppIcon name={icon} size={18} color={t.colors.fieldIcon} />}
          {hasMark(chosenOne) && <OptionMark option={chosenOne} />}
          <Text style={[styles.valueText, small && styles.valueTextSmall, empty && styles.valuePlaceholder]} numberOfLines={1}>{shown}</Text>
          <AppIcon name="keyboard-arrow-down" size={20} color={t.colors.textMuted} />
        </Pressable>
        {sheetOpen && (
          <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setSheetOpen(false)}>
            <View style={styles.sheetScrim}>
              <View style={styles.sheet}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{name}</Text>
                  <Pressable onPress={() => setSheetOpen(false)}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {options.map((opt) => {
                    const on = selected(opt);
                    return (
                      <Pressable
                        key={opt.id || '__none'}
                        style={styles.sheetRow}
                        onPress={() => { onPick(opt); if (!multi) setSheetOpen(false); }}
                        accessibilityLabel={opt.a11y}
                      >
                        {hasMark(opt) && <OptionMark option={opt} size={12} />}
                        <Text style={[styles.sheetRowText, on && styles.sheetRowTextSelected]}>{opt.label}</Text>
                        {on && <AppIcon name="check" size={24} color={t.colors.accentInk} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {multi && (
                  <Pressable style={[styles.primaryButton, styles.sheetConfirm]} onPress={() => setSheetOpen(false)}>
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <Text style={styles.primaryButtonText}>Conferma Selezione</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Modal>
        )}
      </>
    );
  }

  if (look === 'dropdown') {
    // === Tendina in linea (R2): si apre sotto la casella, senza finestra; 5 righe a vista, le altre scorrono ===
    const rows = options.map((opt, i) => {
      const on = selected(opt);
      return (
        <Pressable
          key={opt.id || '__none'}
          style={[styles.dropRow, i > 0 && styles.dropRowLine, on && styles.dropRowOn]}
          onPress={() => { onPick(opt); if (!multi) setDropOpen(false); }}
          accessibilityLabel={opt.a11y}
        >
          {multi && <AppIcon name={on ? 'check-box' : 'check-box-outline-blank'} size={18} color={on ? t.colors.checkOn : t.colors.checkRing} />}
          {hasMark(opt) && <OptionMark option={opt} />}
          <Text style={[styles.dropRowText, on && styles.sheetRowTextSelected]} numberOfLines={2}>{opt.label}</Text>
          {on && !multi && <AppIcon name="check" size={18} color={t.colors.accentInk} />}
        </Pressable>
      );
    });
    return (
      <View style={styles.bottom}>
        <Pressable
          style={[styles.inputBox, small && styles.inputBoxSmall]}
          onPress={() => setDropOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={`${name}: ${shown}`}
          accessibilityState={{ expanded: dropOpen }}
          aria-expanded={dropOpen}
        >
          {!small && icon && <AppIcon name={icon} size={18} color={t.colors.fieldIcon} />}
          {hasMark(chosenOne) && <OptionMark option={chosenOne} />}
          <Text style={[styles.valueText, small && styles.valueTextSmall, empty && styles.valuePlaceholder]} numberOfLines={1}>{shown}</Text>
          <AppIcon name={dropOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color={t.colors.textMuted} />
        </Pressable>
        {dropOpen && (
          <View style={styles.listBox}>
            {options.length > 5
              ? <ScrollView nestedScrollEnabled style={{ maxHeight: DROP_ROW * 5 }}>{rows}</ScrollView>
              : rows}
          </View>
        )}
      </View>
    );
  }

  // === Riquadri (D01: la multipla ha i quadratini di spunta, la singola i cerchi) ===
  return (
    <View style={styles.tileGrid}>
      {options.map((option) => {
        const on = selected(option);
        const tick = multi ? (on ? 'check-box' : 'check-box-outline-blank') : (on ? 'check-circle' : 'radio-button-unchecked');
        return (
          <Pressable
            key={option.id || '__none'}
            style={[styles.tile, tileWidth ? { width: tileWidth } : null, on && styles.tileSelected]}
            onPress={() => onPick(option)}
            accessibilityLabel={option.a11y}
          >
            <AppIcon name={tick} size={22} color={on ? t.colors.checkOn : t.colors.checkRing} />
            {hasMark(option) && <View style={styles.tileMark}><OptionMark option={option} /></View>}
            <Text style={[styles.tileText, on && styles.tileTextSelected]} numberOfLines={2}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  // Binario (R1): pillole da 36, margine interno 14, 8 tra l'una e l'altra; sfumatura col fondo della schermata
  rail: { position: 'relative', width: '100%' },
  railRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingRight: 24 },
  railChip: { height: 36, paddingHorizontal: 14 },
  railFade: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 36 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tileMark: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // Elenco verticale e tendina (righe da 48)
  listBox: {
    marginTop: 6,
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.inputSmall,
    overflow: 'hidden',
  },
  dropRow: { minHeight: DROP_ROW, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dropRowLine: { borderTopWidth: 1, borderTopColor: t.colors.border },
  dropRowOn: { backgroundColor: t.colors.accentSoft },
  dropRowText: { flex: 1, minWidth: 0, fontSize: 15, color: t.colors.inputText },
  // Ruota (R3): 5 righe da 36, fascia `accentSoft` da 44 al centro
  wheel: {
    height: ROW * VISIBLE,
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.input,
    overflow: 'hidden',
  },
  wheelBand: {
    position: 'absolute', left: 6, right: 6, top: (ROW * VISIBLE - BAND) / 2, height: BAND,
    borderRadius: t.radius.inputSmall, backgroundColor: t.colors.accentSoft,
  },
  wheelContent: { paddingVertical: ROW * Math.floor(VISIBLE / 2) },
  wheelRow: { height: ROW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  wheelText: { fontSize: 15, color: t.colors.textMuted },
  wheelTextOn: { fontSize: 18, fontWeight: '700', color: t.colors.accentInk },
}));
