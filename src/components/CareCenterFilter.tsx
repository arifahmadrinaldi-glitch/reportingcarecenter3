import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CareCenterSelection } from "@/lib/care-center-filter";

export function CareCenterFilter({ value, onChange, id }: {
  value: CareCenterSelection;
  onChange: (value: CareCenterSelection) => void;
  id: string;
}) {
  return (
    <div className="mb-4 max-w-sm">
      <label htmlFor={id} className="text-[9px] font-semibold text-muted-foreground uppercase">Care Center</label>
      <Select value={value} onValueChange={(next) => {
        if (next === "all" || next === "vsat" || next === "non-vsat") onChange(next);
      }}>
        <SelectTrigger id={id} aria-label="Care Center" className="mt-1.5 w-full bg-surface text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua</SelectItem>
          <SelectItem value="vsat">Care Center Vsat</SelectItem>
          <SelectItem value="non-vsat">Care Center Non-Vsat</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}