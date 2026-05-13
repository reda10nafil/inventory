// FurInventory Pro - Hardware Settings Screen
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { theme, typography, borderRadius, spacing, shadows } from '../../constants/theme';
import { useHardwareConfig, ScanMode } from '../../contexts/HardwareConfigContext';
import { nfcService } from '../../utils/nfcService';

export default function HardwareSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { hwConfig, updateHwConfig, resetHwConfig } = useHardwareConfig();

  const handleTestNfc = async () => {
    try {
      const isSupported = await nfcService.isSupported();
      if (!isSupported) {
        Alert.alert('Diagnostica NFC', 'Il tuo dispositivo NON supporta l\'NFC o il sensore è rotto.');
        return;
      }
      const isEnabled = await nfcService.isEnabled();
      if (!isEnabled) {
        Alert.alert('Diagnostica NFC', 'L\'NFC è supportato ma risulta DISABILITATO. Accendilo nelle impostazioni del telefono.');
        return;
      }
      Alert.alert('Diagnostica NFC', '✅ Sensore NFC supportato e attivo. Pronto all\'uso.');
    } catch (e) {
      Alert.alert('Diagnostica NFC', 'Errore durante la verifica dello stato NFC.');
    }
  };

  const renderModeButton = (mode: ScanMode, icon: string, label: string) => {
    const isActive = hwConfig.scanMode === mode;
    return (
      <Pressable
        style={[styles.segmentButton, isActive && styles.segmentButtonActive]}
        onPress={() => updateHwConfig({ scanMode: mode })}
      >
        <MaterialIcons
          name={icon as any}
          size={18}
          color={isActive ? '#000' : theme.textSecondary}
        />
        <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{label}</Text>
      </Pressable>
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
          <MaterialIcons name="settings-cell" size={24} color={theme.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Scanner & Hardware</Text>
          <Text style={styles.infoDesc}>
            Configura come FurInventory Pro interagisce con il mondo fisico. Scegli se preferisci usare la fotocamera (QR) o il sensore NFC per scansionare e programmare i prodotti.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>MODALITÀ DI LETTURA PREFERITA</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Metodo di Scansione Azione Rapida</Text>
        <Text style={styles.helperText}>
          Definisce quale hardware attivare quando apri la fotocamera per scansionare un prodotto o eseguire automazioni.
        </Text>
        
        <View style={styles.segmentedControl}>
          {renderModeButton('qr_only', 'qr-code-scanner', 'Solo QR')}
          {renderModeButton('nfc_only', 'nfc', 'Solo NFC')}
          {renderModeButton('both', 'sync-alt', 'Entrambi')}
        </View>
      </View>

      <Text style={styles.sectionTitle}>AUTOMAZIONI E FLUSSO</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.iconBadge, { backgroundColor: `${theme.primary}20` }]}>
              <MaterialIcons name="save-alt" size={16} color={theme.primary} />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>Scrittura Automatica NFC</Text>
              <Text style={styles.toggleDesc}>
                Se attivo, dopo aver salvato un nuovo prodotto ti verrà chiesto immediatamente di avvicinare un tag NFC per programmarlo (Pulizia + Scrittura).
              </Text>
            </View>
          </View>
          <Switch
            value={hwConfig.autoWriteNfcOnSave}
            onValueChange={(val) => updateHwConfig({ autoWriteNfcOnSave: val })}
            trackColor={{ false: theme.border, true: `${theme.primary}80` }}
            thumbColor={hwConfig.autoWriteNfcOnSave ? theme.primary : theme.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>DIAGNOSTICA</Text>
      <View style={styles.card}>
        <Pressable style={styles.actionRow} onPress={handleTestNfc}>
          <View style={styles.actionRowContent}>
            <MaterialIcons name="health-and-safety" size={24} color={theme.textPrimary} />
            <Text style={styles.actionRowText}>Test Stato Sensore NFC</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>
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
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  helperText: {
    ...typography.caption,
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 16,
    lineHeight: 16,
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
    paddingVertical: 12,
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
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  actionRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionRowText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textPrimary,
  },
});
