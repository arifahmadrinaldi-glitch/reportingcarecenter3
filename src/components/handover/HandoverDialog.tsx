import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { buildHandover, currentShift, nextShift, officersOn, periodOf } from "@/lib/handover";
import { initializeSchedule, type ScheduleData } from "@/lib/schedule";
import { sendHandover } from "@/lib/telegram.functions";
import type { TicketCategory, TicketRow } from "@/lib/ticket-constants";

export function HandoverDialog({ open, onOpenChange, tickets, category }: {
  open: boolean; onOpenChange: (v: boolean) => void; tickets: TicketRow[]; category: TicketCategory;
}) {
  const [cat, setCat] = useState<TicketCategory>(category);
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { if (open) { setCat(category); setNow(new Date()); } }, [open, category]);

  const current = currentShift(now);
  const next = nextShift(current);
  const periods = [...new Set([periodOf(current.date), periodOf(next.date)])];
  const sched = useQuery({
    queryKey: ["handover-schedules", ...periods],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("schedules").select("period,data").in("period", periods);
      if (error) throw error;
      const map: Record<string, ScheduleData> = {};
      for (const row of data ?? []) map[row.period] = initializeSchedule(row.data as unknown as ScheduleData, undefined, row.period);
      return map;
    },
  });
  const pick = (period: string) => {
    const d = sched.data?.[period];
    return cat === "vsat" ? d : d?.business;
  };
  const outgoing = officersOn(pick(periodOf(current.date)), current);
  const incoming = officersOn(pick(periodOf(next.date)), next);
  const text = useMemo(
    () => buildHandover({ tickets, category: cat, now, current, next, outgoing, incoming, notes }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tickets, cat, now, notes, sched.data],
  );

  const copy = async () => { await navigator.clipboard.writeText(text); toast.success("Teks handover disalin"); };
  const send = async () => {
    setSending(true);
    try { await sendHandover({ data: { text } }); toast.success("Handover terkirim ke Telegram"); }
    catch (e) { toast.error("Gagal kirim ke Telegram", { description: e instanceof Error ? e.message : String(e) }); }
    finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Handover Shift</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={cat} onValueChange={(v) => setCat(v as TicketCategory)}>
            <SelectTrigger className="w-56" aria-label="Care Center"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vsat">Care Center Vsat</SelectItem>
              <SelectItem value="non-vsat">Care Center Non-Vsat</SelectItem>
            </SelectContent>
          </Select>
          {sched.isPending ? <span className="text-xs text-muted-foreground">Membaca jadwal…</span> : null}
          {!sched.isPending && !outgoing.length && !incoming.length ? <span className="text-xs text-muted-foreground">Jadwal bulan ini belum tersimpan</span> : null}
        </div>
        <label className="text-xs font-semibold uppercase text-muted-foreground">Catatan Aktivitas Penting</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Tulis catatan penting untuk shift berikutnya…" />
        <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 font-mono text-[11px]">{text}</pre>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={copy}><Copy className="size-4" /> Salin Teks</Button>
          <Button onClick={send} disabled={sending}><Send className="size-4" /> {sending ? "Mengirim…" : "Kirim ke Telegram"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
