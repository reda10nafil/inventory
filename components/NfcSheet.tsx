// N1 (ticket 16, 18, 22; UX0 piano N1): **finestra dal basso del tag NFC**, una sola per leggere, collegare, scrivere e
// provare un tag. Titolo «Avvicina il tag al telefono», una riga di stato («In attesa…», «Tag letto», «Questo tag è di
// VIS-0098: sostituirlo?»), «Annulla»; un secondo pulsante solo quando serve rispondere («Sostituisci», «Riprova»).
// Mai un codice da scrivere a mano. Le decisioni stanno in `utils/nfcTag.ts` (jest), le chiamate in `nfcService`.
// - `leggi`: il codice del tag (UID collegato, poi il testo) va a `onRead`, cioè al lettore unico come ogni codice;
// - `collega`: l'UID del tag si salva in `nfcTag` di `self` (posizione, scaffale, categoria);
// - `scrivi`: il codice si scrive come testo in un tocco e l'UID si salva in `self` (un prodotto: solo il testo);
// - `prova`: dice che cosa è il tag.
// Sul web: solo la riga «L'NFC si usa dal telefono» (le schermate non la aprono, ma se capita non dice «Errore»).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { useTagLinks } from '../hooks/useTagLinks';
import { nfcService } from '../utils/nfcService';
import type { NfcOutcome } from '../utils/nfcCore';
import type { CodeRef } from '../utils/codes';
import {
  formatUid, linkStep, outcomeText, readStep, testText, textMessage, writeStep, type NfcFailure, type NfcSheetMode,
} from '../utils/nfcTag';

export interface NfcSheetProps {
  visible: boolean;
  mode: NfcSheetMode;
  onClose: () => void;
  /** `scrivi`: il codice da scrivere sul tag. */
  code?: string;
  /** `collega`, `scrivi`: la cosa del tag. */
  self?: CodeRef;
  /** `leggi`: il codice letto, da dare al lettore (la finestra si chiude da sola). */
  onRead?: (code: string) => void;
  /** `collega`, `scrivi`: fatto, con la frase per chi ha aperto la finestra («Tag scritto: VIS-0142.»). */
  onDone?: (text: string) => void;
}

type Phase =
  | { kind: 'attesa' }
  | { kind: 'conferma'; text: string; apply: () => Promise<void> }
  | { kind: 'fine'; text: string; retry: boolean }
  | { kind: 'fatto'; text: string };

const failed = (o: NfcOutcome): o is NfcFailure => !['letto', 'pronto', 'scritto'].includes(o.esito);

export function NfcSheet({ visible, mode, onClose, code = '', self, onRead, onDone }: NfcSheetProps) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { sources, moveTag } = useTagLinks();
  const [phase, setPhase] = useState<Phase>({ kind: 'attesa' });
  const alive = useRef(false);
  const run = useRef(0); // ogni avvio ha il suo numero: un esito di una lettura annullata non tocca quella dopo
  const canLink = !!self && self.kind !== 'product';

  const current = (id: number) => alive.current && run.current === id; // finestra ancora aperta, sullo stesso avvio
  const show = (id: number, next: Phase) => { if (current(id)) setPhase(next); };
  const fail = (id: number, o: NfcFailure) => {
    const text = outcomeText(o, mode, canLink);
    if (text == null) { if (alive.current && run.current === id) onClose(); return; }
    show(id, { kind: 'fine', text, retry: o.esito !== 'non-disponibile' && o.esito !== 'assente' && o.esito !== 'non-ndef' });
  };

  const finish = (id: number, text: string, line: string) => {
    show(id, { kind: 'fatto', text: line });
    setTimeout(() => { if (alive.current && run.current === id) onDone?.(text); }, 600);
  };

  const doWrite = async (id: number, uidHint: string | null, clear: readonly CodeRef[]) => {
    if (!current(id)) { await nfcService.cancel(); return; }
    const res = await nfcService.write(textMessage(code));
    if (failed(res)) return fail(id, res);
    if (res.esito !== 'scritto') return;
    await moveTag(self, formatUid(res.id) ?? uidHint, clear);
    finish(id, `Tag scritto: ${code}.`, 'Tag scritto');
  };

  // «Scrivi tag NFC» col tag aperto: la decisione si rifà sempre sul tag che c'è davvero. `confirmed` = UID del tag per
  // cui l'utente ha già detto «Sostituisci» (iOS: il pannello si chiude per la domanda e il tag si riavvicina; se è un
  // altro tag si chiede di nuovo, mai scritto un tag diverso con i dati del primo)
  const handleOpened = async (id: number, opened: NfcOutcome, confirmed: string | null | undefined): Promise<void> => {
    if (failed(opened)) return fail(id, opened);
    // chiusa mentre aspettava il tag: niente scrittura
    if (opened.esito !== 'pronto' || !current(id)) { await nfcService.cancel(); return; }
    // un prodotto appena aggiunto può non essere ancora nell'elenco: si scrive lo stesso il suo SKU
    const me = self ?? { kind: 'product' as const, id: '' };
    const step = writeStep(opened.tag, code, me, sources, { writable: opened.writable, capacity: opened.capacity }, canLink);
    if (step.kind === 'readonly') { await nfcService.cancel(); return show(id, { kind: 'fine', text: step.text, retry: true }); }
    // stesso tag già confermato (con l'UID: due tag senza UID non si riconoscono, si chiede di nuovo)
    if (step.kind === 'write' || (confirmed != null && step.uid === confirmed)) return doWrite(id, step.uid, step.clear);
    if (!nfcService.holdsTagWhileAsking) await nfcService.cancel(); // iOS: il pannello di sistema coprirebbe la domanda
    show(id, {
      kind: 'conferma',
      text: step.text,
      apply: async () => {
        setPhase({ kind: 'attesa' });
        if (nfcService.holdsTagWhileAsking) return doWrite(id, step.uid, step.clear);
        return handleOpened(id, await nfcService.openForWrite(), step.uid);
      },
    });
  };

  const start = useCallback(async () => {
    const id = ++run.current;
    setPhase({ kind: 'attesa' });
    if (!nfcService.available) { show(id, { kind: 'fine', text: 'L\'NFC si usa dal telefono.', retry: false }); return; }

    if (mode === 'scrivi') {
      const opened = await nfcService.openForWrite();
      return handleOpened(id, opened, undefined);
    }

    const read = await nfcService.read();
    if (failed(read)) return fail(id, read);
    if (read.esito !== 'letto' || !current(id)) return;
    const tag = read.tag;
    if (mode === 'prova') return show(id, { kind: 'fine', text: testText(tag, sources), retry: true });
    if (mode === 'leggi') {
      const step = readStep(tag, sources);
      if (step.kind === 'nothing') return show(id, { kind: 'fine', text: step.text, retry: true });
      show(id, { kind: 'fatto', text: 'Tag letto' });
      if (alive.current && run.current === id) onRead?.(step.code);
      return;
    }
    // collega
    if (!self) return;
    const step = linkStep(tag, self, sources);
    if (step.kind === 'no-id' || step.kind === 'already') return show(id, { kind: 'fine', text: step.text, retry: step.kind === 'no-id' });
    const link = async () => {
      await moveTag(self, step.uid, step.clear);
      finish(id, 'Tag collegato.', 'Tag collegato');
    };
    if (step.kind === 'link') return link();
    show(id, { kind: 'conferma', text: step.text, apply: async () => { setPhase({ kind: 'attesa' }); await link(); } });
  }, [mode, code, self?.kind, self?.id, sources]);

  // Ogni apertura parte da sola (una pressione = una lettura); chiudere annulla quello che è in corso
  useEffect(() => {
    if (!visible) return;
    alive.current = true;
    void start();
    return () => {
      alive.current = false;
      run.current += 1;
      void nfcService.cancel();
    };
  }, [visible]);

  const cancel = () => { void nfcService.cancel(); onClose(); };

  const line = phase.kind === 'attesa' ? 'In attesa…' : phase.text;
  const tone = phase.kind === 'fatto' ? styles.lineOk : phase.kind === 'conferma' ? styles.lineAsk : null;
  const second = phase.kind === 'conferma'
    ? { label: 'Sostituisci', onPress: () => { void phase.apply(); } }
    : phase.kind === 'fine' && phase.retry
      ? { label: mode === 'prova' ? 'Prova un altro' : 'Riprova', onPress: () => { void start(); } }
      : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={cancel} accessibilityLabel="Chiudi la finestra del tag" />
        <View style={[styles.sheet, { paddingBottom: 14 + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.iconWrap}>
            <AppIcon name="nfc" size={40} color={t.colors.accentInk} />
          </View>
          <Text style={styles.title}>Avvicina il tag al telefono</Text>
          <Text style={[styles.line, tone]} accessibilityRole="text" accessibilityLiveRegion="polite" testID="stato-del-tag">{line}</Text>
          <View style={styles.bar}>
            <Pressable style={styles.secondary} onPress={cancel} accessibilityRole="button" accessibilityLabel={phase.kind === 'fine' && !phase.retry ? 'Chiudi' : 'Annulla'}>
              <Text style={styles.secondaryText}>{phase.kind === 'fine' && !phase.retry ? 'Chiudi' : 'Annulla'}</Text>
            </Pressable>
            {second ? (
              <Pressable style={styles.primary} onPress={second.onPress} accessibilityRole="button" accessibilityLabel={second.label}>
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <Text style={styles.primaryText}>{second.label}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: t.colors.scrim,
  },
  // Finestra dal basso (R14), come «Codice ed etichetta»
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: t.spacing.screenPadding,
    backgroundColor: t.colors.backgroundSecondary,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.colors.border,
    ...t.shadows.cardElevated,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: t.colors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    marginTop: 8,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
    textAlign: 'center',
  },
  line: {
    fontSize: 15,
    lineHeight: 21,
    minHeight: 42,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  lineOk: {
    color: t.colors.success,
    fontWeight: '600',
  },
  lineAsk: {
    color: t.colors.textPrimary,
    fontWeight: '600',
  },
  bar: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  secondary: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  secondaryText: {
    ...t.typography.buttonSecondary,
    fontSize: 15,
    color: t.colors.onButtonSecondary,
  },
  primary: {
    flex: 1.4,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.button,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  primaryText: {
    ...t.typography.buttonPrimary,
    fontSize: 15,
    color: t.colors.onButton,
  },
}));
