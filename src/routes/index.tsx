import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket as TicketIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/AppShell";
import { CareCenterFilter } from "@/components/CareCenterFilter";
import { DailyActivityDashboard } from "@/components/daily/DailyActivityDashboard";
import { DashboardPerformance } from "@/components/DashboardPerformance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { type TicketRow } from "@/lib/ticket-constants";
import { filterCareCenterRows, type CareCenterSelection } from "@/lib/care-center-filter";
import { matchesDateRange } from "@/lib/dashboard-metrics";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Reporting CC 3" },
      {
        name: "description",
        content: "Dashboard Reporting CC 3: MTTR, tingkat penyelesaian, tiket overdue, tren harian Open vs Close dan tiket aktif terlama.",
      },
      { property: "og:title", content: "Dashboard — Reporting CC 3" },
      {
        property: "og:description",
        content: "Pantau performa Care Center Vsat dan Non-Vsat, tren tiket harian dan lima tiket aktif terlama sesuai periode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CHART_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--success)",
  "var(--warning)",
  "var(--status-purple)",
  "var(--destructive)",
];

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-primary">{title}</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <span className="mt-1 h-1 w-6 rounded-full bg-primary/60" />
      </div>
      <div className="mt-4 border-t border-border pt-4">{children}</div>
    </div>
  );
}

function DonutLegend({ data, total }: { data: { name: string; value: number }[]; total: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      {data.map((item, index) => (
        <div key={item.name} className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-[10px]">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          <span className="font-semibold">{item.value}</span>
          <span className="text-[10px] text-muted-foreground">
            {total ? Math.round((item.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
      {data.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada data.</p> : null}
    </div>
  );
}

function Donut({
  data,
  centerValue,
  centerLabel,
}: {
  data: { name: string; value: number }[];
  centerValue: number;
  centerLabel: string;
}) {
  return (
    <div className="relative h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.length ? data : [{ name: "Kosong", value: 1 }]}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            stroke="none"
          >
            {(data.length ? data : [{ name: "Kosong", value: 1 }]).map((entry, index) => (
              <Cell key={entry.name} fill={data.length ? CHART_COLORS[index % CHART_COLORS.length] : "var(--muted)"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold">{centerValue}</span>
        <span className="text-[9px] tracking-widest text-muted-foreground uppercase">{centerLabel}</span>
      </div>
    </div>
  );
}

function Index() {
  const [category, setCategory] = useState<CareCenterSelection>("non-vsat");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [jenisTicket, setJenisTicket] = useState<string>("all");

  const { data: tickets = [], isPending, isError } = useQuery({
    queryKey: ["tickets", "active"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows: TicketRow[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase
          .from("tickets")
          .select("*")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as TicketRow[]));
        if (!data || data.length < pageSize) return rows;
      }
    },
  });

  const categoryTickets = useMemo(() => {
    const base = filterCareCenterRows(tickets, category, (ticket) => ticket.layanan);
    if (jenisTicket !== "all") {
      return base.filter((t) => t.jenis_ticket === jenisTicket);
    }
    return base;
  }, [tickets, category, jenisTicket]);

  const filtered = useMemo(
    () =>
      categoryTickets.filter((t) =>
        matchesDateRange(t.tanggal_open, startDate, endDate),
      ),
    [categoryTickets, startDate, endDate],
  );

  const count = (predicate: (t: TicketRow) => boolean) => filtered.filter(predicate).length;
  const groupBy = (key: keyof TicketRow) => {
    const map = new Map<string, number>();
    filtered.forEach((t) => {
      const value = (t[key] as string | null) ?? "";
      if (!value) return;
      map.set(value, (map.get(value) ?? 0) + 1);
    });
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  const perCustomer = groupBy("customer");
  const perRegional = groupBy("regional").sort((a, b) => a.name.localeCompare(b.name));
  const totalRegional = perRegional.reduce((sum, item) => sum + item.value, 0);
  const perOpenBy = groupBy("open_by").sort((a, b) => a.name.localeCompare(b.name));
  const jenisData = [
    {
      name: "Corrective Maintenance",
          value: count((t) => t.jenis_ticket === "Corrective Maintenance"),
    },
    {
      name: "Preventive Maintenance",
      value: count((t) => t.jenis_ticket === "Preventive Maintenance"),
    },
  ].filter((item) => item.value > 0);

  const axisProps = {
    stroke: "var(--muted-foreground)",
    tick: { fontSize: 9, fill: "var(--muted-foreground)" },
  } as const;
  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 11,
    color: "var(--popover-foreground)",
  };

  return (
    <AppShell
      title="Dashboard Analisis"
      subtitle="Ringkasan performa penanganan ticket gangguan dan Daily Activity"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/tickets">
            <TicketIcon className="size-4" /> Daftar Ticket
          </Link>
        </Button>
      }
    >
      <div className="panel p-4">
        <CareCenterFilter
          id="ticket-care-center"
          value={category}
          onChange={(next) => {
            setCategory(next);
            setStartDate("");
            setEndDate("");
          }}
        />
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
          <div className="block">
            <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
              Jenis Tiket
            </span>
            <Select value={jenisTicket} onValueChange={setJenisTicket}>
              <SelectTrigger aria-label="Jenis Tiket" className="mt-1.5 w-full bg-surface text-xs">
                <SelectValue placeholder="Pilih Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="Corrective Maintenance">Corrective Maintenance</SelectItem>
                <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="block">
            <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
              Dari Tanggal
            </span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 w-full bg-surface text-xs"
            />
          </label>
          <label className="block">
            <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">
              Sampai Tanggal
            </span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5 w-full bg-surface text-xs"
            />
          </label>
          <Button
            variant="link"
            disabled={!startDate && !endDate && jenisTicket === "all"}
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setJenisTicket("all");
            }}
            className="text-[11px] font-semibold"
          >
            Reset filter
          </Button>
        </div>
      </div>

      {isError ? (
        <p role="alert" className="mt-4 text-xs text-destructive">
          Data tiket gagal dimuat. Silakan coba kembali.
        </p>
      ) : isPending ? (
        <p role="status" className="mt-4 text-xs text-muted-foreground">
          Memuat performa tiket…
        </p>
      ) : (
        <DashboardPerformance
          tickets={filtered}
          categoryTickets={categoryTickets}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Jumlah Ticket per Customer" subtitle="Urut dari terbanyak, mengikuti filter tanggal">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perCustomer} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="name" width={110} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                  {perCustomer.map((entry, index) => (
                    <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Perbandingan Jenis Ticket" subtitle="Corrective vs Preventive Maintenance">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <Donut data={jenisData} centerValue={filtered.length} centerLabel="Ticket" />
            <DonutLegend data={jenisData} total={filtered.length} />
          </div>
        </Panel>

        <Panel title="Produktivitas Open Tiket" subtitle="Jumlah ticket yang dibuka per petugas (Open By)">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perOpenBy} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={60} {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--card)", stroke: CHART_COLORS[0], strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Distribusi Ticket berdasarkan Regional" subtitle="Proporsi per regional">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <Donut data={perRegional} centerValue={totalRegional} centerLabel="Regional" />
            <DonutLegend data={perRegional} total={totalRegional} />
          </div>
        </Panel>
      </div>

      <DailyActivityDashboard key={category} category={category} />
    </AppShell>
  );
}
