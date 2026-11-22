// FurInventory Pro - Stock Audit Automation
import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { soundService } from '../../../services/SoundService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';

type AuditStatus = 'missing' | 'found' | 'intruder';

interface AuditItem {
    id: string;
    sku: string;
    furType: string;
    status: AuditStatus;
}

export default function AuditScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, getProductBySku, updateProduct } = useInventory();
    const { locations } = useLocations();

    const [step, setStep] = useState<'scan_location' | 'audit_loop'>('scan_location');
    const [targetLocation, setTargetLocation] = useState<Location | null>(null);
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [showScanner, setShowScanner] = useState(false);

    // Derived stats
    const stats = useMemo(() => ({
        total: auditItems.length,
        found: auditItems.filter(i => i.status === 'found').length,
        missing: auditItems.filter(i => i.status === 'missing').length,
        intruders: auditItems.filter(i => i.status === 'intruder').length,
    }), [auditItems]);

    const progress = stats.total > 0 ? (stats.found / (stats.total - stats.intruders)) : 0; // Exclude intruders from base total for progress? Or include? Let's keep simple.

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setShowScanner(false);
        if (step === 'scan_location') {
            handleLocationScan(data);
        } else {
            handleProductScan(data);
        }
    };

    const handleLocationScan = (data: string) => {
        const loc = locations.find(l => l.id === data || l.label === data || l.barcode === data);
        if (loc) {
            startAudit(loc);
        } else {
            Alert.alert('Errore', 'Posizione non trovata.');
        }
    };

    const startAudit = (loc: Location) => {
        setTargetLocation(loc);

        // Load expected items
        const expected = products
            .filter(p => !p.deletedAt && p.status === 'available' && p.location === loc.id)
            .map(p => ({
                id: p.id,
                sku: p.sku,
                furType: p.furType,
                status: 'missing' as AuditStatus
            }));

        setAuditItems(expected);
        setStep('audit_loop');
    };

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    const handleProductScan = (data: string) => {
        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Safety check: is it a location?
        const isLocation = locations.some(l => l.id === data || l.barcode === data);
        if (isLocation) {
            Alert.alert('Attenzione', 'Hai scansionato una Posizione. Scansiona un prodotto per l\'audit.');
            return;
        }

        // Check if item corresponds to an expected item
        // Try ID then SKU
        let productFn = (p: any) => p.id === data;
        const byId = auditItems.findIndex(productFn);
        let index = byId;

        if (index === -1) {
            // Try via SKU
            const prod = getProductBySku(data);
            if (prod) {
                index = auditItems.findIndex(i => i.id === prod.id);
            }
        }

        if (index !== -1) {
            // FOUND EXPECTED ITEM
            if (auditItems[index].status === 'found') {
                Alert.alert('Info', 'Prodotto già scansionato.');
                return;
            }

            const newItems = [...auditItems];
            newItems[index].status = 'found';
            setAuditItems(newItems);
            Vibration.vibrate();

            // Auto-reopen scanner
            setTimeout(() => setShowScanner(true), 1000);

        } else {
            // INTRUDER OR NOT FOUND IN DB
            const product = products.find(p => p.id === data) || getProductBySku(data);

            if (product) {
                // Known product but wrong location
                Alert.alert(
                    '⚠️ Intruso Rilevato!',
                    `Il prodotto ${product.sku} risulta in "${product.location}".\nLo hai trovato qui.`,
                    [
                        { text: 'Ignora', style: 'cancel' },
                        {
                            text: 'Aggiungi all\'Audit',
                            onPress: () => {
                                addIntruder(product);
                            }
                        },
                        {
                            text: 'Sposta Qui & Aggiungi',
                            onPress: () => {
                                if (targetLocation) {
                                    updateProduct(product.id, { location: targetLocation.id });
                                    addIntruder(product);
                                    Alert.alert('Spostato', 'Posizione aggiornata.');
                                }
                            }
                        }
                    ]
                );
            } else {
                // Debounce error
                const timeout = setTimeout(() => {
                    soundService.playBlockingError();
                    Alert.alert('Errore', 'Prodotto sconosciuto (non in database).', [{ text: 'OK', onPress: () => setErrorTimeoutRef(null) }]);
                }, 400);
                setErrorTimeoutRef(timeout);
            }
        }
    };

    const addIntruder = (product: any) => {
        setAuditItems(prev => [
            {
                id: product.id,
                sku: product.sku,
                furType: product.furType,
                status: 'intruder'
            },
            ...prev
        ]);
        Vibration.vibrate();
    };

    const renderAuditItem = ({ item }: { item: AuditItem }) => {
        let iconName = 'check-box-outline-blank';
        let color = t.colors.textMuted;

        if (item.status === 'found') {
            iconName = 'check-box';
            color = t.colors.onSuccessSurface;
        } else if (item.status === 'intruder') {
            iconName = 'warning';
            color = t.colors.onWarningSurface;
        }

        return (
            <View style={[styles.itemCard, item.status === 'found' && styles.itemFound, item.status === 'intruder' && styles.itemIntruder]}>
                <View style={styles.itemInfo}>
                    <Text style={[styles.itemSku, { color: item.status === 'missing' ? t.colors.textSecondary : t.colors.textPrimary }]}>
                        {item.sku}
                    </Text>
                    <Text style={styles.itemType}>{item.furType}</Text>
                    {item.status === 'intruder' && (
                        <Text style={styles.intruderLabel}>INTRUSO</Text>
                    )}
                </View>
                <AppIcon name={iconName as any} size={24} color={color} />
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Audit Posizione</Text>
            </View>

            {step === 'scan_location' ? (
                <View style={styles.centerContent}>
                    <AppIcon name="fact-check" size={64} color={t.colors.warning} style={{ marginBottom: 16 }} />
                    <Text style={styles.stepTitle}>Inizia Inventario</Text>
                    <Text style={styles.stepDescription}>
                        Scansiona una posizione per vedere la lista dei prodotti attesi e verificare le discrepanze.
                    </Text>
                    <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                        <Text style={styles.scanButtonText}>Scansiona Posizione</Text>
                    </Pressable>

                    {/* Quick Select */}
                    <Text style={styles.divider}>Posizioni recenti</Text>
                    <View style={styles.locationsGrid}>
                        {locations.slice(0, 6).map(loc => (
                            <Pressable
                                key={loc.id}
                                style={styles.locationChip}
                                onPress={() => startAudit(loc)}
                            >
                                <View style={[styles.locationDot, { backgroundColor: loc.color }]} />
                                <Text style={styles.locationChipText}>{loc.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.auditHeader}>
                        <View>
                            <Text style={styles.locationLabel}>AUDIT IN CORSO</Text>
                            <Text style={styles.locationTitle}>{targetLocation?.label}</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                                {Math.round((stats.found / (stats.total || 1)) * 100)}%
                            </Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <Text style={styles.statDetail}>
                            Trovati: <Text style={{ color: t.colors.success, fontWeight: 'bold' }}>{stats.found}</Text>
                        </Text>
                        <Text style={styles.statDetail}>
                            Mancanti: <Text style={{ color: t.colors.error, fontWeight: 'bold' }}>{stats.missing}</Text>
                        </Text>
                        <Text style={styles.statDetail}>
                            Intrusi: <Text style={{ color: t.colors.warning, fontWeight: 'bold' }}>{stats.intruders}</Text>
                        </Text>
                    </View>

                    <FlatList
                        data={auditItems}
                        renderItem={renderAuditItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                    />

                    <View style={styles.footer}>
                        <Pressable style={styles.scanFab} onPress={() => setShowScanner(true)}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: 32 }} />
                            <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                        </Pressable>
                    </View>
                </View>
            )}

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
        fontSize: 18,
        fontWeight: '600',
        color: t.colors.textPrimary,
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: t.colors.textPrimary,
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 16,
        color: t.colors.textSecondary,
        textAlign: 'center',
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
        marginBottom: 32,
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
    auditHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: t.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    locationLabel: {
        fontSize: 12,
        color: t.colors.textSecondary,
        fontWeight: '600',
    },
    locationTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: t.colors.accentInk,
    },
    progressContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 4,
        borderColor: t.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: t.colors.textPrimary,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    statDetail: {
        fontSize: 14,
        color: t.colors.textSecondary,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    itemCard: {
        ...cardSurface(t),
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    itemFound: {
        backgroundColor: t.colors.successSurface,
        borderColor: 'transparent',
    },
    itemIntruder: {
        backgroundColor: t.colors.warningSurface,
        borderColor: t.colors.warningSurfaceBorder,
    },
    itemInfo: {
        flex: 1,
    },
    itemSku: {
        fontSize: 16,
        fontWeight: '600',
    },
    itemType: {
        fontSize: 14,
        color: t.colors.textSecondary,
    },
    intruderLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: t.colors.onWarningSurface,
        marginTop: 4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        right: 30,
    },
    scanFab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: t.colors.button,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...t.shadows.button,
    },
}));
