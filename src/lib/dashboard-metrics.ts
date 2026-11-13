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

export function matchesDateRange(value: string | null, startDate?: string, endDate?: string) {
  if (!value) return false;
  if (!startDate && !endDate) return true;
  const datePart = value.slice(0, 10);
  if (startDate && datePart < startDate) return false;
  if (endDate && datePart > endDate) return false;
  return true;
}

export function dailyTicketTrend(tickets: TicketRow[], startDate?: string, endDate?: string) {
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

  for (const ticket of tickets) {
    if (matchesDateRange(ticket.tanggal_open, startDate, endDate)) {
      ensureDay(new Date(ticket.tanggal_open ?? "")).open++;
    }
    if (closedTicket(ticket) && matchesDateRange(ticket.tanggal_close, startDate, endDate)) {
      ensureDay(new Date(ticket.tanggal_close ?? "")).close++;
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && start <= end) {
      const diff = Math.round((end.getTime() - start.getTime()) / 86400000);
      if (diff <= 365) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          ensureDay(new Date(d));
        }
      }
    }
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function formatMttr(ms: number | null) {
  if (ms === null) return "—";
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 1440)}h ${Math.floor(minutes % 1440 / 60)}j ${minutes % 60}m`;
}
