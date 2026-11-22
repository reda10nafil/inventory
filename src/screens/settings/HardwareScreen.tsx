// FurInventory Pro - Hardware Settings Screen
import React from 'react';
import { View, Pressable, ScrollView, Switch, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHardwareConfig, ScanMode } from '../../../contexts/HardwareConfigContext';
import { nfcService } from '../../../utils/nfcService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function HardwareSettingsScreen() {
  const styles = useStyles();
  const t = useTheme();
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
        <AppIcon
          name={icon as any}
          size={18}
          color={isActive ? t.colors.accentInk : t.colors.textSecondary}
        />
        <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{label}</Text>
      </Pressable>
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
          <AppIcon name="settings-cell" size={24} color={t.colors.accentInk} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Scanner & Hardware</Text>
          <Text style={styles.infoDesc}>
            Configura come FurInventory Pro interagisce con il mondo fisico. Scegli se preferisci usare la fotocamera (QR) o il sensore NFC per scansionare e programmare i prodotti.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Modalità di lettura preferita</Text>
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

      <Text style={styles.sectionTitle}>Automazioni e flusso</Text>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <View style={[styles.iconBadge, { backgroundColor: t.colors.iconWrap }]}>
              <AppIcon name="save-alt" size={16} color={t.colors.accentInk} />
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
            trackColor={{ false: t.colors.checkRing, true: withAlpha(t.colors.accent, 0.502) }}
            thumbColor={hwConfig.autoWriteNfcOnSave ? t.colors.accent : t.colors.textMuted}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Diagnostica</Text>
      <View style={styles.card}>
        <Pressable style={styles.actionRow} onPress={handleTestNfc}>
          <View style={styles.actionRowContent}>
            <AppIcon name="health-and-safety" size={24} color={t.colors.textPrimary} />
            <Text style={styles.actionRowText}>Test Stato Sensore NFC</Text>
          </View>
          <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>
      </View>
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
    fontSize: 14,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  helperText: {
    ...t.typography.caption,
    fontSize: 12,
    color: t.colors.textMuted,
    marginBottom: 16,
    lineHeight: 16,
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
    paddingVertical: 12,
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
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: {
    flex: 1,
    paddingRight: 16,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: t.weights.strong,
    color: t.colors.textPrimary,
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    color: t.colors.textSecondary,
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
    color: t.colors.textPrimary,
  },
}));
