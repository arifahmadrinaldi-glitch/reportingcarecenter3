import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PrtgSensor = { objid: string; device: string; sensor: string; status: string; lastvalue: string };

export const listPrtgSensors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ url: z.string().url().max(500), token: z.string().max(500) }).parse(d))
  .handler(async ({ data }): Promise<{ sensors: PrtgSensor[]; error?: string }> => {
    const base = data.url.replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(base)) return { sensors: [], error: "URL tidak valid" };
    const auth = data.token
      ? data.token.length > 20 ? `&apitoken=${encodeURIComponent(data.token)}` : `&passhash=${encodeURIComponent(data.token)}`
      : "";
    try {
      const res = await fetch(`${base}/api/table.json?content=sensors&columns=objid,device,sensor,status,lastvalue&count=5000${auth}`);
      if (!res.ok) return { sensors: [], error: `PRTG membalas ${res.status}` };
      const json = (await res.json()) as { sensors?: Record<string, unknown>[] };
      const sensors = (json.sensors ?? []).map((s) => ({
        objid: String(s.objid ?? ""), device: String(s.device ?? ""), sensor: String(s.sensor ?? ""),
        status: String(s.status ?? ""), lastvalue: String(s.lastvalue ?? ""),
      }));
      return { sensors };
    } catch (e) {
      console.error("PRTG fetch failed", e);
      return { sensors: [], error: "Gagal menghubungi server PRTG" };
    }
  });
