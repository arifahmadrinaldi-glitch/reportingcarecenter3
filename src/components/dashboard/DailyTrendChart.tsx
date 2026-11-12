import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { TicketRow } from "@/lib/ticket-constants";

export function DailyTrendChart({ tickets }: { tickets: TicketRow[] }) {
  const data = useMemo(() => {
    const map: Record<string, { tanggal: string; open: number; close: number }> = {};

    tickets.forEach((t) => {
      if (t.tanggal_open) {
        const d = new Date(t.tanggal_open);
        if (!isNaN(d.getTime())) {
          const key = String(d.getDate()).padStart(2, "0");
          if (!map[key]) map[key] = { tanggal: key, open: 0, close: 0 };
          map[key].open += 1;
        }
      }
      if (t.tanggal_close) {
        const d = new Date(t.tanggal_close);
        if (!isNaN(d.getTime())) {
          const key = String(d.getDate()).padStart(2, "0");
          if (!map[key]) map[key] = { tanggal: key, open: 0, close: 0 };
          map[key].close += 1;
        }
      }
    });

    return Object.values(map).sort((a, b) => Number(a.tanggal) - Number(b.tanggal));
  }, [tickets]);

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-primary">Tren Harian Tiket (Open vs Close)</h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Perbandingan volume tiket dibuka dan diselesaikan per tanggal
          </p>
        </div>
        <span className="mt-1 h-1 w-6 rounded-full bg-primary/60" />
      </div>

      <div className="mt-4 border-t border-border pt-4">
        {data.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">Belum ada data tiket untuk periode ini.</p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="open" name="Tiket Open" fill="oklch(0.6 0.17 25)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="close" name="Tiket Close" fill="oklch(0.62 0.14 155)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
