import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { filterCareCenterRows, type CareCenterSelection } from "@/lib/care-center-filter";
import { parseTelegramCommand, telegramCategoryLabel, openTicketResume } from "@/lib/telegram-report";

import { buildTicketMessage, mono, telegramRequest, type NewTicketPayload } from "@/lib/telegram.server";

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
  // Split long monospace reports on lines while preserving valid Telegram HTML.
  const isMono = text.startsWith("<pre>") && text.endsWith("</pre>");
  const body = isMono ? text.slice(5, -6) : text;
  let chunk = "";
  for (const line of body.split("\n")) {
    if (chunk.length + line.length + 1 > 3500 && chunk) {
      await telegramRequest("sendMessage", { chat_id: chatId, text: isMono ? mono(chunk) : chunk, parse_mode: "HTML" });
      chunk = "";
    }
    chunk += (chunk ? "\n" : "") + line;
  }
  if (chunk) await telegramRequest("sendMessage", { chat_id: chatId, text: isMono ? mono(chunk) : chunk, parse_mode: "HTML" });
}

async function readTickets(query: {
  range: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;
}): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw new Error(`Gagal mengambil tiket: ${error.message}`);
    rows.push(...(data ?? []) as Row[]);
    if (!data || data.length < 500) return rows;
  }
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Row = Record<string, string | null>;

const TICKET_FIELDS =
  "status, customer, nama_lokasi, tiket_mantools, tiket_noxis, tiket_epicor, layanan, jenis_ticket, regional, indikasi_gangguan, open_by, teknisi, last_update, tanggal_open, tanggal_close";

const asPayload = (row: Row): NewTicketPayload => ({
  status: row["status"] ?? "",
  customer: row["customer"] ?? "",
  nama_lokasi: row["nama_lokasi"] ?? "",
  tiket_mantools: row["tiket_mantools"] ?? "",
  tiket_noxis: row["tiket_noxis"] ?? "",
  tiket_epicor: row["tiket_epicor"] ?? "",
  layanan: row["layanan"] ?? "",
  jenis_ticket: row["jenis_ticket"] ?? "",
  regional: row["regional"] ?? "",
  indikasi_gangguan: row["indikasi_gangguan"] ?? "",
  open_by: row["open_by"] ?? "",
  teknisi: row["teknisi"] ?? "",
  last_update: row["last_update"] ?? "",
  tanggal_open: row["tanggal_open"] ?? null,
  tanggal_close: row["tanggal_close"] ?? null,
});

const fmtDate = (value: string | null | undefined) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

async function buildOpenTicketSummary(category: CareCenterSelection): Promise<string> {
  const rows = await readTickets(getSupabase().from("tickets").select(TICKET_FIELDS)
    .is("deleted_at", null).not("status", "in", '("Close","Technical Close")')
    .order("created_at", { ascending: true }).order("id", { ascending: true }));
  const resume = openTicketResume(rows, category);
  const lines = (items: [string, number][]) => items.map(([name, total]) => `• ${escapeHtml(name)}: ${total}`).join("\n");
  const cards = resume.rows.slice(0, 15).map((row, index) => `${index + 1}. ${buildTicketMessage(asPayload(row))}`);
  const more = resume.total > 15 ? `\n\n…dan ${resume.total - 15} tiket lainnya.` : "";
  return mono(`🎫 TIKET BELUM CLOSE (total ${resume.total})\n${telegramCategoryLabel(category)}\n\n` +
    `${lines(resume.statuses)}\n\n• CM: ${resume.cm}\n• PM: ${resume.pm}\n\nPer Layanan\n${lines(resume.services) || "-"}\n\n` +
    (resume.total ? `${cards.join("\n\n")}${more}` : "Tidak ada tiket yang masih open."));
}

/** /rekap [bulan] [tahun] — rekap tiket dalam satu bulan. */
async function buildRekap(args: string[], category: CareCenterSelection): Promise<string> {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  let monthIndex = now.getUTCMonth();
  let year = now.getUTCFullYear();

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

  const start = new Date(Date.UTC(year, monthIndex, 1, -7));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, -7));

  const supabase = getSupabase();
  const data = await readTickets(supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .gte("tanggal_open", start.toISOString())
    .lt("tanggal_open", end.toISOString()).order("id"));


  const rows = filterCareCenterRows(data, category, (row) => row["layanan"]);
  const label = `${BULAN[monthIndex]} ${year} · ${telegramCategoryLabel(category)}`;
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

/** /tiketclose [dd/mm/yyyy] — tiket yang close pada tanggal tertentu (default: hari ini WIB). */
async function buildCloseToday(args: string[], category: CareCenterSelection): Promise<string> {
  let day: number | undefined;
  let month: number | undefined;
  let year: number | undefined;

  const rawArg = args[0];
  if (rawArg) {
    const m = rawArg.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (m && m[1] && m[2] && m[3]) {
      day = parseInt(m[1], 10);
      month = parseInt(m[2], 10);
      year = parseInt(m[3], 10);
    }
  }

  // Jika tanpa argumen / format bebas, gunakan hari ini waktu WIB (UTC+7)
  if (!day || !month || !year) {
    const wibNow = new Date(Date.now() + 7 * 3600 * 1000);
    day = wibNow.getUTCDate();
    month = wibNow.getUTCMonth() + 1;
    year = wibNow.getUTCFullYear();
  }

  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `${pad(day)}/${pad(month)}/${year} · ${telegramCategoryLabel(category)}`;

  const supabase = getSupabase();
  const data = await readTickets(supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .gte("tanggal_close", start.toISOString())
    .lt("tanggal_close", end.toISOString())
    .order("tanggal_close", { ascending: true }).order("id"));


  const rows = filterCareCenterRows(data, category, (row) => row["layanan"]);
  if (rows.length === 0) return mono(`✅ TIKET CLOSE ${label}\n\nTidak ada tiket yang close pada tanggal ini.`);

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
async function buildCariTiket(query: string, category: CareCenterSelection): Promise<string> {
  if (!query) return "🔍 Format: <code>/caritiket KODE_TIKET</code>";

  const supabase = getSupabase();
  const like = `%${query.replace(/[%,()\\]/g, " ")}%`;
  const data = await readTickets(supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .or(
      `tiket_mantools.ilike.${like},tiket_noxis.ilike.${like},tiket_epicor.ilike.${like},nama_lokasi.ilike.${like},customer.ilike.${like}`,
    )
    .order("created_at", { ascending: false })
    .order("id"));


  const rows = filterCareCenterRows(data, category, (row) => row["layanan"]);
  if (rows.length === 0) return `🔍 Tiket <b>${escapeHtml(query)}</b> tidak ditemukan.`;

  const cards = rows.slice(0, 10).map(
    (row, index) =>
      `${index + 1}. ${buildTicketMessage(asPayload(row))}\n   Open : ${escapeHtml(fmtDate(row["tanggal_open"]))}\n   Close: ${escapeHtml(fmtDate(row["tanggal_close"]))}`,
  );
  return mono(`🔍 HASIL PENCARIAN "${escapeHtml(query)}" (${rows.length}) · ${telegramCategoryLabel(category)}\n\n${cards.join("\n\n")}`);
}
function formatDuration(ms: number): string {
  if (ms <= 0 || Number.isNaN(ms)) return "0 menit";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} menit`);
  return parts.join(" ");
}

/** /tiketterlama [bulan] [tahun] — 5 tiket CM close dengan durasi terlama dalam 1 bulan */
async function buildTiketTerlama(args: string[], category: CareCenterSelection): Promise<string> {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  let monthIndex = now.getUTCMonth();
  let year = now.getUTCFullYear();

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

  const start = new Date(Date.UTC(year, monthIndex, 1, -7));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, -7));
  const label = `${BULAN[monthIndex]} ${year} · ${telegramCategoryLabel(category)}`;

  const supabase = getSupabase();
  const data = await readTickets(supabase
    .from("tickets")
    .select(TICKET_FIELDS)
    .is("deleted_at", null)
    .in("status", ["Close", "Technical Close"])
    .eq("jenis_ticket", "Corrective Maintenance")
    .not("tanggal_open", "is", null)
    .not("tanggal_close", "is", null)
    .gte("tanggal_close", start.toISOString())
    .lt("tanggal_close", end.toISOString()).order("id"));


  const rows = filterCareCenterRows(data, category, (row) => row["layanan"]);
  if (rows.length === 0) {
    return mono(
      `⏱️ TOP 5 TIKET CM TERLAMA (${escapeHtml(label).toUpperCase()})\n\nTidak ada tiket CM yang close pada bulan ini.`,
    );
  }

  const withDuration = rows
    .map((row) => {
      const openTime = new Date(row["tanggal_open"] ?? "").getTime();
      const closeTime = new Date(row["tanggal_close"] ?? "").getTime();
      return { row, durationMs: closeTime - openTime };
    })
    .filter((item) => item.durationMs > 0)
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5);

  if (withDuration.length === 0) {
    return mono(`⏱️ TOP 5 TIKET CM TERLAMA (${escapeHtml(label).toUpperCase()})\n\nData durasi tiket tidak valid.`);
  }

  const cards = withDuration.map(({ row, durationMs }, index) => {
    return (
      `${index + 1}. ⏱️ Durasi: ${formatDuration(durationMs)}\n` +
      `   ${buildTicketMessage(asPayload(row))}\n` +
      `   Open : ${escapeHtml(fmtDate(row["tanggal_open"]))}\n` +
      `   Close: ${escapeHtml(fmtDate(row["tanggal_close"]))}`
    );
  });

  return mono(
    `⏱️ TOP 5 TIKET CM CLOSE TERLAMA\n` + `Periode: ${escapeHtml(label).toUpperCase()}\n\n` + cards.join("\n\n"),
  );
}

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const telegramKey = process.env["TELEGRAM_API_KEY"];
        const provided = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!telegramKey || !safeEqual(provided, deriveSecret(telegramKey))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const messageSchema = z.object({
          chat: z.object({ id: z.number().int(), title: z.string().max(256).optional(), username: z.string().max(256).optional() }),
          text: z.string().max(4096).optional(),
        });
        const parsed = z.object({ message: messageSchema.optional(), edited_message: messageSchema.optional() }).safeParse(await request.json());
        if (!parsed.success) return Response.json({ error: "Invalid update" }, { status: 400 });
        const update = parsed.data;
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
        const { command, args, category } = parseTelegramCommand(raw);

        if (command === "/ping") {
          await reply(chatId, `🏓 Pong! Bot Reporting CC 3 aktif.\n${telegramCategoryLabel(category)}`);
        } else if (command === "/tiketopen") {
          await reply(chatId, await buildOpenTicketSummary(category));
        } else if (command === "/rekap") {
          await reply(chatId, await buildRekap(args, category));
        } else if (command === "/tiketclose") {
          await reply(chatId, await buildCloseToday(args, category));
        } else if (command === "/tiketterlama") {
          await reply(chatId, await buildTiketTerlama(args, category));
        } else if (command === "/caritiket") {
          await reply(chatId, await buildCariTiket(args.join(" "), category));
        } else if (command === "/start" || command === "/help") {
          await reply(
            chatId,
            `👋 Bot Reporting CC 3 siap.\n${telegramCategoryLabel(category)}\n\n` +
              "/ping — cek bot aktif\n" +
              "/opentiket [vsat/nonvsat] — tiket belum close (alias /tiketopen)\n" +
              "/rekap [vsat/nonvsat] [bulan] [tahun] — rekap bulanan\n" +
              "/tiketclose [vsat/nonvsat] [dd/mm/yyyy] — tiket close\n" +
              "/tiketterlama [vsat/nonvsat] [bulan] [tahun] — top 5 CM\n" +
              "/caritiket [vsat/nonvsat] [kode] — cari kode/lokasi\n\n" +
              "Tanpa kategori: gabungan Vsat dan Non-Vsat.\n\n" +
              "Notifikasi tiket baru akan dikirim ke chat ini.",
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
