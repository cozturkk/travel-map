import type { Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface BackupData {
  manuallyVisited: string[];
  bucketList: string[];
  homeCountry: string | null;
  stats: { countries: number; cities: number } | null;
  updatedAt: string;
}

interface AuthResult {
  error: string | null;
  needsConfirmation?: boolean;
}

interface AuthContextType {
  configured: boolean;
  initializing: boolean;
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  backup: (data: BackupData) => Promise<{ error: string | null }>;
  restore: () => Promise<{ data: BackupData | null; error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TABLE = "user_stats";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setInitializing(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Cloud sync is not configured." };
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    // When email confirmation is on, there's no active session yet.
    return { error: null, needsConfirmation: !data.session };
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { error: "Cloud sync is not configured." };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ? error.message : null };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const backup = useCallback(
    async (payload: BackupData): Promise<{ error: string | null }> => {
      if (!supabase || !user) return { error: "Not signed in." };
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          { user_id: user.id, data: payload, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      return { error: error ? error.message : null };
    },
    [user]
  );

  const restore = useCallback(async (): Promise<{
    data: BackupData | null;
    error: string | null;
  }> => {
    if (!supabase || !user) return { data: null, error: "Not signed in." };
    const { data, error } = await supabase
      .from(TABLE)
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: (data?.data as BackupData) ?? null, error: null };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        configured: isSupabaseConfigured,
        initializing,
        user,
        session,
        signUp,
        signIn,
        signOut,
        backup,
        restore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
