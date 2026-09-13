/**
 * SyncroFlow — useMeshRole
 * Gestisce role host/client, isConnected, syncStatus via meshSync LAN.
 * Bare RN 0.81.5 — nessun expo-router, solo hooks + WS.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createHostRoom as _createHostRoom,
  joinRoom as _joinRoom,
  syncDatabase,
  sendLightPayload as _sendLightPayload,
  disconnect as _disconnect,
  getActiveSocket,
  subscribeSyncStatus,
  getSyncStatus,
  parseQrPayload,
  getActiveRole,
  getActiveWsUrl,
  type MeshRole,
  type SyncStatus,
  type LightPayload,
  type HostRoom,
  type JoinInfo,
} from '../services/meshSync';

export type UseMeshRoleReturn = {
  role: MeshRole | null;
  isHost: boolean;
  isClient: boolean;
  isConnected: boolean;
  syncStatus: SyncStatus;
  roomToken: string | null;
  wsUrl: string | null;
  qrPayload: string | null;
  lastJoinInfo: JoinInfo | null;
  // actions
  setRole: (r: MeshRole | null) => void;
  createHost: () => Promise<HostRoom | null>;
  joinWithPayload: (qrPayload: string) => Promise<JoinInfo | null>;
  syncNow: (opts?: { fullResync?: boolean }) => Promise<void>;
  sendLightPayload: (p: LightPayload) => Promise<void>;
  disconnect: () => void;
  parsePayload: typeof parseQrPayload;
};

export function useMeshRole(): UseMeshRoleReturn {
  const [role, setRoleState] = useState<MeshRole | null>(() => getActiveRole());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [isConnected, setIsConnected] = useState(false);
  const [roomToken, setRoomToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(() => getActiveWsUrl());
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [lastJoinInfo, setLastJoinInfo] = useState<JoinInfo | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // subscribe syncStatus
  useEffect(() => {
    const unsub = subscribeSyncStatus(setSyncStatus);
    return unsub;
  }, []);

  // poll isConnected da WebSocket readyState (WS non ha eventi React)
  useEffect(() => {
    const id = setInterval(() => {
      const ws = getActiveSocket();
      wsRef.current = ws;
      setIsConnected(ws?.readyState === WebSocket.OPEN);
      // sync role/wsUrl if changed externally
      const ar = getActiveRole();
      if (ar !== role) setRoleState(ar);
      const au = getActiveWsUrl();
      if (au !== wsUrl) setWsUrl(au);
    }, 600);
    return () => clearInterval(id);
  }, [role, wsUrl]);

  const setRole = useCallback((r: MeshRole | null) => {
    setRoleState(r);
    if (!r) {
      setQrPayload(null);
      setRoomToken(null);
      setLastJoinInfo(null);
    }
  }, []);

  const createHost = useCallback(async (): Promise<HostRoom | null> => {
    try {
      setSyncStatus('idle' as SyncStatus);
      const room = await _createHostRoom();
      setRoleState('host');
      setRoomToken(room.roomToken);
      setWsUrl(room.wsUrl);
      setQrPayload(room.qrPayload);
      console.log('[useMeshRole:createHost] room', room);
      return room;
    } catch (e) {
      console.log('[useMeshRole:createHost] error', e);
      setSyncStatus('error');
      return null;
    }
  }, []);

  const joinWithPayload = useCallback(async (payload: string): Promise<JoinInfo | null> => {
    const raw = payload.trim();
    if (!raw) return null;
    try {
      const info = await _joinRoom(raw);
      setRoleState('client');
      setWsUrl(info.wsUrl);
      setRoomToken(info.token);
      setLastJoinInfo(info);
      console.log('[useMeshRole:joinWithPayload] joined', info);

      // auto sync 100% dopo join (pull products/automations/timeline)
      try {
        await syncDatabase({ peerUrl: info.httpUrl, fullResync: true });
      } catch (e) {
        console.log('[useMeshRole:joinWithPayload] syncDatabase stub warn', e);
      }

      return info;
    } catch (e) {
      console.log('[useMeshRole:joinWithPayload] error', e);
      setSyncStatus('error');
      return null;
    }
  }, []);

  const syncNow = useCallback(
    async (opts?: { fullResync?: boolean }) => {
      try {
        const url = lastJoinInfo?.httpUrl ?? wsUrl?.replace(/^ws/, 'http').split('?')[0] ?? undefined;
        await syncDatabase({ peerUrl: url, fullResync: opts?.fullResync ?? false });
      } catch (e) {
        console.log('[useMeshRole:syncNow] error', e);
      }
    },
    [lastJoinInfo, wsUrl]
  );

  const sendLightPayload = useCallback(async (p: LightPayload) => {
    try {
      await _sendLightPayload(p);
    } catch (e) {
      console.log('[useMeshRole:sendLightPayload] error', e);
    }
  }, []);

  const disconnect = useCallback(() => {
    _disconnect();
    setIsConnected(false);
    setWsUrl(null);
    setRoomToken(null);
    // mantieni role per toggle UI — oppure reset
    // setRoleState(null);
  }, []);

  return {
    role,
    isHost: role === 'host',
    isClient: role === 'client',
    isConnected,
    syncStatus,
    roomToken,
    wsUrl,
    qrPayload,
    lastJoinInfo,
    setRole,
    createHost,
    joinWithPayload,
    syncNow,
    sendLightPayload,
    disconnect,
    parsePayload: parseQrPayload,
  };
}

export default useMeshRole;
