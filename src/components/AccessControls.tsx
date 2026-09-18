import { LogOut, ShieldCheck, ShieldQuestion } from "lucide-react";
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
  const { isAdmin, loginAdmin, logoutAdmin } = useAccess();
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

