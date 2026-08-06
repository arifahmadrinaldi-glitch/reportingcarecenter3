import { cn } from "@/lib/utils";
import { jenisShort, jenisTone } from "@/lib/ticket-constants";

const toneClass = {
  danger: "border-status-red/35 bg-status-red/15 text-status-red",
  success: "border-success/30 bg-success/12 text-success",
  muted: "border-border bg-muted text-muted-foreground",
} as const;

export function JenisBadge({ jenis }: { jenis: string | null }) {
  if (!jenis) return <span>-</span>;
  return (
    <span
      title={jenis}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        toneClass[jenisTone(jenis)],
      )}
    >
      {jenisShort(jenis)}
    </span>
  );
}
