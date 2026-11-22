// SyncroFlow — TeamScreen (Bare RN 0.81.5) — Network & Mesh Integration
// Accesso Multi-Utente UI separata da Chat — Bare RN universale, nessun brand device
// SafeArea edges top+bottom, theme #0A0A0A/#D4AF37, sezione TEAM E ACCESSO
// Host: QR ws://IP:PORT?token=ROOM via react-native-qrcode-svg
// Client: scanner QR universale expo-camera (funziona su qualsiasi Android/iOS)
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from '../../navigation/compat';
import useMeshRole from '../../hooks/useMeshRole';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { withAlpha } from '../../../utils/color';

// ---------------------------------------------------------------------------
// Scanner universale — expo-camera (funziona su qualsiasi Android/iOS, no S25 specifico)
// ---------------------------------------------------------------------------
const Camera: any = CameraView;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TeamScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const {
    role,
    isHost,
    isClient,
    isConnected,
    syncStatus,
    roomToken,
    wsUrl,
    qrPayload,
    setRole,
    createHost,
    joinWithPayload,
    syncNow,
    sendLightPayload,
    disconnect,
  } = useMeshRole();

  // local toggle — indipendente da role mesh per evitare flash Host
  const [mode, setMode] = useState<'host' | 'client'>('host');
  const [hostLoading, setHostLoading] = useState(false);
  const [manualPayload, setManualPayload] = useState('');
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const camPerm: any = permission ? { hasPermission: permission.granted, requestPermission } : { hasPermission: false, requestPermission: async () => false };
  // QR effimero TTL 120s + countdown + lista dispositivi presenza
  const [qrCreatedAt, setQrCreatedAt] = useState<number | null>(null);
  const [qrExpiresIn, setQrExpiresIn] = useState(120);
  const [connectedDevices, setConnectedDevices] = useState<Array<{ id: string; name: string; ip: string; role: string; online: boolean; lastSeen: string }>>([]);

  // Host: genera QR una sola volta all'entrata in host — con TTL effimero 120s
  useEffect(() => {
    if (mode === 'host' && !qrPayload && !hostLoading) {
      (async () => {
        setHostLoading(true);
        const room = await createHost();
        setHostLoading(false);
        if (room) {
          setQrCreatedAt(Date.now());
          setQrExpiresIn(120);
          // mock presenza: host stesso
          setConnectedDevices([{ id: 'host', name: 'Questo dispositivo (Host)', ip: room.ip, role: 'admin', online: true, lastSeen: new Date().toLocaleTimeString() }]);
        }
      })();
    }
  }, [mode, qrPayload]);
  // countdown QR effimero
  useEffect(() => {
    if (!qrCreatedAt || mode !== 'host') return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - qrCreatedAt) / 1000);
      const left = Math.max(0, 120 - elapsed);
      setQrExpiresIn(left);
      if (left === 0) {
        // QR scaduto — rigenera automatico
        setQrCreatedAt(null);
        // trigger rigenerazione
        (async () => { setHostLoading(true); const room = await createHost(); setHostLoading(false); if(room){ setQrCreatedAt(Date.now()); setQrExpiresIn(120);} })();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [qrCreatedAt, mode]);
  // Presenza dei peer che hanno completato l’handshake mesh.
  useEffect(() => {
    let id: any = null;
    const poll = async () => {
      try {
        const ms: any = require('../../services/meshServer');
        const info = ms?.getMeshServerInfo?.();
        const peers = info?.authenticatedClients ?? [];
        const modeHost = mode === 'host';
        // Host: mostra se stesso + clients
        if (modeHost) {
          const base: any[] = [{ id: 'host', name: 'Questo dispositivo (Host)', ip: qrPayload ? new URL(qrPayload).hostname : '—', role: 'admin', online: true, lastSeen: new Date().toLocaleTimeString() }];
          for (const [index, peer] of peers.entries()) {
            base.push({ id: peer.id, name: `Dispositivo ${index + 1}`, ip: peer.address, role: 'client', online: true, lastSeen: new Date().toLocaleTimeString() });
          }
          if (JSON.stringify(base.map(b=>b.id)) !== JSON.stringify(connectedDevices.map(c=>c.id))) {
            setConnectedDevices(base);
          } else {
            setConnectedDevices(prev => prev.map(d => ({ ...d, lastSeen: new Date().toLocaleTimeString() })));
          }
        } else {
          // Client: mostra host + se stesso
          if (isConnected && roomToken) {
            const hostIp = wsUrl ? new URL(wsUrl).hostname : 'host';
            const list: any[] = [
              { id: 'host', name: `Host ${hostIp}`, ip: hostIp, role: 'host', online: true, lastSeen: new Date().toLocaleTimeString() },
              { id: 'self', name: 'Questo dispositivo (Client)', ip: 'locale', role: 'editor', online: true, lastSeen: new Date().toLocaleTimeString() },
            ];
            if (JSON.stringify(list.map(l=>l.id)) !== JSON.stringify(connectedDevices.map(c=>c.id))) setConnectedDevices(list);
          }
        }
      } catch {}
    };
    poll();
    id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [mode, isConnected, qrPayload, wsUrl, roomToken, syncStatus]);

  const handleCreateHost = useCallback(async () => {
    setHostLoading(true);
    const room = await createHost();
    setHostLoading(false);
    if (!room) Alert.alert('Errore', 'Impossibile creare stanza Host (LAN non raggiungibile)');
    else {
      setQrCreatedAt(Date.now());
      setQrExpiresIn(120);
      setConnectedDevices([{ id: 'host', name: 'Questo dispositivo (Host)', ip: room.ip, role: 'admin', online: true, lastSeen: new Date().toLocaleTimeString() }]);
    }
  }, [createHost]);

  const handleJoin = useCallback(
    async (payload: string, skipConfirm = false) => {
      const v = payload.trim();
      if (!v) {
        Alert.alert('QR mancante', 'Inquadra un QR o incolla ws://IP:PORT?token=ROOM');
        return;
      }
      const tryJoin = async (p: string) => {
        setIsScanning(false);
        setScannedValue(p);
        const info = await joinWithPayload(p);
        if (info) {
          setConnectedDevices(prev => [...prev, { id: `client-${Date.now()}`, name: `Host ${info.ip}`, ip: info.ip, role: 'host', online: true, lastSeen: new Date().toLocaleTimeString() }]);
          Alert.alert('Connesso', `Pairing verificato con ${info.ip}:${info.port}. La sincronizzazione è stata avviata.`);
          return true;
        }
        return false;
      };
      // Conferma esplicita prima di associare
      if (!skipConfirm) {
        let parsed: any = null;
        try { const u = new URL(v); parsed = { ip: u.hostname, port: u.port || '8080' }; } catch {}
        return new Promise<void>((resolve) => {
          Alert.alert(
            'Confermi associazione?',
            `Vuoi connetterti a:\nHost: ${parsed?.ip ?? 'indirizzo non leggibile'}:${parsed?.port ?? ''}\n\nI dispositivi condivideranno i dati supportati sulla rete locale dopo il pairing.`,
            [
              { text: 'Annulla', style: 'cancel', onPress: () => resolve() },
              { text: 'Connetti', onPress: async () => {
                // prova prima payload originale, se fallisce prova alternativa 10.0.2.2 per emulatori
                let ok = await tryJoin(v);
                if (!ok && v.includes('10.0.2.')) {
                  const alt = v.replace(/10\.0\.2\.\d+/, '10.0.2.2');
                  if (alt !== v) {
                    console.log('[TeamScreen] retry con indirizzo alternativo per emulatore');
                    ok = await tryJoin(alt);
                  }
                }
                if (!ok) Alert.alert('Connessione fallita', 'Verifica di essere sulla stessa LAN isolata (Mercusys) e riprova. Per 2 emulatori: adb -s emulator-5554 forward tcp:8080 tcp:8080');
                resolve();
              }},
            ]
          );
        });
      }
      let ok = await tryJoin(v);
      if (!ok && v.includes('10.0.2.')) {
        const alt = v.replace(/10\.0\.2\.\d+/, '10.0.2.2');
        if (alt !== v) ok = await tryJoin(alt);
      }
      if (!ok) Alert.alert('Connessione fallita', 'Verifica di essere sulla stessa LAN isolata (Mercusys) e riprova. Per 2 emulatori: adb -s emulator-5554 forward tcp:8080 tcp:8080');
    },
    [joinWithPayload]
  );

  // expo-camera barcode handler universale — con conferma
  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (!data || scannedValue === data) return;
    handleJoin(data, false);
  }, [scannedValue, handleJoin]);

  const handleManualJoin = useCallback(() => {
    handleJoin(manualPayload, false);
  }, [handleJoin, manualPayload]);

  const handleTestPayload = useCallback(async () => {
    try {
      await sendLightPayload({ skus: ['SKU-DEMO-001'], automationIds: [], text: 'Ciao dal mesh LAN' });
      Alert.alert('Payload inviato', 'Inoltrato ai dispositivi accoppiati.');
    } catch {
      Alert.alert('Invio non riuscito', 'Verifica che il pairing mesh sia ancora attivo e riprova.');
    }
  }, [sendLightPayload]);

  const requestCamPerm = useCallback(async () => {
    try {
      const res = await requestPermission();
      if (!res.granted) Alert.alert('Permesso negato', 'Abilita la fotocamera nelle impostazioni.');
      return res.granted;
    } catch { return false; }
  }, [requestPermission]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <Backdrop />
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <AppIcon name="arrow-back" size={24} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Team & Accesso</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* TEAM E ACCESSO */}
        <Text style={styles.sectionTitle}>Team e accesso</Text>
        <Text style={styles.sectionDesc}>
          Condividi i dati supportati sulla rete locale tramite pairing temporaneo. Host genera un QR e il client lo scansiona per avviare la sincronizzazione.
        </Text>

        {/* placeholder router.push richiesto */}
        <Pressable
          style={styles.linkRow}
          onPress={() => (router as any).push('/chat' as any)}
        >
          <AppIcon name="chat-bubble-outline" size={18} color={t.colors.accentInk} />
          <Text style={styles.linkText}>Apri Chat Team (placeholder router.push)</Text>
          <AppIcon name="chevron-right" size={20} color={t.colors.textSecondary} />
        </Pressable>

        {/* Host vs Client toggle — fix flash: mode indipendente, niente sync role→mode */}
        <View style={styles.segment}>
          <Pressable
            style={[styles.segBtn, mode === 'host' && styles.segBtnActive]}
            onPress={() => {
              setMode('host');
              // non forzare setRole se già host, evita poll flash
              if (role !== 'host') setRole('host');
              setIsScanning(false);
            }}
          >
            <AppIcon name="qr-code-2" size={18} color={mode === 'host' ? t.colors.accentInk : t.colors.textSecondary} />
            <Text style={[styles.segText, mode === 'host' && styles.segTextActive]}>Host (Genera QR)</Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, mode === 'client' && styles.segBtnActive]}
            onPress={() => {
              setMode('client');
              if (role !== 'client') setRole('client');
              setIsScanning(false);
            }}
          >
            <AppIcon name="qr-code-scanner" size={18} color={mode === 'client' ? t.colors.accentInk : t.colors.textSecondary} />
            <Text style={[styles.segText, mode === 'client' && styles.segTextActive]}>Client (Scansiona)</Text>
          </Pressable>
        </View>

        {/* Stato connessione — generico, offline/online coerente */}
        <View style={styles.statusCard}>
          <View style={[styles.dot, { backgroundColor: isConnected ? t.colors.success : mode === 'host' ? t.colors.warning : t.colors.textMuted }]} />
          <Text style={styles.statusText}>
            {isConnected ? 'Connesso LAN' : mode === 'host' ? 'Host pronto — in attesa client' : 'Non connesso — in attesa scansione'} • Sync: {isConnected ? (syncStatus === 'synced' ? 'sincronizzato' : syncStatus === 'syncing' ? 'in corso' : 'pronto') : 'pronto'}
            {(isConnected || mode === 'host') && roomToken ? ` • ROOM ${roomToken}` : ''}
          </Text>
          {isConnected && (
            <Pressable onPress={disconnect} style={styles.disconnectBtn}>
              <Text style={styles.disconnectText}>Disconnetti</Text>
            </Pressable>
          )}
        </View>

        {/* ========== HOST ========== */}
        {mode === 'host' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AppIcon name="hub" size={20} color={t.colors.accentInk} />
              <Text style={styles.cardTitle}>Host — Genera QR LAN</Text>
            </View>
            <Text style={styles.cardDesc}>
              Mostra questo QR al Client sulla stessa rete Mercusys. Payload:{' '}
              <Text style={{ color: t.colors.accentInk }}>ws://IP:PORT?token=ROOM</Text> (IP locale auto).
            </Text>

            {hostLoading ? (
              <View style={styles.qrLoading}>
                <ActivityIndicator color={t.colors.accentInk} />
                <Text style={styles.muted}>Generazione stanza...</Text>
              </View>
            ) : qrPayload ? (
              <>
                <View style={styles.qrWrap}>
                  <View style={styles.qrBox}>
                    <QRCode value={qrPayload} size={200} color={t.colors.qrInk} backgroundColor={t.colors.qrPaper} />
                  </View>
                  <Text style={styles.qrPayload} selectable>
                    {qrPayload}
                  </Text>
                  <Text style={[styles.qrHint, qrExpiresIn < 20 && { color: t.colors.error, fontWeight: '700' }]}>
                    {qrExpiresIn > 0 ? `QR effimero — scade in ${qrExpiresIn}s (uso singolo, rigenerazione automatica)` : 'QR scaduto — rigenerazione...'}
                  </Text>
                  <View style={styles.qrProgressTrack}>
                    <View style={[styles.qrProgressFill, { width: `${(qrExpiresIn/120)*100}%`, backgroundColor: qrExpiresIn < 20 ? t.colors.error : t.colors.accent }]} />
                  </View>
                </View>

                <View style={styles.rowGap}>
                  <Pressable style={styles.primaryBtn} onPress={handleCreateHost}>
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <AppIcon name="refresh" size={18} color={t.colors.onButton} />
                    <Text style={styles.primaryBtnText}>Rigenera QR</Text>
                  </Pressable>
                  <Pressable style={styles.secondaryBtn} onPress={handleTestPayload}>
                    <AppIcon name="send" size={18} color={t.colors.onButtonSecondary} />
                    <Text style={styles.secondaryBtnText}>Invia payload test</Text>
                  </Pressable>
                </View>

                {wsUrl && (
                  <Text style={styles.metaText}>
                    WS URL: {wsUrl} {'\n'}Token: {roomToken} {'\n'}Stato: {syncStatus} {isConnected ? '● connesso' : '○ in attesa Client'}
                  </Text>
                )}
              </>
            ) : (
              <Pressable style={styles.primaryBtn} onPress={handleCreateHost}>
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                <AppIcon name="qr-code" size={20} color={t.colors.onButton} />
                <Text style={styles.primaryBtnText}>Genera QR Host</Text>
              </Pressable>
            )}

            <Pressable style={styles.rowBetween} onPress={() => syncNow({ fullResync: false })}>
              <Text style={styles.muted}>Host push delta</Text>
              <Text style={{ color: t.colors.accentInk, fontWeight: '700' }}>Sincronizza ora →</Text>
            </Pressable>
          </View>
        )}

        {/* ========== CLIENT ========== */}
        {mode === 'client' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <AppIcon name="phonelink" size={20} color={t.colors.accentInk} />
              <Text style={styles.cardTitle}>Client — Scanner QR universale</Text>
            </View>
            <Text style={styles.cardDesc}>
              Scanner compatibile con qualsiasi dispositivo Android/iOS. Inquadra il QR Host per connetterti alla LAN isolata e sincronizzare il database.
            </Text>

            {/* Expo Camera preview — universale */}
            <View style={styles.cameraWrap}>
              {!permission?.granted ? (
                <Pressable
                  style={styles.cameraPlaceholder}
                  onPress={async () => {
                    const res = await requestPermission();
                    if (!res.granted) Alert.alert('Permesso negato', 'Abilita la fotocamera nelle impostazioni.');
                  }}
                >
                  <AppIcon name="videocam-off" size={36} color={t.colors.textMuted} />
                  <Text style={styles.cameraPlaceholderTitle}>Permesso fotocamera richiesto</Text>
                  <Text style={styles.cameraPlaceholderDesc}>Tocca per autorizzare — funziona su qualsiasi telefono</Text>
                </Pressable>
              ) : !isScanning ? (
                <Pressable
                  style={styles.cameraPlaceholder}
                  onPress={() => setIsScanning(true)}
                >
                  <AppIcon name="qr-code-scanner" size={44} color={t.colors.accentInk} />
                  <Text style={styles.cameraPlaceholderTitle}>Avvia scanner QR</Text>
                  <Text style={styles.cameraPlaceholderDesc}>Universale • QR only • LAN isolata</Text>
                </Pressable>
              ) : (
                <View style={styles.cameraContainer}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={handleBarCodeScanned}
                  />
                  {/* overlay mirino */}
                  <View style={styles.scanOverlay} pointerEvents="none">
                    <View style={styles.scanFrame}>
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <Text style={styles.scanLabel}>Inquadra il QR Host</Text>
                  </View>
                  <Pressable style={styles.closeScan} onPress={() => setIsScanning(false)}>
                    <AppIcon name="close" size={22} color={t.colors.onData} />
                  </Pressable>
                </View>
              )}
            </View>

            {/* Manual fallback */}
            <Text style={styles.label}>Oppure incolla payload WS</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={manualPayload}
                onChangeText={setManualPayload}
                placeholder="ws://192.168.1.50:8080?token=0123456789ABCDEF"
                placeholderTextColor={t.colors.placeholder}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable style={styles.goBtn} onPress={handleManualJoin}>
                <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.input }} />
                <AppIcon name="login" size={20} color={t.colors.onButton} />
              </Pressable>
            </View>

            {scannedValue && (
              <View style={styles.scannedCard}>
                <AppIcon name="check-circle" size={18} color={t.colors.success} />
                <Text style={styles.scannedText} numberOfLines={2}>
                  Ultimo QR: {scannedValue}
                </Text>
              </View>
            )}

            <View style={styles.rowGap}>
              <Pressable style={styles.secondaryBtn} onPress={() => syncNow({ fullResync: true })}>
                <AppIcon name="sync" size={18} color={t.colors.onButtonSecondary} />
                <Text style={styles.secondaryBtnText}>Sincronizza ora</Text>
              </Pressable>
              <Pressable style={styles.secondaryBtn} onPress={handleTestPayload}>
                <AppIcon name="send" size={18} color={t.colors.onButtonSecondary} />
                <Text style={styles.secondaryBtnText}>Invia light payload</Text>
              </Pressable>
            </View>

            <Text style={styles.metaText}>
            Pairing via QR → WebSocket LAN autenticato → sincronizzazione dei delta supportati (prodotti, automazioni, timeline, chat e membri).
            </Text>
          </View>
        )}

        {/* Dispositivi nella stanza — sezione separata (non ammucchiata) */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <AppIcon name="devices" size={20} color={t.colors.accentInk} />
            <Text style={styles.cardTitle}>Dispositivi nella stanza ({connectedDevices.length})</Text>
          </View>
          <Text style={styles.cardDesc}>Presenza in tempo reale sulla rete locale. I dispositivi appaiono dopo il pairing con il QR della stanza.</Text>
          {connectedDevices.length === 0 ? (
            <Text style={styles.mutedSmall}>Nessun dispositivo connesso. Host in attesa, Client scansiona QR.</Text>
          ) : (
            connectedDevices.map(dev => (
              <View key={dev.id} style={styles.deviceRow}>
                <View style={[styles.deviceDot, { backgroundColor: dev.online ? t.colors.success : t.colors.textMuted }]} />
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{dev.name}</Text>
                  <Text style={styles.deviceMeta}>{dev.ip} • {dev.role} • ultimo: {dev.lastSeen}</Text>
                </View>
                <Text style={[styles.deviceStatus, { color: dev.online ? t.colors.success : t.colors.textMuted }]}>{dev.online ? 'Online' : 'Offline'}</Text>
              </View>
            ))
          )}
          <Text style={styles.mutedSmall}>Heartbeat ogni 5s • offline dopo 15s senza risposta • ultimo sync: {syncStatus}</Text>
        </View>

        {/* Info LAN isolata */}
        <View style={styles.infoCard}>
          <AppIcon name="security" size={20} color={t.colors.accentInk} />
          <Text style={styles.infoText}>
            Pairing protetto da token temporaneo. Il traffico WebSocket resta in chiaro: usa questa funzione solo su una rete locale privata e affidabile.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: 6, borderRadius: 20 },
  headerTitle: { color: t.colors.textPrimary, fontSize: 18, fontWeight: t.title.weight, letterSpacing: t.title.tracking },
  scrollContent: { padding: 16, paddingBottom: 28, gap: 14 },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    ...(t.section.line ? { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.section.line } : null),
  },
  sectionDesc: { color: t.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  linkRow: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkText: { flex: 1, color: t.colors.textPrimary, fontWeight: '600', fontSize: 13 },
  // Controllo a segmenti come il selettore dell'unità di Aggiungi (tela)
  segment: {
    flexDirection: 'row',
    backgroundColor: t.colors.input,
    borderRadius: t.radius.inputSmall,
    padding: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
  },
  segBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: t.radius.inputSmall,
  },
  segBtnActive: { backgroundColor: t.colors.accentSoft },
  segText: { color: t.colors.textSecondary, fontWeight: '500', fontSize: 13 },
  segTextActive: { color: t.colors.accentInk, fontWeight: '600' },
  statusCard: {
    ...cardSurface(t),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, color: t.colors.textSecondary, fontSize: 12, fontWeight: '600' },
  disconnectBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: t.radius.button, backgroundColor: t.colors.buttonSecondary, borderWidth: 1, borderColor: t.colors.buttonSecondaryBorder },
  disconnectText: { color: t.colors.onButtonSecondary, fontSize: 12, fontWeight: '600' },
  card: {
    ...cardSurface(t),
    padding: 16,
    gap: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { color: t.colors.textPrimary, fontSize: 15, fontWeight: t.weights.strong },
  cardDesc: { color: t.colors.textSecondary, fontSize: 13, lineHeight: 18 },
  qrLoading: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  muted: { color: t.colors.textSecondary, fontSize: 13 },
  mutedSmall: { color: t.colors.textMuted, fontSize: 11, textAlign: 'center' },
  qrWrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  qrBox: { backgroundColor: t.colors.qrPaper, padding: 14, borderRadius: t.radius.tile },
  qrPayload: { color: t.colors.accentInk, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  qrHint: { color: t.colors.textMuted, fontSize: 11, textAlign: 'center' },
  qrProgressTrack: { height: 4, backgroundColor: t.colors.borderLight, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  qrProgressFill: { height: 4, borderRadius: 2 },
  deviceListCard: { backgroundColor: t.colors.backgroundSecondary, borderRadius: 12, padding: 12, gap: 8, borderWidth: 1, borderColor: t.colors.borderLight, marginTop: 4 },
  deviceListHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deviceListTitle: { color: t.colors.textPrimary, fontSize: 12, fontWeight: '800', flex: 1 },
  deviceListSubtitle: { color: t.colors.textMuted, fontSize: 10, fontWeight: '600' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: t.colors.borderLight },
  deviceDot: { width: 8, height: 8, borderRadius: 4 },
  deviceInfo: { flex: 1, gap: 2 },
  deviceName: { color: t.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  deviceMeta: { color: t.colors.textMuted, fontSize: 10 },
  deviceStatus: { fontSize: 11, fontWeight: '700' },
  rowGap: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    backgroundColor: t.colors.button,
    paddingVertical: 12,
    borderRadius: t.radius.button,
    ...t.shadows.button,
    overflow: 'hidden',
  },
  primaryBtnText: { color: t.colors.onButton, fontWeight: '600', fontSize: 13 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    backgroundColor: t.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: t.colors.buttonSecondaryBorder,
    paddingVertical: 12,
    borderRadius: t.radius.button,
  },
  secondaryBtnText: { color: t.colors.onButtonSecondary, fontWeight: '600', fontSize: 13 },
  metaText: { color: t.colors.textMuted, fontSize: 11, lineHeight: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  // camera
  cameraWrap: { borderRadius: t.radius.tile, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.tileBorder },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: t.colors.tile,
  },
  cameraPlaceholderTitle: { color: t.colors.textPrimary, fontWeight: t.weights.strong, fontSize: 14, marginTop: 6 },
  cameraPlaceholderDesc: { color: t.colors.textSecondary, fontSize: 11, textAlign: 'center' },
  badge: { marginTop: 6, backgroundColor: withAlpha(t.colors.accent, 0.133), borderWidth: 1, borderColor: withAlpha(t.colors.accent, 0.333), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: t.colors.accentInk, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  cameraContainer: { height: 320, backgroundColor: t.colors.cameraBackground, position: 'relative' },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanFrame: { width: 220, height: 220, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: t.colors.accent },
  cornerTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  scanLabel: { color: t.colors.onData, fontWeight: '700', fontSize: 12, backgroundColor: withAlpha(t.colors.shadow, 0.55), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  closeScan: { position: 'absolute', top: 10, right: 10, backgroundColor: withAlpha(t.colors.shadow, 0.6), padding: 8, borderRadius: 999 },
  label: { fontSize: t.label.size, fontWeight: t.label.weight, color: t.label.color, lineHeight: 18, marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: t.input.height,
    backgroundColor: t.colors.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder,
    borderRadius: t.radius.input,
    paddingHorizontal: 14,
    color: t.colors.inputText,
    fontSize: 13,
  },
  goBtn: { width: t.input.height, height: t.input.height, borderRadius: t.radius.input, backgroundColor: t.colors.button, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scannedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.colors.successSurface,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.success, 0.267),
    borderRadius: t.radius.inputSmall,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scannedText: { flex: 1, color: t.colors.textPrimary, fontSize: 11, fontWeight: '600' },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: t.colors.accentSoft,
    borderWidth: 1,
    borderColor: withAlpha(t.colors.accent, 0.19),
    borderRadius: t.radius.card,
    padding: 12,
  },
  infoText: { flex: 1, color: t.colors.textSecondary, fontSize: 12, lineHeight: 16 },
}));
