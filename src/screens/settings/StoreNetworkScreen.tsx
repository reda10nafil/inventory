// Impostazioni › Persone e telefoni › Rete del negozio (RETE0, ticket 32; UX0 piano-fette «ACC1 e RETE0», R9 R13).
// Al posto di TeamScreen: semplice e onesta.
// - In cima lo stato in una riga, col pallino e il testo («Collegato al centro "Magazzino" · 3 telefoni online»,
//   «Il centro "Magazzino" non risponde da 2 min»): mai «pronto» se non lo è (AR02).
// - All'entrata non si sceglie nulla e non parte nulla (CT09): due grandi scelte, «Fai da centro del negozio» (spenta sul
//   web col motivo) e «Collegati a un centro» (leggi o scrivi il codice; un codice che non è della rete si rifiuta
//   prima della domanda, AR05; la domanda sta in pagina, non in una finestra).
// - I telefoni della rete: nome dato in Accesso, «online dalle 10:42» o «visto alle 10:40», pallino col testo.
// - Errori in parole sotto il blocco, niente indirizzi, porte o «Host» (AR06, R13). Il codice di accesso non si mostra
//   mai sul telefono che si collega.
// La connessione vive in `StoreNetworkContext`: uscire dalla schermata non cambia nulla.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from '../../navigation/compat';
import BarcodeScanner from '../../../components/BarcodeScanner';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { GradientFill } from '../../../components/ui/GradientFill';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { Dimmed } from '../../../components/PermissionNote';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { useProfile } from '../../../contexts/ProfileContext';
import { CAN_HOST, HOST_REASON, useStoreNetwork } from '../../../contexts/StoreNetworkContext';
import {
  NO_NAME, atText, cleanName, codeError, phoneRow, readCenterCode, sinceText, statusLine,
  type CenterCode, type PresencePhone, type Tone,
} from '../../../utils/storeNetwork';

/** Ora che avanza (per «da 2 min»), solo a schermata aperta. */
function useNow(every = 10_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}

export default function StoreNetworkScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const net = useStoreNetwork();
  const { profile } = useProfile();
  const now = useNow();
  const [joining, setJoining] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [codeText, setCodeText] = useState('');
  const [codeErr, setCodeErr] = useState('');
  const [pending, setPending] = useState<CenterCode | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);

  const line = statusLine(net.view, now);
  const toneColor: Record<Tone, string> = { on: t.colors.success, warn: t.colors.warning, off: t.colors.textMuted, busy: t.colors.accent };
  const myName = cleanName([profile.name, profile.device].filter(Boolean).join(' · '), NO_NAME);

  // Codice letto o scritto: rifiutato qui, prima della domanda, se non è di un centro della rete
  const check = (text: string) => {
    net.clearError();
    const r = readCenterCode(text);
    if (!r.ok) { setCodeErr(codeError(r.reason)); setPending(null); return; }
    setCodeErr('');
    setPending(r.code);
  };
  const confirmJoin = async () => {
    if (!pending) return;
    const code = pending;
    setPending(null);
    const ok = await net.connect(code);
    if (ok) { setJoining(false); setCodeText(''); }
  };

  const centerRow = (silent: boolean) => {
    const online = net.link === 'connected';
    const detail = online
      ? `Centro · online ${sinceText(net.centerSince ?? net.connectedSince ?? now, now)}`
      : net.silentSince !== undefined ? `Centro · visto ${atText(net.silentSince, now)}` : 'Centro';
    return (
      <PhoneLine key="centro" name={net.centerName || 'Centro del negozio'} detail={detail} online={online && !silent} first />
    );
  };

  return (
    <View style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: t.spacing.screenPadding, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {/* STATO in una riga, col pallino e il testo */}
        <View style={[styles.card, styles.statusRow]} testID="rete-stato" accessible accessibilityLabel={line.text}>
          {line.tone === 'busy'
            ? <ActivityIndicator size="small" color={toneColor.busy} />
            : <View style={[styles.dot, { backgroundColor: toneColor[line.tone] }]} />}
          <Text style={styles.statusText}>{line.text}</Text>
        </View>
        {net.role === 'client' && net.lastMessageAt !== undefined ? (
          <Text style={styles.hint} testID="rete-ultimo-messaggio">Ultimo messaggio arrivato {atText(net.lastMessageAt, now)}</Text>
        ) : null}

        {/* CHE COSA FA QUESTO TELEFONO: niente di scelto all'entrata */}
        {net.role === 'none' && (
          <>
            <Text style={styles.sectionTitle}>Che cosa fa questo telefono</Text>
            <View style={styles.card}>
              <Dimmed off={!CAN_HOST}>
                <Pressable
                  style={styles.choice}
                  onPress={() => { if (CAN_HOST) void net.startHost(); }}
                  accessibilityRole="button"
                  accessibilityLabel="Fai da centro del negozio"
                >
                  <View style={styles.iconWrap}><AppIcon name="hub" size={20} color={t.colors.textSecondary} /></View>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowTitle}>Fai da centro del negozio</Text>
                    <Text style={styles.rowSub}>Gli altri telefoni si collegano a questo, che resta acceso in negozio.</Text>
                  </View>
                  <AppIcon name="chevron-right" size={22} color={t.colors.textSecondary} />
                </Pressable>
              </Dimmed>
              {!CAN_HOST ? <Text style={styles.reason} testID="rete-centro-motivo">{HOST_REASON}</Text> : null}
              <View style={styles.rowLine} />
              <Pressable
                style={styles.choice}
                onPress={() => { setJoining(true); setCodeErr(''); setPending(null); }}
                accessibilityRole="button"
                accessibilityLabel="Collegati a un centro"
              >
                <View style={styles.iconWrap}><AppIcon name="qr-code-scanner" size={20} color={t.colors.textSecondary} /></View>
                <View style={styles.rowTexts}>
                  <Text style={styles.rowTitle}>Collegati a un centro</Text>
                  <Text style={styles.rowSub}>Leggi o scrivi il codice mostrato dal telefono che fa da centro.</Text>
                </View>
                <AppIcon name="chevron-right" size={22} color={t.colors.textSecondary} />
              </Pressable>
            </View>

            {joining || net.error ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Collegati a un centro</Text>
                <Pressable style={styles.secondaryBtn} onPress={() => setScanning(true)} accessibilityRole="button">
                  <AppIcon name="qr-code-scanner" size={18} color={t.colors.onButtonSecondary} />
                  <Text style={styles.secondaryBtnText}>Leggi il codice</Text>
                </Pressable>
                <Text style={[styles.label, { marginTop: 12 }]}>Scrivi il codice</Text>
                <TextInput
                  value={codeText}
                  onChangeText={(v) => { setCodeText(v); setCodeErr(''); setPending(null); }}
                  onSubmitEditing={() => check(codeText)}
                  placeholder="Il codice mostrato dal centro"
                  placeholderTextColor={t.colors.placeholder}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Codice del centro"
                  maxLength={300}
                />
                {codeErr ? <Text style={styles.error} testID="rete-errore-codice">{codeErr}</Text> : null}
                {!pending && net.link !== 'connecting' ? (
                  <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => check(codeText)} accessibilityRole="button">
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <Text style={styles.primaryBtnText}>Continua</Text>
                  </Pressable>
                ) : null}
                {/* La domanda sta in pagina, dopo il controllo del codice */}
                {pending ? (
                  <View style={styles.question} testID="rete-domanda">
                    <Text style={styles.questionTitle}>{pending.name ? `Collegarti al centro "${pending.name}"?` : 'Collegarti al centro di questa rete?'}</Text>
                    <Text style={styles.rowSub}>Gli altri telefoni ti vedranno come «{myName}». Il nome si cambia in Accesso.</Text>
                    <View style={styles.buttons}>
                      <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setPending(null)} accessibilityRole="button">
                        <Text style={styles.secondaryBtnText}>Annulla</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryBtn, { flex: 1 }]} onPress={() => void confirmJoin()} accessibilityRole="button">
                        <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                        <Text style={styles.primaryBtnText}>Collegati</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {net.error ? <Text style={styles.error} testID="rete-errore">{net.error}</Text> : null}
              </View>
            ) : null}
          </>
        )}

        {/* COLLEGATO A UN CENTRO (o in attesa che risponda) */}
        {net.role === 'client' && (
          <>
            <Text style={styles.sectionTitle}>Telefoni della rete</Text>
            <View style={styles.card} testID="rete-telefoni">
              {centerRow(net.link !== 'connected')}
              {net.phones.map((p) => (
                <PhoneRow key={p.id} phone={p} now={now} self={p.id === net.selfId} silentSince={net.link === 'connected' ? undefined : (net.silentSince ?? now)} />
              ))}
            </View>
            <Pressable style={styles.secondaryBtn} onPress={net.disconnect} accessibilityRole="button">
              <AppIcon name="link-off" size={18} color={t.colors.onButtonSecondary} />
              <Text style={styles.secondaryBtnText}>Scollegati</Text>
            </Pressable>
            {net.link === 'silent' ? <Text style={styles.hint}>Riprovo a collegarmi da solo: il centro deve essere acceso e sulla stessa rete Wi-Fi. Se il centro ha fatto un codice nuovo, scollegati e leggi quello.</Text> : null}
          </>
        )}

        {/* QUESTO TELEFONO È IL CENTRO (solo sul telefono) */}
        {net.role === 'host' && (
          <>
            <Text style={styles.sectionTitle}>Centro del negozio</Text>
            <View style={styles.card}>
              {net.link === 'connected' && net.hostCode ? (
                <>
                  <Text style={styles.rowSub}>Dagli altri telefoni: Impostazioni › Rete del negozio › Collegati a un centro, poi leggi questo codice.</Text>
                  <View style={styles.qrWrap}>
                    <View style={styles.qrBox}>
                      <QRCode value={net.hostCode} size={200} color={t.colors.qrInk} backgroundColor={t.colors.qrPaper} />
                    </View>
                  </View>
                  <Pressable onPress={() => setShowCode((v) => !v)} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.link}>{showCode ? 'Nascondi il codice' : 'Mostra il codice'}</Text>
                  </Pressable>
                  {showCode ? <Text style={styles.code} selectable>{net.hostCode}</Text> : null}
                  <Pressable onPress={net.newCode} accessibilityRole="button" hitSlop={8}>
                    <Text style={styles.link}>Nuovo codice</Text>
                  </Pressable>
                  <Text style={styles.hint}>Il codice nuovo vale per chi si collega dopo: chi è già collegato resta collegato.</Text>
                </>
              ) : net.link === 'connecting' ? (
                <View style={styles.busy}><ActivityIndicator color={t.colors.accent} /><Text style={styles.rowSub}>Accensione del centro…</Text></View>
              ) : (
                <>
                  <Text style={styles.rowSub}>Il centro è spento: i telefoni non si possono collegare. Il codice resta lo stesso.</Text>
                  <Pressable style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => void net.startHost()} accessibilityRole="button">
                    <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
                    <Text style={styles.primaryBtnText}>Accendi il centro</Text>
                  </Pressable>
                </>
              )}
              {net.hostError ? <Text style={styles.error}>{net.hostError}</Text> : null}
            </View>
            {net.link === 'connected' ? (
              <>
                <Text style={styles.sectionTitle}>Telefoni collegati</Text>
                <View style={styles.card}>
                  {net.phones.length === 0
                    ? <Text style={styles.rowSub}>Ancora nessuno: fai leggere il codice a un altro telefono.</Text>
                    : net.phones.map((p, i) => <PhoneRow key={p.id} phone={p} now={now} first={i === 0} />)}
                </View>
              </>
            ) : null}
            {confirmStop ? (
              <View style={[styles.card, styles.question]}>
                <Text style={styles.questionTitle}>Fermare il centro?</Text>
                <Text style={styles.rowSub}>I telefoni collegati si scollegano finché non lo riaccendi.</Text>
                <View style={styles.buttons}>
                  <Pressable style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setConfirmStop(false)} accessibilityRole="button">
                    <Text style={styles.secondaryBtnText}>Annulla</Text>
                  </Pressable>
                  <Pressable style={[styles.dangerBtn, { flex: 1 }]} onPress={() => { setConfirmStop(false); void net.stopHost(); }} accessibilityRole="button">
                    <Text style={styles.dangerBtnText}>Ferma</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.secondaryBtn} onPress={() => setConfirmStop(true)} accessibilityRole="button">
                <AppIcon name="stop-circle" size={18} color={t.colors.onButtonSecondary} />
                <Text style={styles.secondaryBtnText}>{net.link === 'connected' ? 'Ferma il centro' : 'Non fare più da centro'}</Text>
              </Pressable>
            )}
          </>
        )}

        {/* CHE COSA PASSA: detto com'è (AR01) */}
        <Text style={styles.sectionTitle}>Che cosa passa</Text>
        <View style={styles.card}>
          <Text style={styles.rowSub}>Per ora passano solo i messaggi della Chat; l'inventario non passa ancora.</Text>
          <View style={styles.rowLine} />
          {/* Fino a CHAT1, che mette la Chat in Home */}
          <Pressable style={styles.choice} onPress={() => router.push('/chat')} accessibilityRole="button">
            <View style={styles.iconWrap}><AppIcon name="chat-bubble-outline" size={20} color={t.colors.textSecondary} /></View>
            <View style={styles.rowTexts}><Text style={styles.rowTitle}>Apri la Chat</Text></View>
            <AppIcon name="chevron-right" size={22} color={t.colors.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Usala solo sulla rete Wi-Fi del negozio: i messaggi passano senza cifratura.</Text>
      </ScrollView>

      <Modal visible={scanning} animationType="slide" onRequestClose={() => setScanning(false)}>
        {scanning ? (
          <BarcodeScanner
            onScan={({ data }) => { setScanning(false); setCodeText(data); check(data); }}
            onClose={() => setScanning(false)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function PhoneLine({ name, detail, online, first }: { name: string; detail: string; online: boolean; first?: boolean }) {
  const t = useTheme();
  const styles = useStyles();
  return (
    <>
      {!first ? <View style={styles.rowLine} /> : null}
      <View style={styles.phoneRow} accessible accessibilityLabel={`${name}, ${detail}, ${online ? 'Online' : 'Non in linea'}`} testID="rete-telefono">
        <View style={[styles.dot, { backgroundColor: online ? t.colors.success : t.colors.textMuted }]} />
        <View style={styles.rowTexts}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowSub} numberOfLines={2}>{detail}</Text>
        </View>
        <Text style={[styles.phoneState, { color: online ? t.colors.success : t.colors.textSecondary }]}>{online ? 'Online' : 'Non in linea'}</Text>
      </View>
    </>
  );
}

function PhoneRow({ phone, now, self, silentSince, first }: { phone: PresencePhone; now: number; self?: boolean; silentSince?: number; first?: boolean }) {
  const row = phoneRow(phone, now, silentSince);
  // questo telefono: «Questo telefono» al posto del nome che manca, altrimenti scritto davanti all'ora
  const name = self && phone.name === NO_NAME ? 'Questo telefono' : phone.name;
  const detail = self && phone.name !== NO_NAME ? `Questo telefono · ${row.detail}` : row.detail;
  return <PhoneLine name={name} detail={detail} online={row.online} first={first} />;
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  sectionTitle: { ...t.typography.sectionHeader, lineHeight: 18, marginTop: 16, marginBottom: 8 },
  card: { ...cardSurface(t), paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  cardTitle: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  statusText: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: t.weights.strong, color: t.colors.textPrimary },
  dot: { width: 10, height: 10, borderRadius: 5 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: t.radius.iconWrap, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.iconWrap },
  rowTexts: { flex: 1 },
  rowTitle: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
  rowSub: { ...t.typography.caption, fontSize: 13, lineHeight: 18, marginTop: 1 },
  rowLine: { height: 1, backgroundColor: t.colors.borderLight },
  reason: { fontSize: 13, lineHeight: 18, color: t.colors.textSecondary, marginBottom: 8, marginLeft: 44 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 8 },
  phoneState: { fontSize: 13, fontWeight: t.weights.strong },
  label: { ...t.typography.cardLabel, fontSize: 13, marginBottom: 4 },
  input: {
    minHeight: t.input.height,
    color: t.colors.inputText,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder === t.colors.input ? t.colors.border : t.colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hint: { ...t.typography.caption, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8, color: t.colors.textSecondary },
  error: { fontSize: 13, lineHeight: 18, color: t.colors.error, marginTop: 8 },
  question: { marginTop: 12, gap: 6 },
  questionTitle: { fontSize: 16, lineHeight: 22, fontWeight: t.weights.strong, color: t.colors.textPrimary },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  link: { fontSize: 14, lineHeight: 20, fontWeight: t.weights.strong, color: t.colors.accentInk, paddingVertical: 8 },
  code: { fontSize: 12, lineHeight: 17, color: t.colors.textSecondary, marginBottom: 4 },
  qrWrap: { alignItems: 'center', paddingVertical: 12 },
  qrBox: { backgroundColor: t.colors.qrPaper, padding: 14, borderRadius: t.radius.tile },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48,
    backgroundColor: t.colors.button, borderRadius: t.radius.button, overflow: 'hidden', paddingHorizontal: 16,
  },
  primaryBtnText: { color: t.colors.onButton, fontWeight: '600', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48,
    backgroundColor: t.colors.buttonSecondary, borderWidth: 1, borderColor: t.colors.buttonSecondaryBorder,
    borderRadius: t.radius.button, paddingHorizontal: 16, marginBottom: 8,
  },
  secondaryBtnText: { color: t.colors.onButtonSecondary, fontWeight: '600', fontSize: 15 },
  dangerBtn: {
    alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: t.radius.button,
    backgroundColor: t.colors.error, paddingHorizontal: 16, marginBottom: 8,
  },
  dangerBtnText: { color: t.colors.onData, fontWeight: '600', fontSize: 15 },
}));
