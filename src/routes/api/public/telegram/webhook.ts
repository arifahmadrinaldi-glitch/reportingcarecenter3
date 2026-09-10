import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "crypto";

import { OPEN_STATUSES } from "@/lib/ticket-constants";

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

async function buildOpenTicketSummary(): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("tickets")
    .select("status, customer, nama_lokasi, tiket_mantools, layanan, regional, last_update")
    .is("deleted_at", null)
    .not("status", "in", '("Close","Technical Close")')
    .order("created_at", { ascending: true })
    .limit(40);

  if (error) {
    console.error(`Gagal ambil tiket: ${error.message}`);
    return "⚠️ Gagal mengambil data tiket.";
  }

  const rows = (data ?? []) as Array<Record<string, string | null>>;
  if (rows.length === 0) return "✅ Tidak ada tiket yang masih open.";

  const counts = new Map<string, number>();
  for (const row of rows) {
    const status = row["status"] ?? "-";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  const recap = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([status, total]) => `• ${escapeHtml(status)}: <b>${total}</b>`)
    .join("\n");

  const details = rows
    .slice(0, 15)
    .map((row, index) => {
      const parts = [
        `${index + 1}. <b>${escapeHtml(row["nama_lokasi"] ?? "-")}</b>`,
        `   Customer: ${escapeHtml(row["customer"] ?? "-")}`,
        `   Status: ${escapeHtml(row["status"] ?? "-")}`,
        `   Tiket: ${escapeHtml(row["tiket_mantools"] ?? "-")} | ${escapeHtml(row["layanan"] ?? "-")} | ${escapeHtml(row["regional"] ?? "-")}`,
      ];
      if (row["last_update"]) parts.push(`   Update: ${escapeHtml(row["last_update"])}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const more = rows.length > 15 ? `\n\n…dan ${rows.length - 15} tiket lainnya.` : "";
  const activeInfo = `\n\n<i>Status open: ${OPEN_STATUSES.join(", ")}, dan status Pending.</i>`;

  return `🎫 <b>Tiket Belum Close</b> (total ${rows.length})\n\n${recap}\n\n${details}${more}${activeInfo}`;
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
          edited_message?: { chat?: { id?: number }; text?: string };
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

        const text = (message?.text ?? "").trim().toLowerCase().split(/\s|@/)[0];

        if (text === "/ping") {
          await reply(chatId, "🏓 Pong! Bot Reporting CC 3 aktif.");
        } else if (text === "/tiketopen") {
          await reply(chatId, await buildOpenTicketSummary());
        } else if (text === "/start" || text === "/help") {
          await reply(
            chatId,
            "👋 Bot Reporting CC 3 siap.\n\n/ping — cek bot aktif\n/tiketopen — resume tiket yang belum close\n\nNotifikasi tiket baru akan dikirim ke chat ini.",
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
