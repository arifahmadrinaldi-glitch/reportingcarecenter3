import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DailyActivityCharts } from "@/components/daily/DailyActivityCharts";
import { DailyActivityFilters } from "@/components/daily/DailyActivityFilters";
import { CareCenterFilter } from "@/components/CareCenterFilter";
import type { TicketCategory } from "@/lib/ticket-constants";
import { supabase } from "@/integrations/supabase/client";
import {
  emptyDailyFilters,
  dailyActivityCategory,
  filterDailyRows,
  tahunOptionsFrom,
  type DailyActivityRow,
} from "@/lib/daily-activity-constants";

export function DailyActivityDashboard() {
  const [category, setCategory] = useState<TicketCategory>("non-vsat");
  const [filters, setFilters] = useState(emptyDailyFilters);

  const { data: rows = [] } = useQuery({
    queryKey: ["daily-activities", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyActivityRow[];
    },
  });

  const categoryRows = useMemo(() => rows.filter((row) => dailyActivityCategory(row) === category), [rows, category]);
  const tahunOptions = useMemo(() => tahunOptionsFrom(categoryRows), [categoryRows]);
  const onDutyOptions = useMemo(() => Array.from(new Set(categoryRows.map((row) => row.on_duty).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b)), [categoryRows]);
  const filtered = useMemo(() => filterDailyRows(categoryRows, filters), [categoryRows, filters]);

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-bold">Dashboard Analisis Daily Activity</h2>
      <div className="panel p-4">
        <CareCenterFilter id="daily-care-center" value={category} onChange={(next) => {
          setCategory(next);
          setFilters(emptyDailyFilters());
        }} />
        <DailyActivityFilters
          filters={filters}
          onChange={setFilters}
          tahunOptions={tahunOptions}
          onDutyOptions={onDutyOptions}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Menampilkan {filtered.length} dari {categoryRows.length} activity
        </p>
      </div>
      <DailyActivityCharts rows={filtered} showTitle={false} />
    </section>
  );
}