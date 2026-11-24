// FurInventory Pro - Layout Context
// Manages the configurable layout for Add Product screen
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { appendLayoutFields } from '../utils/templateFields';
import { LATE_BASE_FIELD_IDS, withLateBaseFields } from '../utils/templateFields';

// Types
export type FieldSize = 'small' | 'medium' | 'full'; // 33%, 50%, 100%

export interface LayoutField {
    id: string;           // e.g. 'sku', 'furType', 'field_xxx' (custom), 'section_xxx'
    type: 'base' | 'custom' | 'section';
    size: FieldSize;
    visible: boolean;
    label?: string; // For section headers or overriding base labels
    icon?: string; // Custom icon override
}

export interface LayoutConfig {
    fields: LayoutField[];
    version: number;
    /** S2: campi Base nati dopo già proposti a questo layout (`withLateBaseFields`): tolti dall'utente non tornano. */
    lateFields?: string[];
}

// Layout fields rely on CustomFieldsContext for their base definitions (name, icon).

// Default layout configuration with predefined sections
const DEFAULT_LAYOUT: LayoutConfig = {
    fields: [
        // Foto prima di tutto
        { id: 'images', type: 'base', size: 'full', visible: true },

        // Sezione Dati Prodotto
        { id: 'section_prodotto', type: 'section', size: 'full', visible: true, label: 'DATI PRODOTTO' },
        { id: 'sku', type: 'base', size: 'full', visible: true },
        { id: 'furType', type: 'base', size: 'full', visible: true },
        { id: 'location', type: 'base', size: 'medium', visible: true },
        { id: 'folder', type: 'base', size: 'medium', visible: true },

        // Sezione Dati Economici
        { id: 'section_economici', type: 'section', size: 'full', visible: true, label: 'DATI ECONOMICI' },
        { id: 'purchasePrice', type: 'base', size: 'medium', visible: true },
        { id: 'sellPrice', type: 'base', size: 'medium', visible: true },

        // Sezione Misure
        { id: 'section_misure', type: 'section', size: 'full', visible: true, label: 'MISURE' },
        { id: 'length', type: 'base', size: 'small', visible: true },
        { id: 'width', type: 'base', size: 'small', visible: true },
        { id: 'weight', type: 'base', size: 'small', visible: true },
        // S2 (ticket 14): «Altezza» in fondo alle misure; nei layout salvati prima la mette `withLateBaseFields`
        { id: 'height', type: 'base', size: 'small', visible: true },

        // Sezione Note
        { id: 'section_note', type: 'section', size: 'full', visible: true, label: 'NOTE' },
        { id: 'technicalNotes', type: 'base', size: 'full', visible: true },
    ],
    version: 4, // Fix sku full per banda nera in Add
    lateFields: [...LATE_BASE_FIELD_IDS], // S2: l'Altezza c'è già qui sopra
};

// Titoli delle sezioni predefinite con l'iniziale maiuscola (ritocco del ticket 08), solo quando si mostrano: i dati
// salvati non cambiano e i titoli scritti dall'utente restano come li ha scritti. Ardesia li rimette in maiuscolo
// con `textTransform` del suo tema.
const DEFAULT_SECTION_LABELS: Record<string, string> = {
    'DATI PRODOTTO': 'Dati prodotto',
    'DATI ECONOMICI': 'Dati economici',
    'MISURE': 'Misure',
    'NOTE': 'Note',
};

export function sectionLabel(label: string | undefined): string {
    return (label && DEFAULT_SECTION_LABELS[label]) || label || '';
}

const STORAGE_KEY = 'furinventory_layout_config';

// Context Interface
interface LayoutContextType {
    layout: LayoutConfig;
    loading: boolean;

    // CRUD operations
    updateFieldOrder: (fields: LayoutField[]) => void;
    updateFieldSize: (fieldId: string, size: FieldSize) => void;
    toggleFieldVisibility: (fieldId: string) => void;
    addFieldToLayout: (field: LayoutField) => void;
    appendToLayout: (ids: string[], size?: FieldSize, baseIds?: string[]) => Promise<LayoutField[]>;
    removeFieldFromLayout: (fieldId: string) => void;
    applyTemplate: (templateFields: LayoutField[]) => void;

    // Section headers
    addSectionHeader: (label: string) => void;
    removeSectionHeader: (sectionId: string) => void;
    updateSectionLabel: (sectionId: string, label: string) => void;
    updateFieldIcon: (fieldId: string, icon: string) => void;

    resetToDefault: () => void;
    saveLayout: () => Promise<void>;

    // Helpers
    getVisibleFields: () => LayoutField[];
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
    const { organizationId } = useAuth();
    const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);
    const [loading, setLoading] = useState(true);
    const layoutRef = useRef(layout);
    layoutRef.current = layout;

    // Load saved layout on mount
    useEffect(() => {
        if (organizationId) loadLayout();
        else { setLayout(DEFAULT_LAYOUT); setLoading(false); }
    }, [organizationId]);

    const loadLayout = async () => {
        try {
            if (!organizationId) return;
            const stored = await AsyncStorage.getItem(`${STORAGE_KEY}:${organizationId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Migrate to new layout if version is outdated
                if (!parsed.version || parsed.version < DEFAULT_LAYOUT.version) {
                    console.log('Migrating to new layout version...');
                    setLayout(DEFAULT_LAYOUT);
                    // Auto-save the new default
                    await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(DEFAULT_LAYOUT));
                } else {
                    // S2 (ticket 14): «Altezza» anche nei layout salvati prima, solo in memoria: il layout salvato non
                    // si riscrive e la `version` non cambia (vincolo 1 di map-3); si salva con il prossimo «Salva»
                    // `lateFields` ricorda (in memoria, salvato col prossimo «Salva») che l'Altezza è stata proposta: tolta
                    // dall'utente non torna (revisore di S2)
                    const offered: string[] = Array.isArray(parsed.lateFields) ? parsed.lateFields : [];
                    const fields = Array.isArray(parsed.fields) ? withLateBaseFields(parsed.fields, offered) : parsed.fields;
                    const allOffered = LATE_BASE_FIELD_IDS.every((id) => offered.includes(id));
                    setLayout(fields === parsed.fields && allOffered ? parsed : { ...parsed, fields, lateFields: [...new Set([...offered, ...LATE_BASE_FIELD_IDS])] });
                }
            }
        } catch (error) {
            console.error('Error loading layout:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveLayout = async () => {
        try {
            if (!organizationId) return;
            await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(layout));
        } catch (error) {
            console.error('Error saving layout:', error);
            throw error;
        }
    };

    const updateFieldOrder = (fields: LayoutField[]) => {
        setLayout(prev => ({ ...prev, fields }));
    };

    const updateFieldSize = (fieldId: string, size: FieldSize) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.map(f =>
                f.id === fieldId ? { ...f, size } : f
            ),
        }));
    };

    const toggleFieldVisibility = (fieldId: string) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.map(f =>
                f.id === fieldId ? { ...f, visible: !f.visible } : f
            ),
        }));
    };

    const addFieldToLayout = (field: LayoutField) => {
        // Check if already exists
        if (layout.fields.some(f => f.id === field.id)) return;

        setLayout(prev => ({
            ...prev,
            fields: [
                ...prev.fields,
                field,
            ],
        }));
    };

    // Mette in fondo al layout i campi che mancano e lo salva subito (campi nuovi e modelli: D12, P11).
    // Parte dal layout più recente (`layoutRef`), così più chiamate di seguito non si sovrascrivono.
    const appendToLayout = async (ids: string[], size: FieldSize = 'medium', baseIds: string[] = []) => {
        const next = { ...layoutRef.current, fields: appendLayoutFields(layoutRef.current.fields, ids, size, baseIds) };
        layoutRef.current = next;
        setLayout(next);
        if (organizationId) await AsyncStorage.setItem(`${STORAGE_KEY}:${organizationId}`, JSON.stringify(next));
        return next.fields;
    };

    const removeFieldFromLayout = (fieldId: string) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== fieldId),
        }));
    };

    const applyTemplate = (templateFields: LayoutField[]) => {
        setLayout(prev => ({
            ...prev,
            fields: templateFields
        }));
    };

    const addSectionHeader = (label: string) => {
        const newSection: LayoutField = {
            id: `section_${Date.now()}`,
            type: 'section',
            size: 'full',
            visible: true,
            label: label,
            icon: 'menu' // Default icon for sections in builder? Or unwanted?
        };
        setLayout(prev => ({
            ...prev,
            fields: [newSection, ...prev.fields] // Add to top by default? Or bottom?
        }));
    };

    const removeSectionHeader = (sectionId: string) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== sectionId),
        }));
    };

    const updateSectionLabel = (sectionId: string, label: string) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.map(f =>
                f.id === sectionId ? { ...f, label } : f
            )
        }));
    };

    const updateFieldIcon = (fieldId: string, icon: string) => {
        setLayout(prev => ({
            ...prev,
            fields: prev.fields.map(f =>
                f.id === fieldId ? { ...f, icon } : f
            )
        }));
    };

    const resetToDefault = () => {
        setLayout(DEFAULT_LAYOUT);
    };

    const getVisibleFields = (): LayoutField[] => {
        return layout.fields.filter(f => f.visible);
    };

    return (
        <LayoutContext.Provider
            value={{
                layout,
                loading,
                updateFieldOrder,
                updateFieldSize,
                toggleFieldVisibility,
                addFieldToLayout,
                appendToLayout,
                removeFieldFromLayout,
                applyTemplate,
                addSectionHeader,
                removeSectionHeader,
                updateSectionLabel,
                updateFieldIcon,
                resetToDefault,
                saveLayout,
                getVisibleFields,
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
