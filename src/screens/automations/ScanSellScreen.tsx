// FurInventory Pro - Scan to Sell Automation
import React, { useState } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { soundService } from '../../../services/SoundService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { formatPrice } from '../../../utils/price';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { formatNumberInput, parseNumber } from '../../../utils/number';

export default function ScanSellScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, sellProduct, getProductBySku } = useInventory();

    const [scannedCount, setScannedCount] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [lastSoldProduct, setLastSoldProduct] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const [priceInput, setPriceInput] = useState('');
    const [errorTimeoutRef, setErrorTimeoutRef] = React.useState<number | null>(null);

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        // Clear pending error if any
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Find product
        let product = products.find(p => p.id === data);
        if (!product) {
            product = getProductBySku(data);
        }

        if (product) {
            setShowScanner(false);
            if (product.status === 'sold') {
                Alert.alert('Info', 'Questo prodotto risulta già venduto.');
                return;
            }
            if (product.deletedAt) {
                Alert.alert('Info', 'Questo prodotto è nel cestino: ripristinalo da Impostazioni › Cestino.');
                return;
            }

            // Open price confirmation modal
            setPendingProduct(product);
            setPriceInput(formatNumberInput(product.sellPrice)); // «3800,5»: si rilegge con parseNumber
            setShowPriceModal(true);
        } else {
            // Debounce error for 400ms
            const timeout = setTimeout(() => {
                setShowScanner(false);
                soundService.playBlockingError();
                Alert.alert(
                    'Errore', 
                    'Prodotto non trovato.',
                    [{ text: 'OK', onPress: () => setErrorTimeoutRef(null) }]
                );
            }, 400);
            setErrorTimeoutRef(timeout);
        }
    };

    const confirmSale = () => {
        if (!pendingProduct) return;

        const finalPrice = parseNumber(priceInput);
        if (!sellProduct(pendingProduct.id, finalPrice)) {
            setShowPriceModal(false);
            setPendingProduct(null);
            Alert.alert('Non venduto', `${pendingProduct.sku} è nel cestino o risulta già venduto.`);
            return;
        }
        // Senza prezzo scritto vale quello di listino (P25: lo schermo scriveva «0 €»)
        const soldPrice = finalPrice ?? pendingProduct.sellPrice ?? 0;

        setScannedCount(c => c + 1);
        setTotalRevenue(r => r + soldPrice);
        setLastSoldProduct(`${pendingProduct.sku} - ${formatPrice(soldPrice)}`);

        soundService.playSuccess();

        setShowPriceModal(false);
        setPendingProduct(null);
        setPriceInput('');

        // Auto-reopen scanner for next sale
        setTimeout(() => setShowScanner(true), 500);
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Vendita Flash</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{scannedCount}</Text>
                        <Text style={styles.statLabel}>Capi Venduti</Text>
                    </View>
                    <View style={[styles.statBox, { borderColor: t.colors.accent }]}>
                        <Text style={[styles.statValue, { color: t.colors.statNumber }]}>
                            {formatPrice(totalRevenue)}
                        </Text>
                        <Text style={styles.statLabel}>Totale</Text>
                    </View>
                </View>

                {lastSoldProduct && (
                    <View style={styles.lastActionCard}>
                        <AppIcon name="check-circle" size={24} color={t.colors.success} />
                        <Text style={styles.lastActionText}>
                            Venduto: <Text style={{ fontWeight: 'bold' }}>{lastSoldProduct}</Text>
                        </Text>
                    </View>
                )}

                <View style={styles.actionContainer}>
                    <AppIcon name="shopping-cart-checkout" size={64} color={t.colors.success} style={{ marginBottom: 16 }} />
                    <Text style={styles.instructions}>
                        Scansiona i prodotti in uscita per segnarli come VENDUTI e registrare il prezzo finale.
                    </Text>

                    <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                        <Text style={styles.scanButtonText}>Scansiona Prodotto</Text>
                    </Pressable>
                </View>

            </ScrollView>

            {/* Price Confirmation Modal */}
            <Modal
                visible={showPriceModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowPriceModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowPriceModal(false)}>
                    <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Conferma Vendita</Text>

                        {pendingProduct && (
                            <View style={styles.productInfo}>
                                <Text style={styles.productSku}>{pendingProduct.sku}</Text>
                                <Text style={styles.productType}>{pendingProduct.furType}</Text>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Prezzo Finale (€)</Text>
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
                            <Text style={styles.confirmButtonText}>CONFERMA VENDITA</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Code Scanner Modal */}
            {showScanner && (
                <View style={StyleSheet.absoluteFill}>
                    <BarcodeScanner
                        onScan={handleBarCodeScanned}
                        onClose={() => setShowScanner(false)}
                    />
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
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
        marginTop: 16,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: t.colors.tile,
        padding: 16,
        borderRadius: t.radius.tile,
        minWidth: 140,
        borderWidth: 1,
        borderColor: t.colors.success,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: t.colors.success,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: t.colors.textSecondary,
        textTransform: 'uppercase',
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
    actionContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    instructions: {
        ...t.typography.body,
        textAlign: 'center',
        color: t.colors.textSecondary,
        marginBottom: 32,
        maxWidth: '80%',
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
    },
    scanButtonText: {
        color: t.colors.onButton,
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: t.colors.scrimStrong,
        justifyContent: 'center',
        padding: 20,
    },
    // Finestra sopra il velo: fondo opaco
    modalContent: {
        backgroundColor: t.colors.backgroundSecondary,
        borderRadius: t.radius.card,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: 24,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: t.colors.textPrimary,
        marginBottom: 20,
    },
    productInfo: {
        alignItems: 'center',
        marginBottom: 24,
    },
    productSku: {
        fontSize: 24,
        fontWeight: 'bold',
        color: t.colors.accentInk,
    },
    productType: {
        fontSize: 16,
        color: t.colors.textSecondary,
    },
    inputLabel: {
        fontSize: 14,
        color: t.colors.textSecondary,
        alignSelf: 'flex-start',
        marginBottom: 8,
        marginLeft: 4,
    },
    priceInput: {
        width: '100%',
        backgroundColor: t.colors.input,
        borderRadius: t.radius.input,
        padding: 16,
        fontSize: 24,
        color: t.colors.inputText,
        textAlign: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: t.colors.inputBorder,
    },
    confirmButton: {
        width: '100%',
        backgroundColor: t.colors.button,
        borderRadius: t.radius.button,
        padding: 16,
        alignItems: 'center',
        overflow: 'hidden',
        ...t.shadows.button,
    },
    confirmButtonText: {
        color: t.colors.onButton,
        fontSize: 16,
        fontWeight: 'bold',
    },
}));
