import { LockKeyhole, Radio } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APPROVED_EMAIL, useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp, verifyOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [firstAccess, setFirstAccess] = useState(false);
  const [otpStep, setOtpStep] = useState(false);

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
    if (email.trim().toLowerCase() !== APPROVED_EMAIL) {
      toast.error("Email tidak memiliki akses");
      return;
    }
    if (otpStep) {
      if (!/^\d{6,8}$/.test(otp.trim())) {
        toast.error("Masukkan kode OTP dari email");
        return;
      }
      setSubmitting(true);
      const result = await verifyOtp(email, otp);
      setSubmitting(false);
      if (!result) toast.success("Verifikasi berhasil");
      else toast.error("Kode OTP salah atau sudah kedaluwarsa");
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
      toast.success(firstAccess ? "Akun berhasil diaktifkan" : "Berhasil masuk");
      return;
    }
    if (result === "otp-required") {
      setOtpStep(true);
      setPassword("");
      toast.success("Kode OTP telah dikirim ke email");
      return;
    }
    if (result === "confirmation-required") {
      toast.success("Periksa email untuk konfirmasi akun");
      setFirstAccess(false);
      setPassword("");
      return;
    }
    toast.error(firstAccess ? "Gagal mengaktifkan akun" : "Email atau kata sandi salah");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-sm">
        <div className="mb-7 flex items-center justify-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Radio className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Reporting CC 3</h1>
            <p className="text-[10px] uppercase text-muted-foreground">Private Operations</p>
          </div>
        </div>

        <div className="panel border-t-4 border-t-primary p-6 shadow-lg">
          <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="size-5" />
          </div>
          <h2 className="mt-4 text-base font-bold text-foreground">
            {otpStep ? "Verifikasi OTP" : firstAccess ? "Aktifkan akses" : "Masuk ke aplikasi"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {otpStep
              ? "Masukkan kode OTP yang dikirim ke email Anda."
              : "Masukkan email dan kata sandi akun yang telah ditentukan."}
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
              <Input
                className="mt-1.5"
                type="email"
                value={email}
                autoComplete="off"
                readOnly={otpStep}
                aria-label="Email"
                placeholder="Masukkan email"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {otpStep ? "Kode OTP" : "Kata sandi"}
              </span>
              <Input
                className="mt-1.5"
                type={otpStep ? "text" : "password"}
                inputMode={otpStep ? "numeric" : undefined}
                value={otpStep ? otp : password}
                autoComplete={otpStep ? "one-time-code" : firstAccess ? "new-password" : "current-password"}
                onChange={(event) => otpStep ? setOtp(event.target.value.replace(/\D/g, "")) : setPassword(event.target.value)}
                placeholder={otpStep ? "Masukkan kode OTP" : firstAccess ? "Buat kata sandi" : "Masukkan kata sandi"}
                autoFocus
              />
            </label>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Memproses..." : otpStep ? "Verifikasi OTP" : firstAccess ? "Aktifkan Akun" : "Masuk"}
            </Button>
          </form>

          <Button
            type="button"
            variant="link"
            className="mt-4 w-full text-center text-xs font-semibold"
            onClick={() => {
              if (otpStep) {
                setOtpStep(false);
                setOtp("");
                setEmail("");
                return;
              }
              setFirstAccess((value) => !value);
              setEmail("");
              setPassword("");
            }}
          >
            {otpStep ? "Kembali ke login" : firstAccess ? "Sudah punya kata sandi? Masuk" : "Akses pertama kali? Aktifkan akun"}
          </Button>
        </div>
      </section>
    </main>
  );
}