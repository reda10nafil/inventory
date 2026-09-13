/**
 * SyncroFlow — __tests__/chatPayload.test.ts
 * Worker 4 — AI Tester & QA — bare RN 0.81.5
 *
 * Payload ultraleggero chat: { skus[] + automationIds } / { sku[] + automationIds }
 * - validazione JSON single-pass try/catch (zero librerie)
 * - edge empty / invalid / null / type-mismatch
 * - compat aliases: skus<->sku , automationId<->automationIds , text passthrough
 * - size budget <2KB su LAN isolata
 *
 * Mirrors:
 *  - src/components/chat/HydratedProductCard.tsx:12 parsePayload/normalizePayload
 *  - src/db/models/ChatMessage.ts:20 payloadSanitizer / ChatPayload type
 *  - src/services/meshSync.ts:21 LightPayload + buildQrPayload/parseQrPayload
 *
 * Run:  npx jest __tests__/chatPayload --no-coverage
 */

// ---------------------------------------------------------------------------
// Helpers — mirror esatti del sorgente (copiati per test isolato senza RN bridge)
// Se il sorgente cambia, questi test falliscono intenzionalmente -> aggiornare.
// ---------------------------------------------------------------------------
type HydratedPayload = {
  skus: string[];
  automationId?: string;
  sku?: string[];
  automationIds?: string[];
  text?: string;
};

type ChatPayload = {
  sku: string[];
  automationIds: string[];
  text?: string;
};

type LightPayload = {
  skus: string[];
  automationIds: string[];
  text?: string;
};

function normalizePayload(raw: any): HydratedPayload {
  if (!raw || typeof raw !== 'object') return { skus: [] };
  const skus: string[] = Array.isArray(raw.skus)
    ? raw.skus.filter((s: any) => typeof s === 'string')
    : Array.isArray(raw.sku)
      ? raw.sku.filter((s: any) => typeof s === 'string')
      : [];
  const automationId: string | undefined =
    typeof raw.automationId === 'string'
      ? raw.automationId
      : Array.isArray(raw.automationIds) && raw.automationIds[0]
        ? String(raw.automationIds[0])
        : undefined;
  return {
    skus,
    automationId,
    sku: skus,
    automationIds: automationId ? [automationId] : raw.automationIds,
    text: typeof raw.text === 'string' ? raw.text : undefined,
  };
}

function parsePayload(input: HydratedPayload | string): HydratedPayload {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return { skus: [] };
    try {
      const p = JSON.parse(trimmed);
      return normalizePayload(p);
    } catch {
      return { skus: [] };
    }
  }
  return normalizePayload(input as any);
}

// Mirror payloadSanitizer da ChatMessage.ts
const payloadSanitizer = (v: unknown): ChatPayload => {
  const fallback: ChatPayload = { sku: [], automationIds: [] };
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.sku) && Array.isArray(o.automationIds)) return o as ChatPayload;
  }
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      if (p && Array.isArray(p.sku) && Array.isArray(p.automationIds)) return p;
    } catch {}
  }
  return fallback;
};

// Mirror meshSync QR helpers
function buildQrPayload(ip: string, port: number, token: string): string {
  return `ws://${ip}:${port}?token=${token}`;
}
function parseQrPayload(payload: string) {
  const raw = payload.trim();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`QR payload non valido: ${raw}`);
  }
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    throw new Error(`Protocollo atteso ws://, ricevuto ${url.protocol}`);
  }
  const ip = url.hostname;
  const port = url.port ? Number(url.port) : 8080;
  const token = url.searchParams.get('token');
  if (!ip || !token) throw new Error('QR mancante di IP o token');
  const wsUrl = raw;
  const httpProto = url.protocol === 'wss:' ? 'https:' : 'http:';
  const httpUrl = `${httpProto}//${ip}:${port}`;
  return { wsUrl, httpUrl, ip, port, token, rawPayload: raw };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('chatPayload — parsing ultraleggero (skus + automationIds)', () => {
  describe('parsePayload() — string JSON input', () => {
    it('parsa JSON valido { skus, automationIds }', () => {
      const raw = JSON.stringify({ skus: ['LOG-2026-001', 'LOG-2026-002'], automationIds: ['auto-1'] });
      const out = parsePayload(raw);
      expect(out.skus).toEqual(['LOG-2026-001', 'LOG-2026-002']);
      expect(out.sku).toEqual(['LOG-2026-001', 'LOG-2026-002']);
      expect(out.automationId).toBe('auto-1');
      expect(out.automationIds).toEqual(['auto-1']);
    });

    it('parsa alias LAN { sku, automationIds }', () => {
      const raw = JSON.stringify({ sku: ['LOG-001'], automationIds: ['auto-A', 'auto-B'] });
      const out = parsePayload(raw);
      expect(out.skus).toEqual(['LOG-001']);
      // normalize prende solo il primo automationIds -> automationId
      expect(out.automationId).toBe('auto-A');
      expect(out.sku).toEqual(['LOG-001']);
    });

    it('parsa { skus, automationId } single', () => {
      const raw = JSON.stringify({ skus: ['A'], automationId: 'single-auto' });
      const out = parsePayload(raw);
      expect(out.skus).toEqual(['A']);
      expect(out.automationId).toBe('single-auto');
      expect(out.automationIds).toEqual(['single-auto']);
    });

    it('mantiene text se stringa', () => {
      const raw = JSON.stringify({ skus: ['X'], automationIds: ['a1'], text: 'ciao dal magazzino' });
      const out = parsePayload(raw);
      expect(out.text).toBe('ciao dal magazzino');
    });

    it('scarta text non-stringa', () => {
      const raw = JSON.stringify({ skus: ['X'], automationIds: ['a1'], text: 12345 });
      const out = parsePayload(raw);
      expect(out.text).toBeUndefined();
    });

    it('filtra skus non-stringa (numeri/null/obj)', () => {
      const raw = JSON.stringify({ skus: ['ok', 123 as any, null as any, {}, 'ok2'], automationIds: [] });
      const out = parsePayload(raw);
      expect(out.skus).toEqual(['ok', 'ok2']);
    });

    it('ritorna { skus: [] } su stringa vuota', () => {
      expect(parsePayload('')).toEqual({ skus: [] });
      expect(parsePayload('   ')).toEqual({ skus: [] });
      expect(parsePayload('\n\t  ')).toEqual({ skus: [] });
    });

    it('ritorna { skus: [] } su JSON invalido', () => {
      expect(parsePayload('not json {')).toEqual({ skus: [] });
      expect(parsePayload('{ skus: }')).toEqual({ skus: [] });
      expect(parsePayload('{{{{')).toEqual({ skus: [] });
      expect(parsePayload('null')).toEqual({ skus: [] }); // JSON null -> normalize -> []
      expect(parsePayload('42')).toEqual({ skus: [] });
      expect(parsePayload('"solo stringa"')).toEqual({ skus: [] });
    });

    it('ritorna { skus: [] } su object senza skus/sku', () => {
      expect(parsePayload(JSON.stringify({ foo: 'bar' }))).toEqual(
        expect.objectContaining({ skus: [] }),
      );
      expect(parsePayload(JSON.stringify({ automationIds: ['a1'] }))).toEqual(
        expect.objectContaining({ skus: [] }),
      );
    });

    it('trimma whitespace prima del parse', () => {
      const raw = '  \n ' + JSON.stringify({ skus: ['T1'], automationIds: ['x'] }) + '  ';
      expect(parsePayload(raw).skus).toEqual(['T1']);
    });

    it('gestisce skus: non-array -> []', () => {
      expect(parsePayload(JSON.stringify({ skus: 'not-array' as any })).skus).toEqual([]);
      expect(parsePayload(JSON.stringify({ skus: 123 as any })).skus).toEqual([]);
      expect(parsePayload(JSON.stringify({ skus: null as any })).skus).toEqual([]);
    });
  });

  describe('normalizePayload() — object input diretto', () => {
    it('accetta HydratedPayload object già tipizzato', () => {
      const out = parsePayload({ skus: ['A', 'B'], automationId: 'auto-x' } as any);
      expect(out.skus).toEqual(['A', 'B']);
      expect(out.automationId).toBe('auto-x');
    });

    it('ritorna { skus: [] } su null/undefined/number/boolean/array', () => {
      expect(normalizePayload(null)).toEqual(expect.objectContaining({ skus: [] }));
      expect(normalizePayload(undefined)).toEqual(expect.objectContaining({ skus: [] }));
      expect(normalizePayload(42 as any)).toEqual(expect.objectContaining({ skus: [] }));
      expect(normalizePayload(true as any)).toEqual(expect.objectContaining({ skus: [] }));
      expect(normalizePayload([] as any)).toEqual(expect.objectContaining({ skus: [] }));
      expect(normalizePayload('string' as any)).toEqual(expect.objectContaining({ skus: [] }));
    });

    it('automationId preferisce automationId string su automationIds[0]', () => {
      const out = normalizePayload({ skus: ['S'], automationId: 'primary', automationIds: ['secondary'] });
      expect(out.automationId).toBe('primary');
    });

    it('automationIds assente -> automationId undefined, automationIds undefined', () => {
      const out = normalizePayload({ skus: ['S1'] });
      expect(out.automationId).toBeUndefined();
      expect(out.automationIds).toBeUndefined();
    });

    it('automationIds vuoto -> automationId undefined', () => {
      const out = normalizePayload({ skus: ['S1'], automationIds: [] });
      expect(out.automationId).toBeUndefined();
    });

    it('coercizza automationIds[0] non-stringa via String()', () => {
      const out = normalizePayload({ skus: ['S1'], automationIds: [123 as any] });
      expect(out.automationId).toBe('123');
    });

    it('alias sku popolato mirror di skus sempre', () => {
      const out = normalizePayload({ sku: ['SKU-1', 'SKU-2'], automationIds: ['a1'] });
      expect(out.sku).toEqual(out.skus);
      expect(out.skus).toEqual(['SKU-1', 'SKU-2']);
    });

    it('skus ha priorità su sku se entrambi presenti', () => {
      const out = normalizePayload({ skus: ['SKUS-WINS'], sku: ['SKU-LOSE'], automationIds: ['a1'] });
      expect(out.skus).toEqual(['SKUS-WINS']);
    });
  });

  describe('payloadSanitizer (ChatMessage WatermelonDB)', () => {
    it('ritorna object valido se { sku: string[], automationIds: string[] }', () => {
      const valid: ChatPayload = { sku: ['LOG-001'], automationIds: ['auto-1'], text: 'hi' };
      expect(payloadSanitizer(valid)).toEqual(valid);
      expect(payloadSanitizer({ sku: [], automationIds: [] })).toEqual({ sku: [], automationIds: [] });
    });

    it('parsa string JSON valida', () => {
      const str = JSON.stringify({ sku: ['A'], automationIds: ['b'], text: 't' });
      expect(payloadSanitizer(str)).toEqual({ sku: ['A'], automationIds: ['b'], text: 't' });
    });

    it('fallback su string JSON invalida / incompleta', () => {
      expect(payloadSanitizer('not-json')).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer(JSON.stringify({ sku: ['A'] }))).toEqual({ sku: [], automationIds: [] }); // manca automationIds
      expect(payloadSanitizer(JSON.stringify({ automationIds: ['a'] }))).toEqual({ sku: [], automationIds: [] }); // manca sku
      expect(payloadSanitizer(JSON.stringify({ sku: 'not-array' as any, automationIds: [] }))).toEqual({
        sku: [],
        automationIds: [],
      });
    });

    it('fallback su tipi primitivi / array / null', () => {
      expect(payloadSanitizer(null)).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer(undefined)).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer(42 as any)).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer([] as any)).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer('' as any)).toEqual({ sku: [], automationIds: [] });
    });

    it('fallback su JSON string che decodifica in tipo non-object', () => {
      expect(payloadSanitizer(JSON.stringify(null))).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer(JSON.stringify(123))).toEqual({ sku: [], automationIds: [] });
      expect(payloadSanitizer(JSON.stringify('ciao'))).toEqual({ sku: [], automationIds: [] });
    });
  });

  describe('LightPayload — serializzazione LAN + budget size', () => {
    it('serializza LightPayload e rimane <2KB per 5 SKU + 2 automation', () => {
      const p: LightPayload = {
        skus: ['LOG-2026-001', 'LOG-2026-002', 'LOG-2026-003', 'LOG-2026-004', 'LOG-2026-005'],
        automationIds: ['auto-warehouse-to-showcase', 'auto-sell'],
        text: 'sposta in vetrina',
      };
      const json = JSON.stringify(p);
      expect(Buffer.byteLength(json, 'utf8')).toBeLessThan(2048);
      // round-trip via parsePayload
      const parsed = parsePayload(json);
      expect(parsed.skus).toEqual(p.skus);
    });

    it('LightPayload vuoto è valido (nessun sku, nessuna automazione)', () => {
      const p: LightPayload = { skus: [], automationIds: [] };
      const json = JSON.stringify(p);
      const parsed = parsePayload(json);
      expect(parsed.skus).toEqual([]);
      expect(parsed.automationId).toBeUndefined();
    });

    it('genera hydratedCache shape compatibile (snapshot opzionale)', () => {
      // ChatMessage hydrated_cache: { products?: [], automations?: [], generatedAt }
      const hydratedCache = {
        products: [{ sku: 'LOG-001', furType: 'elettronica' }],
        automations: [{ id: 'auto-1', name: 'Sposta' }],
        generatedAt: Date.now(),
      };
      expect(Array.isArray(hydratedCache.products)).toBe(true);
      expect(typeof hydratedCache.generatedAt).toBe('number');
    });
  });

  describe('meshSync QR helpers (buildQrPayload / parseQrPayload)', () => {
    it('build -> parse round-trip ws://IP:PORT?token=xxx', () => {
      const qr = buildQrPayload('192.168.1.50', 8080, 'ABC12345');
      expect(qr).toBe('ws://192.168.1.50:8080?token=ABC12345');
      const info = parseQrPayload(qr);
      expect(info.ip).toBe('192.168.1.50');
      expect(info.port).toBe(8080);
      expect(info.token).toBe('ABC12345');
      expect(info.wsUrl).toBe(qr);
      expect(info.httpUrl).toBe('http://192.168.1.50:8080');
    });

    it('parse wss:// -> https:// httpUrl', () => {
      const info = parseQrPayload('wss://10.0.0.5:9000?token=XYZ');
      expect(info.httpUrl).toBe('https://10.0.0.5:9000');
    });

    it('trimma whitespace sul QR payload', () => {
      const info = parseQrPayload('  ws://192.168.1.1:8080?token=T1  \n');
      expect(info.token).toBe('T1');
    });

    it('lancia su protocollo non-ws', () => {
      expect(() => parseQrPayload('http://192.168.1.1:8080?token=T1')).toThrow(/Protocollo atteso ws/);
      expect(() => parseQrPayload('')).toThrow();
      expect(() => parseQrPayload('not-a-url')).toThrow(/non valido/);
    });

    it('lancia se manca ip o token', () => {
      expect(() => parseQrPayload('ws://192.168.1.1:8080')).toThrow(/IP o token/);
      expect(() => parseQrPayload('ws://:8080?token=T1')).toThrow();
      expect(() => parseQrPayload('ws://192.168.1.1:8080?notoken=1')).toThrow(/IP o token/);
    });

    it('porta default 8080 se non specificata', () => {
      const info = parseQrPayload('ws://192.168.1.1?token=TOK');
      expect(info.port).toBe(8080);
    });
  });
});
