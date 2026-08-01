import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, CheckCircle2, Clock, PauseCircle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, type TicketRow } from "@/lib/ticket-constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ticket Care Center 3" },
      {
        name: "description",
        content:
          "Ringkasan ticket gangguan: jumlah open, progress, pending dan close beserta ticket terbaru.",
      },
      { property: "og:title", content: "Dashboard — Ticket Care Center 3" },
      {
        property: "og:description",
        content: "Ringkasan status ticket gangguan dan aktivitas terbaru dalam satu halaman.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  const count = (predicate: (t: TicketRow) => boolean) => tickets.filter(predicate).length;

  const stats = [
    { label: "Total Ticket", value: tickets.length, icon: ClipboardList },
    { label: "Open / Progress", value: count((t) => ["Open", "Progress"].includes(t.status)), icon: Clock },
    { label: "Pending", value: count((t) => t.status.startsWith("Pending")), icon: PauseCircle },
    { label: "Close", value: count((t) => t.status === "Close"), icon: CheckCircle2 },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Ringkasan ticket gangguan">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <stat.icon className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="panel mt-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Ticket Terbaru</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/tickets">
              Lihat semua <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {tickets.slice(0, 6).map((ticket) => (
            <div key={ticket.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <StatusBadge status={ticket.status} />
              <span className="font-medium">{ticket.customer ?? "-"}</span>
              <span className="text-muted-foreground">{ticket.nama_lokasi ?? "-"}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDateTime(ticket.tanggal_open)}
              </span>
            </div>
          ))}
          {tickets.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Belum ada ticket.</p>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
