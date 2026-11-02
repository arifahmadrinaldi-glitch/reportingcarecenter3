import { KeyRound, LockKeyhole, Radio } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Radio className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Reporting Care Center</h1>
            <p className="text-[10px] uppercase text-muted-foreground">Private Operations</p>
          </div>
        </div>

        <div className="panel border-t-4 border-t-primary p-6 shadow-lg">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            {otpRequired ? <KeyRound className="size-5" /> : <LockKeyhole className="size-5" />}
          </div>
          <h2 className="mt-4 text-base font-bold text-foreground">
            {otpRequired ? "Verifikasi OTP" : firstAccess ? "Aktifkan akses" : "Masuk ke aplikasi"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {otpRequired
              ? "Masukkan 6 digit kode yang dikirim melalui @CC3Notif_bot."
              : "Aplikasi ini hanya dapat dibuka oleh akun yang telah ditentukan."}
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit} autoComplete="off">
            {!otpRequired ? (
              <>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={email}
                    autoComplete="off"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Masukkan email"
                    autoFocus
                    aria-label="Email"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Kata sandi</span>
                  <Input
                    className="mt-1.5"
                    type="password"
                    value={password}
                    autoComplete={firstAccess ? "new-password" : "current-password"}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={firstAccess ? "Buat kata sandi" : "Masukkan kata sandi"}
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Kode OTP</span>
              <Input
                className="mt-1.5"
                  value={otp}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  autoFocus
                  aria-label="Kode OTP"
                />
              </label>
            )}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Memproses..." : otpRequired ? "Verifikasi OTP" : firstAccess ? "Aktifkan Akun" : "Masuk"}
            </Button>
          </form>

          {otpRequired ? (
            <div className="mt-3 flex justify-center gap-1">
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 text-xs"
                onClick={async () => {
                  const result = await resendOtp(email);
                  toast[result ? "error" : "success"](result ? "Kode OTP gagal dikirim" : "Kode OTP baru telah dikirim");
                }}
              >
                Kirim ulang kode
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto px-1 text-xs text-muted-foreground"
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
            <Button
              type="button"
              variant="link"
              className="mt-2 h-auto w-full text-xs"
              onClick={() => {
                setFirstAccess((value) => !value);
                setEmail("");
                setPassword("");
              }}
            >
              {firstAccess ? "Sudah punya kata sandi? Masuk" : "Akses pertama kali? Aktifkan akun"}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}
