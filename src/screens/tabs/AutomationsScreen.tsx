// FurInventory Pro - Automations Settings Hub (with Custom Automations)
import React from 'react';
import { View, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useAutomations } from '../../../contexts/AutomationsContext';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

const BUILTIN_AUTOMATIONS = [
    {
        id: 'batch_move',
        title: 'Spostamento Rapido',
        description: 'Sposta velocemente una serie di prodotti in una nuova posizione.',
        icon: 'move-to-inbox',
        color: '#3B82F6',
        route: '/automations/batch-move'
    },
    {
        id: 'scan_sell',
        title: 'Vendita Flash',
        description: 'Segna come venduti i prodotti scansionati in sequenza.',
        icon: 'shopping-cart-checkout',
        color: '#10B981',
        route: '/automations/scan-sell'
    },
    {
        id: 'audit',
        title: 'Audit Posizione',
        description: 'Verifica la corrispondenza tra fisico e digitale di uno scaffale.',
        icon: 'fact-check',
        color: '#F59E0B',
        route: '/automations/audit'
    },
    {
        id: 'tagging',
        title: 'Tagging di Massa',
        description: 'Applica note o etichette a un gruppo di prodotti.',
        icon: 'label',
        color: '#8B5CF6',
        route: '/automations/quick-tag'
    },
];

export default function AutomationsScreen() {
    const t = useTheme();
    const styles = useStyles();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { automations, deleteAutomation } = useAutomations();

    const handleStartBuiltin = (automation: typeof BUILTIN_AUTOMATIONS[0]) => {
        if (automation.route) {
            router.push(automation.route as any);
        } else {
            Alert.alert('In Arrivo', 'Questa automazione sarà disponibile presto!');
        }
    };

    const handleOpenCustom = (id: string) => {
        router.push({ pathname: '/automations/automation-flow', params: { id } } as any);
    };

    const handleDeleteCustom = (id: string, name: string) => {
        Alert.alert('Elimina', `Eliminare "${name}"?`, [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Elimina', style: 'destructive', onPress: () => deleteAutomation(id) },
        ]);
    };

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Centro Automazioni</Text>
                    <Pressable onPress={() => router.push('/scanner' as any)} style={styles.scannerButton}>
                        <AppIcon name="qr-code-scanner" size={24} color={t.colors.accentInk} />
                    </Pressable>
                </View>

                {/* ── Custom Automations ── */}
                <View style={styles.content}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>LE MIE AUTOMAZIONI</Text>
                        <Pressable
                            onPress={() => router.push('/settings/automation-builder' as any)}
                            style={styles.createButton}
                        >
                            <AppIcon name="add" size={20} color="#FFF" />
                            <Text style={styles.createButtonText}>Crea Nuova</Text>
                        </Pressable>
                    </View>

                    {automations.length === 0 ? (
                        <Pressable
                            style={styles.emptyCard}
                            onPress={() => router.push('/settings/automation-builder' as any)}
                        >
                            <AppIcon name="auto-awesome" size={40} color={t.colors.textSecondary} />
                            <Text style={styles.emptyTitle}>Nessuna automazione personalizzata</Text>
                            <Text style={styles.emptyHint}>
                                Crea la tua prima automazione per velocizzare il lavoro.
                            </Text>
                        </Pressable>
                    ) : (
                        automations.map(auto => (
                            <Pressable
                                key={auto.id}
                                style={styles.card}
                                onPress={() => handleOpenCustom(auto.id)}
                                onLongPress={() => handleDeleteCustom(auto.id, auto.name)}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: withAlpha(auto.color, 0.125) }]}>
                                    <AppIcon name={auto.icon as any} size={32} color={auto.color} />
                                </View>
                                <View style={styles.cardContent}>
                                    <Text style={styles.cardTitle}>{auto.name}</Text>
                                    <Text style={styles.cardDescription}>
                                        {auto.steps.length} step · {auto.usageCount} utilizzi
                                    </Text>
                                </View>
                                <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
                            </Pressable>
                        ))
                    )}
                </View>

                {/* ── Built-in Templates ── */}
                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>TEMPLATE PREDEFINITI</Text>
                    <Text style={styles.sectionDescription}>
                        Automazioni pronte all'uso per le operazioni più comuni.
                    </Text>

                    {BUILTIN_AUTOMATIONS.map((auto) => (
                        <Pressable
                            key={auto.id}
                            style={styles.card}
                            onPress={() => handleStartBuiltin(auto)}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: withAlpha(auto.color, 0.125) }]}>
                                <AppIcon name={auto.icon as any} size={32} color={auto.color} />
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={styles.cardTitle}>{auto.title}</Text>
                                <Text style={styles.cardDescription}>{auto.description}</Text>
                            </View>
                            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
                        </Pressable>
                    ))}
                </View>

                {/* Pro Tip Section */}
                <View style={styles.proTip}>
                    <AppIcon name="lightbulb" size={24} color={t.colors.warning} />
                    <View style={styles.proTipContent}>
                        <Text style={styles.proTipTitle}>Lo sapevi?</Text>
                        <Text style={styles.proTipText}>
                            Ogni automazione ha un QR code unico. Stampalo e scansionalo per avviarla istantaneamente!
                        </Text>
                    </View>
                </View>
            </ScrollView>
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
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    scannerButton: {
        padding: 8,
        backgroundColor: withAlpha(t.colors.accent, 0.082),
        borderRadius: t.radius.medium,
    },
    headerTitle: {
        ...t.typography.h2 || { fontSize: 24, fontWeight: '700' },
        fontSize: 20,
        color: t.colors.textPrimary,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: t.colors.textSecondary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: t.colors.button,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: t.radius.full,
    },
    createButtonText: {
        color: t.colors.onButton,
        fontWeight: '700',
        fontSize: 13,
    },
    content: {
        padding: t.spacing.screenPadding,
    },
    sectionDescription: {
        ...t.typography.body,
        color: t.colors.textSecondary,
        marginBottom: 16,
    },
    emptyCard: {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.large,
        padding: 32,
        alignItems: 'center',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: t.colors.dash,
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: t.colors.textSecondary,
        marginTop: 12,
    },
    emptyHint: {
        fontSize: 13,
        color: t.colors.textSecondary,
        marginTop: 6,
        textAlign: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.colors.surface,
        padding: 16,
        borderRadius: t.radius.large,
        marginBottom: 12,
        shadowColor: t.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: t.colors.border,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        ...t.typography.h3 || { fontSize: 18, fontWeight: '600' },
        fontSize: 18,
        marginBottom: 4,
        color: t.colors.textPrimary,
    },
    cardDescription: {
        ...t.typography.caption,
        fontSize: 14,
        color: t.colors.textSecondary,
        lineHeight: 20,
    },
    proTip: {
        flexDirection: 'row',
        backgroundColor: t.colors.warningSurface,
        marginHorizontal: t.spacing.screenPadding,
        padding: 16,
        borderRadius: t.radius.medium,
        borderWidth: 1,
        borderColor: t.colors.warningSurfaceBorder,
        alignItems: 'flex-start',
    },
    proTipContent: {
        marginLeft: 12,
        flex: 1,
    },
    proTipTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: t.colors.onWarningSurface,
        marginBottom: 4,
    },
    proTipText: {
        fontSize: 13,
        color: '#92400E',
        lineHeight: 18,
    },
}));
