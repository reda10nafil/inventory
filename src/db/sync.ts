/**
 * SyncroFlow — Sync mesh LAN (WatermelonDB)
 * Team Condiviso: pull completo su mesh join, push dei delta locali.
 * Nessun filtro userId — tutti i nodi ricevono tutto.
 * Trasporto: WebSocket su LAN router locale (IP via QR). Sostituibile con Ditto.
 */

import { Database } from '@nozbe/watermelondb';
import { synchronize } from '@nozbe/watermelondb/sync';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SyncStatus = 'created' | 'updated' | 'deleted' | 'synced';

export type PullResponse = {
  changes: {
    products: { created: any[]; updated: any[]; deleted: string[] };
    automations: { created: any[]; updated: any[]; deleted: string[] };
    timeline: { created: any[]; updated: any[]; deleted: string[] };
    chat_messages: { created: any[]; updated: any[]; deleted: string[] };
    team_members: { created: any[]; updated: any[]; deleted: string[] };
  };
  timestamp: number; // server/mesh logical clock
};

export type PushPayload = {
  products: { created: any[]; updated: any[]; deleted: string[] };
  automations: { created: any[]; updated: any[]; deleted: string[] };
  timeline: { created: any[]; updated: any[]; deleted: string[] };
  chat_messages: { created: any[]; updated: any[]; deleted: string[] };
  team_members: { created: any[]; updated: any[]; deleted: string[] };
  lastPulledAt: number | null;
};

const LAST_PULLED_KEY = '@syncroflow_last_pulled_at';

// ---------------------------------------------------------------------------
// Storage helper — usa AsyncStorage se disponibile, fallback memory
// ---------------------------------------------------------------------------
let memLastPulled: number | null = null;

async function getLastPulledAt(): Promise<number | null> {
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    const v = await AsyncStorage.getItem(LAST_PULLED_KEY);
    return v ? Number(v) : memLastPulled;
  } catch {
    return memLastPulled;
  }
}

async function setLastPulledAt(ts: number) {
  memLastPulled = ts;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem(LAST_PULLED_KEY, String(ts));
  } catch {}
}

// ---------------------------------------------------------------------------
// Pull iniziale o incrementale dalla stanza mesh autorizzata.
// Nessun filtro userId — il peer invia TUTTO ciò che ha.
// ---------------------------------------------------------------------------
export async function pullChanges(params: {
  lastPulledAt: number | null;
  meshPeerUrl: string; // es. ws://192.168.1.1:8080/sync
  token: string;
}): Promise<PullResponse> {
  const { lastPulledAt, meshPeerUrl, token } = params;

  // Peer REST locale: GET /pull?since=<lastPulledAt>, protetto dal token stanza.
  if (!meshPeerUrl) throw new Error('Peer mesh mancante: sync annullata');

  if (!token) throw new Error('Token mesh mancante: sync annullata');
  const url = new URL(`${meshPeerUrl.replace(/\/$/, '')}/pull`);
  url.searchParams.set('since', String(lastPulledAt ?? 0));
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`pull ${res.status}`);
  const data = (await res.json()) as PullResponse;
  return data;
}

// ---------------------------------------------------------------------------
// Push: delta locale -> mesh
// WatermelonDB sync internamente raccoglie created/updated/deleted per tabella
// dove sync_status != 'synced'. Invia tutti i delta delle tabelle supportate.
// ---------------------------------------------------------------------------
export async function pushChanges(params: {
  changes: PushPayload;
  lastPulledAt: number | null;
  meshPeerUrl: string;
  token: string;
}): Promise<void> {
  const { changes, meshPeerUrl, token } = params;
  if (!meshPeerUrl) return;

  const hasChanges = [
    changes.products,
    changes.automations,
    changes.timeline,
    changes.chat_messages,
    changes.team_members,
  ].some((table) => table.created.length || table.updated.length || table.deleted.length);

  if (!hasChanges) return;
  if (!token) throw new Error('Token mesh mancante: sync annullata');

  try {
    const url = `${meshPeerUrl.replace(/\/$/, '')}/push`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(changes),
    });
    if (!response.ok) throw new Error(`push ${response.status}`);
    console.log('[Sync:push] delta sent', {
      products: changes.products,
      timeline: changes.timeline.created.length,
    });
  } catch (e) {
    console.log('[Sync:push] failed, will retry next sync:', e);
    throw e; // Watermelon sync ritenterà
  }
}

// ---------------------------------------------------------------------------
// sync() — entry point chiamato su mesh join + periodicamente + on reconnect
// ---------------------------------------------------------------------------
export async function sync(database: Database, meshPeerUrl: string, token: string): Promise<void> {
  const lastPulledAt = await getLastPulledAt();

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt: lp }) => {
      // lp è quello Watermelon interno; usiamo anche il nostro persisted
      const at = lp ?? lastPulledAt;
      const res = await pullChanges({ lastPulledAt: at, meshPeerUrl, token });
      await setLastPulledAt(res.timestamp);
      return { changes: res.changes as any, timestamp: res.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt: lp }) => {
      await pushChanges({
        changes: changes as unknown as PushPayload,
        lastPulledAt: lp ?? lastPulledAt,
        meshPeerUrl,
        token,
      });
    },
    // Team condiviso: nessun filtro, invia tutto.
    // Conflitti: last-write-wins su updated_at (Watermelon default)
  });

  console.log('[Sync] completed at', new Date().toISOString());
}

/** Pull iniziale dopo il pairing QR — forza lastPulledAt=null. */
export async function syncOnMeshJoin(database: Database, meshPeerUrl: string, token: string): Promise<void> {
  memLastPulled = null;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem(LAST_PULLED_KEY);
  } catch {}
  await sync(database, meshPeerUrl, token);
}

// ---------------------------------------------------------------------------
// Permessi write — team condiviso (solo write gate, mai read filter)
// ---------------------------------------------------------------------------
export function assertCanWrite(role: string | undefined) {
  if (role === 'viewer') throw new Error('Permesso negato: viewer read-only');
}

export function canWrite(role: string | undefined): boolean {
  return role === 'admin' || role === 'editor';
}
