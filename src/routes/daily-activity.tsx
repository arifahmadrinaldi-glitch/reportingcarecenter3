import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Copy, Plus, Save, Send, Trash2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currentShift, officersOn, SHIFT_INFO, type ShiftKey } from "@/lib/handover";
import { initializeSchedule, type ScheduleData } from "@/lib/schedule";
import { sendHandover } from "@/lib/telegram.functions";

export const Route = createFileRoute("/daily-activity")({
  head: () => ({ meta: [{ title: "Daily Checklist — Care Center Telkomsat" }] }),
  component: DailyChecklistPage,
});

type ToolStatus = "normal" | "warning" | "critical" | "uncheck";
type Item = { id: string; name: string; cat: string; status: ToolStatus; notes: string; ticket: string };

const TOOLS: Item[] = [
  { id: "prtg", name: "PRTG Network Monitor", cat: "NMS", status: "uncheck", notes: "", ticket: "" },
  { id: "mantools", name: "Mantools OSS Telkom", cat: "Trouble Ticket", status: "uncheck", notes: "", ticket: "" },
  { id: "noxis", name: "Noxis Monitoring", cat: "Alarm", status: "uncheck", notes: "", ticket: "" },
  { id: "epicor", name: "Epicor Service Desk", cat: "Tiket", status: "uncheck", notes: "", ticket: "" },
  { id: "starlink", name: "Starlink Portal", cat: "Portal", status: "uncheck", notes: "", ticket: "" },
  { id: "nms_vsat", name: "NMS Hub VSAT", cat: "VSAT", status: "uncheck", notes: "", ticket: "" },
  { id: "nms_ip", name: "NMS IP / Backbone", cat: "Core", status: "uncheck", notes: "", ticket: "" },
  { id: "bot_telegram", name: "Bot Telegram (@CC3Notif_bot)", cat: "Alert", status: "uncheck", notes: "", ticket: "" },
  { id: "carecenter_web", name: "Web Care Center Telkomsat", cat: "Web", status: "uncheck", notes: "", ticket: "" },
  { id: "db_supabase", name: "Database & Server API", cat: "Infra", status: "uncheck", notes: "", ticket: "" },
];

export function DailyChecklistPage() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<ShiftKey>(() => currentShift(new Date()).shift);
  const [onDuty, setOnDuty] = useState("");
  const [items, setItems] = useState<Item[]>(TOOLS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const month = date.slice(0, 7);
  const { data: sched } = useQuery({
    queryKey: ["schedule", month],
    queryFn: async () => (await supabase.from("schedules").select("data").eq("period", month).maybeSingle()).data?.data as ScheduleData | undefined,
  });

  const roster = useMemo(() => {
    if (!sched) return [];
    const full = initializeSchedule(sched, undefined, month);
    const slot = currentShift(new Date(`${date}T${SHIFT_INFO[shift].start + 1}:00:00`));
    return Array.from(new Set([...officersOn(full, slot), ...officersOn(full?.business, slot)]));
  }, [sched, month, date, shift]);

  useEffect(() => {
    if (!onDuty && roster.length) setOnDuty(roster.join(", "));
  }, [roster, onDuty]);

  const periodKey = `checklist_${date}_${shift}`;
  const { data: saved, isFetching: loading, refetch } = useQuery({
    queryKey: ["daily-checklist", periodKey],
    queryFn: async () => (await supabase.from("schedules").select("*").eq("title", "daily_checklist").eq("period", periodKey).maybeSingle()).data,
  });

  useEffect(() => {
    if (saved) {
      setRecordId(saved.id);
      const p = saved.data as { onDuty?: string; items?: Item[] };
      if (p?.onDuty) setOnDuty(p.onDuty);
      if (p?.items?.length) setItems(p.items);
    } else {
      setRecordId(null);
      setItems(TOOLS);
    }
  }, [saved]);

  const summary = useMemo(() => {
    const total = items.length;
    const normal = items.filter((i) => i.status === "normal").length;
    const warning = items.filter((i) => i.status === "warning").length;
    const critical = items.filter((i) => i.status === "critical").length;
    const checked = normal + warning + critical;
    return { total, normal, warning, critical, checked, percent: total ? Math.round((checked / total) * 100) : 0 };
  }, [items]);

  const setStatus = (id: string, s: ToolStatus) => setItems((p) => p.map((i) => (i.id === id ? { ...i, status: s } : i)));
  const setField = (id: string, f: "notes" | "ticket", v: string) => setItems((p) => p.map((i) => (i.id === id ? { ...i, [f]: v } : i)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { date, shift, onDuty, items, savedAt: new Date().toISOString() };
      if (recordId) {
        const { error } = await supabase.from("schedules").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", recordId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("schedules").insert({ title: "daily_checklist", period: periodKey, data: payload }).select("id").single();
        if (error) throw error;
        if (data) setRecordId(data.id);
      }
      await refetch();
      toast.success("Checklist tersimpan!");
    } catch (e) {
      toast.error("Gagal simpan", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };
    const reportText = () => {
    const lines = [
      `📋 *DAILY CHECKLIST TOOLS MONITORING*`,
      `🏢 Care Center Telkomsat`,
      `📅 *Tanggal:* ${date} | *Shift:* ${SHIFT_INFO[shift]?.label || shift}`,
      `👤 *Petugas:* ${onDuty || "-"}`,
      `📊 *Status:* ${summary.checked}/${summary.total} Selesai (${summary.percent}%)`,
      `✅ Normal: ${summary.normal} | ⚠️ Warning: ${summary.warning} | ❌ Down: ${summary.critical}`,
      `━━━━━━━━━━━━━━━━━━━━`,
    ];
    items.forEach((i, idx) => {
      const icon = i.status === "normal" ? "✅" : i.status === "warning" ? "⚠️" : i.status === "critical" ? "❌" : "⚪";
      let t = `${idx + 1}. ${icon} *${i.name}*`;
      if (i.notes) t += ` - ${i.notes}`;
      if (i.ticket) t += ` [Tiket: ${i.ticket}]`;
      lines.push(t);
    });
    lines.push(`━━━━━━━━━━━━━━━━━━━━\n_Dilaporkan via Reporting Care Center_`);
    return lines.join("\n");
  };

  const handleSendTelegram = async () => {
    setSending(true);
    try {
      await handleSave();
      await sendHandover({ data: { text: reportText() } });
      toast.success("Terkirim ke Telegram!");
    } catch (e) {
      toast.error("Gagal kirim Telegram", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell
      title="Daily Checklist"
      subtitle="Monitoring berkala kesehatan tools operasional per shift"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(reportText()); toast.success("Disalin!"); }}>
            <Copy className="size-3.5 mr-1" /> Salin
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSendTelegram} disabled={sending} className="border border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300">
            <Send className="size-3.5 mr-1" /> {sending ? "Mengirim…" : "Kirim Telegram"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="size-3.5 mr-1" /> {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Kontrol */}
        <div className="panel p-3.5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Tanggal</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-8 text-xs bg-surface" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Shift</label>
            <Select value={shift} onValueChange={(v) => setShift(v as ShiftKey)}>
              <SelectTrigger className="mt-1 h-8 text-xs bg-surface"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="P">Pagi (07:00 - 15:00)</SelectItem>
                <SelectItem value="S">Siang (15:00 - 23:00)</SelectItem>
                <SelectItem value="M">Malam (23:00 - 07:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>
                    <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Petugas On-Duty</label>
            <div className="mt-1 flex gap-2">
              <Input value={onDuty} onChange={(e) => setOnDuty(e.target.value)} placeholder="Nama petugas..." className="h-8 text-xs bg-surface flex-1" />
              {roster.length > 0 && (
                <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] shrink-0" onClick={() => setOnDuty(roster.join(", "))}>
                  Ikuti Jadwal
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-5">
          <div className="panel p-3 col-span-2 sm:col-span-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Progres</span>
            <div className="mt-0.5 flex items-baseline justify-between"><span className="text-lg font-bold">{summary.percent}%</span><span className="text-[10px] text-muted-foreground">{summary.checked}/{summary.total}</span></div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${summary.percent}%` }} /></div>
          </div>
          <div className="panel p-3 border-l-4 border-l-emerald-500">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Normal</span>
            <div className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.normal}</div>
          </div>
          <div className="panel p-3 border-l-4 border-l-amber-500">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Warning</span>
            <div className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">{summary.warning}</div>
          </div>
          <div className="panel p-3 border-l-4 border-l-red-500">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Down</span>
            <div className="mt-0.5 text-lg font-bold text-red-600 dark:text-red-400">{summary.critical}</div>
          </div>
          <div className="panel p-3 flex items-center justify-between col-span-2 sm:col-span-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1 mr-1.5" onClick={() => { setItems((p) => p.map((i) => ({ ...i, status: "normal" }))); toast.success("Semua OK"); }}>
              <CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Semua OK
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setItems((p) => [...p, { id: `custom_${Date.now()}`, name: "Tools Baru", cat: "Custom", status: "uncheck", notes: "", ticket: "" }])}>
              <Plus className="size-3" />
            </Button>
          </div>
        </div>
                {/* List Tools */}
        <div className="panel overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-3.5 py-2.5 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase">Daftar Tools Monitoring ({items.length})</h2>
            {loading && <span className="text-[10px] text-muted-foreground animate-pulse">Memuat…</span>}
          </div>

          <div className="divide-y divide-border">
            {items.map((i, idx) => (
              <div key={i.id} className={`p-3 grid gap-2.5 sm:grid-cols-[180px_1fr_auto] sm:items-center ${i.status === "critical" ? "bg-red-500/10" : i.status === "warning" ? "bg-amber-500/10" : "bg-surface"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5"><span className="text-[10px] font-bold text-muted-foreground">{idx + 1}.</span><span className="rounded bg-muted px-1 text-[9px] font-semibold text-muted-foreground uppercase">{i.cat}</span></div>
                  <h3 className="text-xs font-semibold truncate mt-0.5">{i.name}</h3>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-[1fr_130px]">
                  <Input value={i.notes} onChange={(e) => setField(i.id, "notes", e.target.value)} placeholder="Catatan temuan…" className="h-7 text-xs bg-background" />
                  <Input value={i.ticket} onChange={(e) => setField(i.id, "ticket", e.target.value)} placeholder="No Tiket" className="h-7 text-xs bg-background" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => setStatus(i.id, "normal")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "normal" ? "bg-emerald-600 text-white" : "border bg-background text-muted-foreground"}`}>OK</button>
                  <button type="button" onClick={() => setStatus(i.id, "warning")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "warning" ? "bg-amber-600 text-white" : "border bg-background text-muted-foreground"}`}>Warn</button>
                  <button type="button" onClick={() => setStatus(i.id, "critical")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "critical" ? "bg-red-600 text-white" : "border bg-background text-muted-foreground"}`}>Down</button>
                  {i.id.startsWith("custom_") && (
                    <button type="button" onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
