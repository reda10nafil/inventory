// FurInventory Pro - Custom Automation Runner (Execution Engine)
// ESE (ticket 29): un esecutore solo. Ogni passo d'azione chiede a `utils/automationRun.ts` (`runStep`) che cosa fare
// sulla copia più recente del prodotto letto (`latestProduct`: due note in fila non si cancellano, AU-V02) e scrive
// con le funzioni del contesto; il contatore cresce solo se l'operazione riesce, altrimenti il motivo si dice sul
// lettore e si torna alla lettura del prodotto (AU-V03-V06, P17). Prezzo con la virgola (AU-V01); uso contato quando
// l'automazione è caricata (AU-N13); automazione che non inizia con una lettura → «Modifica» (P16).
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { useAutomations, stepMeta } from '../../../contexts/AutomationsContext';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations } from '../../../contexts/LocationsContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { useCodeReader } from '../../../hooks/useCodeReader';
import type { PlaceRead } from '../../../utils/codes';
import {
    isScanStep, loopIndex, resumeIndex, runStep, salePriceInput, startError, type StepOutcome,
} from '../../../utils/automationRun';
import { moveOf, refusalText, saleOf } from '../../../utils/inventoryOps';
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
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { getAutomationById, recordUsage } = useAutomations();
    const { products, moveProduct, sellProduct, updateProduct, latestProduct } = useInventory();
    const { sources, readProduct, readPlace, placeOf, choose, isText } = useCodeReader();
    const { locations } = useLocations();
    const { customFields } = useCustomFields();

    const automation = getAutomationById(id as string);

    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showScanner, setShowScanner] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    // Un solo timer per il messaggio sul lettore (COD): con «Scrivi il codice» due letture arrivano a meno di un
    // secondo e il timer della prima cancellava il messaggio della seconda (per esempio il rifiuto del cestino)
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [completedCount, setCompletedCount] = useState(0);

    // Runtime context (accumulated during execution)
    const [scannedProductId, setScannedProductId] = useState<string | null>(null);
    const [scannedLocationId, setScannedLocationId] = useState<string | null>(null);

    // Vendita con conferma del prezzo: il passo, il prodotto e la posizione letta che la aspettano
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [priceInput, setPriceInput] = useState('');
    const [priceError, setPriceError] = useState<string | null>(null);
    const pendingSale = useRef<{ index: number; productId: string; locationId: string | null } | null>(null);

    // Uso contato una volta per apertura, quando l'automazione è caricata (AU-N13: aperta dall'indirizzo o ricaricando,
    // prima si contava al montaggio, quando l'elenco non era ancora letto, e l'uso restava 0)
    const usageRecorded = useRef<string | null>(null);
    useEffect(() => {
        if (!automation || usageRecorded.current === automation.id) return;
        usageRecorded.current = automation.id;
        recordUsage(automation.id);
    }, [automation?.id]);

    // Gli hook stanno tutti prima del ritorno «Automazione non trovata» (prima `useCallback` e `useState` venivano
    // dopo e la schermata andava in errore aperta da indirizzo o ricaricata).
    const steps = automation?.steps ?? [];
    const currentStep = steps[currentStepIndex];
    const isComplete = currentStepIndex >= steps.length;
    const blocked = automation ? startError(steps) : null;

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    // ── Handle scan result ──────────────────────────────────
    const handleScan = ({ data }: { type: string; data: string }) => {
        if (!currentStep) return;

        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Lettore unico (COD): link GS1, SKU senza maiuscole; un prodotto nel cestino non entra nell'esecuzione
        if (currentStep.type === 'scan_product') {
            const read = readProduct(data);
            const pickProduct = (productId: string) => {
                const product = products.find((p) => p.id === productId);
                if (!product) return;
                soundService.playSuccess();
                setScannedProductId(product.id);
                showFeedback(`✅ ${product.sku}`);

                // Auto-execute subsequent auto-steps
                setTimeout(() => {
                    runFrom(currentStepIndex + 1, product.id, scannedLocationId);
                }, 300);
            };
            if (read.status === 'product') {
                pickProduct(read.id);
            } else if (read.status === 'choose') {
                choose(read.candidates, (ref) => pickProduct(ref.id));
            } else if (read.status === 'trashed') {
                soundService.playBlockingError();
                showFeedback(`❌ ${products.find((p) => p.id === read.id)?.sku ?? 'Il prodotto'} è nel cestino`, true);
            } else if (read.status === 'other') {
                showFeedback(`❌ ${isText(data, read.ref)} Scansiona un prodotto.`, true);
            } else {
                // Debounce error
                const timeout = setTimeout(() => {
                    soundService.playBlockingError();
                    showFeedback(`❌ Non trovato: ${data}`, true);
                }, 400);
                setErrorTimeoutRef(timeout);
            }
        } else if (currentStep.type === 'scan_location') {
            // Uno scaffale vale la sua posizione (AU-V14): il prodotto va lì, senza scaffale
            const pickLocation = (place: PlaceRead) => {
                const loc = place.status === 'location' ? locations.find((l) => l.id === place.id) : undefined;
                if (!loc) {
                    showFeedback('❌ Posizione non trovata', true);
                    return;
                }
                soundService.playSuccess();
                setScannedLocationId(loc.id);
                const shelf = place.status === 'location' && place.shelfId ? sources.shelves?.find((x) => x.id === place.shelfId)?.name : undefined;
                showFeedback(shelf ? `📍 ${loc.label} (scaffale ${shelf})` : `📍 ${loc.label}`);
                setShowScanner(false);

                setTimeout(() => {
                    runFrom(currentStepIndex + 1, scannedProductId, loc.id);
                }, 300);
            };
            const place = readPlace(data);
            if (place.status === 'choose') {
                choose(place.candidates, (ref) => pickLocation(placeOf(ref)));
            } else if (place.status === 'unknown') {
                // Debounce error
                const timeout = setTimeout(() => {
                    soundService.playBlockingError();
                    showFeedback(`❌ Posizione non trovata`, true);
                }, 400);
                setErrorTimeoutRef(timeout);
            } else {
                pickLocation(place);
            }
        }
    };

    // ── Rifiuto: il motivo sul lettore, e si torna alla lettura del prodotto (la catena di questo prodotto si ferma)
    const refuse = (text: string, at: number) => {
        soundService.playBlockingError();
        showFeedback(`❌ ${text}`, true);
        setCurrentStepIndex(resumeIndex(steps, at));
    };

    /** Scrive un passo riuscito con le funzioni del contesto; il motivo se il contesto lo rifiuta comunque. */
    const apply = (out: Extract<StepOutcome, { ok: true }>, productId: string): string | null => {
        const product = latestProduct(productId);
        if (out.op === 'patch') {
            if (Object.keys(out.patch).length > 0) updateProduct(productId, out.patch);
            return null;
        }
        if (out.op === 'move') {
            if (moveProduct(productId, out.to)) return null;
            const r = moveOf(product, out.to, '');
            return refusalText(r.ok ? 'not_allowed' : r.reason, product?.sku);
        }
        if (out.op === 'sell') {
            if (sellProduct(productId)) return null;
            const r = saleOf(product, undefined, 1, '');
            return refusalText(r.ok ? 'not_allowed' : r.reason, product?.sku);
        }
        return null;
    };

    // ── Passi d'azione in fila fino alla lettura dopo (o alla fine) ───
    const runFrom = (fromIndex: number, productId: string | null, locationId: string | null) => {
        for (let idx = fromIndex; idx < steps.length; idx += 1) {
            const step = steps[idx];
            if (isScanStep(step)) {
                // Reached a scan step — stop and wait for user
                setCurrentStepIndex(idx);
                return;
            }
            const product = productId ? latestProduct(productId) : undefined;
            const out = runStep(product, step, { locationId, locations, fields: customFields, now: new Date().toISOString() });
            if (!out.ok) {
                refuse(out.refusal, idx);
                return;
            }
            if (out.op === 'ask_price') {
                pendingSale.current = { index: idx, productId: productId as string, locationId };
                setCurrentStepIndex(idx);
                setPriceInput(out.proposal);
                setPriceError(null);
                setShowPriceModal(true);
                return;
            }
            const refused = apply(out, productId as string);
            if (refused) {
                refuse(refused, idx);
                return;
            }
            setCompletedCount((c) => c + 1);
        }

        // Fine del flusso: si torna all'ultimo «Scansiona Prodotto» (lettura in fila), altrimenti è completata
        const loop = loopIndex(steps);
        if (loop !== -1) {
            setCurrentStepIndex(loop);
            soundService.playSuccess();
            showFeedback(`✅ Fatto! Scansiona il prossimo...`);
        } else {
            setCurrentStepIndex(steps.length); // Complete
        }
    };

    const closePriceModal = () => {
        setShowPriceModal(false);
        setPriceError(null);
        pendingSale.current = null;
    };

    const confirmSale = () => {
        const pending = pendingSale.current;
        if (!pending) return;
        // «1300,50» = 1300,5; «5.900» = 5900; vuoto = listino; un prezzo sbagliato non vende (AU-V01)
        const price = salePriceInput(priceInput);
        if (!price.ok) {
            setPriceError(price.refusal);
            return;
        }
        const product = latestProduct(pending.productId);
        closePriceModal();
        if (!sellProduct(pending.productId, price.price)) {
            const r = saleOf(product, price.price, 1, '');
            refuse(refusalText(r.ok ? 'not_allowed' : r.reason, product?.sku), pending.index);
            return;
        }
        soundService.playSuccess();
        showFeedback(`💰 Venduto! ${formatPrice(price.price ?? product?.sellPrice ?? 0)}`);
        setCompletedCount(c => c + 1);

        // Continue advancing
        setTimeout(() => {
            runFrom(pending.index + 1, pending.productId, pending.locationId);
        }, 300);
    };

    // «Annulla» o tocco fuori dalla finestra: nessuna vendita, si torna alla lettura (prima il passo restava fermo
    // su «Vendi» senza pulsanti)
    const cancelSale = () => {
        const pending = pendingSale.current;
        closePriceModal();
        if (pending) setCurrentStepIndex(resumeIndex(steps, pending.index));
        showFeedback('Vendita annullata');
    };

    // ── Feedback overlay ────────────────────────────────────
    const showFeedback = (msg: string, isError = false) => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        setFeedbackMessage(msg);
        feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), isError ? 2000 : 1200);
    };

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

    // ── Render ──────────────────────────────────────────────
    const meta = currentStep ? stepMeta(currentStep.type) : null;

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
            {!blocked && (
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
            )}

            {blocked ? (
                /* ── Automazione salvata che non si può avviare (P16): si dice e si apre il costruttore ── */
                <View style={styles.completedContainer}>
                    <AppIcon name="report-problem" size={64} color={t.colors.warning} />
                    <Text style={styles.blockedTitle}>{blocked}</Text>
                    <Text style={styles.completedSub}>Il primo passo deve essere «Scansiona Prodotto» o «Scansiona Posizione».</Text>
                    <Pressable
                        style={styles.doneButton}
                        onPress={() => router.push({ pathname: '/settings/automation-builder', params: { editId: automation.id } } as any)}
                    >
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <Text style={styles.doneButtonText}>Modifica</Text>
                    </Pressable>
                    <Pressable style={{ marginTop: 16, padding: 12 }} onPress={() => router.back()}>
                        <Text style={{ color: t.colors.accentInk, fontSize: 16 }}>Chiudi</Text>
                    </Pressable>
                </View>
            ) : isComplete ? (
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
                        {steps.slice(currentStepIndex + 1, currentStepIndex + 4).map((s) => {
                            const m = stepMeta(s.type);
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
            <Modal visible={showPriceModal} transparent animationType="slide" onRequestClose={cancelSale}>
                <Pressable style={styles.modalOverlay} onPress={cancelSale}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Prezzo Vendita</Text>
                        <TextInput
                            style={styles.priceInput}
                            keyboardType="numeric"
                            value={priceInput}
                            onChangeText={(v) => { setPriceInput(v); setPriceError(null); }}
                            onSubmitEditing={confirmSale}
                            placeholder="0.00"
                            placeholderTextColor={t.colors.placeholder}
                            autoFocus
                        />
                        {priceError && <Text style={styles.priceError}>{priceError}</Text>}
                        <Pressable style={styles.confirmButton} onPress={confirmSale}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <Text style={styles.confirmButtonText}>CONFERMA</Text>
                        </Pressable>
                        <Pressable style={styles.cancelButton} onPress={cancelSale}>
                            <Text style={styles.cancelButtonText}>Annulla</Text>
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
    completedSub: { fontSize: 16, color: t.colors.textSecondary, marginTop: 8, textAlign: 'center' },
    blockedTitle: { fontSize: 20, fontWeight: 'bold', color: t.colors.textPrimary, marginTop: 20, textAlign: 'center' },
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
    priceError: { color: t.colors.error, fontSize: 14, textAlign: 'center', marginTop: -8, marginBottom: 16 },
    cancelButton: { marginTop: 12, minHeight: 44, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
    cancelButtonText: { color: t.colors.accentInk, fontSize: 16, fontWeight: '600' },
}));
