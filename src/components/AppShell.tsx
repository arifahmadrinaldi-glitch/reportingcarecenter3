import { Link } from "@tanstack/react-router";
import { LayoutGrid, Radio, Ticket } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/tickets", label: "Daftar Ticket", icon: Ticket },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Radio className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-sidebar-accent-foreground">
              Ticket Care Center 3
            </span>
            <span className="block text-[11px] text-sidebar-foreground/70">
              Operations Dashboard
            </span>
          </span>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-4 py-4 text-[11px] leading-snug text-sidebar-foreground/50">
          Realtime aktif · data tersinkron otomatis
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-5 py-3.5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-foreground">{title}</h1>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1 lg:hidden">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === "/" }}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}