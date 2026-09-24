Lovable:
Berikut versi ramping utuh src/routes/jadwal.tsx.

Format, rumus Excel (Hari Kerja × 8 jam, Rekap Shift R/P/S/M/L/CT/ST, Libur Nasional), upload Excel, serta fitur Edit Manual tetap lengkap:


import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Download, Edit3, Save, Upload, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";

export const Route = createFileRoute("/jadwal")({
  head: () => ({ meta: [{ title: "Jadwal Kerja Tim — Reporting CC 3" }] }),
  component: JadwalPage,
});

export interface PersonelShift {
  id: string; nik: string; name: string; phone: string;
  group: "Real" | "Business"; shifts: Record<number, string>;
}
export interface ScheduleData {
  period: string; title: string; year: number; month: number;
  daysInMonth: number; regulerDays: number;
  personel: PersonelShift[]; holidays: { date: number; note: string }[];
}

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DEFAULTS: PersonelShift[] = [
  { id: "1", nik: "9017019", name: "Nawin Gunawan", phone: "082248662528", group: "Real", shifts: {} },
  { id: "2", nik: "8717028", name: "Hari Saputra", phone: "089516674619", group: "Real", shifts: {} },
  { id: "3", nik: "9215020", name: "Rangga Putra Rimba", phone: "085692992823", group: "Real", shifts: {} },
  { id: "4", nik: "1230315", name: "Ari Awaludin Muslim", phone: "081389308998", group: "Real", shifts: {} },
  { id: "5", nik: "9017019", name: "Nawin Gunawan", phone: "082248662528", group: "Business", shifts: {} },
  { id: "6", nik: "8717028", name: "Hari Saputra", phone: "089516674619", group: "Business", shifts: {} },
  { id: "7", nik: "9215020", name: "Rangga Putra Rimba", phone: "085692992823", group: "Business", shifts: {} },
  { id: "8", nik: "1230315", name: "Ari Awaludin Muslim", phone: "081389308998", group: "Business", shifts: {} },
];

function getBadge(val: string) {
  const s = (val || "").trim().toUpperCase();
  if (!s || s === "L" || s === "OFF") return "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  if (s === "CT") return "bg-amber-300 text-amber-950 font-bold";
  if (s === "ST") return "bg-emerald-300 text-emerald-950 font-bold";
  if (s === "P") return "bg-amber-100 text-amber-900 font-semibold";
  if (s === "S") return "bg-sky-100 text-sky-900 font-semibold";
  if (s === "M") return "bg-purple-100 text-purple-900 font-semibold";
  if (s === "R") return "bg-emerald-100 text-emerald-900 font-semibold";

Lovable:
 return "bg-blue-100 text-blue-900 font-semibold";
}

function JadwalPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAccess();
  const fileRef = useRef<HTMLInputElement>(null);
  const [clock, setClock] = useState("");
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [isEditing, setIsEditing] = useState(false);
  const [localData, setLocalData] = useState<ScheduleData | null>(null);

  useEffect(() => {
    const fn = () => setClock(new Date().toLocaleTimeString("id-ID"));
    fn();
    const t = setInterval(fn, 1000);
    return () => clearInterval(t);
  }, []);

  const { data: scheduleList = [] } = useQuery({
    queryKey: ["schedules-list"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("schedules").select("period, title").order("period", { ascending: false });
      return (data || []) as { period: string; title: string }[];
    },
  });

  const { data: fetchedSchedule, refetch } = useQuery({
    queryKey: ["schedule", period],
    queryFn: async () => {
      const { data } = await (supabase as any).from("schedules").select("*").eq("period", period).maybeSingle();
      if (!data) return null;
      return { period: data.period, title: data.title, ...(data.data || {}) } as ScheduleData;
    },
  });

  const schedule: ScheduleData = useMemo(() => {
    if (localData && localData.period === period) return localData;
    if (fetchedSchedule) return fetchedSchedule;
    const [yStr, mStr] = period.split("-");
    const y = Number(yStr) || now.getFullYear();
    const m = Number(mStr) || now.getMonth() + 1;
    const days = new Date(y, m, 0).getDate();
    let regDays = 0;
    for (let d = 1; d <= days; d++) {
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) regDays++;
    }
    return {
      period,
      title: `SCHEDULE ${(MONTHS_ID[m - 1] || "").toUpperCase()} ${y}`,
      year: y, month: m, daysInMonth: days, regulerDays: regDays,
      personel: DEFAULTS.map((p) => ({ ...p, shifts: {} })),
      holidays: [{ date: 5, note: "Libur Nasional Maulid" }],
    };
  }, [localData, fetchedSchedule, period]);

  const setShift = (pId: string, day: number, val: string) => {
    if (!isEditing) return;
    const clean = val.trim().toUpperCase();
    setLocalData((prev) => {
      const b = prev || schedule;
      return {
        ...b,
        personel: b.personel.map((p) => {
          if (p.id !== pId) return p;
          const s = { ...p.shifts };
          if (clean) s[day] = clean; else delete s[day];
          return { ...p, shifts: s };
        }),
      };
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        period: schedule.period, title: schedule.title,
        data: {
          year: schedule.year, month: schedule.month, daysInMonth: schedule.daysInMonth,
          regulerDays: schedule.regulerDays, personel: schedule.personel, holidays: schedule.holidays,
        },
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any).from("schedules").upsert(payload, { onConflict: "period" });
      if (error) throw error;
      toast.success("Jadwal tersimpan di Supabase!");
      setIsEditing(false);
      setLocalData(null);
      queryClient.invalidateQueries({ queryKey: ["schedules-list"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", period] });
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

Lovable:
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const list: PersonelShift[] = [];
        let grp: "Real" | "Business" = "Real";
        for (let r = 4; r < rows.length; r++) {
          const row = rows[r];
          if (!row || !row[1]) continue;
          const c0 = String(row[0] || "").toUpperCase();
          if (c0.includes("BUSINESS")) grp = "Business";
          if (c0.includes("REAL")) grp = "Real";
          const name = String(row[1]).trim();
          if (name.includes("Care Center") || name.length < 2) continue;
          const shifts: Record<number, string> = {};
          for (let d = 1; d <= schedule.daysInMonth; d++) {
            const v = String(row[2 + d] || "").trim().toUpperCase();
            if (v) shifts[d] = v;
          }
          list.push({ id: crypto.randomUUID(), nik: String(row[0] || ""), name, phone: String(row[2] || ""), group: grp, shifts });
        }
        if (list.length === 0) return toast.error("Data kosong atau template salah");
        setLocalData({ ...schedule, personel: list });
        setIsEditing(true);
        toast.success(`Berhasil memuat ${list.length} personel dari Excel!`);
      } catch (err: any) {
        toast.error("Gagal membaca Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleExport = () => {
    const rows: any[][] = [[schedule.title], [], ["NIK", "Nama", "No Handphone", ...Array.from({ length: schedule.daysInMonth }, (_, i) => String(i + 1))]];
    schedule.personel.forEach((p) => {
      rows.push([p.nik, p.name, p.phone, ...Array.from({ length: schedule.daysInMonth }, (_, i) => p.shifts[i + 1] || "")]);
    });
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${schedule.period}.xlsx`);
    toast.success("Excel berhasil diexport!");
  };

  const stats = (p: PersonelShift) => {
    let r = 0, pt = 0, s = 0, m = 0, l = 0, ct = 0, st = 0;
    Object.values(p.shifts).forEach((v) => {
      const u = v.toUpperCase();
      if (!u || u === "L" || u === "OFF") l++;
      else if (u === "CT") ct++;
      else if (u === "ST") st++;
      else if (u === "R") r++;
      else {
        if (u.includes("P")) pt++;
        if (u.includes("S")) s++;
        if (u.includes("M")) m++;
      }
    });
    const hk = r + pt + s + m;
    const backup = Math.max(0, hk - schedule.regulerDays);
    return { r, p: pt, s, m, l, ct, st, hk, jam: hk * 8, backupHK: backup, backupJam: backup * 8 };
  };

  return (
    <AppShell
      title="Jadwal Kerja Tim"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls" onChange={handleUpload} />
          <Select value={period} onValueChange={(v) => { setPeriod(v); setIsEditing(false); setLocalData(null); }}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Periode" /></SelectTrigger>
            <SelectContent>
              {scheduleList.map((s) => (<SelectItem key={s.period} value={s.period}>{s.period}</SelectItem>))}
              {!scheduleList.some((s) => s.period === period) && (<SelectItem value={period}>{period}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <>

Lovable:
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => fileRef.current?.click()}><Upload className="size-3.5 mr-1" />Upload Excel</Button>
              {isEditing ? (
                <>
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 text-white" onClick={handleSave}><Save className="size-3.5 mr-1" />Simpan</Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setIsEditing(false); setLocalData(null); }}><X className="size-3.5 mr-1" />Batal</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsEditing(true)}><Edit3 className="size-3.5 mr-1" />Edit Manual</Button>
              )}
            </>
          )}
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}><Download className="size-3.5 mr-1" />Export Excel</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">{schedule.title}</h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" />Waktu Server: {clock}</p>
          </div>
          <Badge variant="outline" className={isEditing ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}>
            {isEditing ? "Mode Edit Aktif" : "Tersimpan di Cloud"}
          </Badge>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid w-[300px] grid-cols-2">
            <TabsTrigger value="matrix">Matrix Roster</TabsTrigger>
            <TabsTrigger value="rekap">Rekapitulasi</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="pt-2">
            <div className="overflow-x-auto rounded border bg-card">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 border-b">
                    <th className="p-1 border-r w-20">NIK</th>
                    <th className="p-1 border-r min-w-[140px] text-left pl-2">Nama</th>
                    <th className="p-1 border-r w-16">Grup</th>
                    {Array.from({ length: schedule.daysInMonth }).map((_, i) => {
                      const d = i + 1;
                      const dt = new Date(schedule.year, schedule.month - 1, d);
                      const isEnd = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <th key={d} className={`p-1 border-r text-center min-w-[28px] ${isEnd ? "bg-rose-500 text-white font-bold" : ""}`}>
                          <div className="text-[9px] uppercase">{DAYS_EN[dt.getDay()]}</div>
                          <div>{d}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {schedule.personel.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-muted/40">
                      <td className="p-1 border-r text-center font-mono

Lovable:
text-[11px]">{p.nik || "-"}</td>
                      <td className="p-1 border-r font-medium pl-2 whitespace-nowrap">{p.name}</td>
                      <td className="p-1 border-r text-center text-muted-foreground">{p.group}</td>
                      {Array.from({ length: schedule.daysInMonth }).map((_, i) => {
                        const d = i + 1;
                        const v = p.shifts[d] || "";
                        return (
                          <td key={d} className="p-0.5 border-r text-center">
                            {isEditing ? (
                              <input
                                className="w-full text-center uppercase font-bold text-xs bg-transparent border-0 focus:ring-1 focus:ring-primary"
                                value={v}
                                onChange={(e) => setShift(p.id, d, e.target.value)}
                              />
                            ) : (
                              <span className={`inline-block w-full py-0.5 rounded text-[10px] ${getBadge(v)}`}>{v || "—"}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="rekap" className="pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3 overflow-x-auto rounded border bg-card">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-sky-100 dark:bg-sky-950/60 font-bold border-b">
                      <th className="p-1.5 border-r">NIK</th>
                      <th className="p-1.5 border-r text-left pl-2">Personil</th>
                      <th className="p-1.5 border-r">Grup</th>
                      <th className="p-1.5 border-r">R</th>
                      <th className="p-1.5 border-r">P</th>
                      <th className="p-1.5 border-r">S</th>
                      <th className="p-1.5 border-r">M</th>
                      <th className="p-1.5 border-r">L</th>
                      <th className="p-1.5 border-r">CT</th>
                      <th className="p-1.5 border-r">ST</th>
                      <th className="p-1.5 border-r bg-sky-200">Total HK</th>
                      <th className="p-1.5 border-r bg-sky-200">Total Jam</th>
                      <th className="p-1.5 border-r">Backup (HK)</th>
                      <th className="p-1.5">Backup (Jam)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50 border-b font-semibold text-center">
                      <td colSpan={3} className="p-1.5 border-r">Reguler</td>
                      <td className="p-1.5 border-r">{schedule.regulerDays}</td>
                      <td colSpan={6} className="p-1.5 border-r">-</td>
                      <td className="p-1.5 border-r bg-sky-50">{schedule.regulerDays}</td>
                      <td className="p-1.5 border-r bg-sky-50">{schedule.regulerDays * 8}</td>
                      <td colSpan={2} className="p-1.5">-</td>
                    </tr>
                    {schedule.personel.map((p) => {

Lovable:
            const st = stats(p);
                      return (
                        <tr key={p.id} className="border-b text-center hover:bg-muted/40">
                          <td className="p-1.5 border-r font-mono text-[11px]">{p.nik || "-"}</td>
                          <td className="p-1.5 border-r font-medium text-left pl-2">{p.name}</td>
                          <td className="p-1.5 border-r text-muted-foreground">{p.group}</td>
                          <td className="p-1.5 border-r">{st.r || ""}</td>
                          <td className="p-1.5 border-r">{st.p || ""}</td>
                          <td className="p-1.5 border-r">{st.s || ""}</td>
                          <td className="p-1.5 border-r">{st.m || ""}</td>
                          <td className="p-1.5 border-r bg-rose-50">{st.l || ""}</td>
                          <td className="p-1.5 border-r bg-amber-50">{st.ct || ""}</td>
                          <td className="p-1.5 border-r bg-emerald-50">{st.st || ""}</td>
                          <td className="p-1.5 border-r font-bold bg-sky-50">{st.hk}</td>
                          <td className="p-1.5 border-r font-bold bg-sky-50">{st.jam}</td>
                          <td className="p-1.5 border-r text-blue-600 font-semibold">{st.backupHK || ""}</td>
                          <td className="p-1.5 text-blue-600 font-semibold">{st.backupJam || ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <Card className="border">
                  <CardHeader className="p-2.5 pb-1"><CardTitle className="text-xs uppercase font-bold text-center">Libur Nasional</CardTitle></CardHeader>
                  <CardContent className="p-2.5 pt-1 text-xs space-y-1">
                    {schedule.holidays.map((h, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-rose-50 text-rose-800 text-center font-medium">
                        {h.date} {MONTHS_ID[schedule.month - 1]}: {h.note}
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardHeader className="p-2.5 pb-1"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Legenda Shift</CardTitle></CardHeader>
                  <CardContent className="p-2.5 pt-1 text-xs grid grid-cols-2 gap-1.5">
                    <div><b>R</b>: Reguler</div><div><b>P</b>: Pagi</div>
                    <div><b>S</b>: Siang</div><div><b>M</b>: Malam</div>
                    <div><b>L</b>: Libur</div><div><b>CT</b>: Cuti</div>
                    <div><b>ST</b>: Sakit</div><div><b>B</b>: Backup</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
