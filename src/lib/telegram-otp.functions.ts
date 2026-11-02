import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendLoginOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: userData, error: userError } = await context.supabase.auth.getUser();
    if (userError || userData.user?.email?.toLowerCase() !== "ahmadarifrinaldi@gmail.com") {
      throw new Error("Email tidak memiliki akses");
    }
    const { data, error } = await (context.supabase as any).from("telegram_otp")
      .select("otp, expires_at")
      .eq("email", userData.user.email.toLowerCase())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error || !data || typeof data.otp !== "string" || !/^\d{6}$/.test(data.otp) ||
      !Number.isFinite(new Date(data.expires_at).getTime()) || new Date(data.expires_at).getTime() <= Date.now()) {
      throw new Error("Kode OTP tidak tersedia atau sudah kedaluwarsa");
    }
    const { telegramRequest } = await import("./telegram.server");
    await telegramRequest("sendMessage", {
      chat_id: -1004310653064,
      text: `🔐 <b>Kode Verifikasi Login CC3</b>\n\nKode OTP Anda: <code>${data.otp}</code>\n\nBerlaku selama 5 menit. Jangan berikan kode ini kepada siapa pun.`,
      parse_mode: "HTML",
    });
    return { sent: true };
  });