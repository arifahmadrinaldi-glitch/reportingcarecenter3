export const ON_DUTY_OPTIONS = ["Arif", "Ari", "Diki", "Hari", "Rangga", "Raihan"] as const;

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
  created_at: string;
  updated_at: string;
};

export const formatTanggal = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};
