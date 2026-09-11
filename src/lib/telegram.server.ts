const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export type NewTicketPayload = {
  status: string;
  customer: string;
  nama_lokasi: string;
  tiket_mantools: string;
  tiket_noxis: string;
  layanan: string;
  jenis_ticket: string;
  regional: string;
  indikasi_gangguan: string;
  open_by: string;
  teknisi?: string;
  last_update?: string;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

/**
 * Standard ticket card used both for new-ticket notifications and bot replies.
 */
export function buildTicketMessage(ticket: NewTicketPayload) {
  const jenisLine = [
    shortJenis(ticket.jenis_ticket ?? ""),
    ticket.layanan ?? "",
    shortRegional(ticket.regional ?? ""),
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" | ");

  const tiket = [ticket.tiket_mantools, ticket.tiket_noxis]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" / ");

  return (
    `<b>${escapeHtml(ticket.nama_lokasi || "-")}</b>\n` +
    `├ Customer: ${escapeHtml(ticket.customer || "-")}\n` +
    `├ Tiket: ${escapeHtml(tiket || "-")}\n` +
    `├ Status: ${escapeHtml(ticket.status || "-")}\n` +
    `├ Jenis: ${escapeHtml(jenisLine || "-")}\n` +
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
    const { data, error } = await supabase
      .from("telegram_chats")
      .select("chat_id")
      .eq("is_active", true);
    if (error) console.error(`Gagal baca telegram_chats: ${error.message}`);
    for (const row of (data ?? []) as Array<{ chat_id: number }>) ids.add(Number(row.chat_id));
  }

  return [...ids].filter((id) => Number.isFinite(id));
}

export async function sendTelegramTicket(
  ticket: NewTicketPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];

  if (!lovableKey || !telegramKey) {
    return { sent: false, reason: "koneksi Telegram belum diaktifkan" };
  }

  const chatIds = await listChatIds();
  if (chatIds.length === 0) {
    return { sent: false, reason: "belum ada chat Telegram terdaftar (kirim /start ke bot)" };
  }

  let sent = 0;
  let lastReason: string | undefined;

  for (const chatId of chatIds) {
    const response = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTicketMessage(ticket),
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Telegram gateway failed [${response.status}]: ${body}`);
      lastReason = `gagal kirim (${response.status})`;
      continue;
    }

    const result = (await response.json()) as { ok?: boolean; description?: string };
    if (!result.ok) {
      console.error(`Telegram API error: ${result.description ?? "unknown"}`);
      lastReason = result.description ?? "gagal kirim";
      continue;
    }

    sent += 1;
  }

  if (sent === 0) return { sent: false, reason: lastReason ?? "gagal kirim" };
  return { sent: true };
}
