import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, TriangleAlert } from "lucide-react";
import { Bar, ComposedChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dashboardMetrics, dailyTicketTrend, formatMttr, ticketOverdue } from "@/lib/dashboard-metrics";
import type { TicketRow } from "@/lib/ticket-constants";
import { LiveDuration } from "@/components/tickets/LiveDuration";
import { StatusBadge } from "@/components/tickets/StatusBadge";

export function DashboardPerformance({
  tickets,
  categoryTickets,
  startDate,
  endDate,
}: {
  tickets: TicketRow[];
  categoryTickets: TicketRow[];
  startDate?: string;
  endDate?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const metrics = useMemo(() => dashboardMetrics(tickets, now ?? 0), [tickets, now]);
    const trend = useMemo(
    () =>
      dailyTicketTrend(categoryTickets, startDate, endDate).map((item) => ({
        ...item,
        total: item.open + item.close,
      })),
    [categoryTickets, startDate, endDate],
  );
    const repeatTroubles = useMemo(() => {
    const map = new Map<
      string,
      {
        location: string;
        customer: string;
        layanan: string;
        count: number;
        latestStatus: string;
        latestOpen: string;
        latestIndikasi: string;
        latestKeterangan: string;
      }
    >();

    for (const t of tickets) {
      const loc = (t.nama_lokasi || "").trim();
      if (!loc || loc === "-" || loc.toLowerCase() === "null") continue;
      const key = loc.toLowerCase();

      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          location: loc,
          customer: t.customer || "—",
          layanan: t.layanan || "—",
          count: 1,
          latestStatus: t.status || "—",
          latestOpen: t.tanggal_open || "",
          latestIndikasi: t.indikasi_gangguan || "",
          latestKeterangan: t.keterangan || "",
        });
      } else {
        existing.count += 1;
        if (existing.customer === "—" && t.customer) existing.customer = t.customer;
        if (existing.layanan === "—" && t.layanan) existing.layanan = t.layanan;

        if (t.tanggal_open && (!existing.latestOpen || t.tanggal_open > existing.latestOpen)) {
          existing.latestOpen = t.tanggal_open;
          existing.latestStatus = t.status || "—";
          existing.latestIndikasi = t.indikasi_gangguan || "";
          existing.latestKeterangan = t.keterangan || "";
        }
      }
    }

    return Array.from(map.values())
      .filter((item) => item.count >= 2)
      .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
  }, [tickets]);
  
  const cards = [
    {
      label: "MTTR",
      value: formatMttr(metrics.mttrMs),
      caption: "Rata-rata durasi tiket close",
      Icon: Clock3,
      tone: "text-info",
      background: "bg-info/10",
    },
    {
      label: "Tingkat Penyelesaian",
      value: `${metrics.completionRate.toFixed(1)}%`,
      caption: `${metrics.closed} close / ${tickets.length} tiket`,
      Icon: CheckCircle2,
      tone: "text-success",
      background: "bg-success/10",
    },
    {
      label: "Tiket Overdue / Kritis",
      value: now === null ? "—" : String(metrics.overdue),
      caption: "Tiket aktif melewati deadline pending",
      Icon: TriangleAlert,
      tone: "text-destructive",
      background: "bg-destructive/10",
    },
    {
      label: "Total Tiket Aktif",
      value: String(metrics.active),
      caption: "Belum Close / Technical Close",
      Icon: Activity,
      tone: "text-primary",
      background: "bg-primary/10",
    },
  ];

  return (
    <section aria-label="Performa tiket" className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, caption, Icon, tone, background }) => (
          <article key={label} className="rounded-lg border border-border bg-card p-4 shadow-panel">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold text-muted-foreground">{label}</h2>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-md ${tone} ${background}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className={`mt-2 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{caption}</p>
          </article>
        ))}
      </div>

      <div className="border-y border-border py-5">
        <h2 className="text-xs font-semibold text-primary">Tren Harian Tiket — Open vs Close</h2>
        <div className="mt-4 h-[280px] min-w-0">
          {trend.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 12, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                  minTickGap={30}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                  stroke="var(--border)"
                />
                <Tooltip
                  formatter={(value, name) => [`${value} tiket`, name]}
                  labelFormatter={(label) => `Tanggal ${label}`}
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar name="Open" dataKey="open" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar name="Close" dataKey="close" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Line
                name="Total Tiket"
                dataKey="total"
                type="monotone"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3.5, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{ r: 5.5, stroke: "var(--background)", strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Belum ada data pada periode ini.
            </div>
          )}
        </div>
      </div>

      <div className="py-1">
        <h2 className="text-xs font-semibold text-primary">Top 5 Tiket Terlama (Aktif)</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-[10px]">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["No.", "Nomor Tiket", "Nama Lokasi", "Layanan", "Status / Keterangan", "Durasi"].map((label) => (
                  <th key={label} className="px-3 py-3 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {metrics.oldest.map((ticket, index) => (
                <tr key={ticket.id} className="bg-card align-top even:bg-muted/30">
                  <td className="px-3 py-3 text-center tabular-nums">{index + 1}</td>
                  <td className="max-w-40 break-words px-3 py-3 font-semibold">
                    {[ticket.tiket_mantools, ticket.tiket_noxis, ticket.tiket_epicor].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="max-w-48 break-words px-3 py-3">{ticket.nama_lokasi || "—"}</td>
                  <td className="px-3 py-3">{ticket.layanan || "—"}</td>
                  <td className="max-w-64 px-3 py-3">
                    <StatusBadge status={ticket.status} />
                    <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                      {ticket.keterangan || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">
                    <LiveDuration
                      openedAt={ticket.tanggal_open}
                      closedAt={ticket.tanggal_close}
                                            fallback={ticket.durasi}
                    />
                    {now !== null && ticketOverdue(ticket, now) ? (
                      <span className="mt-1 inline-flex rounded border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">
                        Overdue
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {!metrics.oldest.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    {now === null ? "Memuat data…" : "Tidak ada tiket aktif dengan waktu open pada periode ini."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    
          <div className="border-t border-border pt-5 pb-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-semibold text-primary">Tiket Gangguan Berulang (Gaul)</h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Site/Lokasi dengan gangguan berulang pada periode yang dipilih
            </p>
          </div>
          {repeatTroubles.length > 0 && (
            <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
              {repeatTroubles.length} Site Terdeteksi
            </span>
          )}
        </div>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] text-[10px]">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                {["No.", "Nama Lokasi / Site", "Customer & Layanan", "Frekuensi Gangguan", "Indikasi / Keterangan Terakhir", "Status Terkini"].map(
                  (label) => (
                    <th key={label} className="px-3 py-3 text-left font-semibold">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {repeatTroubles.map((item, index) => (
                <tr key={item.location} className="bg-card align-top even:bg-muted/30">
                  <td className="px-3 py-3 text-center tabular-nums">{index + 1}</td>
                  <td className="max-w-48 break-words px-3 py-3 font-semibold text-foreground">
                    {item.location}
                  </td>
                  <td className="max-w-48 break-words px-3 py-3">
                    <p className="font-medium text-foreground">{item.customer}</p>
                    <p className="text-[9px] text-muted-foreground">{item.layanan}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      {item.count}x Gangguan
                    </span>
                  </td>
                  <td className="max-w-64 px-3 py-3">
                    {item.latestIndikasi && (
                      <p className="font-medium text-foreground">{item.latestIndikasi}</p>
                    )}
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                      {item.latestKeterangan || "—"}
                    </p>
                    {item.latestOpen && (
                      <p className="mt-1 text-[9px] text-muted-foreground">
                        Terakhir open: {item.latestOpen}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={item.latestStatus} />
                  </td>
                </tr>
              ))}
              {!repeatTroubles.length ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Tidak ada site yang mengalami gangguan berulang pada periode ini.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
