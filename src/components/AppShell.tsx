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
import { toast } from "sonner";

import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, LayoutGrid, LogOut, Radio, Satellite, Ticket, Tv } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AccessControls } from "@/components/AccessControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

const navItems: any[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/tickets", label: "Daftar Ticket", icon: Ticket },
  { to: "/daily-checklist", label: "Daily Checklist", icon: ClipboardList },
  { to: "/jadwal", label: "Jadwal", icon: CalendarDays },
  { to: "/wallboard", label: "Wallboard TV", icon: Tv },
];

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const expanded = hovered;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, loginAdmin, logoutAdmin } = useAccess();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [password, setPassword] = useState("");

  const handleSwitchAdmin = () => {
    if (loginAdmin(password)) {
      toast.success("Berhasil beralih ke Super User");
      setPassword("");
      setDialogOpen(false);
    } else {
      toast.error("Kode / password salah");
    }
  };

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    await navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`hidden shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-out lg:flex ${
          expanded ? "w-56" : "w-16"
        }`}
      >
                <button
          type="button"
          onClick={() => {
            setPassword("");
            setDialogOpen(true);
          }}
          title="Klik untuk opsi Super User"
          className={`flex items-center gap-3 py-5 text-left transition-colors hover:bg-sidebar-accent/50 ${
            expanded ? "px-4" : "justify-center px-2"
          }`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Radio className="size-5" />
          </span>
          {expanded ? (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold text-sidebar-accent-foreground">Reporting CC</span>
              <span className="block truncate text-[11px] text-sidebar-foreground/70">Operations Dashboard</span>
            </span>
          ) : null}
        </button>

        <nav className={`flex flex-col gap-1 py-2 ${expanded ? "px-3" : "px-2"}`}>
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              title={label}
              className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground ${
                expanded ? "px-3" : "justify-center px-0"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {expanded ? <span className="truncate">{label}</span> : null}
            </Link>
          ))}
        </nav>
        <div className={`mt-auto py-4 ${expanded ? "px-4" : "px-2"}`}>
          {expanded ? (
            <p className="px-3 text-[11px] leading-snug text-sidebar-foreground/50">
              Realtime aktif · data tersinkron otomatis
            </p>
          ) : null}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3.5">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-foreground">{title}</h1>
            <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {actions}
            <nav className="flex gap-1 lg:hidden">
              {navItems.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  aria-label={label}
                  title={label}
                  activeOptions={{ exact: to === "/" }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                >
                  <Icon className="size-4" />
                </Link>
              ))}
            </nav>
            <AccessControls />
            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
              aria-label="Keluar dari aplikasi"
              title="Keluar"
            >
              <LogOut className="size-4" />
            </Button>
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              {isAdmin ? "Mode Super User Aktif" : "Switch to Super User"}
            </DialogTitle>
            <DialogDescription>
              {isAdmin
                ? "Saat ini Anda login sebagai Super User dengan hak akses penuh."
                : "Masukkan kode / password admin untuk beralih ke mode Super User."}
            </DialogDescription>
          </DialogHeader>

          {!isAdmin && (
            <Input
              type="password"
              value={password}
              autoFocus
              placeholder="Masukkan kode admin"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSwitchAdmin();
              }}
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {isAdmin ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => {logoutAdmin();
                    setDialogOpen(false);
                    toast.success("Kembali ke mode User Biasa");
                  }}
                >
                  Keluar Super User
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Tutup
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSwitchAdmin}>Masuk</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
