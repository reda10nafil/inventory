// «Rete del negozio» (RETE0, ticket 32): i telefoni del negozio si collegano a un centro (un telefono che resta acceso)
// sulla rete Wi-Fi del negozio, senza internet. Qui solo funzioni pure, usate dal telefono che si collega
// (`contexts/StoreNetworkContext.tsx`) e dal centro (`src/services/meshServer.ts`):
// - il codice del centro (`ws://IP:PORTA?token=CODICE&name=NOME`), letto e rifiutato PRIMA della domanda se non è della
//   rete locale (AR05);
// - i messaggi della rete: `hello` col nome di questo telefono, `presence` con chi è collegato, da quando e l'ultima
//   volta; ciò che arriva da un telefono sconosciuto si pulisce e si taglia qui;
// - battito (un segnale ogni 10 s, «non risponde» dopo 30 s: via la promessa finta di CT14) e ritentativi;
// - stato in una riga, righe dei telefoni, errori in parole senza indirizzi né porte (AR06);
// - ore scritte a mano, senza la lingua del sistema (AR08);
// - la chiave `network:v1:{org}:settings`.

export const HEARTBEAT_MS = 10_000;
export const SILENCE_MS = 30_000;
export const CHECK_MS = 5_000;
export const DEFAULT_PORT = 8080;
const RETRY_DELAYS = [2000, 5000, 10000, 15000];
const MAX_PHONES = 50;
const NAME_MAX = 40;
const ID_MAX = 80;
const CODE_MAX = 300;
export const NO_NAME = 'Telefono senza nome';

export type Platform = 'web' | 'android' | 'ios' | string;

// ---------------------------------------------------------------------------
// Codice del centro
// ---------------------------------------------------------------------------
export interface CenterCode { ip: string; port: number; token: string; name: string }
export type CodeProblem = 'vuoto' | 'non-codice' | 'senza-chiave' | 'fuori-rete';
export type CodeCheck = { ok: true; code: CenterCode } | { ok: false; reason: CodeProblem };

const TOKEN = /^[A-Za-z0-9]{8,64}$/;

/** Indirizzi IPv4 della rete locale (Wi-Fi del negozio) e di questo computer, per le prove. */
export function isLocalAddress(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

export function readCenterCode(text: string): CodeCheck {
  const raw = typeof text === 'string' ? text.trim() : '';
  if (!raw) return { ok: false, reason: 'vuoto' };
  if (raw.length > CODE_MAX || !/^wss?:\/\//i.test(raw)) return { ok: false, reason: 'non-codice' };
  let url: URL;
  try { url = new URL(raw); } catch { return { ok: false, reason: 'non-codice' }; }
  if (url.pathname !== '/' && url.pathname !== '') return { ok: false, reason: 'non-codice' };
  const port = url.port ? Number(url.port) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, reason: 'non-codice' };
  if (!isLocalAddress(url.hostname)) return { ok: false, reason: 'fuori-rete' };
  const token = url.searchParams.get('token') ?? '';
  if (!TOKEN.test(token)) return { ok: false, reason: 'senza-chiave' };
  return { ok: true, code: { ip: url.hostname, port, token, name: cleanName(url.searchParams.get('name'), '') } };
}

/** Il motivo in parole, sotto il campo (niente indirizzi, porte o «Host»). */
export function codeError(reason: CodeProblem): string {
  switch (reason) {
    case 'vuoto': return 'Scrivi o leggi il codice mostrato dal centro.';
    case 'senza-chiave': return 'Al codice manca una parte: copialo di nuovo dal centro.';
    case 'fuori-rete': return 'Questo codice non è della rete del negozio: usa quello del centro.';
    default: return 'Questo non è il codice di un centro: copialo di nuovo dal centro.';
  }
}

/** Il codice che mostra il centro (QR e «Mostra il codice»), col nome per la domanda «Collegarti al centro…?». */
export function buildCenterCode(c: CenterCode): string {
  return `ws://${c.ip}:${c.port}?token=${c.token}${c.name ? `&name=${encodeURIComponent(c.name)}` : ''}`;
}

/** Indirizzo a cui collegarsi (il nome non serve al centro). */
export function centerUrl(c: CenterCode): string {
  return `ws://${c.ip}:${c.port}?token=${c.token}`;
}

// ---------------------------------------------------------------------------
// Messaggi della rete
// ---------------------------------------------------------------------------
export interface PhoneId { id: string; name: string }
export interface PresencePhone { id: string; name: string; since: number; lastSeen: number; online: boolean }
export interface Presence { centerName: string; centerSince: number; phones: PresencePhone[] }

/** Nome pulito: niente caratteri di controllo o di direzione del testo, spazi ridotti, al massimo 40 caratteri. */
export function cleanName(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return s || fallback;
}

const cleanId = (v: unknown): string => (typeof v === 'string' ? v.replace(/[^\w.:-]/g, '').slice(0, ID_MAX) : '');

export function helloMessage(token: string, phone: PhoneId, platform: Platform) {
  return { type: 'hello' as const, token, platform, phone: { id: phone.id, name: phone.name } };
}

/** Sul centro: id e nome del telefono dal suo `hello` (dato da un telefono sconosciuto: si pulisce e si taglia). */
export function phoneFromHello(raw: unknown, fallbackId: string): PhoneId {
  const phone = raw && typeof raw === 'object' ? (raw as { phone?: unknown }).phone : undefined;
  const p = phone && typeof phone === 'object' ? (phone as Record<string, unknown>) : {};
  return { id: cleanId(p.id) || fallbackId, name: cleanName(p.name, NO_NAME) };
}

/** Sul centro: l'elenco dei telefoni per tutti (al massimo 50). */
export function presenceMessage(center: { name: string; since: number }, phones: PresencePhone[], now: number) {
  return { type: 'presence' as const, ts: now, center: { name: center.name, since: center.since }, phones: phones.slice(0, MAX_PHONES) };
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Sul telefono: la presenza mandata dal centro, con le ore portate all'orologio di questo telefono (i due orologi
 * possono non andare d'accordo). Ciò che non torna si scarta o prende un valore prudente; l'elenco si taglia a 50.
 */
export function readPresence(raw: unknown, localNow: number): Presence | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.type !== 'presence' || !num(r.ts)) return null;
  const shift = localNow - r.ts;
  const local = (v: unknown) => (num(v) ? v + shift : localNow);
  const center = r.center && typeof r.center === 'object' ? (r.center as Record<string, unknown>) : {};
  const phones: PresencePhone[] = [];
  for (const p of Array.isArray(r.phones) ? r.phones : []) {
    if (phones.length >= MAX_PHONES) break;
    if (!p || typeof p !== 'object') continue;
    const q = p as Record<string, unknown>;
    const id = cleanId(q.id);
    if (!id) continue;
    phones.push({ id, name: cleanName(q.name, NO_NAME), since: local(q.since), lastSeen: local(q.lastSeen), online: q.online === true });
  }
  return { centerName: cleanName(center.name, ''), centerSince: local(center.since), phones };
}

// ---------------------------------------------------------------------------
// Battito e ritentativi
// ---------------------------------------------------------------------------
/** Il centro tace da più di 30 s (nessun messaggio, nemmeno la risposta al segnale). */
export function isSilent(lastHeard: number | undefined, now: number, limit = SILENCE_MS): boolean {
  return num(lastHeard) && now - lastHeard > limit;
}

/** Attesa prima del tentativo n (da 0) di ricollegarsi a un centro ricordato. */
export function retryDelay(attempt: number): number {
  return RETRY_DELAYS[Math.min(Math.max(0, attempt), RETRY_DELAYS.length - 1)];
}

// ---------------------------------------------------------------------------
// Ore e durate (a mano: AR08, niente «8:07:43 AM»)
// ---------------------------------------------------------------------------
const MONTHS = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const two = (n: number) => String(n).padStart(2, '0');
const hhmm = (d: Date) => `${two(d.getHours())}:${two(d.getMinutes())}`;
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const day = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** «dalle 10:42», un altro giorno «dal 22 nov alle 08:00». */
export function sinceText(ms: number, now: number): string {
  const d = new Date(ms);
  return sameDay(d, new Date(now)) ? `dalle ${hhmm(d)}` : `dal ${day(d)} alle ${hhmm(d)}`;
}

/** «alle 10:40», un altro giorno «il 23 nov alle 18:03». */
export function atText(ms: number, now: number): string {
  const d = new Date(ms);
  return sameDay(d, new Date(now)) ? `alle ${hhmm(d)}` : `il ${day(d)} alle ${hhmm(d)}`;
}

/** «da meno di un minuto», «da 2 min», «da 3 ore». */
export function durationText(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / 60_000);
  if (min < 1) return 'da meno di un minuto';
  if (min < 60) return `da ${min} min`;
  const h = Math.floor(min / 60);
  return h === 1 ? 'da 1 ora' : `da ${h} ore`;
}

// ---------------------------------------------------------------------------
// Telefoni e stato in una riga
// ---------------------------------------------------------------------------
export type NetworkRole = 'none' | 'client' | 'host';
export type LinkState = 'idle' | 'connecting' | 'connected' | 'silent';
export interface NetworkView {
  role: NetworkRole;
  link: LinkState;
  centerName?: string;
  /** ultima notizia dal centro, quando tace o è caduto */
  silentSince?: number;
  phones: PresencePhone[];
}

export const onlineCount = (phones: PresencePhone[]) => phones.filter((p) => p.online).length;

/** Riga di un telefono: pallino e testo. Se il centro tace, chi era online è «visto» all'ultima notizia. */
export function phoneRow(p: PresencePhone, now: number, silentSince?: number) {
  if (p.online && silentSince === undefined) return { online: true, state: 'Online', detail: `online ${sinceText(p.since, now)}` };
  const seen = p.online && silentSince !== undefined ? silentSince : p.lastSeen;
  return { online: false, state: 'Non in linea', detail: `visto ${atText(seen, now)}` };
}

const quoted = (name?: string) => (name ? `"${name}"` : '');
const centerOf = (name?: string) => (name ? `il centro ${quoted(name)}` : 'il centro');
const phonesText = (n: number, one: string, many: string) => (n === 0 ? `nessun telefono ${one}` : n === 1 ? `1 telefono ${one}` : `${n} telefoni ${many}`);

export type Tone = 'on' | 'warn' | 'off' | 'busy';

/** Lo stato della connessione in una riga, col tono del pallino (mai «pronto» se non lo è: AR02). */
export function statusLine(v: NetworkView, now: number): { tone: Tone; text: string } {
  if (v.role === 'host') {
    if (v.link === 'connected') return { tone: 'on', text: `Questo telefono è il centro · ${phonesText(onlineCount(v.phones), 'collegato', 'collegati')}` };
    if (v.link === 'connecting') return { tone: 'busy', text: 'Accensione del centro…' };
    return { tone: 'off', text: 'Centro spento' };
  }
  if (v.role === 'client') {
    // online: il centro e i telefoni dell'elenco (questo compreso, anche prima che arrivi l'elenco)
    if (v.link === 'connected') {
      const n = Math.max(onlineCount(v.phones), 1) + 1;
      return { tone: 'on', text: `Collegato al centro${v.centerName ? ` ${quoted(v.centerName)}` : ''} · ${phonesText(n, 'online', 'online')}` };
    }
    if (v.link === 'connecting') return { tone: 'busy', text: `Collegamento al centro${v.centerName ? ` ${quoted(v.centerName)}` : ''}…` };
    if (v.link === 'silent') {
      const since = v.silentSince !== undefined ? ` ${durationText(now - v.silentSince)}` : '';
      const who = centerOf(v.centerName);
      return { tone: 'warn', text: `${who.charAt(0).toUpperCase()}${who.slice(1)} non risponde${since}` };
    }
  }
  return { tone: 'off', text: 'Non collegato' };
}

/** Sottotitolo della voce «Rete del negozio» in Impostazioni: lo stato, corto. */
export function settingsSubtitle(v: NetworkView): string {
  if (v.role === 'host') {
    if (v.link === 'connected') { const n = onlineCount(v.phones); return `Fa da centro · ${n === 1 ? '1 telefono' : `${n} telefoni`}`; }
    return v.link === 'connecting' ? 'Accensione del centro' : 'Centro spento';
  }
  if (v.role === 'client') {
    if (v.link === 'connected') return `Collegato al centro${v.centerName ? ` ${quoted(v.centerName)}` : ''}`;
    if (v.link === 'connecting') return 'Collegamento in corso';
    if (v.link === 'silent') return 'Il centro non risponde';
  }
  return 'Non collegato';
}

export type LinkError = 'non-risponde' | 'rifiutato' | 'chiuso' | 'tempo';

/** Errore del collegamento in parole, con la via d'uscita (AR06: niente router, `adb` o emulatori). */
export function linkErrorText(kind: LinkError): string {
  switch (kind) {
    case 'rifiutato': return 'Il centro non ha accettato il codice: chiedi al centro il codice nuovo.';
    case 'chiuso': return 'Il centro ha chiuso il collegamento: riprova tra poco.';
    case 'tempo': return 'Il centro non ha risposto in tempo: controlla che sia acceso e sulla stessa rete Wi-Fi.';
    default: return 'Il centro non risponde: controlla che sia acceso e sulla stessa rete Wi-Fi.';
  }
}

// ---------------------------------------------------------------------------
// Chiave per spazio: `network:v1:{org}:settings`
// ---------------------------------------------------------------------------
export interface SavedCenter extends CenterCode { lastSeen?: number }
export interface NetworkSettings { role: NetworkRole; center?: SavedCenter; hostToken?: string }

export const networkKey = (org: string) => `network:v1:${org}:settings`;

/** Ciò che si può usare della chiave salvata. Sul web un centro non può esistere: il ruolo «centro» torna «nessuno». */
export function normalizeNetworkSettings(raw: unknown, platform: Platform): NetworkSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { role: 'none' };
  const r = raw as Record<string, unknown>;
  const hostToken = typeof r.hostToken === 'string' && TOKEN.test(r.hostToken) ? r.hostToken : undefined;
  const extra = hostToken ? { hostToken } : {};
  if (r.role === 'host') return platform === 'web' ? { role: 'none', ...extra } : { role: 'host', ...extra };
  if (r.role === 'client' && r.center && typeof r.center === 'object') {
    const c = r.center as Record<string, unknown>;
    const check = readCenterCode(buildCenterCode({ ip: String(c.ip ?? ''), port: Number(c.port), token: String(c.token ?? ''), name: cleanName(c.name, '') }));
    if (!check.ok) return { role: 'none', ...extra };
    const center: SavedCenter = { ...check.code, ...(num(c.lastSeen) && { lastSeen: c.lastSeen }) };
    return { role: 'client', center, ...extra };
  }
  return { role: 'none', ...extra };
}
