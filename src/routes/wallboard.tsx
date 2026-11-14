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
    () => tickets.filter((t) => ticketCategory(t.layanan) === "vsat"),
    [tickets]
  );
  const nonVsatTickets = useMemo(
    () => tickets.filter((t) => ticketCategory(t.layanan) === "non-vsat"),
    [tickets]
  );

  // Deteksi tiket kritis / overdue
  const criticalCount = useMemo(() => {
    const nowMs = time.getTime();
    return tickets.filter((t) => {
      const deadline = parsePendingDeadline(t.keterangan);
      if (!deadline) return false;
      const diff = deadline.getTime() - nowMs;
      return diff <= 10 * 60 * 1000;
    }).length;
  }, [tickets, time]);

  const toneBadge = (status: string) => {
    const tone = statusTone(status);
    if (tone === "danger") return "border-red-500/40 bg-red-500/20 text-red-300";
    if (tone === "warning") return "border-amber-500/40 bg-amber-500/20 text-amber-300";
    if (tone === "orange") return "border-orange-500/40 bg-orange-500/20 text-orange-300";
    if (tone === "purple") return "border-purple-500/40 bg-purple-500/20 text-purple-300";
    if (tone === "teal") return "border-teal-500/40 bg-teal-500/20 text-teal-300";
    return "border-blue-500/40 bg-blue-500/20 text-blue-300";
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 p-4 text-slate-100 lg:p-6">
      {/* Top Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-600/30">
            <Radio className="size-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white lg:text-xl">
                CARE CENTER TELKOMSAT
              </h1>
              <span className="rounded-md border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                LIVE NOC
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Command Center Wallboard • Auto-refresh 30s
            </p>
          </div>
        </div>

                {/* Jam Digital Realtime & Actions */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-4 py-2 text-right">
            <div className="font-mono text-xl font-bold tracking-wider text-emerald-400 lg:text-2xl">
              {time.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
            </div>
            <div className="text-[11px] text-slate-400">
              {time.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          <button
            onClick={() => refetch()}
            className="flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title="Refresh manual"
          >
            <RefreshCw className={`size-4 ${isFetching ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen TV"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <Link
            to="/tickets"
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span>Kembali</span>
          </Link>
        </div>
      </header>

      {/* Row KPI Cards */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Aktif</span>
            <Ticket className="size-4 text-cyan-400" />
          </div>
          <div className="mt-1 text-2xl font-black text-white">{tickets.length}</div>
          <div className="text-[10px] text-slate-500">Tiket berstatus Open/Progress</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>VSAT Aktif</span>
            <span className="size-2 rounded-full bg-cyan-400" />
          </div>
          <div className="mt-1 text-2xl font-black text-cyan-300">{vsatTickets.length}</div>
          <div className="text-[10px] text-slate-500">Care Center VSAT</div>
        </div>

        <div className="rounde d-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Non-VSAT Aktif</span>
            <span className="size-2 rounded-full bg-indigo-400" />
          </div>
          <div className="mt-1 text-2xl font-black text-indigo-300">{nonVsatTickets.length}</div>
          <div className="text-[10px] text-slate-500">Care Center Non-VSAT</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SLA Kritis / Overdue</span>
            <AlertTriangle className={`size-4 ${criticalCount > 0 ? "text-red-400 animate-pulse" : "text-slate-500"}`} />
          </div>
          <div className={`mt-1 text-2xl font-black ${criticalCount > 0 ? "text-red-400" : "text-slate-300"}`}>
            {criticalCount}
          </div>
          <div className="text-[10px] text-slate-500">Sisa waktu &le; 10 menit</div>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>On-Duty ({SHIFT_INFO[shiftSlot]?.label || shiftSlot})</span>
            <Users className="size-4 text-emerald-400" />
          </div>
          <div className="mt-1 truncate text-xs font-semibold text-emerald-300">
            {onDutyOfficers.length > 0 ? onDutyOfficers.join(", ") : "Belum terdata"}
          </div>
          <div className="text-[10px] text-slate-500">Shift saat ini</div>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Kolom VSAT */}
        <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-cyan-400" />
              <h2 className="text-sm font-bold tracking-wide uppercase text-cyan-300">
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
