// FurInventory Pro - Scanner Screen
import React, { useState, useEffect } from 'react';
import { View, Pressable, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from '../navigation/compat';
import * as ImagePicker from '../lib/imagePicker';
import * as ImageManipulator from '../lib/imageManipulator';
import * as FileSystem from '../lib/fileSystem';
import { decodeBarcodeImage } from '../../utils/barcodeDecoder';
import { useInventory } from '../../contexts/InventoryContext';
import { useLocations } from '../../contexts/LocationsContext';
import { soundService } from '../../services/SoundService';
import { useAutomations } from '../../contexts/AutomationsContext';
import { AppIcon } from '../../components/ui/AppIcon';
import { Text, TextInput } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';
import { withAlpha } from '../../utils/color';
import { Backdrop } from '../../components/ui/Backdrop';
import { GradientFill } from '../../components/ui/GradientFill';

export default function ScannerScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { products, scanProduct, libraries } = useInventory();
  const { locations } = useLocations();
  const { getAutomationByQR } = useAutomations();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorTimeoutRef, setErrorTimeoutRef] = React.useState<number | null>(null);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    // Clear any pending error
    if (errorTimeoutRef) {
      clearTimeout(errorTimeoutRef);
      setErrorTimeoutRef(null);
    }

    // 1. Try Product
    const product = products.find((p) => p.sku === data || p.id === data);
    if (product) {
      setScanned(true);
      
      // Fragile check logic
      if (product.isFragile) {
        soundService.playSuccess().then(() => soundService.playFragileAlert());
      } else {
        soundService.playSuccess();
      }
      
      router.push({
        pathname: '/scanner-action',
        params: { type: 'product', id: product.id },
      });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // 2. Try Location
    const location = locations.find((l) => l.barcode === data || l.id === data);
    if (location) {
      setScanned(true);
      soundService.playSuccess();
      router.push({
        pathname: '/scanner-action',
        params: { type: 'location', id: location.id },
      });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // 3. Try Library (Folder)
    const library = libraries.find((l) => l.barcode === data || l.id === data);
    if (library) {
      setScanned(true);
      soundService.playSuccess();
      router.push({
        pathname: '/scanner-action',
        params: { type: 'library', id: library.id },
      });
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // 4. Try Custom Automation (AUTO:xxx)
    if (data.startsWith('AUTO:')) {
      const automation = getAutomationByQR(data);
      if (automation) {
        setScanned(true);
        soundService.playSuccess();
        router.push({ pathname: '/automations/custom-runner', params: { id: automation.id } } as any);
        setTimeout(() => setScanned(false), 2000);
        return;
      }
    }

    // 5. Not Found - Delay error by 400ms to allow immediate valid scan
    const timeout = setTimeout(() => {
      setScanned(true);
      soundService.playBlockingError();
      Alert.alert(
        'Codice Non Riconosciuto',
        `Codice scansionato: ${data}\n\nNessun prodotto, posizione o cartella corrisponde a questo codice.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setErrorTimeoutRef(null);
            },
          },
        ]
      );
    }, 400);
    setErrorTimeoutRef(timeout);
  };

  const handleManualSearch = () => {
    if (!manualCode.trim()) {
      Alert.alert('Errore', 'Inserisci un codice valido');
      return;
    }

    // Find product by SKU or ID
    const product = products.find((p) =>
      p.sku.toLowerCase() === manualCode.trim().toLowerCase() ||
      p.id === manualCode.trim()
    );

    setShowManualInput(false);
    setManualCode('');

    if (product) {
      scanProduct(product.id);
      router.push({
        pathname: '/scanner-action',
        params: { productId: product.id },
      });
    } else {
      Alert.alert(
        'Prodotto Non Trovato',
        `Codice inserito: ${manualCode}\n\nNessun prodotto corrisponde a questo codice.`,
        [{ text: 'OK' }]
      );
    }
  };

  const pickQRImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso Negato', 'Abilita accesso alla galleria nelle impostazioni');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;

        // Start loading state
        setIsAnalyzing(true);

        try {
          console.log('🔍 Starting barcode detection from gallery image');

          // Convert original image to base64 (decoder will handle optimization)
          const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });

          console.log('✅ Image converted to base64, length:', base64.length);

          // Use enhanced multi-API decoder with automatic preprocessing
          const decodeResult = await decodeBarcodeImage(base64, imageUri);

          if (decodeResult.success && decodeResult.data) {
            const scannedCode = decodeResult.data;
            console.log(`🎉 Barcode decoded successfully (${decodeResult.source}):`, scannedCode);

            // Find product by code
            const product = products.find((p) =>
              p.sku.toLowerCase() === scannedCode.toLowerCase() ||
              p.id === scannedCode
            );

            if (product) {
              scanProduct(product.id);
              router.push({
                pathname: '/scanner-action',
                params: { productId: product.id },
              });
            } else {
              console.log('⚠️  No product matches the scanned code');
              Alert.alert(
                'Prodotto Non Trovato',
                `Codice scansionato: ${scannedCode}\n\nNessun prodotto corrisponde a questo codice.`,
                [
                  {
                    text: 'Inserisci Manualmente',
                    onPress: () => {
                      setManualCode(scannedCode);
                      setShowManualInput(true);
                    },
                  },
                  {
                    text: 'OK',
                    onPress: () => setScanned(false),
                  },
                ]
              );
            }
          } else {
            console.log('❌ Failed to decode any barcode/QR code from image');
            Alert.alert(
              'Nessun Codice Trovato',
              decodeResult.error || 'Non ho trovato nessun QR code o barcode nell\'immagine.',
              [
                { text: 'Riprova', onPress: () => pickQRImage() },
                { text: 'Inserisci Manualmente', onPress: () => setShowManualInput(true) },
                { text: 'Annulla', style: 'cancel' },
              ]
            );
          }
        } catch (error) {
          console.error('💥 FATAL ERROR in pickQRImage:', error);
          Alert.alert(
            'Errore di Analisi',
            `Si è verificato un errore durante l\'analisi dell\'immagine.\n\n${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
            [
              { text: 'Riprova', onPress: () => pickQRImage() },
              { text: 'Inserisci Manualmente', onPress: () => setShowManualInput(true) },
            ]
          );
        } finally {
          setIsAnalyzing(false);
        }
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      setIsAnalyzing(false);
    }
  };


  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <Backdrop />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scanner QR/Barcode</Text>
        <Pressable
          style={styles.flashButton}
          onPress={() => setFlashOn(!flashOn)}
        >
          <AppIcon
            name={flashOn ? 'flash-on' : 'flash-off'}
            size={24}
            color={t.colors.accentInk}
          />
        </Pressable>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={flashOn}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
          }}
        >
          {/* Scanning Frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </CameraView>
      </View>

      <View style={styles.instructionsContainer}>
        <AppIcon name="center-focus-strong" size={48} color={t.colors.accentInk} />
        <Text style={styles.instructionsTitle}>
          Inquadra il codice QR o barcode
        </Text>
        <Text style={styles.instructionsText}>
          Posiziona il codice all'interno del riquadro{'\n'}
          La scansione avviene automaticamente
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <Pressable
          style={styles.actionButton}
          onPress={pickQRImage}
        >
          <AppIcon name="photo-library" size={20} color={t.colors.onButtonSecondary} />
          <Text style={styles.actionButtonText}>Importa da Galleria</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => setShowManualInput(true)}
        >
          <AppIcon name="keyboard" size={20} color={t.colors.onButtonSecondary} />
          <Text style={styles.actionButtonText}>Inserisci Manualmente</Text>
        </Pressable>
      </View>

      {/* Loading Modal */}
      <Modal
        visible={isAnalyzing}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={t.colors.accentInk} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Analisi Immagine</Text>
            <Text style={styles.modalSubtitle}>
              Sto analizzando il QR/Barcode...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Manual Input Modal */}
      <Modal
        visible={showManualInput}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowManualInput(false);
          setManualCode('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Inserisci Codice</Text>
            <Text style={styles.modalSubtitle}>
              Digita il codice SKU o barcode del prodotto
            </Text>

            <TextInput
              style={styles.modalInput}
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Es: SKU-001, 1234567890123"
              placeholderTextColor={t.colors.placeholder}
              autoFocus
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={handleManualSearch}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowManualInput(false);
                  setManualCode('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Annulla</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.modalButtonSearch]}
                onPress={handleManualSearch}
              >
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <AppIcon name="search" size={20} color={t.colors.onButton} />
                <Text style={styles.modalButtonTextSearch}>Cerca</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    ...t.typography.cardTitle,
    fontSize: 20,
  },
  flashButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    margin: 16,
    borderRadius: t.radius.card,
    overflow: 'hidden',
    backgroundColor: t.colors.cameraBackground,
  },
  camera: {
    flex: 1,
  },
  scanFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Angoli del riquadro sopra la fotocamera: bianco fisso, leggibile in tutti gli stili
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: t.colors.onData,
  },
  cornerTopLeft: {
    top: '25%',
    left: '15%',
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: '25%',
    right: '15%',
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: '25%',
    left: '15%',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: '25%',
    right: '15%',
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  instructionsTitle: {
    ...t.typography.cardTitle,
    fontSize: 18,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    ...t.typography.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: t.colors.buttonSecondary,
    borderRadius: t.radius.button,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  actionButtonText: {
    ...t.typography.cardTitle,
    fontSize: 14,
    color: t.colors.onButtonSecondary,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    ...t.typography.cardTitle,
    fontSize: 24,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    ...t.typography.caption,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: t.colors.button,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: t.radius.button,
    overflow: 'hidden',
    ...t.shadows.button,
  },
  permissionButtonText: {
    ...t.typography.buttonPrimary,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: withAlpha(t.colors.shadow, 0.75),
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Finestra sopra il velo: fondo opaco
  modalContent: {
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.card,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  modalTitle: {
    ...t.typography.cardTitle,
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...t.typography.caption,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalInput: {
    height: t.input.height,
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.input,
    paddingHorizontal: 16,
    fontSize: 16,
    color: t.colors.inputText,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: t.radius.button,
  },
  modalButtonCancel: {
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
  },
  modalButtonSearch: {
    backgroundColor: t.colors.button,
    overflow: 'hidden',
    ...t.shadows.button,
  },
  modalButtonTextCancel: {
    ...t.typography.cardTitle,
    fontSize: 15,
    color: t.colors.onButtonSecondary,
  },
  modalButtonTextSearch: {
    ...t.typography.buttonPrimary,
    fontSize: 15,
  },
}));
