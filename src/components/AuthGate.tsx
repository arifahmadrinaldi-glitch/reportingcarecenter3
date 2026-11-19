import { KeyRound, Lock, Mail, Radio, User } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp, verifyOtp, resendOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [firstAccess, setFirstAccess] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Radio className="size-7 animate-pulse text-primary" aria-label="Memeriksa akses" />
      </div>
    );
  }

  if (user) return children;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Masukkan email");
      return;
    }
    if (otpRequired) {
      if (!/^\d{6}$/.test(otp.trim())) {
        toast.error("Masukkan 6 digit kode OTP");
        return;
      }
      setSubmitting(true);
      const result = await verifyOtp(email, otp);
      setSubmitting(false);
      if (result) {
        toast.error("Kode OTP salah atau sudah kedaluwarsa");
      } else {
        toast.success("Verifikasi berhasil");
      }
      return;
    }
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    setSubmitting(true);
    const result = firstAccess ? await signUp(email, password) : await signIn(email, password);
    setSubmitting(false);

    if (!result) {
      toast.success("Akun berhasil diaktifkan");
      return;
    }
    if (result === "otp-required") {
      setOtpRequired(true);
      setPassword("");
      toast.success("Kode OTP telah dikirim melalui @CC3Notif_bot");
      return;
    }
    if (result === "confirmation-required") {
      toast.success("Periksa email untuk konfirmasi akun");
      setFirstAccess(false);
      setPassword("");
      return;
    }
    toast.error(result === "email-not-approved" ? "Email tidak memiliki akses" : firstAccess ? "Gagal mengaktifkan akun" : "Email atau kata sandi salah");
  };

    return (
    <main className="flex min-h-screen items-center justify-center bg-[#ebf0f7] px-4 py-10 font-sans">
      <section className="w-full max-w-sm">
        <div className="relative rounded-[2.5rem] bg-[#ebf0f7] p-8 shadow-[14px_14px_28px_#cbcfd6,-14px_-14px_28px_#ffffff]">
          {/* Top Avatar Circle */}
          <div className="mx-auto -mt-16 flex size-20 items-center justify-center rounded-full bg-[#ebf0f7] shadow-[6px_6px_14px_#cbcfd6,-6px_-6px_14px_#ffffff]">
            <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 text-white shadow-inner">
              {otpRequired ? <KeyRound className="size-7" /> : <User className="size-7" />}
            </div>
          </div>

          <div className="mt-4 text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-700">
              {otpRequired ? "Verifikasi OTP" : firstAccess ? "Daftar Akun Baru" : "Welcome Back"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {otpRequired
                ? "Masukkan 6 digit kode dari @CC3Notif_bot"
                : "Reporting Care Center Operations"}
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit} autoComplete="off">
            {!otpRequired ? (
              <>
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute left-4 size-4 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    autoComplete="off"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    autoFocus
                    className="h-11 rounded-full border-0 bg-[#ebf0f7] pl-11 pr-4 text-xs text-slate-700 shadow-[inset_3px_3px_6px_#cbcfd6,inset_-3px_-3px_6px_#ffffff] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
                  />
                </div>

                <div className="relative flex items-center">
                  <Lock className="pointer-events-none absolute left-4 size-4 text-slate-400" />
                  <Input
                    type="password"
                    value={password}
                    autoComplete={firstAccess ? "new-password" : "current-password"}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={firstAccess ? "Create password" : "Password"}
                    className="h-11 rounded-full border-0 bg-[#ebf0f7] pl-11 pr-4 text-xs text-slate-700 shadow-[inset_3px_3px_6px_#cbcfd6,inset_-3px_-3px_6px_#ffffff] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
                  />
                </div>
              </>
            ) : (
              <div className="relative flex items-center">
                <KeyRound className="pointer-events-none absolute left-4 size-4 text-slate-400" />
                <Input
                  value={otp}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
                  autoFocus
                  className="h-11 rounded-full border-0 bg-[#ebf0f7] pl-11 pr-4 text-center text-sm font-semibold tracking-widest text-slate-700 shadow-[inset_3px_3px_6px_#cbcfd6,inset_-3px_-3px_6px_#ffffff] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-cyan-500"
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 text-xs font-semibold uppercase tracking-wider text-white shadow-[4px_4px_10px_#cbcfd6,-4px_-4px_10px_#ffffff] hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {submitting ? "Memproses..." : otpRequired ? "Verifikasi OTP" : firstAccess ? "Sign Up" : "Log In"}
            </Button>
          </form>

          {otpRequired ? (
            <div className="mt-4 flex justify-center gap-2">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-cyan-600 hover:text-cyan-700"
                onClick={async () => {
                  const result = await resendOtp(email);
                  toast[result ? "error" : "success"](result ? "Kode OTP gagal dikirim" : "Kode OTP baru telah dikirim");
                }}
              >
                Kirim ulang kode
              </Button>
              <span className="text-xs text-slate-300">•</span>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-slate-400 hover:text-slate-600"
                onClick={() => {
                  setOtpRequired(false);
                  setOtp("");
                  setEmail("");
                }}
              >
                Ganti email
              </Button>
            </div>
          ) : (
            <div className="mt-5 text-center">
              <p className="text-xs text-slate-400">
                {firstAccess ? "Sudah punya akun? " : "Belum punya akun? "}
                <button
                  type="button"
                  onClick={() => {
                    setFirstAccess((val) => !val);
                    setEmail("");
                    setPassword("");
                  }}
                  className="font-medium text-cyan-600 hover:underline"
                >
                  {firstAccess ? "Sign in" : "Sign up"}
                </button>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
