import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";
import { currentShift, officersOn, SHIFT_INFO, type ShiftKey } from "@/lib/handover";
import { initializeSchedule, type ScheduleData } from "@/lib/schedule";

export const Route = createFileRoute("/daily-activity")({
  head: () => ({ meta: [{ title: "Daily Checklist — Care Center Telkomsat" }] }),
  component: DailyChecklistPage,
});

type ToolStatus = "normal" | "warning" | "critical" | "uncheck";

const CATEGORIES = ["NMS HUB", "PRTG", "NETFLOW", "CACTI", "NAGIOS", "LIBRE", "STARMON", "LAIN-LAIN"] as const;
const CATEGORY_GROUPS: { label: string; categories: readonly string[] }[] = [
  { label: "NMS HUB", categories: ["NMS HUB"] },
  { label: "PRTG", categories: ["PRTG"] },
  { label: "STARMON, NETFLOW, LIBRE, CACTI", categories: ["STARMON", "NETFLOW", "LIBRE", "CACTI"] },
  { label: "NAGIOS", categories: ["NAGIOS"] },
  { label: "LAIN-LAIN", categories: ["LAIN-LAIN"] },
];

type Item = {
  id: string;
  name: string;
  cat: string;
  url?: string;
  status: ToolStatus;
  notes: string;
  ticket: string;
};

const DEFAULT_TOOLS: Item[] = [];

export function DailyChecklistPage() {
  const { isAdmin } = useAccess();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<ShiftKey>(() => currentShift(new Date()).shift);
  const [onDuty, setOnDuty] = useState("");
  const [items, setItems] = useState<Item[]>(DEFAULT_TOOLS);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id?: string; name: string; cat: string; url: string } | null>(null);

  const month = date.slice(0, 7);
  const { data: sched } = useQuery({
    queryKey: ["schedule", month],
    queryFn: async () => (await supabase.from("schedules").select("data").eq("period", month).maybeSingle()).data?.data as ScheduleData | undefined,
  });

  const roster = useMemo(() => {
    if (!sched) return [];
    const full = initializeSchedule(sched, undefined, month);
    const [y, m, d] = date.split("-").map(Number);
    const slot = {
      shift,
      date: new Date(y, m - 1, d),
      start: new Date(y, m - 1, d, SHIFT_INFO[shift].start),
      end: new Date(y, m - 1, d, SHIFT_INFO[shift].end),
    };
    return Array.from(new Set([...officersOn(full, slot), ...officersOn(full?.business, slot)]));
  }, [sched, month, date, shift]);

  const { data: masterRow, refetch: refetchMaster } = useQuery({
    queryKey: ["daily-checklist-master-tools"],
    queryFn: async () => (await supabase.from("schedules").select("*").eq("title", "daily_checklist_tools").eq("period", "master").maybeSingle()).data,
  });

  const masterTools: Item[] = useMemo(() => {
    if (masterRow && Array.isArray(masterRow.data)) return masterRow.data as Item[];
    try {
      const local = localStorage.getItem("daily_checklist_master_tools");
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_TOOLS;
  }, [masterRow]);

  const saveMasterTools = async (updatedTools: Item[]): Promise<boolean> => {
    const stripped = updatedTools.map((t) => ({
      id: t.id,
      name: t.name,
      cat: t.cat,
      url: t.url || "",
      status: "uncheck" as ToolStatus,
      notes: "",
      ticket: "",
    }));
    const { error } = masterRow?.id
      ? await supabase.from("schedules").update({ data: stripped, updated_at: new Date().toISOString() }).eq("id", masterRow.id)
      : await supabase.from("schedules").insert({ title: "daily_checklist_tools", period: "master", data: stripped });
    if (error) {
      console.error("Gagal menyimpan master monitoring:", error);
      toast.error(`Gagal menyimpan daftar monitoring: ${error.message}`);
      return false;
    }
    try {
      localStorage.setItem("daily_checklist_master_tools", JSON.stringify(stripped));
    } catch {
      // Penyimpanan browser lokal tidak tersedia; data utama sudah tersimpan di Supabase.
    }
    await refetchMaster();
    return true;
  };

  const periodKey = `checklist_${date}_${shift}`;
  const { data: saved } = useQuery({
    queryKey: ["daily-checklist", periodKey],
    queryFn: async () => (await supabase.from("schedules").select("*").eq("title", "daily_checklist").eq("period", periodKey).maybeSingle()).data,
  });

  useEffect(() => {
    if (saved) {
      setRecordId(saved.id);
      const p = saved.data as { onDuty?: string; items?: Item[] };
      setOnDuty(p?.onDuty || roster.join(", "));
      if (Array.isArray(p?.items)) {
        const savedMap = new Map(p.items.map((i) => [i.id, i]));
        setItems(masterTools.map((m) => {
          const prev = savedMap.get(m.id);
          return { ...m, status: prev?.status || ("uncheck" as ToolStatus), notes: prev?.notes || "", ticket: prev?.ticket || "" };
        }));
      } else {
        setItems(masterTools.map((m) => ({ ...m, status: "uncheck" as ToolStatus, notes: "", ticket: "" })));
      }
    } else {
      setRecordId(null);
      setOnDuty(roster.join(", "));
      setItems(masterTools.map((m) => ({ ...m, status: "uncheck" as ToolStatus, notes: "", ticket: "" })));
    }
  }, [saved, masterTools, roster]);

  const summary = useMemo(() => {
    const total = items.length;
    const normal = items.filter((i) => i.status === "normal").length;
    const warning = items.filter((i) => i.status === "warning").length;
    const critical = items.filter((i) => i.status === "critical").length;
    const checked = normal + warning + critical;
    return { total, normal, warning, critical, checked, percent: total ? Math.round((checked / total) * 100) : 0 };
  }, [items]);

  const saveChecklistData = async (itemsToSave: Item[], dutyToSave: string) => {
    setSaveStatus("saving");
    try {
      const payload = { date, shift, onDuty: dutyToSave, items: itemsToSave, savedAt: new Date().toISOString() };
      if (recordId) {
        await supabase.from("schedules").update({ data: payload, updated_at: new Date().toISOString() }).eq("id", recordId);
      } else {
        const { data } = await supabase.from("schedules").insert({ title: "daily_checklist", period: periodKey, data: payload }).select("id").single();
        if (data?.id) setRecordId(data.id);
      }
      setSaveStatus("saved");
    } catch (e) {
      console.error("Auto-save error:", e);
      setSaveStatus("idle");
    }
  };

  const triggerAutoSave = (itemsToSave: Item[], dutyToSave: string, debounceMs = 0) => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (debounceMs > 0) {
      setSaveStatus("saving");
      autoSaveTimerRef.current = setTimeout(() => saveChecklistData(itemsToSave, dutyToSave), debounceMs);
    } else {
      saveChecklistData(itemsToSave, dutyToSave);
    }
  };

  const setStatus = (id: string, s: ToolStatus) => {
    setItems((p) => {
      const updated = p.map((i) => i.id === id ? { ...i, status: i.status === s ? "uncheck" : s } : i);
      triggerAutoSave(updated, onDuty, 0);
      return updated;
    });
  };
  const draggedItemIdRef = useRef<string | null>(null);

const handleItemDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
  draggedItemIdRef.current = id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", id);
};

const handleItemDragOver = (event: DragEvent<HTMLDivElement>) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const handleItemDrop = async (event: DragEvent<HTMLDivElement>, targetId: string) => {
  event.preventDefault();

  const sourceId =
    draggedItemIdRef.current || event.dataTransfer.getData("text/plain");
  draggedItemIdRef.current = null;

  if (!sourceId || sourceId === targetId) return;

  const source = items.find((item) => item.id === sourceId);
  const target = items.find((item) => item.id === targetId);

  // Hanya izinkan pindah urutan dalam kategori asli yang sama.
  if (!source || !target || source.cat !== target.cat) return;

  const categoryItems = items.filter((item) => item.cat === source.cat);
  const fromIndex = categoryItems.findIndex((item) => item.id === sourceId);
  const toIndex = categoryItems.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || toIndex < 0) return;

  const reorderedCategory = [...categoryItems];
  const [movedItem] = reorderedCategory.splice(fromIndex, 1);
  reorderedCategory.splice(toIndex, 0, movedItem);

  let categoryIndex = 0;
  const updated = items.map((item) =>
    item.cat === source.cat ? reorderedCategory[categoryIndex++] : item
  );

  setItems(updated);

  const masterSaved = await saveMasterTools(updated);
  if (!masterSaved) return;

  await saveChecklistData(updated, onDuty);
};

  const setField = (id: string, f: "notes" | "ticket", v: string) => {
    setItems((p) => {
      const updated = p.map((i) => i.id === id ? { ...i, [f]: v } : i);
      triggerAutoSave(updated, onDuty, 600);
      return updated;
    });
  };

  const handleOpenAdd = (defaultCat = "PRTG") => {
    setEditingItem({ name: "", cat: defaultCat, url: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem({ id: item.id, name: item.name, cat: item.cat, url: item.url || "" });
    setDialogOpen(true);
  };

  const handleSaveItemModal = async () => {
    if (!editingItem || !editingItem.name.trim()) {
      toast.error("Nama monitoring wajib diisi");
      return;
    }
    let updated: Item[];
    if (editingItem.id) {
      updated = items.map((i) => i.id === editingItem.id ? { ...i, name: editingItem.name.trim(), cat: editingItem.cat, url: editingItem.url.trim() } : i);
      toast.success("Monitoring diperbarui");
    } else {
      const newItem: Item = {
        id: `tool_${Date.now()}`,
        name: editingItem.name.trim(),
        cat: editingItem.cat,
        url: editingItem.url.trim(),
        status: "uncheck",
        notes: "",
        ticket: "",
      };
      updated = [...items, newItem];
      toast.success("Monitoring ditambahkan");
    }
    setItems(updated);
    setDialogOpen(false);
    setEditingItem(null);
    const masterSaved = await saveMasterTools(updated);
    if (!masterSaved) return;
    await saveChecklistData(updated, onDuty);
  };

  const handleDeleteItem = async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    toast.info("Monitoring dihapus");
    const masterSaved = await saveMasterTools(updated);
    if (!masterSaved) return;
    await saveChecklistData(updated, onDuty);
  };

  return (
    <AppShell
      title="Daily Checklist"
      subtitle="Monitoring tools operasional"
      actions={
        <div className="flex items-center gap-2 text-xs">
          {saveStatus === "saving" && <span className="flex items-center gap-1.5 text-amber-500 font-medium"><span className="size-2 rounded-full bg-amber-500 animate-pulse" /> Menyimpan...</span>}
          {saveStatus === "saved" && <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium"><CheckCircle2 className="size-3.5" /> Tersimpan otomatis</span>}
          {saveStatus === "idle" && <span className="text-[11px] text-muted-foreground">Auto-save aktif</span>}
        </div>
      }
    >
      <div className="space-y-4">
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
              {roster.length > 0 && <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] shrink-0" onClick={() => setOnDuty(roster.join(", "))}>Ikuti Jadwal</Button>}
            </div>
          </div>
        </div>

        <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-5">
          <div className="panel p-3 col-span-2 sm:col-span-1">
            <span className="text-[9px] font-semibold text-muted-foreground uppercase">Progres</span>
            <div className="mt-0.5 flex items-baseline justify-between"><span className="text-lg font-bold">{summary.percent}%</span><span className="text-[10px] text-muted-foreground">{summary.checked}/{summary.total}</span></div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${summary.percent}%` }} /></div>
          </div>
          <div className="panel p-3 border-l-4 border-l-emerald-500"><span className="text-[9px] font-semibold text-muted-foreground uppercase">Normal</span><div className="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">{summary.normal}</div></div>
          <div className="panel p-3 border-l-4 border-l-amber-500"><span className="text-[9px] font-semibold text-muted-foreground uppercase">Warning</span><div className="mt-0.5 text-lg font-bold text-amber-600 dark:text-amber-400">{summary.warning}</div></div>
          <div className="panel p-3 border-l-4 border-l-red-500"><span className="text-[9px] font-semibold text-muted-foreground uppercase">Down</span><div className="mt-0.5 text-lg font-bold text-red-600 dark:text-red-400">{summary.critical}</div></div>
          <div className="panel p-3 flex items-center justify-between col-span-2 sm:col-span-1">
            <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1 mr-1.5" onClick={() => {
              const updated = items.map((i) => ({ ...i, status: "normal" as ToolStatus }));
              setItems(updated);
              triggerAutoSave(updated, onDuty);
              toast.success("Semua OK");
            }}><CheckCircle2 className="size-3 mr-1 text-emerald-600" /> Semua OK</Button>
            {isAdmin && <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => handleOpenAdd("PRTG")} title="Tambah Monitoring Baru"><Plus className="size-3 mr-1" /> Tambah</Button>}
          </div>
        </div>

        <div className="columns-1 md:columns-2 gap-4">
          {CATEGORY_GROUPS.map(({ label, categories }) => {
            const catItems = items.filter((i) => categories.includes(i.cat));
            return (
              <div key={label} className="panel mb-4 overflow-hidden break-inside-avoid">
                <div className="border-b border-border bg-muted/40 px-3.5 py-2.5 flex items-center">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-2 rounded-full bg-primary" />
                    <h2 className="text-xs font-bold uppercase tracking-wider">{label}</h2>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{catItems.filter((i) => i.status !== "uncheck").length}/{catItems.length}</span>
                  </div>
                </div>
                {catItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Belum ada monitoring di kategori ini.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {catItems.map((i, idx) => (
                      <div
  key={i.id}
  draggable={isAdmin}
  onDragStart={(event) => handleItemDragStart(event, i.id)}
  onDragOver={handleItemDragOver}
  onDrop={(event) => {
    void handleItemDrop(event, i.id);
  }}
  onDragEnd={() => {
    draggedItemIdRef.current = null;
  }}
  className={`p-3 grid gap-2.5 sm:grid-cols-[170px_1fr_auto] sm:items-center ${
    i.status === "critical"
      ? "bg-red-500/10"
      : i.status === "warning"
        ? "bg-amber-500/10"
        : "bg-surface"
  }`}
>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground">{idx + 1}.</span>
                            {i.url ? <a href={i.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 truncate" title={`Buka ${i.url}`}><span className="truncate">{i.name}</span><ExternalLink className="size-3 shrink-0 opacity-70" /></a> : <h3 className="text-xs font-semibold truncate">{i.name}</h3>}
                          </div>
                          {i.url && <p className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">{i.url}</p>}
                        </div>
                        <div className="grid gap-1.5 sm:grid-cols-[1fr_90px]">
                          <Input value={i.notes} onChange={(e) => setField(i.id, "notes", e.target.value)} placeholder="Catatan temuan…" className="h-7 text-xs bg-background" />
                          <Input value={i.ticket} onChange={(e) => setField(i.id, "ticket", e.target.value)} placeholder="No Tiket" className="h-7 text-xs bg-background" />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => setStatus(i.id, "normal")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "normal" ? "bg-emerald-600 text-white" : "border bg-background text-muted-foreground"}`}>OK</button>
                          <button type="button" onClick={() => setStatus(i.id, "warning")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "warning" ? "bg-amber-600 text-white" : "border bg-background text-muted-foreground"}`}>Warn</button>
                          <button type="button" onClick={() => setStatus(i.id, "critical")} className={`px-2 py-1 text-[11px] font-semibold rounded ${i.status === "critical" ? "bg-red-600 text-white" : "border bg-background text-muted-foreground"}`}>Down</button>
                          {isAdmin && <>
                            <button type="button" onClick={() => handleOpenEdit(i)} className="p-1 text-muted-foreground hover:text-foreground ml-1" title="Edit nama/URL"><Pencil className="size-3" /></button>
                            <button type="button" onClick={() => handleDeleteItem(i.id)} className="p-1 text-muted-foreground hover:text-destructive" title="Hapus monitoring"><Trash2 className="size-3" /></button>
                          </>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm font-bold">{editingItem?.id ? "Edit Monitoring" : "Tambah Monitoring Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">Kategori</label>
              <Select value={editingItem?.cat || "PRTG"} onValueChange={(val) => setEditingItem((p) => (p ? { ...p, cat: val } : null))}>
                <SelectTrigger className="mt-1 h-8 text-xs bg-surface"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">Nama Monitoring</label>
              <Input value={editingItem?.name || ""} onChange={(e) => setEditingItem((p) => (p ? { ...p, name: e.target.value } : null))} placeholder="Contoh: GOV 1 atau BOO 1" className="mt-1 h-8 text-xs bg-surface" />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground uppercase text-[10px]">URL Monitoring (Opsional)</label>
              <Input value={editingItem?.url || ""} onChange={(e) => setEditingItem((p) => (p ? { ...p, url: e.target.value } : null))} placeholder="http://prtg-gov1.telkomsat.net:9100/" className="mt-1 h-8 text-xs bg-surface font-mono" />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">Jika diisi, petugas bisa langsung klik untuk membuka tab baru.</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" onClick={handleSaveItemModal}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
