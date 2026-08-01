import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/ticket-constants";

const toneClass = {
  success: "border-success/30 bg-success/12 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning",
  info: "border-info/30 bg-info/12 text-info",
  muted: "border-border bg-muted text-muted-foreground",
} as const;

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        toneClass[statusTone(status)],
      )}
    >
      {status}
    </span>
  );
}