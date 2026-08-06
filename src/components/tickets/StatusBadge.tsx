import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/ticket-constants";

const toneClass = {
  success: "border-success/30 bg-success/12 text-success",
  warning: "border-warning/40 bg-warning/15 text-warning",
  orange: "border-status-orange/35 bg-status-orange/15 text-status-orange",
  purple: "border-status-purple/35 bg-status-purple/15 text-status-purple",
  brown: "border-status-brown/35 bg-status-brown/15 text-status-brown",
  danger: "border-status-red/35 bg-status-red/15 text-status-red",
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