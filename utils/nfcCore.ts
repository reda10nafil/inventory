// N1 (ticket 16, 17; disegno di `ricerche/N0-nfc.md` §4): il **servizio NFC** con le poche chiamate della libreria
// passate come «driver». Così si prova con jest e un driver finto (la libreria vera non si carica in jest); il driver
// vero sta solo in `utils/nfcService.ts`, sul web `utils/nfcService.web.ts` dice «non disponibile».
// - Niente all'avvio: `start` alla prima operazione. Mai un ascolto continuo (ticket 16): una pressione = una lettura,
//   che finisce al primo tag, al tempo limite o ad Annulla. Una sola operazione alla volta («occupato»).
// - **Silenziatore** (N0, decisione 1; interruttore «Zittisci Android con l'app aperta»): reader mode registrato una
//   volta, con i flag A, B, F, V e senza suoni di sistema, nessun ascoltatore a riposo: Android consegna il tag
//   all'app (niente browser per un tag col link) e l'app lo scarta. Solo Android; mai tolto finché è acceso;
//   riapplicato quando l'NFC si riaccende. Spento, la lettura usa il reader mode solo mentre legge.
// - **Scrittura in un tocco** (NG14, decisione 2): `openForWrite` aspetta il tag e dice che cosa c'è (per la conferma
//   del tag pieno), `write` scrive il messaggio intero una volta sola; la sessione si chiude sempre.
// Restituisce solo dati: non vende, non sposta, non tocca i contesti (ticket 18).
import type { NfcFailure, TagRecord } from './nfcTag';

export interface NfcTagEvent { id?: string; ndefMessage?: TagRecord[] | null; techTypes?: string[] }
export interface ReaderOptions {
  isReaderModeEnabled?: boolean;
  readerModeFlags?: number;
  readerModeDelay?: number;
  alertMessage?: string;
  invalidateAfterFirstRead?: boolean;
}

/** Le chiamate della libreria che il servizio usa (vedi `nfcService.ts`). */
export interface NfcDriver {
  os: 'android' | 'ios';
  start(): Promise<void>;
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  registerTagEvent(options: ReaderOptions): Promise<void>;
  unregisterTagEvent(): Promise<void>;
  onTag(listener: ((tag: NfcTagEvent) => void) | null): void;
  onStateChange(listener: ((state: string) => void) | null): void;
  /** iOS: il pannello di sistema chiuso dall'utente. */
  onSessionClosed?(listener: (() => void) | null): void;
  requestNdef(options: ReaderOptions): Promise<void>;
  getTag(): Promise<NfcTagEvent | null>;
  ndefStatus(): Promise<{ writable: boolean; capacity: number }>;
  writeNdef(bytes: number[]): Promise<void>;
  cancelRequest(): Promise<void>;
}

// FLAG_READER_NFC_A | _B | _F | _V | FLAG_READER_NO_PLATFORM_SOUNDS = 0x10F. Mai FLAG_READER_SKIP_NDEF_CHECK (N0 §2.a).
export const SILENCER: ReaderOptions = { isReaderModeEnabled: true, readerModeFlags: 0x1 | 0x2 | 0x4 | 0x8 | 0x100, readerModeDelay: 500 };
export const NFC_TIMEOUT_MS = 20000;
const SESSION_MS = 60000;
const IOS_PROMPT = 'Avvicina il tag al telefono';

export type NfcState = 'assente' | 'spento' | 'attivo';
export type NfcOutcome =
  | { esito: 'letto'; tag: NfcTagEvent }
  | { esito: 'pronto'; tag: NfcTagEvent; writable: boolean }
  | { esito: 'scritto'; id: string | null }
  | NfcFailure;

export interface NfcService {
  /** Falso sul web: le righe NFC non compaiono. */
  available: boolean;
  /** Android tiene il tag collegato mentre l'app chiede «sostituirlo?»; iOS no (il pannello di sistema copre l'app). */
  holdsTagWhileAsking: boolean;
  status(): Promise<NfcState>;
  setSilencer(on: boolean): Promise<void>;
  read(options?: { timeoutMs?: number }): Promise<NfcOutcome>;
  openForWrite(options?: { timeoutMs?: number }): Promise<NfcOutcome>;
  write(bytes: number[]): Promise<NfcOutcome>;
  cancel(): Promise<void>;
}

const message = (error: unknown) => String((error as { message?: string } | null)?.message ?? error ?? '');
// Android: un tag senza la tecnologia Ndef (mai formattato, o di un altro tipo) non si collega alla richiesta di scrittura
const isNonNdef = (tag: NfcTagEvent) => !!tag.techTypes?.length && !tag.techTypes.some((t) => /(^|\.)Ndef$/.test(t));

export function createNfcService(driver: NfcDriver): NfcService {
  let started: Promise<boolean> | null = null;
  let silencerWanted = false;
  let registered = false; // il silenziatore è registrato (solo Android)
  let applying: Promise<void> | null = null;
  let busy = false;
  let finishRead: ((outcome: NfcOutcome) => void) | null = null;
  let stopWaiting: (() => Promise<void>) | null = null;
  let writeTag: NfcTagEvent | null = null;
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;

  const safeCancel = async () => { try { await driver.cancelRequest(); } catch { /* già chiusa */ } };

  const applySilencer = (): Promise<void> => {
    if (applying) return applying;
    applying = (async () => {
      if (!silencerWanted || registered || busy) return;
      try {
        await driver.registerTagEvent(SILENCER);
        registered = true;
        driver.onTag(null); // a riposo nessun ascoltatore: il tag arriva all'app e si scarta
      } catch { registered = false; }
    })().finally(() => { applying = null; });
    return applying;
  };

  const ensureStarted = (): Promise<boolean> => {
    if (!started) {
      started = (async () => {
        try {
          await driver.start();
          // NFC riacceso dalla tendina con l'app aperta: nessuno riattiva il reader mode, lo si rimette (N0 §2.a)
          driver.onStateChange((state) => {
            if (state === 'on' && silencerWanted) { registered = false; void applySilencer(); }
          });
          return true;
        } catch {
          started = null;
          return false;
        }
      })();
    }
    return started;
  };

  const status = async (): Promise<NfcState> => {
    try {
      if (!(await ensureStarted())) return 'assente';
      if (!(await driver.isSupported())) return 'assente';
      return (await driver.isEnabled()) ? 'attivo' : 'spento';
    } catch {
      return 'assente';
    }
  };

  const notReady = (state: NfcState): NfcOutcome => ({ esito: state === 'spento' ? 'nfc-spento' : 'assente' });

  const closeSession = async () => {
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    writeTag = null;
    await safeCancel();
    busy = false;
    void applySilencer();
  };

  return {
    available: true,
    holdsTagWhileAsking: driver.os === 'android',
    status,

    async setSilencer(on) {
      silencerWanted = on && driver.os === 'android';
      if (driver.os !== 'android') return; // su iOS registerTagEvent aprirebbe il pannello di sistema
      if (!on && !registered) return; // spento e mai acceso: niente da togliere, la libreria non si avvia
      if (!(await ensureStarted())) return;
      if (on) {
        try { if (!(await driver.isSupported())) return; } catch { return; }
        await applySilencer();
      } else if (registered && !busy) {
        registered = false;
        try { await driver.unregisterTagEvent(); } catch { /* già tolto */ }
      }
    },

    async read(options) {
      if (busy) return { esito: 'occupato' };
      busy = true;
      let outcome: NfcOutcome | null = null;
      let resolve!: (o: NfcOutcome) => void;
      const done = new Promise<NfcOutcome>((r) => { resolve = r; });
      const finish = (o: NfcOutcome) => { if (!outcome) { outcome = o; resolve(o); } };
      finishRead = finish;
      const timer = setTimeout(() => finish({ esito: 'tempo-scaduto' }), options?.timeoutMs ?? NFC_TIMEOUT_MS);
      let temporary = false;
      try {
        const state = await status();
        if (state !== 'attivo') finish(notReady(state));
        if (!outcome) {
          driver.onTag((tag) => finish({ esito: 'letto', tag }));
          driver.onSessionClosed?.(() => finish({ esito: 'annullato' }));
          if (!(driver.os === 'android' && registered)) {
            await driver.registerTagEvent(driver.os === 'android' ? SILENCER : { alertMessage: IOS_PROMPT, invalidateAfterFirstRead: true });
            temporary = true;
          }
        }
        return await done;
      } catch (error) {
        finish({ esito: 'errore', messaggio: message(error) });
        return outcome!;
      } finally {
        clearTimeout(timer);
        finishRead = null;
        driver.onTag(null);
        driver.onSessionClosed?.(null);
        // Senza silenziatore il reader mode serviva solo a questa lettura (col silenziatore non si toglie mai)
        if (temporary) { try { await driver.unregisterTagEvent(); } catch { /* già tolto */ } }
        busy = false;
        void applySilencer();
      }
    },

    async openForWrite(options) {
      if (busy) return { esito: 'occupato' };
      busy = true;
      let reason: NfcOutcome | null = null;
      const stop = (o: NfcOutcome) => { reason = reason ?? o; return safeCancel(); };
      stopWaiting = () => stop({ esito: 'annullato' });
      const timer = setTimeout(() => { void stop({ esito: 'tempo-scaduto' }); }, options?.timeoutMs ?? NFC_TIMEOUT_MS);
      let open = false;
      try {
        const state = await status();
        if (state !== 'attivo') return notReady(state);
        if (reason) return reason;
        if (driver.os === 'android') {
          // In reader mode la libreria manda l'evento di ogni tag: uno senza Ndef non si collegherebbe mai, lo si dice
          driver.onTag((tag) => { if (isNonNdef(tag)) void stop({ esito: 'non-ndef', id: tag.id ?? null }); });
        }
        try {
          await driver.requestNdef(driver.os === 'android' ? SILENCER : { alertMessage: IOS_PROMPT });
        } catch (error) {
          return reason ?? { esito: 'errore', messaggio: message(error) };
        }
        if (reason) { await safeCancel(); return reason; }
        const tag = (await driver.getTag()) ?? {};
        let writable = true;
        try { writable = (await driver.ndefStatus()).writable; } catch { /* stato non letto: si prova a scrivere */ }
        open = true;
        writeTag = tag;
        sessionTimer = setTimeout(() => { void closeSession(); }, SESSION_MS);
        (sessionTimer as { unref?: () => void }).unref?.();
        return { esito: 'pronto', tag, writable };
      } catch (error) {
        await safeCancel();
        return { esito: 'errore', messaggio: message(error) };
      } finally {
        clearTimeout(timer);
        stopWaiting = null;
        driver.onTag(null);
        if (!open) { busy = false; void applySilencer(); }
      }
    },

    async write(bytes) {
      if (!writeTag) return { esito: 'errore', messaggio: 'nessun tag aperto' };
      const tag = writeTag;
      try {
        await driver.writeNdef(bytes);
        return { esito: 'scritto', id: tag.id ?? null };
      } catch (error) {
        return { esito: 'errore', messaggio: message(error) };
      } finally {
        await closeSession();
      }
    },

    async cancel() {
      finishRead?.({ esito: 'annullato' });
      if (stopWaiting) await stopWaiting();
      else if (writeTag) await closeSession();
    },
  };
}
