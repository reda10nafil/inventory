import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../backend-auth/supabase/client';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  organizationId: string | null;
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
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setSession(null);
    setOrganizationId(null);
    setOrganizations([]);
  }, []);

  const switchOrganization = useCallback(async (nextOrganizationId: string) => {
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
    session, user: session?.user ?? null, organizationId, organizations, loading, authError, signInWithGoogle, signOut, switchOrganization,
  }), [session, organizationId, organizations, loading, authError, signInWithGoogle, signOut, switchOrganization]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
