import { filterCareCenterRows } from "./care-center-filter";
import { rosterCode, type BusinessData, type Cell, type ScheduleData } from "./schedule";
import type { TicketCategory, TicketRow } from "./ticket-constants";
import { computeDurasi, formatDateTime } from "./ticket-constants";

export type ShiftKey = "P" | "S" | "M";
export const SHIFT_INFO: Record<ShiftKey, { label: string; start: number; end: number }> = {
  P: { label: "Pagi", start: 7, end: 15 },
  S: { label: "Siang", start: 15, end: 23 },
  M: { label: "Malam", start: 23, end: 7 },
};
const NEXT: Record<ShiftKey, ShiftKey> = { P: "S", S: "M", M: "P" };
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pad = (n: number) => String(n).padStart(2, "0");

export type ShiftSlot = { shift: ShiftKey; date: Date; start: Date; end: Date };

/** Current shift slot; night shift after midnight belongs to the previous roster day. */
export function currentShift(now: Date): ShiftSlot {
  const h = now.getHours();
  const day = (offset: number, hour: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour);
  if (h >= 7 && h < 15) return { shift: "P", date: day(0, 0), start: day(0, 7), end: day(0, 15) };
  if (h >= 15 && h < 23) return { shift: "S", date: day(0, 0), start: day(0, 15), end: day(0, 23) };
  if (h >= 23) return { shift: "M", date: day(0, 0), start: day(0, 23), end: day(1, 7) };
  return { shift: "M", date: day(-1, 0), start: day(-1, 23), end: day(0, 7) };
}
export function nextShift(slot: ShiftSlot): ShiftSlot {
  const shift = NEXT[slot.shift];
  const date = slot.shift === "M" ? new Date(slot.end.getFullYear(), slot.end.getMonth(), slot.end.getDate()) : slot.date;
  const at = (offset: number, hour: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset, hour);
  return { shift, date, start: at(0, SHIFT_INFO[shift].start), end: shift === "M" ? at(1, 7) : at(0, SHIFT_INFO[shift].end) };
}
export const periodOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** Personnel on a shift: any code containing the shift letter (combined backup codes included, CT excluded). */
export function officersOn(data: ScheduleData | BusinessData | undefined, slot: ShiftSlot): string[] {
  if (!data?.members?.length) return [];
  const y = slot.date.getFullYear(), mo = slot.date.getMonth(), d = slot.date.getDate();
  const out: string[] = [];
  data.members.forEach((name, m) => {
    const cell: Cell = data.cells?.[m]?.[d] ?? { code: rosterCode(m, y, mo, d, data) };
    if (cell.code === "CT" || !cell.code.includes(slot.shift)) return;

    // Cek shift asli dari jadwal dasar (roster)
    const normalShift = cell.originalCode || rosterCode(m, y, mo, d, data);

    // Keterangan backup hanya muncul jika shift ini BUKAN shift aslinya
    const isCover = Boolean(cell.backupFor && !normalShift.includes(slot.shift));

    out.push(isCover ? `${name} (backup ${cell.backupFor})` : name);
  });
  return out;
}

const isClosed = (s: string) => s === "Close" || s === "Technical Close";
const inRange = (v: string | null, a: Date, b: Date) => { if (!v) return false; const t = new Date(v).getTime(); return t >= a.getTime() && t < b.getTime(); };
const tally = (rows: TicketRow[], key: (r: TicketRow) => string) => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

export function buildHandover(opts: {
  tickets: TicketRow[]; category: TicketCategory; now: Date; current: ShiftSlot; next: ShiftSlot;
  outgoing: string[]; incoming: string[]; notes: string;
}) {
  const { now, current, next } = opts;
  const scoped = filterCareCenterRows(opts.tickets, opts.category, (r) => r.layanan);
  const masuk = scoped.filter((r) => inRange(r.tanggal_open ?? r.created_at, current.start, now));
  const close = scoped.filter((r) => isClosed(r.status) && inRange(r.tanggal_close, current.start, now));
  const active = scoped.filter((r) => !isClosed(r.status));
  const cm = active.filter((r) => r.jenis_ticket === "Corrective Maintenance").length;
  const pm = active.filter((r) => r.jenis_ticket === "Preventive Maintenance").length;
  const pending = active.filter((r) => r.status !== "Monev");
  const d = current.date;
  const list = (names: string[]) => (names.length ? names.map((n) => `  • ${n}`).join("\n") : "  • -");
  const lines = [
    `SERAH TERIMA SHIFT`,
    `${opts.category === "vsat" ? "Care Center Vsat" : "Care Center Non-Vsat"}`,
    ``,
    `Hari/Tanggal : ${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`,
    `Waktu        : ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    `Shift        : ${SHIFT_INFO[current.shift].label} (${current.shift}) → ${SHIFT_INFO[next.shift].label} (${next.shift})`,
    `Petugas Lepas:`, list(opts.outgoing),
    `Petugas Masuk:`, list(opts.incoming),
    ``,
    `RINGKASAN TIKET`,
    `├ Tiket masuk shift ini : ${masuk.length}`,
    `├ Tiket close shift ini : ${close.length}`,
    `└ Total tiket aktif     : ${active.length} (CM: ${cm} | PM: ${pm})`,
    ``,
    `Per Status:`,
    ...tally(active, (r) => r.status).map(([k, v]) => `  • ${k}: ${v}`),
    ``,
    `Per Layanan:`,
    ...tally(active, (r) => r.layanan?.trim() || "-").map(([k, v]) => `  • ${k}: ${v}`),
    ``,
    `DETAIL TIKET PENDING / ESKALASI`,
    ...(pending.length ? pending.flatMap((r, i) => {
      const tiket = [r.tiket_mantools, r.tiket_noxis, r.tiket_epicor].map((x) => (x ?? "").trim()).filter(Boolean).join(" / ") || "-";
      const ket = (r.keterangan ?? "").replace(/^pending\s+sampai\s*:?\s*/i, "").trim();
      return [
        `${i + 1}. ${r.nama_lokasi || "-"}`,
        `├ Tiket : ${tiket}`,
        `├ Status: ${r.status}${ket ? ` ${ket}` : ""}`,
        `├ Durasi: ${computeDurasi(r.tanggal_open, r.tanggal_close) || "-"}`,
        `└ Update: ${(r.last_update ?? "").trim() || "-"}`,
      ];
    }) : ["-"]),
    ``,
    `CATATAN AKTIVITAS PENTING`,
    opts.notes.trim() || "-",
  ];
  void formatDateTime;
  return lines.join("\n");
}
