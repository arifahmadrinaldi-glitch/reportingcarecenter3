import { useEffect, useState } from "react";
import { computeDurasi, formatTimeDiff, parsePendingDeadline } from "@/lib/ticket-constants";

export function LiveDuration({
  openedAt,
  closedAt,
  fallback,
  keterangan,
  status,
}: {
  openedAt: string | null;
  closedAt: string | null;
  fallback?: string | null;
  keterangan?: string | null;
  status?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (closedAt || !openedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [openedAt, closedAt]);

  const duration = computeDurasi(openedAt, closedAt);
  const deadline = !closedAt && status !== "Close" ? parsePendingDeadline(keterangan ?? null) : null;

  const remainingMs = deadline ? deadline.getTime() - now : null;
  const isOverdue = remainingMs !== null && remainingMs <= 0;
  const isNearLimit = remainingMs !== null && remainingMs > 0 && remainingMs <= 10 * 60 * 1000;

  return (
    <div className="flex flex-col gap-0.5">
      <span>{duration || fallback || "-"}</span>
      {isOverdue ? (
        <span className="inline-flex w-fit items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive border border-destructive/30 animate-pulse">
          ⚠️ Overdue ({formatTimeDiff(remainingMs)})
        </span>
      ) : isNearLimit ? (
        <span className="inline-flex w-fit items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-bold text-destructive border border-destructive/30 animate-pulse">
          ⚠️ Kritis (Sisa {formatTimeDiff(remainingMs)})
        </span>
      ) : null}
    </div>
  );
}
