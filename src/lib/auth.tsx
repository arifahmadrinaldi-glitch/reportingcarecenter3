import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const APPROVED_EMAIL = "ahmadarifrinaldi@gmail.com";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  verifyOtp: (email: string, token: string) => Promise<string | null>;
  resendOtp: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const suppressSession = useRef(false);

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
      if (suppressSession.current) {
        setUser(null);
        return;
      }
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

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";

    suppressSession.current = true;
    setUser(null);
    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      suppressSession.current = false;
      return error.message;
    }

    await supabase.auth.signOut();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });
    suppressSession.current = false;
    return otpError ? otpError.message : "otp-required";
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) return error.message;
    return data.session ? null : "confirmation-required";
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";
    const { error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: token.trim(),
      type: "email",
    });
    return error?.message ?? null;
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser: false },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, verifyOtp, resendOtp, signOut }),
    [user, loading, signIn, signUp, verifyOtp, resendOtp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return context;
}