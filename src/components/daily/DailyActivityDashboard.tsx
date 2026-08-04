import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DailyActivityCharts } from "@/components/daily/DailyActivityCharts";
import { DailyActivityFilters } from "@/components/daily/DailyActivityFilters";
import { supabase } from "@/integrations/supabase/client";
import {
  emptyDailyFilters,
  filterDailyRows,
  tahunOptionsFrom,
  type DailyActivityRow,
} from "@/lib/daily-activity-constants";

export function DailyActivityDashboard() {
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

  const tahunOptions = useMemo(() => tahunOptionsFrom(rows), [rows]);
  const filtered = useMemo(() => filterDailyRows(rows, filters), [rows, filters]);

  return (
    <section className="mt-6">
      <div className="panel p-4">
        <DailyActivityFilters
          filters={filters}
          onChange={setFilters}
          tahunOptions={tahunOptions}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          Menampilkan {filtered.length} dari {rows.length} activity
        </p>
      </div>
      <DailyActivityCharts rows={filtered} />
    </section>
  );
}