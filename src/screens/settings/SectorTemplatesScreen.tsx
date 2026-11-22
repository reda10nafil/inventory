// FurInventory Pro - Sector Templates Screen
import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { SECTOR_TEMPLATES, SectorTemplate, USER_TEMPLATES_KEY } from '../../../constants/sectorTemplates';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { useInstallFields } from '../../../hooks/useInstallFields';

export default function SectorTemplatesScreen() {
    const styles = useStyles();
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { customFields } = useCustomFields();
    const installFields = useInstallFields();
    const [selectedTemplate, setSelectedTemplate] = useState<SectorTemplate | null>(null);
    const [userTemplates, setUserTemplates] = useState<SectorTemplate[]>([]);

    useEffect(() => {
        loadUserTemplates();
    }, []);

    const loadUserTemplates = async () => {
        try {
            const stored = await AsyncStorage.getItem(USER_TEMPLATES_KEY);
            if (stored) {
                setUserTemplates(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Error loading user templates:', e);
        }
    };

    const saveUserTemplates = async (templates: SectorTemplate[]) => {
        try {
            await AsyncStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
            setUserTemplates(templates);
        } catch (e) {
            console.error('Error saving user templates:', e);
        }
    };

    const handleImportTemplate = async (template: SectorTemplate) => {
        Alert.alert(
            'Importa Modello',
            `Vuoi aggiungere i ${template.fields.length} campi del modello "${template.name}" al tuo registro?`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Importa',
                    onPress: async () => {
                        // Tutti i campi che mancano, poi in fondo al layout di Aggiungi (D12)
                        const { created: imported, existing } = await installFields(template.fields);
                        if (imported > 0) {
                            Alert.alert('Successo', `${imported} campi importati e aggiunti in fondo al modulo Aggiungi.${existing > 0 ? ` (${existing} già esistenti)` : ''}`);
                        } else {
                            Alert.alert('Info', 'Tutti i campi di questo modello sono già presenti nel tuo registro.');
                        }
                        setSelectedTemplate(null);
                    }
                }
            ]
        );
    };

    const handleSaveCurrentAsTemplate = () => {
        const userFields = customFields.filter(f => !f.isSystem && !f.deletedAt);
        if (userFields.length === 0) {
            Alert.alert('Nessun Campo', 'Non hai campi personalizzati da salvare come modello. Crea prima dei campi.');
            return;
        }

        (Alert as any).prompt?.(
            'Nome Modello',
            'Dai un nome al tuo modello personalizzato:',
            async (name: string) => {
                if (!name?.trim()) return;
                const newTemplate: SectorTemplate = {
                    id: `custom_${Date.now()}`,
                    name: name.trim(),
                    emoji: '⭐',
                    description: `${userFields.length} campi personalizzati`,
                    color: '#D4AF37',
                    fields: userFields.map(f => ({
                        name: f.name,
                        type: f.type,
                        uiType: f.uiType,
                        icon: f.icon,
                        unit: f.unit,
                        options: f.options,
                        dataset: f.dataset,
                        required: f.required,
                    })),
                };
                await saveUserTemplates([...userTemplates, newTemplate]);
                Alert.alert('Successo', `Modello "${name.trim()}" salvato con ${userFields.length} campi!`);
            }
        ) || Alert.alert('Info', 'La funzione di salvataggio modello personalizzato sarà disponibile a breve.');
    };

    const handleDeleteUserTemplate = (template: SectorTemplate) => {
        Alert.alert(
            'Elimina Modello',
            `Eliminare definitivamente il modello "${template.name}"?`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: () => saveUserTemplates(userTemplates.filter(tpl => tpl.id !== template.id))
                }
            ]
        );
    };

    const allTemplates = [...SECTOR_TEMPLATES, ...userTemplates];

    const renderTemplateCard = (template: SectorTemplate, isUser: boolean = false) => (
        <Pressable
            key={template.id}
            style={styles.templateCard}
            onPress={() => setSelectedTemplate(template)}
        >
            <View style={[styles.templateEmoji, { backgroundColor: withAlpha(template.color, 0.125) }]}>
                <Text style={styles.templateEmojiText}>{template.emoji}</Text>
            </View>
            <View style={styles.templateContent}>
                <View style={styles.templateHeader}>
                    <Text style={styles.templateName} numberOfLines={1}>{template.name}</Text>
                    {isUser && (
                        <View style={styles.customBadge}>
                            <Text style={styles.customBadgeText}>Custom</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.templateDesc} numberOfLines={1}>{template.description}</Text>
                <Text style={styles.templateFields}>{template.fields.length} campi</Text>
            </View>
            <AppIcon name="chevron-right" size={24} color={t.colors.textSecondary} />
        </Pressable>
    );

    return (
        <SafeAreaView edges={['top']} style={styles.container}>
            <Backdrop />
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <AppIcon name="arrow-back" size={24} color={t.colors.textPrimary} />
                </Pressable>
                <Text style={styles.title}>Modelli Settore</Text>
            </View>

            <ScrollView
                contentContainerStyle={{
                    paddingHorizontal: t.spacing.screenPadding,
                    paddingBottom: insets.bottom + 20,
                }}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.subtitle}>
                    Scegli un modello pre-configurato per il tuo settore. I campi verranno aggiunti al tuo registro.
                </Text>

                {/* Built-in Templates */}
                <Text style={styles.sectionTitle}>Modelli disponibili ({SECTOR_TEMPLATES.length})</Text>
                {SECTOR_TEMPLATES.map(tpl => renderTemplateCard(tpl))}

                {/* User Templates */}
                {userTemplates.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>I tuoi modelli ({userTemplates.length})</Text>
                        {userTemplates.map(tpl => (
                            <View key={tpl.id}>
                                {renderTemplateCard(tpl, true)}
                                <Pressable
                                    style={styles.deleteUserTemplate}
                                    onPress={() => handleDeleteUserTemplate(tpl)}
                                >
                                    <AppIcon name="delete-outline" size={16} color={t.colors.error} />
                                    <Text style={styles.deleteUserTemplateText}>Elimina</Text>
                                </Pressable>
                            </View>
                        ))}
                    </>
                )}

                {/* Save Current */}
                <Pressable style={styles.saveTemplateButton} onPress={handleSaveCurrentAsTemplate}>
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <AppIcon name="save" size={24} color={t.colors.onButton} />
                    <Text style={styles.saveTemplateText}>Salva Campi Attuali come Modello</Text>
                </Pressable>
            </ScrollView>

            {/* Template Detail Modal */}
            <Modal
                visible={!!selectedTemplate}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedTemplate(null)}
            >
                {selectedTemplate && (
                    <SafeAreaView style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Pressable onPress={() => setSelectedTemplate(null)}>
                                <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                            </Pressable>
                            <Text style={styles.modalTitle}>Anteprima Modello</Text>
                            <Pressable onPress={() => handleImportTemplate(selectedTemplate)}>
                                <Text style={styles.importButton}>Importa</Text>
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalContent}>
                            {/* Template Info */}
                            <View style={styles.templateInfoCard}>
                                <Text style={styles.templateInfoEmoji}>{selectedTemplate.emoji}</Text>
                                <Text style={styles.templateInfoName}>{selectedTemplate.name}</Text>
                                <Text style={styles.templateInfoDesc}>{selectedTemplate.description}</Text>
                            </View>

                            {/* Fields Preview */}
                            <Text style={styles.sectionTitle}>Campi inclusi ({selectedTemplate.fields.length})</Text>
                            {selectedTemplate.fields.map((field, index) => (
                                <View key={index} style={styles.fieldPreview}>
                                    <View style={[styles.fieldPreviewIcon, { backgroundColor: withAlpha(selectedTemplate.color, 0.082) }]}>
                                        <AppIcon name={field.icon as any || 'tune'} size={22} color={selectedTemplate.color} />
                                    </View>
                                    <View style={styles.fieldPreviewContent}>
                                        <Text style={styles.fieldPreviewName}>{field.name}</Text>
                                        <Text style={styles.fieldPreviewType}>
                                            {field.type === 'single_choice' ? 'Scelta Singola' :
                                                field.type === 'multi_choice' ? 'Scelta Multipla' :
                                                    field.type === 'text_short' ? 'Testo' :
                                                        field.type === 'text_long' ? 'Testo Lungo' :
                                                            field.type === 'number' ? 'Numero' :
                                                                field.type === 'currency' ? 'Valuta' :
                                                                    field.type === 'date' ? 'Data' :
                                                                        field.type}
                                            {field.unit ? ` (${field.unit})` : ''}
                                            {field.required ? ' • Obbligatorio' : ''}
                                        </Text>
                                        {field.dataset && Array.isArray(field.dataset) && (
                                            <Text style={styles.fieldPreviewOptions} numberOfLines={1}>
                                                {field.dataset.join(' · ')}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}

                            {/* Import Button */}
                            <Pressable
                                style={[styles.importFullButton, { backgroundColor: selectedTemplate.color || t.colors.accent }]}
                                onPress={() => handleImportTemplate(selectedTemplate)}
                            >
                                <AppIcon name="download" size={24} color={t.colors.onData} />
                                <Text style={styles.importFullText}>Importa {selectedTemplate.fields.length} Campi</Text>
                            </Pressable>
                        </ScrollView>
                    </SafeAreaView>
                )}
            </Modal>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    backButton: { marginRight: 16 },
    title: { ...t.typography.cardTitle, fontSize: 20, fontWeight: t.title.weight, letterSpacing: t.title.tracking },
    subtitle: {
        ...t.typography.body,
        color: t.colors.textSecondary,
        fontSize: 14,
        marginTop: 16,
        marginBottom: 24,
        lineHeight: 20,
    },
    sectionTitle: { ...t.typography.sectionHeader, lineHeight: 18, marginBottom: 10, ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null) },

    templateCard: {
        ...cardSurface(t),
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginBottom: 10,
    },
    templateEmoji: {
        width: 52,
        height: 52,
        borderRadius: t.radius.iconWrap,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    templateEmojiText: { fontSize: 28 },
    templateContent: { flex: 1 },
    templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    templateName: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
    customBadge: { backgroundColor: t.colors.accentSoft, borderRadius: t.radius.badge, paddingHorizontal: 6, paddingVertical: 2 },
    customBadgeText: { fontSize: 10, color: t.colors.accentInk, fontWeight: '600' },
    templateDesc: { ...t.typography.caption, fontSize: 12, marginBottom: 2 },
    templateFields: { ...t.typography.caption, fontSize: 11, color: t.colors.accentInk, fontWeight: '600' },

    deleteUserTemplate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingLeft: 66,
        marginBottom: 12,
        marginTop: -6,
    },
    deleteUserTemplateText: { fontSize: 12, color: t.colors.error },

    saveTemplateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 54,
        backgroundColor: t.colors.button,
        borderRadius: t.radius.button,
        ...t.shadows.button,
        overflow: 'hidden',
        padding: 16,
        marginTop: 24,
    },
    saveTemplateText: { ...t.typography.buttonPrimary, fontSize: 15, color: t.colors.onButton },

    // Anteprima del modello: fondo opaco (sta sopra la schermata)
    modalContainer: { flex: 1, backgroundColor: t.colors.backgroundSecondary },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    modalTitle: { ...t.typography.cardTitle, fontSize: 18, fontWeight: t.title.weight, letterSpacing: t.title.tracking },
    importButton: { color: t.colors.accentInk, fontWeight: '600', fontSize: 16 },
    modalContent: { flex: 1, paddingHorizontal: t.spacing.screenPadding },

    templateInfoCard: {
        alignItems: 'center',
        paddingVertical: 32,
        marginBottom: 8,
    },
    templateInfoEmoji: { fontSize: 56, marginBottom: 12 },
    templateInfoName: { ...t.typography.cardTitle, fontSize: 22, marginBottom: 6 },
    templateInfoDesc: { ...t.typography.caption, fontSize: 14, textAlign: 'center' },

    fieldPreview: {
        ...tileSurface(t),
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 8,
    },
    fieldPreviewIcon: {
        width: 44,
        height: 44,
        borderRadius: t.radius.iconWrap,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    fieldPreviewContent: { flex: 1 },
    fieldPreviewName: { ...t.typography.cardTitle, fontSize: 14, fontWeight: t.weights.strong, marginBottom: 2 },
    fieldPreviewType: { ...t.typography.caption, fontSize: 12 },
    fieldPreviewOptions: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, marginTop: 2 },

    importFullButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 54,
        padding: 16,
        borderRadius: t.radius.button,
        marginTop: 24,
        marginBottom: 40,
    },
    importFullText: { fontSize: 16, fontWeight: '700', color: t.colors.onData },
}));
