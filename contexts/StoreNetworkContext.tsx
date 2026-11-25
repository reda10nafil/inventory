// «Rete del negozio» (RETE0, ticket 32): la connessione di questo telefono vive qui, sopra la navigazione, e non dentro
// la schermata. Uscire da Impostazioni non riavvia nulla e non lascia server orfani (AR10); la Chat riceve anche a
// schermata della Rete chiusa.
// - All'apertura non si sceglie nulla e non parte nulla: con il ruolo «nessuno» niente socket, niente timer, niente
//   database, nessuna scrittura (AR02, CT09). Un centro ricordato (`network:v1:{org}:settings`) si ricollega da solo.
// - «Collegati a un centro»: hello col nome di questo telefono (dal profilo di Accesso), esito vero, errori in parole.
// - Presenza: elenco dei telefoni mandato dal centro; battito vero (un segnale ogni 10 s, «non risponde» dopo 30 s).
// - «Fai da centro»: solo sul telefono e solo col pulsante; il codice si salva e si riusa; «Nuovo codice» non riavvia il
//   server (CT11). Scritto qui, da provare sul telefono in RETE1.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useEventAuthor, useProfile } from './ProfileContext';
import * as mesh from '../src/services/meshSync';
import {
  CHECK_MS, DEFAULT_PORT, HEARTBEAT_MS, NO_NAME, buildCenterCode, centerUrl, cleanName, helloMessage, isSilent,
  linkErrorText, networkKey, normalizeNetworkSettings, readPresence, retryDelay,
  type CenterCode, type LinkState, type NetworkRole, type NetworkSettings, type NetworkView, type PresencePhone,
} from '../utils/storeNetwork';

/** Sul web un centro non può esistere (il browser non fa da server). */
export const CAN_HOST = Platform.OS !== 'web';
export const HOST_REASON = 'Sul computer non si può: usa un telefono che resta acceso in negozio.';

interface State {
  role: NetworkRole;
  link: LinkState;
  centerName: string;
  /** da quando il centro è acceso (dalla presenza, con l'ora di questo telefono) */
  centerSince?: number;
  connectedSince?: number;
  silentSince?: number;
  phones: PresencePhone[];
  lastMessageAt?: number;
  /** errore dell'ultimo tentativo di collegarsi, in parole (sotto il blocco) */
  error?: string;
  /** centro: il codice da mostrare (QR e «Mostra il codice») */
  hostCode?: string;
  hostError?: string;
}

export interface StoreNetworkValue extends State {
  loaded: boolean;
  /** id di questo telefono nella rete (per riconoscerlo nell'elenco) */
  selfId?: string;
  view: NetworkView;
  /** collegarsi a un centro letto o scritto: true se collegato */
  connect: (code: CenterCode) => Promise<boolean>;
  disconnect: () => void;
  startHost: () => Promise<void>;
  stopHost: () => Promise<void>;
  newCode: () => void;
  clearError: () => void;
}

const StoreNetworkContext = createContext<StoreNetworkValue | undefined>(undefined);

const EMPTY: State = { role: 'none', link: 'idle', centerName: '', phones: [] };

export function StoreNetworkProvider({ children }: { children: React.ReactNode }) {
  const { organizationId } = useAuth();
  const key = networkKey(organizationId || 'local');
  const { profile, loaded: profileLoaded } = useProfile();
  const stampAuthor = useEventAuthor();
  const [state, setState] = useState<State>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [selfId, setSelfId] = useState<string>();
  const settingsRef = useRef<NetworkSettings>({ role: 'none' });
  // Collegamento in corso: i messaggi e le chiusure di un collegamento vecchio non toccano lo stato
  const sessionRef = useRef(0);
  const lastHeardRef = useRef<number | undefined>(undefined);
  const lastSavedRef = useRef(0);
  const attemptsRef = useRef(0);
  const timers = useRef<{ retry?: ReturnType<typeof setTimeout>; beat?: ReturnType<typeof setInterval>; check?: ReturnType<typeof setInterval>; host?: ReturnType<typeof setInterval> }>({});
  const hostAddrRef = useRef<{ ip: string; port: number } | null>(null);
  const autoRef = useRef(false);

  const save = useCallback((next: NetworkSettings) => {
    settingsRef.current = next;
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  }, [key]);

  const stopClientTimers = () => {
    const t = timers.current;
    if (t.retry) clearTimeout(t.retry);
    if (t.beat) clearInterval(t.beat);
    if (t.check) clearInterval(t.check);
    t.retry = t.beat = t.check = undefined;
  };

  // Lettura della chiave: nessuna scrittura, nessun collegamento qui
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((s) => (s ? JSON.parse(s) : null))
      .catch(() => null)
      .then((raw) => {
        if (!active) return;
        const settings = normalizeNetworkSettings(raw, Platform.OS);
        settingsRef.current = settings;
        if (settings.role === 'client' && settings.center) {
          // si ricollega da solo appena letto il profilo: intanto «Collegamento al centro…»
          setState({ ...EMPTY, role: 'client', link: 'connecting', centerName: settings.center.name, silentSince: settings.center.lastSeen });
        } else if (settings.role === 'host') {
          setState({ ...EMPTY, role: 'host', link: 'idle' });
        }
        setLoaded(true);
      });
    return () => { active = false; };
  }, [key]);

  // Chi è questo telefono nella rete: id e nomi del profilo di Accesso (l'id nasce qui, al primo collegamento)
  const identity = useCallback(() => {
    const author = stampAuthor();
    const id = author?.id || selfId || `sessione-${Math.random().toString(36).slice(2, 12)}`;
    setSelfId(id);
    const name = cleanName([author?.name, author?.device].filter(Boolean).join(' · '), NO_NAME);
    return { id, name };
  }, [stampAuthor, selfId]);

  const connectRef = useRef<(code: CenterCode, remembered: boolean) => Promise<boolean>>(async () => false);

  const scheduleRetry = useCallback((code: CenterCode) => {
    const t = timers.current;
    if (t.retry) clearTimeout(t.retry);
    const wait = retryDelay(attemptsRef.current);
    attemptsRef.current += 1;
    t.retry = setTimeout(() => { void connectRef.current(code, true); }, wait);
  }, []);

  // Il centro è caduto o tace: «non risponde», chi era online diventa «visto…», si riprova da soli
  const dropped = useCallback((session: number, code: CenterCode) => {
    if (session !== sessionRef.current) return;
    sessionRef.current += 1;
    stopClientTimers();
    mesh.leaveCenter();
    const lastSeen = lastHeardRef.current ?? Date.now();
    const saved = settingsRef.current;
    if (saved.role === 'client' && saved.center) save({ ...saved, center: { ...saved.center, lastSeen } });
    setState((s) => ({ ...s, link: 'silent', silentSince: lastSeen }));
    scheduleRetry(code);
  }, [save, scheduleRetry]);

  const connectTo = useCallback(async (code: CenterCode, remembered: boolean): Promise<boolean> => {
    stopClientTimers();
    const session = ++sessionRef.current;
    const me = identity();
    // un centro ricordato che tace resta «non risponde» mentre si riprova; altrimenti «Collegamento al centro…»
    setState((s) => ({ ...s, role: 'client', link: remembered && s.link === 'silent' ? 'silent' : 'connecting', centerName: code.name || s.centerName, error: undefined }));
    try {
      const res = await mesh.connectToCenter(
        { url: centerUrl(code), token: code.token, hello: helloMessage(code.token, me, Platform.OS) },
        {
          message: (m) => {
            if (session !== sessionRef.current) return;
            const now = Date.now();
            lastHeardRef.current = now;
            // L'ultima notizia si salva al più ogni 10 s: alla riapertura «non risponde da…» e «visto alle…» partono da
            // qui e non dall'ora del collegamento (dopo una giornata collegati direbbe «da 8 ore»)
            const saved = settingsRef.current;
            if (now - lastSavedRef.current >= HEARTBEAT_MS && saved.role === 'client' && saved.center) {
              lastSavedRef.current = now;
              save({ ...saved, center: { ...saved.center, lastSeen: now } });
            }
            if (m?.type === 'presence') {
              const p = readPresence(m, now);
              if (p) setState((s) => ({ ...s, phones: p.phones, centerName: p.centerName || s.centerName, centerSince: p.centerSince }));
            } else if (m?.type === 'chat') {
              setState((s) => ({ ...s, lastMessageAt: now }));
            }
          },
          closed: () => dropped(session, code),
        },
      );
      if (session !== sessionRef.current) { return false; }
      const now = Date.now();
      lastHeardRef.current = now;
      lastSavedRef.current = now;
      attemptsRef.current = 0;
      const center = { ...code, name: cleanName(res.centerName, '') || code.name };
      save({ role: 'client', center: { ...center, lastSeen: now }, ...(settingsRef.current.hostToken && { hostToken: settingsRef.current.hostToken }) });
      setState((s) => ({ ...s, role: 'client', link: 'connected', centerName: center.name, connectedSince: now, silentSince: undefined, error: undefined }));
      // Battito: un segnale ogni 10 s; se il centro tace da 30 s è caduto
      const t = timers.current;
      t.beat = setInterval(() => { mesh.sendToCenter({ type: 'ping', ts: Date.now() }); }, HEARTBEAT_MS);
      t.check = setInterval(() => {
        if (session === sessionRef.current && isSilent(lastHeardRef.current, Date.now())) dropped(session, center);
      }, CHECK_MS);
      return true;
    } catch (e) {
      if (session !== sessionRef.current) return false;
      const kind = e instanceof mesh.CenterLinkError ? e.kind : 'non-risponde';
      if (remembered) {
        // centro ricordato: si resta in attesa e si riprova da soli
        setState((s) => ({ ...s, role: 'client', link: 'silent', silentSince: s.silentSince ?? settingsRef.current.center?.lastSeen ?? lastHeardRef.current }));
        scheduleRetry(code);
      } else {
        // primo collegamento: niente salvato, nessun nuovo tentativo da solo, l'errore in parole
        setState((s) => ({ ...s, role: 'none', link: 'idle', centerName: '', error: linkErrorText(kind) }));
      }
      return false;
    }
  }, [identity, save, dropped, scheduleRetry]);
  connectRef.current = connectTo;

  // Centro ricordato: ci si ricollega da soli alla riapertura (dopo la lettura del profilo, per il nome)
  useEffect(() => {
    if (!loaded || !profileLoaded || autoRef.current) return;
    autoRef.current = true;
    const saved = settingsRef.current;
    if (saved.role === 'client' && saved.center) void connectTo(saved.center, true);
  }, [loaded, profileLoaded, connectTo]);

  // Alla chiusura dell'app (o dello spazio) si chiude il collegamento
  useEffect(() => () => {
    sessionRef.current += 1;
    stopClientTimers();
    if (timers.current.host) clearInterval(timers.current.host);
    mesh.leaveCenter();
  }, []);

  const connect = useCallback((code: CenterCode) => connectTo(code, false), [connectTo]);

  const disconnect = useCallback(() => {
    sessionRef.current += 1;
    stopClientTimers();
    attemptsRef.current = 0;
    mesh.leaveCenter();
    const hostToken = settingsRef.current.hostToken;
    save({ role: 'none', ...(hostToken && { hostToken }) });
    setState(EMPTY);
  }, [save]);

  // ---- Centro (solo sul telefono; scritto qui, provato in RETE1) ----
  const pollHost = useCallback(() => {
    if (timers.current.host) clearInterval(timers.current.host);
    timers.current.host = setInterval(() => {
      const info = mesh.centerInfo();
      if (info) setState((s) => (s.role === 'host' ? { ...s, phones: info.phones } : s));
    }, 2000);
  }, []);

  const startHost = useCallback(async () => {
    if (!CAN_HOST) return;
    setState((s) => ({ ...s, role: 'host', link: 'connecting', hostError: undefined }));
    const token = settingsRef.current.hostToken || mesh.randomToken();
    const name = cleanName(profile.device || profile.name, 'Centro del negozio');
    try {
      const addr = await mesh.startCenter({ token, name, port: DEFAULT_PORT });
      hostAddrRef.current = addr;
      save({ role: 'host', hostToken: token });
      setState((s) => ({ ...s, role: 'host', link: 'connected', centerName: name, hostCode: buildCenterCode({ ...addr, token, name }), phones: [] }));
      pollHost();
    } catch {
      setState((s) => ({ ...s, role: 'host', link: 'idle', hostError: 'Il centro non si è acceso: controlla che il telefono sia collegato al Wi-Fi del negozio e riprova.' }));
    }
  }, [profile.device, profile.name, save, pollHost]);

  const stopHost = useCallback(async () => {
    if (timers.current.host) clearInterval(timers.current.host);
    timers.current.host = undefined;
    try { await mesh.stopCenter(); } catch { /* già fermo */ }
    hostAddrRef.current = null;
    const hostToken = settingsRef.current.hostToken;
    save({ role: 'none', ...(hostToken && { hostToken }) });
    setState(EMPTY);
  }, [save]);

  const newCode = useCallback(() => {
    const addr = hostAddrRef.current;
    if (!addr) return;
    const token = mesh.randomToken();
    mesh.renewCenterCode(token);
    save({ role: 'host', hostToken: token });
    setState((s) => ({ ...s, hostCode: buildCenterCode({ ...addr, token, name: s.centerName }) }));
  }, [save]);

  const clearError = useCallback(() => setState((s) => (s.error ? { ...s, error: undefined } : s)), []);

  const view: NetworkView = useMemo(() => ({
    role: state.role, link: state.link, centerName: state.centerName, silentSince: state.silentSince, phones: state.phones,
  }), [state.role, state.link, state.centerName, state.silentSince, state.phones]);

  const value = useMemo<StoreNetworkValue>(() => ({
    ...state, loaded, selfId, view, connect, disconnect, startHost, stopHost, newCode, clearError,
  }), [state, loaded, selfId, view, connect, disconnect, startHost, stopHost, newCode, clearError]);

  return <StoreNetworkContext.Provider value={value}>{children}</StoreNetworkContext.Provider>;
}

export function useStoreNetwork(): StoreNetworkValue {
  const context = useContext(StoreNetworkContext);
  if (!context) throw new Error('useStoreNetwork must be used within StoreNetworkProvider');
  return context;
}
