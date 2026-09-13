/**
 * SyncroFlow — Sync stub mesh LAN (WatermelonDB)
 * Team Condiviso: pull 100% su mesh join, push delta timeline.
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
// Pull: 100% sync su mesh join (lastPulledAt === null => full dump)
// Nessun filtro userId — il peer invia TUTTO ciò che ha.
// ---------------------------------------------------------------------------
export async function pullChanges(params: {
  lastPulledAt: number | null;
  meshPeerUrl: string; // es. ws://192.168.1.1:8080/sync
}): Promise<PullResponse> {
  const { lastPulledAt, meshPeerUrl } = params;

  // --- STUB LAN: sostituire con fetch/WS reale ---
  // Esempio mesh: GET http://<peer>/sync/pull?since=<lastPulledAt>
  // Per ora mock che ritorna empty su incremental, full su join.
  // In produzione: il peer host risponde con dump SQLite serializzato.
  if (!meshPeerUrl) {
    return { changes: emptyChanges(), timestamp: Date.now() };
  }

  try {
    const url = `${meshPeerUrl.replace(/\/$/, '')}/pull?since=${lastPulledAt ?? 0}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`pull ${res.status}`);
    const data = (await res.json()) as PullResponse;
    // Validazione minimale — non filtrare per userId
    return data;
  } catch (e) {
    // Offline / peer non raggiungibile -> nessun cambiamento, riprova al prossimo join
    console.log('[Sync:pull] peer unreachable, skip:', e);
    return { changes: emptyChanges(), timestamp: lastPulledAt ?? Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Push: delta locale -> mesh
// WatermelonDB sync internamente raccoglie created/updated/deleted per tabella
// dove sync_status != 'synced'. Qui inviamo solo timeline + prodotti modificati
// dall'ultimo pull (push delta — non full dump).
// ---------------------------------------------------------------------------
export async function pushChanges(params: {
  changes: PushPayload;
  lastPulledAt: number | null;
  meshPeerUrl: string;
}): Promise<void> {
  const { changes, meshPeerUrl } = params;
  if (!meshPeerUrl) return;

  const hasChanges =
    changes.products.created.length ||
    changes.products.updated.length ||
    changes.products.deleted.length ||
    changes.timeline.created.length ||
    changes.chat_messages.created.length;

  if (!hasChanges) return;

  try {
    const url = `${meshPeerUrl.replace(/\/$/, '')}/push`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
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
export async function sync(database: Database, meshPeerUrl: string): Promise<void> {
  const lastPulledAt = await getLastPulledAt();

  await synchronize({
    database,
    pullChanges: async ({ lastPulledAt: lp }) => {
      // lp è quello Watermelon interno; usiamo anche il nostro persisted
      const at = lp ?? lastPulledAt;
      const res = await pullChanges({ lastPulledAt: at, meshPeerUrl });
      await setLastPulledAt(res.timestamp);
      return { changes: res.changes as any, timestamp: res.timestamp };
    },
    pushChanges: async ({ changes, lastPulledAt: lp }) => {
      await pushChanges({
        changes: changes as unknown as PushPayload,
        lastPulledAt: lp ?? lastPulledAt,
        meshPeerUrl,
      });
    },
    // Team condiviso: nessun filtro, invia tutto.
    // Conflitti: last-write-wins su updated_at (Watermelon default)
  });

  console.log('[Sync] completed at', new Date().toISOString());
}

/** Full 100% pull esplicito su QR join — forza lastPulledAt=null */
export async function syncOnMeshJoin(database: Database, meshPeerUrl: string): Promise<void> {
  memLastPulled = null;
  try {
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    await AsyncStorage.removeItem(LAST_PULLED_KEY);
  } catch {}
  await sync(database, meshPeerUrl);
}

function emptyChanges(): PullResponse['changes'] {
  const e = { created: [], updated: [], deleted: [] };
  return {
    products: { ...e },
    automations: { ...e },
    timeline: { ...e },
    chat_messages: { ...e },
    team_members: { ...e },
  };
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
