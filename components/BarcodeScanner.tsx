import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Button, Dimensions } from 'react-native';
import { CameraView, Camera } from '../src/lib/camera';
import { AppIcon } from './ui/AppIcon';
import { Text } from './ui/Text';
import { makeStyles } from '../contexts/ThemeContext';
import { withAlpha } from '../utils/color';

interface BarcodeScannerProps {
    onScan: (result: { type: string; data: string }) => void;
    onClose: () => void;
    delay?: number;
}

export default function BarcodeScanner({ onScan, onClose, delay = 2000 }: BarcodeScannerProps) {
    const styles = useStyles();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        const getPermissions = async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        };

        getPermissions();
    }, []);

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned) return;
        setScanned(true);
        // Add a small delay to prevent multiple swift scans
        onScan({ type, data });
        // Reset scanned state after a delay if needed by parent
        setTimeout(() => setScanned(false), delay);
    };

    if (hasPermission === null) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Richiesta permessi fotocamera...</Text>
            </View>
        );
    }
    if (hasPermission === false) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Nessun accesso alla fotocamera</Text>
                <Button title={'Consenti Fotocamera'} onPress={() => Camera.requestCameraPermissionsAsync()} />
                <Pressable style={styles.closeButton} onPress={onClose}>
                    <AppIcon name="close" size={32} color="#FFF" />
                </Pressable>
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
                <Text style={styles.instructions}>Inquadra il codice</Text>
                <Pressable style={styles.closeRoundButton} onPress={onClose}>
                    <AppIcon name="close" size={32} color="#FFF" />
                </Pressable>
            </View>
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
    text: {
        color: '#FFF',
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
        color: '#FFF',
        fontSize: 16,
        marginBottom: 20,
        backgroundColor: t.colors.scrimStrong,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    closeButton: {
        marginTop: 20,
    },
    closeRoundButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: t.colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    // Corner markers
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: t.colors.accent },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: t.colors.accent },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: t.colors.accent },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: t.colors.accent },
}));
