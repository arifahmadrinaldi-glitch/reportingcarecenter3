import { cn } from "@/lib/utils";
import { jenisShort, jenisTone } from "@/lib/ticket-constants";

const toneClass = {
  danger: "text-status-red",
  success: "text-success",
  muted: "text-muted-foreground",
} as const;

export function JenisBadge({ jenis }: { jenis: string | null }) {
  if (!jenis) return <span>-</span>;
  return (
    <span
      title={jenis}
      className={cn(
        "inline-flex items-center whitespace-nowrap text-[11px] font-semibold",
        toneClass[jenisTone(jenis)],
      )}
    >
      {jenisShort(jenis)}
    </span>
  );
}
