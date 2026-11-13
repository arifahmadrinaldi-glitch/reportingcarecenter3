import { BULAN_OPTIONS, parsePendingDeadline, type TicketRow } from "./ticket-constants";

export const closedTicket = (ticket: TicketRow) => ticket.status === "Close" || ticket.status === "Technical Close";
const timestamp = (value: string | null) => value ? new Date(value).getTime() : NaN;

export function ticketOverdue(ticket: TicketRow, now: number) {
  const deadline = parsePendingDeadline(ticket.keterangan);
  return !closedTicket(ticket) && Boolean(deadline && Number.isFinite(deadline.getTime()) && deadline.getTime() < now);
}

export function dashboardMetrics(tickets: TicketRow[], now: number) {
  const active = tickets.filter((ticket) => !closedTicket(ticket));
  const closed = tickets.filter(closedTicket);
  const durations = closed.map((ticket) => timestamp(ticket.tanggal_close) - timestamp(ticket.tanggal_open))
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  return {
    active: active.length,
    closed: closed.length,
    completionRate: tickets.length ? closed.length / tickets.length * 100 : 0,
    mttrMs: durations.length ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : null,
    overdue: active.filter((ticket) => ticketOverdue(ticket, now)).length,
    oldest: active.filter((ticket) => Number.isFinite(timestamp(ticket.tanggal_open)) && timestamp(ticket.tanggal_open) <= now)
      .sort((a, b) => timestamp(a.tanggal_open) - timestamp(b.tanggal_open) || a.id.localeCompare(b.id)).slice(0, 5),
  };
}

export function matchesDashboardPeriod(value: string | null, month: string, year: string) {
  const date = new Date(value ?? "");
  return Number.isFinite(date.getTime()) && (month === "__all__" || BULAN_OPTIONS[date.getMonth()] === month)
    && (year === "__all__" || String(date.getFullYear()) === year);
}

export function dailyTicketTrend(tickets: TicketRow[], month: string, year: string) {
  const days = new Map<string, { date: string; label: string; open: number; close: number }>();
  const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const ensureDay = (date: Date) => {
    const key = dayKey(date);
    let row = days.get(key);
    if (!row) {
      row = { date: key, label: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`, open: 0, close: 0 };
      days.set(key, row);
    }
    return row;
  };
  // Closing events use their own date, including tickets opened before this period.
  for (const ticket of tickets) {
    if (matchesDashboardPeriod(ticket.tanggal_open, month, year)) ensureDay(new Date(ticket.tanggal_open ?? "")).open++;
    if (closedTicket(ticket) && matchesDashboardPeriod(ticket.tanggal_close, month, year)) ensureDay(new Date(ticket.tanggal_close ?? "")).close++;
  }
  const monthIndex = BULAN_OPTIONS.findIndex((option) => option === month);
  if (monthIndex >= 0 && year !== "__all__") {
    const selectedYear = Number(year);
    for (let day = 1; day <= new Date(selectedYear, monthIndex + 1, 0).getDate(); day++) ensureDay(new Date(selectedYear, monthIndex, day));
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function formatMttr(ms: number | null) {
  if (ms === null) return "—";
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 1440)}h ${Math.floor(minutes % 1440 / 60)}j ${minutes % 60}m`;
}