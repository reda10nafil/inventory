// Impostazioni › Scanner e NFC (N1, ticket 16 e 22; UX0 piano N1). Semplice e onesta: lo stato in una riga col
// pallino, «Fotocamera · NFC · Tutti e due», «Prova un tag», «Proponi di scrivere il tag», e sotto «Avanzate» (chiuso)
// il silenziatore di Android. Le scelte hanno effetto: le leggono Scanner, automazioni, «Codice ed etichetta» e
// Aggiungi (`readerSources`, `offerTagWrite`; prima 4 controlli su 5 non facevano nulla, NG11 = D19). Via la card col
// testo lungo e le promesse («Pulizia + Scrittura», NG13). Sul web una riga sola: «L'NFC si usa dal telefono» (NG12:
// prima la diagnostica diceva «Errore»). Aprire la schermata non scrive nulla.
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHardwareConfig } from '../../../contexts/HardwareConfigContext';
import { nfcService } from '../../../utils/nfcService';
import type { NfcState } from '../../../utils/nfcCore';
import { nfcStateText, readerSources, SCAN_MODES } from '../../../utils/nfcTag';
import { NfcSheet } from '../../../components/NfcSheet';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function HardwareSettingsScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { hwConfig, updateHwConfig } = useHardwareConfig();
  const [state, setState] = useState<NfcState | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [testing, setTesting] = useState(false);

  // Stato dell'NFC, riletto quando si torna nell'app (per esempio dopo averlo acceso nelle impostazioni del telefono)
  const refresh = useCallback(() => { if (nfcService.available) void nfcService.status().then(setState); }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const web = !nfcService.available;
  const status = nfcStateText(web ? 'web' : state ?? 'attivo');
  const statusText = !web && state === null ? 'Controllo l\'NFC…' : status.text;
  const dot = web || state === null ? t.colors.textMuted : status.tone === 'ok' ? t.colors.success : status.tone === 'warn' ? t.colors.warning : t.colors.textMuted;
  const hasNfc = !web && state !== 'assente';
  const nfcOn = hasNfc && readerSources(hwConfig.scanMode, true).nfc;

  const toggle = (value: boolean) => ({
    trackColor: { false: t.colors.checkRing, true: withAlpha(t.colors.accent, 0.502) },
    thumbColor: value ? t.colors.accent : t.colors.textMuted,
  });

  const modeChip = (id: typeof SCAN_MODES[number]['id'], label: string) => {
    const active = hwConfig.scanMode === id;
    return (
      <Pressable
        key={id}
        style={[styles.segment, active && styles.segmentActive]}
        onPress={() => updateHwConfig({ scanMode: id })}
        accessibilityRole="radio"
        aria-checked={active}
        accessibilityLabel={`Leggi con ${label}`}
      >
        {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
        {active && <AppIcon name="check" size={16} color={t.colors.chipActiveText} />}
        <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Backdrop />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: t.spacing.screenPadding, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Stato in una riga: pallino e testo (il colore da solo non basta) */}
        <View style={styles.card}>
          <View style={styles.statusRow} accessibilityLabel={statusText}>
            <View style={[styles.dot, { backgroundColor: dot }]} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
          {web ? <Text style={styles.hint}>Dal computer: fotocamera o codice scritto a mano.</Text> : null}
        </View>

        {hasNfc ? (
          <>
            <Text style={styles.sectionTitle}>Come si leggono i codici</Text>
            <View style={styles.card}>
              <View style={styles.segments} accessibilityRole="radiogroup">
                {SCAN_MODES.map((m) => modeChip(m.id, m.label))}
              </View>
              <Text style={styles.hint}>
                {hwConfig.scanMode === 'qr_only' ? 'Solo la fotocamera: nessun pulsante NFC.'
                  : hwConfig.scanMode === 'nfc_only' ? 'Solo i tag: lo Scanner non apre la fotocamera.'
                    : 'Fotocamera e tag, in ogni lettore.'}
              </Text>
            </View>

            {nfcOn ? (
              <View style={styles.card}>
                <Pressable style={styles.row} onPress={() => setTesting(true)} accessibilityRole="button" accessibilityLabel="Prova un tag">
                  <View style={styles.rowIcon}><AppIcon name="nfc" size={20} color={t.colors.accentInk} /></View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Prova un tag</Text>
                    <Text style={styles.rowSub}>Avvicina un tag e guarda che cosa legge</Text>
                  </View>
                  <AppIcon name="chevron-right" size={22} color={t.colors.textMuted} />
                </Pressable>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <View style={styles.rowIcon}><AppIcon name="save-alt" size={20} color={t.colors.accentInk} /></View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>Proponi di scrivere il tag</Text>
                    <Text style={styles.rowSub}>Dopo un prodotto nuovo, per scrivere subito il suo codice</Text>
                  </View>
                  <Switch
                    value={hwConfig.autoWriteNfcOnSave}
                    onValueChange={(value) => updateHwConfig({ autoWriteNfcOnSave: value })}
                    accessibilityLabel="Proponi di scrivere il tag"
                    {...toggle(hwConfig.autoWriteNfcOnSave)}
                  />
                </View>
              </View>
            ) : null}

            {/* Avanzate, chiuso. Qui N2 metterà «Leggi più tag» (ritardo e pausa). Il silenziatore c'è solo su Android */}
            {Platform.OS === 'android' ? (
              <View style={styles.card}>
                <Pressable
                  style={styles.advancedHeader}
                  onPress={() => setAdvanced(!advanced)}
                  accessibilityRole="button"
                  aria-expanded={advanced}
                  accessibilityLabel="Avanzate"
                >
                  <Text style={styles.rowTitle}>Avanzate</Text>
                  <AppIcon name={advanced ? 'expand-less' : 'expand-more'} size={24} color={t.colors.textSecondary} />
                </Pressable>
                {advanced ? (
                  <View style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle}>Zittisci Android con l'app aperta</Text>
                      <Text style={styles.rowSub}>Un tag avvicinato non apre il browser. Con l'app aperta il telefono non paga.</Text>
                    </View>
                    <Switch
                      value={!!hwConfig.silenceAndroid}
                      onValueChange={(value) => updateHwConfig({ silenceAndroid: value })}
                      accessibilityLabel="Zittisci Android con l'app aperta"
                      {...toggle(!!hwConfig.silenceAndroid)}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {testing ? <NfcSheet visible mode="prova" onClose={() => setTesting(false)} /> : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 8,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  card: {
    ...cardSurface(t),
    padding: 16,
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    color: t.colors.textPrimary,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    color: t.colors.textMuted,
  },
  // Controllo a tre voci, come il formato di «Codice ed etichetta»
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
    minHeight: 44,
    flexDirection: 'row',
    gap: 4,
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
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  segmentTextActive: {
    color: t.colors.chipActiveText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
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
  divider: {
    height: 1,
    backgroundColor: t.colors.borderLight,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
}));
