const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export type NewTicketPayload = {
  status: string;
  keterangan?: string | null;
  customer: string;
  nama_lokasi: string;
  tiket_mantools: string;
  tiket_noxis: string;
  tiket_epicor?: string;
  layanan: string;
  jenis_ticket: string;
  regional: string;
  indikasi_gangguan: string;
  open_by: string;
  teknisi?: string;
  last_update?: string;
  tanggal_open?: string | null;
  tanggal_close?: string | null;
};

const formatDuration = (openedAt?: string | null, closedAt?: string | null) => {
  if (!openedAt) return "-";
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return "-";
  const totalMinutes = Math.floor((end - start) / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  return `${days} Hari ${hours} Jam ${minutes} Menit${closedAt ? "" : " (berjalan)"}`;
};

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** "Corrective Maintenance" -> "CM", "Preventive Maintenance" -> "PM". */
export const shortJenis = (value: string) => {
  if (/^corrective/i.test(value)) return "CM";
  if (/^preventive/i.test(value)) return "PM";
  if (/^instalasi/i.test(value)) return "INS";
  if (/^relokasi/i.test(value)) return "RLK";
  return value;
};

/** "Regional 2" -> "Reg 2". */
export const shortRegional = (value: string) => value.replace(/^regional\s*/i, "Reg ");

/** Wrap a report body in a monospace block so tree characters line up neatly. */
export const mono = (body: string) => `<pre>${body}</pre>`;

/**
 * Standard ticket card used both for new-ticket notifications and bot replies.
 * Plain text (already HTML-escaped) so it can live inside a <pre> block.
 */
export function buildTicketMessage(ticket: NewTicketPayload) {
  const jenisLine = [shortJenis(ticket.jenis_ticket ?? ""), ticket.layanan ?? "", shortRegional(ticket.regional ?? "")]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" | ");

      const cleanKeterangan = (ticket.keterangan ?? "")
    .replace(/^pending\s+sampai\s*:?\s*/i, "")
    .trim();

  const statusDisplay = [ticket.status, cleanKeterangan]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");

  const tiket = [ticket.tiket_mantools, ticket.tiket_noxis, ticket.tiket_epicor]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" / ");

  return (
    `${escapeHtml(ticket.nama_lokasi || "-")}\n` +
    `├ Customer: ${escapeHtml(ticket.customer || "-")}\n` +
    `├ Tiket: ${escapeHtml(tiket || "-")}\n` +
    `├ Status: ${escapeHtml(statusDisplay || "-")}\n` +
    `├ Jenis: ${escapeHtml(jenisLine || "-")}\n` +
    `├ Indikasi: ${escapeHtml((ticket.indikasi_gangguan ?? "").trim() || "-")}\n` +
    `├ Durasi: ${escapeHtml(formatDuration(ticket.tanggal_open, ticket.tanggal_close))}\n` +
    `├ Teknisi: ${escapeHtml((ticket.teknisi ?? "").trim() || "-")}\n` +
    `└ Update: ${escapeHtml((ticket.last_update ?? "").trim() || "-")}`
  );
}

async function listChatIds(): Promise<number[]> {
  const ids = new Set<number>();
  const envChat = process.env["TELEGRAM_CHAT_ID"];
  if (envChat) ids.add(Number(envChat));

  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (url && serviceKey) {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.from("telegram_chats").select("chat_id").eq("is_active", true);
    if (error) console.error(`Gagal baca telegram_chats: ${error.message}`);
    for (const row of (data ?? []) as Array<{ chat_id: number }>) ids.add(Number(row.chat_id));
  }

  return [...ids].filter((id) => Number.isFinite(id));
}

export async function sendTelegramTicket(ticket: NewTicketPayload): Promise<{ sent: boolean; reason?: string }> {

  const chatIds = await listChatIds();
  if (chatIds.length === 0) {
    return { sent: false, reason: "belum ada chat Telegram terdaftar (kirim /start ke bot)" };
  }

  let sent = 0;
  let lastReason: string | undefined;

  for (const chatId of chatIds) {
    try {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: mono(`TIKET BARU\n\n${buildTicketMessage(ticket)}`),
        parse_mode: "HTML",
      });
    } catch (error) {
      lastReason = error instanceof Error ? error.message : "gagal kirim";
      continue;
    }

    sent += 1;
  }

  if (sent === 0) return { sent: false, reason: lastReason ?? "gagal kirim" };
  return { sent: true };
}

export async function telegramRequest(method: string, body: Record<string, unknown>) {
  const appKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["TELEGRAM_API_KEY"];
  if (!appKey || !connectionKey) throw new Error("Koneksi Telegram belum dikonfigurasi");
  const response = await fetch(`${GATEWAY_URL}/${method}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${appKey}`, "X-Connection-Api-Key": connectionKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Telegram failed [${response.status}]: ${errorBody}`);
    throw new Error(`Telegram failed [${response.status}]: ${errorBody}`);
  }
  const result = await response.json() as { ok?: boolean; description?: string };
  if (!result.ok) throw new Error(`Telegram: ${result.description ?? "gagal kirim"}`);
  return result;
}
