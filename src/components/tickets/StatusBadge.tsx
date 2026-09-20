import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/ticket-constants";

const toneClass = {
  success: "text-success",
  warning: "text-warning",
  orange: "text-status-orange",
  purple: "text-status-purple",
  brown: "text-status-brown",
  danger: "text-status-red",
  info: "text-info",
  muted: "text-muted-foreground",
  teal: "text-teal-600",
} as const;

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap text-[11px] font-semibold",
        toneClass[statusTone(status)],
      )}
    >
      {status}
    </span>
  );
}
