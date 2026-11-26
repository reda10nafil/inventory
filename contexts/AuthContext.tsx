import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../backend-auth/supabase/client';
import { chooseGoogleAccount, forgetGoogleAccount } from '../utils/googleAccount';

WebBrowser.maybeCompleteAuthSession();

/**
 * Interruttore del login Google/Supabase.
 * false = l'app parte senza schermata di accesso e usa uno spazio di lavoro locale
 * (dati solo sul dispositivo/browser, nessuna sincronizzazione cloud né team).
 * Rimettere a true quando OAuth Google e Supabase saranno configurati e provati.
 */
export const LOGIN_ENABLED = false;
export const LOCAL_ORGANIZATION_ID = 'local';
const LOCAL_ORGANIZATIONS = [{ id: LOCAL_ORGANIZATION_ID, name: 'Spazio locale', role: 'owner' }];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  organizationId: string | null;
  /**
   * 26/11: spazio nel cloud dell'account Google (uno per negozio), con l'accesso facoltativo da Impostazioni. I dati
   * del telefono restano nello spazio `local`; il cloud riceve la loro copia, le foto e la sincronizzazione con gli
   * altri telefoni dello stesso account. Null senza accesso.
   */
  cloudOrganizationId: string | null;
  organizations: Array<{ id: string; name: string; role: string }>;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const handledAuthCodes = new Set<string>();

function callbackUrl() {
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'syncroflow://auth/callback';
}

async function consumeCallback(url: string) {
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  if (!code || handledAuthCodes.has(code)) return;
  handledAuthCodes.add(code);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    handledAuthCodes.delete(code);
    throw error;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(LOGIN_ENABLED ? null : LOCAL_ORGANIZATION_ID);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; role: string }>>(LOGIN_ENABLED ? [] : LOCAL_ORGANIZATIONS);
  const [loading, setLoading] = useState(LOGIN_ENABLED);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudOrganizationId, setCloudOrganizationId] = useState<string | null>(null);

  // Accesso facoltativo (login spento): la sessione Supabase c'è solo se l'utente ha scelto l'account Google
  const resolveCloud = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) { setCloudOrganizationId(null); return; }
    const { data, error } = await (supabase as any).rpc('ensure_personal_organization');
    if (error) throw error;
    setCloudOrganizationId(typeof data === 'string' && data ? data : null);
  }, []);

  useEffect(() => {
    if (LOGIN_ENABLED) return;
    let mounted = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await resolveCloud(data.session);
    }).catch((error) => {
      if (mounted) setAuthError(error instanceof Error ? error.message : 'Account non raggiungibile.');
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void resolveCloud(nextSession).catch((error) => {
        setAuthError(error instanceof Error ? error.message : 'Spazio cloud non raggiungibile.');
      });
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [resolveCloud]);

  const resolveOrganization = useCallback(async (activeSession: Session | null) => {
    if (!activeSession) {
      setOrganizationId(null);
      setOrganizations([]);
      return;
    }
    const { data, error } = await (supabase as any).rpc('ensure_personal_organization');
    if (error) throw error;
    if (typeof data !== 'string' || !data) throw new Error('Non è stato possibile inizializzare lo spazio di lavoro.');
    const userId = activeSession.user.id;
    const { data: memberships, error: membershipError } = await (supabase as any)
      .from('organization_members').select('organization_id, role, organizations(id, name)').eq('user_id', userId);
    if (membershipError) throw membershipError;
    const available = (memberships || []).map((membership: any) => ({
      id: membership.organization_id,
      name: membership.organizations?.name || 'Organizzazione',
      role: membership.role,
    }));
    setOrganizations(available);
    const activeKey = `auth:active-organization:${userId}`;
    const savedId = await AsyncStorage.getItem(activeKey);
    const activeId = available.some((membership: any) => membership.id === savedId) ? savedId! : data;
    setOrganizationId(activeId);
    await AsyncStorage.setItem(activeKey, activeId);
  }, []);

  useEffect(() => {
    // Login disattivato: nessuna sessione Supabase, nessun ascolto dei callback OAuth.
    if (!LOGIN_ENABLED) return;
    let mounted = true;
    const initialize = async () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          await consumeCallback(window.location.href);
        } else {
          const initialUrl = await Linking.getInitialURL();
          if (initialUrl) await consumeCallback(initialUrl);
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        setSession(data.session);
        await resolveOrganization(data.session);
      } catch (error) {
        if (mounted) setAuthError(error instanceof Error ? error.message : 'Errore durante l’accesso.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError(null);
      if (!nextSession) setOrganizationId(null);
      else void resolveOrganization(nextSession).catch((error) => {
        setAuthError(error instanceof Error ? error.message : 'Impossibile caricare lo spazio di lavoro.');
      });
    });
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void consumeCallback(url).catch((error) => setAuthError(error instanceof Error ? error.message : 'Callback di accesso non valido.'));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [resolveOrganization]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    if (!LOGIN_ENABLED) {
      // Account Google del telefono → token d'identità → sessione Supabase (niente browser, niente password)
      const chosen = await chooseGoogleAccount();
      if (!chosen) return; // annullato
      const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: chosen.idToken });
      if (error) throw error;
      return;
    }
    const redirectTo = callbackUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        scopes: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) throw error;
    if (!data.url) throw new Error('Supabase non ha restituito l’URL di accesso Google.');
    if (Platform.OS === 'web') {
      window.location.assign(data.url);
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) await consumeCallback(result.url);
  }, []);

  const signOut = useCallback(async () => {
    if (!LOGIN_ENABLED) {
      await forgetGoogleAccount();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setCloudOrganizationId(null);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setOrganizationId(null);
    setOrganizations([]);
  }, []);

  const switchOrganization = useCallback(async (nextOrganizationId: string) => {
    if (!LOGIN_ENABLED) {
      if (nextOrganizationId !== LOCAL_ORGANIZATION_ID) throw new Error('Con l’accesso disattivato è disponibile solo lo spazio locale.');
      return;
    }
    if (!session?.user.id) throw new Error('Account non autenticato.');
    const { data, error } = await (supabase as any).from('organization_members')
      .select('organization_id, role, organizations(id, name)').eq('organization_id', nextOrganizationId).eq('user_id', session.user.id).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Non fai parte di questo spazio di lavoro.');
    setOrganizations((current) => current.some((organization) => organization.id === nextOrganizationId)
      ? current
      : [...current, { id: nextOrganizationId, name: data.organizations?.name || 'Organizzazione', role: data.role }]);
    await AsyncStorage.setItem(`auth:active-organization:${session.user.id}`, nextOrganizationId);
    setOrganizationId(nextOrganizationId);
  }, [session?.user.id]);

  const value = useMemo(() => ({
    session, user: session?.user ?? null, organizationId,
    cloudOrganizationId: LOGIN_ENABLED ? organizationId : cloudOrganizationId,
    organizations, loading, authError, signInWithGoogle, signOut, switchOrganization,
  }), [session, organizationId, cloudOrganizationId, organizations, loading, authError, signInWithGoogle, signOut, switchOrganization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
