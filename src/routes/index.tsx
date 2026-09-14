import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Ticket as TicketIcon,
} from "lucide-react";
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
import { DailyActivityDashboard } from "@/components/daily/DailyActivityDashboard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BULAN_OPTIONS, type TicketRow } from "@/lib/ticket-constants";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Reporting CC 3" },
      {
        name: "description",
        content: "Ringkasan ticket gangguan: jumlah open, progress, pending dan close beserta ticket terbaru.",
      },
      { property: "og:title", content: "Dashboard — Reporting CC 3" },
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

const ALL = "__all__";

const CHART_COLORS = [
  "oklch(0.55 0.19 258)",
  "oklch(0.68 0.13 210)",
  "oklch(0.62 0.14 155)",
  "oklch(0.75 0.15 75)",
  "oklch(0.62 0.18 300)",
  "oklch(0.6 0.17 25)",
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
  const [bulan, setBulan] = useState(ALL);
  const [tahun, setTahun] = useState(ALL);

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

  const tahunOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tickets
            .map((t) => (t.tanggal_open ? new Date(t.tanggal_open).getFullYear() : null))
            .filter(Boolean) as number[],
        ),
      )
        .sort((a, b) => b - a)
        .map(String),
    [tickets],
  );

  const filtered = useMemo(
    () =>
      tickets.filter((t) => {
        if (bulan === ALL && tahun === ALL) return true;
        if (!t.tanggal_open) return false;
        const date = new Date(t.tanggal_open);
        if (bulan !== ALL && BULAN_OPTIONS[date.getMonth()] !== bulan) return false;
        if (tahun !== ALL && String(date.getFullYear()) !== tahun) return false;
        return true;
      }),
    [tickets, bulan, tahun],
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
      <div className="panel grid gap-4 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Filter Bulan</span>
          <Select value={bulan} onValueChange={setBulan}>
            <SelectTrigger className="mt-1.5 w-full bg-surface text-[11px]">
              <SelectValue>
                <span className="text-muted-foreground">Bulan: </span>
                <span className="font-medium">{bulan === ALL ? "Semua" : bulan}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {BULAN_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="block">
          <span className="text-[9px] font-semibold tracking-widest text-muted-foreground uppercase">Filter Tahun</span>
          <Select value={tahun} onValueChange={setTahun}>
            <SelectTrigger className="mt-1.5 w-full bg-surface text-[11px]">
              <SelectValue>
                <span className="text-muted-foreground">Tahun: </span>
                <span className="font-medium">{tahun === ALL ? "Semua" : tahun}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua</SelectItem>
              {tahunOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <button
          onClick={() => {
            setBulan(ALL);
            setTahun(ALL);
          }}
          className="pb-2 text-[11px] font-semibold text-primary hover:underline"
        >
          Reset filter
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Jumlah Ticket per Customer" subtitle="Urut dari terbanyak, mengikuti filter bulan & tahun">
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
                <XAxis dataKey="name" {...axisProps} />
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

      <DailyActivityDashboard />
    </AppShell>
  );
}
