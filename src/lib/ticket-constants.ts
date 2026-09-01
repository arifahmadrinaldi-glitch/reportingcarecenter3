export const STATUS_OPTIONS = [
  "Diagnose",
  "Engineer Assignment",
  "Engineer On The Way",
  "Engineer Troubleshoot",
  "Pending",
  "Pending Transport",
  "Pending Spare",
  "Pending Customer",
  "Monev",
  "Technical Close",
  "Close",
] as const;

export const OPEN_STATUSES = [
  "Diagnose",
  "Engineer Assignment",
  "Engineer On The Way",
  "Engineer Troubleshoot",
  "Monev",
] as const;

export const OPEN_BY_OPTIONS = [
  "Arif",
  "Ari",
  "Dicky",
  "Hari",
  "Nawin",
  "Rangga",
  "Raihan",
] as const;

export const LAYANAN_OPTIONS = [
  "AIS",
  "VIS",
  "SBS",
  "Mangostar",
  "Star Data",
  "Star Data Lite",
  "VSAT Star",
  "Gateway",
  "Datakom",
  "SN",
  "BGAN",
  "FBB",
  "MSP",
] as const;

export const JENIS_OPTIONS = [
  "Corrective Maintenance",
  "Preventive Maintenance",
  "Instalasi",
  "Relokasi",
] as const;

export const REGIONAL_OPTIONS = [
  "Regional 1",
  "Regional 2",
  "Regional 3",
  "Regional 4",
  "Regional 5",
] as const;

export const ASAL_GANGGUAN_OPTIONS = ["Telkomsat", "Non-Telkomsat"] as const;

export const TEAM_SEM_OPTIONS = [
  "Ridwan/Andi",
  "Ridwan/Yogi",
  "Ridwan/Gilang",
  "Dony/Taqim",
  "Rowland/Yoga",
  "Deny/Ibnu",
] as const;

export const BULAN_OPTIONS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

/** One entry of the ticket update log (newest first when rendered). */
export type UpdateEntry = {
  at: string;
  text: string;
  status?: string | null;
};

export const parseUpdateHistory = (value: unknown): UpdateEntry[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is UpdateEntry => !!item && typeof item === "object" && "at" in item)
    .map((item) => ({
      at: String(item.at),
      text: String(item.text ?? ""),
      status: item.status ? String(item.status) : null,
    }));
};

export type TicketRow = {
  id: string;
  status: string;
  keterangan: string | null;
  customer: string | null;
  nama_lokasi: string | null;
  tiket_mantools: string | null;
  tiket_noxis: string | null;
  layanan: string | null;
  jenis_ticket: string | null;
  asal_gangguan: string | null;
  regional: string | null;
  indikasi_gangguan: string | null;
  last_update: string | null;
  team_sem: string | null;
  open_by: string | null;
  tanggal_open: string | null;
  tanggal_close: string | null;
  durasi: string | null;
  teknisi: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketFormValues = Omit<
  TicketRow,
  "id" | "deleted_at" | "created_at" | "updated_at"
>;

export const emptyTicket = (): TicketFormValues => ({
  status: "Diagnose",
  keterangan: "",
  customer: "",
  nama_lokasi: "",
  tiket_mantools: "",
  tiket_noxis: "",
  layanan: "",
  jenis_ticket: "",
  asal_gangguan: "",
  regional: "",
  indikasi_gangguan: "",
  last_update: "",
  team_sem: "",
  open_by: "",
  tanggal_open: null,
  tanggal_close: null,
  durasi: "",
  teknisi: "",
});

export type StatusTone =
  | "success"
  | "warning"
  | "orange"
  | "purple"
  | "brown"
  | "danger"
  | "info"
  | "muted";

export const statusTone = (status: string): StatusTone => {
  if (status === "Close" || status === "Technical Close") return "success";
  if (status === "Diagnose" || status === "Engineer Assignment") return "danger";
  if (status === "Pending Spare") return "purple";
  if (status === "Pending") return "brown";
  if (status.startsWith("Pending")) return "warning";
  if ((OPEN_STATUSES as readonly string[]).includes(status)) return "info";
  return "muted";
};

/** Short labels for Jenis Ticket, e.g. "Corrective Maintenance" -> "CM". */
export const JENIS_SHORT: Record<string, string> = {
  "Corrective Maintenance": "CM",
  "Preventive Maintenance": "PM",
  Instalasi: "INS",
  Relokasi: "RLK",
};

export const jenisShort = (value: string | null) => {
  if (!value) return "-";
  return JENIS_SHORT[value] ?? value;
};

export const jenisTone = (value: string | null): "danger" | "success" | "muted" => {
  if (value === "Corrective Maintenance") return "danger";
  if (value === "Preventive Maintenance") return "success";
  return "muted";
};

export const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const toInputDateTime = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const computeDurasi = (open: string | null, close: string | null) => {
  if (!open) return "";
  const start = new Date(open).getTime();
  const end = close ? new Date(close).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "";
  const totalMinutes = Math.floor((end - start) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const base = `${days} Hari ${hours} Jam ${minutes} Menit`;
  return close ? base : `${base} (berjalan)`;
};