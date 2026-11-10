export const STARLINK_STATUSES = ["online", "offline", "inactive", "unknown"] as const;
export type StarlinkStatus = (typeof STARLINK_STATUSES)[number];
export type StarlinkTerminal = {
  id: string;
  location: string;
  serviceLine: string;
  kitSerial: string;
  status: StarlinkStatus;
};
export type StarlinkSnapshot = {
  terminals: StarlinkTerminal[];
  source: "demo" | "live";
  fetchedAt: string;
};

export const STARLINK_DEMO_TERMINALS: StarlinkTerminal[] = [
  { id: "sl-01", location: "TELKOM DWS — Merauke 9", serviceLine: "SL-517169-85589-90", kitSerial: "KIT310482751", status: "online" },
  { id: "sl-02", location: "TELKOM DWS — Merauke 10", serviceLine: "SL-517170-21586-69", kitSerial: "KIT310482752", status: "online" },
  { id: "sl-03", location: "TELKOM DWS — Merauke 11", serviceLine: "SL-517171-32065-38", kitSerial: "KIT310482753", status: "offline" },
  { id: "sl-04", location: "PRIMACOM INTERBUANA — Buli", serviceLine: "SL-DR-1185943-98083-26", kitSerial: "KIT310492814", status: "online" },
  { id: "sl-05", location: "TANCARA MITRAKOM — Pop Gili", serviceLine: "SL-DR-1319096-58280-10", kitSerial: "KIT310492815", status: "inactive" },
  { id: "sl-06", location: "NETTOCYBER INDONESIA — Jhon", serviceLine: "SL-DR-15558501-54454-8", kitSerial: "KIT310502916", status: "online" },
  { id: "sl-07", location: "PERTAMINA EP — Sumur Drilling", serviceLine: "SL-DR-17247589-24024-11", kitSerial: "KIT310502917", status: "online" },
  { id: "sl-08", location: "DITJEN IMIGRASI — PLBN Napan", serviceLine: "AST-2386600-36334-42", kitSerial: "KIT310513018", status: "offline" },
  { id: "sl-09", location: "DITJEN IMIGRASI — PLBN Temajuk", serviceLine: "AST-2380805-89345-53", kitSerial: "KIT310513019", status: "online" },
  { id: "sl-10", location: "M3 Ketapang — FPSO Gresik", serviceLine: "AST-2470179-68502-49", kitSerial: "KIT310523120", status: "inactive" },
  { id: "sl-11", location: "Kementerian Perhubungan — Papua", serviceLine: "AST-2349411-83249-46", kitSerial: "KIT310523121", status: "unknown" },
  { id: "sl-12", location: "TELKOM DWS — Solo (cadangan)", serviceLine: "AST-2307224-60941-39", kitSerial: "KIT310533222", status: "unknown" },
];

export function starlinkCounts(rows: StarlinkTerminal[]): Record<StarlinkStatus, number> {
  const counts = { online: 0, offline: 0, inactive: 0, unknown: 0 };
  for (const row of rows) counts[row.status] += 1;
  return counts;
}

export function filterStarlink(rows: StarlinkTerminal[], status: StarlinkStatus | "all", search: string) {
  const query = search.trim().toLocaleLowerCase("id-ID");
  return rows.filter((row) => (status === "all" || row.status === status)
    && [row.location, row.serviceLine, row.kitSerial].some((value) => value.toLocaleLowerCase("id-ID").includes(query)));
}