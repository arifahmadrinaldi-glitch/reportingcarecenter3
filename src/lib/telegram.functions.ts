import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";

import type { NewTicketPayload } from "./telegram.server";

export const notifyNewTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewTicketPayload) => input)
  .handler(async ({ data }) => {
    const { sendTelegramTicket } = await import("./telegram.server");
    return sendTelegramTicket(data);
  });
export const sendHandover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    if (typeof input?.text !== "string" || !input.text.trim() || input.text.length > 20000) throw new Error("Teks handover tidak valid");
    return { text: input.text };
  })
  .handler(async ({ data }) => {
    const { sendTelegramHandover } = await import("./telegram.server");
    return sendTelegramHandover(data.text);
  });
