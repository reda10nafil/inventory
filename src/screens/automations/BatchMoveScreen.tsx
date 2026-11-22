// FurInventory Pro - Batch Move Automation
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { soundService } from '../../../services/SoundService';
// import { Audio } from 'expo-av'; // Removed for now to simplify dependencies
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import { useCategories } from '../../../contexts/CategoriesContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

type Step = 'scan_location' | 'scan_products';

export default function BatchMoveScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, moveProduct, getProductBySku } = useInventory();
    const { locations, getLocation, getNextLocation } = useLocations();
    const { labelOf } = useCategories();

    const [step, setStep] = useState<Step>('scan_location');
    const [targetLocation, setTargetLocation] = useState<Location | null>(null);
    const [scannedCount, setScannedCount] = useState(0);
    const [lastScannedProduct, setLastScannedProduct] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

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

    const handleLocationScan = (data: string) => {
        // Try to find location by ID, Label or Barcode
        const loc = locations.find(l => l.id === data || l.label === data || l.barcode === data);

        if (loc) {
            checkCapacityAndSetLocation(loc);
        } else {
            Alert.alert('Errore', 'Posizione non trovata nel database.');
        }
    };

    const checkCapacityAndSetLocation = (loc: Location) => {
        // Calculate current occupancy
        const currentItems = products.filter(p => p.location === loc.id).length;
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

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    const handleProductScan = async (data: string) => {
        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Check if scanned code is actually a Location (to switch target)
        const potentialLoc = locations.find(l => l.id === data || l.barcode === data);
        if (potentialLoc) {
            setShowScanner(false); // Pause scanner immediately to avoid spam
            Vibration.vibrate(100);
            Alert.alert(
                'Cambio Destinazione',
                `Vuoi cambiare la destinazione a "${potentialLoc.label}"?`,
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
            return;
        }

        if (!targetLocation) return;

        // Find product - try ID first, then SKU
        let product = products.find(p => p.id === data);
        if (!product) {
            product = getProductBySku(data);
        }

        if (product) {
            if (product.location === targetLocation.id) {
                setFeedbackMessage(`${product.sku} già qui!`);
                setTimeout(() => setFeedbackMessage(null), 1000);
                return;
            }

            // Spostamento vero: in cronologia «spostato», non «modificato» (D15)
            if (!moveProduct(product.id, targetLocation.id)) {
                setFeedbackMessage(`${product.sku} è nel cestino`);
                setTimeout(() => setFeedbackMessage(null), 1500);
                return;
            }

            setScannedCount(c => c + 1);
            setLastScannedProduct(`${product.sku} (${labelOf(product.furType)})`);
            playSuccessSound();

            // Show overlay feedback
            setFeedbackMessage(`${product.sku} Spostato!`);
            setTimeout(() => setFeedbackMessage(null), 1000);

        } else {
            // Debounce error feedback by 400ms
            const timeout = setTimeout(() => {
                soundService.playBlockingError();
                setFeedbackMessage(`Prodotto non trovato: ${data}`);
                setTimeout(() => setFeedbackMessage(null), 2000);
            }, 400);
            setErrorTimeoutRef(timeout);
        }
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
