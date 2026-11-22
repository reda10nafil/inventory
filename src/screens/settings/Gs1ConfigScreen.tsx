// FurInventory Pro - GS1 Digital Link Configuration Screen
import React, { useEffect, useState } from 'react';
import { View, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useGS1Config } from '../../../contexts/GS1ConfigContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { buildPreviewLink } from '../../../utils/gs1';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function GS1ConfigScreen() {
  const styles = useStyles();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gs1Config, updateGS1Config, resetToDefaults } = useGS1Config();
  const { customFields } = useCustomFields();

  // Local state for text input debouncing
  const [baseUrlLocal, setBaseUrlLocal] = useState(gs1Config.baseUrl);
  // La configurazione salvata può arrivare dopo l'apertura (ricarica, indirizzo): il campo la segue, altrimenti
  // mostrava il dominio predefinito e uscendo dal campo lo salvava sopra quello vero (P10).
  useEffect(() => { setBaseUrlLocal(gs1Config.baseUrl); }, [gs1Config.baseUrl]);

  const handleBaseUrlBlur = () => {
    updateGS1Config({ baseUrl: baseUrlLocal.trim() || 'https://syncroflow.app/id' });
  };

  const previewLink = buildPreviewLink({ ...gs1Config, baseUrl: baseUrlLocal });

  // Filter custom fields suitable for lotto mapping (text_short type)
  const lottoFieldCandidates = customFields.filter(
    f => !f.isSystem && !f.deletedAt && (f.type === 'text_short' || f.type === 'text_long')
  );

  const handleReset = () => {
    Alert.alert(
      'Reset Configurazione',
      'Vuoi ripristinare le impostazioni GS1 ai valori predefiniti?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ripristina',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
            setBaseUrlLocal('https://syncroflow.app/id');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
    <Backdrop />
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: t.spacing.screenPadding, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconWrap}>
          <AppIcon name="link" size={24} color={t.colors.accentInk} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>GS1 Digital Link</Text>
          <Text style={styles.infoDesc}>
            Genera automaticamente un URL standard GS1 per ogni prodotto. Collegalo a QR Code e tag NFC per un'identità digitale univoca.
          </Text>
        </View>
      </View>

      {/* Section: Endpoint */}
      <Text style={styles.sectionTitle}>Endpoint di risoluzione</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Dominio Base</Text>
        <View style={styles.inputContainer}>
          <AppIcon name="language" size={20} color={t.colors.fieldIcon} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={baseUrlLocal}
            onChangeText={setBaseUrlLocal}
            onBlur={handleBaseUrlBlur}
            placeholder="https://syncroflow.app/id"
            placeholderTextColor={t.colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>
        <Text style={styles.helperText}>
          URL base per la risoluzione dei Digital Link. Es: https://id.tuodominio.it
        </Text>
      </View>

      {/* Section: Application Identifiers */}
      <Text style={styles.sectionTitle}>Mappatura GS1 (Application Identifiers)</Text>

      {/* AI 01 - GTIN (Always On) */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.aiBadge, { backgroundColor: t.colors.accentSoft }]}>
              <Text style={[styles.aiBadgeText, { color: t.colors.accentInk }]}>AI 01</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>GTIN / EAN</Text>
              <Text style={styles.toggleDesc}>Mappato sul campo SKU del prodotto</Text>
            </View>
          </View>
          <View style={styles.alwaysOnBadge}>
            <AppIcon name="lock" size={14} color={t.colors.accentInk} />
            <Text style={styles.alwaysOnText}>Obbligatorio</Text>
          </View>
        </View>
      </View>

      {/* AI 21 - Serial */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.aiBadge, { backgroundColor: gs1Config.enableSerial ? withAlpha(t.colors.success, 0.19) : withAlpha(t.colors.textMuted, 0.125) }]}>
              <Text style={[styles.aiBadgeText, { color: gs1Config.enableSerial ? t.colors.success : t.colors.textMuted }]}>AI 21</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Numero Seriale</Text>
              <Text style={styles.toggleDesc}>Genera un identificativo univoco per ogni prodotto</Text>
            </View>
          </View>
          <Switch
            value={gs1Config.enableSerial}
            onValueChange={(val) => updateGS1Config({ enableSerial: val })}
            trackColor={{ false: t.colors.checkRing, true: withAlpha(t.colors.success, 0.502) }}
            thumbColor={gs1Config.enableSerial ? t.colors.success : t.colors.textMuted}
          />
        </View>

        {/* Serial Mode Picker */}
        {gs1Config.enableSerial && (
          <View style={styles.subOption}>
            <Text style={styles.subOptionLabel}>Modalità Generazione</Text>
            <View style={styles.segmentedControl}>
              <Pressable
                style={[styles.segmentButton, gs1Config.serialMode === 'uuid' && styles.segmentButtonActive]}
                onPress={() => updateGS1Config({ serialMode: 'uuid' })}
              >
                <AppIcon
                  name="fingerprint"
                  size={16}
                  color={gs1Config.serialMode === 'uuid' ? t.colors.accentInk : t.colors.textSecondary}
                />
                <Text style={[styles.segmentText, gs1Config.serialMode === 'uuid' && styles.segmentTextActive]}>UUID</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, gs1Config.serialMode === 'progressive' && styles.segmentButtonActive]}
                onPress={() => updateGS1Config({ serialMode: 'progressive' })}
              >
                <AppIcon
                  name="format-list-numbered"
                  size={16}
                  color={gs1Config.serialMode === 'progressive' ? t.colors.accentInk : t.colors.textSecondary}
                />
                <Text style={[styles.segmentText, gs1Config.serialMode === 'progressive' && styles.segmentTextActive]}>Progressivo</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* AI 10 - Lotto */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.aiBadge, { backgroundColor: gs1Config.enableLotto ? withAlpha(t.colors.info, 0.19) : withAlpha(t.colors.textMuted, 0.125) }]}>
              <Text style={[styles.aiBadgeText, { color: gs1Config.enableLotto ? t.colors.info : t.colors.textMuted }]}>AI 10</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Lotto</Text>
              <Text style={styles.toggleDesc}>Includi il numero di lotto nell'URL</Text>
            </View>
          </View>
          <Switch
            value={gs1Config.enableLotto}
            onValueChange={(val) => updateGS1Config({ enableLotto: val })}
            trackColor={{ false: t.colors.checkRing, true: withAlpha(t.colors.info, 0.502) }}
            thumbColor={gs1Config.enableLotto ? t.colors.info : t.colors.textMuted}
          />
        </View>

        {/* Lotto Field Picker */}
        {gs1Config.enableLotto && (
          <View style={styles.subOption}>
            <Text style={styles.subOptionLabel}>Campo Mappato</Text>
            {lottoFieldCandidates.length === 0 ? (
              <Text style={styles.noFieldsText}>
                Nessun campo testo personalizzato disponibile. Crea un campo nel Field Builder per mapparlo al Lotto.
              </Text>
            ) : (
              <View style={styles.fieldPickerGrid}>
                {lottoFieldCandidates.map(cf => (
                  <Pressable
                    key={cf.id}
                    style={[styles.fieldPickerChip, gs1Config.lottoFieldId === cf.id && styles.fieldPickerChipActive]}
                    onPress={() => updateGS1Config({ lottoFieldId: cf.id })}
                  >
                    {gs1Config.lottoFieldId === cf.id && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                    <AppIcon
                      name={(cf.icon || 'label') as any}
                      size={16}
                      color={gs1Config.lottoFieldId === cf.id ? t.colors.chipActiveText : t.colors.chipText}
                    />
                    <Text style={[styles.fieldPickerText, gs1Config.lottoFieldId === cf.id && styles.fieldPickerTextActive]}>
                      {cf.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Live Preview */}
      <Text style={styles.sectionTitle}>Anteprima stringa</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <AppIcon name="qr-code" size={20} color={t.colors.accentInk} />
          <Text style={styles.previewLabel}>URL Risultante</Text>
        </View>
        <View style={styles.previewUrlContainer}>
          <Text style={styles.previewUrl} selectable>{previewLink}</Text>
        </View>
        <View style={styles.previewBreakdown}>
          <View style={styles.previewSegment}>
            <View style={[styles.previewDot, { backgroundColor: t.colors.accent }]} />
            <Text style={styles.previewSegmentText}>Base: {baseUrlLocal || '...'}</Text>
          </View>
          <View style={styles.previewSegment}>
            <View style={[styles.previewDot, { backgroundColor: t.colors.warning }]} />
            <Text style={styles.previewSegmentText}>AI 01 (GTIN): dal campo SKU</Text>
          </View>
          {gs1Config.enableSerial && (
            <View style={styles.previewSegment}>
              <View style={[styles.previewDot, { backgroundColor: t.colors.success }]} />
              <Text style={styles.previewSegmentText}>
                AI 21 (Seriale): {gs1Config.serialMode === 'uuid' ? 'UUID automatico' : 'Progressivo'}
              </Text>
            </View>
          )}
          {gs1Config.enableLotto && (
            <View style={styles.previewSegment}>
              <View style={[styles.previewDot, { backgroundColor: t.colors.info }]} />
              <Text style={styles.previewSegmentText}>
                AI 10 (Lotto): {gs1Config.lottoFieldId
                  ? customFields.find(f => f.id === gs1Config.lottoFieldId)?.name || 'campo selezionato'
                  : 'nessun campo selezionato'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Reset Button */}
      <Pressable style={styles.resetButton} onPress={handleReset}>
        <AppIcon name="restore" size={20} color={t.colors.error} />
        <Text style={styles.resetText}>Ripristina Predefiniti</Text>
      </Pressable>
    </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: t.colors.accentSoft,
    borderRadius: t.radius.card,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.accent, 0.19),
    gap: 12,
  },
  infoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: t.radius.iconWrap,
    backgroundColor: t.colors.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...t.typography.cardTitle,
    color: t.colors.accentInk,
    marginBottom: 4,
  },
  infoDesc: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginBottom: 10,
    marginTop: 8,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  card: {
    ...cardSurface(t),
    padding: 16,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: t.label.size,
    fontWeight: t.label.weight,
    color: t.label.color,
    lineHeight: 18,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.input.height,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    color: t.colors.inputText,
    paddingVertical: 12,
  },
  helperText: {
    ...t.typography.caption,
    fontSize: 12,
    color: t.colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.badge,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  alwaysOnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.badge,
    gap: 4,
  },
  alwaysOnText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.colors.accentInk,
  },
  subOption: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  subOptionLabel: {
    fontSize: t.label.size,
    fontWeight: t.label.weight,
    color: t.label.color,
    lineHeight: 18,
    marginBottom: 8,
  },
  // Controllo a segmenti come il selettore dell'unità di Aggiungi (tela): campo con il segmento attivo velato
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.inputSmall,
    padding: 3,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: t.radius.inputSmall,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: t.colors.accentSoft,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: t.colors.textSecondary,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: t.colors.accentInk,
  },
  fieldPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fieldPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
    overflow: 'hidden',
    gap: 6,
  },
  fieldPickerChipActive: {
    backgroundColor: t.colors.chipActive,
    borderColor: t.colors.chipActiveBorder,
  },
  fieldPickerText: {
    fontSize: 13,
    fontWeight: '500',
    color: t.colors.chipText,
  },
  fieldPickerTextActive: {
    fontWeight: '600',
    color: t.colors.chipActiveText,
  },
  noFieldsText: {
    fontSize: 13,
    color: t.colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  previewCard: {
    ...cardSurface(t),
    borderColor: t.colors.accent,
    padding: 16,
    marginBottom: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: t.weights.strong,
    color: t.colors.accentInk,
  },
  previewUrlContainer: {
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.inputSmall,
    padding: 14,
    marginBottom: 12,
  },
  previewUrl: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: t.colors.accentInk,
    lineHeight: 20,
  },
  previewBreakdown: {
    gap: 8,
  },
  previewSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewSegmentText: {
    fontSize: 12,
    color: t.colors.textSecondary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    padding: 14,
    marginTop: 12,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.error, 0.19),
    gap: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: t.colors.error,
  },
}));
