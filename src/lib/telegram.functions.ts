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