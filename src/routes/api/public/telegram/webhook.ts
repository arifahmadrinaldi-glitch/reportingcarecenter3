import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

import { buildTicketMessage, mono, shortJenis, shortRegional, type NewTicketPayload } from "@/lib/telegram.server";

const CLOSED_STATUSES = ["Close", "Technical Close"];

const BULAN = [
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
];

function deriveSecret(telegramApiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${telegramApiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function getSupabase() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
}

async function reply(chatId: number, text: string) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const telegramKey = process.env["TELEGRAM_API_KEY"];
  if (!lovableKey || !telegramKey) return;

  const response = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": telegramKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });

  if (!response.ok) {
    console.error(`Telegram reply failed [${response.status}]: ${await response.text()}`);
  }
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Row = Record<string, string | null>;

const TICKET_FIELDS =
  "status, customer, nama_lokasi, tiket_mantools, tiket_noxis, layanan, jenis_ticket, regional, indikasi_gangguan, open_by, teknisi, last_update, tanggal_open, tanggal_close";

const asPayload = (row: Row): NewTicketPayload => ({
  status: row["status"] ?? "",
  customer: row["customer"] ?? "",
  nama_lokasi: row["nama_lokasi"] ?? "",
  tiket_mantools: row["tiket_mantools"] ?? "",
  tiket_noxis: row["tiket_noxis"] ?? "",
  layanan: row["layanan"] ?? "",
  jenis_ticket: row["jenis_ticket"] ?? "",
  regional: row["regional"] ?? "",
  indikasi_gangguan: row["indikasi_gangguan"] ?? "",
  open_by: row["open_by"] ?? "",
  teknisi: row["teknisi"] ?? "",
  last_update: row["last_update"] ?? "",
});

const fmtDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function buildOpenTicketSummary(): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .not("status", "in", '("Close","Technical Close")')
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    console.error(`Gagal ambil tiket: ${error.message}`);
    return "⚠️ Gagal mengambil data tiket.";
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return "✅ Tidak ada tiket yang masih open.";

  // Status summary like the dashboard (statuses with at least one ticket).
  const statusCounts = new Map<string, number>();
  const jenisCounts = new Map<string, number>();
  for (const row of rows) {
    const status = row["status"] ?? "-";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    const jenis = row["jenis_ticket"] ?? "-";
    jenisCounts.set(jenis, (jenisCounts.get(jenis) ?? 0) + 1);
  }
  const statusLines = [...statusCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, total]) => `• ${escapeHtml(name)}: ${total}`)
    .join("\n");

  const cmTotal = jenisCounts.get("Corrective Maintenance") ?? 0;
  const pmTotal = jenisCounts.get("Preventive Maintenance") ?? 0;
  const jenisLines = `• CM: ${cmTotal}\n• PM: ${pmTotal}`;

  const cards = rows.slice(0, 15).map((row, index) => {
    const payload = asPayload(row);
    const jenis = escapeHtml(shortJenis(payload.jenis_ticket ?? ""));
    const layanan = escapeHtml(payload.layanan ?? "-");
    const regional = escapeHtml(shortRegional(payload.regional ?? ""));
    const tiket = [payload.tiket_mantools, payload.tiket_noxis]
      .map((part) => (part ?? "").trim())
      .filter(Boolean)
      .join(" / ");
    return (
      `${index + 1}. ${escapeHtml(payload.nama_lokasi || "-")}\n` +
      `├ Customer: ${escapeHtml(payload.customer || "-")}\n` +
      `├ Tiket: ${escapeHtml(tiket || "-")}\n` +
      `├ Status: ${escapeHtml(payload.status || "-")}\n` +
      `├ Jenis: ${jenis} | ${layanan} | ${regional}\n` +
      `├ Teknisi: ${escapeHtml((payload.teknisi ?? "").trim() || "-")}\n` +
      `└ Update: ${escapeHtml((payload.last_update ?? "").trim() || "-")}`
    );
  });
  const more = rows.length > 15 ? `\n\n…dan ${rows.length - 15} tiket lainnya.` : "";
  return mono(
    `🎫 TIKET BELUM CLOSE (total ${rows.length})\n\n` +
      `${statusLines}\n\n` +
      `${jenisLines}\n\n` +
      `${cards.join("\n\n")}${more}`,
  );
}

/** /rekap [bulan] [tahun] — rekap tiket dalam satu bulan. */
async function buildRekap(args: string[]): Promise<string> {
  const now = new Date();
  let monthIndex = now.getMonth();
  let year = now.getFullYear();

  for (const arg of args) {
    const numeric = Number(arg);
    if (Number.isFinite(numeric) && numeric >= 1000) {
      year = numeric;
    } else if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 12) {
      monthIndex = numeric - 1;
    } else {
      const found = BULAN.findIndex((b) => b.toLowerCase().startsWith(arg.toLowerCase()));
      if (found >= 0) monthIndex = found;
    }
  }

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .gte("tanggal_open", start.toISOString())
    .lt("tanggal_open", end.toISOString());

  if (error) {
    console.error(`Gagal rekap tiket: ${error.message}`);
    return "⚠️ Gagal mengambil rekap tiket.";
  }

  const rows = (data ?? []) as Row[];
  const label = `${BULAN[monthIndex]} ${year}`;
  if (rows.length === 0) return mono(`📊 REKAP ${escapeHtml(label).toUpperCase()}\n\nTidak ada tiket.`);

  const tally = (key: string) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = (row[key] ?? "-") || "-";
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => `• ${escapeHtml(name)}: ${total}`)
      .join("\n");
  };

  const closed = rows.filter((r) => CLOSED_STATUSES.includes(r["status"] ?? "")).length;
  const open = rows.length - closed;

  return mono(
    `📊 REKAP ${escapeHtml(label).toUpperCase()}\n\n` +
      `Total tiket : ${rows.length}\nClose       : ${closed}\nBelum close : ${open}\n\n` +
      `Per Status\n${tally("status")}\n\n` +
      `Per Layanan\n${tally("layanan")}\n\n` +
      `Per Regional\n${tally("regional")}`,
  );
}

/** /tiketclose — tiket yang close hari ini (berdasarkan tanggal close aktual). */
async function buildCloseToday(): Promise<string> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .gte("tanggal_close", start.toISOString())
    .lt("tanggal_close", end.toISOString())
    .order("tanggal_close", { ascending: true });

  if (error) {
    console.error(`Gagal ambil tiket close: ${error.message}`);
    return "⚠️ Gagal mengambil data tiket close.";
  }

  const rows = (data ?? []) as Row[];
  const label = fmtDate(start.toISOString()).slice(0, 10);
  if (rows.length === 0)
    return mono(`✅ TIKET CLOSE ${label}\n\nBelum ada tiket yang close hari ini.`);

  const cards = rows
    .slice(0, 15)
    .map(
      (row, index) =>
        `${index + 1}. ${buildTicketMessage(asPayload(row))}\n   Close: ${escapeHtml(fmtDate(row["tanggal_close"]))}`,
    );
  const more = rows.length > 15 ? `\n\n…dan ${rows.length - 15} tiket lainnya.` : "";
  return mono(`✅ TIKET CLOSE ${label} (total ${rows.length})\n\n${cards.join("\n\n")}${more}`);
}

/** /caritiket <kode> — cari tiket berdasarkan kode mantools / noxis / lokasi. */
async function buildCariTiket(query: string): Promise<string> {
  if (!query) return "🔍 Format: <code>/caritiket KODE_TIKET</code>";

  const supabase = getSupabase();
  const like = `%${query}%`;
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .or(
      `tiket_mantools.ilike.${like},tiket_noxis.ilike.${like},nama_lokasi.ilike.${like},customer.ilike.${like}`,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(`Gagal cari tiket: ${error.message}`);
    return "⚠️ Gagal mencari tiket.";
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return `🔍 Tiket <b>${escapeHtml(query)}</b> tidak ditemukan.`;

  const cards = rows.map(
    (row, index) =>
      `${index + 1}. ${buildTicketMessage(asPayload(row))}\n   Open : ${escapeHtml(fmtDate(row["tanggal_open"]))}\n   Close: ${escapeHtml(fmtDate(row["tanggal_close"]))}`,
  );
  return mono(
    `🔍 HASIL PENCARIAN "${escapeHtml(query)}" (${rows.length})\n\n${cards.join("\n\n")}`,
  );
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const telegramKey = process.env["TELEGRAM_API_KEY"];
        if (!telegramKey) return new Response("Not configured", { status: 503 });

        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(provided, deriveSecret(telegramKey))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const update = (await request.json()) as {
          message?: { chat?: { id?: number; title?: string; username?: string }; text?: string };
          edited_message?: {
            chat?: { id?: number; title?: string; username?: string };
            text?: string;
          };
        };

        const message = update.message ?? update.edited_message;
        const chatId = message?.chat?.id;
        if (!chatId) return Response.json({ ok: true, ignored: true });

        // Register the chat so new tickets can be pushed here.
        await getSupabase()
          .from("telegram_chats")
          .upsert(
            {
              chat_id: chatId,
              title: message?.chat?.title ?? message?.chat?.username ?? null,
              is_active: true,
            },
            { onConflict: "chat_id" },
          );

        const raw = (message?.text ?? "").trim();
        const parts = raw.split(/\s+/);
        const command = (parts[0] ?? "").toLowerCase().split("@")[0];
        const args = parts.slice(1);

        if (command === "/ping") {
          await reply(chatId, "🏓 Pong! Bot Reporting CC 3 aktif.");
        } else if (command === "/tiketopen") {
          await reply(chatId, await buildOpenTicketSummary());
        } else if (command === "/rekap") {
          await reply(chatId, await buildRekap(args));
        } else if (command === "/tiketclose") {
          await reply(chatId, await buildCloseToday());
        } else if (command === "/caritiket") {
          await reply(chatId, await buildCariTiket(args.join(" ")));
        } else if (command === "/start" || command === "/help") {
          await reply(
            chatId,
            "👋 Bot Reporting CC 3 siap.\n\n" +
              "/ping — cek bot aktif\n" +
              "/tiketopen — tiket yang belum close\n" +
              "/rekap [bulan] — rekap tiket per bulan (contoh: /rekap September)\n" +
              "/tiketclose — tiket close hari ini\n" +
              "/caritiket [kode] — cari tiket berdasarkan kode/lokasi\n\n" +
              "Notifikasi tiket baru akan dikirim ke chat ini.",
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
