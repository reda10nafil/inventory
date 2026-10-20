/**
 * SyncroFlow — meshServer LAN reale (Bare RN 0.81.5)
 * Trasporto: TCP nativo via react-native-tcp-socket + upgrade WS manuale
 * Fallback: Node http module per dev / shim quando TcpSocket non installato.
 *
 * Espone:
 *  - startMeshServer(port, token, onMessage)
 *  - stopMeshServer()
 * Ascolta su 0.0.0.0:8080 (configurabile)
 * Gestisce:
 *  - Upgrade WS manuale (Sec-WebSocket-Accept = base64(sha1(key + GUID)))
 *  - HTTP REST: GET /pull?since , POST /push , POST /chat/push , GET /health
 * Log prefix: [meshServer]
 */

import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import { isMeshRequestAuthorized } from './meshAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MeshMessage = {
  type: string;
  token?: string;
  [k: string]: any;
};

export type OnMeshMessage = (msg: MeshMessage, socket: any) => void;

type ClientMeta = {
  socket: any;
  isWs: boolean;
  authenticated: boolean;
  buffer: Buffer;
  addr: string;
};

// ---------------------------------------------------------------------------
// State singleton
// ---------------------------------------------------------------------------
let server: any = null;
let tcpModule: any = null;
let httpFallbackServer: any = null;
let activePort: number | null = null;
let activeToken: string | null = null;
let onMessageCb: OnMeshMessage | null = null;
let clients: Set<any> = new Set();
let clientMeta = new Map<any, ClientMeta>();
let serverMode: 'tcp' | 'http' | 'shim' = 'shim';

// ---------------------------------------------------------------------------
// Shim loader: react-native-tcp-socket con try/catch
// ---------------------------------------------------------------------------
function loadTcpSocket(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TcpSocket: any = require('react-native-tcp-socket');
    // API: TcpSocket.createServer(callback) or TcpSocket.default.createServer
    // Support both export styles
    const mod = TcpSocket.default ?? TcpSocket;
    if (mod && typeof mod.createServer === 'function') {
      console.log('[meshServer] TcpSocket module found');
      return mod;
    }
    // Some versions export directly
    if (TcpSocket.createServer) return TcpSocket;
    console.log('[meshServer] TcpSocket found but no createServer');
    return null;
  } catch (e: any) {
    console.log('[meshServer] TODO nativo: react-native-tcp-socket non installato — fallback http:', e?.message ?? e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Crypto helpers (WS Accept)
// ---------------------------------------------------------------------------
function computeWsAccept(key: string): string {
  // SHA1 + base64 — usa expo-crypto se disponibile, fallback Node crypto o pure JS
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  try {
    // Node crypto (available in RN via polyfill or http fallback env)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    if (crypto?.createHash) {
      return crypto.createHash('sha1').update(key + GUID, 'binary').digest('base64');
    }
  } catch {}
  // Fallback: use global crypto if available (Expo/JSC)
  // Minimal pure impl not needed — log and return key for dev shim
  console.log('[meshServer] crypto.createHash non disponibile, fallback insecure accept');
  return key;
}

// ---------------------------------------------------------------------------
// WS frame encode/decode (minimal RFC6455)
// text frames only, no fragmentation, masked client -> unmasked server
// ---------------------------------------------------------------------------
function encodeWsFrame(data: string | Buffer): Buffer {
  const payload = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const len = payload.length;
  let header: Buffer;
  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len; // server -> client not masked
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x81;
    header[1] = 127;
    // write 64-bit length (high 32 zero for <4GB)
    header.writeUInt32BE(0, 2);
    header.writeUInt32BE(len, 6);
  }
  return Buffer.concat([header, payload]);
}

function tryDecodeWsFrames(buf: Buffer): { messages: string[]; remaining: Buffer } {
  const messages: string[] = [];
  let offset = 0;
  while (offset + 2 <= buf.length) {
    const b0 = buf[offset];
    const b1 = buf[offset + 1];
    const fin = (b0 & 0x80) !== 0;
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buf.length) break;
      payloadLen = buf.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buf.length) break;
      // assume <4GB
      payloadLen = buf.readUInt32BE(offset + 6);
      headerLen = 10;
    }

    let maskKey: Buffer | null = null;
    if (masked) {
      if (offset + headerLen + 4 > buf.length) break;
      maskKey = buf.slice(offset + headerLen, offset + headerLen + 4);
      headerLen += 4;
    }

    if (offset + headerLen + payloadLen > buf.length) break; // incomplete

    let payload = buf.slice(offset + headerLen, offset + headerLen + payloadLen);
    if (masked && maskKey) {
      // unmask
      const unmasked = Buffer.allocUnsafe(payload.length);
      for (let i = 0; i < payload.length; i++) unmasked[i] = payload[i] ^ maskKey[i % 4];
      payload = unmasked;
    }

    // control frames
    if (opcode === 0x8) {
      // close frame — caller should close socket
      offset += headerLen + payloadLen;
      break;
    } else if (opcode === 0x9) {
      // ping -> handled outside (we know offset)
      offset += headerLen + payloadLen;
      continue;
    } else if (opcode === 0x1 || opcode === 0x0) {
      // text / continuation
      if (fin) messages.push(payload.toString('utf8'));
    }
    offset += headerLen + payloadLen;
  }
  return { messages, remaining: buf.slice(offset) };
}

// ---------------------------------------------------------------------------
// HTTP / REST handling (shared between TCP and http fallback)
// ---------------------------------------------------------------------------
async function handleRestRequest(
  method: string,
  urlPath: string,
  headers: Record<string, string>,
  body: string,
  socket: any,
  isWsUpgrade: boolean,
): Promise<boolean> {
  // ritorna true se risposta già inviata
  const url = new URL(urlPath, `http://localhost`);
  const pathname = url.pathname;

  // --- WS upgrade già gestito prima —qui solo REST ---
  if (method === 'GET' && (pathname === '/health' || pathname === '/')) {
    const payload = JSON.stringify({ status: 'ok', port: activePort, platform: Platform.OS });
    sendHttp(socket, 200, payload);
    return true;
  }

  if ((pathname === '/pull' && method === 'GET') ||
      ((pathname === '/push' || pathname === '/chat/push') && method === 'POST')) {
    if (!isAuthorized(url, headers)) {
      sendHttp(socket, 401, JSON.stringify({ error: 'unauthorized' }));
      return true;
    }
  }

  if (pathname === '/pull' && method === 'GET') {
    const since = Number(url.searchParams.get('since') ?? '0');
    console.log('[meshServer] GET /pull?since=' + since);
    try {
      const data = await buildPullResponse(since);
      sendHttp(socket, 200, JSON.stringify(data));
    } catch (e) {
      console.log('[meshServer] /pull failed', e);
      sendHttp(socket, 500, JSON.stringify({ error: 'pull_failed' }));
    }
    return true;
  }

  if (pathname === '/push' && method === 'POST') {
    try {
      const json = body ? JSON.parse(body) : {};
      await applyPushPayload(json);
      // broadcast to WS clients so others get light notification
      broadcastWs({ type: 'push', ts: Date.now() });
    } catch (e) {
      console.log('[meshServer] /push failed', e);
      sendHttp(socket, 500, JSON.stringify({ error: 'push_failed' }));
      return true;
    }
    sendHttp(socket, 200, JSON.stringify({ ok: true }));
    return true;
  }

  if (pathname === '/chat/push' && method === 'POST') {
    try {
      const json = body ? JSON.parse(body) : {};
      const { token: _roomToken, ...chatPayload } = json;
      await appendChatMessage(chatPayload);
      // persist + broadcast WS
      broadcastWs({ type: 'chat', ...chatPayload });
      if (onMessageCb) onMessageCb({ type: 'chat', ...chatPayload }, socket);
    } catch (e) {
      console.log('[meshServer] /chat/push error', e);
      sendHttp(socket, 500, JSON.stringify({ error: 'chat_push_failed' }));
      return true;
    }
    sendHttp(socket, 200, JSON.stringify({ ok: true }));
    return true;
  }

  return false;
}

function isAuthorized(url: URL, headers: Record<string, string>): boolean {
  return isMeshRequestAuthorized(url, headers.authorization, activeToken);
}

function sendUnauthorized(socket: any) {
  sendHttp(socket, 401, JSON.stringify({ error: 'unauthorized' }));
}

function sendHttp(socket: any, status: number, body: string, extraHeaders: Record<string, string> = {}) {
  const statusText = status === 200 ? 'OK'
    : status === 101 ? 'Switching Protocols'
    : status === 401 ? 'Unauthorized'
    : status === 404 ? 'Not Found'
    : status === 500 ? 'Internal Server Error'
    : 'Error';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': String(Buffer.byteLength(body)),
    'Connection': 'close',
    'Access-Control-Allow-Origin': '*',
    ...extraHeaders,
  };
  let head = `HTTP/1.1 ${status} ${statusText}\r\n`;
  for (const [k, v] of Object.entries(headers)) head += `${k}: ${v}\r\n`;
  head += '\r\n';
  try {
    socket.write(head + body);
    // per http fallback con keep-alive, chiudi dopo risposta se non WS
    // TcpSocket: client gestisce close; per semplicità non chiudiamo subito sui keep-alive
    // ma se header Connection: close, il client chiuderà; noi chiudiamo dopo breve
    if (headers['Connection'] === 'close' && (socket as any).end) {
      // delay close to flush
      setTimeout(() => {
        try { socket.destroy ? socket.destroy() : socket.end(); } catch {}
      }, 50);
    }
  } catch (e) {
    console.log('[meshServer] sendHttp write error', e);
  }
}

function sendWsUpgrade(socket: any, accept: string) {
  const resp =
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n` +
    '\r\n';
  try {
    socket.write(resp);
    console.log('[meshServer] WS upgrade 101 sent, accept', accept.slice(0, 20) + '...');
  } catch (e) {
    console.log('[meshServer] sendWsUpgrade error', e);
  }
}

function broadcastWs(obj: any): number {
  const frame = encodeWsFrame(JSON.stringify(obj));
  let delivered = 0;
  for (const c of clients) {
    const m = clientMeta.get(c);
    if (m?.isWs && m.authenticated) {
      try { c.write(frame); delivered += 1; } catch {}
    }
  }
  return delivered;
}

function sendWs(socket: any, obj: any) {
  if (!clientMeta.get(socket)?.authenticated) return;
  try { socket.write(encodeWsFrame(JSON.stringify(obj))); } catch (e) { console.log('[meshServer] sendWs error', e); }
}

// ---------------------------------------------------------------------------
// DB helpers: pull / push / chat (lazy import per evitare cycle)
// ---------------------------------------------------------------------------
async function buildPullResponse(since: number): Promise<any> {
  // A database error must fail the request so the client can retry; an empty
  // snapshot with a new timestamp would silently mark missing data as synced.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbMod = require('../db');
    const db = dbMod.database;
    if (!db) throw new Error('no db');
    // Collezioni: products, automations, timeline, chat_messages, team_members
    // Estrai tutto con updated_at > since (simplified: created_at/updated_at)
    const tables = ['products', 'automations', 'timeline', 'chat_messages', 'team_members'] as const;
    const changes: any = {};
    const ts = Date.now();
    for (const t of tables) {
      try {
        const col = db.get(t);
        // query where updated_at > since OR created_at > since (fallback cerca tutto se since==0)
        // Usiamo Q.where se disponibile, altrimenti fetch all e filtra JS (compat)
        let recs: any[] = [];
        try {
          const { Q } = require('@nozbe/watermelondb');
          const q = since ? col.query(Q.where('updated_at', Q.gt(since))) : col.query();
          recs = await q.fetch();
        } catch {
          recs = await col.query().fetch();
          if (since) recs = recs.filter((r: any) => (r.updatedAt ?? r.updated_at ?? r.createdAt ?? 0) > since);
        }
        // Serialize raw
        const raws = recs.map((r: any) => (r._raw ?? r));
        // Simple LWW: since==0 -> all created, else updated
        changes[t] = {
          created: since === 0 ? raws : [],
          updated: since !== 0 ? raws : [],
          deleted: [],
        };
      } catch (e) {
        console.log('[meshServer] buildPull table failed', t, e);
        throw e;
      }
    }
    // Ensure expected keys mapping
    return {
      changes: {
        products: changes.products ?? { created: [], updated: [], deleted: [] },
        automations: changes.automations ?? { created: [], updated: [], deleted: [] },
        timeline: changes.timeline ?? { created: [], updated: [], deleted: [] },
        chat_messages: changes.chat_messages ?? changes.chatMessages ?? { created: [], updated: [], deleted: [] },
        team_members: changes.team_members ?? { created: [], updated: [], deleted: [] },
      },
      timestamp: ts,
    };
  } catch (e) {
    console.log('[meshServer] buildPullResponse failed:', (e as Error)?.message ?? e);
    throw e;
  }
}

async function applyPushPayload(payload: any) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbMod = require('../db');
    const db = dbMod.database;
    if (!db) throw new Error('database unavailable');
    // Payload shape: { products: {created,updated,deleted}, automations..., timeline..., chat_messages..., lastPulledAt }
    // Applica via DB write batch (best-effort)
    const tables = ['products', 'automations', 'timeline', 'chat_messages', 'team_members'];
    // No-op if empty — log count
    const counts = tables.map((t) => {
      const v = payload[t] ?? payload[t.replace('_', '')];
      if (!v) return `${t}:0`;
      return `${t}:${(v.created?.length ?? 0) + (v.updated?.length ?? 0)}`;
    });
    console.log('[meshServer] applyPush counts', counts.join(' '));
    // Real apply: iterate created -> db.get(t).create, etc.
    // For brevity: use database.write + create/update — failures are logged not thrown
    // We attempt generic apply if model exists
    await db.write(async () => {
      for (const t of tables) {
        const bucket = payload[t] ?? payload[t.replace('_', '')];
        if (!bucket) continue;
        const col = db.get(t);
        for (const raw of bucket.created ?? []) {
          await col.create((rec: any) => { Object.assign(rec._raw, raw); });
        }
        for (const raw of bucket.updated ?? []) {
          const rec = await col.find(raw.id);
          await rec.update((r: any) => Object.assign(r._raw, raw));
        }
        for (const id of bucket.deleted ?? []) {
          const rec = await col.find(id);
          await rec.markAsDeleted();
        }
      }
    });
  } catch (e) {
    console.log('[meshServer] applyPushPayload error', e);
    throw e;
  }
}

async function appendChatMessage(payload: any) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dbMod = require('../db');
    const db = dbMod.database;
    if (!db) throw new Error('database unavailable');
    if (!payload.skus && !payload.automationIds && !payload.text) return;
    await db.write(async () => {
      const col = db.get('chat_messages');
      await col.create((rec: any) => {
        rec._raw.payload = JSON.stringify({ skus: payload.skus ?? [], automationIds: payload.automationIds ?? [], text: payload.text ?? '' });
        rec._raw.hydrated_cache = payload.hydrated_cache ? JSON.stringify(payload.hydrated_cache) : null;
        rec._raw.sender_id = payload.sender_id ?? 'mesh';
        rec._raw.created_at = Date.now();
        rec._raw.sync_status = 'synced';
      });
    });
    console.log('[meshServer] chat_messages appended');
  } catch (e) {
    console.log('[meshServer] appendChatMessage error', e);
    throw e;
  }
}

// ---------------------------------------------------------------------------
// TCP data handler (shared)
// ---------------------------------------------------------------------------
async function handleTcpData(socket: any, data: Buffer) {
  const meta = clientMeta.get(socket);
  if (!meta) return;
  // Append to buffer
  meta.buffer = Buffer.concat([meta.buffer, data]);

  // If already WS upgraded, decode frames
  if (meta.isWs) {
    const { messages, remaining } = tryDecodeWsFrames(meta.buffer);
    meta.buffer = remaining;
    for (const m of messages) {
      // ping/pong
      if (m === '__ping__') {
        try { socket.write(encodeWsFrame('__pong__')); } catch {}
        continue;
      }
      let obj: any;
      try { obj = JSON.parse(m); } catch { obj = { raw: m }; }
      // Authenticate every peer before accepting any message or broadcasting it.
      if (obj.type === 'hello') {
        if (!activeToken || obj.token !== activeToken) {
          sendWs(socket, { type: 'error', error: 'unauthorized' });
          try { socket.destroy ? socket.destroy() : socket.end?.(); } catch {}
          clients.delete(socket);
          clientMeta.delete(socket);
          break;
        }
        meta.authenticated = true;
        sendWs(socket, { type: 'hello_ack', token: activeToken, ts: Date.now() });
        continue;
      }
      if (!meta.authenticated) {
        sendWs(socket, { type: 'error', error: 'unauthorized' });
        try { socket.destroy ? socket.destroy() : socket.end?.(); } catch {}
        clients.delete(socket);
        clientMeta.delete(socket);
        break;
      }
      if (obj.type === 'ping') {
        sendWs(socket, { type: 'pong', ts: Date.now() });
        continue;
      }
      // broadcast to others + callback
      if (obj.type === 'light_payload' || obj.type === 'chat' || obj.type === 'push') {
        // save chat if light_payload
        if (obj.type === 'light_payload') {
          await appendChatMessage(obj);
          // normalize to chat for listeners
          const chat = { type: 'chat', skus: obj.skus, automationIds: obj.automationIds, text: obj.text, ts: obj.ts };
          broadcastWs(chat);
          // notifica anche Host (server) — la sua UI non è WS client, va avvisata via meshSync
          try { const msync: any = require('./meshSync'); if (msync?.notifyLocalChat) msync.notifyLocalChat(obj); } catch {}
        } else {
          // forward to other WS clients (exclude sender)
          const { token: _roomToken, ...message } = obj;
          const frame = encodeWsFrame(JSON.stringify(message));
          for (const c of clients) {
            if (c !== socket) {
              const cm = clientMeta.get(c);
              if (cm?.isWs && cm.authenticated) try { c.write(frame); } catch {}
            }
          }
          // anche Host riceve push/chat via notify
          try { const msync: any = require('./meshSync'); if (msync?.notifyLocalChat && (obj.type==='chat'||obj.type==='push')) msync.notifyLocalChat(message); } catch {}
        }
      }
      if (onMessageCb) {
        const { token: _roomToken, ...message } = obj;
        try { onMessageCb(message, socket); } catch (e) { console.log('[meshServer] onMessage error', e); }
      }
    }
    return;
  }

  // HTTP / WS upgrade parsing
  // Wait until we have full header
  const headerEnd = meta.buffer.indexOf('\r\n\r\n');
  if (headerEnd === -1) {
    if (meta.buffer.length > 8192) {
      console.log('[meshServer] header too large, closing');
      try { socket.destroy(); } catch {}
    }
    return; // incomplete
  }

  const headerStr = meta.buffer.slice(0, headerEnd).toString('utf8');
  const lines = headerStr.split('\r\n');
  const [method, rawPath] = lines[0].split(' ');
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    const idx = lines[i].indexOf(':');
    if (idx > -1) headers[lines[i].slice(0, idx).trim().toLowerCase()] = lines[i].slice(idx + 1).trim();
  }

  const contentLength = parseInt(headers['content-length'] ?? '0', 10);
  const totalNeeded = headerEnd + 4 + contentLength;
  if (meta.buffer.length < totalNeeded) {
    // wait for body
    return;
  }

  const bodyBuf = meta.buffer.slice(headerEnd + 4, totalNeeded);
  const bodyStr = bodyBuf.toString('utf8');
  // Remaining after this request (pipelining)
  const remaining = meta.buffer.slice(totalNeeded);
  meta.buffer = remaining;

  // CORS preflight
  if (method === 'OPTIONS') {
    const resp = 'HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, Authorization\r\nContent-Length: 0\r\nConnection: close\r\n\r\n';
    try { socket.write(resp); } catch {}
    return;
  }

  // WS upgrade detection
  const isUpgrade = headers['upgrade']?.toLowerCase() === 'websocket' && !!headers['sec-websocket-key'];
  if (isUpgrade) {
    const key = headers['sec-websocket-key'];
    // token gate via query ?token=
    try {
      const u = new URL(rawPath, 'http://localhost');
      const qToken = u.searchParams.get('token');
      if (!activeToken || qToken !== activeToken) {
        sendUnauthorized(socket);
        return;
      }
    } catch {}
    const accept = computeWsAccept(key);
    sendWsUpgrade(socket, accept);
    meta.isWs = true;
    clients.add(socket); // ensure tracked
    // if remaining contains WS frames already, handle next tick
    if (meta.buffer.length > 0) setTimeout(() => handleTcpData(socket, Buffer.alloc(0)), 0);
    console.log('[meshServer] WS client upgraded', meta.addr);
    return;
  }

  // Regular HTTP
  clients.add(socket);
  const handled = await handleRestRequest(method, rawPath, headers, bodyStr, socket, false);
  if (!handled) {
    console.log('[meshServer] 404', method, rawPath);
    sendHttp(socket, 404, JSON.stringify({ error: 'not found', path: rawPath }));
  }
  // non-WS http sockets are closed by sendHttp; pipeline remaining ignored (close)
}

// ---------------------------------------------------------------------------
// Public API: startMeshServer / stopMeshServer
// ---------------------------------------------------------------------------
export async function startMeshServer(port: number, token: string, onMessage?: OnMeshMessage): Promise<void> {
  if (server || httpFallbackServer) {
    console.log('[meshServer] already running on', activePort, '— restarting');
    await stopMeshServer();
  }
  activePort = port;
  activeToken = token;
  onMessageCb = onMessage ?? null;

  tcpModule = loadTcpSocket();

  if (tcpModule) {
    serverMode = 'tcp';
    await new Promise<void>((resolve, reject) => {
      try {
        // TcpSocket.createServer(callback) — socket is react-native-tcp-socket Socket
        server = tcpModule.createServer((socket: any) => {
          const addr = `${socket.remoteAddress ?? 'unknown'}:${socket.remotePort ?? ''}`;
          console.log('[meshServer] TCP client connected', addr);
          clients.add(socket);
          clientMeta.set(socket, { socket, isWs: false, authenticated: false, buffer: Buffer.alloc(0), addr });

          socket.on('data', (d: any) => {
            const buf = Buffer.isBuffer(d) ? d : Buffer.from(d);
            handleTcpData(socket, buf).catch((e) => console.log('[meshServer] handleTcpData error', e));
          });
          socket.on('error', (e: any) => console.log('[meshServer] socket error', addr, e?.message ?? e));
          socket.on('close', () => {
            console.log('[meshServer] socket close', addr);
            clients.delete(socket);
            clientMeta.delete(socket);
          });
        });

        server.listen({ port, host: '0.0.0.0' }, () => {
          console.log(`[meshServer] TCP listening on 0.0.0.0:${port} upgrade WS + REST /pull /push /chat/push`);
          resolve();
        });
        server.on('error', (e: any) => {
          console.log('[meshServer] TCP server error', e?.message ?? e);
          reject(e);
        });
      } catch (e) {
        console.log('[meshServer] TCP createServer exception, fallback http', e);
        reject(e);
      }
    }).catch(async (e) => {
      console.log('[meshServer] TCP listen failed, trying http fallback', e?.message ?? e);
      server = null;
      await startHttpFallback(port, token, onMessage);
    });
    return;
  }

  // fallback http (Node http module)
  await startHttpFallback(port, token, onMessage);
}

async function startHttpFallback(port: number, token: string, onMessage?: OnMeshMessage) {
  serverMode = 'http';
  let http: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    http = require('http');
  } catch (e) {
    console.log('[meshServer] HTTP fallback unavailable', e);
    serverMode = 'shim';
    activePort = null;
    activeToken = null;
    throw new Error('Server mesh non disponibile su questo dispositivo');
  }

  const crypto = (() => { try { return require('crypto'); } catch { return null; } })();

  httpFallbackServer = http.createServer(async (req: any, res: any) => {
    // WS upgrade via http server 'upgrade' event — handled separately
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    await new Promise<void>((r) => req.on('end', () => r()));
    const body = Buffer.concat(chunks).toString('utf8');
    const urlPath = req.url ?? '/';
    const method = req.method ?? 'GET';

    // headers lowercased
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers as Record<string, any>)) headers[k.toLowerCase()] = String(v ?? '');

    // Collect response hijack for sendHttp compat
    const fakeSocket = {
      write: (data: string) => {
        // data is HTTP response string — parse status and body
        // simpler: we already handle here, but for code reuse we parse
        // Instead directly respond via res
        return true;
      },
      destroy: () => {},
      end: () => {},
    };

    // Manual REST handling (reuse logic but directly via res)
    const url = new URL(urlPath, `http://localhost`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (method === 'GET' && (pathname === '/health' || pathname === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', port: activePort, mode: 'http-fallback' }));
      return;
    }
    if ((pathname === '/pull' && method === 'GET') ||
        ((pathname === '/push' || pathname === '/chat/push') && method === 'POST')) {
      if (!isAuthorized(url, headers)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
    }
    if (pathname === '/pull' && method === 'GET') {
      const since = Number(url.searchParams.get('since') ?? '0');
      try {
        const data = await buildPullResponse(since);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (e) {
        console.log('[meshServer] [http] /pull failed', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'pull_failed' }));
      }
      return;
    }
    if (pathname === '/push' && method === 'POST') {
      try {
        const j = body ? JSON.parse(body) : {};
        await applyPushPayload(j);
        broadcastHttpWs({ type: 'push', ts: Date.now() });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.log('[meshServer] [http] /push failed', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'push_failed' }));
      }
      return;
    }
    if (pathname === '/chat/push' && method === 'POST') {
      try {
        const j = body ? JSON.parse(body) : {};
        const { token: _roomToken, ...chatPayload } = j;
        await appendChatMessage(chatPayload);
        broadcastHttpWs({ type: 'chat', ...chatPayload });
        if (onMessageCb) onMessageCb({ type: 'chat', ...chatPayload }, null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.log('[meshServer] [http] /chat/push failed', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'chat_push_failed' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found', path: urlPath }));
  });

  // Track WS clients for broadcast (http fallback upgrade)
  const wsHttpClients: Set<any> = new Set();
  // re-use global clients for broadcast
  clients = wsHttpClients as any;

  httpFallbackServer.on('upgrade', (req: any, socket: any, head: Buffer) => {
    const key = req.headers['sec-websocket-key'] as string | undefined;
    if (!key || !crypto) { socket.destroy(); return; }
    const qToken = (() => { try { const u = new URL(req.url ?? '', 'http://localhost'); return u.searchParams.get('token'); } catch { return null; }})();
    if (!activeToken || qToken !== activeToken) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); socket.destroy(); return;
    }
    const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
    const meta: ClientMeta = { socket, isWs: true, authenticated: false, buffer: Buffer.alloc(0), addr: (socket.remoteAddress ?? 'http') + '' };
    clientMeta.set(socket, meta);
    wsHttpClients.add(socket);
    console.log('[meshServer] [http] WS upgraded', req.url?.split('?')[0] ?? '/');

    // handle head leftover
    if (head && head.length) handleTcpData(socket, head).catch(() => {});

    socket.on('data', (d: Buffer) => {
      const buf = Buffer.isBuffer(d) ? d : Buffer.from(d);
      handleTcpData(socket, buf).catch((e) => console.log('[meshServer] [http] WS data error', e));
    });
    socket.on('close', () => { wsHttpClients.delete(socket); clientMeta.delete(socket); console.log('[meshServer] [http] WS close'); });
    socket.on('error', (e: any) => console.log('[meshServer] [http] WS error', e?.message ?? e));
  });

  function broadcastHttpWs(obj: any) {
    const frame = encodeWsFrame(JSON.stringify(obj));
    for (const c of wsHttpClients) {
      if (!clientMeta.get(c)?.authenticated) continue;
      try { c.write(frame); } catch {}
    }
  }
  // expose for outer broadcastWs indirection (http mode uses wsHttpClients)
  // patch global broadcastWs reference by aliasing clients set — already done

  await new Promise<void>((resolve, reject) => {
    httpFallbackServer.listen(port, '0.0.0.0', () => {
      console.log(`[meshServer] HTTP fallback listening on 0.0.0.0:${port} (WS upgrade manuale + REST /pull /push /chat/push)`);
      resolve();
    });
    httpFallbackServer.on('error', (e: any) => { console.log('[meshServer] HTTP fallback error', e?.message ?? e); reject(e); });
  });
}

export async function stopMeshServer(): Promise<void> {
  console.log('[meshServer] stopping...', { port: activePort, mode: serverMode });
  // close clients
  for (const c of clients) {
    try { c.destroy ? c.destroy() : c.end?.(); } catch {}
  }
  clients.clear();
  clientMeta.clear();

  if (server) {
    try {
      await new Promise<void>((r) => server.close(() => r()));
      console.log('[meshServer] TCP server closed');
    } catch (e) { console.log('[meshServer] TCP close error', e); }
    server = null;
  }
  if (httpFallbackServer) {
    try {
      await new Promise<void>((r) => httpFallbackServer.close(() => r()));
      console.log('[meshServer] HTTP fallback closed');
    } catch (e) { console.log('[meshServer] HTTP close error', e); }
    httpFallbackServer = null;
  }
  if (serverMode === 'shim') {
    console.log('[meshServer] SHIM stopped (no-op)');
  }
  activePort = null;
  activeToken = null;
  onMessageCb = null;
  tcpModule = null;
  serverMode = 'shim';
}

// Helpers for inspection / WS send externally
export function getMeshServerInfo() {
  const authenticatedClients = Array.from(clientMeta.values())
    .filter((meta) => meta.isWs && meta.authenticated)
    .map((meta) => ({ id: meta.addr, address: meta.addr }));
  return {
    port: activePort,
    mode: serverMode,
    clientCount: authenticatedClients.length,
    authenticatedClients,
    listening: !!(server || httpFallbackServer),
  };
}
export function broadcastToMeshClients(obj: any) { return broadcastWs(obj); }
export function sendToMeshClient(socket: any, obj: any) { sendWs(socket, obj); }
