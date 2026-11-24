// ETI (ticket 22, AU-A8): **una** finestra «Codice ed etichetta» per prodotti, posizioni, categorie e scaffali, al posto
// delle quattro di prima (Scheda «Mostra SKU QR», Posizioni, Categorie, Scaffali). Finestra dal basso (UX0, R14): il QR
// grande col codice scritto sotto, il formato («Una etichetta · Foglio A4 · Etichettatrice», ricordato per spazio),
// «Avanzate» chiuso, e in basso fisso «Condividi» e «Stampa etichetta». Con più etichette (selezione dell'Inventario,
// «tutte le etichette di questa posizione») mostra il contatore. Le etichette sono fatte in locale (`utils/labelHtml`).
// Sul web la stampa apre una finestra sua e stampa quella, mai la pagina dell'app.
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import BarcodeScanner from './BarcodeScanner';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text, TextInput } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { useLabelFormat } from '../hooks/useLabelFormat';
import { LABEL_FORMATS, LABEL_FORMAT_IDS, labelCountText, labelHtml, type LabelItem } from '../utils/labelHtml';
import { openPrintWindow, printHtml, shareHtml } from '../src/lib/print';

/** Che cosa mostra la finestra, per le scritte («Questa posizione non ha ancora un codice»). */
export type CodeSheetKind = 'prodotto' | 'posizione' | 'scaffale' | 'categoria';
const NO_CODE: Record<CodeSheetKind, string> = {
  prodotto: 'Questo prodotto non ha un codice.',
  posizione: 'Questa posizione non ha ancora un codice.',
  scaffale: 'Questo scaffale non ha ancora un codice.',
  categoria: 'Questa categoria non ha ancora un codice.',
};

/** Stampa o condivisione annullata da chi usa l'app (non è un errore da dire). */
const cancelled = (error: unknown): boolean => {
  const e = error as { name?: string; code?: string; message?: string } | null;
  return !!e && (e.name === 'AbortError' || /cancel|incomplete|annull/i.test(`${e.code ?? ''} ${e.message ?? ''}`));
};

export interface CodeSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Le etichette: una = la finestra di una cosa; più di una = etichette in serie (col contatore). */
  items: LabelItem[];
  kind: CodeSheetKind;
  /** Riga in cima, per esempio dopo la creazione: «Posizione "Deposito" creata.» */
  notice?: string;
  /** Prodotto: il codice è lo SKU, si cambia in Modifica. */
  onEditSku?: () => void;
  /** Prodotto col link GS1 salvato: il link sotto «Avanzate», con «Copia link» e «Programma tag» di prima. */
  link?: string;
  onCopyLink?: () => void;
  onProgramTag?: () => void;
  /** Posizioni, categorie e scaffali: «Cambia codice» sotto «Avanzate», «Crea il codice» per chi non ce l'ha. */
  changeCode?: {
    /** Controllo del codice nuovo (`codeCheck`): errore = rifiuto, avviso = si salva e si dice. */
    check: (code: string) => { error: string | null; warning: string | null };
    /** Codice proposto, mai già usato da altro (`suggestCode`, `suggestShelfCode`); vuoto se manca il nome. */
    suggest: () => string;
    save: (code: string) => void | Promise<void>;
  };
  /** Etichette di tutto quello che c'è dentro (una posizione: lei, i suoi scaffali e i prodotti). */
  series?: { label: string; detail: string; items: LabelItem[] };
}

export function CodeSheet({
  visible, onClose, items, kind, notice, onEditSku, link, onCopyLink, onProgramTag, changeCode, series,
}: CodeSheetProps) {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [format, setFormat] = useLabelFormat(visible);
  const [advanced, setAdvanced] = useState(false);
  const [all, setAll] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [scanner, setScanner] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Ogni apertura parte pulita: Avanzate chiuso, una etichetta sola, nessun messaggio
  useEffect(() => {
    if (!visible) return;
    setAdvanced(false); setAll(false); setNewCode(''); setScanner(false); setMessage(null); setDone(null);
  }, [visible]);

  const list = (all && series ? series.items : items).filter((i) => i.code?.trim());
  const many = all || items.length > 1;
  const single = items[0];
  const code = single?.code?.trim() ?? '';
  const hint = changeCode && newCode.trim() ? changeCode.check(newCode) : null;
  const fileName = many ? 'etichette' : `etichetta-${code.replace(/[^A-Za-z0-9_-]+/g, '-')}`;

  const close = () => {
    if (scanner) setScanner(false); // prima il lettore, poi la finestra (tasto Indietro, Esc)
    else onClose();
  };

  const handlePrint = async () => {
    setMessage(null);
    // Sul web la finestra si apre subito, nel tocco: dopo un'attesa il browser la bloccherebbe
    const win = openPrintWindow();
    try {
      const ok = await printHtml(labelHtml(list, format), win);
      if (!ok) setMessage('Il browser ha bloccato la finestra della stampa: consenti le finestre di questo sito e riprova.');
    } catch (error) {
      win?.close(); // niente finestra vuota lasciata aperta
      if (!cancelled(error)) setMessage('Stampa non riuscita. Riprova.');
    }
  };

  const handleShare = async () => {
    setMessage(null);
    try {
      await shareHtml(labelHtml(list, format), fileName);
    } catch (error) {
      if (!cancelled(error)) setMessage('Condivisione non riuscita. Riprova.');
    }
  };

  const saveCode = async (value: string) => {
    if (!changeCode) return;
    const next = value.trim();
    if (!next) {
      Alert.alert('Errore', 'Scrivi il codice nuovo, oppure tocca «Genera il codice».');
      return;
    }
    const check = changeCode.check(next);
    if (check.error) {
      Alert.alert('Errore', check.error);
      return;
    }
    try {
      await changeCode.save(next);
    } catch {
      Alert.alert('Errore', 'Codice non salvato. Riprova.');
      return;
    }
    setNewCode(''); setAdvanced(false);
    setDone(`Codice salvato: ${next}.`);
    if (check.warning) Alert.alert('Codice salvato', check.warning);
  };

  const createCode = () => {
    const proposed = changeCode?.suggest() ?? '';
    if (!proposed) {
      Alert.alert('Errore', 'Serve un nome per creare il codice.');
      return;
    }
    saveCode(proposed);
  };

  const generate = () => {
    const proposed = changeCode?.suggest() ?? '';
    if (proposed) setNewCode(proposed);
    else Alert.alert('Errore', 'Serve un nome per creare il codice.');
  };

  const formatChip = (id: typeof LABEL_FORMAT_IDS[number]) => {
    const active = format === id;
    return (
      <Pressable
        key={id}
        style={[styles.segment, active && styles.segmentActive]}
        onPress={() => setFormat(id)}
        accessibilityRole="radio"
        aria-checked={active}
        accessibilityLabel={`Formato ${LABEL_FORMATS[id].name}`}
      >
        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{LABEL_FORMATS[id].name}</Text>
      </Pressable>
    );
  };

  const empty = !many && !code;
  // Etichette in serie senza nessun codice (per esempio una posizione e i suoi scaffali senza codice): niente da stampare
  const nothing = many && list.length === 0;
  const top = done || notice;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* La velatura in alto chiude, come il riquadro del QR di prima */}
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Chiudi la finestra" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>{many ? 'Etichette' : 'Codice ed etichetta'}</Text>
              {!many && single?.name ? <Text style={styles.subtitle} numberOfLines={1}>{single.name}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Chiudi Codice ed etichetta" style={styles.close}>
              <AppIcon name="close" size={24} color={t.colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {top ? (
              <View style={styles.notice}>
                <AppIcon name="check-circle" size={18} color={t.colors.onSuccessSurface} />
                <Text style={styles.noticeText}>{top}</Text>
              </View>
            ) : null}

            {many ? (
              <View style={styles.countBox} accessibilityLabel={labelCountText(list.length)}>
                <Text style={styles.count}>{labelCountText(list.length)}</Text>
                <Text style={styles.countList} numberOfLines={2}>
                  {list.slice(0, 3).map((i) => i.code.trim()).join(', ')}
                  {list.length > 3 ? ` e altre ${list.length - 3}` : ''}
                </Text>
              </View>
            ) : empty ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}><AppIcon name="qr-code-2" size={40} color={t.colors.textMuted} /></View>
                <Text style={styles.emptyText}>{NO_CODE[kind]}</Text>
              </View>
            ) : (
              <View style={styles.codeBox}>
                <View style={styles.qrPaper} testID="codice-qr" accessibilityLabel={`QR del codice ${code}`}>
                  <QRCode value={code} size={200} color={t.colors.qrInk} backgroundColor={t.colors.qrPaper} />
                </View>
                <Text style={styles.code} selectable>{code}</Text>
              </View>
            )}

            {series && series.items.length > 1 ? (
              <Pressable
                style={styles.row}
                onPress={() => setAll(!all)}
                accessibilityRole="checkbox"
                aria-checked={all}
                accessibilityLabel={series.label}
              >
                <View style={[styles.check, all && styles.checkOn]}>
                  {all && <AppIcon name="check" size={16} color={t.colors.onAccent} />}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{series.label}</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>{series.detail}</Text>
                </View>
              </Pressable>
            ) : null}

            {!empty && !nothing ? (
              <>
                <Text style={styles.label}>Formato</Text>
                <View style={styles.segments} accessibilityRole="radiogroup">
                  {LABEL_FORMAT_IDS.map(formatChip)}
                </View>
                <Text style={styles.hint}>{LABEL_FORMATS[format].note}</Text>
              </>
            ) : null}

            {/* Avanzate, chiuso: il codice si cambia qui (posizioni, categorie, scaffali) o in Modifica (prodotti) */}
            {!many && (changeCode || onEditSku || link) ? (
              <>
                <Pressable
                  style={styles.advancedHeader}
                  onPress={() => setAdvanced(!advanced)}
                  accessibilityRole="button"
                  aria-expanded={advanced}
                  accessibilityLabel="Avanzate"
                >
                  <Text style={styles.advancedTitle}>Avanzate</Text>
                  <AppIcon name={advanced ? 'expand-less' : 'expand-more'} size={24} color={t.colors.textSecondary} />
                </Pressable>
                {advanced ? (
                  <View style={styles.advanced}>
                    {onEditSku ? (
                      <Pressable style={styles.row} onPress={onEditSku} accessibilityRole="button" accessibilityLabel="Cambia lo SKU in Modifica">
                        <View style={styles.rowIcon}><AppIcon name="edit" size={20} color={t.colors.accentInk} /></View>
                        <View style={styles.rowText}>
                          <Text style={styles.rowTitle}>Cambia lo SKU in Modifica</Text>
                          <Text style={styles.rowSub} numberOfLines={2}>Il codice del prodotto è il suo SKU.</Text>
                        </View>
                        <AppIcon name="chevron-right" size={22} color={t.colors.textMuted} />
                      </Pressable>
                    ) : null}
                    {link ? (
                      <View style={styles.linkBox}>
                        <Text style={styles.label}>Link al sito</Text>
                        <Text style={styles.linkText} selectable numberOfLines={3}>{link}</Text>
                        <View style={styles.linkActions}>
                          {onCopyLink ? (
                            <Pressable style={styles.smallButton} onPress={onCopyLink} accessibilityRole="button">
                              <AppIcon name="content-copy" size={18} color={t.colors.onButtonSecondary} />
                              <Text style={styles.smallButtonText}>Copia link</Text>
                            </Pressable>
                          ) : null}
                          {onProgramTag ? (
                            <Pressable style={styles.smallButton} onPress={onProgramTag} accessibilityRole="button">
                              <AppIcon name="nfc" size={18} color={t.colors.onButtonSecondary} />
                              <Text style={styles.smallButtonText}>Programma tag</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      </View>
                    ) : null}
                    {changeCode ? (
                      <View>
                        <Text style={styles.label}>Cambia codice</Text>
                        <View style={styles.inputRow}>
                          <TextInput
                            style={styles.input}
                            placeholder="Scansiona o Genera..."
                            placeholderTextColor={t.colors.placeholder}
                            value={newCode}
                            onChangeText={setNewCode}
                            autoCapitalize="characters"
                            accessibilityLabel="Nuovo codice"
                          />
                          <Pressable style={styles.iconButton} onPress={() => setScanner(true)} accessibilityLabel="Scansiona il codice">
                            <AppIcon name="qr-code-scanner" size={22} color={t.colors.accentInk} />
                          </Pressable>
                          <Pressable style={styles.iconButton} onPress={generate} accessibilityLabel="Genera il codice">
                            <AppIcon name="autorenew" size={22} color={t.colors.accentInk} />
                          </Pressable>
                        </View>
                        {hint && (hint.error || hint.warning) ? (
                          <Text style={[styles.hint, hint.error ? styles.hintError : styles.hintWarning]}>{hint.error ?? hint.warning}</Text>
                        ) : (
                          <Text style={styles.hint}>Le etichette già stampate col codice di prima non si leggono più.</Text>
                        )}
                        <Pressable style={styles.saveCode} onPress={() => saveCode(newCode)} accessibilityRole="button" accessibilityLabel="Salva codice">
                          <Text style={styles.saveCodeText}>Salva codice</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          {message ? <Text style={[styles.message, styles.hintError]} accessibilityRole="alert">{message}</Text> : null}
          {nothing ? <Text style={[styles.message, styles.messageInfo]}>Nessuna di queste cose ha un codice: niente da stampare.</Text> : null}
          <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>
            {nothing ? null : empty ? (
              changeCode ? (
                <Pressable style={styles.primary} onPress={createCode} accessibilityRole="button" accessibilityLabel="Crea il codice">
                  <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                  <Text style={styles.primaryText}>Crea il codice</Text>
                </Pressable>
              ) : null
            ) : (
              <>
                <Pressable style={styles.secondary} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Condividi">
                  <AppIcon name="share" size={20} color={t.colors.onButtonSecondary} />
                  <Text style={styles.secondaryText}>Condividi</Text>
                </Pressable>
                <Pressable style={styles.primary} onPress={handlePrint} accessibilityRole="button" accessibilityLabel={many ? 'Stampa etichette' : 'Stampa etichetta'}>
                  <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                  <AppIcon name="print" size={20} color={t.colors.onButton} />
                  <Text style={styles.primaryText}>{many ? 'Stampa etichette' : 'Stampa etichetta'}</Text>
                </Pressable>
              </>
            )}
          </View>

          {scanner && (
            <View style={StyleSheet.absoluteFill}>
              <BarcodeScanner onScan={({ data }) => { setNewCode(data); setScanner(false); }} onClose={() => setScanner(false)} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  // Finestra dal basso (R14): fino al 90% dell'altezza, fondo opaco, angoli in alto
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    maxHeight: '90%',
    backgroundColor: t.colors.backgroundSecondary,
    borderTopLeftRadius: t.radius.card,
    borderTopRightRadius: t.radius.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: t.colors.border,
    ...t.shadows.cardElevated,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    backgroundColor: t.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...t.typography.cardTitle,
    fontSize: 18,
    fontWeight: t.weights.strong,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.textSecondary,
    marginTop: 2,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: t.spacing.screenPadding,
    paddingBottom: 16,
    gap: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.successSurface,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.onSuccessSurface,
  },
  codeBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  // Il QR resta nero su bianco in ogni stile (qrPaper, qrInk), con il margine che serve ai lettori
  qrPaper: {
    padding: 14,
    borderRadius: t.radius.tile,
    backgroundColor: t.colors.qrPaper,
  },
  code: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: t.weights.strong,
    letterSpacing: 1,
    color: t.colors.textPrimary,
    textAlign: 'center',
  },
  countBox: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 18,
    borderRadius: t.radius.tile,
    backgroundColor: t.colors.surface,
  },
  count: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
  },
  countList: {
    fontSize: 14,
    lineHeight: 19,
    color: t.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  emptyBox: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 21,
    color: t.colors.textSecondary,
    textAlign: 'center',
  },
  label: {
    fontSize: t.label.size,
    lineHeight: 18,
    fontWeight: t.label.weight,
    color: t.label.color,
    marginTop: 4,
    marginBottom: 4,
  },
  // Controllo a tre voci (segmented)
  segments: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.chip,
    overflow: 'hidden',
  },
  segmentActive: {
    backgroundColor: t.colors.chipActive,
  },
  segmentText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  segmentTextActive: {
    color: t.colors.chipActiveText,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textMuted,
    marginTop: 4,
  },
  hintError: {
    color: t.colors.error,
  },
  hintWarning: {
    color: t.colors.warningText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  rowSub: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.checkRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: t.colors.checkOn,
    borderColor: t.colors.checkOn,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  advancedTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  advanced: {
    gap: 8,
  },
  linkBox: {
    gap: 4,
  },
  linkText: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textSecondary,
  },
  linkActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  smallButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: t.radius.button,
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  smallButtonText: {
    ...t.typography.buttonSecondary,
    fontSize: 14,
    color: t.colors.onButtonSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: t.input.height,
    paddingHorizontal: 12,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    color: t.colors.inputText,
    fontSize: 15,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.button,
    backgroundColor: t.colors.accentSoft,
  },
  saveCode: {
    marginTop: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.button,
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  saveCodeText: {
    ...t.typography.buttonSecondary,
    fontSize: 15,
    color: t.colors.onButtonSecondary,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 8,
  },
  messageInfo: {
    color: t.colors.textSecondary,
  },
  // Barra fissa in basso (R11): «Condividi» contornato a sinistra, «Stampa etichetta» pieno a destra
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  secondary: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
