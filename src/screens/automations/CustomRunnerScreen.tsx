// FurInventory Pro - Custom Automation Runner (Execution Engine)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import {
    useAutomations,
    STEP_TYPE_META,
    AutomationStep,
} from '../../../contexts/AutomationsContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { soundService } from '../../../services/SoundService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { formatPrice } from '../../../utils/price';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

export default function CustomRunnerScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { getAutomationById, recordUsage } = useAutomations();
    const { products, getProductBySku, moveProduct, sellProduct, updateProduct } = useInventory();
    const { locations } = useLocations();

    const automation = getAutomationById(id as string);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showScanner, setShowScanner] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [completedCount, setCompletedCount] = useState(0);

    // Runtime context (accumulated during execution)
    const [scannedProductId, setScannedProductId] = useState<string | null>(null);
    const [scannedLocationId, setScannedLocationId] = useState<string | null>(null);

    // Sell modal
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceInput, setPriceInput] = useState('');
    const [pendingSellProductId, setPendingSellProductId] = useState<string | null>(null);

    // Record usage on mount
    useEffect(() => {
        if (automation) recordUsage(automation.id);
    }, []);

    if (!automation) {
        return (
            <SafeAreaView edges={['top']} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Backdrop />
                <AppIcon name="error-outline" size={64} color={t.colors.textSecondary} />
                <Text style={{ color: t.colors.textSecondary, marginTop: 16, fontSize: 16 }}>Automazione non trovata</Text>
                <Pressable onPress={() => router.back()} style={{ marginTop: 24, padding: 12 }}>
                    <Text style={{ color: t.colors.accentInk, fontSize: 16 }}>Torna Indietro</Text>
                </Pressable>
            </SafeAreaView>
        );
    }

    const steps = automation.steps;
    const currentStep = steps[currentStepIndex];
    const isComplete = currentStepIndex >= steps.length;

    // ── Execute automatic steps ─────────────────────────────
    const executeAutoStep = useCallback((step: AutomationStep) => {
        if (step.type === 'move_to') {
            if (!scannedProductId) {
                showFeedback('⚠️ Nessun prodotto scansionato', true);
                return false;
            }
            const targetLocation = step.config.useLastScannedLocation
                ? scannedLocationId
                : step.config.locationId;

            if (!targetLocation) {
                showFeedback('⚠️ Nessuna posizione trovata', true);
                return false;
            }

            moveProduct(scannedProductId, targetLocation);
            const loc = locations.find(l => l.id === targetLocation);
            showFeedback(`📦 Spostato in ${loc?.label || targetLocation}`);
            setCompletedCount(c => c + 1);
            return true;

        } else if (step.type === 'add_tag') {
            if (!scannedProductId) {
                showFeedback('⚠️ Nessun prodotto scansionato', true);
                return false;
            }
            const product = products.find(p => p.id === scannedProductId);
            if (!product) return false;

            const tag = step.config.tag || 'Tagged';
            const currentNotes = product.technicalNotes || '';
            if (!currentNotes.includes(`[${tag}]`)) {
                const newNotes = currentNotes ? `${currentNotes}\n[${tag}]` : `[${tag}]`;
                updateProduct(product.id, { technicalNotes: newNotes });
            }
            showFeedback(`🏷️ Tag "${tag}" aggiunto`);
            setCompletedCount(c => c + 1);
            return true;

        } else if (step.type === 'set_field') {
            if (!scannedProductId) {
                showFeedback('⚠️ Nessun prodotto scansionato', true);
                return false;
            }
            const fieldName = step.config.fieldName || '';
            const fieldValue = step.config.fieldValue || '';
            const product = products.find(p => p.id === scannedProductId);
            if (!product) return false;

            const notes = product.technicalNotes || '';
            const entry = `[${fieldName}=${fieldValue}]`;
            if (!notes.includes(entry)) {
                updateProduct(product.id, { technicalNotes: notes ? `${notes}\n${entry}` : entry });
            }
            showFeedback(`✏️ ${fieldName} = ${fieldValue}`);
            setCompletedCount(c => c + 1);
            return true;

        } else if (step.type === 'mark_sold') {
            if (!scannedProductId) {
                showFeedback('⚠️ Nessun prodotto scansionato', true);
                return false;
            }
            if (step.config.pricePrompt) {
                // Show price modal
                const product = products.find(p => p.id === scannedProductId);
                setPriceInput(product?.sellPrice?.toString() || '');
                setPendingSellProductId(scannedProductId);
                setShowPriceModal(true);
                return false; // Don't auto-advance — modal will handle it
            } else {
                sellProduct(scannedProductId);
                showFeedback('💰 Venduto!');
                setCompletedCount(c => c + 1);
                return true;
            }
        }
        return false;
    }, [scannedProductId, scannedLocationId, products, locations]);

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    // ── Handle scan result ──────────────────────────────────
    const handleScan = ({ type, data }: { type: string; data: string }) => {
        if (!currentStep) return;

        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        if (currentStep.type === 'scan_product') {
            let product = products.find(p => p.id === data || p.sku === data);
            if (!product) product = getProductBySku(data);

            if (product) {
                soundService.playSuccess();
                setScannedProductId(product.id);
                showFeedback(`✅ ${product.sku}`);

                // Auto-execute subsequent auto-steps
                setTimeout(() => {
                    advanceToNextScanStep(currentStepIndex + 1, product!.id, scannedLocationId);
                }, 300);
            } else {
                // Debounce error
                const timeout = setTimeout(() => {
                    soundService.playBlockingError();
                    showFeedback(`❌ Non trovato: ${data}`, true);
                }, 400);
                setErrorTimeoutRef(timeout);
            }
        } else if (currentStep.type === 'scan_location') {
            const loc = locations.find(l => l.barcode === data || l.id === data);
            if (loc) {
                soundService.playSuccess();
                setScannedLocationId(loc.id);
                showFeedback(`📍 ${loc.label}`);
                setShowScanner(false);

                setTimeout(() => {
                    advanceToNextScanStep(currentStepIndex + 1, scannedProductId, loc.id);
                }, 300);
            } else {
                // Debounce error
                const timeout = setTimeout(() => {
                    soundService.playBlockingError();
                    showFeedback(`❌ Posizione non trovata`, true);
                }, 400);
                setErrorTimeoutRef(timeout);
            }
        }
    };

    // ── Advance through auto-steps until next scan or end ───
    const advanceToNextScanStep = (fromIndex: number, productId: string | null, locationId: string | null) => {
        let idx = fromIndex;
        // Temporarily update context for auto-execution
        let tmpProductId = productId;
        let tmpLocationId = locationId;

        while (idx < steps.length) {
            const step = steps[idx];
            if (step.type === 'scan_product' || step.type === 'scan_location') {
                // Reached a scan step — stop and wait for user
                setCurrentStepIndex(idx);
                return;
            }

            // Execute auto step with current context
            const context = { scannedProductId: tmpProductId, scannedLocationId: tmpLocationId };

            // Quick inline execution
            if (step.type === 'move_to') {
                if (tmpProductId) {
                    const targetLoc = step.config.useLastScannedLocation ? tmpLocationId : step.config.locationId;
                    if (targetLoc) {
                        moveProduct(tmpProductId, targetLoc);
                        setCompletedCount(c => c + 1);
                    }
                }
            } else if (step.type === 'add_tag' && tmpProductId) {
                const product = products.find(p => p.id === tmpProductId);
                if (product) {
                    const tag = step.config.tag || '';
                    const notes = product.technicalNotes || '';
                    if (!notes.includes(`[${tag}]`)) {
                        updateProduct(product.id, { technicalNotes: notes ? `${notes}\n[${tag}]` : `[${tag}]` });
                    }
                    setCompletedCount(c => c + 1);
                }
            } else if (step.type === 'set_field' && tmpProductId) {
                const product = products.find(p => p.id === tmpProductId);
                if (product) {
                    const notes = product.technicalNotes || '';
                    const entry = `[${step.config.fieldName || ''}=${step.config.fieldValue || ''}]`;
                    if (!notes.includes(entry)) {
                        updateProduct(product.id, { technicalNotes: notes ? `${notes}\n${entry}` : entry });
                    }
                    setCompletedCount(c => c + 1);
                }
            } else if (step.type === 'mark_sold' && tmpProductId) {
                if (step.config.pricePrompt) {
                    setCurrentStepIndex(idx);
                    setPendingSellProductId(tmpProductId);
                    const p = products.find(pp => pp.id === tmpProductId);
                    setPriceInput(p?.sellPrice?.toString() || '');
                    setShowPriceModal(true);
                    return;
                } else {
                    sellProduct(tmpProductId);
                    setCompletedCount(c => c + 1);
                }
            }
            idx++;
        }

        // We've reached the end of steps — check if there's a scan_product loop
        // If last scan was scan_product, go back to it (loop behavior)
        const lastScanIdx = [...steps].reverse().findIndex(s => s.type === 'scan_product');
        if (lastScanIdx !== -1) {
            const loopBackIdx = steps.length - 1 - lastScanIdx;
            setCurrentStepIndex(loopBackIdx);
            soundService.playSuccess();
            showFeedback(`✅ Fatto! Scansiona il prossimo...`);
        } else {
            setCurrentStepIndex(steps.length); // Complete
        }
    };

    const confirmSale = () => {
        if (!pendingSellProductId) return;
        const price = priceInput ? parseFloat(priceInput) : undefined;
        sellProduct(pendingSellProductId, price);
        soundService.playSuccess();
        showFeedback(`💰 Venduto! ${formatPrice(price || 0)}`);
        setCompletedCount(c => c + 1);
        setShowPriceModal(false);
        setPendingSellProductId(null);

        // Continue advancing
        setTimeout(() => {
            advanceToNextScanStep(currentStepIndex + 1, scannedProductId, scannedLocationId);
        }, 300);
    };

    // ── Feedback overlay ────────────────────────────────────
    const showFeedback = (msg: string, isError = false) => {
        setFeedbackMessage(msg);
        setTimeout(() => setFeedbackMessage(null), isError ? 2000 : 1200);
    };

    // ── Render ──────────────────────────────────────────────
    const meta = currentStep ? STEP_TYPE_META[currentStep.type] : null;

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{automation.name}</Text>
                    <Text style={styles.headerSub}>{completedCount} azioni completate</Text>
                </View>
                <View style={[styles.headerBadge, { backgroundColor: automation.color }]}>
                    <AppIcon name={automation.icon as any} size={20} color={t.colors.onData} />
                </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBar}>
                {steps.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressDot,
                            i < currentStepIndex && { backgroundColor: t.colors.success },
                            i === currentStepIndex && { backgroundColor: automation.color, transform: [{ scale: 1.3 }] },
                        ]}
                    />
                ))}
            </View>

            {isComplete ? (
                /* ── COMPLETED STATE ── */
                <View style={styles.completedContainer}>
                    <AppIcon name="check-circle" size={80} color={t.colors.success} />
                    <Text style={styles.completedTitle}>Automazione Completata!</Text>
                    <Text style={styles.completedSub}>{completedCount} azioni eseguite</Text>
                    <Pressable style={styles.doneButton} onPress={() => router.back()}>
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <Text style={styles.doneButtonText}>Chiudi</Text>
                    </Pressable>
                </View>
            ) : (
                /* ── CURRENT STEP ── */
                <View style={styles.stepContainer}>
                    {/* Step info card */}
                    <View style={styles.stepCard}>
                        <View style={[styles.stepIcon, { backgroundColor: withAlpha(meta!.color, 0.125) }]}>
                            <AppIcon name={meta!.icon as any} size={40} color={meta!.color} />
                        </View>
                        <Text style={styles.stepLabel}>{currentStep.label}</Text>
                        <Text style={styles.stepMeta}>Step {currentStepIndex + 1} di {steps.length}</Text>
                    </View>

                    {/* Action button for scan steps */}
                    {(currentStep.type === 'scan_product' || currentStep.type === 'scan_location') && (
                        <Pressable
                            style={styles.scanButton}
                            onPress={() => setShowScanner(true)}
                        >
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                            <Text style={styles.scanButtonText}>
                                {currentStep.type === 'scan_product' ? 'Scansiona Prodotto' : 'Scansiona Posizione'}
                            </Text>
                        </Pressable>
                    )}

                    {/* Mini flow (remaining steps) */}
                    <View style={styles.miniFlow}>
                        <Text style={styles.miniFlowLabel}>Prossimi step</Text>
                        {steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((s, i) => {
                            const m = STEP_TYPE_META[s.type];
                            return (
                                <View key={s.id} style={styles.miniFlowItem}>
                                    <View style={[styles.miniFlowDot, { backgroundColor: m.color }]} />
                                    <Text style={styles.miniFlowText}>{s.label}</Text>
                                </View>
                            );
                        })}
                        {steps.length - currentStepIndex - 1 > 3 && (
                            <Text style={styles.miniFlowMore}>+{steps.length - currentStepIndex - 4} altri...</Text>
                        )}
                    </View>
                </View>
            )}

            {/* ── Scanner Overlay ── */}
            {showScanner && (
                <View style={StyleSheet.absoluteFill}>
                    <BarcodeScanner
                        onScan={handleScan}
                        onClose={() => setShowScanner(false)}
                        delay={500}
                    />
                    {feedbackMessage && (
                        <View style={styles.feedbackOverlay}>
                            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ── Non-scanner feedback ── */}
            {feedbackMessage && !showScanner && (
                <View style={styles.toastContainer}>
                    <Text style={styles.toastText}>{feedbackMessage}</Text>
                </View>
            )}

            {/* ── Price Modal ── */}
            <Modal visible={showPriceModal} transparent animationType="slide" onRequestClose={() => setShowPriceModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowPriceModal(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Prezzo Vendita</Text>
                        <TextInput
                            style={styles.priceInput}
                            keyboardType="numeric"
                            value={priceInput}
                            onChangeText={setPriceInput}
                            placeholder="0.00"
                            placeholderTextColor={t.colors.placeholder}
                            autoFocus
                        />
                        <Pressable style={styles.confirmButton} onPress={confirmSale}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <Text style={styles.confirmButtonText}>CONFERMA</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderBottomWidth: 1, borderBottomColor: t.colors.border,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: t.colors.textPrimary },
    headerSub: { fontSize: 12, color: t.colors.textSecondary, marginTop: 2 },
    headerBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    progressBar: {
        flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: t.colors.border,
    },
    progressDot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: t.colors.border,
    },
    stepContainer: { flex: 1, padding: t.spacing.screenPadding, alignItems: 'center', justifyContent: 'center' },
    stepCard: {
        ...cardSurface(t),
        padding: 32, alignItems: 'center', width: '100%', marginBottom: 24,
    },
    stepIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    stepLabel: { fontSize: 20, fontWeight: 'bold', color: t.colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    stepMeta: { fontSize: 13, color: t.colors.textSecondary },
    scanButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 18, paddingHorizontal: 32, borderRadius: t.radius.button,
        backgroundColor: t.colors.button, overflow: 'hidden', ...t.shadows.button,
        gap: 12, width: '100%', marginBottom: 24,
    },
    scanButtonText: { color: t.colors.onButton, fontSize: 18, fontWeight: 'bold' },
    miniFlow: { width: '100%', marginTop: 8 },
    miniFlowLabel: { ...t.typography.sectionHeader, marginBottom: 8 },
    miniFlowItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    miniFlowDot: { width: 8, height: 8, borderRadius: 4 },
    miniFlowText: { fontSize: 14, color: t.colors.textSecondary },
    miniFlowMore: { fontSize: 13, color: t.colors.textSecondary, marginTop: 4 },
    completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    completedTitle: { fontSize: 24, fontWeight: 'bold', color: t.colors.textPrimary, marginTop: 20 },
    completedSub: { fontSize: 16, color: t.colors.textSecondary, marginTop: 8 },
    doneButton: {
        marginTop: 32, paddingVertical: 16, paddingHorizontal: 40, borderRadius: t.radius.button,
        backgroundColor: t.colors.button, overflow: 'hidden', ...t.shadows.button,
    },
    doneButtonText: { color: t.colors.onButton, fontSize: 18, fontWeight: 'bold' },
    feedbackOverlay: {
        position: 'absolute', top: '50%', left: '15%', right: '15%',
        backgroundColor: withAlpha(t.colors.shadow, 0.85), padding: 20, borderRadius: 16,
        alignItems: 'center',
    },
    feedbackText: { color: t.colors.onData, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    toastContainer: {
        position: 'absolute', bottom: 120, left: 20, right: 20,
        backgroundColor: withAlpha(t.colors.shadow, 0.85), padding: 16, borderRadius: 12, alignItems: 'center',
    },
    toastText: { color: t.colors.onData, fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: t.colors.scrimStrong, justifyContent: 'center', padding: 20 },
    // Finestra sopra il velo: fondo opaco
    modalContent: {
        backgroundColor: t.colors.backgroundSecondary, borderRadius: t.radius.card, padding: 24, alignItems: 'center',
        borderWidth: 1, borderColor: t.colors.border,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: t.colors.textPrimary, marginBottom: 20 },
    priceInput: {
        width: '100%', backgroundColor: t.colors.input, borderRadius: t.radius.input,
        padding: 16, fontSize: 24, color: t.colors.inputText, textAlign: 'center',
        marginBottom: 20, borderWidth: 1, borderColor: t.colors.inputBorder,
    },
    confirmButton: {
        width: '100%', padding: 16, borderRadius: t.radius.button, alignItems: 'center',
        backgroundColor: t.colors.button, overflow: 'hidden', ...t.shadows.button,
    },
    confirmButtonText: { color: t.colors.onButton, fontSize: 16, fontWeight: 'bold' },
}));
