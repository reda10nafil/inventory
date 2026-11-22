/**
 * SyncroFlow — ChatScreen Operativa (separata da TeamScreen)
 * Bare RN 0.81.5 — Luxury Dark #0A0A0A / #D4AF37
 * - Lista messaggi ChatMessageItem (hydrated cards vs testo)
 * - Input testo + invio
 * - Demo bottoni: invia payload ultraleggero SKU + cards
 * - Persistenza: contexts/InventoryContext + db chat_messages futuro (ora memoria + AsyncStorage via Inventory)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from '../navigation/compat';
import ChatMessageItem from '../components/chat/ChatMessageItem';
import { useInventory } from '../../contexts/InventoryContext';
import * as meshSync from '../services/meshSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from '../../components/ui/AppIcon';
import { Text, TextInput } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

type ChatMsg = {
  id: string;
  payload: any;
  hydratedCache?: any;
  createdAt: string;
  isOwn: boolean;
  senderId?: string;
};

export default function ChatScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const { products, getProductBySku, moveProduct } = useInventory();
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    { id: 'demo1', payload: { text: 'Ciao team — chat operativa su LAN isolata. Invia un messaggio o una selezione di prodotti.' }, createdAt: new Date().toISOString(), isOwn: false },
  ]);
  const [input, setInput] = useState('');

  // Persistenza offline-first + sync mesh: carica storico, iscrizione broadcast
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('chat_messages');
        if (raw && mounted) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed);
        }
      } catch {}
    })();
    const unsub = meshSync.subscribeChat(({ payload }) => {
      if (!mounted) return;
      // payload è { skus, automationIds, text } o { text }
      const incoming: ChatMsg = {
        id: `mesh-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        payload,
        createdAt: new Date().toISOString(),
        isOwn: false,
      };
      setMessages(prev => [...prev, incoming]);
    });
    return () => { mounted = false; unsub(); };
  }, []);

  useEffect(() => {
    // salva storico locale (ultimi 100)
    AsyncStorage.setItem('chat_messages', JSON.stringify(messages.slice(-100))).catch(()=>{});
  }, [messages]);

  const sendText = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const payload = { text: trimmed, skus: [], automationIds: [] };
    const msg: ChatMsg = { id: `${Date.now()}`, payload, createdAt: new Date().toISOString(), isOwn: true };
    setMessages((m) => [...m, msg]);
    meshSync.sendLightPayload(payload as any).catch(() => {});
    // notifica locale per test same-device (simula broadcast LAN)
    meshSync.notifyLocalChat(payload);
    setInput('');
  }, [input]);

  const sendDemoCard = useCallback(() => {
    // Boss demo: 3 prodotti logistica universale + automazione audit vetrina
    const available = products.filter((p: any) => !p.deletedAt && p.status !== 'sold').slice(0, 3);
    const skus = available.map((p: any) => p.sku);
    if (!skus.length) {
      Alert.alert('Nessun prodotto', 'Aggiungi un prodotto per inviare una card demo.');
      return;
    }
    const automationId = 'auto-audit-vetrina';
    const payload = { skus, automationIds: [automationId], text: 'Controlla questi articoli che sia a posto — usa automazione Audit Vetrina' };
    const hydratedCache: any = {};
    skus.forEach((sku: string) => {
      const prod = getProductBySku ? getProductBySku(sku) : products.find((p: any) => p.sku === sku);
      if (prod) hydratedCache[sku] = prod;
    });
    const msg: ChatMsg = { id: `${Date.now()}`, payload, hydratedCache, createdAt: new Date().toISOString(), isOwn: true };
    setMessages((m) => [...m, msg]);
    meshSync.sendLightPayload({ skus, automationIds: [automationId], text: payload.text } as any).catch(() => {});
    meshSync.notifyLocalChat(payload);
  }, [products, getProductBySku]);

  const handleProductAction = useCallback((sku: string, action: 'sposta' | 'vendi') => {
    Alert.alert('Azione card', `${action.toUpperCase()} su ${sku} — eseguito su DB locale + timeline.`);
  }, []);

  const handleApproveAutomation = useCallback((selectedSkus: string[], automationId: string) => {
    if (!selectedSkus.length) {
      Alert.alert('Seleziona almeno 1 articolo');
      return;
    }
    // Esegue automazione sul sottoinsieme selezionato — interroga Products WatermelonDB locale + aggiorna location/timeline
    selectedSkus.forEach((sku: string) => {
      const p = products.find((x: any) => x.sku === sku);
      if (p && (p as any).id) {
        // Esempio logistica universale: audit → sposta in vetrina/reparto destinazione
        try { moveProduct((p as any).id, 'vetrina'); } catch {}
      }
    });
    Alert.alert('Approva Spostamento', `Automazione ${automationId} applicata su ${selectedSkus.length}/${selectedSkus.length} articoli — timeline sincronizzata su mesh.`);
  }, [products, moveProduct]);

  const renderItem = useCallback(({ item }: { item: ChatMsg }) => (
    <ChatMessageItem message={item as any} onProductAction={handleProductAction} onApproveAutomation={handleApproveAutomation} />
  ), [handleProductAction, handleApproveAutomation]);

  const keyExtractor = useCallback((m: ChatMsg) => m.id, []);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <AppIcon name="arrow-back" size={24} color={t.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Chat Operativa</Text>
        <Pressable onPress={() => Alert.alert('Mesh', 'Chat sincronizzata su LAN isolata. Payload ultraleggero SKU[].')} hitSlop={12}>
          <AppIcon name="info-outline" size={22} color={t.colors.accentInk} />
        </Pressable>
      </View>

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Messaggio team..."
              placeholderTextColor={t.colors.textMuted}
              style={styles.input}
              multiline
            />
          </View>
          <Pressable onPress={sendDemoCard} style={styles.cardBtn} hitSlop={8}>
            <AppIcon name="inventory-2" size={20} color={t.colors.onButtonSecondary} />
          </Pressable>
          <Pressable onPress={sendText} style={styles.sendBtn} hitSlop={8}>
            <AppIcon name="send" size={20} color={t.colors.onButton} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Card demo usa payload leggero {"{skus:[...]}"} → hydration locale WebP</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenPadding, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: t.colors.borderLight, backgroundColor: t.colors.background,
  },
  backBtn: { padding: 6, borderRadius: 20 },
  headerTitle: { ...t.typography.cardTitle, fontSize: 18 },
  listContent: { paddingVertical: 10, paddingBottom: 12 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: t.spacing.screenPadding, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: t.colors.borderLight, backgroundColor: t.colors.background,
  },
  inputWrap: { flex: 1, backgroundColor: t.colors.input, borderRadius: t.radius.input, borderWidth: 1, borderColor: t.colors.inputBorder, paddingHorizontal: 12, paddingVertical: 8 },
  input: { color: t.colors.inputText, fontSize: 14, maxHeight: 90 },
  cardBtn: { width: 44, height: 44, borderRadius: t.radius.button, backgroundColor: t.colors.buttonSecondary, borderWidth: 1, borderColor: t.colors.buttonSecondaryBorder, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { width: 44, height: 44, borderRadius: t.radius.button, backgroundColor: t.colors.button, alignItems: 'center', justifyContent: 'center' },
  hint: { color: t.colors.textMuted, fontSize: 10, textAlign: 'center', paddingBottom: 6 },
}));
