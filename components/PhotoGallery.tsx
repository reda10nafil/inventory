// Galleria delle foto, unica per Scheda, visore, Aggiungi e Modifica (GAL, ticket 27). L'indice lo tiene chi la usa:
// miniature, puntini, frecce ‹ › e ←/→ sul web lo cambiano e la foto grande scorre lì (`scrollTo`); lo scorrimento
// col dito, la rotella o il touchpad lo aggiornano. Prima la miniatura spostava solo il contatore e il cestino stava
// su ogni foto, così si cancellava quella che si vedeva e non quella scelta (CSV-G1); nella Scheda non c'erano
// miniature né frecce (CSV-G2), nel visore solo la X (CSV-G3). In Aggiungi e Modifica (`edit`) sotto la foto: «‹ Sposta»,
// «Sposta ›», «Metti come principale» (la porta in testa: la principale è la prima) ed «Elimina» per la foto scelta,
// con conferma; l'ordine si calcola in `utils/photos.ts`, che sposta insieme i percorsi cloud (CSV-G6). Una foto che
// non si carica (link rotto, `blob:` di una sessione chiusa) mostra «Foto non disponibile» (CSV-I8).
// Varianti: «scheda» (foto intera su fondo, a tutta larghezza), «modulo» (riquadro arrotondato, foto ritagliata),
// «visore» (a tutto schermo, su nero: contatore e X li disegna chi apre il visore).
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Image } from '../src/lib/ExpoImage';
import { AppIcon } from './ui/AppIcon';
import { PhotoPlaceholder } from './ui/PhotoPlaceholder';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { withAlpha } from '../utils/color';
import { clampPhotoIndex, indexAfterRemove, makeMainPhoto, movePhoto, removePhoto, type Photos } from '../utils/photos';

type Variant = 'scheda' | 'modulo' | 'visore';

interface Props {
  images: readonly string[];
  index: number;
  onIndexChange: (index: number) => void;
  variant: Variant;
  width: number;
  height: number;
  /** Tocco sulla foto (Scheda: apre il visore). */
  onOpen?: (index: number) => void;
  /** Frecce della tastiera sul web; Esc chiama `onEscape` (visore). Spento quando la schermata non è in primo piano. */
  keyboard?: boolean;
  onEscape?: () => void;
  /** Aggiungi e Modifica: comandi per la foto scelta. `paths` sono i percorsi cloud allineati alle foto, se ci sono. */
  edit?: { paths?: string[]; onChange: (next: Photos, index: number) => void };
  /** Fila di miniature sotto la foto (con più di una foto); `thumbnailsExtra` va in fondo (pulsanti per aggiungere). */
  thumbnails?: boolean;
  thumbnailsExtra?: React.ReactNode;
}

export function PhotoGallery({ images, index, onIndexChange, variant, width, height, onOpen, keyboard, onEscape, edit, thumbnails, thumbnailsExtra }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const n = images.length;
  const current = clampPhotoIndex(index, n);
  const scroller = useRef<ScrollView>(null);
  const offset = useRef(0); // ultimo scostamento visto: dice se la foto grande è già quella dell'indice
  const startOffset = useRef({ x: current * width, y: 0 }).current; // foto di partenza sul telefono (visore)
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const markFailed = (uri: string) => setFailed((prev) => (prev.has(uri) ? prev : new Set(prev).add(uri)));

  // L'indice comanda: se la foto grande non è quella, si porta lì (anche dopo un'eliminazione o un cambio d'ordine)
  const align = () => {
    if (n > 0 && width > 0 && Math.round(offset.current / width) !== current) {
      scroller.current?.scrollTo({ x: current * width, y: 0, animated: false });
    }
  };
  useEffect(align, [current, width, n]);

  const go = (i: number) => { if (i >= 0 && i < n && i !== current) onIndexChange(i); };

  useEffect(() => {
    if (Platform.OS !== 'web' || !keyboard || typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (e.key === 'Escape' && onEscape) { e.preventDefault(); onEscape(); }
      else if (e.key === 'ArrowLeft' && current > 0) { e.preventDefault(); onIndexChange(current - 1); }
      else if (e.key === 'ArrowRight' && current < n - 1) { e.preventDefault(); onIndexChange(current + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [keyboard, current, n, onIndexChange, onEscape]);

  const scheda = variant === 'scheda';
  const modulo = variant === 'modulo';
  const visore = variant === 'visore';
  const fit = modulo ? 'cover' : 'contain';
  const thumbSize = modulo ? 88 : 60;
  const arrowSize = visore ? 44 : 36;

  // `style` vale per l'immagine e per il riquadro che la sostituisce
  const photo = (uri: string, style: any, iconSize: number, withText: boolean) => (failed.has(uri) ? (
    <View accessibilityLabel="Foto non disponibile" style={[style, styles.broken, visore && styles.viewerBroken]}>
      <AppIcon name="broken-image" size={iconSize} color={t.colors.textMuted} />
      {withText && <Text style={styles.brokenText}>Foto non disponibile</Text>}
    </View>
  ) : (
    <Image source={{ uri }} style={style} contentFit={fit} onError={() => markFailed(uri)} />
  ));

  const page = (uri: string, i: number) => {
    const frame = { width, height };
    // Nel visore nessun fondo: resta il nero del visore (con il fondo del tema, negli stili chiari X e contatore bianchi
    // non si vedevano)
    const content = photo(uri, [frame, modulo ? styles.moduloPhoto : !visore && styles.wholePhoto], visore ? 56 : 40, true);
    // Sul web il visore (Modal di react-native-web), chiudendosi, rimette il fuoco sulla foto toccata e il browser fa
    // scorrere la galleria fino a lei: la Scheda tornava alla foto aperta invece che all'ultima vista nel visore. Senza
    // fuoco resta sull'ultima, come sul telefono.
    const open = () => {
      if (Platform.OS === 'web' && typeof document !== 'undefined') (document.activeElement as HTMLElement | null)?.blur?.();
      onOpen?.(i);
    };
    return onOpen ? (
      <Pressable key={i} style={frame} onPress={open} accessibilityRole="button" accessibilityLabel={`Apri la foto ${i + 1} a tutto schermo`}>
        {content}
      </Pressable>
    ) : (
      <View key={i} style={[frame, visore && styles.viewerPage]}>{content}</View>
    );
  };

  const apply = (next: Photos, nextIndex: number) => edit?.onChange(next, nextIndex);
  const set: Photos = { images: [...images], ...(edit?.paths && { storageImagePaths: edit.paths }) };
  const confirmRemove = () => {
    Alert.alert(`Eliminare la foto ${current + 1}?`, undefined, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: () => apply(removePhoto(set, current), indexAfterRemove(current, current, n - 1)) },
    ]);
  };

  const box = n === 0 ? (
    modulo ? null : <PhotoPlaceholder size={56} style={{ width, height }} />
  ) : (
    <View style={[styles.box, modulo && styles.moduloBox, { width, height }]}>
      <ScrollView
        ref={scroller}
        testID="galleria-foto"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ width, height }}
        contentOffset={startOffset}
        onContentSizeChange={align}
        onScroll={(event) => {
          offset.current = event.nativeEvent.contentOffset.x;
          go(clampPhotoIndex(offset.current / width, n));
        }}
        scrollEventThrottle={16}
      >
        {images.map(page)}
      </ScrollView>

      {n > 1 && !visore && (
        <View style={[styles.counter, modulo && styles.moduloCounter]} pointerEvents="none">
          <Text style={[styles.counterText, modulo && styles.moduloCounterText]}>{modulo ? `${current + 1} / ${n}` : `${current + 1}/${n}`}</Text>
        </View>
      )}

      {n > 1 && current > 0 && (
        <Pressable
          style={[styles.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: (height - arrowSize) / 2, left: 8 }]}
          onPress={() => go(current - 1)}
          accessibilityRole="button"
          accessibilityLabel="Foto precedente"
        >
          <AppIcon name="chevron-left" size={visore ? 32 : 26} color={t.colors.onData} />
        </Pressable>
      )}
      {n > 1 && current < n - 1 && (
        <Pressable
          style={[styles.arrow, { width: arrowSize, height: arrowSize, borderRadius: arrowSize / 2, top: (height - arrowSize) / 2, right: 8 }]}
          onPress={() => go(current + 1)}
          accessibilityRole="button"
          accessibilityLabel="Foto successiva"
        >
          <AppIcon name="chevron-right" size={visore ? 32 : 26} color={t.colors.onData} />
        </Pressable>
      )}

      {n > 1 && !visore && (
        <View style={[styles.dots, modulo && styles.moduloDots]}>
          {images.map((_, i) => (
            <Pressable key={i} style={styles.dotHit} onPress={() => go(i)} accessibilityRole="button" accessibilityLabel={`Vai alla foto ${i + 1}`}>
              <View style={[modulo ? styles.moduloDot : styles.dot, i === current && (modulo ? styles.moduloDotActive : styles.dotActive)]} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  const tools = edit && n > 0 && (
    <View style={styles.tools}>
      {n > 1 && (
        <View style={styles.toolRow}>
          <Pressable
            style={[styles.tool, current === 0 && styles.toolOff]}
            disabled={current === 0}
            onPress={() => apply(movePhoto(set, current, current - 1), current - 1)}
            accessibilityRole="button"
            accessibilityLabel={`Sposta la foto ${current + 1} a sinistra`}
          >
            <Text style={styles.toolText}>‹ Sposta</Text>
          </Pressable>
          <Pressable
            style={[styles.tool, current === n - 1 && styles.toolOff]}
            disabled={current === n - 1}
            onPress={() => apply(movePhoto(set, current, current + 1), current + 1)}
            accessibilityRole="button"
            accessibilityLabel={`Sposta la foto ${current + 1} a destra`}
          >
            <Text style={styles.toolText}>Sposta ›</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.toolRow}>
        {current === 0 ? (
          <View style={[styles.tool, styles.mainBadge]} accessibilityLabel="La prima foto è la principale">
            <AppIcon name="star" size={18} color={t.colors.accentInk} />
            <Text style={styles.mainBadgeText}>Foto principale</Text>
          </View>
        ) : (
          <Pressable style={styles.tool} onPress={() => apply(makeMainPhoto(set, current), 0)} accessibilityRole="button">
            <AppIcon name="star-border" size={18} color={t.colors.onButtonSecondary} />
            <Text style={styles.toolText}>Metti come principale</Text>
          </Pressable>
        )}
        <Pressable style={[styles.tool, styles.toolDelete]} onPress={confirmRemove} accessibilityRole="button" accessibilityLabel={`Elimina la foto ${current + 1}`}>
          <AppIcon name="delete-outline" size={18} color={t.colors.error} />
          <Text style={[styles.toolText, { color: t.colors.error }]}>Elimina</Text>
        </Pressable>
      </View>
    </View>
  );

  const row = thumbnails && (n > 1 || thumbnailsExtra) && (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={scheda ? styles.schedaThumbs : undefined}
      contentContainerStyle={[styles.thumbRow, scheda ? styles.schedaThumbRow : styles.moduloThumbRow]}
    >
      {n > 1 && images.map((uri, i) => (
        <Pressable
          key={i}
          onPress={() => go(i)}
          accessibilityRole="button"
          accessibilityLabel={`Mostra la foto ${i + 1}`}
          accessibilityState={{ selected: i === current }}
        >
          {photo(uri, [styles.thumb, { width: thumbSize, height: thumbSize }, i === current && styles.thumbActive], 22, false)}
        </Pressable>
      ))}
      {thumbnailsExtra}
    </ScrollView>
  );

  return (
    <View style={visore ? styles.viewer : undefined}>
      {box}
      {tools}
      {row}
    </View>
  );
}

// Contatore, frecce e puntini stanno sopra la foto: bianchi fissi su velo nero, uguali in tutti gli stili (come prima
// nella Scheda); nel modulo il puntino acceso ha il colore d'accento (come prima in Aggiungi e Modifica).
const useStyles = makeStyles((t) => ({
  viewer: { flex: 1, justifyContent: 'center' },
  box: { position: 'relative' },
  moduloBox: { marginBottom: 12, borderRadius: t.radius.card, overflow: 'hidden' },
  wholePhoto: { backgroundColor: t.colors.backgroundSecondary },
  moduloPhoto: { backgroundColor: t.colors.surface },
  viewerPage: { justifyContent: 'center', alignItems: 'center' },
  broken: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.colors.backgroundSecondary },
  viewerBroken: { backgroundColor: 'transparent' },
  brokenText: { fontSize: 13, lineHeight: 17, fontWeight: '600', color: t.colors.textMuted, textAlign: 'center' },
  counter: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: withAlpha(t.colors.shadow, 0.55),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  counterText: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: t.colors.onData },
  moduloCounter: { top: 12, left: 12, backgroundColor: t.colors.scrimStrong, paddingHorizontal: 12, paddingVertical: 6, borderRadius: t.radius.badge },
  moduloCounterText: { fontSize: 13, lineHeight: 17 },
  arrow: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.scrimStrong },
  dots: { position: 'absolute', bottom: 8, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  moduloDots: { bottom: 6 },
  dotHit: { paddingHorizontal: 3, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: withAlpha(t.colors.onData, 0.55) },
  dotActive: { width: 18, backgroundColor: t.colors.onData },
  moduloDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: withAlpha(t.colors.onData, 0.5) },
  moduloDotActive: { width: 24, backgroundColor: t.colors.accent },
  tools: { gap: 8, marginBottom: 12 },
  toolRow: { flexDirection: 'row', gap: 8 },
  tool: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  toolOff: { opacity: 0.4 },
  toolDelete: { flex: 0, minWidth: 112 },
  toolText: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: t.colors.onButtonSecondary, textAlign: 'center' },
  mainBadge: { backgroundColor: t.colors.accentSoft, borderColor: 'transparent' },
  mainBadgeText: { fontSize: 14, lineHeight: 18, fontWeight: '600', color: t.colors.accentInk },
  schedaThumbs: { paddingTop: 12 },
  thumbRow: { flexDirection: 'row' },
  schedaThumbRow: { gap: 8, paddingHorizontal: t.spacing.screenPadding },
  moduloThumbRow: { gap: 12 },
  thumb: { borderRadius: t.radius.tile, backgroundColor: t.colors.surface, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: t.colors.accent },
}));
