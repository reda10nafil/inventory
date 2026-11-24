// FurInventory Pro - Batch Move Automation
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { soundService } from '../../../services/SoundService';
// import { Audio } from 'expo-av'; // Removed for now to simplify dependencies
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import { useProductKind } from '../../../hooks/useProductKind';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { useCodeReader } from '../../../hooks/useCodeReader';
import type { PlaceRead } from '../../../utils/codes';
import type { Product } from '../../../types';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { stockKey } from '../../../utils/stock';
import { moveOf, refusalText } from '../../../utils/inventoryOps';
import { useShelves } from '../../../contexts/ShelvesContext';
import { useLoadCheck } from '../../../hooks/useLoadCheck';
import { useLoadBlock } from '../../../components/LoadBlockSheet';
import { ShelfFill } from '../../../components/ShelfFill';
import { fillLevel, freeText, loadWarningText, placeLoad, placeWithShelf, shelfLoad, type LoadProposal, type Shelf } from '../../../utils/shelves';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

type Step = 'scan_location' | 'scan_products';
/** Destinazione (S3): una posizione, oppure uno scaffale letto col suo codice (il prodotto va su quello scaffale). */
type Target = { location: Location; shelfId?: string; key: string; label: string };

export default function BatchMoveScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, moveProduct, latestProduct, latestProducts } = useInventory();
    const { readProduct, readPlace, placeOf, choose, isText } = useCodeReader();
    const { locations } = useLocations();
    const { shelves } = useShelves();
    const kindOf = useProductKind();
    // S3 (ticket 15): avviso e blocco a ogni articolo, in pezzi, peso e volume; capienza delle posizioni in pezzi (AU-V13)
    const { check, checkMove } = useLoadCheck();
    const load = useLoadBlock();

    const [step, setStep] = useState<Step>('scan_location');
    const [targetLocation, setTarget] = useState<Target | null>(null);
    const [scannedCount, setScannedCount] = useState(0);
    const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    // Un solo timer per il messaggio sul lettore (COD): con «Scrivi il codice» due letture arrivano a meno di un
    // secondo e il timer della prima cancellava il messaggio della seconda (per esempio il rifiuto del cestino)
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const feedback = (text: string, ms = 1000) => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        setFeedbackMessage(text);
        feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), ms);
    };

    // Sound effects - use global service
    async function playSuccessSound() {
        soundService.playSuccess();
    }

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        // Only close scanner if we are scanning location (Step 1)
        if (step === 'scan_location') {
            setShowScanner(false);
            handleLocationScan(data);
        } else {
            // Continuous scanning for products
            handleProductScan(data);
        }
    };

    // Lettore unico (COD): codice, id o nome di una posizione o di uno scaffale (S3: lo scaffale è la destinazione)
    const handleLocationScan = (data: string) => {
        const place = readPlace(data);
        if (place.status === 'choose') {
            choose(place.candidates, (ref) => applyPlace(placeOf(ref)));
            return;
        }
        applyPlace(place);
    };

    const applyPlace = (place: PlaceRead) => {
        const loc = place.status === 'location' ? locations.find((l) => l.id === place.id) : undefined;
        if (!loc) {
            Alert.alert('Errore', 'Posizione non trovata nel database.');
            return;
        }
        checkCapacityAndSetLocation(loc, place.status === 'location' ? place.shelfId : undefined);
    };

    const targetOf = (loc: Location, shelfId?: string): Target => {
        const shelf = shelfId ? shelves.find((s) => s.id === shelfId && s.locationId === loc.id) : undefined;
        return { location: loc, shelfId: shelf?.id, key: stockKey(loc.id, shelf?.id), label: placeWithShelf(loc.label, shelf) };
    };

    // Il controllo di prima diventa la prima chiamata (ticket 15): una destinazione già piena (non c'entra nemmeno un
    // pezzo) si blocca con la proposta, senza «Usa comunque» (scartato dall'utente); si contano i pezzi (AU-V13)
    const checkCapacityAndSetLocation = (loc: Location, shelfId?: string) => {
        const target = targetOf(loc, shelfId);
        const full = check({}, target.key, [{ qty: 1 }]);
        if (full.level === 'blocco') {
            load.show({
                check: full,
                onUse: (p: LoadProposal) => {
                    const other = locations.find((l) => l.id === p.locationId);
                    if (other) confirmLocation(targetOf(other, p.shelfId));
                },
            });
            return;
        }
        confirmLocation(target);
    };

    const confirmLocation = (target: Target) => {
        setTarget(target);
        setStep('scan_products');
        playSuccessSound();
    };

    // Dall'Azione rapida di una posizione (ESE, AU-N17): quella è la destinazione, con il controllo della capienza;
    // una volta, a dati caricati
    const { locationId } = useLocalSearchParams<{ locationId?: string }>();
    const autoStarted = useRef(false);
    useEffect(() => {
        if (autoStarted.current || !locationId || step !== 'scan_location' || products.length === 0) return;
        const loc = locations.find((l) => l.id === locationId);
        if (!loc) return;
        autoStarted.current = true;
        checkCapacityAndSetLocation(loc);
    }, [locationId, locations, products]);

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    // Cambio di destinazione dalla lettura di una posizione o di uno scaffale (S3: lo scaffale è la destinazione)
    const askChange = (place: PlaceRead) => {
        const potentialLoc = place.status === 'location' ? locations.find((l) => l.id === place.id) : undefined;
        if (!potentialLoc) return;
        setShowScanner(false); // Pause scanner immediately to avoid spam
        Vibration.vibrate(100);
        const shelfId = place.status === 'location' ? place.shelfId : undefined;
        Alert.alert(
            'Cambio Destinazione',
            `Vuoi cambiare la destinazione a "${targetOf(potentialLoc, shelfId).label}"?`,
            [
                { text: 'No', style: 'cancel', onPress: () => setShowScanner(true) },
                {
                    text: 'Sì',
                    onPress: () => {
                        checkCapacityAndSetLocation(potentialLoc, shelfId);
                    }
                }
            ]
        );
    };

    /** Sposta davvero in `key` (la destinazione o il posto proposto) e lo conta. */
    const doMove = (product: Product, key: string, note?: string): boolean => {
        // Spostamento vero: in cronologia «spostato», non «modificato» (D15)
        if (!moveProduct(product.id, key)) {
            const refused = moveOf(product, key, '');
            feedback(refusalText(refused.ok ? 'not_allowed' : refused.reason, product.sku), 1500);
            return false;
        }
        setScannedCount(c => c + 1);
        setLastScannedProduct(kindOf(product).line ? `${product.sku} (${kindOf(product).line})` : product.sku);
        playSuccessSound();
        // Show overlay feedback (S3: con l'avviso del carico, se c'è)
        feedback(note ? `${product.sku} Spostato! ${note}` : `${product.sku} Spostato!`, note ? 2000 : 1000);
        return true;
    };

    // Sposta il prodotto letto (o scelto tra più prodotti con lo stesso codice) nella destinazione. S3: il controllo
    // del carico sulla copia più recente (il conto si aggiorna a ogni articolo); col blocco si ferma solo questo
    // articolo, nulla è scritto, e la finestra propone un altro posto (il tocco sposta lì solo questo articolo)
    const moveFlow = (read: Product) => {
        if (!targetLocation) return;
        const product = latestProduct(read.id) ?? read;
        const tried = moveOf(product, targetLocation.key, '');
        if (!tried.ok && tried.reason === 'same_place') {
            feedback(`${product.sku} già qui!`, 1000);
            return;
        }
        const result = tried.ok ? checkMove(product, targetLocation.key) : null;
        if (result?.level === 'blocco') {
            soundService.playBlockingError();
            setShowScanner(false);
            load.show({
                check: result,
                onUse: (p) => { doMove(product, p.key); setShowScanner(true); },
                onCancel: () => setShowScanner(true),
            });
            return;
        }
        doMove(product, targetLocation.key, result?.level === 'avviso' ? `${loadWarningText(result)}.` : undefined);
    };

    const handleProductScan = async (data: string) => {
        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Lettore unico (COD). Una posizione o uno scaffale letti qui cambiano la destinazione, con conferma
        const read = readProduct(data);
        if (read.status === 'other' || read.status === 'unknown') {
            const place = readPlace(data);
            if (place.status === 'location') {
                askChange(place);
                return;
            }
            if (place.status === 'choose') {
                setShowScanner(false);
                choose(place.candidates, (ref) => askChange(placeOf(ref)), () => setShowScanner(true));
                return;
            }
        }

        if (!targetLocation) return;

        const byId = (id: string) => products.find((p) => p.id === id);
        if (read.status === 'product') {
            const product = byId(read.id);
            if (product) moveFlow(product);
            return;
        }
        if (read.status === 'trashed') {
            feedback(refusalText('trash', byId(read.id)?.sku), 1500);
            return;
        }
        if (read.status === 'choose') {
            choose(read.candidates, (ref) => { const product = byId(ref.id); if (product) moveFlow(product); });
            return;
        }
        if (read.status === 'other') {
            feedback(`${isText(data, read.ref)} Scansiona un prodotto.`, 2000);
            return;
        }

        // Debounce error feedback by 400ms
        const timeout = setTimeout(() => {
            soundService.playBlockingError();
            feedback(`Prodotto non trovato: ${data}`, 2000);
        }, 400);
        setErrorTimeoutRef(timeout);
    };

    const resetFlow = () => {
        setStep('scan_location');
        setTarget(null);
        setScannedCount(0);
        setLastScannedProduct(null);
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Spostamento Rapido</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {step === 'scan_location' ? (
                    <View style={styles.stepContainer}>
                        <AppIcon name="location-on" size={64} color={t.colors.accentInk} style={{ marginBottom: 16 }} />
                        <Text style={styles.stepTitle}>Fase 1: Scannerizza Posizione</Text>
                        <Text style={styles.stepDescription}>
                            Inquadra il QR della posizione o scaffale dove vuoi spostare la merce.
                        </Text>

                        <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                            <Text style={styles.scanButtonText}>Scansiona Posizione</Text>
                        </Pressable>

                        {/* Manual Selection Fallback */}
                        <Text style={styles.divider}>Oppure seleziona</Text>
                        <View style={styles.locationsGrid}>
                            {locations.map(loc => (
                                <Pressable
                                    key={loc.id}
                                    style={styles.locationChip}
                                    onPress={() => checkCapacityAndSetLocation(loc)}
                                >
                                    <View style={[styles.locationDot, { backgroundColor: loc.color }]} />
                                    <Text style={styles.locationChipText}>{loc.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.stepContainer}>
                        <View style={styles.targetCard}>
                            <Text style={styles.targetLabel}>Destinazione Attuale:</Text>
                            <Text style={styles.targetValue}>{targetLocation?.label}</Text>
                            {targetLocation ? <TargetFill target={targetLocation} products={latestProducts()} shelves={shelves} /> : null}
                            <Pressable onPress={resetFlow} style={styles.changeTargetButton}>
                                <Text style={styles.changeTargetText}>Cambia</Text>
                            </Pressable>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statBox}>
                                <Text style={styles.statValue}>{scannedCount}</Text>
                                <Text style={styles.statLabel}>Spostati</Text>
                            </View>
                        </View>

                        {lastScannedProduct && (
                            <View style={styles.lastActionCard}>
                                <AppIcon name="check-circle" size={24} color={t.colors.success} />
                                <Text style={styles.lastActionText}>
                                    Spostato: <Text style={{ fontWeight: 'bold' }}>{lastScannedProduct}</Text>
                                </Text>
                            </View>
                        )}

                        <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                            <Text style={styles.scanButtonText}>Scansiona Prodotto</Text>
                        </Pressable>
                    </View>
                )}

            </ScrollView>

            {load.sheet}
            {/* Code Scanner Modal */}
            {showScanner && (
                <View style={StyleSheet.absoluteFill}>
                    <BarcodeScanner
                        onScan={handleBarCodeScanned}
                        onClose={() => setShowScanner(false)}
                        delay={500}
                    />
                    {feedbackMessage && (
                        <View style={styles.feedbackOverlay}>
                            <AppIcon
                                name={feedbackMessage.includes('non trovato') ? 'error-outline' : 'check-circle'}
                                size={48}
                                color={t.colors.onData}
                            />
                            <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                        </View>
                    )}
                </View>
            )}
        </SafeAreaView>
    );
}

/** Riempimento della destinazione (S3): la barra e lo spazio libero di uno scaffale con limiti, i pezzi di una
 *  posizione con capienza; si aggiorna a ogni articolo. Niente se la destinazione non ha limiti. */
function TargetFill({ target, products, shelves }: { target: Target; products: Product[]; shelves: readonly Shelf[] }) {
    const styles = useStyles();
    const shelf = target.shelfId ? shelves.find((s) => s.id === target.shelfId) : undefined;
    if (shelf) {
        const now = shelfLoad(shelf, products);
        const fill = fillLevel(shelf, now);
        if (!fill) return null;
        return (
            <View style={styles.fillBox}>
                <ShelfFill fill={fill} name={shelf.name} />
                <Text style={styles.fillText}>{freeText(shelf, now)}</Text>
            </View>
        );
    }
    const cap = target.location.capacity;
    const max = cap && cap > 0 ? Math.floor(cap) : 0;
    const fill = max > 0 ? fillLevel({ maxPieces: max }, placeLoad(target.location.id, products)) : null;
    return fill ? <View style={styles.fillBox}><ShelfFill fill={fill} name={target.location.label} /></View> : null;
}

const useStyles = makeStyles((t) => ({
    fillBox: {
        alignSelf: 'stretch',
        marginBottom: 8,
    },
    fillText: {
        ...t.typography.caption,
        marginTop: 4,
        textAlign: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        ...t.typography.cardTitle, // Fallback
        fontSize: 18,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    stepContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
    },
    stepTitle: {
        ...t.typography.cardTitle, // Fallback
        fontSize: 24,
        marginBottom: 8,
        textAlign: 'center',
    },
    stepDescription: {
        ...t.typography.body,
        textAlign: 'center',
        color: t.colors.textSecondary,
        marginBottom: 32,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.button,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: t.radius.button,
        overflow: 'hidden',
        ...t.shadows.button,
        marginBottom: 24,
    },
    scanButtonText: {
        color: t.colors.onButton,
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    divider: {
        ...t.typography.sectionHeader,
        marginBottom: 16,
    },
    locationsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    // Pillole delle posizioni come nella tela: fondo e testo della pillola, pallino del colore della posizione
    locationChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: t.radius.chip,
        borderWidth: 1,
        borderColor: t.colors.chipBorder,
        backgroundColor: t.colors.chip,
    },
    locationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    locationChipText: {
        fontWeight: '500',
        fontSize: 14,
        color: t.colors.chipText,
    },
    targetCard: {
        ...cardSurface(t),
        width: '100%',
        padding: 16,
        alignItems: 'center',
        marginBottom: 24,
    },
    targetLabel: {
        ...t.typography.caption,
        color: t.colors.textSecondary,
        marginBottom: 4,
    },
    targetValue: {
        ...t.typography.cardValue, // Fallback
        fontSize: 32,
        color: t.colors.accentInk,
        marginBottom: 8,
    },
    changeTargetButton: {
        padding: 4,
    },
    changeTargetText: {
        color: t.colors.textSecondary,
        textDecorationLine: 'underline',
    },
    statsContainer: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: t.colors.surface,
        padding: 20,
        borderRadius: t.radius.full, // Fixed
        width: 120,
        height: 120,
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: t.colors.success,
    },
    statValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: t.colors.textPrimary,
    },
    statLabel: {
        fontSize: 14,
        color: t.colors.textSecondary,
    },
    lastActionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.successSurface,
        padding: 12,
        borderRadius: t.radius.tile,
        marginBottom: 24,
        width: '100%',
    },
    lastActionText: {
        marginLeft: 8,
        color: t.colors.onSuccessSurface,
        flex: 1,
    },
    feedbackOverlay: {
        position: 'absolute',
        top: '50%',
        left: '20%',
        right: '20%',
        backgroundColor: withAlpha(t.colors.shadow, 0.8),
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    feedbackText: {
        color: t.colors.onData,
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        textAlign: 'center',
    }
}));
