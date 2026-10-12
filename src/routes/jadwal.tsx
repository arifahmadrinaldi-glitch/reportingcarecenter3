import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BULAN_LIST } from "@/lib/daily-activity-constants";

export const Route = createFileRoute("/jadwal")({
  head: () => ({
    meta: [
      { title: "Jadwal Shift — Reporting CC 3" },
      { name: "description", content: "Roster shift tim 4 orang dengan siklus P P M M S S L L, cuti, backup dan total hari kerja." },
      { property: "og:title", content: "Jadwal Shift — Reporting CC 3" },
      { property: "og:description", content: "Kelola jadwal shifting tim, cuti dan backup, lalu export ke Excel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JadwalPage,
});

const CYCLE = ["P", "P", "M", "M", "S", "S", "L", "L"] as const;
const CODES = ["P", "S", "M", "L", "CT"] as const;
const WORK = new Set(["P", "S", "M"]);
const ANCHOR = Date.UTC(2026, 0, 1);
const DEFAULT_MEMBERS = ["Anggota 1", "Anggota 2", "Anggota 3", "Anggota 4"];

type Cell = { code: string; backupFor?: string };
type ScheduleData = { members: string[]; cells: Record<string, Record<string, Cell>> };

const codeTone: Record<string, string> = {
  P: "bg-primary/15 text-primary",
  S: "bg-warning/20 text-foreground",
  M: "bg-ops-navy text-primary-foreground",
  L: "bg-muted text-muted-foreground",
  CT: "bg-destructive/15 text-destructive",
};

const rosterCode = (memberIdx: number, year: number, month: number, day: number) => {
  const diff = Math.floor((Date.UTC(year, month, day) - ANCHOR) / 86400000);
  const pos = (((diff + memberIdx * 2) % 8) + 8) % 8;
  return CYCLE[pos] as string;
};

function JadwalPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const period = `${year}-${String(month + 1).padStart(2, "0")}`;
  const qc = useQueryClient();
  const days = new Date(year, month + 1, 0).getDate();

  const query = useQuery({
    queryKey: ["schedule", period],
    queryFn: async () => {
      const { data, error } = await supabase.from("schedules").select("*").eq("period", period).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [data, setData] = useState<ScheduleData>({ members: DEFAULT_MEMBERS, cells: {} });
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<{ m: number; d: number } | null>(null);
  const [pendingCode, setPendingCode] = useState("P");
  const [backup, setBackup] = useState("none");

  useEffect(() => {
    const saved = query.data?.data as ScheduleData | undefined;
    setData({
      members: saved?.members?.length === 4 ? saved.members : DEFAULT_MEMBERS,
      cells: saved?.cells ?? {},
    });
    setDirty(false);
  }, [query.data, period]);

  const getCell = (m: number, d: number): Cell =>
    data.cells[m]?.[d] ?? { code: rosterCode(m, year, month, d) };

  const update = (fn: (draft: ScheduleData) => void) => {
    setData((prev) => {
      const next: ScheduleData = { members: [...prev.members], cells: JSON.parse(JSON.stringify(prev.cells)) };
      fn(next);
      return next;
    });
    setDirty(true);
  };

  const setCell = (draft: ScheduleData, m: number, d: number, cell: Cell) => {
    draft.cells[m] = draft.cells[m] ?? {};
    draft.cells[m][d] = cell;
  };

  const openEdit = (m: number, d: number) => {
    setEditing({ m, d });
    setPendingCode(getCell(m, d).code);
    setBackup("none");
  };

  const applyEdit = () => {
    if (!editing) return;
    const { m, d } = editing;
    const original = getCell(m, d).code;
    update((draft) => {
      setCell(draft, m, d, { code: pendingCode });
      if (pendingCode === "CT" && backup !== "none") {
        const b = Number(backup);
        const shift = WORK.has(original) ? original : rosterCode(m, year, month, d);
        setCell(draft, b, d, { code: WORK.has(shift) ? shift : "P", backupFor: draft.members[m] });
      }
    });
    setEditing(null);
  };

  const stats = useMemo(
    () =>
      data.members.map((_, m) => {
        let work = 0, ct = 0, bk = 0;
        for (let d = 1; d <= days; d++) {
          const c = data.cells[m]?.[d] ?? { code: rosterCode(m, year, month, d) };
          if (WORK.has(c.code)) work++;
          if (c.code === "CT") ct++;
          if (c.backupFor) bk++;
        }
        return { work, ct, bk };
      }),
    [data, days, year, month],
  );

  const save = async () => {
    const payload = { period, title: `Jadwal ${BULAN_LIST[month]} ${year}`, data: data as never };
    const res = query.data
      ? await supabase.from("schedules").update(payload).eq("id", query.data.id)
      : await supabase.from("schedules").insert(payload);
    if (res.error) return toast.error("Gagal menyimpan", { description: res.error.message });
    toast.success("Jadwal tersimpan");
    await qc.invalidateQueries({ queryKey: ["schedule", period] });
  };

  const resetRoster = () => update((draft) => { draft.cells = {}; });

  const exportExcel = () => {
    const dayHeads = Array.from({ length: days }, (_, i) => String(i + 1));
    const rows: (string | number)[][] = [
      [`Jadwal Shift ${BULAN_LIST[month]} ${year}`],
      ["No", "Nama", ...dayHeads, "Hari Kerja", "Cuti", "Backup"],
    ];
    data.members.forEach((name, m) => {
      const cells = dayHeads.map((_, i) => {
        const c = getCell(m, i + 1);
        return c.backupFor ? `${c.code} (BK ${c.backupFor})` : c.code;
      });
      const r = 3 + m;
      rows.push([m + 1, name, ...cells]);
      const first = XLSX.utils.encode_col(2);
      const last = XLSX.utils.encode_col(1 + days);
      const range = `${first}${r}:${last}${r}`;
      (rows[rows.length - 1] as unknown[]).push(
        { f: `COUNTIF(${range},"P*")+COUNTIF(${range},"S*")+COUNTIF(${range},"M*")` } as never,
        { f: `COUNTIF(${range},"CT")` } as never,
        { f: `COUNTIF(${range},"*BK*")` } as never,
      );
    });
    rows.push([], ["Keterangan: P = Pagi, S = Siang, M = Malam, L = Libur, CT = Cuti, BK = Backup"]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 4 }, { wch: 16 }, ...dayHeads.map(() => ({ wch: 5 })), { wch: 10 }, { wch: 6 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${period}.xlsx`);
  };

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i);
  const editCell = editing ? getCell(editing.m, editing.d) : null;

  return (
    <AppShell>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-lg font-semibold">Jadwal Shift</h1>
            <p className="text-[11px] text-muted-foreground">Siklus 8 hari: P P M M S S L L · klik sel untuk mengubah</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{BULAN_LIST.map((b, i) => <SelectItem key={b} value={String(i)}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={resetRoster}><RotateCcw className="size-3.5" />Reset roster</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="size-3.5" />Export Excel</Button>
            <Button size="sm" onClick={save} disabled={!dirty}><Save className="size-3.5" />Simpan</Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-ops-navy text-primary-foreground">
                <th className="sticky left-0 z-10 min-w-[130px] bg-ops-navy px-2 py-1.5 text-left">Nama</th>
                {Array.from({ length: days }, (_, i) => {
                  const dow = new Date(year, month, i + 1).getDay();
                  return (
                    <th key={i} className={`min-w-[26px] px-0.5 py-1 text-center ${dow === 0 ? "text-destructive-foreground/70" : ""}`}>
                      <div>{i + 1}</div>
                      <div className="text-[8px] font-normal opacity-70">{["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"][dow]}</div>
                    </th>
                  );
                })}
                <th className="px-2 text-center">Hari Kerja</th>
                <th className="px-2 text-center">CT</th>
                <th className="px-2 text-center">Backup</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((name, m) => (
                <tr key={m} className="border-t">
                  <td className="sticky left-0 z-10 bg-card px-1 py-1">
                    <Input
                      value={name}
                      onChange={(e) => update((draft) => { draft.members[m] = e.target.value; })}
                      className="h-7 text-[11px]"
                    />
                  </td>
                  {Array.from({ length: days }, (_, i) => {
                    const c = getCell(m, i + 1);
                    return (
                      <td key={i} className="p-0.5 text-center">
                        <button
                          type="button"
                          title={c.backupFor ? `Backup untuk ${c.backupFor}` : undefined}
                          onClick={() => openEdit(m, i + 1)}
                          className={`relative h-6 w-full rounded font-semibold ${codeTone[c.code] ?? ""} ${c.backupFor ? "ring-2 ring-success" : ""}`}
                        >
                          {c.code}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-center text-xs font-bold text-primary">{stats[m]?.work}</td>
                  <td className="text-center font-semibold text-destructive">{stats[m]?.ct}</td>
                  <td className="text-center font-semibold text-success">{stats[m]?.bk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground">
          P = Pagi · S = Siang · M = Malam · L = Libur · CT = Cuti (mengurangi hari kerja) · bingkai hijau = Backup (menambah hari kerja)
        </p>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Jadwal</DialogTitle>
            <DialogDescription>
              {editing && `${data.members[editing.m]} · ${editing.d} ${BULAN_LIST[month]} ${year}`}
              {editCell?.backupFor && ` · backup untuk ${editCell.backupFor}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1">
              {CODES.map((c) => (
                <Button key={c} size="sm" variant={pendingCode === c ? "default" : "outline"} onClick={() => setPendingCode(c)}>{c}</Button>
              ))}
            </div>
            {pendingCode === "CT" && editing && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Backup oleh</p>
                <Select value={backup} onValueChange={setBackup}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa backup</SelectItem>
                    {data.members.map((n, i) =>
                      i === editing.m ? null : (
                        <SelectItem key={i} value={String(i)}>{n} ({getCell(i, editing.d).code})</SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button className="w-full" onClick={applyEdit}>Terapkan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
