// FurInventory Pro - Stock Audit Automation
// ESE (ticket 29): un intruso riletto resta intruso (AU-V08); tutte le posizioni, con la ricerca oltre 6 (AU-V09);
// dall'Azione rapida di una posizione l'Audit parte da lì (`locationId`, AU-N17).
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import { useLocations, Location } from '../../../contexts/LocationsContext';
import { useProductKind } from '../../../hooks/useProductKind';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { useCodeReader } from '../../../hooks/useCodeReader';
import type { PlaceRead } from '../../../utils/codes';
import type { Product } from '../../../types';
import { soundService } from '../../../services/SoundService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { qtyAt } from '../../../utils/stock';
import { moveOf, refusalText } from '../../../utils/inventoryOps';

type AuditStatus = 'missing' | 'found' | 'intruder';

/** Oltre queste posizioni compare la ricerca (con il campionario di 6 non cambia nulla). */
const SEARCH_FROM = 7;
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLocaleLowerCase();

interface AuditItem {
    id: string;
    sku: string;
    furType: string;
    libraryId?: string;
    status: AuditStatus;
}

export default function AuditScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, moveProduct } = useInventory();
    const { readProduct, readPlace, placeOf, choose, isText, shelfNote } = useCodeReader();
    const { locations } = useLocations();
    const kindOf = useProductKind();

    const [step, setStep] = useState<'scan_location' | 'audit_loop'>('scan_location');
    const [targetLocation, setTargetLocation] = useState<Location | null>(null);
    const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
    const [showScanner, setShowScanner] = useState(false);
    const [query, setQuery] = useState('');

    // Tutte le posizioni (AU-V09: prima solo le prime 6, le altre irraggiungibili sul web), con la ricerca se sono tante
    const manyLocations = locations.length >= SEARCH_FROM;
    const shownLocations = manyLocations && query.trim()
        ? locations.filter((l) => fold(l.label).includes(fold(query)))
        : locations;

    // Derived stats
    const stats = useMemo(() => ({
        total: auditItems.length,
        found: auditItems.filter(i => i.status === 'found').length,
        missing: auditItems.filter(i => i.status === 'missing').length,
        intruders: auditItems.filter(i => i.status === 'intruder').length,
    }), [auditItems]);

    // Avanzamento sui soli capi attesi: gli intrusi non abbassano la percentuale (P22)
    const expected = stats.total - stats.intruders;
    const progress = expected > 0 ? stats.found / expected : 0;

    const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
        setShowScanner(false);
        if (step === 'scan_location') {
            handleLocationScan(data);
        } else {
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
            Alert.alert('Errore', 'Posizione non trovata.');
            return;
        }
        if (place.status === 'location' && place.shelfId) {
            Alert.alert('Scaffale', shelfNote(place.shelfId), [{ text: 'OK', onPress: () => startAudit(loc) }]);
            return;
        }
        startAudit(loc);
    };

    const startAudit = (loc: Location) => {
        setTargetLocation(loc);

        // Attesi: ciò che ha giacenza qui (pezzi unici disponibili; articoli a quantità con quantità > 0, M03)
        const expected = products
            .filter(p => qtyAt(p, loc.id) > 0)
            .map(p => ({
                id: p.id,
                sku: p.sku,
                furType: p.furType,
                libraryId: p.libraryId,
                status: 'missing' as AuditStatus
            }));

        setAuditItems(expected);
        setStep('audit_loop');
    };

    // Dall'Azione rapida di una posizione (AU-N17): l'Audit parte da quella posizione, una volta, a dati caricati
    const { locationId } = useLocalSearchParams<{ locationId?: string }>();
    const autoStarted = useRef(false);
    useEffect(() => {
        if (autoStarted.current || !locationId || step !== 'scan_location' || products.length === 0) return;
        const loc = locations.find((l) => l.id === locationId);
        if (!loc) return;
        autoStarted.current = true;
        startAudit(loc);
    }, [locationId, locations, products]);

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    // Prodotto letto (o scelto tra più prodotti con lo stesso codice): atteso qui → trovato, altrimenti intruso
    const auditProduct = (product: Product) => {
        const index = auditItems.findIndex(i => i.id === product.id);

        if (index !== -1) {
            // FOUND EXPECTED ITEM
            if (auditItems[index].status === 'found') {
                Alert.alert('Info', 'Prodotto già scansionato.');
                return;
            }
            // Intruso già in elenco: resta intruso (AU-V08: prima diventava «trovato» e la percentuale saliva)
            if (auditItems[index].status === 'intruder') {
                Alert.alert('Info', `${product.sku} è già segnato come intruso.`);
                return;
            }

            const newItems = [...auditItems];
            newItems[index].status = 'found';
            setAuditItems(newItems);
            Vibration.vibrate();

            // Auto-reopen scanner
            setTimeout(() => setShowScanner(true), 1000);

        } else {
            // INTRUDER: Known product but wrong location
            Alert.alert(
                '⚠️ Intruso Rilevato!',
                `Il prodotto ${product.sku} risulta in "${locations.find(l => l.id === product.location)?.label ?? product.location}".\nLo hai trovato qui.`,
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
                                // «spostato» in cronologia (D15); un rifiuto (es. articolo esaurito) si dice (M04)
                                if (!moveProduct(product.id, targetLocation.id)) {
                                    const refused = moveOf(product, targetLocation.id, '');
                                    Alert.alert('Non spostato', refusalText(refused.ok ? 'not_allowed' : refused.reason, product.sku));
                                    return;
                                }
                                addIntruder(product);
                                Alert.alert('Spostato', 'Posizione aggiornata.');
                            }
                        }
                    }
                ]
            );
        }
    };

    const handleProductScan = (data: string) => {
        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Lettore unico (COD): link GS1, SKU senza maiuscole, cestino, più prodotti con lo stesso codice
        const read = readProduct(data);
        // Safety check: is it a location (or a shelf, a category)?
        if (read.status === 'other') {
            Alert.alert('Attenzione', read.ref.kind === 'location'
                ? 'Hai scansionato una Posizione. Scansiona un prodotto per l\'audit.'
                : `${isText(data, read.ref)} Scansiona un prodotto per l'audit.`);
            return;
        }
        const byId = (id: string) => products.find((p) => p.id === id);
        if (read.status === 'trashed') {
            Alert.alert('Nel cestino', `${byId(read.id)?.sku ?? 'Il prodotto'} è nel cestino: ripristinalo da Impostazioni › Cestino.`);
            return;
        }
        if (read.status === 'choose') {
            choose(read.candidates, (ref) => { const product = byId(ref.id); if (product) auditProduct(product); });
            return;
        }
        const product = read.status === 'product' ? byId(read.id) : undefined;
        if (product) {
            auditProduct(product);
            return;
        }

        // Debounce error
        const timeout = setTimeout(() => {
            soundService.playBlockingError();
            Alert.alert('Errore', 'Prodotto sconosciuto (non in database).', [{ text: 'OK', onPress: () => setErrorTimeoutRef(null) }]);
        }, 400);
        setErrorTimeoutRef(timeout);
    };

    const addIntruder = (product: any) => {
        setAuditItems(prev => [
            {
                id: product.id,
                sku: product.sku,
                furType: product.furType,
                libraryId: product.libraryId,
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
                    {/* C1: categoria e tipo di pelle */}
                    {!!kindOf(item).line && <Text style={styles.itemType}>{kindOf(item).line}</Text>}
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
                <ScrollView contentContainerStyle={styles.centerContent} keyboardShouldPersistTaps="handled">
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

                    {/* Quick Select: tutte le posizioni (AU-V09) */}
                    <Text style={styles.divider}>Oppure scegli la posizione</Text>
                    {manyLocations && (
                        <TextInput
                            style={styles.searchInput}
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Cerca posizione"
                            placeholderTextColor={t.colors.placeholder}
                        />
                    )}
                    <View style={styles.locationsGrid}>
                        {shownLocations.map(loc => (
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
                    {shownLocations.length === 0 && (
                        <Text style={styles.noMatch}>Nessuna posizione con «{query.trim()}».</Text>
                    )}
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    <View style={styles.auditHeader}>
                        <View>
                            <Text style={styles.locationLabel}>AUDIT IN CORSO</Text>
                            <Text style={styles.locationTitle}>{targetLocation?.label}</Text>
                        </View>
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressText}>
                                {Math.round(progress * 100)}%
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
    // Si scorre quando le posizioni sono tante (AU-V09)
    centerContent: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    searchInput: {
        alignSelf: 'stretch',
        minHeight: t.input.height,
        backgroundColor: t.colors.input,
        borderRadius: t.radius.input,
        borderWidth: 1,
        borderColor: t.colors.inputBorder,
        paddingHorizontal: 14,
        fontSize: 15,
        color: t.colors.inputText,
        marginBottom: 12,
    },
    noMatch: {
        fontSize: 14,
        color: t.colors.textSecondary,
        marginTop: 8,
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
