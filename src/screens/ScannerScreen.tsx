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
import { useCodeReader } from '../../hooks/useCodeReader';
import type { CodeRef, CodeResult } from '../../utils/codes';
import { soundService } from '../../services/SoundService';
import { AppIcon } from '../../components/ui/AppIcon';
import { Text, TextInput } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';
import { withAlpha } from '../../utils/color';
import { Backdrop } from '../../components/ui/Backdrop';
import { GradientFill } from '../../components/ui/GradientFill';
// N1 (ticket 16, 22): la fotocamera solo se Scanner e NFC la vuole. 26/11: l'NFC si ascolta da solo con lo Scanner
// aperto (anche insieme alla fotocamera, «Tutti e due»): niente più pulsante «Leggi un tag» qui
import { useHardwareConfig } from '../../contexts/HardwareConfigContext';
import { useNfcListen } from '../../hooks/useNfcListen';
import { useNfcUsable } from '../../hooks/useNfcUsable';
import type { NfcTagEvent } from '../../utils/nfcCore';
import { readerSources, readStep } from '../../utils/nfcTag';

// 26/11: sul telefono di prova (Samsung) con la fotocamera accesa il sistema spegne la lettura NFC («active polling is
// forced to disable now» nel log): con «Tutti e due» lo Scanner ha due modi, Fotocamera e NFC; in NFC la fotocamera si
// spegne e il tag si legge da solo. Il modo scelto resta finché l'app è aperta.
type ScanTab = 'camera' | 'nfc';
let lastTab: ScanTab = 'camera';

export default function ScannerScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { products, scanProduct } = useInventory();
  const { read, choose, name, sources } = useCodeReader();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // N1: lettori secondo Scanner e NFC (sul web e senza NFC sempre la fotocamera, NG11)
  const { hwConfig } = useHardwareConfig();
  const reader = readerSources(hwConfig.scanMode, useNfcUsable());
  const both = reader.camera && reader.nfc;
  const [tab, setTabState] = useState<ScanTab>(lastTab);
  const setTab = (next: ScanTab) => { lastTab = next; setTabState(next); };
  const showCamera = reader.camera && (!both || tab === 'camera');
  const listenNfc = reader.nfc && (!both || tab === 'nfc');
  const [errorTimeoutRef, setErrorTimeoutRef] = React.useState<number | null>(null);

  // COD (ticket 22): fotocamera, «Inserisci Manualmente» e immagine dalla galleria passano tutte dal lettore unico
  // (`utils/codes.ts`): link GS1 (anche vecchi o con un altro dominio), SKU senza maiuscole, codici e tag di posizioni,
  // scaffali e categorie, `AUTO:`. Le tre strade aprono le stesse cose; i suoni restano della fotocamera e della foto.
  const openRef = (ref: CodeRef, withSound: boolean) => {
    if (ref.kind === 'product') {
      const product = products.find((p) => p.id === ref.id);
      if (withSound) {
        // Fragile check logic
        if (product?.isFragile) soundService.playSuccess().then(() => soundService.playFragileAlert());
        else soundService.playSuccess();
      }
      // «scansionato» in cronologia anche dalla fotocamera, come a mano (P26)
      scanProduct(ref.id);
      router.push({ pathname: '/scanner-action', params: { type: 'product', id: ref.id } });
      return;
    }
    if (withSound) soundService.playSuccess();
    if (ref.kind === 'automation') {
      router.push({ pathname: '/automations/custom-runner', params: { id: ref.id } } as any);
      return;
    }
    router.push({ pathname: '/scanner-action', params: { type: ref.kind === 'category' ? 'library' : ref.kind, id: ref.id } });
  };

  // Un risultato del lettore che non è «sconosciuto»: apre, rifiuta il cestino o chiede quale (mai il primo a caso)
  const answer = (result: CodeResult, withSound: boolean) => {
    if (result.status === 'trashed') {
      // Un prodotto nel cestino non si apre per spostarlo o venderlo (P06)
      if (withSound) soundService.playBlockingError();
      Alert.alert('Nel cestino', `${name(result)} è nel cestino: ripristinalo da Impostazioni › Cestino.`);
    } else if (result.status === 'ambiguous') {
      choose(result.candidates, (ref) => openRef(ref, withSound));
    } else if (result.status === 'found') {
      openRef(result, withSound);
    }
  };

  const NOT_FOUND = 'Nessun prodotto, posizione, categoria o scaffale corrisponde a questo codice.';

  const handleBarCodeScanned = ({ data }: { type: string; data: string }) => {
    if (scanned) return;

    // Clear any pending error
    if (errorTimeoutRef) {
      clearTimeout(errorTimeoutRef);
      setErrorTimeoutRef(null);
    }

    const result = read(data);
    if (result.status !== 'unknown') {
      setScanned(true);
      answer(result, true);
      setTimeout(() => setScanned(false), 2000);
      return;
    }

    // Not Found - Delay error by 400ms to allow immediate valid scan
    const timeout = setTimeout(() => {
      setScanned(true);
      soundService.playBlockingError();
      Alert.alert(
        'Codice Non Riconosciuto',
        `Codice scansionato: ${data}\n\n${NOT_FOUND}`,
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
    const code = manualCode.trim();
    if (!code) {
      Alert.alert('Errore', 'Inserisci un codice valido');
      return;
    }

    setShowManualInput(false);
    setManualCode('');

    // Prima cercava solo i prodotti; ora trova anche posizioni, scaffali, categorie e automazioni (resto di S1a)
    const result = read(code);
    if (result.status === 'unknown') {
      Alert.alert('Codice Non Riconosciuto', `Codice inserito: ${code}\n\n${NOT_FOUND}`, [{ text: 'OK' }]);
      return;
    }
    answer(result, false);
  };

  // N1 (NG16): il codice del tag (UID collegato, poi il testo) passa dal lettore unico come ogni altro codice
  const handleTagRead = (code: string) => {
    const result = read(code);
    if (result.status === 'unknown') {
      soundService.playBlockingError();
      Alert.alert('Codice Non Riconosciuto', `Tag letto: ${code}\n\n${NOT_FOUND}`, [{ text: 'OK' }]);
      return;
    }
    answer(result, true);
  };

  // Tag avvicinato con lo Scanner aperto: UID collegato o testo del tag, poi come un codice della fotocamera
  const handleTag = (tag: NfcTagEvent) => {
    const step = readStep(tag, sources);
    if (step.kind === 'nothing') {
      soundService.playBlockingError();
      Alert.alert('Tag letto', step.text, [{ text: 'OK' }]);
      return;
    }
    handleTagRead(step.code);
  };
  const nfcListen = useNfcListen(listenNfc, handleTag);
  const nfcLine = nfcListen === 'spento' ? 'NFC spento: accendilo da Impostazioni › Scanner e NFC'
    : nfcListen === 'assente' ? 'Questo telefono non ha l\'NFC'
      : 'NFC attivo: avvicina un tag al telefono';

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

            const result = read(scannedCode);
            if (result.status !== 'unknown') {
              answer(result, true);
            } else {
              console.log('⚠️  No code matches the scanned image');
              Alert.alert(
                'Codice Non Riconosciuto',
                `Codice scansionato: ${scannedCode}\n\n${NOT_FOUND}`,
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
        {/* IND-P4 (ticket 28): X che torna da dove si era (Automazioni; da un indirizzo la scheda madre di C2) */}
        <Pressable style={styles.closeButton} onPress={() => router.back()} accessibilityLabel="Chiudi" hitSlop={8}>
          <AppIcon name="close" size={24} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Scanner QR/Barcode</Text>
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

      {both ? (
        <View style={styles.segments} accessibilityRole="radiogroup">
          {([['camera', 'Fotocamera', 'photo-camera'], ['nfc', 'NFC', 'nfc']] as const).map(([id, label, icon]) => {
            const active = tab === id;
            return (
              <Pressable
                key={id}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setTab(id)}
                accessibilityRole="radio"
                aria-checked={active}
                accessibilityLabel={`Leggi con ${label}`}
              >
                {active && <GradientFill gradient={t.gradients.chipActive} style={{ borderRadius: t.radius.chip }} />}
                <AppIcon name={icon} size={18} color={active ? t.colors.chipActiveText : t.colors.chipText} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.cameraContainer}>
        {showCamera ? (
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
        ) : (
          <View style={[styles.camera, styles.tagPanel]}>
            <AppIcon name="nfc" size={64} color={t.colors.onData} />
          </View>
        )}
      </View>

      <View style={styles.instructionsContainer}>
        {showCamera ? (
          <>
        <AppIcon name="center-focus-strong" size={48} color={t.colors.accentInk} />
        <Text style={styles.instructionsTitle}>
          Inquadra il codice QR o barcode
        </Text>
        <Text style={styles.instructionsText}>
          Posiziona il codice all'interno del riquadro{'\n'}
          La scansione avviene automaticamente
        </Text>
          </>
        ) : (
          <Text style={styles.instructionsTitle}>Avvicina il tag al telefono</Text>
        )}
        {both && tab === 'camera' ? (
          <Text style={[styles.instructionsText, { marginTop: 12 }]}>Per i tag NFC tocca «NFC» qui sopra: con la fotocamera accesa il telefono non li legge</Text>
        ) : null}
        {listenNfc ? (
          <View style={styles.nfcLine} accessibilityLiveRegion="polite">
            <AppIcon name="nfc" size={18} color={nfcListen === 'spento' || nfcListen === 'assente' ? t.colors.textMuted : t.colors.accentInk} />
            <Text style={styles.nfcLineText}>{nfcLine}</Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {reader.camera ? (
        <Pressable
          style={styles.actionButton}
          onPress={pickQRImage}
        >
          <AppIcon name="photo-library" size={20} color={t.colors.onButtonSecondary} />
          <Text style={styles.actionButtonText}>Importa da Galleria</Text>
        </Pressable>
        ) : null}

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
              Codice, SKU o link di un prodotto, di una posizione, di uno scaffale o di una categoria
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
  closeButton: {
    marginRight: 16,
  },
  headerTitle: {
    ...t.typography.cardTitle,
    flex: 1,
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
  // N1: «NFC» in Scanner e NFC: al posto della fotocamera il segno del tag
  tagPanel: {
    alignItems: 'center',
    justifyContent: 'center',
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
  segments: {
    flexDirection: 'row',
    gap: 6,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: t.radius.chip,
    backgroundColor: t.colors.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: t.radius.chip,
    overflow: 'hidden',
  },
  segmentActive: {
    backgroundColor: t.colors.chipActive,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: t.colors.chipText,
  },
  segmentTextActive: {
    color: t.colors.chipActiveText,
  },
  nfcLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  nfcLineText: {
    ...t.typography.caption,
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
