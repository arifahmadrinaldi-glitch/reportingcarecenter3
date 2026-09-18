import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const APPROVED_EMAIL = "ahmadarifrinaldi@gmail.com";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (password: string) => Promise<string | null>;
  signUp: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const nextUser = data.user?.email?.toLowerCase() === APPROVED_EMAIL ? data.user : null;
      if (data.user && !nextUser) await supabase.auth.signOut();
      if (active) {
        setUser(nextUser);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user.email?.toLowerCase() === APPROVED_EMAIL ? session.user : null;
      setUser(nextUser);
      setLoading(false);
      if (session?.user && !nextUser) void supabase.auth.signOut();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: APPROVED_EMAIL, password });
    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (password: string) => {
    const { data, error } = await supabase.auth.signUp({ email: APPROVED_EMAIL, password });
    if (error) return error.message;
    return data.session ? null : "confirmation-required";
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return context;
}