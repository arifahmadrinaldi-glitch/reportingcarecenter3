import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketCategory } from "@/lib/ticket-constants";

export function CareCenterFilter({ value, onChange, id }: {
  value: TicketCategory;
  onChange: (value: TicketCategory) => void;
  id: string;
}) {
  return (
    <div className="mb-4 max-w-sm">
      <label htmlFor={id} className="text-[9px] font-semibold text-muted-foreground uppercase">Care Center</label>
      <Select value={value} onValueChange={(next) => {
        if (next === "vsat" || next === "non-vsat") onChange(next);
      }}>
        <SelectTrigger id={id} aria-label={id === "ticket-care-center" ? "Care Center Ticket" : "Care Center Daily Activity"} className="mt-1.5 w-full bg-surface text-[11px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="vsat">Care Center Vsat</SelectItem>
          <SelectItem value="non-vsat">Care Center Non-Vsat</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}