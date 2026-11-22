// FurInventory Pro - Share Settings Screen
import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

export default function ShareSettingsScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="arrow-back" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.headerTitle}>Configurazione Condivisione</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: t.spacing.screenPadding,
                    paddingBottom: insets.bottom + 16,
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <AppIcon name="info-outline" size={24} color={t.colors.accentInk} />
                    <Text style={styles.infoText}>
                        Questa funzionalità verrà completata nella prossima versione.{'\n\n'}
                        Potrai personalizzare quali informazioni condividere nelle modalità Cliente e Professionista.
                    </Text>
                </View>

                {/* Preview Card - Cliente */}
                <Text style={styles.sectionTitle}>MODALITÀ CLIENTE</Text>
                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Informazioni condivise:</Text>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Tipo di pelliccia</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Stato (Disponibile/Venduto)</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Posizione</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Misure (lunghezza, larghezza, peso)</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Prezzo di vendita</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Descrizione/Note tecniche</Text>
                    </View>
                    <View style={styles.divider} />
                    <Text style={styles.excludedTitle}>Non condiviso:</Text>
                    <View style={styles.previewItem}>
                        <AppIcon name="cancel" size={20} color={t.colors.textSecondary} />
                        <Text style={[styles.previewText, { color: t.colors.textSecondary }]}>Prezzo di acquisto</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="cancel" size={20} color={t.colors.textSecondary} />
                        <Text style={[styles.previewText, { color: t.colors.textSecondary }]}>Margini</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="cancel" size={20} color={t.colors.textSecondary} />
                        <Text style={[styles.previewText, { color: t.colors.textSecondary }]}>Fornitori</Text>
                    </View>
                </View>

                {/* Preview Card - Professionista */}
                <Text style={styles.sectionTitle}>MODALITÀ PROFESSIONISTA</Text>
                <View style={styles.previewCard}>
                    <Text style={styles.previewTitle}>Informazioni condivise:</Text>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Tutte le informazioni Cliente</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Prezzo di acquisto</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Margine e percentuale</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Date (produzione, creazione, aggiornamento, scans ione, vendita)</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Cronologia movimenti</Text>
                    </View>
                    <View style={styles.previewItem}>
                        <AppIcon name="check-circle" size={20} color={t.colors.success} />
                        <Text style={styles.previewText}>Note tecniche complete</Text>
                    </View>
                </View>

                {/* Note */}
                <View style={styles.noteCard}>
                    <Text style={styles.noteText}>
                        💡 <Text style={{ fontWeight: '600' }}>Nota:</Text> Le foto NON sono attualmente condivise a causa di limitazioni tecniche con file locali.
                        Questa funzionalità sarà aggiunta in una prossima versione.
                    </Text>
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
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    backButton: {
        marginRight: 12,
        padding: 8,
    },
    headerTitle: {
        ...t.typography.cardTitle,
        fontSize: 18,
    },
    infoCard: {
        backgroundColor: withAlpha(t.colors.accent, 0.082),
        borderRadius: t.radius.large,
        padding: 16,
        marginTop: 16,
        marginBottom: 24,
        flexDirection: 'row',
        gap: 12,
    },
    infoText: {
        ...t.typography.body,
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
        color: t.colors.textPrimary,
    },
    sectionTitle: {
        ...t.typography.sectionHeader,
        marginTop: 8,
        marginBottom: 12,
    },
    previewCard: {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.large,
        padding: 16,
        marginBottom: 16,
    },
    previewTitle: {
        ...t.typography.cardTitle,
        fontSize: 15,
        marginBottom: 12,
    },
    excludedTitle: {
        ...t.typography.caption,
        fontSize: 13,
        marginBottom: 8,
        marginTop: 4,
    },
    previewItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    previewText: {
        ...t.typography.body,
        fontSize: 14,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: t.colors.border,
        marginVertical: 12,
    },
    noteCard: {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.large,
        padding: 16,
        marginBottom: 16,
    },
    noteText: {
        ...t.typography.caption,
        fontSize: 13,
        lineHeight: 19,
    },
}));
