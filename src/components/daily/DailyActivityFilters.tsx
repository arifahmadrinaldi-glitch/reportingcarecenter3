import { MultiSelect } from "@/components/ui/multi-select";
import {
  BULAN_LIST,
  DAILY_DROPDOWNS,
  emptyDailyFilters,
  type DailyFilters,
} from "@/lib/daily-activity-constants";

export function DailyActivityFilters({
  filters,
  onChange,
  tahunOptions,
}: {
  filters: DailyFilters;
  onChange: (filters: DailyFilters) => void;
  tahunOptions: string[];
}) {
  const set = (key: keyof DailyFilters, values: string[]) =>
    onChange({ ...filters, [key]: values });

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <MultiSelect label="Bulan" values={filters.bulan} options={BULAN_LIST} onChange={(v) => set("bulan", v)} />
      <MultiSelect label="Tahun" values={filters.tahun} options={tahunOptions} onChange={(v) => set("tahun", v)} />
      <MultiSelect
        label="On Duty"
        values={filters.on_duty}
        options={DAILY_DROPDOWNS.on_duty}
        onChange={(v) => set("on_duty", v)}
      />
      <MultiSelect
        label="Shift"
        values={filters.shift}
        options={DAILY_DROPDOWNS.shift}
        onChange={(v) => set("shift", v)}
      />
      <MultiSelect
        label="Source Info"
        values={filters.source_information}
        options={DAILY_DROPDOWNS.source_information}
        onChange={(v) => set("source_information", v)}
      />
      <MultiSelect
        label="To Do"
        values={filters.to_do}
        options={DAILY_DROPDOWNS.to_do}
        onChange={(v) => set("to_do", v)}
      />
      <MultiSelect
        label="RFO General"
        values={filters.rfo_general}
        options={DAILY_DROPDOWNS.rfo_general}
        onChange={(v) => set("rfo_general", v)}
      />
      <button
        type="button"
        onClick={() => onChange(emptyDailyFilters())}
        className="justify-self-start text-[11px] font-semibold text-primary hover:underline"
      >
        Reset filter
      </button>
    </div>
  );
}