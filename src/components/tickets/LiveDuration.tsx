import { useEffect, useState } from "react";

import { computeDurasi } from "@/lib/ticket-constants";

export function LiveDuration({
  openedAt,
  closedAt,
  fallback,
}: {
  openedAt: string | null;
  closedAt: string | null;
  fallback?: string | null;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (closedAt || !openedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [openedAt, closedAt]);

  const duration = computeDurasi(openedAt, closedAt);
  void now;

  return <>{duration || fallback || "-"}</>;
}