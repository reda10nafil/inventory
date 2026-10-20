/**
 * SyncroFlow — meshSync LAN (Bare RN 0.81.5)
 * Trasporto: WebSocket su LAN isolata (router Mercusys senza WAN).
 * IP via QR, token ROOM random. Nessun cloud.
 *
 * API:
 *  - createHostRoom() -> { roomToken, wsUrl, qrPayload }
 *  - joinRoom(qrPayload) -> { wsUrl, token, ip, port }
 *  - syncDatabase({ peerUrl }) authenticated pull/push for supported tables
 *  - sendLightPayload({ skus, automationIds }) su WS aperto
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MeshRole = 'host' | 'client';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export type LightPayload = {
  skus: string[];
  automationIds: string[];
  text?: string;
};

export type HostRoom = {
  roomToken: string;
  ip: string;
  port: number;
  wsUrl: string;
  qrPayload: string; // ws://IP:PORT?token=ROOM
};

export type JoinInfo = {
  wsUrl: string;
  httpUrl: string; // http://IP:PORT per sync REST fallback
  ip: string;
  port: number;
  token: string;
  rawPayload: string;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const DEFAULT_PORT = 8080;
const WS_PATH = ''; // ws://IP:PORT?token=xxx — nessun path extra su LAN isolata

// Holder singleton WS
let activeSocket: WebSocket | null = null;
let activeRole: MeshRole | null = null;
let activeRoomToken: string | null = null;
let activeWsUrl: string | null = null;

// listeners
type SyncListener = (status: SyncStatus) => void;
const listeners = new Set<SyncListener>();
let _syncStatus: SyncStatus = 'idle';

export function getSyncStatus(): SyncStatus {
  return _syncStatus;
}
function setSyncStatus(s: SyncStatus) {
  _syncStatus = s;
  listeners.forEach((l) => l(s));
}
export function subscribeSyncStatus(cb: SyncListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Helpers: token + IP
// ---------------------------------------------------------------------------
function randomToken(len = 16): string {
  // Never use Math.random for a pairing credential.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Crypto = require('expo-crypto');
    if (Crypto.randomUUID) {
      const u: string = Crypto.randomUUID().replace(/-/g, '');
      return u.slice(0, len).toUpperCase();
    }
  } catch {}
  throw new Error('Generatore casuale sicuro non disponibile: impossibile creare la stanza mesh');
}

export async function getLocalIp(): Promise<string> {
  let ip: string | null = null;
  try {
    const Network = require('expo-network');
    if (Network.getIpAddressAsync) {
      const v = await Network.getIpAddressAsync();
      if (v && v !== '0.0.0.0') ip = v;
    }
  } catch {}
  if (!ip) {
    try {
      const NetInfo = require('@react-native-community/netinfo').default;
      const state = await NetInfo.fetch();
      const v = (state as any)?.details?.ipAddress;
      if (v) ip = v;
    } catch {}
  }
  if (!ip) throw new Error('Impossibile rilevare l’indirizzo IP locale. Connetti il dispositivo a una rete Wi-Fi e riprova.');
  // Emulatori Android: 10.0.2.15 è interno VM, l'altro emulatore non lo raggiunge.
  // Per test 2-emulatori, espone 10.0.2.2 (host loopback) + avvisa di fare adb forward.
  if (ip.startsWith('10.0.2.')) {
    console.log('[meshSync] emulator IP', ip, '-> QR userà 10.0.2.2 + adb forward tcp:8080 tcp:8080 per 2-emulatori');
    // Mantieni IP reale ma QR offrirà anche 10.0.2.2 come alternativa (vedi buildQrPayload)
    return ip;
  }
  return ip;
}

export function getQrAlternatives(ip: string, port: number, token: string): string[] {
  const primary = buildQrPayload(ip, port, token);
  // Se IP è emulator, offri anche 10.0.2.2 per test 2-emulatori sullo stesso host
  if (ip.startsWith('10.0.2.')) {
    return [primary, buildQrPayload('10.0.2.2', port, token)];
  }
  return [primary];
}

export function buildQrPayload(ip: string, port: number, token: string): string {
  return `ws://${ip}:${port}${WS_PATH}?token=${token}`;
}

export function parseQrPayload(payload: string): JoinInfo {
  const raw = payload.trim();
  // atteso ws://IP:PORT?token=ROOM
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('QR payload non valido');
  }
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error(`Protocollo atteso ws://, ricevuto ${url.protocol}`);
  }
  const ip = url.hostname;
  const port = url.port ? Number(url.port) : DEFAULT_PORT;
  const token = url.searchParams.get('token');
  if (!ip || !token) throw new Error('QR mancante di IP o token');
  const wsUrl = raw;
  const httpProto = url.protocol === 'wss:' ? 'https:' : 'http:';
  const httpUrl = `${httpProto}//${ip}:${port}`;
  return { wsUrl, httpUrl, ip, port, token, rawPayload: raw };
}

// ---------------------------------------------------------------------------
// WebSocket LAN isolata
// ---------------------------------------------------------------------------
export function getActiveSocket(): WebSocket | null {
  return activeSocket;
}
export function getActiveWsUrl(): string | null {
  return activeWsUrl;
}
export function getActiveRole(): MeshRole | null {
  return activeRole;
}
export function getActiveRoomToken(): string | null {
  return activeRoomToken;
}

function createWs(url: string): WebSocket {
  // chiusura precedente isolata
  if (activeSocket) {
    try {
      activeSocket.close();
    } catch {}
    activeSocket = null;
  }
  const ws = new WebSocket(url);
  activeSocket = ws;
  activeWsUrl = url;

  ws.onopen = () => {
    console.log('[meshSync] WS open', redactPairingUrl(url));
  };
  ws.onclose = (e) => {
    console.log('[meshSync] WS close', e.code, e.reason);
    if (activeSocket === ws) {
      activeSocket = null;
      setSyncStatus('idle');
    }
  };
  ws.onerror = (e: any) => {
    console.log('[meshSync] WS error', e?.message ?? e);
    setSyncStatus('error');
  };
  ws.onmessage = (e) => {
    const raw = (e.data as string) ?? '';
    try {
      const msg = JSON.parse(raw);
      console.log('[meshSync] WS message', msg?.type ?? 'unknown');
      // notifica listener chat se è light_payload
      if (msg && msg.type === 'light_payload' && msg.skus) {
        chatListeners.forEach(cb => { try { cb({ payload: msg, raw }); } catch {} });
      }
      if (msg && msg.type === 'chat' && msg.payload) {
        chatListeners.forEach(cb => { try { cb({ payload: msg.payload, raw }); } catch {} });
      }
    } catch {}
  };
  return ws;
}

function redactPairingUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.searchParams.has('token')) url.searchParams.set('token', '[redacted]');
    return url.toString();
  } catch {
    return '[mesh-url]';
  }
}

// Chat listeners — per ChatScreen real sync
type ChatListener = (data: { payload: any; raw: string }) => void;
const chatListeners = new Set<ChatListener>();
export function subscribeChat(cb: ChatListener): () => void {
  chatListeners.add(cb);
  return () => chatListeners.delete(cb);
}
export function notifyLocalChat(payload: any) {
  // broadcast locale per test same-device + futura mesh
  chatListeners.forEach(cb => { try { cb({ payload, raw: JSON.stringify(payload) }); } catch {} });
}

// ---------------------------------------------------------------------------
// createHostRoom — Host genera ROOM e avvia listener WS LAN (meshServer reale)
// ---------------------------------------------------------------------------
export async function createHostRoom(opts?: { port?: number }): Promise<HostRoom> {
  const port = opts?.port ?? DEFAULT_PORT;
  const ip = await getLocalIp();
  const roomToken = randomToken();
  const qrPayload = buildQrPayload(ip, port, roomToken);
  const wsUrl = qrPayload;

  activeRole = 'host';
  activeRoomToken = roomToken;
  activeWsUrl = wsUrl;

  // Server LAN reale: TcpSocket.createServer su 0.0.0.0:port + upgrade WS manuale
  // Fallback http/shim se TcpSocket non installato (vedi meshServer.ts)
  try {
    const { startMeshServer } = await import('./meshServer');
    await startMeshServer(port, roomToken, (msg: any) => {
      console.log('[meshSync] meshServer message', msg?.type ?? 'unknown');
      // I messaggi light_payload/chat sono già persistiti in meshServer (appendChatMessage)
      // Qui notifichiamo solo eventuali listener UI via getActiveSocket().onmessage compat
      // Mantieni compatibilità con joinRoom client (WebSocket client -> server TCP)
      if (msg?.type === 'light_payload' || msg?.type === 'chat') {
        // opzionale: trigger sync listener
      }
    });
    console.log('[meshSync:createHostRoom] meshServer avviato', { ip, port });
  } catch (e) {
    console.log('[meshSync:createHostRoom] server mesh non disponibile', e);
    disconnect();
    setSyncStatus('error');
    throw new Error('Impossibile avviare il server mesh su questo dispositivo');
  }

  return { roomToken, ip, port, wsUrl, qrPayload };
}

// ---------------------------------------------------------------------------
// joinRoom — Client scansiona QR e connette WS al Host
// ---------------------------------------------------------------------------
export async function joinRoom(qrPayload: string): Promise<JoinInfo> {
  const info = parseQrPayload(qrPayload);
  activeRole = 'client';
  activeRoomToken = info.token;

  console.log('[meshSync:joinRoom] connecting to', redactPairingUrl(info.wsUrl));
  const ws = createWs(info.wsUrl);

  // Require a valid hello_ack before reporting the pairing as successful.
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout di autenticazione con l’host mesh')), 8000);
      const previousOnMessage = ws.onmessage;
      const previousOnClose = ws.onclose;
      const finish = (error?: Error) => {
        clearTimeout(timeout);
        ws.onmessage = previousOnMessage;
        ws.onclose = previousOnClose;
        if (error) reject(error);
        else resolve();
      };
      ws.onopen = () => {
        try {
          ws.send(JSON.stringify({ type: 'hello', token: info.token, platform: Platform.OS }));
        } catch {
          finish(new Error('Impossibile inviare la richiesta di autenticazione mesh'));
        }
      };
      ws.onmessage = (event) => {
        previousOnMessage?.call(ws, event);
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === 'hello_ack' && message.token === info.token) {
            console.log('[meshSync:joinRoom] authenticated');
            finish();
          } else if (message.type === 'error') {
            finish(new Error('L’host mesh ha rifiutato l’autenticazione'));
          }
        } catch {}
      };
      ws.onerror = (e: any) => {
        finish(new Error('Connessione mesh non riuscita: ' + (e?.message ?? 'errore WebSocket')));
      };
      ws.onclose = (event) => {
        previousOnClose?.call(ws, event);
        finish(new Error('La connessione mesh si è chiusa prima dell’autenticazione'));
      };
    });
  } catch (error) {
    disconnect();
    throw error;
  }

  return info;
}

// ---------------------------------------------------------------------------
// syncDatabase — pull/push for the supported inventory tables
// Chiamato dopo joinRoom, oppure su "Sincronizza ora" del Client.
// Nessun filtro userId — full dump quando lastPulledAt === null.
// ---------------------------------------------------------------------------
export async function syncDatabase(params: { peerUrl?: string; fullResync?: boolean }): Promise<void> {
  const { peerUrl, fullResync = true } = params ?? {};
  const url = peerUrl ?? activeWsUrl?.replace(/^ws/, 'http').split('?')[0] ?? null;

  if (!url) {
    throw new Error('Nessun peer mesh connesso: sincronizzazione annullata');
  }

  // Normalizza httpUrl (togli query)
  const httpBase = url.replace(/\/$/, '').split('?')[0].replace(/^ws/, 'http');
  setSyncStatus('syncing');
  console.log('[meshSync:syncDatabase] syncing from', httpBase, fullResync ? '(fullResync)' : '(delta)');

  try {
    // Import lazy per evitare cycle
    const { database } = await import('../db');
    const { sync, syncOnMeshJoin } = await import('../db/sync');

    if (fullResync) {
      await syncOnMeshJoin(database, httpBase, activeRoomToken ?? '');
    } else {
      await sync(database, httpBase, activeRoomToken ?? '');
    }
    setSyncStatus('synced');
    console.log('[meshSync:syncDatabase] done');
  } catch (e) {
    console.log('[meshSync:syncDatabase] error', e);
    setSyncStatus('error');
    throw e;
  }
}

// ---------------------------------------------------------------------------
// sendLightPayload — invia {skus, automationIds} su WS LAN isolata
// Payload leggero <2KB, host lo espande in chat_message con hydrated_cache opzionale
// ---------------------------------------------------------------------------
export async function sendLightPayload(payload: LightPayload): Promise<void> {
  const msgObj = {
    type: 'light_payload',
    skus: payload.skus,
    automationIds: payload.automationIds,
    text: payload.text ?? '',
    ts: Date.now(),
  };
  const msg = JSON.stringify(msgObj);

  // Host: broadcast diretto via meshServer (server TCP) + notifica locale
  if (activeRole === 'host') {
    try {
      const ms: any = require('./meshServer');
      if (ms?.broadcastToMeshClients) {
        ms.broadcastToMeshClients(msgObj);
        console.log('[meshSync] host broadcast via meshServer');
      }
      // host vede subito il proprio messaggio
      chatListeners.forEach(cb => { try { cb({ payload: msgObj, raw: msg }); } catch {} });
      // salva anche in DB host
      try { const dbMod: any = require('../db'); const db = dbMod.database; if (db) { /* append handled by server */ } } catch {}
      return;
    } catch (e) { console.log('[meshSync] host broadcast failed', e); }
  }

  const ws = activeSocket;
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(msg);
    console.log('[meshSync:sendLightPayload] sent over WS', msg.slice(0, 400));
    // ottimistico: mostra subito al mittente
    chatListeners.forEach(cb => { try { cb({ payload: msgObj, raw: msg }); } catch {} });
    return;
  }

  // fallback HTTP POST su /chat/push (per client non-WS o host senza TCP)
  const httpBase = activeWsUrl?.replace(/^ws/, 'http').split('?')[0];
  if (httpBase) {
    try {
      const response = await fetch(`${httpBase.replace(/\/$/, '')}/chat/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeRoomToken ?? ''}` },
        body: msg,
      });
      if (!response.ok) throw new Error(`chat push ${response.status}`);
      console.log('[meshSync:sendLightPayload] sent over HTTP fallback');
      chatListeners.forEach(cb => { try { cb({ payload: msgObj, raw: msg }); } catch {} });
      return;
    } catch (e) {
      console.log('[meshSync:sendLightPayload] HTTP fallback failed', e);
    }
  }

  throw new Error('Invio mesh non riuscito: nessuna connessione attiva');
}

// ---------------------------------------------------------------------------
// disconnect — chiude WS client e ferma meshServer se Host
// ---------------------------------------------------------------------------
export function disconnect(): void {
  if (activeSocket) {
    try {
      activeSocket.close();
    } catch {}
    activeSocket = null;
  }
  // Ferma server nativo se Host (no-op se client o shim)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ms: any = require('./meshServer');
    if (ms?.stopMeshServer) {
      // fire-and-forget (disconnect è sync)
      Promise.resolve(ms.stopMeshServer()).catch((e: any) => console.log('[meshSync] stopMeshServer error', e));
    }
  } catch {}
  activeWsUrl = null;
  activeRoomToken = null;
  activeRole = null;
  setSyncStatus('idle');
  console.log('[meshSync] disconnected');
}

// Re-export sync helpers per consumer diretto
export { syncDatabase as syncDatabase100 };
