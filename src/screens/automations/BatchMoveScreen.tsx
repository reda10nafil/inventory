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
import { qtyAt } from '../../../utils/stock';
import { moveOf, refusalText } from '../../../utils/inventoryOps';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

type Step = 'scan_location' | 'scan_products';

export default function BatchMoveScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, moveProduct } = useInventory();
    const { readProduct, readPlace, placeOf, choose, isText, shelfNote } = useCodeReader();
    const { locations, getLocation, getNextLocation } = useLocations();
    const kindOf = useProductKind();

    const [step, setStep] = useState<Step>('scan_location');
    const [targetLocation, setTargetLocation] = useState<Location | null>(null);
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

    // Lettore unico (COD): codice, id o nome di una posizione; uno scaffale vale la sua posizione, con l'avviso (AU-V14)
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
        if (place.status === 'location' && place.shelfId) {
            Alert.alert('Scaffale', shelfNote(place.shelfId), [{ text: 'OK', onPress: () => checkCapacityAndSetLocation(loc) }]);
            return;
        }
        checkCapacityAndSetLocation(loc);
    };

    const checkCapacityAndSetLocation = (loc: Location) => {
        // Calculate current occupancy
        // Prodotti che occupano davvero la posizione: pezzi unici disponibili, articoli a quantità con giacenza (M03)
        const currentItems = products.filter(p => qtyAt(p, loc.id) > 0).length;
        const capacity = loc.capacity || 9999; // Default infinite if not set

        if (currentItems >= capacity) {
            // Logic for Smart Suggestion
            const nextLoc = getNextLocation(loc.id);

            Alert.alert(
                '⚠️ Posizione Piena!',
                `La posizione "${loc.label}" ha raggiunto la capacità (${currentItems}/${capacity}).\n\nVuoi usare invece "${nextLoc?.label}" che è la più vicina?`,
                [
                    {
                        text: `Usa ${loc.label} comunque`,
                        style: 'cancel',
                        onPress: () => confirmLocation(loc)
                    },
                    nextLoc ? {
                        text: `Sì, usa ${nextLoc.label}`,
                        onPress: () => {
                            confirmLocation(nextLoc);
                        }
                    } : { text: 'OK', style: 'cancel' }
                ]
            );
        } else {
            confirmLocation(loc);
        }
    };

    const confirmLocation = (loc: Location) => {
        setTargetLocation(loc);
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

    // Cambio di destinazione dalla lettura di una posizione (o di uno scaffale, che vale la sua posizione)
    const askChange = (place: PlaceRead) => {
        const potentialLoc = place.status === 'location' ? locations.find((l) => l.id === place.id) : undefined;
        if (!potentialLoc) return;
        setShowScanner(false); // Pause scanner immediately to avoid spam
        Vibration.vibrate(100);
        const note = place.status === 'location' && place.shelfId ? `\n\n${shelfNote(place.shelfId)}` : '';
        Alert.alert(
            'Cambio Destinazione',
            `Vuoi cambiare la destinazione a "${potentialLoc.label}"?${note}`,
            [
                { text: 'No', style: 'cancel', onPress: () => setShowScanner(true) },
                {
                    text: 'Sì',
                    onPress: () => {
                        checkCapacityAndSetLocation(potentialLoc);
                    }
                }
            ]
        );
    };

    // Sposta il prodotto letto (o scelto tra più prodotti con lo stesso codice) nella destinazione
    const moveFlow = (product: Product) => {
        if (!targetLocation) return;
        if (product.location === targetLocation.id) {
            feedback(`${product.sku} già qui!`, 1000);
            return;
        }

        // Spostamento vero: in cronologia «spostato», non «modificato» (D15)
        if (!moveProduct(product.id, targetLocation.id)) {
            const refused = moveOf(product, targetLocation.id, '');
            feedback(refusalText(refused.ok ? 'not_allowed' : refused.reason, product.sku), 1500);
            return;
        }

        setScannedCount(c => c + 1);
        setLastScannedProduct(kindOf(product).line ? `${product.sku} (${kindOf(product).line})` : product.sku);
        playSuccessSound();

        // Show overlay feedback
        feedback(`${product.sku} Spostato!`, 1000);
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
        setTargetLocation(null);
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

const useStyles = makeStyles((t) => ({
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
