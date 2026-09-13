/**
 * SyncroFlow — ChatMessageItem (Bare RN 0.81.5)
 * Distingue payload leggero vs testo normale.
 *
 * Payload leggero: { skus|sku: string[], automationId|automationIds?: string|string[], text?: string }
 *   → render HydratedProductCard (query sincronizzata InventoryContext / WatermelonDB)
 *
 * Testo normale: string o { text: string } senza sku
 *   → render bolla testo Luxury Dark.
 *
 * Bare RN only — no expo deps. Theme from constants/theme.ts (#0A0A0A / #D4AF37).
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../constants/theme';
import HydratedProductCard, { HydratedPayload } from './HydratedProductCard';

// ---------------------------------------------------------------------------
// Types — compat con ChatMessage model + InventoryContext chat
// ---------------------------------------------------------------------------
export type ChatMessagePayload = HydratedPayload | string | Record<string, unknown> | null | undefined;

export type ChatMessageItemProps = {
  /** Messaggio raw — supporta tre forme per compatibilità */
  message: {
    id: string;
    payload?: ChatMessagePayload;
    /** Alias: alcuni caller passano text diretto */
    text?: string;
    /** Hydrated snapshot cache (nuovo nodo appena joinato) */
    hydratedCache?: Record<string, unknown> | null;
    createdAt?: string | Date | number;
    senderId?: string;
    isOwn?: boolean;
  };
  /** Alternativa flat props */
  payload?: ChatMessagePayload;
  text?: string;
  isOwn?: boolean;
  onProductAction?: (sku: string, action: 'sposta' | 'vendi') => void;
  onApproveAutomation?: (selectedSkus: string[], automationId: string) => void;
};

// ---------------------------------------------------------------------------
// Detection: payload leggero vs testo
// ---------------------------------------------------------------------------
function isLightPayload(value: unknown): value is HydratedPayload {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  // task spec: skus | LAN: sku
  if (Array.isArray(o.skus) && o.skus.length > 0) return o.skus.every((s) => typeof s === 'string');
  if (Array.isArray(o.sku) && o.sku.length > 0) return o.sku.every((s) => typeof s === 'string');
  // Anche vuoto ma con automationId → considerato leggero (automation card future)
  if (typeof o.automationId === 'string' && o.automationId.length > 0) return true;
  if (Array.isArray(o.automationIds) && o.automationIds.length > 0) return true;
  return false;
}

function tryParsePayload(raw: ChatMessagePayload): { light: HydratedPayload | null; text: string | null } {
  if (raw == null) return { light: null, text: null };

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { light: null, text: null };
    // Prova JSON — se è payload leggero, rilevato, altrimenti è testo
    try {
      const parsed = JSON.parse(trimmed);
      if (isLightPayload(parsed)) return { light: parsed as HydratedPayload, text: typeof parsed.text === 'string' ? parsed.text : null };
      if (parsed && typeof parsed === 'object' && typeof (parsed as any).text === 'string' && !isLightPayload(parsed)) {
        return { light: null, text: (parsed as any).text };
      }
      // JSON ma non payload — fallback testo (es. "\"ciao\"")
      if (typeof parsed === 'string') return { light: null, text: parsed };
    } catch {
      // Non è JSON → testo puro
    }
    return { light: null, text: trimmed };
  }

  if (typeof raw === 'object') {
    if (isLightPayload(raw)) {
      const o = raw as HydratedPayload & { text?: string };
      return { light: o, text: typeof o.text === 'string' ? o.text : null };
    }
    // Oggetto con solo text
    if (typeof (raw as any).text === 'string') {
      return { light: null, text: (raw as any).text };
    }
    // Oggetto vuoto / sconosciuto → nessun render
    return { light: null, text: null };
  }

  return { light: null, text: null };
}

function formatTime(value?: string | Date | number): string {
  if (value == null) return '';
  try {
    const d = value instanceof Date ? value : new Date(value as any);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Sub: Text bubble Luxury Dark
// ---------------------------------------------------------------------------
const TextBubble: React.FC<{ text: string; isOwn?: boolean; timestamp?: string }> = memo(({ text, isOwn, timestamp }) => (
  <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
    <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther]}>{text}</Text>
    {timestamp ? <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther]}>{timestamp}</Text> : null}
  </View>
));
TextBubble.displayName = 'TextBubble';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const ChatMessageItem: React.FC<ChatMessageItemProps> = memo(({ message, payload: payloadProp, text: textProp, isOwn: isOwnProp, onProductAction, onApproveAutomation }) => {
  const isOwn = isOwnProp ?? message?.isOwn ?? false;

  const rawPayload: ChatMessagePayload = useMemo(() => {
    if (payloadProp !== undefined) return payloadProp;
    if (message?.payload !== undefined) return message.payload as ChatMessagePayload;
    if (textProp !== undefined) return textProp;
    if (message?.text !== undefined) return message.text;
    return null;
  }, [payloadProp, message, textProp]);

  const { light, text } = useMemo(() => tryParsePayload(rawPayload), [rawPayload]);

  const timestamp = useMemo(() => formatTime(message?.createdAt), [message?.createdAt]);

  // Caso 1: payload leggero → HydratedProductCard + eventuale testo caption
  if (light) {
    return (
      <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
        {/* Bolla caption opzionale sopra le cards (se payload contiene text) */}
        {text ? (
          <View style={[styles.captionBubble, isOwn ? styles.captionOwn : styles.captionOther]}>
            <Text style={styles.captionText}>{text}</Text>
          </View>
        ) : null}

        <View style={styles.hydratedWrapper}>
          <HydratedProductCard
            payload={light}
            hydratedCache={message?.hydratedCache ?? null}
            onAction={onProductAction}
            onApproveAutomation={onApproveAutomation}
          />
        </View>

        {timestamp ? <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>{timestamp}</Text> : null}
      </View>
    );
  }

  // Caso 2: testo normale
  if (text) {
    return (
      <View style={[styles.container, isOwn ? styles.containerOwn : styles.containerOther]}>
        <TextBubble text={text} isOwn={isOwn} timestamp={timestamp} />
      </View>
    );
  }

  // Caso 3: payload vuoto / non riconosciuto → non renderizzare (evita bolle vuote su sync)
  return null;
});
ChatMessageItem.displayName = 'ChatMessageItem';

export default ChatMessageItem;

// ---------------------------------------------------------------------------
// Styles — Luxury Dark #0A0A0A/#D4AF37
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
    maxWidth: '92%',
  },
  containerOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  containerOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },

  // Hydrated wrapper — cards hanno già surface #1F1F1F + gold hairline
  hydratedWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },

  captionBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    maxWidth: 320,
    borderWidth: 1,
  },
  captionOwn: {
    backgroundColor: theme.primary, // #D4AF37
    borderColor: theme.primary,
    alignSelf: 'flex-end',
  },
  captionOther: {
    backgroundColor: theme.surface, // #1F1F1F
    borderColor: theme.border,
    alignSelf: 'flex-start',
  },
  captionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Text bubble
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 320,
    borderWidth: 1,
    // luxury shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleOwn: {
    backgroundColor: theme.primary, // gold — messaggio proprio
    borderColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: theme.surface, // #1F1F1F
    borderColor: theme.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTextOwn: {
    color: '#0A0A0A',
    fontWeight: '500',
  },
  bubbleTextOther: {
    color: theme.textPrimary, // #FFFFFF
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  bubbleTimeOwn: {
    color: 'rgba(10,10,10,0.6)',
    alignSelf: 'flex-end',
  },
  bubbleTimeOther: {
    color: theme.textMuted,
    alignSelf: 'flex-end',
  },

  // Timestamp sotto hydrated cards
  time: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    color: theme.textMuted,
  },
  timeOwn: {
    alignSelf: 'flex-end',
  },
  timeOther: {
    alignSelf: 'flex-start',
  },
});
