// Finestra dal basso (R14 di UX0; UX1-0): **l'unica finestra dal basso delle scelte**, cioè la ruota in una colonna
// (`FieldInput`), l'«Elenco dal basso» delle scelte (`ChoicePicker`) e la categoria dello scaffale (`CategorySelect`).
// Le fette dopo la usano per scegliere, confermare o impostare una cosa sola (MOD, MCAT, ETI, N1, S3).
// - In alto la maniglia, il titolo e la X («Chiudi»); sotto `top` (una riga fissa, per esempio la ricerca), poi il
//   contenuto che scorre (`children`, i tocchi arrivano anche con la tastiera aperta) e, se c'è, `footer`: la barra in
//   basso fissa con il pulsante («Fatto», «Conferma Selezione»: `SheetButton`), dentro l'area sicura.
// - Alta al massimo il 90% dello schermo; il contenuto si accorcia e scorre, la barra resta a vista.
// - Si chiude con la X, toccando la velatura (`scrim`, etichetta `scrimLabel`), con Esc (sul web, dal `Modal`) e con il
//   tasto Indietro: quello del telefono arriva al `Modal` (`onRequestClose`); sul web quello del browser toglie una voce
//   della storia aggiunta all'apertura, con lo stesso indirizzo e lo stesso id di React Navigation (che così resta sulla
//   stessa schermata). Chiusa in un altro modo, la voce si toglie da sola: dopo la chiusura la storia è quella di prima.
//   Una finestra che si apre mentre la voce di quella appena chiusa si sta togliendo aspetta che sia tolta (il
//   `history.back()` è asincrono e il suo `popstate` non deve chiudere la finestra nuova). Chi chiude la finestra e cambia
//   subito schermata deve farlo dopo la chiusura. Una finestra che chiede conferma prima di chiudersi non va: Indietro
//   ha già tolto la voce. Se React Navigation riscrive la voce mentre la finestra è aperta, o la pagina si ricarica con la
//   finestra aperta, la voce resta (un Indietro in più che non cambia schermata).
// Solo ruoli del tema: fondo `backgroundSecondary`, bordo `border`, maniglia `border`, velatura `scrim`, raggio `card`.
import React, { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './AppIcon';
import { GradientFill } from './GradientFill';
import { Text } from './Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Riga fissa sotto il titolo, fuori dallo scorrere (la ricerca delle categorie). */
  top?: React.ReactNode;
  /** Barra in basso fissa (R11): il pulsante della finestra. */
  footer?: React.ReactNode;
  /** Etichetta della velatura che chiude (per lo screen reader e le prove). */
  scrimLabel?: string;
}

// Storia del browser condivisa tra le finestre (web): quanti `history.back()` chiamati dalle finestre stesse non sono
// ancora arrivati, e le finestre che aspettano quel momento per aggiungere la loro voce. `ownPop` vale per il `popstate`
// in corso (l'ascoltatore comune è registrato prima di quelli delle finestre, quindi lo vedono già).
let ownBacks = 0;
let backGeneration = 0;
let ownPop = false;
const afterBacks: (() => void)[] = [];
let listening = false;
const flushAfterBacks = () => afterBacks.splice(0).forEach((push) => push());
function listenOnce() {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', () => {
    ownPop = ownBacks > 0;
    if (!ownPop) return;
    ownBacks -= 1;
    if (ownBacks === 0) flushAfterBacks();
  });
}

/** Sul web il tasto Indietro del browser chiude la finestra aperta invece di lasciare la schermata. */
function useWebBack(visible: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return undefined;
    listenOnce();
    const token = `sheet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let pushed = false;
    let closed = false;
    const onPop = () => { if (!ownPop) close.current(); };
    const push = () => {
      if (closed) return;
      const state = window.history.state;
      window.history.pushState({ ...(state && typeof state === 'object' ? state : {}), sheet: token }, '');
      window.addEventListener('popstate', onPop);
      pushed = true;
    };
    if (ownBacks > 0) afterBacks.push(push);
    else push();
    return () => {
      closed = true;
      window.removeEventListener('popstate', onPop);
      if (!pushed || window.history.state?.sheet !== token) return;
      ownBacks += 1;
      const generation = ++backGeneration;
      window.history.back();
      // Se il `popstate` non arriva (pagina lasciata), le finestre dopo non restano senza voce
      setTimeout(() => { if (generation === backGeneration && ownBacks > 0) { ownBacks = 0; flushAfterBacks(); } }, 1500);
    };
  }, [visible]);
}

export function Sheet({ visible, onClose, title, children, top, footer, scrimLabel = 'Chiudi la finestra' }: Props) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  useWebBack(visible, onClose);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel={scrimLabel} />
        <View style={[styles.sheet, !footer && { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Chiudi">
              <AppIcon name="close" size={24} color={t.colors.textSecondary} />
            </Pressable>
          </View>
          {top}
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? <View style={[styles.footer, { paddingBottom: 14 + insets.bottom }]}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** Pulsante principale della barra in basso (R11): a tutta larghezza, alto 52, ruoli del pulsante del tema. */
export function SheetButton({ label, onPress }: { label: string; onPress: () => void }) {
  const styles = useStyles();
  const t = useTheme();
  return (
    <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
      <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: t.colors.scrim },
  scrim: { flex: 1 },
  sheet: {
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8, backgroundColor: t.colors.border },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: { flex: 1, ...t.typography.cardTitle, fontSize: 18, fontWeight: t.weights.strong },
  body: { flexShrink: 1 },
  bodyContent: { paddingHorizontal: 18, paddingBottom: 8 },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  button: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    overflow: 'hidden',
    ...t.shadows.button,
  },
  buttonText: { fontSize: 16, fontWeight: '600', color: t.colors.onButton },
}));
