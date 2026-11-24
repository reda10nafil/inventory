// Profilo e permessi di questo telefono (ACC1, ticket 32): senza login ogni telefono ha il suo profilo (nome, telefono,
// ruolo, foto, nome del telefono) e la sua tabella dei permessi, in due chiavi per telefono. Si scrivono SOLO a una
// modifica nell'Accesso o al primo evento della Cronologia (l'id del profilo è l'autore): aprire una schermata non
// scrive nulla. Prima della lettura vale il profilo di partenza: Titolare, tutto permesso. I ruoli proteggono dagli
// errori, non da chi vuole aggirarli (si cambiano dal telefono stesso): diventano sicuri con gli account (ACC3).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventAuthor } from '../types';
import { EMPTY_PROFILE, authorOf, newProfileId, normalizeProfile, type Profile } from '../utils/profile';
import {
  DEFAULT_PERMISSIONS, can as canRole, deniedReason, normalizePermissions, setPermission as setCell,
  type Action, type Permissions, type Role,
} from '../utils/roles';

export const PROFILE_KEY = 'device:v1:profile';
export const PERMISSIONS_KEY = 'device:v1:permissions';

interface ProfileContextValue {
  profile: Profile;
  permissions: Permissions;
  loaded: boolean;
  /** Cambia e salva il profilo (alla prima volta gli dà un id). Il ruolo si cambia sempre da qui (nessun login). */
  updateProfile: (patch: Partial<Omit<Profile, 'id'>>) => void;
  /** Cambia una casella della tabella: solo con il permesso «gestire i ruoli» (Titolare). */
  setPermission: (role: Role, action: Action, value: boolean) => void;
  can: (action: Action) => boolean;
  /** Autore di un evento nuovo; undefined prima della lettura dello storage. */
  stampAuthor: () => EventAuthor | undefined;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const save = (key: string, value: unknown) => { AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {}); };

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [permissions, setPermissions] = useState<Permissions>(DEFAULT_PERMISSIONS);
  const [loaded, setLoaded] = useState(false);
  // Copie lette subito (più eventi nello stesso istante prendono lo stesso id; nessun salvataggio perso)
  const profileRef = useRef(profile);
  const permissionsRef = useRef(permissions);
  const loadedRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(PROFILE_KEY), AsyncStorage.getItem(PERMISSIONS_KEY)])
      .then(([p, t]) => {
        if (!active) return;
        const parse = (s: string | null) => { try { return s ? JSON.parse(s) : null; } catch { return null; } };
        const nextProfile = normalizeProfile(parse(p));
        const nextTable = normalizePermissions(parse(t));
        profileRef.current = nextProfile;
        permissionsRef.current = nextTable;
        setProfile(nextProfile);
        setPermissions(nextTable);
      })
      .catch(() => {})
      .finally(() => { if (active) { loadedRef.current = true; setLoaded(true); } });
    return () => { active = false; };
  }, []);

  const writeProfile = useCallback((next: Profile) => {
    profileRef.current = next;
    setProfile(next);
    save(PROFILE_KEY, next);
  }, []);

  const updateProfile = useCallback((patch: Partial<Omit<Profile, 'id'>>) => {
    // prima della lettura dello storage una modifica scriverebbe il profilo di partenza sopra quello salvato
    if (!loadedRef.current) return;
    const current = profileRef.current;
    writeProfile(normalizeProfile({ ...current, ...patch, id: current.id || newProfileId() }));
  }, [writeProfile]);

  const setPermission = useCallback((role: Role, action: Action, value: boolean) => {
    if (!loadedRef.current) return;
    if (!canRole(profileRef.current.role, 'ruoli', permissionsRef.current)) return;
    const next = setCell(permissionsRef.current, role, action, value);
    if (next === permissionsRef.current) return;
    permissionsRef.current = next;
    setPermissions(next);
    save(PERMISSIONS_KEY, next);
  }, []);

  const stampAuthor = useCallback((): EventAuthor | undefined => {
    if (!loadedRef.current) return undefined;
    if (!profileRef.current.id) writeProfile({ ...profileRef.current, id: newProfileId() });
    return authorOf(profileRef.current);
  }, [writeProfile]);

  const can = useCallback((action: Action) => canRole(profile.role, action, permissions), [profile.role, permissions]);

  const value = useMemo(() => ({ profile, permissions, loaded, updateProfile, setPermission, can, stampAuthor }),
    [profile, permissions, loaded, updateProfile, setPermission, can, stampAuthor]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}

const noAuthor = () => undefined;
/** Per l'inventario: l'autore degli eventi nuovi (senza il provider, nessun autore). */
export function useEventAuthor(): () => EventAuthor | undefined {
  return useContext(ProfileContext)?.stampAuthor ?? noAuthor;
}

/** Permesso di un'azione per il ruolo di questo telefono, con il motivo in parole quando non c'è. */
export function usePermission(action: Action): { allowed: boolean; reason: string } {
  const { profile, can } = useProfile();
  const allowed = can(action);
  return { allowed, reason: allowed ? '' : deniedReason(profile.role, action) };
}
