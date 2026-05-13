// FurInventory Pro - GS1 Digital Link Configuration Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme, typography, borderRadius, spacing, shadows } from '../../constants/theme';
import { useGS1Config } from '../../contexts/GS1ConfigContext';
import { useCustomFields } from '../../contexts/CustomFieldsContext';
import { buildPreviewLink } from '../../utils/gs1';

export default function GS1ConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gs1Config, updateGS1Config, resetToDefaults } = useGS1Config();
  const { customFields } = useCustomFields();

  // Local state for text input debouncing
  const [baseUrlLocal, setBaseUrlLocal] = useState(gs1Config.baseUrl);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconWrap}>
          <MaterialIcons name="link" size={24} color={theme.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>GS1 Digital Link</Text>
          <Text style={styles.infoDesc}>
            Genera automaticamente un URL standard GS1 per ogni prodotto. Collegalo a QR Code e tag NFC per un'identità digitale univoca.
          </Text>
        </View>
      </View>

      {/* Section: Endpoint */}
      <Text style={styles.sectionTitle}>ENDPOINT DI RISOLUZIONE</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Dominio Base</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="language" size={20} color={theme.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={baseUrlLocal}
            onChangeText={setBaseUrlLocal}
            onBlur={handleBaseUrlBlur}
            placeholder="https://syncroflow.app/id"
            placeholderTextColor={theme.textMuted}
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
      <Text style={styles.sectionTitle}>MAPPATURA GS1 (APPLICATION IDENTIFIERS)</Text>

      {/* AI 01 - GTIN (Always On) */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.aiBadge, { backgroundColor: `${theme.primary}30` }]}>
              <Text style={[styles.aiBadgeText, { color: theme.primary }]}>AI 01</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>GTIN / EAN</Text>
              <Text style={styles.toggleDesc}>Mappato sul campo SKU del prodotto</Text>
            </View>
          </View>
          <View style={styles.alwaysOnBadge}>
            <MaterialIcons name="lock" size={14} color={theme.primary} />
            <Text style={styles.alwaysOnText}>Obbligatorio</Text>
          </View>
        </View>
      </View>

      {/* AI 21 - Serial */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.aiBadge, { backgroundColor: gs1Config.enableSerial ? `${theme.success}30` : `${theme.textMuted}20` }]}>
              <Text style={[styles.aiBadgeText, { color: gs1Config.enableSerial ? theme.success : theme.textMuted }]}>AI 21</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Numero Seriale</Text>
              <Text style={styles.toggleDesc}>Genera un identificativo univoco per ogni prodotto</Text>
            </View>
          </View>
          <Switch
            value={gs1Config.enableSerial}
            onValueChange={(val) => updateGS1Config({ enableSerial: val })}
            trackColor={{ false: theme.border, true: `${theme.success}80` }}
            thumbColor={gs1Config.enableSerial ? theme.success : theme.textMuted}
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
                <MaterialIcons
                  name="fingerprint"
                  size={16}
                  color={gs1Config.serialMode === 'uuid' ? '#000' : theme.textSecondary}
                />
                <Text style={[styles.segmentText, gs1Config.serialMode === 'uuid' && styles.segmentTextActive]}>UUID</Text>
              </Pressable>
              <Pressable
                style={[styles.segmentButton, gs1Config.serialMode === 'progressive' && styles.segmentButtonActive]}
                onPress={() => updateGS1Config({ serialMode: 'progressive' })}
              >
                <MaterialIcons
                  name="format-list-numbered"
                  size={16}
                  color={gs1Config.serialMode === 'progressive' ? '#000' : theme.textSecondary}
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
            <View style={[styles.aiBadge, { backgroundColor: gs1Config.enableLotto ? `${theme.info}30` : `${theme.textMuted}20` }]}>
              <Text style={[styles.aiBadgeText, { color: gs1Config.enableLotto ? theme.info : theme.textMuted }]}>AI 10</Text>
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Lotto</Text>
              <Text style={styles.toggleDesc}>Includi il numero di lotto nell'URL</Text>
            </View>
          </View>
          <Switch
            value={gs1Config.enableLotto}
            onValueChange={(val) => updateGS1Config({ enableLotto: val })}
            trackColor={{ false: theme.border, true: `${theme.info}80` }}
            thumbColor={gs1Config.enableLotto ? theme.info : theme.textMuted}
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
                    <MaterialIcons
                      name={(cf.icon || 'label') as any}
                      size={16}
                      color={gs1Config.lottoFieldId === cf.id ? '#000' : theme.textSecondary}
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
      <Text style={styles.sectionTitle}>ANTEPRIMA STRINGA</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <MaterialIcons name="qr-code" size={20} color={theme.primary} />
          <Text style={styles.previewLabel}>URL Risultante</Text>
        </View>
        <View style={styles.previewUrlContainer}>
          <Text style={styles.previewUrl} selectable>{previewLink}</Text>
        </View>
        <View style={styles.previewBreakdown}>
          <View style={styles.previewSegment}>
            <View style={[styles.previewDot, { backgroundColor: theme.primary }]} />
            <Text style={styles.previewSegmentText}>Base: {baseUrlLocal || '...'}</Text>
          </View>
          <View style={styles.previewSegment}>
            <View style={[styles.previewDot, { backgroundColor: theme.warning }]} />
            <Text style={styles.previewSegmentText}>AI 01 (GTIN): dal campo SKU</Text>
          </View>
          {gs1Config.enableSerial && (
            <View style={styles.previewSegment}>
              <View style={[styles.previewDot, { backgroundColor: theme.success }]} />
              <Text style={styles.previewSegmentText}>
                AI 21 (Seriale): {gs1Config.serialMode === 'uuid' ? 'UUID automatico' : 'Progressivo'}
              </Text>
            </View>
          )}
          {gs1Config.enableLotto && (
            <View style={styles.previewSegment}>
              <View style={[styles.previewDot, { backgroundColor: theme.info }]} />
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
        <MaterialIcons name="restore" size={20} color={theme.error} />
        <Text style={styles.resetText}>Ripristina Predefiniti</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: spacing.screenPadding,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.primary}10`,
    borderRadius: borderRadius.large,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${theme.primary}30`,
    gap: 12,
  },
  infoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${theme.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...typography.cardTitle,
    color: theme.primary,
    marginBottom: 4,
  },
  infoDesc: {
    ...typography.caption,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.large,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...shadows.card,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.textPrimary,
    paddingVertical: 14,
  },
  helperText: {
    ...typography.caption,
    fontSize: 12,
    color: theme.textMuted,
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
    borderRadius: 6,
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
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  alwaysOnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${theme.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  alwaysOnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.primary,
  },
  subOption: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  subOptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme.backgroundSecondary,
    borderRadius: borderRadius.medium,
    padding: 3,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.small,
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: theme.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  segmentTextActive: {
    color: '#000',
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
    borderRadius: borderRadius.full,
    backgroundColor: theme.backgroundSecondary,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 6,
  },
  fieldPickerChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  fieldPickerText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  fieldPickerTextActive: {
    color: '#000',
  },
  noFieldsText: {
    fontSize: 13,
    color: theme.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: theme.surface,
    borderRadius: borderRadius.large,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.primary,
    ...shadows.cardElevated,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewUrlContainer: {
    backgroundColor: theme.backgroundSecondary,
    borderRadius: borderRadius.medium,
    padding: 14,
    marginBottom: 12,
  },
  previewUrl: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: theme.primary,
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
    color: theme.textSecondary,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 12,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
    gap: 8,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.error,
  },
});
