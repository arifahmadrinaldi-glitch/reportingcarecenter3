import { Lock, LogOut, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAccess } from "@/lib/app-access";

/** Role badge + admin login/logout + app lock button for the header. */
export function AccessControls() {
  const { isAdmin, loginAdmin, logoutAdmin, lockApp } = useAccess();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  const submit = () => {
    if (loginAdmin(password)) {
      toast.success("Login super user berhasil", {
        description: "Menu hapus & rollback sekarang aktif.",
      });
      setPassword("");
      setOpen(false);
    } else {
      toast.error("Password salah");
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase sm:inline-flex ${
          isAdmin
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isAdmin ? <ShieldCheck className="size-3" /> : <ShieldQuestion className="size-3" />}
        {isAdmin ? "Super User" : "User Biasa"}
      </span>

      {isAdmin ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => {
            logoutAdmin();
            toast.success("Keluar dari mode super user");
          }}
        >
          <LogOut className="size-3.5" /> Keluar Admin
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
          <ShieldCheck className="size-3.5" /> Login Admin
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={lockApp}
        aria-label="Kunci aplikasi"
      >
        <Lock className="size-3.5" /> Kunci
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Login Super User</DialogTitle>
            <DialogDescription>
              Masukkan password admin untuk membuka menu hapus dan rollback data.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={password}
            autoFocus
            placeholder="Password admin"
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={submit}>Masuk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Full-screen lock overlay shown until the lock password is entered. */
export function LockScreen() {
  const { locked, ready, unlockApp } = useAccess();
  const [password, setPassword] = useState("");

  if (!ready || !locked) return null;

  const submit = () => {
    if (unlockApp(password)) {
      setPassword("");
      toast.success("Aplikasi terbuka");
    } else {
      toast.error("Password kunci salah");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="panel w-full max-w-sm p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="size-6" />
        </span>
        <h2 className="mt-4 text-base font-bold text-foreground">Aplikasi Terkunci</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Masukkan password kunci untuk melanjutkan.
        </p>
        <Input
          type="password"
          value={password}
          autoFocus
          placeholder="Password kunci"
          className="mt-4"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <Button className="mt-3 w-full" onClick={submit}>
          Buka Aplikasi
        </Button>
      </div>
    </div>
  );
}
