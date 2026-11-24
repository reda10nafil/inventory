// N1 (ticket 16, 18, 22): **logica pura dell'NFC**, senza la libreria nativa (si prova con jest).
// - Preferenze di Impostazioni › Scanner e NFC: `parseHardwareConfig` le legge come sono salvate, `readerSources` dice
//   quali lettori mostrare («Fotocamera · NFC · Tutti e due»; senza NFC c'è sempre la fotocamera), `offerTagWrite` se
//   proporre il tag dopo un prodotto nuovo (NG11 = D19: prima nessuno le leggeva).
// - Un tag letto: `tagContent` (testo, link, vuoto, altro), `tagCode` (che cosa passare al lettore unico: prima l'UID
//   se è collegato a qualcosa, poi il testo), `readStep`, `testText`.
// - «Collega un tag» (`linkStep`) e «Scrivi tag NFC» (`writeStep`): tag nuovo, già suo, di un'altra cosa («Questo tag
//   è di VIS-0098: sostituirlo?», e chi lo aveva lo perde), pieno di altro, bloccato. Il messaggio da scrivere è il
//   codice come record di testo (`textMessage`): `writeNdefMessage` sostituisce tutto, la pulizia prima non serve (NG14).
// - Testi in parole, mai «Errore» né «Operazione annullata» (NG12, NG19).
import Ndef from 'react-native-nfc-manager/ndef-lib';
import { codeName, resolveCode, tagOwners, type CodeRef, type CodeSources } from './codes';

// ── Preferenze ────────────────────────────────────────────

/** Come si leggono i codici. I valori salvati restano quelli di prima: `qr_only`, `nfc_only`, `both`. */
export type ScanMode = 'qr_only' | 'nfc_only' | 'both';
export const SCAN_MODES: readonly { id: ScanMode; label: string }[] = [
  { id: 'qr_only', label: 'Fotocamera' },
  { id: 'nfc_only', label: 'NFC' },
  { id: 'both', label: 'Tutti e due' },
];

export interface HardwareConfig {
  scanMode: ScanMode;
  /** «Proponi di scrivere il tag» dopo un prodotto nuovo (nome salvato di prima). */
  autoWriteNfcOnSave: boolean;
  /** «Zittisci Android con l'app aperta» (N0, decisione 1): reader mode fisso, solo Android. Facoltativo, nuovo. */
  silenceAndroid?: boolean;
}

export const DEFAULT_HARDWARE_CONFIG: HardwareConfig = { scanMode: 'both', autoWriteNfcOnSave: false, silenceAndroid: false };

/** Configurazione salvata (testo o oggetto): i valori validi restano, il resto vale il predefinito. Non lancia mai. */
export function parseHardwareConfig(raw: unknown): HardwareConfig {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try { value = JSON.parse(raw); } catch { value = null; }
  }
  const v = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    scanMode: SCAN_MODES.some((m) => m.id === v.scanMode) ? (v.scanMode as ScanMode) : DEFAULT_HARDWARE_CONFIG.scanMode,
    autoWriteNfcOnSave: typeof v.autoWriteNfcOnSave === 'boolean' ? v.autoWriteNfcOnSave : DEFAULT_HARDWARE_CONFIG.autoWriteNfcOnSave,
    silenceAndroid: typeof v.silenceAndroid === 'boolean' ? v.silenceAndroid : false,
  };
}

/**
 * Quali lettori mostrare (Scanner, automazioni, finestre del codice). Senza NFC (web, telefono senza sensore) c'è
 * sempre la fotocamera, anche con «NFC» salvato: un lettore non resta mai vuoto.
 */
export function readerSources(mode: ScanMode | undefined, nfcAvailable: boolean): { camera: boolean; nfc: boolean } {
  if (!nfcAvailable) return { camera: true, nfc: false };
  if (mode === 'qr_only') return { camera: true, nfc: false };
  if (mode === 'nfc_only') return { camera: false, nfc: true };
  return { camera: true, nfc: true };
}

/**
 * L'NFC si può usare: sul telefono (non sul web) e con un sensore che risponde. Un telefono senza NFC, o con la
 * libreria che non parte (NG20), vale come il web: con «NFC» salvato lo Scanner non resta senza fotocamera. Stato non
 * ancora letto = si può (la finestra del tag dirà «Questo telefono non ha l'NFC» se serve).
 */
export function nfcUsable(native: boolean, state: 'assente' | 'spento' | 'attivo' | null): boolean {
  return native && state !== 'assente';
}

/** «Proponi di scrivere il tag» dopo «Prodotto Aggiunto»: acceso, con l'NFC, e non in «Fotocamera». */
export function offerTagWrite(config: Pick<HardwareConfig, 'scanMode' | 'autoWriteNfcOnSave'>, nfcAvailable: boolean): boolean {
  return config.autoWriteNfcOnSave && readerSources(config.scanMode, nfcAvailable).nfc;
}

// ── Tag letto ─────────────────────────────────────────────

export interface TagRecord { tnf: number; type: number[] | string; payload: number[]; id?: number[] }
/** Tag come lo dà la libreria: `id` in esadecimale (l'UID), i record NDEF già letti. */
export interface TagData { id?: string | null; ndefMessage?: TagRecord[] | null; techTypes?: string[] }

const typeText = (type: number[] | string): string => (typeof type === 'string' ? type : String.fromCharCode(...type));

/** Il primo testo o link del tag; «vuoto» senza record utili; «altro» con record che l'app non legge (immagini…). */
export function tagContent(tag: TagData | null | undefined): { kind: 'testo' | 'link' | 'vuoto' | 'altro'; text: string | null } {
  let other = false;
  for (const r of tag?.ndefMessage ?? []) {
    if (!r || r.tnf === Ndef.TNF_EMPTY) continue;
    const type = typeText(r.type ?? []);
    const payload = Array.from(r.payload ?? []);
    try {
      if (r.tnf === Ndef.TNF_WELL_KNOWN && type === Ndef.RTD_TEXT) {
        const text = String(Ndef.text.decodePayload(payload) ?? '').trim();
        if (text) return { kind: 'testo', text };
        continue;
      }
      if (r.tnf === Ndef.TNF_WELL_KNOWN && type === Ndef.RTD_URI) {
        const text = String(Ndef.uri.decodePayload(payload) ?? '').trim();
        if (text) return { kind: 'link', text };
        continue;
      }
      if (r.tnf === Ndef.TNF_ABSOLUTE_URI && type.trim()) return { kind: 'link', text: type.trim() };
    } catch { /* un record rovinato vale «altro» */ }
    other = true;
  }
  return other ? { kind: 'altro', text: null } : { kind: 'vuoto', text: null };
}

/** UID leggibile: «04:A2:3B:1C» (come gli esempi di prima); null se non è un UID. */
export function formatUid(id: string | null | undefined): string | null {
  const hex = (id ?? '').replace(/[:\-\s]/g, '');
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  return hex.toUpperCase().match(/.{2}/g)!.join(':');
}

/** Messaggio NDEF da scrivere: il codice come record di testo, uno solo (sostituisce tutto quello che c'era). */
export function textMessage(code: string): number[] {
  return Ndef.encodeMessage([Ndef.textRecord(code.trim())]);
}

/**
 * Che cosa passare al lettore unico (`resolveCode`) per un tag letto: prima l'**UID** se è collegato a qualcosa (un
 * collegamento fatto apposta vince sul testo), poi il **testo** o il link. Null = tag vuoto e non collegato.
 */
export function tagCode(tag: TagData, sources: CodeSources): string | null {
  const uid = formatUid(tag.id);
  if (uid && tagOwners(uid, sources).length) return uid;
  return tagContent(tag).text;
}

export type ReadStep = { kind: 'code'; code: string; via: 'uid' | 'testo' } | { kind: 'nothing'; text: string };

/** «Leggi un tag»: il codice da usare, oppure la frase per un tag senza niente. */
export function readStep(tag: TagData, sources: CodeSources): ReadStep {
  const uid = formatUid(tag.id);
  if (uid && tagOwners(uid, sources).length) return { kind: 'code', code: uid, via: 'uid' };
  const content = tagContent(tag);
  if (content.text) return { kind: 'code', code: content.text, via: 'testo' };
  return {
    kind: 'nothing',
    text: content.kind === 'altro'
      ? 'Su questo tag non c\'è un codice: scrivilo da «Codice ed etichetta».'
      : 'Tag vuoto: scrivilo da «Codice ed etichetta».',
  };
}

const KIND_WORD: Record<CodeRef['kind'], string> = { product: 'prodotto', location: 'posizione', shelf: 'scaffale', category: 'categoria', automation: 'automazione' };

/** «Prova un tag»: che cosa è il tag, in parole. */
export function testText(tag: TagData, sources: CodeSources): string {
  const step = readStep(tag, sources);
  if (step.kind === 'nothing') return tagContent(tag).kind === 'altro' ? 'Tag letto: non porta un codice.' : 'Tag letto: è vuoto e non è collegato a niente.';
  const result = resolveCode(step.code, sources);
  const linked = step.via === 'uid' ? ' (tag collegato)' : '';
  if (result.status === 'found' || result.status === 'trashed') {
    const trash = result.status === 'trashed' ? ', nel cestino' : '';
    return `Tag letto: ${KIND_WORD[result.kind]} ${codeName(result, sources)}${linked}${trash}.`;
  }
  if (result.status === 'ambiguous') return `Tag letto: è di più cose (${ownersText(result.candidates, sources)}).`;
  return `Tag letto: «${step.code}», non corrisponde a niente.`;
}

// ── Collega e scrivi ──────────────────────────────────────

const sameRef = (a: CodeRef, b: CodeRef) => a.kind === b.kind && a.id === b.id;
const ownersText = (refs: readonly CodeRef[], sources: CodeSources) => refs.map((r) => codeName(r, sources)).join(' e ');

/** Chi ha già il tag letto, oltre a `self`: per UID (`clear`, da togliere a chi lo aveva) o per il testo scritto sopra. */
function otherOwners(tag: TagData, self: CodeRef, sources: CodeSources): { uid: string | null; clear: CodeRef[]; byText: CodeRef | null; content: ReturnType<typeof tagContent> } {
  const uid = formatUid(tag.id);
  const clear = uid ? tagOwners(uid, sources, self) : [];
  const content = tagContent(tag);
  let byText: CodeRef | null = null;
  if (content.text) {
    const r = resolveCode(content.text, sources);
    if ((r.status === 'found' || r.status === 'trashed') && !sameRef(r, self)) byText = { kind: r.kind, id: r.id };
    if (r.status === 'ambiguous' && !r.candidates.some((c) => sameRef(c, self))) byText = r.candidates[0];
  }
  return { uid, clear, byText, content };
}

export type LinkStep =
  | { kind: 'link'; uid: string; clear: CodeRef[] }
  | { kind: 'confirm'; uid: string; clear: CodeRef[]; text: string }
  | { kind: 'already'; text: string }
  | { kind: 'no-id'; text: string };

/** «Collega un tag»: si salva l'UID del tag in `nfcTag` di `self`. Un tag di un'altra cosa chiede prima. */
export function linkStep(tag: TagData, self: CodeRef, sources: CodeSources): LinkStep {
  const { uid, clear, byText } = otherOwners(tag, self, sources);
  if (!uid) return { kind: 'no-id', text: 'Questo tag non ha un numero da collegare: usa «Scrivi tag NFC».' };
  if (!clear.length && !byText && tagOwners(uid, sources).some((r) => sameRef(r, self))) {
    return { kind: 'already', text: `Questo tag è già di ${codeName(self, sources)}.` };
  }
  const owners = clear.length ? clear : byText ? [byText] : [];
  if (owners.length) return { kind: 'confirm', uid, clear, text: `Questo tag è di ${ownersText(owners, sources)}: sostituirlo?` };
  return { kind: 'link', uid, clear };
}

export type WriteStep =
  | { kind: 'write'; uid: string | null; clear: CodeRef[] }
  | { kind: 'confirm'; uid: string | null; clear: CodeRef[]; text: string }
  | { kind: 'readonly'; text: string };

/**
 * «Scrivi tag NFC» con il tag già vicino: vuoto, con lo stesso codice o con un vecchio codice della stessa cosa (il
 * link GS1 di prima) si scrive subito; con altro si mostra il contenuto e si chiede; bloccato non si scrive (per le
 * cose che hanno il tag salvato la via è «Collega un tag»). `canLink` = `self` può avere il tag salvato.
 */
export function writeStep(tag: TagData, code: string, self: CodeRef, sources: CodeSources, status: { writable: boolean }, canLink = self.kind !== 'product'): WriteStep {
  if (!status.writable) {
    return { kind: 'readonly', text: canLink ? 'Questo tag non si può scrivere: usa «Collega un tag».' : 'Questo tag non si può scrivere: usane un altro.' };
  }
  const { uid, clear, byText, content } = otherOwners(tag, self, sources);
  if (clear.length) return { kind: 'confirm', uid, clear, text: `Questo tag è di ${ownersText(clear, sources)}: sostituirlo?` };
  if (byText) return { kind: 'confirm', uid, clear, text: `Questo tag è di ${codeName(byText, sources)}: sostituirlo?` };
  if (content.kind === 'altro') return { kind: 'confirm', uid, clear, text: 'Sul tag c\'è già qualcos\'altro: sostituirlo?' };
  if (content.text) {
    const r = resolveCode(content.text, sources);
    const mine = (r.status === 'found' || r.status === 'trashed') && sameRef(r, self);
    const same = content.text.trim().toLocaleLowerCase() === code.trim().toLocaleLowerCase();
    if (!mine && !same) return { kind: 'confirm', uid, clear, text: `Sul tag c'è «${content.text}»: sostituirlo?` };
  }
  return { kind: 'write', uid, clear };
}

// ── Testi ─────────────────────────────────────────────────

export type NfcStateName = 'web' | 'assente' | 'spento' | 'attivo';

/** Stato dell'NFC in una riga, col tono del pallino. */
export function nfcStateText(state: NfcStateName): { text: string; tone: 'ok' | 'warn' | 'off' } {
  switch (state) {
    case 'attivo': return { text: 'NFC pronto', tone: 'ok' };
    case 'spento': return { text: 'NFC spento: accendilo nelle impostazioni del telefono', tone: 'warn' };
    case 'assente': return { text: 'Questo telefono non ha l\'NFC', tone: 'off' };
    default: return { text: 'L\'NFC si usa dal telefono', tone: 'off' };
  }
}

export type NfcSheetMode = 'leggi' | 'collega' | 'scrivi' | 'prova';
export type NfcFailure =
  | { esito: 'annullato' | 'tempo-scaduto' | 'occupato' | 'non-disponibile' | 'nfc-spento' | 'assente' }
  | { esito: 'non-ndef'; id?: string | null }
  | { esito: 'errore'; messaggio: string };

/** Frase per un esito che non è una lettura riuscita; null = Annulla dell'utente (si chiude e basta). `canLink` come in `writeStep`. */
export function outcomeText(outcome: NfcFailure, mode: NfcSheetMode, canLink = true): string | null {
  switch (outcome.esito) {
    case 'annullato': return null;
    case 'tempo-scaduto': return 'Nessun tag letto. Riprova.';
    case 'occupato': return 'Un\'altra lettura è in corso. Riprova tra poco.';
    case 'non-disponibile': return 'L\'NFC si usa dal telefono.';
    case 'nfc-spento': return 'NFC spento: accendilo nelle impostazioni del telefono.';
    case 'assente': return 'Questo telefono non ha l\'NFC.';
    case 'non-ndef':
      if (mode !== 'scrivi') return 'Tag letto, ma non porta un codice.';
      return canLink ? 'Questo tag non si può scrivere: usa «Collega un tag».' : 'Questo tag non si può scrivere: usane un altro.';
    default: return mode === 'scrivi' ? 'Scrittura non riuscita: tieni fermo il tag e riprova.' : 'Lettura non riuscita: riavvicina il tag e riprova.';
  }
}
