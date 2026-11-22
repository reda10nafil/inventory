// FurInventory Pro - Automation Flow View (Mappa Concettuale)
import React, { useRef } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { useAutomations, STEP_TYPE_META } from '../../../contexts/AutomationsContext';
import QRCode from 'react-native-qrcode-svg';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function AutomationFlowScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { getAutomationById, deleteAutomation } = useAutomations();

    const automation = getAutomationById(id as string);

    if (!automation) {
        return (
            <SafeAreaView edges={['top']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <AppIcon name="error-outline" size={64} color={t.colors.textSecondary} />
                <Text style={{ color: t.colors.textSecondary, marginTop: 16, fontSize: 16 }}>Automazione non trovata</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 24, padding: 12 }}>
                    <Text style={{ color: t.colors.accentInk, fontSize: 16 }}>Torna Indietro</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const handleDelete = () => {
        Alert.alert('Elimina Automazione', `Sei sicuro di voler eliminare "${automation.name}"?`, [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Elimina', style: 'destructive',
                onPress: () => { deleteAutomation(automation.id); router.back(); },
            },
        ]);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Automazione: ${automation.name}\nQR Code: ${automation.qrValue}\n\nStep:\n${automation.steps.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}`,
            });
        } catch (e) { /* ignore */ }
    };

    const handleRun = () => {
        router.push({ pathname: '/automations/custom-runner', params: { id: automation.id } } as any);
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="arrow-back" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle} numberOfLines={1}>{automation.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => router.push({ pathname: '/settings/automation-builder', params: { editId: automation.id } } as any)}>
                        <AppIcon name="edit" size={22} color={t.colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={handleDelete}>
                        <AppIcon name="delete" size={22} color={t.colors.error} />
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: t.spacing.screenPadding, paddingBottom: insets.bottom + 100 }}>
                {/* Automation info */}
                <View style={styles.infoCard}>
                    <View style={[styles.infoIcon, { backgroundColor: withAlpha(automation.color, 0.125) }]}>
                        <AppIcon name={automation.icon as any} size={36} color={automation.color} />
                    </View>
                    <Text style={styles.infoName}>{automation.name}</Text>
                    {automation.description ? <Text style={styles.infoDesc}>{automation.description}</Text> : null}
                    <View style={styles.infoStats}>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{automation.steps.length}</Text>
                            <Text style={styles.statLabel}>Step</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>{automation.usageCount}</Text>
                            <Text style={styles.statLabel}>Utilizzi</Text>
                        </View>
                        <View style={styles.stat}>
                            <Text style={styles.statValue}>
                                {automation.lastUsedAt
                                    ? new Date(automation.lastUsedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
                                    : 'Mai'}
                            </Text>
                            <Text style={styles.statLabel}>Ultimo uso</Text>
                        </View>
                    </View>
                </View>

                {/* ── FLOW MAP ── */}
                <Text style={styles.sectionLabel}>MAPPA DEL FLUSSO</Text>
                <View style={styles.flowMap}>
                    {/* START node */}
                    <View style={styles.flowStartEnd}>
                        <AppIcon name="play-circle-filled" size={28} color={t.colors.success} />
                        <Text style={styles.flowStartEndText}>INIZIO</Text>
                    </View>
                    <View style={styles.connectorLine} />

                    {automation.steps.map((step, index) => {
                        const meta = STEP_TYPE_META[step.type];
                        const isLoop = step.type === 'scan_product' || step.type === 'scan_location';
                        return (
                            <View key={step.id}>
                                <View style={[styles.flowCard, { borderLeftColor: meta.color, borderLeftWidth: 4 }]}>
                                    <View style={styles.flowCardHeader}>
                                        <View style={[styles.stepBadge, { backgroundColor: meta.color }]}>
                                            <Text style={styles.stepBadgeText}>{index + 1}</Text>
                                        </View>
                                        <AppIcon name={meta.icon as any} size={20} color={meta.color} />
                                        <Text style={styles.flowCardType}>{meta.label}</Text>
                                    </View>
                                    <Text style={styles.flowCardLabel}>{step.label}</Text>
                                    {isLoop && <Text style={styles.flowCardLoop}>🔄 Ripetibile — fino a chiusura manuale</Text>}
                                </View>
                                {index < automation.steps.length - 1 && (
                                    <View style={styles.connectorArrow}>
                                        <View style={styles.connectorLine} />
                                        <AppIcon name="arrow-downward" size={20} color={t.colors.textSecondary} />
                                        <View style={styles.connectorLine} />
                                    </View>
                                )}
                            </View>
                        );
                    })}

                    <View style={styles.connectorLine} />
                    {/* END node */}
                    <View style={styles.flowStartEnd}>
                        <AppIcon name="stop-circle" size={28} color={t.colors.error} />
                        <Text style={styles.flowStartEndText}>FINE</Text>
                    </View>
                </View>

                {/* ── QR CODE ── */}
                <Text style={styles.sectionLabel}>QR CODE DELL'AUTOMAZIONE</Text>
                <View style={styles.qrContainer}>
                    <View style={styles.qrWrapper}>
                        <QRCode value={automation.qrValue} size={180} backgroundColor={t.colors.qrPaper} color={t.colors.qrInk} />
                    </View>
                    <Text style={styles.qrValue}>{automation.qrValue}</Text>
                    <Text style={styles.qrHint}>Stampa o salva questo QR. Scansionalo per avviare l'automazione.</Text>
                    <Pressable onPress={handleShare} style={styles.shareButton}>
                        <AppIcon name="share" size={20} color={t.colors.onData} />
                        <Text style={styles.shareButtonText}>Condividi</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* ── Floating Run Button ── */}
            <View style={[styles.floatingBar, { paddingBottom: insets.bottom + 16 }]}>
                <Pressable style={[styles.runButton, { backgroundColor: automation.color }]} onPress={handleRun}>
                    <AppIcon name="play-arrow" size={28} color={t.colors.onData} />
                    <Text style={styles.runButtonText}>Avvia Automazione</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, borderBottomWidth: 1, borderBottomColor: t.colors.border,
    },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 18, fontWeight: '600', color: t.colors.textPrimary, flex: 1 },
    infoCard: {
        backgroundColor: t.colors.surface, borderRadius: t.radius.large,
        padding: 24, alignItems: 'center', marginBottom: 24,
        borderWidth: 1, borderColor: t.colors.border,
    },
    infoIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    infoName: { fontSize: 22, fontWeight: 'bold', color: t.colors.textPrimary, marginBottom: 4 },
    infoDesc: { fontSize: 14, color: t.colors.textSecondary, textAlign: 'center', marginBottom: 16 },
    infoStats: { flexDirection: 'row', gap: 24, marginTop: 12 },
    stat: { alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: 'bold', color: t.colors.textPrimary },
    statLabel: { fontSize: 11, color: t.colors.textSecondary, marginTop: 2, textTransform: 'uppercase' },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: t.colors.textSecondary, marginBottom: 12, letterSpacing: 1 },
    flowMap: { alignItems: 'center', marginBottom: 32 },
    flowStartEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    flowStartEndText: { fontSize: 12, fontWeight: '700', color: t.colors.textSecondary, letterSpacing: 1 },
    connectorLine: { width: 2, height: 16, backgroundColor: t.colors.border },
    connectorArrow: { alignItems: 'center', paddingVertical: 2 },
    flowCard: {
        width: '100%', backgroundColor: t.colors.surface, borderRadius: t.radius.card,
        padding: 16, borderWidth: 1, borderColor: t.colors.border,
    },
    flowCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    stepBadgeText: { color: t.colors.onData, fontSize: 12, fontWeight: 'bold' },
    flowCardType: { fontSize: 12, color: t.colors.textSecondary, fontWeight: '600' },
    flowCardLabel: { fontSize: 16, fontWeight: '600', color: t.colors.textPrimary },
    flowCardLoop: { fontSize: 12, color: t.colors.warning, marginTop: 6 },
    qrContainer: {
        backgroundColor: t.colors.surface, borderRadius: t.radius.large,
        padding: 24, alignItems: 'center', borderWidth: 1, borderColor: t.colors.border,
    },
    qrWrapper: { backgroundColor: t.colors.qrPaper, padding: 16, borderRadius: 12, marginBottom: 16 },
    qrValue: { fontSize: 13, color: t.colors.textSecondary, fontFamily: 'monospace', marginBottom: 8 },
    qrHint: { fontSize: 13, color: t.colors.textSecondary, textAlign: 'center', marginBottom: 16 },
    shareButton: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.colors.info,
        paddingVertical: 10, paddingHorizontal: 20, borderRadius: t.radius.full,
    },
    shareButtonText: { color: t.colors.onData, fontWeight: '600' },
    floatingBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: t.spacing.screenPadding, paddingTop: 12,
        backgroundColor: t.colors.background, borderTopWidth: 1, borderTopColor: t.colors.border,
    },
    runButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 16, borderRadius: t.radius.full, gap: 8,
    },
    runButtonText: { color: t.colors.onData, fontSize: 18, fontWeight: 'bold' },
}));
