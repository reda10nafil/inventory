// N1 (ticket 16, 17, N0 §4): servizio NFC con un driver finto (`utils/nfcCore.ts`). La libreria vera non si carica in
// jest: qui si prova che cosa il servizio chiede al driver (silenziatore, lettura, scrittura, annullamento, tempi).
import { createNfcService, SILENCER, type NfcDriver, type NfcTagEvent } from '../utils/nfcCore';

type Listener<T> = ((value: T) => void) | null;

function fakeDriver(os: 'android' | 'ios' = 'android', { supported = true, enabled = true } = {}) {
  const calls: string[] = [];
  let tagListener: Listener<NfcTagEvent> = null;
  let stateListener: Listener<string> = null;
  let closedListener: Listener<void> = null;
  let pendingRequest: { resolve: () => void; reject: (e: Error) => void } | null = null;
  let current: NfcTagEvent | null = null;
  const state = { supported, enabled, writable: true, writeFails: false, registerOptions: [] as unknown[] };
  const driver: NfcDriver = {
    os,
    start: async () => { calls.push('start'); },
    isSupported: async () => state.supported,
    isEnabled: async () => state.enabled,
    registerTagEvent: async (options) => { calls.push('register'); state.registerOptions.push(options); },
    unregisterTagEvent: async () => { calls.push('unregister'); },
    onTag: (l) => { tagListener = l; },
    onStateChange: (l) => { stateListener = l; },
    onSessionClosed: (l) => { closedListener = l; },
    requestNdef: (options) => {
      calls.push('request');
      state.registerOptions.push(options);
      return new Promise<void>((resolve, reject) => { pendingRequest = { resolve, reject }; });
    },
    getTag: async () => current,
    ndefStatus: async () => ({ writable: state.writable, capacity: 137 }),
    writeNdef: async () => { calls.push('write'); if (state.writeFails) throw new Error('tag allontanato'); },
    cancelRequest: async () => {
      calls.push('cancel');
      if (pendingRequest) { const p = pendingRequest; pendingRequest = null; p.reject(new Error('cancelled')); }
    },
  };
  return {
    driver, calls, state,
    /** Un tag avvicinato: l'evento del reader mode e, se c'è una richiesta, il collegamento. */
    tap(tag: NfcTagEvent) {
      current = tag;
      tagListener?.(tag);
      if (pendingRequest) { const p = pendingRequest; pendingRequest = null; p.resolve(); }
    },
    nfcState(value: string) { stateListener?.(value); },
    closeSession() { closedListener?.(); },
    get listening() { return tagListener !== null; },
  };
}

const TAG: NfcTagEvent = { id: '04A23B1C', ndefMessage: [], techTypes: ['android.nfc.tech.NfcA', 'android.nfc.tech.Ndef'] };
const flush = () => new Promise((r) => setImmediate(r));

describe('silenziatore (N0, decisione 1)', () => {
  it('registrato una volta, con i flag A, B, F, V e senza suoni (271); mai tolto finché è acceso', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    await nfc.setSilencer(true);
    await nfc.setSilencer(true);
    expect(f.calls.filter((c) => c === 'register')).toHaveLength(1);
    expect(SILENCER.readerModeFlags).toBe(271);
    expect(f.state.registerOptions[0]).toEqual(SILENCER);
    expect(f.listening).toBe(false); // a riposo nessun ascoltatore: un tag è scartato
    // una lettura riusa la registrazione e alla fine non la toglie
    const reading = nfc.read({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    expect(await reading).toEqual({ esito: 'letto', tag: TAG });
    expect(f.calls).not.toContain('unregister');
    expect(f.listening).toBe(false);
  });

  it('riapplicato quando l\'NFC si riaccende; spento dall\'interruttore', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    await nfc.setSilencer(true);
    f.nfcState('on');
    await flush();
    expect(f.calls.filter((c) => c === 'register')).toHaveLength(2);
    await nfc.setSilencer(false);
    expect(f.calls.filter((c) => c === 'unregister')).toHaveLength(1);
    f.nfcState('on');
    await flush();
    expect(f.calls.filter((c) => c === 'register')).toHaveLength(2);
  });

  it('mai su iOS (registerTagEvent aprirebbe il pannello di sistema), mai senza NFC', async () => {
    const ios = fakeDriver('ios');
    await createNfcService(ios.driver).setSilencer(true);
    expect(ios.calls).not.toContain('register');
    const none = fakeDriver('android', { supported: false });
    await createNfcService(none.driver).setSilencer(true);
    expect(none.calls).not.toContain('register');
  });

  it('niente all\'avvio del servizio: start solo alla prima operazione', async () => {
    const f = fakeDriver();
    createNfcService(f.driver);
    await flush();
    expect(f.calls).toEqual([]);
    // l'interruttore spento letto all'avvio (HardwareConfigProvider) non avvia la libreria
    await createNfcService(f.driver).setSilencer(false);
    expect(f.calls).toEqual([]);
  });
});

describe('stato e lettura (una pressione = una lettura)', () => {
  it('stato: assente, spento, attivo', async () => {
    expect(await createNfcService(fakeDriver('android', { supported: false }).driver).status()).toBe('assente');
    expect(await createNfcService(fakeDriver('android', { enabled: false }).driver).status()).toBe('spento');
    expect(await createNfcService(fakeDriver().driver).status()).toBe('attivo');
  });

  it('senza silenziatore la lettura usa il reader mode solo mentre legge, poi lo toglie', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const reading = nfc.read({ timeoutMs: 5000 });
    await flush();
    expect(f.calls).toContain('register');
    expect(f.state.registerOptions[0]).toEqual(SILENCER);
    f.tap(TAG);
    f.tap({ ...TAG, id: 'ALTRO' }); // il secondo tag non conta
    expect(await reading).toEqual({ esito: 'letto', tag: TAG });
    expect(f.calls.filter((c) => c === 'unregister')).toHaveLength(1);
  });

  it('una lettura alla volta: la seconda è «occupato»', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const first = nfc.read({ timeoutMs: 5000 });
    await flush();
    expect(await nfc.read()).toEqual({ esito: 'occupato' });
    f.tap(TAG);
    expect((await first).esito).toBe('letto');
    // dopo, si legge di nuovo
    const again = nfc.read({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    expect((await again).esito).toBe('letto');
  });

  it('tempo scaduto e Annulla chiudono la lettura', async () => {
    jest.useFakeTimers();
    try {
      const f = fakeDriver();
      const nfc = createNfcService(f.driver);
      const reading = nfc.read({ timeoutMs: 1000 });
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      jest.advanceTimersByTime(1001);
      expect(await reading).toEqual({ esito: 'tempo-scaduto' });
      expect(f.listening).toBe(false);
    } finally {
      jest.useRealTimers();
    }
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const reading = nfc.read({ timeoutMs: 5000 });
    await flush();
    await nfc.cancel();
    expect(await reading).toEqual({ esito: 'annullato' });
    expect(f.listening).toBe(false);
  });

  it('NFC spento o assente: lo dice senza leggere', async () => {
    const off = fakeDriver('android', { enabled: false });
    expect(await createNfcService(off.driver).read()).toEqual({ esito: 'nfc-spento' });
    const none = fakeDriver('android', { supported: false });
    expect(await createNfcService(none.driver).read()).toEqual({ esito: 'assente' });
    expect(off.calls).not.toContain('register');
  });

  it('iOS: il pannello di sistema chiuso dall\'utente vale Annulla', async () => {
    const f = fakeDriver('ios');
    const nfc = createNfcService(f.driver);
    const reading = nfc.read({ timeoutMs: 5000 });
    await flush();
    f.closeSession();
    expect(await reading).toEqual({ esito: 'annullato' });
  });
});

describe('scrittura in un tocco (NG14, decisione 2)', () => {
  it('apre il tag, dice che cosa c\'è, scrive una volta e chiude sempre la sessione', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const opening = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    expect(await opening).toEqual({ esito: 'pronto', tag: TAG, writable: true });
    expect(f.state.registerOptions[0]).toEqual(SILENCER); // anche la richiesta in reader mode (N0 §2.a)
    expect(await nfc.write([1, 2, 3])).toEqual({ esito: 'scritto', id: '04A23B1C' });
    expect(f.calls.filter((c) => c === 'write')).toHaveLength(1);
    expect(f.calls[f.calls.length - 1]).toBe('cancel');
    expect(f.calls).not.toContain('register'); // nessun passo «pulisci», nessuna seconda registrazione
  });

  it('scrittura non riuscita: errore detto e sessione chiusa; poi si riprova', async () => {
    const f = fakeDriver();
    f.state.writeFails = true;
    const nfc = createNfcService(f.driver);
    const opening = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    await opening;
    expect((await nfc.write([1])).esito).toBe('errore');
    expect(f.calls[f.calls.length - 1]).toBe('cancel');
    const again = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    expect((await again).esito).toBe('pronto');
  });

  it('tag bloccato: «pronto» con writable falso; Annulla dopo la conferma chiude senza scrivere', async () => {
    const f = fakeDriver();
    f.state.writable = false;
    const nfc = createNfcService(f.driver);
    const opening = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    f.tap(TAG);
    expect(await opening).toEqual({ esito: 'pronto', tag: TAG, writable: false });
    await nfc.cancel();
    expect(f.calls).not.toContain('write');
    expect(f.calls[f.calls.length - 1]).toBe('cancel');
    expect(await nfc.write([1])).toEqual({ esito: 'errore', messaggio: 'nessun tag aperto' });
  });

  it('un tag che non sa l\'NDEF (Android): lo dice subito invece di aspettare', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const opening = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    f.tap({ id: '01020304', techTypes: ['android.nfc.tech.MifareClassic', 'android.nfc.tech.NfcA'] });
    expect(await opening).toEqual({ esito: 'non-ndef', id: '01020304' });
    expect(f.calls[f.calls.length - 1]).toBe('cancel');
  });

  it('Annulla mentre aspetta il tag', async () => {
    const f = fakeDriver();
    const nfc = createNfcService(f.driver);
    const opening = nfc.openForWrite({ timeoutMs: 5000 });
    await flush();
    await nfc.cancel();
    expect(await opening).toEqual({ esito: 'annullato' });
  });
});
