import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BULAN_LIST } from "@/lib/daily-activity-constants";
import { CODES, WORK, initializeSchedule, rosterCode, type Cell, type ScheduleData } from "@/lib/schedule";
import { regularCode, isNationalHoliday } from "@/lib/indonesia-holidays";

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

const codeTone: Record<string, string> = {
const toneFor = (code: string) => codeTone[code] ?? "bg-success text-success-foreground font-bold hover:bg-success/90";
  P: "bg-shift-morning text-shift-light font-bold hover:bg-shift-morning/90",
  S: "bg-shift-day text-shift-ink font-bold hover:bg-shift-day/90",
  M: "bg-shift-night text-shift-ink font-bold hover:bg-shift-night/90",
  L: "bg-shift-off text-shift-light font-bold hover:bg-shift-off/90",
  CT: "bg-destructive text-destructive-foreground font-bold hover:bg-destructive/90",
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
      const [current, prior] = await Promise.all([
        supabase.from("schedules").select("*").eq("period", period).maybeSingle(),
        supabase.from("schedules").select("period,data").lt("period", period).order("period", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (current.error) throw current.error;
      if (prior.error) throw prior.error;
      return { current: current.data, previous: prior.data };
    },
  });

  const [data, setData] = useState<ScheduleData>(() => initializeSchedule());
  const carry = useRef<{ period: string; data: ScheduleData } | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<{ m: number; d: number } | null>(null);
  const [pendingCode, setPendingCode] = useState("P");
  const [backup, setBackup] = useState("none");

  useEffect(() => {
    if (!query.data) return;
    const saved = query.data.current?.data as ScheduleData | undefined;
    const previous = query.data.previous as { period: string; data: ScheduleData } | null;
    const draft = carry.current;
    const source = draft && draft.period < period && (!previous || draft.period >= previous.period) ? draft : previous ?? undefined;
    setData(initializeSchedule(saved, source));
    setDirty(false);
    setEditing(null);
  }, [query.data, period]);

  const changePeriod = (nextMonth: number, nextYear: number) => {
    carry.current = { period, data: structuredClone(data) };
    setEditing(null);
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const getCell = (m: number, d: number): Cell =>
    data.cells[m]?.[d] ?? { code: m === -1 ? regularCode(year, month, d) : rosterCode(m, year, month, d, data) };

  const update = (fn: (draft: ScheduleData) => void) => {
    setData((prev) => {
      const next = structuredClone(prev);
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
      const normal = draft.normalCells?.[m]?.[d]?.code ?? getCell(m, d).originalCode ?? (original !== "CT" && !getCell(m, d).backupFor ? original : rosterCode(m, year, month, d, data));
      setCell(draft, m, d, { code: pendingCode, ...(pendingCode === "CT" ? { originalCode: normal } : {}) });
      if (pendingCode !== "CT") {
        draft.normalCells ??= {};
        draft.normalCells[m] ??= {};
        draft.normalCells[m][d] = { code: pendingCode };
      }
            if (pendingCode === "CT" && backup !== "none") {
        const b = Number(backup);
        const shift = WORK.has(original) ? original : rosterCode(m, year, month, d, data);
        const ownCell = getCell(b, d);
        const own = ownCell.originalCode ?? (ownCell.backupFor ? "" : ownCell.code);
        const combined = [...new Set((own + (WORK.has(shift) ? shift : "P")).split(""))]
          .filter((c) => WORK.has(c))
          .sort((a, b2) => ["P", "S", "M"].indexOf(a) - ["P", "S", "M"].indexOf(b2))
          .join("");
        setCell(draft, b, d, { code: combined, backupFor: m === -1 ? draft.regular?.name ?? "Reguler" : draft.members[m] ?? "Anggota", originalCode: own || undefined });
      }
    });
    setEditing(null);
  };

  const stats = useMemo(
    () =>
      data.members.map((_, m) => {
        let work = 0, ct = 0, bk = 0;
        for (let d = 1; d <= days; d++) {
          const c = data.cells[m]?.[d] ?? { code: rosterCode(m, year, month, d, data) };
          if (WORK.has(c.code)) || c.backupFor) work++;
          if (c.code === "CT") ct++;
          if (c.backupFor) bk++;
        }
        return { work, ct, bk };
      }),
    [data, days, year, month],
  );

  const save = async () => {
    const payload = { period, title: `Jadwal ${BULAN_LIST[month]} ${year}`, data: data as never };
    const res = query.data?.current
      ? await supabase.from("schedules").update(payload).eq("id", query.data.current.id)
      : await supabase.from("schedules").insert(payload);
    if (res.error) { toast.error("Gagal menyimpan", { description: res.error.message }); return; }
    toast.success("Jadwal tersimpan");
    await qc.invalidateQueries({ queryKey: ["schedule", period] });
  };

  const resetRoster = () => update((draft) => { draft.cells = {}; draft.normalCells = {}; });

  const exportExcel = () => {
    const dayHeads = Array.from({ length: days }, (_, i) => String(i + 1));
    const rows: unknown[][] = [
      [`Jadwal Shift ${BULAN_LIST[month]} ${year}`],
      ["NIK", "Nama", "No. Tlp", ...dayHeads, "Hari Kerja", "Cuti", "Backup"],
    ];
    [-1, 0, 1, 2, 3].forEach((m) => {
      const name = m === -1 ? data.regular?.name ?? "Reguler" : data.members[m];
      const nik = m === -1 ? data.regular?.nik ?? "" : data.niks?.[m] ?? "";
      const phone = m === -1 ? data.regular?.phone ?? "" : data.phones?.[m] ?? "";
      const cells = dayHeads.map((_, i) => {
        const c = getCell(m, i + 1);
        return c.backupFor ? `${c.code} (BK ${c.backupFor})` : c.code;
      });
      const r = rows.length + 1;
      const range = `${XLSX.utils.encode_col(3)}${r}:${XLSX.utils.encode_col(2 + days)}${r}`;
      rows.push([nik, name, phone, ...cells,
        { t: "n", v: cells.filter((c) => WORK.has(c.split(" ")[0] ?? "")).length, f: `COUNTIF(${range},"P*")+COUNTIF(${range},"S*")+COUNTIF(${range},"M*")` },
        { t: "n", v: cells.filter((c) => c === "CT").length, f: `COUNTIF(${range},"CT")` },
        { t: "n", v: cells.filter((c) => c.includes("BK")).length, f: `COUNTIF(${range},"*BK*")` },
      ]);
    });
    rows.push([], ["Keterangan: P = Pagi, S = Siang, M = Malam, L = Libur, CT = Cuti, BK = Backup"]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, ...dayHeads.map(() => ({ wch: 5 })), { wch: 12 }, { wch: 6 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${period}.xlsx`);
  };

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i);
  const editCell = editing ? getCell(editing.m, editing.d) : null;

  return (
    <AppShell title="Jadwal Shift" subtitle="Care Center 3">
      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="font-display text-lg font-semibold">Jadwal Shift</h1>
            <p className="text-[11px] text-muted-foreground">Siklus 8 hari: P P M M S S L L · klik sel untuk mengubah</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => changePeriod(Number(v), year)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{BULAN_LIST.map((b, i) => <SelectItem key={b} value={String(i)}>{b}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => changePeriod(month, Number(v))}>
              <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={resetRoster}><RotateCcw className="size-3.5" />Reset roster</Button>
            <Button variant="outline" size="sm" onClick={exportExcel}><FileSpreadsheet className="size-3.5" />Export Excel</Button>
            <Button size="sm" onClick={save} disabled={query.isFetching || !dirty}><Save className="size-3.5" />Simpan</Button>
          </div>
        </div>

        {query.error && <p role="alert" className="text-xs text-destructive">Jadwal gagal dimuat. Silakan coba lagi.</p>}
        <div className="overflow-x-auto rounded-lg border bg-card" aria-busy={query.isFetching}>
          {query.isFetching ? <p className="p-4 text-xs text-muted-foreground">Memuat jadwal…</p> : <>
          <table className="w-full min-w-[1420px] border-collapse text-[10px]">
            <thead>
              <tr className="bg-ops-navy text-primary-foreground">
                <th className="min-w-[100px] px-2 py-1.5 text-left">NIK</th>
                <th className="min-w-[140px] px-2 py-1.5 text-left">Nama</th>
                <th className="min-w-[110px] px-2 py-1.5 text-left">No. Tlp</th>
                {Array.from({ length: days }, (_, i) => {
                  const dow = new Date(year, month, i + 1).getDay();
                  return (
                    <th key={i} className={`min-w-[26px] px-0.5 py-1 text-center ${dow === 0 || dow === 6 || isNationalHoliday(year, month, i + 1) ? "text-destructive-foreground/70" : ""}`}>
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
              <tr className="border-t bg-muted/20 font-medium">
                {(["nik", "name", "phone"] as const).map((field) => (
                  <td key={field} className="bg-card px-1 py-1">
                    <Input aria-label={`Reguler ${field === "nik" ? "NIK" : field === "name" ? "Nama" : "No. Tlp"}`}
                      value={data.regular?.[field] ?? (field === "name" ? "Reguler" : "")}
                      onChange={(e) => update((draft) => { draft.regular ??= { nik: "", name: "Reguler", phone: "" }; draft.regular[field] = e.target.value; })}
                      className="h-7 text-[11px]" />
                  </td>
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const code = getCell(-1, i + 1).code;
                  return (
                    <td key={i} className="p-0.5 text-center">
                      <Button variant="ghost"
                        type="button"
                        onClick={() => openEdit(-1, i + 1)}
                        className={`relative h-6 w-full rounded p-0 text-[10px] ${toneFor(code) ?? ""}`}
                        aria-label={`Reguler tanggal ${i + 1}: ${code}`}
                         title="Ubah jadwal Reguler"
                      >
                        {code}
                      </Button>
                    </td>
                  );
                })}
                <td className="text-center text-xs font-bold text-primary">
                  {Array.from({ length: days }).filter((_, i) => {
                    const code = getCell(-1, i + 1).code;
                    return code === "P" || code === "S" || code === "M";
                  }).length}
                </td>
                <td className="text-center font-semibold text-destructive">
                  {Array.from({ length: days }).filter((_, i) => data.cells[-1]?.[i + 1]?.code === "CT").length}
                </td>
                <td className="text-center font-semibold text-muted-foreground">-</td>
              </tr>
              {data.members.map((name, m) => (
                <tr key={m} className="border-t">
                  <td className="px-1 py-1"><Input aria-label={`NIK anggota ${m + 1}`} value={data.niks?.[m] ?? ""} onChange={(e) => update((draft) => { draft.niks ??= ["", "", "", ""]; draft.niks[m] = e.target.value; })} className="h-7 text-[11px]" /></td>
                  <td className="px-1 py-1"><Input aria-label={`Nama anggota ${m + 1}`} value={name} onChange={(e) => update((draft) => { draft.members[m] = e.target.value; })} className="h-7 text-[11px]" /></td>
                  <td className="px-1 py-1"><Input aria-label={`No. Tlp anggota ${m + 1}`} value={data.phones?.[m] ?? ""} onChange={(e) => update((draft) => { draft.phones ??= ["", "", "", ""]; draft.phones[m] = e.target.value; })} className="h-7 text-[11px]" /></td>
                  {Array.from({ length: days }, (_, i) => {
                    const c = getCell(m, i + 1);
                    return (
                      <td key={i} className="p-0.5 text-center">
                        <Button variant="ghost"
                          type="button"
                          aria-label={`${name} tanggal ${i + 1}: ${c.code}`}
                           title={c.backupFor ? `Backup untuk ${c.backupFor}` : undefined}
                          onClick={() => openEdit(m, i + 1)}
                          className={`relative h-6 w-full rounded p-0 text-[10px] font-semibold ${toneFor(c.code)` ?? ""} ${c.backupFor ? "ring-2 ring-success" : ""}`}
                        >
                          {c.code}
                        </Button>
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
          </>}
        </div>
        {![2026, 2027].includes(year) && <p className="text-[10px] text-muted-foreground">Tanggal merah keagamaan tahun {year} belum tersedia; sesuaikan sel Reguler secara manual.</p>}
        <p className="text-[10px] text-muted-foreground">
          P = Pagi · S = Siang · M = Malam · L = Libur · CT = Cuti (mengurangi hari kerja) · bingkai hijau = Backup (menambah hari kerja)
        </p>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Jadwal</DialogTitle>
            <DialogDescription>
              {editing && `${editing.m === -1 ? data.regular?.name ?? "Reguler" : data.members[editing.m]} · ${editing.d} ${BULAN_LIST[month]} ${year}`}
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
