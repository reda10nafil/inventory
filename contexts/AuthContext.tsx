import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../backend-auth/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { signInWithGoogle, signOut as googleSignOut } from '../backend-auth/google/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  operatorId: string | null;
  setOperatorId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorId, setOperatorIdState] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      const savedOperatorId = localStorage.getItem('operatorId');
      if (savedOperatorId) setOperatorIdState(savedOperatorId);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const result = await signInWithGoogle();
      if (result.success && result.idToken) {
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: result.idToken,
        });
        if (error) throw error;
        if (result.accessToken) localStorage.setItem('googleAccessToken', result.accessToken);
        return { success: true };
      }
      return { success: false, error: 'Login fallito' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Errore' };
    }
  };

  const signOut = async () => {
    await googleSignOut();
    await supabase.auth.signOut();
    localStorage.removeItem('googleAccessToken');
    localStorage.removeItem('operatorId');
    setOperatorIdState(null);
  };

  const setOperatorId = (id: string) => {
    setOperatorIdState(id);
    localStorage.setItem('operatorId', id);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut, operatorId, setOperatorId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
