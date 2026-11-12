import { useMemo } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { computeDurasi, parsePendingDeadline, type TicketRow } from "@/lib/ticket-constants";

export function TopAgingTickets({ tickets }: { tickets: TicketRow[] }) {
  const agingTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status !== "Close" && t.tanggal_open)
      .map((t) => {
        const openTime = new Date(t.tanggal_open!).getTime();
        const durationMs = isNaN(openTime) ? 0 : Date.now() - openTime;
        return { ticket: t, durationMs };
      })
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5);
  }, [tickets]);

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-primary">Top 5 Tiket Terlama (Aktif)</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Tiket yang belum close dengan durasi berjalan paling lama
          </p>
        </div>
        <span className="mt-1 h-1 w-6 rounded-full bg-primary/60" />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {agingTickets.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Tidak ada tiket aktif.</p>
        ) : (
          <div className="space-y-2">
            {agingTickets.map(({ ticket }) => {
              const durasiStr = computeDurasi(ticket.tanggal_open, ticket.tanggal_close);
              const dl = parsePendingDeadline(ticket.keterangan);
              const isOverdue = dl && Date.now() > dl.getTime();

              return (
                <div
                  key={ticket.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-primary">{ticket.nama_lokasi}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {ticket.no_ticket || "Tanpa No"}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          <AlertCircle className="size-3" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {ticket.layanan} • {ticket.status} {ticket.keterangan ? `— ${ticket.keterangan}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500 shrink-0">
                    <Clock className="size-3.5" />
                    <span>{durasiStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
