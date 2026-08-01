export const STATUS_OPTIONS = [
  "Open",
  "Progress",
  "Pending",
  "Pending Transport",
  "Pending Spare",
  "Pending Customer",
  "Close",
] as const;

export const LAYANAN_OPTIONS = [
  "AIS",
  "VIS",
  "SBS",
  "Mangostar",
  "Star Data",
  "Star Data Lite",
  "VSAT Star",
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

export const ASAL_GANGGUAN_OPTIONS = ["Telkomsat", "Customer", "NOC", "Monitoring"] as const;

export const TEAM_SEM_OPTIONS = ["SEM 1", "SEM 2", "SEM 3", "SEM 4", "SEM 5"] as const;

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
  status: "Open",
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

export const statusTone = (status: string): "success" | "warning" | "info" | "muted" => {
  if (status === "Close") return "success";
  if (status.startsWith("Pending")) return "warning";
  if (status === "Progress" || status === "Open") return "info";
  return "muted";
};

export const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
};