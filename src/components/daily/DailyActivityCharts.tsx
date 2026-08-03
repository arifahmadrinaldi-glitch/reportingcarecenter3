import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { DailyActivityRow } from "@/lib/daily-activity-constants";

const COLORS = [
  "oklch(0.55 0.19 258)",
  "oklch(0.68 0.13 210)",
  "oklch(0.62 0.14 155)",
  "oklch(0.75 0.15 75)",
  "oklch(0.62 0.18 300)",
  "oklch(0.6 0.17 25)",
];

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

const groupBy = (rows: DailyActivityRow[], key: keyof DailyActivityRow) => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const value = (row[key] as string | null) ?? "";
    if (!value) return;
    map.set(value, (map.get(value) ?? 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
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

function HorizontalBars({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} {...axisProps} />
          <YAxis type="category" dataKey="name" width={150} {...axisProps} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyActivityCharts({ rows }: { rows: DailyActivityRow[] }) {
  const perProduct = groupBy(rows, "product").slice(0, 10);
  const perOnDuty = groupBy(rows, "on_duty");
  const perToDo = groupBy(rows, "to_do");
  const perRfo = groupBy(rows, "rfo_general").slice(0, 10);
  const total = rows.length;

  return (
    <section className="mt-4">
      <h2 className="mb-3 text-sm font-bold">Dashboard Analisis Daily Activity</h2>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Top Product / Layanan" subtitle="Aktivitas terbanyak berdasarkan kolom Product">
          <HorizontalBars data={perProduct} />
        </Panel>

        <Panel title="Total Aktivitas On Duty" subtitle="Jumlah activity per petugas On Duty">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perOnDuty} margin={{ left: 8, right: 16, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={26}>
                  {perOnDuty.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="To Do" subtitle="Proporsi jenis tindakan pada kolom To Do">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={perToDo.length ? perToDo : [{ name: "Kosong", value: 1 }]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {(perToDo.length ? perToDo : [{ name: "Kosong", value: 1 }]).map(
                      (entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={perToDo.length ? COLORS[index % COLORS.length] : "var(--muted)"}
                        />
                      ),
                    )}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{total}</span>
                <span className="text-[9px] tracking-widest text-muted-foreground uppercase">
                  Activity
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {perToDo.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-[10px]"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="font-semibold">{item.value}</span>
                  <span className="text-muted-foreground">
                    {total ? Math.round((item.value / total) * 100) : 0}%
                  </span>
                </div>
              ))}
              {perToDo.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada data.</p>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel title="Top 10 RFO General" subtitle="RFO General yang paling sering muncul">
          <HorizontalBars data={perRfo} />
        </Panel>
      </div>
    </section>
  );
}
