import { LockKeyhole, Radio } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APPROVED_EMAIL, useAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [firstAccess, setFirstAccess] = useState(false);

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
    if (password.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    setSubmitting(true);
    const result = firstAccess ? await signUp(password) : await signIn(password);
    setSubmitting(false);

    if (!result) {
      toast.success(firstAccess ? "Akun berhasil diaktifkan" : "Berhasil masuk");
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
            {firstAccess ? "Aktifkan akses" : "Masuk ke aplikasi"}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Aplikasi ini hanya dapat dibuka oleh akun yang telah ditentukan.
          </p>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            <label className="block">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Email</span>
              <Input className="mt-1.5" value={APPROVED_EMAIL} readOnly aria-label="Email" />
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
                autoFocus
              />
            </label>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Memproses..." : firstAccess ? "Aktifkan Akun" : "Masuk"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-xs font-semibold text-primary hover:underline"
            onClick={() => {
              setFirstAccess((value) => !value);
              setPassword("");
            }}
          >
            {firstAccess ? "Sudah punya kata sandi? Masuk" : "Akses pertama kali? Aktifkan akun"}
          </button>
        </div>
      </section>
    </main>
  );
}