import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Dimensions } from 'react-native';
import { CameraView, Camera } from '../src/lib/camera';
import { AppIcon } from './ui/AppIcon';
import { GradientFill } from './ui/GradientFill';
import { Text, TextInput } from './ui/Text';
import { makeStyles, useTheme } from '../contexts/ThemeContext';
import { withAlpha } from '../utils/color';
// N1 (ticket 16, 22): «Leggi un tag» accanto a «Scrivi il codice» in ogni lettore (automazioni comprese), e la
// fotocamera solo se Scanner e NFC la vuole. Il codice del tag arriva a `onScan` come ogni altro codice.
import { NfcSheet } from './NfcSheet';
import { useHardwareConfig } from '../contexts/HardwareConfigContext';
import { useNfcUsable } from '../hooks/useNfcUsable';
import { readerSources } from '../utils/nfcTag';

interface BarcodeScannerProps {
    onScan: (result: { type: string; data: string }) => void;
    onClose: () => void;
    delay?: number;
}

export default function BarcodeScanner({ onScan, onClose, delay = 2000 }: BarcodeScannerProps) {
    const styles = useStyles();
    const t = useTheme();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    // COD (ticket 22): «Scrivi il codice» per le etichette rovinate, i lettori a pistola (scrivono il codice e Invio)
    // e il web. Va diritto a `onScan`, senza la pausa della fotocamera: due codici scritti di fila valgono tutti e due.
    const [typing, setTyping] = useState(false);
    const [code, setCode] = useState('');
    const { hwConfig } = useHardwareConfig();
    const reader = readerSources(hwConfig.scanMode, useNfcUsable());
    const [readingTag, setReadingTag] = useState(false);

    useEffect(() => {
        if (!reader.camera) return; // «NFC» in Scanner e NFC: la fotocamera non si apre
        const getPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getPermissions();
    }, [reader.camera]);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        // Add a small delay to prevent multiple swift scans
        onScan({ type, data });
        // Reset scanned state after a delay if needed by parent
        setTimeout(() => setScanned(false), delay);
    };

    // Il campo resta aperto e vuoto per il codice dopo (Spostamento rapido e Tagging leggono in fila)
    const submitCode = () => {
        const data = code.trim();
        if (!data) return;
        setCode('');
        onScan({ type: 'manual', data });
    };

    const tagButton = reader.nfc && !typing && (
        <Pressable style={styles.writeButton} onPress={() => setReadingTag(true)} accessibilityRole="button" accessibilityLabel="Leggi un tag">
            <AppIcon name="nfc" size={20} color={t.colors.onData} />
            <Text style={styles.writeButtonText}>Leggi un tag</Text>
        </Pressable>
    );
    const tagSheet = readingTag && (
        <NfcSheet
            visible
            mode="leggi"
            onClose={() => setReadingTag(false)}
            onRead={(data) => { setReadingTag(false); onScan({ type: 'nfc', data }); }}
        />
    );

    const writeButton = !typing && (
        <Pressable style={styles.writeButton} onPress={() => setTyping(true)} accessibilityRole="button" accessibilityLabel="Scrivi il codice">
            <AppIcon name="keyboard" size={20} color={t.colors.onData} />
            <Text style={styles.writeButtonText}>Scrivi il codice</Text>
        </Pressable>
    );
    const writePanel = typing && (
        <View style={styles.writePanel}>
            <Text style={styles.writeTitle}>Scrivi il codice</Text>
            <Text style={styles.writeHint}>SKU, codice dell'etichetta o link, come lo leggerebbe la fotocamera</Text>
            <TextInput
                style={styles.writeInput}
                value={code}
                onChangeText={setCode}
                placeholder="Codice, SKU o link"
                placeholderTextColor={t.colors.placeholder}
                accessibilityLabel="Codice da usare"
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                blurOnSubmit={false}
                onSubmitEditing={submitCode}
            />
            <View style={styles.writeButtons}>
                <Pressable style={[styles.writeAction, styles.writeCancel]} onPress={() => { setTyping(false); setCode(''); }} accessibilityRole="button">
                    <Text style={styles.writeCancelText}>Chiudi</Text>
                </Pressable>
                <Pressable style={[styles.writeAction, styles.writeUse]} onPress={submitCode} accessibilityRole="button">
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <Text style={styles.writeUseText}>Usa codice</Text>
                </Pressable>
            </View>
        </View>
    );

    if (!reader.camera) {
        return (
            <View style={styles.container}>
                <AppIcon name="nfc" size={64} color={t.colors.onData} />
                <Text style={styles.text}>Tocca «Leggi un tag» e avvicina il tag</Text>
                {tagButton}
                {writeButton}
                <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Chiudi">
                    <AppIcon name="close" size={32} color={t.colors.onData} />
                </Pressable>
                {writePanel}
                {tagSheet}
            </View>
        );
    }

    if (hasPermission === null || hasPermission === false) {
        return (
            <View style={styles.container}>
                {hasPermission === null ? (
                    <Text style={styles.text}>Richiesta permessi fotocamera...</Text>
                ) : (
                    <>
                        <Text style={styles.text}>Nessun accesso alla fotocamera</Text>
                        <Pressable style={styles.permissionButton} onPress={() => Camera.requestCameraPermissionsAsync()}>
                            <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                            <Text style={styles.permissionButtonText}>Consenti Fotocamera</Text>
                        </Pressable>
                    </>
                )}
                {tagButton}
                {writeButton}
                {hasPermission === false && (
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <AppIcon name="close" size={32} color={t.colors.onData} />
                    </Pressable>
                )}
                {writePanel}
                {tagSheet}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "upc_e", "upc_a"],
                }}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <View style={styles.unfocusedContainer}></View>
                <View style={styles.middleContainer}>
                    <View style={styles.unfocusedContainer}></View>
                    <View style={styles.focusedContainer}>
                        <View style={styles.cornerTL} />
                        <View style={styles.cornerTR} />
                        <View style={styles.cornerBL} />
                        <View style={styles.cornerBR} />
                    </View>
                    <View style={styles.unfocusedContainer}></View>
                </View>
                <View style={styles.unfocusedContainer}></View>
            </View>

            <View style={styles.controls}>
                {tagButton}
                {writeButton}
                <Text style={styles.instructions}>Inquadra il codice</Text>
                <Pressable style={styles.closeRoundButton} onPress={onClose}>
                    <AppIcon name="close" size={32} color={t.colors.onData} />
                </Pressable>
            </View>
            {writePanel}
            {tagSheet}
        </View>
    );
}

const { width } = Dimensions.get('window');

const useStyles = makeStyles((t) => ({
    container: {
        flex: 1,
        backgroundColor: t.colors.cameraBackground,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Sopra la fotocamera e i veli: bianco fisso in tutti gli stili
    text: {
        color: t.colors.onData,
        fontSize: 16,
        marginBottom: 20,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    unfocusedContainer: {
        flex: 1,
        backgroundColor: withAlpha(t.colors.shadow, 0.6),
    },
    middleContainer: {
        flexDirection: 'row',
        height: 280,
    },
    focusedContainer: {
        flex: 6, // Square-ish focus area
        borderColor: 'transparent',
    },
    controls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructions: {
        color: t.colors.onData,
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: t.colors.scrimStrong,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    // Sul fondo nero della fotocamera: anello bianco fisso, come il pulsante di chiusura (Minimal ha il pulsante nero)
    permissionButton: {
        backgroundColor: t.colors.button,
        borderWidth: 1,
        borderColor: t.colors.onData,
        borderRadius: t.radius.button,
        paddingHorizontal: 24,
        paddingVertical: 12,
        overflow: 'hidden',
        ...t.shadows.button,
    },
    permissionButtonText: {
        color: t.colors.onButton,
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 20,
    },
    closeRoundButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: t.colors.scrimStrong,
        borderWidth: 2,
        borderColor: t.colors.onData,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    // Corner markers
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: t.colors.onData },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: t.colors.onData },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: t.colors.onData },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: t.colors.onData },
    // COD: «Scrivi il codice». Il pulsante sta sul fondo nero della fotocamera (bianco fisso, come la X); la finestra
    // in alto, così la tastiera del telefono non la copre
    writeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 16,
        marginTop: 16,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: t.colors.onData,
        backgroundColor: t.colors.scrimStrong,
    },
    writeButtonText: {
        color: t.colors.onData,
        fontSize: 15,
        fontWeight: '600',
    },
    writePanel: {
        position: 'absolute',
        top: 48,
        left: 16,
        right: 16,
        padding: 16,
        backgroundColor: t.colors.backgroundSecondary,
        borderRadius: t.radius.card,
        borderWidth: 1,
        borderColor: t.colors.border,
        ...t.shadows.button,
    },
    writeTitle: {
        ...t.typography.cardTitle,
        fontSize: 17,
        marginBottom: 4,
    },
    writeHint: {
        ...t.typography.caption,
        marginBottom: 12,
    },
    writeInput: {
        height: t.input.height,
        backgroundColor: t.colors.input,
        borderWidth: 1,
        borderColor: t.colors.inputBorder,
        borderRadius: t.radius.input,
        paddingHorizontal: 14,
        fontSize: 16,
        color: t.colors.inputText,
        marginBottom: 12,
    },
    writeButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    writeAction: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: t.radius.button,
    },
    writeCancel: {
        backgroundColor: t.colors.buttonSecondary,
        borderWidth: 1,
        borderColor: t.colors.buttonSecondaryBorder,
    },
    writeCancelText: {
        ...t.typography.cardTitle,
        fontSize: 15,
        color: t.colors.onButtonSecondary,
    },
    writeUse: {
        backgroundColor: t.colors.button,
        overflow: 'hidden',
        ...t.shadows.button,
    },
    writeUseText: {
        ...t.typography.buttonPrimary,
        fontSize: 15,
    },
}));
