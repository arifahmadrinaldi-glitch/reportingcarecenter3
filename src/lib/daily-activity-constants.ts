export const ON_DUTY_OPTIONS = ["Arif", "Ari", "Dicky", "Rangga", "Raihan"] as const;

export const SHIFT_OPTIONS = ["Pagi", "Siang", "Malam"] as const;

export const CATEGORY_OPTIONS = ["General", "Troubleshoot", "Gamas"] as const;

export const SOURCE_OPTIONS = [
  "Monitoring PRTG",
  "Monitoring NMS",
  "WhatsApp",
  "WhatsApp Group",
  "Telegram",
  "Email",
  "Phone Call",
] as const;

export const TO_DO_OPTIONS = ["Proactive Action", "Corrective Action", "Activity"] as const;

export const PRODUCT_OPTIONS = [
  "Vsat Star",
  "CGW",
  "Datakom",
  "SN",
  "SGN",
  "MSP",
  "FBB",
  "Gyro",
  "AIS",
  "VIS",
  "Phinisi",
  "Star Data",
] as const;

export const RFO_GENERAL_OPTIONS = [
  "Add Vlan",
  "Capture (Traffic, PING, Dashboard)",
  "Check Connectivity",
  "Cable - Ethernet",
  "Confirm Customer",
  "Daily Report",
  "Datakom - Backbone",
  "Datakom - Router",
  "Datakom - FO Cut",
  "Edukasi Customer",
  "Force Majeure - Hujan",
  "Kelistrikan PLN",
  "Kelistrikan - Genset",
  "Kelistrikan - Inverter",
  "Kelistrikan - Solar Cell",
  "Levelling Power",
  "Probe Carrier",
  "Push Modem Via NMS",
  "Reboot KIT",
  "Reboot Mikrotik",
  "Reboot Peplink",
  "Reboot AP",
  "Replace KIT",
  "Stow KIT",
  "Pengecekan Transmisi",
  "Upgrade BW",
  "Downgrade BW",
  "Change Pass AP",
  "Failure - Change Perangkat",
  "Problem IT",
  "MCB Trip",
  "Adaptor Rusak",
  "Reconfig Mikrotik - VLAN",
  "Pandu Pengecekan Awal Customer",
  "Check Quota",
  "Pengecekan Tracking VIS",
] as const;

export const ACTIVITY_STATUS_OPTIONS = ["Open", "Close"] as const;

export type DailyActivityRow = {
  id: string;
  tanggal: string | null;
  on_duty: string | null;
  shift: string | null;
  category: string | null;
  source_information: string | null;
  to_do: string | null;
  product: string | null;
  customer: string | null;
  nama_lokasi: string | null;
  kontak_pic: string | null;
  rfo_general: string | null;
  type_modem_sn: string | null;
  problem: string | null;
  action: string | null;
  status: string;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export const DAILY_DROPDOWNS = {
  on_duty: ON_DUTY_OPTIONS,
  shift: SHIFT_OPTIONS,
  source_information: SOURCE_OPTIONS,
  to_do: TO_DO_OPTIONS,
  rfo_general: RFO_GENERAL_OPTIONS,
} as const;

export type DailyFilters = {
  bulan: string[];
  tahun: string[];
  on_duty: string[];
  shift: string[];
  source_information: string[];
  to_do: string[];
  rfo_general: string[];
};

export const emptyDailyFilters = (): DailyFilters => ({
  bulan: [],
  tahun: [],
  on_duty: [],
  shift: [],
  source_information: [],
  to_do: [],
  rfo_general: [],
});

export const filterDailyRows = (rows: DailyActivityRow[], filters: DailyFilters) =>
  rows.filter((row) => {
    const match = (values: string[], value: string | null) =>
      values.length === 0 || values.includes(value ?? "");
    if (!match(filters.on_duty, row.on_duty)) return false;
    if (!match(filters.shift, row.shift)) return false;
    if (!match(filters.source_information, row.source_information)) return false;
    if (!match(filters.to_do, row.to_do)) return false;
    if (!match(filters.rfo_general, row.rfo_general)) return false;
    if (filters.bulan.length || filters.tahun.length) {
      if (!row.tanggal) return false;
      const date = new Date(row.tanggal);
      if (Number.isNaN(date.getTime())) return false;
      if (filters.bulan.length && !filters.bulan.includes(BULAN_LIST[date.getMonth()] as string))
        return false;
      if (filters.tahun.length && !filters.tahun.includes(String(date.getFullYear())))
        return false;
    }
    return true;
  });

export const BULAN_LIST = [
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

export const tahunOptionsFrom = (rows: DailyActivityRow[]) =>
  Array.from(
    new Set(
      rows
        .map((row) => (row.tanggal ? new Date(row.tanggal).getFullYear() : null))
        .filter((y): y is number => Boolean(y) && !Number.isNaN(y as number)),
    ),
  )
    .sort((a, b) => b - a)
    .map(String);

export const formatTanggal = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
