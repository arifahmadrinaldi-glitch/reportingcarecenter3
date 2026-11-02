import { filterCareCenterRows, type CareCenterSelection } from "./care-center-filter";

export function parseTelegramCommand(text: string) {
  const parts = text.trim().split(/\s+/);
  const rawCommand = (parts.shift() ?? "").toLowerCase().split("@")[0];
  let category: CareCenterSelection = "all";
  const args = parts.filter((part) => {
    const value = part.toLowerCase();
    if (value === "vsat") { category = "vsat"; return false; }
    if (value === "nonvsat" || value === "non-vsat") { category = "non-vsat"; return false; }
    if (value === "semua" || value === "all") { category = "all"; return false; }
    return true;
  });
  return { command: rawCommand === "/opentiket" ? "/tiketopen" : rawCommand, category, args };
}

export const telegramCategoryLabel = (category: CareCenterSelection) =>
  category === "all" ? "Semua Care Center" : category === "vsat" ? "Care Center Vsat" : "Care Center Non-Vsat";

export type SummaryRow = { layanan?: string | null; status?: string | null; jenis_ticket?: string | null };

export function openTicketResume<T extends SummaryRow>(rows: T[], category: CareCenterSelection) {
  const scoped = filterCareCenterRows(rows, category, (row) => row.layanan)
    .filter((row) => row.status !== "Close" && row.status !== "Technical Close");
  const count = (key: "status" | "layanan") => {
    const totals = new Map<string, number>();
    for (const row of scoped) {
      const value = row[key]?.trim() || "-";
      totals.set(value, (totals.get(value) ?? 0) + 1);
    }
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    rows: scoped, total: scoped.length, statuses: count("status"), services: count("layanan"),
    cm: scoped.filter((row) => row.jenis_ticket === "Corrective Maintenance").length,
    pm: scoped.filter((row) => row.jenis_ticket === "Preventive Maintenance").length,
  };
}