import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Maximize2,
  Minimize2,
  Radio,
  RefreshCw,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { currentShift, officersOn, SHIFT_INFO } from "@/lib/handover";
import { type ScheduleData } from "@/lib/schedule";
import {
  formatDateTime,
  formatTimeDiff,
  parsePendingDeadline,
  statusTone,
  ticketCategory,
  type TicketRow,
} from "@/lib/ticket-constants";

export const Route = createFileRoute("/wallboard")({
  head: () => ({
    meta: [
      { title: "NOC Wallboard — Care Center Telkomsat" },
      { name: "description", content: "Mode layar penuh pemantauan tiket real-time untuk monitor NOC." },
    ],
  }),
  component: WallboardPage,
});

export function WallboardPage() {
  const [time, setTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Jam digital live per detik
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor status fullscreen
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Ambil tiket aktif (auto refresh 30 detik)
  const { data: tickets = [], refetch, isFetching } = useQuery({
    queryKey: ["tickets", "wallboard"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .is("deleted_at", null)
        .not("status", "in", '("Close","Technical Close")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  // Ambil jadwal bulan ini untuk deteksi petugas On-Duty
  const period = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}`;
  const { data: scheduleData } = useQuery({
    queryKey: ["schedule", period],
    queryFn: async () => {
      const { data } = await supabase
        .from("schedules")
        .select("data")
        .eq("period", period)
        .maybeSingle();
      return (data?.data as ScheduleData) ?? undefined;
    },
  });

  const shiftSlot = useMemo(() => currentShift(time), [time]);
  const onDutyOfficers = useMemo(
    () => officersOn(scheduleData, shiftSlot),
    [scheduleData, shiftSlot]
  );

  // Pisahkan VSAT dan Non-VSAT
  const vsatTickets = useMemo(
    () => tickets.filter((t) =>
      ">
                Care Center VSAT
              </h2>
            </div>
            <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-xs font-bold text-cyan-300">
              {vsatTickets.length} Tiket
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
            {vsatTickets.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
                Nihil tiket aktif untuk Care Center VSAT
              </div>
            ) : (
              vsatTickets.map((t) => <TicketCard key={t.id} ticket={t} now={time} toneBadge={toneBadge} />)
            )}
          </div>
        </section>

        {/* Kolom Non-VSAT */}
        <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-indigo-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-indigo-300">
                Care Center Non-VSAT
              </h2>
            </div>
            <span className="rounded-full bg-indigo-950 px-2 py-0.5 text-xs font-bold text-indigo-300">
              {nonVsatTickets.length} Tiket
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto">
            {nonVsatTickets.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-slate-500">
                Nihil tiket aktif untuk Care Center Non-VSAT
              </div>
            ) : (
              nonVsatTickets.map((t) => <TicketCard key={t.id} ticket={t} now={time} toneBadge={toneBadge} />)
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  now,
  toneBadge,
}: {
  ticket: TicketRow;
  now: Date;
  toneBadge: (status: string) => string;
}) {
  const deadline = parsePendingDeadline(ticket.keterangan);
  const diffMs = deadline ? deadline.getTime() - now.getTime() : null;
  const isOverdue = diffMs !== null && diffMs < 0;
  const isCritical = diffMs !== null && diffMs >= 0 && diffMs <= 10 * 60 * 1000;

  const ticketNo = ticket.tiket_mantools || ticket.tiket_noxis || ticket.tiket_epicor || `ID #${ticket.id.slice(0, 6)}`;

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        isOverdue
          ? "border-red-600/80 bg-red-950/40 shadow-md shadow-red-900/20"
          : isCritical
            ? "border-amber-500/80 bg-amber-950/30"
            : "border-slate-800 bg-slate-900/90 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-200">{ticketNo}</span>
            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
              {ticket.layanan || "Layanan"}
            </span>
            <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400">
              {ticket.jenis_ticket || "-"}
            </span>
          </div>

          <div className="mt-1.5 truncate text-sm font-bold text-white">
            {ticket.customer || "Tanpa Nama Pelanggan"}
            {ticket.nama_lokasi ? <span className="font-normal text-slate-400"> — {ticket.nama_lokasi}</span> : null}
          </div>

          <div className="mt-1 line-clamp-1 text-xs text-slate-400">
            {ticket.indikasi_gangguan || ticket.keterangan || "Tidak ada rincian gangguan"}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${toneBadge(ticket.status)}`}>
            {ticket.status}
          </span>

          {isOverdue ? (
            <span className="rounded border border-red-500 bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
              OVERDUE {formatTimeDiff(diffMs!)}
            </span>
          ) : isCritical ? (
            <span className="rounded border border-amber-500 bg-amber-600 px-1.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
              SLA &le; {formatTimeDiff(diffMs!)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          <span>Open: {formatDateTime(ticket.tanggal_open ?? ticket.created_at)}</span>
        </span>
        <span>By: {ticket.open_by || "-"}</span>
      </div>
    </div>
  );
}
