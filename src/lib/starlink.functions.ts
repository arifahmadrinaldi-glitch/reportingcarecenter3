import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readStarlinkSnapshot } from "./starlink.server";

// No browser credential inputs. Wire the approved service-account adapter here
// only after its API contract and secure connector have been configured.
export const syncStarlink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => readStarlinkSnapshot());