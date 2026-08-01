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

export async function sendTelegramTicket(
  ticket: NewTicketPayload,
): Promise<{ sent: boolean; reason?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];

  if (!lovableKey || !telegramKey) {
    return { sent: false, reason: "koneksi Telegram belum diaktifkan" };
  }
  if (!chatId) {
    return { sent: false, reason: "chat ID Telegram belum diisi" };
  }

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
    return { sent: false, reason: `gagal kirim (${response.status})` };
  }

  const result = (await response.json()) as { ok?: boolean; description?: string };
  if (!result.ok) {
    console.error(`Telegram API error: ${result.description ?? "unknown"}`);
    return { sent: false, reason: result.description ?? "gagal kirim" };
  }

  return { sent: true };
}