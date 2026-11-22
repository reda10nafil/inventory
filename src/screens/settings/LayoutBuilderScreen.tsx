// FurInventory Pro - Layout Builder Screen
// Simple implementation to customize Add Product layout (no Reanimated dependencies)
import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '../../navigation/compat';
import { useLayout, LayoutField, FieldSize, sectionLabel } from '../../../contexts/LayoutContext';
import { useCustomFields } from '../../../contexts/CustomFieldsContext';
import { PREDEFINED_TEMPLATES } from '../../../lib/templates';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { Glass } from '../../../components/ui/Glass';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface, tileSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';
import { useInstallFields } from '../../../hooks/useInstallFields';

const SIZE_OPTIONS: { value: FieldSize; label: string; width: string }[] = [
    { value: 'small', label: '1/3', width: '33%' },
    { value: 'medium', label: '1/2', width: '50%' },
    { value: 'full', label: 'Intera', width: '100%' },
];

// Extended icon library organized by category
const COMMON_ICONS = [
    // Prodotti e Inventario
    'qr-code', 'qr-code-2', 'inventory', 'inventory-2', 'category', 'sell', 'local-offer',
    'shopping-cart', 'shopping-bag', 'storefront', 'store', 'warehouse',

    // Misure e Dimensioni  
    'straighten', 'square-foot', 'crop-free', 'aspect-ratio', 'height', 'timeline',
    'fitness-center', 'scale', 'monitor-weight',

    // Denaro e Prezzi
    'euro', 'euro-symbol', 'attach-money', 'money', 'paid', 'price-check',
    'account-balance-wallet', 'credit-card', 'receipt', 'receipt-long',

    // Posizione e Luoghi
    'place', 'location-on', 'my-location', 'map', 'pin-drop', 'room',
    'folder', 'folder-open', 'create-new-folder',

    // Note e Documenti
    'notes', 'description', 'article', 'text-fields', 'edit-note', 'sticky-note-2',
    'comment', 'chat', 'format-quote',

    // Immagini e Media
    'image', 'photo', 'add-photo-alternate', 'photo-library', 'camera-alt',
    'collections', 'panorama', 'filter',

    // Spedizione e Logistica
    'local-shipping', 'airport-shuttle', 'flight', 'directions-car',

    // Tempo e Date
    'timer', 'schedule', 'history', 'today', 'event', 'calendar-today', 'access-time',

    // Stato e Azioni
    'check-circle', 'verified', 'new-releases', 'star', 'favorite', 'bookmark',
    'flag', 'label', 'tag', 'loyalty',

    // Persone e Contatti
    'person', 'people', 'contacts', 'badge', 'work', 'business',

    // UI e Navigazione
    'menu', 'dashboard', 'grid-view', 'view-list', 'format-list-bulleted',
    'layers', 'widgets', 'apps', 'extension', 'tune', 'settings',

    // Altro
    'info', 'help', 'lightbulb', 'highlight', 'palette', 'brush',
    'diamond', 'workspace-premium', 'eco', 'spa', 'ac-unit',
];

export default function LayoutBuilderScreen() {
    const styles = useStyles();
    const t = useTheme();
    const router = useRouter();
    const {
        layout,
        updateFieldOrder,
        updateFieldSize,
        toggleFieldVisibility,
        addFieldToLayout,
        removeFieldFromLayout,
        addSectionHeader,
        removeSectionHeader,
        updateSectionLabel,
        updateFieldIcon,
        saveLayout,
    } = useLayout();
    const { customFields } = useCustomFields();
    const installFields = useInstallFields();

    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [localFields, setLocalFields] = useState<LayoutField[]>([]);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [showAddFieldModal, setShowAddFieldModal] = useState(false);

    // Initialize local fields from layout
    useEffect(() => {
        setLocalFields([...layout.fields]);
    }, [layout.fields]);

    const moveField = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localFields.length - 1) return;

        const newFields = [...localFields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        setLocalFields(newFields);
        updateFieldOrder(newFields);
        setHasChanges(true);
    };

    const handleSizeChange = (fieldId: string, size: FieldSize) => {
        const newFields = localFields.map(f =>
            f.id === fieldId ? { ...f, size } : f
        );
        setLocalFields(newFields);
        updateFieldSize(fieldId, size);
        setHasChanges(true);
    };

    const handleToggleVisibility = (fieldId: string) => {
        const newFields = localFields.map(f =>
            f.id === fieldId ? { ...f, visible: !f.visible } : f
        );
        setLocalFields(newFields);
        toggleFieldVisibility(fieldId);
        setHasChanges(true);
    };

    const handleSave = async () => {
        try {
            await saveLayout();
            setHasChanges(false);
            Alert.alert('Salvato', 'Il layout è stato applicato alla pagina Aggiungi Prodotto');
        } catch (error) {
            Alert.alert('Errore', 'Impossibile salvare il layout');
        }
    };

    const loadTemplate = (templateId: string) => {
        const template = PREDEFINED_TEMPLATES.find(tpl => tpl.id === templateId);
        if (!template) return;

        Alert.alert(
            'Carica Modello',
            `Applico il modello "${template.name}"? I campi che mancano vengono creati e tutti i campi del modello vanno in fondo al layout.`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Applica Modello',
                    onPress: async () => {
                        try {
                            // Campi nuovi nel registro e tutti i campi del modello in fondo al layout, salvato (D12)
                            const { created, existing, layoutFields } = await installFields(template.customFields);
                            setLocalFields(layoutFields);
                            setShowTemplatesModal(false);
                            Alert.alert('Modello Caricato', `${created} campi nuovi${existing ? `, ${existing} già presenti` : ''}: sono in fondo al layout.`);
                        } catch (e) {
                            Alert.alert('Errore', 'Impossibile applicare il modello');
                        }
                    }
                }
            ]
        );
    };

    const getFieldLabelForItem = (field: LayoutField): string => {
        if (field.label) return field.label; // section or override
        const customField = customFields.find(cf => cf.id === field.id);
        return customField?.name || field.id;
    };

    const getFieldIconForItem = (field: LayoutField): string => {
        if (field.icon) return field.icon; // override
        const customField = customFields.find(cf => cf.id === field.id);
        return customField?.icon || 'tune';
    };

    return (
        <SafeAreaView edges={['bottom']} style={styles.container}>
            <Backdrop />
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
                <AppIcon name="info-outline" size={20} color={t.colors.accentInk} />
                <Text style={styles.instructionsText}>
                    Usa le frecce per riordinare. Tocca per modificare dimensione.
                </Text>
            </View>

            <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Configura campi</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <Pressable onPress={() => setShowTemplatesModal(true)} style={[styles.chip, styles.chipActive]}>
                        <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />
                        <AppIcon name="auto-awesome" size={18} color={t.colors.chipActiveText} />
                        <Text style={[styles.chipText, styles.chipTextActive]}>MODELLI</Text>
                    </Pressable>
                    <Pressable onPress={() => {
                        addSectionHeader('Nuova sezione');
                        setHasChanges(true);
                    }} style={styles.chip}>
                        <AppIcon name="playlist-add" size={18} color={t.colors.textSecondary} />
                        <Text style={styles.chipText}>SEZIONE</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowAddFieldModal(true)} style={styles.chip}>
                        <AppIcon name="add" size={18} color={t.colors.textSecondary} />
                        <Text style={styles.chipText}>CAMPO</Text>
                    </Pressable>
                </ScrollView>
            </View>

            {/* Field List */}
            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.listContent}
            >
                {localFields.map((item, index) => {
                    const isSelected = selectedFieldId === item.id;
                    const isSection = item.type === 'section';

                    return (
                        <View key={item.id}>
                            <Pressable
                                onPress={() => setSelectedFieldId(isSelected ? null : item.id)}
                                style={[
                                    styles.fieldCard,
                                    !item.visible && styles.fieldCardHidden,
                                    isSelected && styles.fieldCardSelected,
                                    isSection && styles.sectionCard
                                ]}
                            >
                                <View style={styles.fieldCardHeader}>
                                    {/* Move Buttons */}
                                    <View style={styles.moveButtons}>
                                        <Pressable
                                            style={[styles.moveButton, index === 0 && styles.moveButtonDisabled]}
                                            onPress={() => moveField(index, 'up')}
                                            disabled={index === 0}
                                        >
                                            <AppIcon
                                                name="keyboard-arrow-up"
                                                size={20}
                                                color={index === 0 ? t.colors.border : t.colors.textSecondary}
                                            />
                                        </Pressable>
                                        <Pressable
                                            style={[styles.moveButton, index === localFields.length - 1 && styles.moveButtonDisabled]}
                                            onPress={() => moveField(index, 'down')}
                                            disabled={index === localFields.length - 1}
                                        >
                                            <AppIcon
                                                name="keyboard-arrow-down"
                                                size={20}
                                                color={index === localFields.length - 1 ? t.colors.border : t.colors.textSecondary}
                                            />
                                        </Pressable>
                                    </View>

                                    {isSection ? (
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <AppIcon name="menu" size={20} color={t.colors.textSecondary} />
                                            <TextInput
                                                style={styles.sectionInput}
                                                value={sectionLabel(item.label)}
                                                onChangeText={(text) => {
                                                    const newFields = localFields.map(f => f.id === item.id ? { ...f, label: text } : f);
                                                    setLocalFields(newFields);
                                                    updateSectionLabel(item.id, text);
                                                    setHasChanges(true);
                                                }}
                                                placeholder="Nome Sezione"
                                                placeholderTextColor={t.colors.placeholder}
                                            />
                                            <Pressable onPress={() => {
                                                Alert.alert('Elimina Sezione', 'Sei sicuro?', [
                                                    { text: 'Annulla', style: 'cancel' },
                                                    {
                                                        text: 'Elimina', style: 'destructive', onPress: () => {
                                                            removeSectionHeader(item.id);
                                                            setHasChanges(true); // Sync will happen via effect
                                                        }
                                                    }
                                                ])
                                            }}>
                                                <AppIcon name="delete-outline" size={20} color={t.colors.error} />
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <>
                                            <AppIcon
                                                name={getFieldIconForItem(item) as any}
                                                size={20}
                                                color={item.visible ? t.colors.accentInk : t.colors.textSecondary}
                                            />
                                            <Text style={[
                                                styles.fieldCardTitle,
                                                !item.visible && styles.fieldCardTitleHidden,
                                            ]}>
                                                {getFieldLabelForItem(item)}
                                            </Text>

                                            <View style={styles.sizeIndicatorContainer}>
                                                <View style={[
                                                    styles.sizeIndicator,
                                                    item.size === 'small' && styles.sizeIndicatorSmall,
                                                    item.size === 'medium' && styles.sizeIndicatorMedium,
                                                    item.size === 'full' && styles.sizeIndicatorFull,
                                                ]} />
                                            </View>

                                            <Pressable
                                                style={styles.visibilityButton}
                                                onPress={() => handleToggleVisibility(item.id)}
                                            >
                                                <AppIcon
                                                    name={item.visible ? 'visibility' : 'visibility-off'}
                                                    size={20}
                                                    color={item.visible ? t.colors.accentInk : t.colors.textSecondary}
                                                />
                                            </Pressable>

                                            <Pressable
                                                style={[styles.visibilityButton, { marginLeft: 4 }]}
                                                onPress={() => {
                                                    Alert.alert('Rimuovi Campo', 'Rimuovere questo campo dal layout?', [
                                                        { text: 'Annulla', style: 'cancel' },
                                                        {
                                                            text: 'Rimuovi', style: 'destructive', onPress: () => {
                                                                const newFields = localFields.filter(f => f.id !== item.id);
                                                                setLocalFields(newFields);
                                                                removeFieldFromLayout(item.id);
                                                                setHasChanges(true);
                                                            }
                                                        }
                                                    ]);
                                                }}
                                            >
                                                <AppIcon name="close" size={20} color={t.colors.error} />
                                            </Pressable>
                                        </>
                                    )}
                                </View>

                                {/* Extended Controls */}
                                {isSelected && !isSection && (
                                    <View style={styles.sizeSelectorContainer}>
                                        <Text style={styles.sizeSelectorLabel}>Dimensione:</Text>
                                        <View style={styles.sizeOptions}>
                                            {SIZE_OPTIONS.map((option) => (
                                                <Pressable
                                                    key={option.value}
                                                    style={[
                                                        styles.sizeOption,
                                                        item.size === option.value && styles.sizeOptionActive,
                                                    ]}
                                                    onPress={() => handleSizeChange(item.id, option.value)}
                                                >
                                                    <Text style={[
                                                        styles.sizeOptionText,
                                                        item.size === option.value && styles.sizeOptionTextActive,
                                                    ]}>
                                                        {option.label}
                                                    </Text>
                                                    <Text style={[
                                                        styles.sizeOptionSubtext,
                                                        item.size === option.value && styles.sizeOptionSubtextActive,
                                                    ]}>
                                                        {option.width}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>

                                        <Text style={[styles.sizeSelectorLabel, { marginTop: 16 }]}>Icona:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                                            {COMMON_ICONS.map(icon => (
                                                <Pressable
                                                    key={icon}
                                                    onPress={() => {
                                                        const newFields = localFields.map(f => f.id === item.id ? { ...f, icon } : f);
                                                        setLocalFields(newFields);
                                                        updateFieldIcon(item.id, icon);
                                                        setHasChanges(true);
                                                    }}
                                                    style={[styles.iconTile, getFieldIconForItem(item) === icon && styles.iconTileSelected]}
                                                >
                                                    <AppIcon name={icon as any} size={20} color={getFieldIconForItem(item) === icon ? t.colors.tileSelectedText : t.colors.textSecondary} />
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </Pressable>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Save Button */}
            <View style={styles.bottomBar}>
                <Glass />
                <Pressable
                    style={[styles.saveButton, hasChanges ? styles.saveButtonActive : styles.saveButtonDisabled]}
                    onPress={handleSave}
                    disabled={!hasChanges}
                >
                    {hasChanges && <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />}
                    <AppIcon name="save" size={24} color={hasChanges ? t.colors.onButton : t.colors.textSecondary} />
                    <Text style={[styles.saveButtonText, !hasChanges && styles.saveButtonTextDisabled]}>
                        {hasChanges ? 'Salva Layout' : 'Nessuna Modifica'}
                    </Text>
                </Pressable>
            </View>

            {/* Templates Selector Modal */}
            <Modal visible={showTemplatesModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTemplatesModal(false)}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowTemplatesModal(false)}>
                            <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                        </Pressable>
                        <Text style={styles.modalTitle}>Modelli di Settore</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <ScrollView style={{ flex: 1, padding: t.spacing.screenPadding }}>
                        <Text style={{ ...t.typography.caption, color: t.colors.textSecondary, marginBottom: 24, fontSize: 13, lineHeight: 18 }}>
                            Carica un modello predefinito per aggiungere i campi più comuni del tuo settore.
                            I campi che mancano vengono creati e messi in fondo al layout attuale, che viene salvato; quelli che hai già non cambiano.
                        </Text>
                        {PREDEFINED_TEMPLATES.map(template => (
                            <Pressable
                                key={template.id}
                                style={[styles.modalRow, { marginBottom: 16 }]}
                                onPress={() => loadTemplate(template.id)}
                            >
                                <View style={[styles.modalRowIcon, { width: 50, height: 50 }]}>
                                    <AppIcon name={template.icon as any} size={24} color={t.colors.accentInk} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalRowTitle, { marginBottom: 4 }]}>{template.name}</Text>
                                    <Text style={{ ...t.typography.caption, color: t.colors.textSecondary }}>{template.description}</Text>
                                </View>
                                <AppIcon name="arrow-forward-ios" size={16} color={t.colors.textSecondary} />
                            </Pressable>
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Add Field Modal */}
            <Modal visible={showAddFieldModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddFieldModal(false)}>
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setShowAddFieldModal(false)}>
                            <AppIcon name="close" size={24} color={t.colors.textPrimary} />
                        </Pressable>
                        <Text style={styles.modalTitle}>Aggiungi Campo</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <ScrollView style={{ flex: 1, padding: t.spacing.screenPadding }}>
                        <Text style={{ ...t.typography.caption, color: t.colors.textSecondary, marginBottom: 24, fontSize: 13, lineHeight: 18 }}>
                            Seleziona un campo dal registro per aggiungerlo al tuo layout.
                        </Text>
                        {customFields.filter(cf => !localFields.some(lf => lf.id === cf.id)).map(cf => (
                            <Pressable
                                key={cf.id}
                                style={[styles.modalRow, { marginBottom: 12 }]}
                                onPress={() => {
                                    const newField: LayoutField = {
                                        id: cf.id,
                                        type: cf.isSystem ? 'base' : 'custom',
                                        size: 'medium',
                                        visible: true
                                    };
                                    const newFields = [...localFields, newField];
                                    setLocalFields(newFields);
                                    addFieldToLayout(newField);
                                    setHasChanges(true);
                                    setShowAddFieldModal(false);
                                }}
                            >
                                <View style={[styles.modalRowIcon, { width: 40, height: 40 }]}>
                                    <AppIcon name={(cf.icon as any) || 'text-fields'} size={20} color={t.colors.accentInk} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.modalRowTitle, { marginBottom: 2 }]}>{cf.name}</Text>
                                    <Text style={{ ...t.typography.caption, color: t.colors.textSecondary }}>{cf.isSystem ? 'Campo Originale di Sistema' : 'Campo Personalizzato'}</Text>
                                </View>
                                <AppIcon name="add-circle-outline" size={24} color={t.colors.accentInk} />
                            </Pressable>
                        ))}
                        {customFields.filter(cf => !localFields.some(lf => lf.id === cf.id)).length === 0 && (
                            <View style={{ padding: 24, alignItems: 'center', opacity: 0.5 }}>
                                <AppIcon name="check-circle" size={48} color={t.colors.textSecondary} />
                                <Text style={{ ...t.typography.cardTitle, marginTop: 16, textAlign: 'center' }}>Tutti i campi sono già nel layout</Text>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const useStyles = makeStyles((t) => ({
    container: {
        flex: 1,
        backgroundColor: t.colors.background,
    },
    instructionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 12,
        backgroundColor: t.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
    instructionsText: {
        ...t.typography.caption,
        fontSize: 13,
        color: t.colors.textSecondary,
        flex: 1,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 12,
    },
    previewTitle: {
        ...t.typography.sectionHeader,
        marginRight: 12,
    },
    // Pillole MODELLI / SEZIONE / CAMPO
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 34,
        paddingHorizontal: 12,
        borderRadius: t.radius.chip,
        backgroundColor: t.colors.chip,
        borderWidth: 1,
        borderColor: t.colors.chipBorder,
        overflow: 'hidden',
    },
    chipActive: {
        backgroundColor: t.colors.chipActive,
        borderColor: t.colors.chipActiveBorder,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
        color: t.colors.chipText,
    },
    chipTextActive: {
        fontWeight: '600',
        color: t.colors.chipActiveText,
    },
    previewLegend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendBox: {
        height: 12,
        borderRadius: 3,
        backgroundColor: t.colors.accent,
    },
    legendText: {
        ...t.typography.caption,
        fontSize: 11,
        color: t.colors.textSecondary,
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: t.spacing.screenPadding,
        paddingBottom: 100,
    },
    fieldCard: {
        ...cardSurface(t),
        marginBottom: 8,
        overflow: 'hidden',
    },
    fieldCardHidden: {
        opacity: 0.5,
    },
    fieldCardSelected: {
        borderColor: t.colors.tileSelectedBorder,
    },
    sectionCard: {
        borderColor: t.colors.dash,
        borderStyle: 'dashed',
    },
    sectionInput: {
        flex: 1,
        minWidth: 0,
        ...t.typography.sectionHeader,
        paddingVertical: 0,
    },
    fieldCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    moveButtons: {
        flexDirection: 'column',
        marginRight: 4,
    },
    moveButton: {
        padding: 2,
    },
    moveButtonDisabled: {
        opacity: 0.3,
    },
    fieldCardTitle: {
        ...t.typography.cardTitle,
        fontSize: 15,
        flex: 1,
    },
    fieldCardTitleHidden: {
        color: t.colors.textSecondary,
    },
    sizeIndicatorContainer: {
        width: 40,
        height: 8,
        backgroundColor: t.colors.tile,
        borderWidth: 1,
        borderColor: t.colors.tileBorder,
        borderRadius: 4,
        overflow: 'hidden',
    },
    sizeIndicator: {
        height: '100%',
        borderRadius: 4,
    },
    sizeIndicatorSmall: {
        width: '33%',
        backgroundColor: withAlpha(t.colors.tileSelectedBorder, 0.376),
    },
    sizeIndicatorMedium: {
        width: '50%',
        backgroundColor: withAlpha(t.colors.tileSelectedBorder, 0.502),
    },
    sizeIndicatorFull: {
        width: '100%',
        backgroundColor: t.colors.tileSelectedBorder,
    },
    visibilityButton: {
        padding: 4,
    },
    sizeSelectorContainer: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
        paddingTop: 12,
    },
    sizeSelectorLabel: {
        fontSize: t.label.size,
        fontWeight: t.label.weight,
        color: t.label.color,
        lineHeight: 18,
        marginBottom: 6,
    },
    sizeOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    sizeOption: {
        ...tileSurface(t),
        flex: 1,
        padding: 12,
        alignItems: 'center',
    },
    sizeOptionActive: {
        backgroundColor: t.colors.tileSelected,
        borderColor: t.colors.tileSelectedBorder,
    },
    sizeOptionText: {
        ...t.typography.cardTitle,
        fontSize: 14,
        fontWeight: '500',
        color: t.colors.textPrimary,
    },
    sizeOptionTextActive: {
        fontWeight: '600',
        color: t.colors.tileSelectedText,
    },
    // Scelta dell'icona: riquadri come le scelte a riquadri di Aggiungi
    iconTile: {
        ...tileSurface(t),
        width: 40,
        height: 40,
        borderRadius: t.radius.iconWrap,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconTileSelected: {
        backgroundColor: t.colors.tileSelected,
        borderColor: t.colors.tileSelectedBorder,
    },
    sizeOptionSubtext: {
        ...t.typography.caption,
        fontSize: 11,
        color: t.colors.textMuted,
        marginTop: 2,
    },
    sizeOptionSubtextActive: {
        color: t.colors.tileSelectedText,
    },
    // Barra fissa di salvataggio: vetro e filetto in alto come le altre barre fisse
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: t.spacing.screenPadding,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
        borderTopColor: t.colors.border,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 52,
        borderRadius: t.radius.button,
        overflow: 'hidden',
        paddingVertical: 14,
    },
    saveButtonActive: {
        backgroundColor: t.colors.button,
        ...t.shadows.button,
    },
    saveButtonDisabled: {
        backgroundColor: t.colors.buttonSecondary,
        borderWidth: 1,
        borderColor: t.colors.buttonSecondaryBorder,
    },
    saveButtonText: {
        ...t.typography.buttonPrimary,
        fontSize: 16,
        color: t.colors.onButton,
    },
    saveButtonTextDisabled: {
        color: t.colors.textSecondary,
    },
    // Finestre Modelli e Aggiungi campo: fondo opaco (stanno sopra la schermata)
    modalContainer: {
        flex: 1,
        backgroundColor: t.colors.backgroundSecondary,
    },
    modalTitle: {
        ...t.typography.cardTitle,
        fontSize: 18,
        fontWeight: t.title.weight,
        letterSpacing: t.title.tracking,
    },
    modalRow: {
        ...tileSurface(t),
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    modalRowIcon: {
        borderRadius: t.radius.iconWrap,
        backgroundColor: t.colors.iconWrap,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalRowTitle: {
        ...t.typography.cardTitle,
        fontSize: 16,
        fontWeight: t.weights.strong,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: t.spacing.screenPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
    },
}));
