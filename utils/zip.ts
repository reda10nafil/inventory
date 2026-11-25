// DATI (EXP + IMP, ticket 26): file ZIP di «Esporta con le foto» (il CSV più la cartella `immagini/`) e la sua
// lettura all'import. Scritto a mano, senza pacchetti: i file si mettono **senza compressione** (metodo 0, «stored»),
// perché le foto JPEG sono già compresse, con il CRC32 di ognuno e i nomi in UTF-8. Si legge dalla directory
// centrale (dimensioni e posizioni giuste anche con i «data descriptor»); uno ZIP compresso da un altro programma
// (metodo 8, «deflate») si apre con `DecompressionStream('deflate-raw')` dove c'è (browser), altrimenti si dice.
// Solo `Uint8Array`, così si prova con jest. Base64 a mano per le foto `data:` (niente `atob`/`btoa` sul telefono).

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

// ── CRC32 ────────────────────────────────────────────────────

let CRC_TABLE: Uint32Array | null = null;
function crcTable(): Uint32Array {
  if (CRC_TABLE) return CRC_TABLE;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  CRC_TABLE = table;
  return table;
}

/** CRC32 (lo stesso di ZIP e PNG): `crc32(utf8('123456789')) === 0xcbf43926`. */
export function crc32(data: Uint8Array): number {
  const table = crcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Testo e base64 ───────────────────────────────────────────

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function fromUtf8(data: Uint8Array): string {
  if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(data);
  // Ripiego (motori senza TextDecoder): UTF-8 a mano
  let out = '';
  for (let i = 0; i < data.length;) {
    const a = data[i++];
    let cp = a;
    if (a >= 0xf0) cp = ((a & 7) << 18) | ((data[i++] & 63) << 12) | ((data[i++] & 63) << 6) | (data[i++] & 63);
    else if (a >= 0xe0) cp = ((a & 15) << 12) | ((data[i++] & 63) << 6) | (data[i++] & 63);
    else if (a >= 0xc0) cp = ((a & 31) << 6) | (data[i++] & 63);
    out += String.fromCodePoint(cp);
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]);
    const b = B64.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? B64.indexOf(clean[i + 2]) : -1;
    const d = i + 3 < clean.length ? B64.indexOf(clean[i + 3]) : -1;
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}

export function bytesToBase64(data: Uint8Array): string {
  let out = '';
  for (let i = 0; i < data.length; i += 3) {
    const a = data[i];
    const b = i + 1 < data.length ? data[i + 1] : 0;
    const c = i + 2 < data.length ? data[i + 2] : 0;
    out += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < data.length ? B64[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < data.length ? B64[c & 63] : '=';
  }
  return out;
}

/** Foto `data:image/png;base64,…` → byte e tipo; `null` se non è un indirizzo `data:` in base64. */
export function dataUrlBytes(uri: string): { mime: string; data: Uint8Array } | null {
  const m = /^data:([^;,]+)?((?:;[^;,]+)*);base64,(.*)$/s.exec(uri);
  if (!m) return null;
  return { mime: (m[1] || 'application/octet-stream').toLowerCase(), data: base64ToBytes(m[3]) };
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
};
const EXT_MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic' };

/** Estensione per il nome del file nello ZIP (jpg se il tipo non è noto). */
export const extensionOf = (mime: string): string => MIME_EXT[mime.toLowerCase()] ?? 'jpg';
/** Tipo dall'estensione del nome (per l'import: `data:<tipo>;base64,…`). */
export const mimeOfName = (name: string): string => EXT_MIME[(name.split('.').pop() || '').toLowerCase()] ?? 'image/jpeg';

// ── Scrittura ────────────────────────────────────────────────

function dosTime(date: Date): { time: number; day: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** ZIP senza compressione con i file nell'ordine dato. Nomi in UTF-8 (bit 11), CRC32 di ognuno. */
export function makeZip(entries: readonly ZipEntry[], date: Date = new Date()): Uint8Array {
  const { time, day } = dosTime(date);
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = utf8(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // versione per estrarre
    lv.setUint16(6, 0x0800, true); // nomi UTF-8
    lv.setUint16(8, 0, true); // metodo 0
    lv.setUint16(10, time, true);
    lv.setUint16(12, day, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, day, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    locals.push(local, entry.data);
    centrals.push(central);
    offset += local.length + size;
  }
  const centralSize = centrals.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) { out.set(part, at); at += part.length; }
  return out;
}

// ── Lettura ──────────────────────────────────────────────────

/** Il file comincia come uno ZIP («PK\x03\x04», o vuoto «PK\x05\x06»)? */
export function isZip(data: Uint8Array): boolean {
  return data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && (data[2] === 3 || data[2] === 5);
}

type Inflate = (data: Uint8Array) => Promise<Uint8Array>;

/** Deflate grezzo col browser (`DecompressionStream`), se c'è. */
async function inflateWithStream(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as any).DecompressionStream;
  if (typeof DS !== 'function') throw new Error('Questo ZIP è compresso e qui non si può aprire: rifallo con «Esporta con le foto» di Syncro Flow, oppure importa solo il CSV.');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DS('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * File di uno ZIP, dalla directory centrale. Cartelle saltate; metodo 0 letto com'è, metodo 8 con `inflate`
 * (predefinito: `DecompressionStream` del browser). Il CRC si controlla: un file rovinato dà un errore chiaro.
 */
export async function readZip(data: Uint8Array, inflate: Inflate = inflateWithStream): Promise<ZipEntry[]> {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let endAt = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 22 - 0xffff); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { endAt = i; break; }
  }
  if (endAt < 0) throw new Error('Il file non è uno ZIP valido.');
  const count = view.getUint16(endAt + 10, true);
  let at = view.getUint32(endAt + 16, true);
  const out: ZipEntry[] = [];
  for (let n = 0; n < count; n += 1) {
    if (at + 46 > data.length || view.getUint32(at, true) !== 0x02014b50) throw new Error('Il file ZIP è rovinato.');
    const method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true);
    const compressed = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const localAt = view.getUint32(at + 42, true);
    const name = fromUtf8(data.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    if (localAt + 30 > data.length || view.getUint32(localAt, true) !== 0x04034b50) throw new Error('Il file ZIP è rovinato.');
    const start = localAt + 30 + view.getUint16(localAt + 26, true) + view.getUint16(localAt + 28, true);
    const raw = data.subarray(start, start + compressed);
    let bytes: Uint8Array;
    if (method === 0) bytes = raw;
    else if (method === 8) bytes = await inflate(raw);
    else throw new Error(`Il file «${name}» dello ZIP usa una compressione che l'app non conosce.`);
    if (crc32(bytes) !== crc) throw new Error(`Il file «${name}» dello ZIP è rovinato (controllo non riuscito).`);
    out.push({ name, data: bytes });
  }
  return out;
}

/** Nome sicuro per un file dello ZIP: niente barre, due punti o caratteri di controllo; mai vuoto. */
export function safeFileName(text: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = text.normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').trim().slice(0, 80);
  return clean || 'prodotto';
}
