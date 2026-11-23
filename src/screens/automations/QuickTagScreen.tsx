// FurInventory Pro - Quick Tag Automation
import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Vibration, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useInventory } from '../../../contexts/InventoryContext';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { useCodeReader } from '../../../hooks/useCodeReader';
import type { Product } from '../../../types';
import { notesWithTag } from '../../../utils/automationRun';
import { soundService } from '../../../services/SoundService';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';

const COMMON_TAGS = [
    { label: 'Da Pulire', icon: 'cleaning-services', color: '#3B82F6' },
    { label: 'Riparare', icon: 'build', color: '#F59E0B' },
    { label: 'Riservato', icon: 'lock', color: '#EF4444' },
    { label: 'Vetrina', icon: 'star', color: '#D4AF37' },
];

export default function QuickTagScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { products, updateProduct, latestProduct } = useInventory();
    const { readProduct, choose, isText } = useCodeReader();

    const [step, setStep] = useState<'select_tag' | 'scan_loop'>('select_tag');
    const [activeTag, setActiveTag] = useState('');
    const [taggedCount, setTaggedCount] = useState(0);
    const [lastTaggedProduct, setLastTaggedProduct] = useState<string | null>(null);
    const [showScanner, setShowScanner] = useState(false);
    const [customTag, setCustomTag] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const handleStartTagging = (tag: string) => {
        if (!tag.trim()) {
            Alert.alert('Errore', 'Inserisci un tag valido.');
            return;
        }
        setActiveTag(tag);
        setStep('scan_loop');
    };

    const [errorTimeoutRef, setErrorTimeoutRef] = useState<number | null>(null);

    // Un solo timer per il messaggio sul lettore (COD): con «Scrivi il codice» due letture arrivano a meno di un
    // secondo e il timer della prima cancellava il messaggio della seconda (per esempio il rifiuto del cestino)
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const feedback = (text: string, ms = 1000) => {
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        setFeedbackMessage(text);
        feedbackTimer.current = setTimeout(() => setFeedbackMessage(null), ms);
    };

    // Tag sul prodotto letto (o scelto tra più prodotti con lo stesso codice), sulla copia più recente come
    // nell'esecuzione delle automazioni (ESE); un prodotto nel cestino non si tocca nemmeno qui (AU-V04)
    const tagProduct = (scanned: Product) => {
        const product = latestProduct(scanned.id) ?? scanned;
        if (product.deletedAt) {
            soundService.playBlockingError();
            feedback(`${product.sku} è nel cestino: ripristinalo da Impostazioni › Cestino.`, 2000);
            return;
        }
        // Append tag to technical notes, avoid duplicates
        const newNotes = notesWithTag(product.technicalNotes, activeTag);
        if (newNotes == null) {
            feedback(`${product.sku} già taggato`, 1000);
            return;
        }

        updateProduct(product.id, { technicalNotes: newNotes });

        setTaggedCount(c => c + 1);
        setLastTaggedProduct(`${product.sku}`);
        soundService.playSuccess();

        // Overlay feedback
        feedback(`${product.sku} Taggato!`, 1000);
    };

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        // Continuous scanning — do NOT close scanner
        
        // Clear pending error
        if (errorTimeoutRef) {
            clearTimeout(errorTimeoutRef);
            setErrorTimeoutRef(null);
        }

        // Lettore unico (COD): link GS1, SKU senza maiuscole; un prodotto nel cestino non si tagga
        const read = readProduct(data);
        const byId = (id: string) => products.find((p) => p.id === id);
        if (read.status === 'product') {
            const product = byId(read.id);
            if (product) tagProduct(product);
            return;
        }
        if (read.status === 'trashed') {
            soundService.playBlockingError();
            feedback(`${byId(read.id)?.sku ?? 'Il prodotto'} è nel cestino: ripristinalo da Impostazioni › Cestino.`, 2000);
            return;
        }
        if (read.status === 'choose') {
            choose(read.candidates, (ref) => { const product = byId(ref.id); if (product) tagProduct(product); });
            return;
        }
        if (read.status === 'other') {
            feedback(`${isText(data, read.ref)} Scansiona un prodotto.`, 2000);
            return;
        }

        // Debounce error
        const timeout = setTimeout(() => {
            soundService.playBlockingError();
            feedback(`Non trovato: ${data}`, 2000);
        }, 400);
        setErrorTimeoutRef(timeout);
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Tagging Rapido</Text>
            </View>

            {step === 'select_tag' ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.centerHeader}>
                        <AppIcon name="label" size={64} color={t.colors.info} style={{ marginBottom: 16 }} />
                        <Text style={styles.stepTitle}>Scegli un Tag</Text>
                        <Text style={styles.stepDescription}>
                            Seleziona un'etichetta da applicare a tutti i prodotti che scannerizzerai.
                        </Text>
                    </View>

                    <Text style={styles.sectionLabel}>Tag comuni</Text>
                    <View style={styles.tagsGrid}>
                        {COMMON_TAGS.map(tag => (
                            <Pressable
                                key={tag.label}
                                style={styles.tagCard}
                                onPress={() => handleStartTagging(tag.label)}
                            >
                                <AppIcon name={tag.icon as any} size={32} color={tag.color} />
                                <Text style={styles.tagLabel}>{tag.label}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.sectionLabel}>O scrivi un tag personalizzato</Text>
                    <View style={styles.customTagContainer}>
                        <TextInput
                            style={styles.customInput}
                            placeholder="Es. Collezione 2024"
                            placeholderTextColor={t.colors.placeholder}
                            value={customTag}
                            onChangeText={setCustomTag}
                        />
                        <Pressable
                            style={[styles.goButton, !customTag && { opacity: 0.5 }]}
                            onPress={() => handleStartTagging(customTag)}
                            disabled={!customTag}
                        >
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <AppIcon name="arrow-forward" size={24} color={t.colors.onButton} />
                        </Pressable>
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.content}>
                    <View style={styles.statusCard}>
                        <Text style={styles.statusLabel}>MODALITÀ TAGGING ATTIVA</Text>
                        <View style={styles.activeTagBadge}>
                            <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />
                            <AppIcon name="label" size={20} color={t.colors.chipActiveText} />
                            <Text style={styles.activeTagText}>{activeTag}</Text>
                        </View>
                        <Text style={styles.countText}>{taggedCount} prodotti taggati</Text>
                    </View>

                    {lastTaggedProduct && (
                        <View style={styles.lastActionCard}>
                            <AppIcon name="check-circle" size={24} color={t.colors.success} />
                            <Text style={styles.lastActionText}>
                                Taggato: <Text style={{ fontWeight: 'bold' }}>{lastTaggedProduct}</Text>
                            </Text>
                        </View>
                    )}

                    <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}>
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <AppIcon name="qr-code-scanner" size={32} color={t.colors.onButton} />
                        <Text style={styles.scanButtonText}>Scansiona Prodotto</Text>
                    </Pressable>

                    <Pressable style={styles.stopButton} onPress={() => setStep('select_tag')}>
                        <Text style={styles.stopButtonText}>Termina Sessione</Text>
                    </Pressable>
                </View>
            )}

            {/* Continuous Scanner Modal */}
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
                                name={feedbackMessage.includes('Non trovato') || feedbackMessage.includes('già') ? 'info-outline' : 'check-circle'}
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
        fontSize: 18,
        fontWeight: '600',
        color: t.colors.textPrimary,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    centerHeader: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 16,
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
    },
    sectionLabel: {
        ...t.typography.sectionHeader,
        alignSelf: 'stretch',
        marginBottom: 12,
        marginTop: 12,
        ...(t.section.line ? { borderBottomWidth: 1, borderBottomColor: t.section.line, paddingBottom: 6 } : null),
    },
    tagsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
        marginBottom: 24,
    },
    // Riquadri a scelta: il colore del tag (dato) resta sull'icona
    tagCard: {
        ...tileSurface(t),
        width: '48%',
        padding: 20,
        alignItems: 'center',
    },
    tagLabel: {
        marginTop: 8,
        fontWeight: '600',
        fontSize: 14,
        color: t.colors.textPrimary,
    },
    customTagContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    customInput: {
        flex: 1,
        height: t.input.height,
        backgroundColor: t.colors.input,
        borderRadius: t.radius.input,
        paddingHorizontal: 16,
        fontSize: 16,
        color: t.colors.inputText,
        borderWidth: 1,
        borderColor: t.colors.inputBorder,
    },
    goButton: {
        width: t.input.height,
        height: t.input.height,
        backgroundColor: t.colors.button,
        borderRadius: t.radius.button,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...t.shadows.button,
    },
    statusCard: {
        ...cardSurface(t),
        width: '100%',
        padding: 24,
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 20,
    },
    statusLabel: {
        fontSize: 12,
        color: t.colors.textSecondary,
        marginBottom: 16,
        letterSpacing: 1,
    },
    // Tag attivo: pillola attiva
    activeTagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.chipActive,
        borderWidth: 1,
        borderColor: t.colors.chipActiveBorder,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: t.radius.chip,
        overflow: 'hidden',
        gap: 8,
        marginBottom: 16,
    },
    activeTagText: {
        color: t.colors.chipActiveText,
        fontWeight: 'bold',
        fontSize: 18,
    },
    countText: {
        fontSize: 14,
        color: t.colors.textSecondary,
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
    stopButton: {
        padding: 16,
    },
    stopButtonText: {
        color: t.colors.textSecondary,
        textDecorationLine: 'underline',
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
    },
}));
