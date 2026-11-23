// Conta di magazzino (M07, ticket 06): scelta della posizione, quantità contata a mano per ogni articolo a
// quantità che si aspetta lì, riepilogo delle differenze, conferma. La conferma è una sola chiamata al contesto
// (`countStock`), che scrive una rettifica con causale «conta» per ogni differenza. Calcoli in utils/inventoryOps.ts.
// Una quantità lasciata vuota vuol dire «non contato»: quell'articolo resta com'è (mai letto come 0).
// IND-P5 (ticket 28): il tasto Indietro di sistema (Android, tasto del browser) fa come la freccia a video, un passo
// indietro; dalla scelta della posizione, con quantità scritte e non registrate, chiede prima di uscire.
import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { useProductKind } from '../../../hooks/useProductKind';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { Text, TextInput } from '../../../components/ui/Text';
import { cardSurface } from '../../../components/ui/surfaces';
import { formStyles } from '../../../components/ui/formStyles';
import { formatNumber } from '../../../utils/number';
import { formatQty, parseQty, round3 } from '../../../utils/stock';
import { countDiffs, countRefusalText, countRows, uniqueAt, type CountResult } from '../../../utils/inventoryOps';
import { countLeave, hasWrittenCounts, previousCountStep, type CountStep as Step } from '../../../utils/countBack';

type Outcome = Pick<CountResult, 'adjusted' | 'unchanged' | 'refused'>;

const signed = (delta: number, unit: string) => `${delta > 0 ? '+' : '−'}${formatQty(Math.abs(delta), unit)}`;

export default function CountScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { products, countStock } = useInventory();
  const { locations } = useLocations();
  const kindOf = useProductKind();

  const [step, setStep] = useState<Step>('place');
  const [at, setAt] = useState('');
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const placeLabel = (id: string) => locations.find((l) => l.id === id)?.label ?? id;
  const rows = useMemo(() => (at ? countRows(products, at) : []), [products, at]);
  const unique = useMemo(() => (at ? uniqueAt(products, at) : 0), [products, at]);

  // Quantità scritte: valide (contate) e non valide (da correggere); le vuote non contano
  const { counts, invalid } = useMemo(() => {
    const out: Record<string, number> = {};
    const bad: string[] = [];
    for (const row of rows) {
      const text = (texts[row.id] ?? '').trim();
      if (!text) continue;
      const qty = parseQty(text);
      if (qty == null) bad.push(row.sku); else out[row.id] = qty;
    }
    return { counts: out, invalid: bad };
  }, [rows, texts]);
  const diffs = useMemo(() => countDiffs(rows, counts), [rows, counts]);
  const countedN = Object.keys(counts).length;

  // Tornando alla stessa posizione le quantità scritte restano; un'altra posizione ricomincia da vuoto
  const choose = (id: string) => { if (id !== at) setTexts({}); setAt(id); setOutcome(null); setStep('count'); };
  const back = () => {
    const previous = previousCountStep(step);
    if (previous) setStep(previous);
    else router.back();
  };

  // Uscita dalla schermata (tasto di sistema, tasto del browser, X a video): un passo indietro, o la domanda
  const written = hasWrittenCounts(texts);
  const leave = countLeave(step, written);
  usePreventRemove(leave !== 'leave', ({ data }) => {
    // Sul web il tasto del browser ha già spostato l'indirizzo quando React Navigation chiede il permesso (azione
    // RESET della storia): se si resta nella Conta lo si rimette avanti, così indirizzo e storia tornano giusti
    const stay = () => { if (Platform.OS === 'web' && data.action.type === 'RESET') window.history.forward(); };
    // Il passo indietro vale solo con la Conta in primo piano. Tolta da sotto un'altra schermata (Audit aperto
    // dall'avviso, poi un salto indietro di più voci del browser o un link) non si torna di un passo di nascosto:
    // con quantità scritte si chiede, altrimenti si lascia andare
    if (leave === 'step' && navigation.isFocused()) { stay(); back(); return; }
    if (!written) { navigation.dispatch(data.action); return; }
    Alert.alert('Uscire dalla conta?', 'Le quantità scritte si perdono.', [
      { text: 'Annulla', style: 'cancel', onPress: stay },
      { text: 'Esci', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const toSummary = () => {
    if (invalid.length) {
      Alert.alert('Quantità non valide', `Correggi o svuota: ${invalid.join(', ')}. Si scrive un numero da 0 in su (es. 2,5).`);
      return;
    }
    if (!countedN) {
      Alert.alert('Niente da riepilogare', 'Scrivi la quantità contata di almeno un articolo (anche 0).');
      return;
    }
    setStep('summary');
  };

  const confirm = () => {
    setOutcome(countStock(at, counts));
    setTexts({}); // registrate: uscendo non si perde nulla, «Nuova conta» riparte da vuoto
    setStep('done');
  };

  // Sotto la riga: differenza con la registrata mentre si scrive, oppure «non valida»
  const noteOf = (text: string, expected: number, unit: string) => {
    if (!text.trim()) return null;
    const qty = parseQty(text);
    if (qty == null) return { text: 'Quantità non valida', color: t.colors.error };
    const delta = round3(qty - expected);
    if (delta === 0) return { text: 'Uguale', color: t.colors.textMuted };
    return { text: signed(delta, unit), color: delta > 0 ? t.colors.success : t.colors.error };
  };

  const title = step === 'place' ? 'Conta' : `Conta · ${placeLabel(at)}`;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <View style={styles.topBar}>
        <Pressable onPress={back} style={styles.backButton} accessibilityLabel={step === 'place' || step === 'done' ? 'Chiudi' : 'Indietro'} hitSlop={8}>
          <AppIcon name={step === 'place' || step === 'done' ? 'close' : 'arrow-back'} size={24} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
      </View>

      {step === 'place' && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.intro}>
            <AppIcon name="inventory" size={56} color={t.colors.accentInk} />
            <Text style={styles.stepTitle}>Conta di magazzino</Text>
            <Text style={styles.stepText}>
              Scegli la posizione da contare e scrivi la quantità che trovi per ogni articolo. Le differenze diventano
              rettifiche con causale «Conta»; gli articoli lasciati vuoti restano come sono.
            </Text>
          </View>
          <Text style={styles.sectionLabel}>Posizione</Text>
          <View style={styles.chipWrap}>
            {locations.map((loc) => {
              const n = countRows(products, loc.id).length;
              return (
                <Pressable key={loc.id} style={styles.chip} onPress={() => choose(loc.id)} accessibilityLabel={`Conta ${loc.label}`}>
                  <View style={[styles.chipDot, { backgroundColor: loc.color }]} />
                  <Text style={styles.chipText}>{loc.label}{n > 0 ? ` · ${n}` : ''}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>Il numero accanto alla posizione è quanti articoli a quantità ci sono da contare.</Text>
        </ScrollView>
      )}

      {step === 'count' && (
        <>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
            {unique > 0 && (
              <Pressable style={styles.notice} onPress={() => router.push('/automations/audit')} accessibilityLabel="Apri Audit Posizione">
                <AppIcon name="fact-check" size={20} color={t.colors.onWarningSurface} />
                <Text style={styles.noticeText}>
                  {`${unique === 1 ? '1 pezzo unico' : `${unique} pezzi unici`} in questa posizione: si verificano con l'Audit Posizione.`}
                </Text>
                <AppIcon name="chevron-right" size={20} color={t.colors.onWarningSurface} />
              </Pressable>
            )}
            {rows.length === 0 ? (
              <View style={styles.empty}>
                <AppIcon name="inventory-2" size={40} color={t.colors.textMuted} />
                <Text style={styles.emptyText}>Nessun articolo a quantità in questa posizione.</Text>
              </View>
            ) : rows.map((row) => {
              const text = texts[row.id] ?? '';
              const note = noteOf(text, row.expected, row.unit);
              return (
                <View key={row.id} style={styles.row}>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowSku}>{row.sku}</Text>
                    <Text style={styles.rowSub} numberOfLines={2}>{[kindOf(row).line, `Registrata: ${formatQty(row.expected, row.unit)}`].filter(Boolean).join(' · ')}</Text>
                    {note && <Text style={[styles.rowDelta, { color: note.color }]}>{note.text}</Text>}
                  </View>
                  <View style={[styles.inputBox, styles.countBox]}>
                    <TextInput
                      style={styles.inputText}
                      placeholder="Contata"
                      placeholderTextColor={t.colors.placeholder}
                      keyboardType="decimal-pad"
                      value={text}
                      onChangeText={(v) => setTexts((prev) => ({ ...prev, [row.id]: v }))}
                      accessibilityLabel={`Contata ${row.sku}`}
                    />
                    <Text style={styles.unit}>{row.unit}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          {rows.length > 0 && (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
              <Text style={styles.footerText}>Contati {countedN} di {rows.length}{diffs.length ? ` · ${diffs.length} con differenze` : ''}</Text>
              <Pressable style={[styles.primaryButton, styles.footerButton]} onPress={toSummary} accessibilityLabel="Riepilogo della conta">
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <Text style={styles.primaryButtonText}>Riepilogo</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {step === 'summary' && (
        <>
          <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 120 }]}>
            <Text style={styles.stepText}>
              Contati {countedN} di {rows.length} articoli.{rows.length - countedN > 0 ? ` Non contati: ${rows.length - countedN} (restano come sono).` : ''}
            </Text>
            {diffs.length === 0 ? (
              <View style={styles.empty}>
                <AppIcon name="check-circle" size={40} color={t.colors.success} />
                <Text style={styles.emptyText}>Nessuna differenza: niente da rettificare.</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Rettifiche da registrare</Text>
                {diffs.map((d) => (
                  <View key={d.id} style={styles.row}>
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowSku}>{d.sku}</Text>
                      <Text style={styles.rowSub}>{formatNumber(d.expected)} → {formatQty(d.counted, d.unit)}</Text>
                    </View>
                    <Text style={[styles.rowDeltaBig, { color: d.delta > 0 ? t.colors.success : t.colors.error }]}>{signed(d.delta, d.unit)}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
          <View style={[styles.footer, styles.footerRow, { paddingBottom: insets.bottom + 14 }]}>
            <Pressable style={[styles.secondaryButton, styles.footerButton, styles.flex]} onPress={() => setStep('count')}>
              <Text style={styles.secondaryButtonText}>Indietro</Text>
            </Pressable>
            {diffs.length > 0 && (
              <Pressable style={[styles.primaryButton, styles.footerButton, styles.flex]} onPress={confirm} accessibilityLabel="Registra rettifiche">
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <Text style={styles.primaryButtonText}>Registra {diffs.length === 1 ? '1 rettifica' : `${diffs.length} rettifiche`}</Text>
              </Pressable>
            )}
          </View>
        </>
      )}

      {step === 'done' && outcome && (
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.intro}>
            <AppIcon name="check-circle" size={56} color={t.colors.success} />
            <Text style={styles.stepTitle}>Conta registrata</Text>
            <Text style={styles.stepText}>
              {outcome.adjusted.length === 1 ? '1 rettifica registrata' : `${outcome.adjusted.length} rettifiche registrate`} in {placeLabel(at)}
              {outcome.unchanged.length === 1 ? '; 1 uguale alla giacenza registrata' : outcome.unchanged.length ? `; ${outcome.unchanged.length} uguali alla giacenza registrata` : ''}.
            </Text>
          </View>
          {outcome.refused.length > 0 && (
            <View style={styles.notice}>
              <AppIcon name="warning" size={20} color={t.colors.onWarningSurface} />
              <Text style={styles.noticeText}>
                Non rettificati: {outcome.refused.map((r) => `${r.sku} (${countRefusalText(r.reason)})`).join('; ')}.
              </Text>
            </View>
          )}
          <View style={styles.footerRow}>
            <Pressable style={[styles.secondaryButton, styles.footerButton, styles.flex]} onPress={() => setStep('place')} accessibilityLabel="Nuova conta">
              <Text style={styles.secondaryButtonText}>Nuova conta</Text>
            </Pressable>
            <Pressable style={[styles.primaryButton, styles.footerButton, styles.flex]} onPress={() => router.back()} accessibilityLabel="Fine">
              <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
              <Text style={styles.primaryButtonText}>Fine</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  ...formStyles(t),
  container: { flex: 1, backgroundColor: t.colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: { marginRight: 16 },
  topTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: t.colors.textPrimary },
  body: { padding: 16, gap: 12 },
  flex: { flex: 1 },
  intro: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  stepTitle: { fontSize: 22, fontWeight: 'bold', color: t.colors.textPrimary, textAlign: 'center' },
  stepText: { fontSize: 15, lineHeight: 21, color: t.colors.textSecondary, textAlign: 'center' },
  sectionLabel: { ...t.typography.sectionHeader, marginTop: 4 },
  hint: { fontSize: 12, lineHeight: 16, color: t.colors.textMuted },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: t.radius.card,
    borderWidth: 1,
    backgroundColor: t.colors.warningSurface,
    borderColor: t.colors.warningSurfaceBorder,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18, color: t.colors.onWarningSurface },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyText: { fontSize: 15, color: t.colors.textSecondary, textAlign: 'center' },
  row: { ...cardSurface(t), flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowInfo: { flex: 1, minWidth: 0, gap: 2 },
  rowSku: { fontSize: 16, fontWeight: '600', color: t.colors.textPrimary },
  rowSub: { fontSize: 13, color: t.colors.textSecondary },
  rowDelta: { fontSize: 13, fontWeight: '600' },
  rowDeltaBig: { fontSize: 16, fontWeight: '700' },
  countBox: { width: 120 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: t.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  footerRow: { flexDirection: 'row', gap: 10 },
  footerText: { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center' },
  footerButton: { height: 52 },
}));
