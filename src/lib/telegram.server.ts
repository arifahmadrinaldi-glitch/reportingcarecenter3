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
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const line = (label: string, value: string) =>
  value ? `<b>${label}:</b> ${escapeHtml(value)}\n` : "";

export function buildTicketMessage(ticket: NewTicketPayload) {
  return (
    `🎫 <b>Ticket Baru</b>\n\n` +
    line("Status", ticket.status) +
    line("Customer", ticket.customer) +
    line("Nama Lokasi", ticket.nama_lokasi) +
    line("Tiket Mantools", ticket.tiket_mantools) +
    line("Tiket Noxis", ticket.tiket_noxis) +
    line("Layanan", ticket.layanan) +
    line("Jenis Ticket", ticket.jenis_ticket) +
    line("Regional", ticket.regional) +
    line("Indikasi Gangguan", ticket.indikasi_gangguan) +
    line("Open By", ticket.open_by)
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