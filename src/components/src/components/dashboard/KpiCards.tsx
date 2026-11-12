import { useMemo } from "react";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { parsePendingDeadline, formatTimeDiff, type TicketRow } from "@/lib/ticket-constants";

export function KpiCards({ tickets }: { tickets: TicketRow[] }) {
  const now = Date.now();

  const metrics = useMemo(() => {
    const closed = tickets.filter((t) => t.tanggal_open && t.tanggal_close);
    const totalMs = closed.reduce(
      (acc, t) => acc + Math.max(0, new Date(t.tanggal_close!).getTime() - new Date(t.tanggal_open!).getTime()),
      0,
    );
    const active = tickets.filter((t) => t.status !== "Close");
    const overdue = active.filter((t) => {
      const dl = parsePendingDeadline(t.keterangan);
      return dl ? now > dl.getTime() : false;
    });

    return {
      mttr: closed.length ? formatTimeDiff(totalMs / closed.length) : "-",
      closed: closed.length,
      active: active.length,
      overdue: overdue.length,
      rate: tickets.length ? Math.round((closed.length / tickets.length) * 100) : 0,
      total: tickets.length,
    };
  }, [tickets, now]);

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Rata-rata Durasi (MTTR)</p>
          <p className="mt-1 text-lg font-bold">{metrics.mttr}</p>
          <p className="text-[9px] text-muted-foreground">{metrics.closed} tiket close</p>
        </div>
        <Clock className="size-8 text-primary/70" />
      </div>

      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tingkat Selesai</p>
          <p className="mt-1 text-lg font-bold text-success">{metrics.rate}%</p>
          <p className="text-[9px] text-muted-foreground">{metrics.closed} dari {metrics.total} tiket</p>
        </div>
        <CheckCircle2 className="size-8 text-success/70" />
      </div>

      <div className={`panel flex items-center justify-between p-4 ${metrics.overdue > 0 ? "border-destructive/40 bg-destructive/5" : ""}`}>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tiket Overdue / Kritis</p>
          <p className={`mt-1 text-lg font-bold ${metrics.overdue > 0 ? "text-destructive" : ""}`}>{metrics.overdue}</p>
          <p className="text-[9px] text-muted-foreground">Lewat target pending</p>
        </div>
        <AlertTriangle className={`size-8 ${metrics.overdue > 0 ? "text-destructive" : "text-muted-foreground/40"}`} />
      </div>

      <div className="panel flex items-center justify-between p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tiket Aktif Berjalan</p>
          <p className="mt-1 text-lg font-bold text-primary">{metrics.active}</p>
          <p className="text-[9px] text-muted-foreground">Perlu penanganan</p>
        </div>
        <TrendingUp className="size-8 text-primary/70" />
      </div>
    </div>
  );
}
