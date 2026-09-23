import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const APPROVED_EMAIL = "ahmadarifrinaldi@gmail.com";
const BOT_TOKEN = "8988855506:AAHGK8Gtdi66tHvUiRQ2VYgC6_x64RRZDz4";
const TARGET_CHAT_ID = -1004310653064;

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

async function sendOtpToTelegram(otp: string): Promise<boolean> {
  try {
    const text = `🔐 <b>Kode Verifikasi Login CC3</b>\n\nKode OTP Anda: <code>${otp}</code>\n\nBerlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun.`;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TARGET_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Gagal mengirim OTP ke Telegram:", e);
    return false;
  }
}

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
        const otpVerified = sessionStorage.getItem("otp_verified") === "true";
        if (nextUser && !otpVerified) {
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(nextUser);
        }
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (suppressSession.current) {
        setUser(null);
        return;
      }
      const otpVerified = sessionStorage.getItem("otp_verified") === "true";
      if (!otpVerified) {
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

  const generateAndSendOtp = async (email: string) => {
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await (supabase as any).from("telegram_otp").delete().eq("email", email);

    const { error: insertError } = await (supabase as any).from("telegram_otp").insert({
      email,
      otp: randomOtp,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("Gagal simpan OTP:", insertError.message);
      return false;
    }

    return await sendOtpToTelegram(randomOtp);
  };

  const signIn = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";

    suppressSession.current = true;
    setUser(null);
    sessionStorage.removeItem("otp_verified");

    const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      suppressSession.current = false;
      return error.message;
    }

    const sent = await generateAndSendOtp(normalizedEmail);
    if (!sent) {
      suppressSession.current = false;
      return "Gagal mengirim kode OTP ke Telegram. Coba lagi.";
    }

    return "otp-required";
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

    const { data, error } = await (supabase as any)
      .from("telegram_otp")
      .select("otp, expires_at")
      .eq("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return "OTP tidak ditemukan";
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return "Kode OTP sudah kedaluwarsa";
    }

    if (data.otp !== token.trim()) {
      return "Kode OTP salah";
    }

    await (supabase as any).from("telegram_otp").delete().eq("email", normalizedEmail);

    sessionStorage.setItem("otp_verified", "true");
    suppressSession.current = false;

    const { data: userData } = await supabase.auth.getUser();
    setUser(userData.user ?? null);
    return null;
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== APPROVED_EMAIL) return "email-not-approved";

    const sent = await generateAndSendOtp(normalizedEmail);
    return sent ? null : "Gagal mengirim ulang OTP ke Telegram";
  }, []);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem("otp_verified");
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
