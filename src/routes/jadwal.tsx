Lovable:
Paham, di pesan tadi saya sempat membagi menjadi 2 kotak solusi (Kotak 1 untuk bagian atas dan Kotak 2 untuk bagian bawah), sehingga membingungkan.

Sekarang ini kodenya sudah saya gabungkan menjadi 1 KOTAK TUNGGAL UTUH tanpa terputus.

Anda cukup klik tombol Copy di pojok kanan atas kotak ini 1 kali saja, kosongkan file di GitHub (Ctrl + A lalu Delete), dan Paste 1 kali saja:


import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar,
  CalendarDays,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";

export const Route = createFileRoute("/jadwal")({
  head: () => ({
    meta: [
      { title: "Jadwal Kerja Tim — Reporting CC 3" },
      {
        name: "description",
        content: "Roster shift bulanan, upload Excel jadwal, dan rekap kehadiran kerja Care Center 3.",
      },
    ],
  }),
  component: JadwalPage,
});

export interface PersonelShift {
  id: string;
  nik: string;
  name: string;
  phone: string;
  group: "Real" | "Business";
  shifts: Record<number, string>;
}

export interface HolidayItem {
  date: number;
  note: string;
}

export interface ScheduleData {
  period: string;
  title: string;
  year: number;
  month: number;
  daysInMonth: number;
  regulerDays: number;
  personel: PersonelShift[];
  holidays: HolidayItem[];
}

const DAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DEFAULT_PERSONEL: PersonelShift[] = [
  { id: "1", nik: "9017019", name: "Nawin Gunawan", phone: "082248662528", group: "Real", shifts: {} },
  { id: "2", nik: "8717028", name: "Hari Saputra", phone: "089516674619", group: "Real", shifts: {} },
  { id: "3", nik: "9215020", name: "Rangga Putra Rimba", phone: "085692992823", group: "Real", shifts: {} },
  { id: "4", nik: "1230315", name: "Ari Awaludin Muslim", phone: "081389308998", group: "Real", shifts: {} },
  { id: "5", nik: "9017019", name: "Nawin Gunawan", phone: "082248662528", group: "Business", shifts: {} },
  { id: "6", nik: "8717028", name: "Hari Saputra", phone: "089516674619", group: "Business", shifts: {} },
  { id: "7", nik: "9215020", name: "Rangga Putra Rimba", phone: "085692992823", group: "Business", shifts: {} },
  { id: "8", nik: "1230315", name: "Ari Awaludin Muslim", phone: "081389308998", group: "Business", shifts: {} },
];

function getDaysInMonth(year: number, month: number): number {

Lovable:
  const schedule: ScheduleData = useMemo(() => {
    if (localSchedule && localSchedule.period === selectedPeriod) {
      return localSchedule;
    }
    if (currentSchedule) {
      return currentSchedule;
    }
    const parts = selectedPeriod.split("-");
    const y = Number(parts[0]) || new Date().getFullYear();
    const m = Number(parts[1]) || new Date().getMonth() + 1;
    const days = getDaysInMonth(y, m);

    let regDays = 0;
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, m - 1, d);
      if (dt.getDay() !== 0 && dt.getDay() !== 6) regDays++;
    }

    return {
      period: selectedPeriod,
      title: `SCHEDULE ${(MONTH_NAMES_ID[m - 1] || "").toUpperCase()} ${y}`,
      year: y,
      month: m,
      daysInMonth: days,
      regulerDays: regDays,
      personel: DEFAULT_PERSONEL.map((p) => ({ ...p, shifts: {} })),
      holidays: [{ date: 5, note: "Libur Nasional Maulid" }],
    };
  }, [localSchedule, currentSchedule, selectedPeriod]);

  const handleShiftChange = (personelId: string, day: number, value: string) => {
    if (!isEditing) return;
    const clean = value.trim().toUpperCase();
    setLocalSchedule((prev) => {
      const base = prev || schedule;
      return {
        ...base,
        personel: base.personel.map((p) => {
          if (p.id !== personelId) return p;
          const nextShifts = { ...p.shifts };
          if (clean) {
            nextShifts[day] = clean;
          } else {
            delete nextShifts[day];
          }
          return { ...p, shifts: nextShifts };
        }),
      };
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        period: schedule.period,
        title: schedule.title,
        data: {
          year: schedule.year,
          month: schedule.month,
          daysInMonth: schedule.daysInMonth,
          regulerDays: schedule.regulerDays,
          personel: schedule.personel,
          holidays: schedule.holidays,
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any).from("schedules").upsert(payload, {
        onConflict: "period",
      });

      if (error) throw error;

      toast.success("Jadwal berhasil disimpan ke database!");
      setIsEditing(false);
      setLocalSchedule(null);
      queryClient.invalidateQueries({ queryKey: ["schedules-list"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", selectedPeriod] });
      refetch();
    } catch (err: any) {
      toast.error("Gagal menyimpan jadwal: " + (err.message || "Error database"));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        if (!sheetName || !wb.Sheets[sheetName]) {
          toast.error("File Excel kosong atau format tidak sesuai.");
          return;
        }
        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rows.length < 5) {
          toast.error("Baris Excel terlalu sedikit.");
          return;
        }

        const parts = selectedPeriod.split("-");
        const y = Number(parts[0]) || new Date().getFullYear();
        const m = Number(parts[1]) || new Date().getMonth() + 1;
        const days = getDaysInMonth(y, m);

        let dayColStart = -1;
        let dayRowIdx = -1;

        for (let r = 0; r < Math.min(10, rows.length); r++) {
          const row = rows[r];
          if (!row) continue;
          for (let c = 0; c < row.length; c++) {
            if (Number(row[c]) === 1 && Number(row[c +

Lovable:
  return new Date(year, month, 0).getDate();
}

function getShiftBadgeClass(shift: string): string {
  const s = (shift || "").trim().toUpperCase();
  if (!s || s === "OFF" || s === "L") return "bg-gray-400/30 text-gray-700 dark:text-gray-300 font-medium";
  if (s === "CT") return "bg-amber-300 text-amber-950 font-semibold";
  if (s === "ST") return "bg-emerald-200 text-emerald-900 font-semibold";
  if (s === "PS") return "bg-blue-600 text-white font-bold";
  if (s === "SM") return "bg-blue-400 text-blue-950 font-bold";
  if (s === "P") return "bg-amber-100 text-amber-900 font-semibold";
  if (s === "S") return "bg-sky-100 text-sky-900 font-semibold";
  if (s === "M") return "bg-purple-100 text-purple-900 font-semibold";
  if (s === "R") return "bg-emerald-100 text-emerald-900 font-semibold";
  if (s.startsWith("B")) return "bg-amber-200 text-amber-900 font-semibold";
  return "bg-slate-100 text-slate-800 font-medium";
}

function getPersonelRowBg(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("nawin")) return "bg-emerald-50/70 dark:bg-emerald-950/20";
  if (n.includes("hari")) return "bg-sky-50/70 dark:bg-sky-950/20";
  if (n.includes("rangga")) return "bg-rose-50/70 dark:bg-rose-950/20";
  if (n.includes("ari")) return "bg-slate-100/70 dark:bg-slate-900/30";
  return "";
}

function JadwalPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[d.getDay()] || "Day";
      const monName = months[d.getMonth()] || "Mon";
      const pad = (n: number) => String(n).padStart(2, "0");
      setCurrentTime(`${dayName}, ${pad(d.getDate())} ${monName} ${String(d.getFullYear()).slice(-2)} at ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [isEditing, setIsEditing] = useState(false);
  const [localSchedule, setLocalSchedule] = useState<ScheduleData | null>(null);

  const { data: scheduleList = [] } = useQuery({
    queryKey: ["schedules-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schedules")
        .select("period, title, updated_at")
        .order("period", { ascending: false });
      if (error) throw error;
      return (data || []) as { period: string; title: string; updated_at: string }[];
    },
  });

  const {
    data: currentSchedule,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["schedule", selectedPeriod],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schedules")
        .select("*")
        .eq("period", selectedPeriod)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        period: data.period,
        title: data.title,
        ...(data.data || {}),
      } as ScheduleData;
    },
  });

Lovable:
        dataRows.push(row);
      }

      const ws = XLSX.utils.aoa_to_sheet(dataRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
      XLSX.writeFile(wb, `Jadwal_${schedule.period}.xlsx`);
      toast.success("File Excel berhasil di-export!");
    } catch (err: any) {
      toast.error("Gagal export Excel: " + (err.message || "Error"));
    }
  };

  const calculatePersonel = (p: PersonelShift) => {
    let rCount = 0;
    let pCount = 0;
    let sCount = 0;
    let mCount = 0;
    let lCount = 0;
    let ctCount = 0;
    let stCount = 0;

    Object.values(p.shifts).forEach((raw) => {
      const val = (raw || "").trim().toUpperCase();
      if (!val || val === "L" || val === "OFF") lCount++;
      else if (val === "CT") ctCount++;
      else if (val === "ST") stCount++;
      else if (val === "R") rCount++;
      else {
        if (val.includes("P")) pCount++;
        if (val.includes("S")) sCount++;
        if (val.includes("M")) mCount++;
      }
    });

    const totalHariKerja = rCount + pCount + sCount + mCount;
    const totalJamKerja = totalHariKerja * 8;
    const backupBufferHK = Math.max(0, totalHariKerja - schedule.regulerDays);
    const backupBufferJam = backupBufferHK * 8;

    return {
      rCount,
      pCount,
      sCount,
      mCount,
      lCount,
      ctCount,
      stCount,
      totalHariKerja,
      totalJamKerja,
      backupBufferHK,
      backupBufferJam,
    };
  };

  const dailyShiftDuty = useMemo(() => {
    const realDuty: Record<number, { p: number; s: number; m: number; total: number }> = {};
    const bizDuty: Record<number, { p: number; s: number; m: number; total: number }> = {};

    for (let d = 1; d <= schedule.daysInMonth; d++) {
      realDuty[d] = { p: 0, s: 0, m: 0, total: 0 };
      bizDuty[d] = { p: 0, s: 0, m: 0, total: 0 };
    }

    schedule.personel.forEach((p) => {
      const target = p.group === "Business" ? bizDuty : realDuty;
      for (let d = 1; d <= schedule.daysInMonth; d++) {
        const val = (p.shifts[d] || "").trim().toUpperCase();
        if (val.includes("P")) target[d].p++;
        if (val.includes("S")) target[d].s++;
        if (val.includes("M")) target[d].m++;
      }
    });

    for (let d = 1; d <= schedule.daysInMonth; d++) {
      realDuty[d].total = realDuty[d].p + realDuty[d].s + realDuty[d].m;
      bizDuty[d].total = bizDuty[d].p + bizDuty[d].s + bizDuty[d].m;
    }

    return { realDuty, bizDuty };
  }, [schedule]);

  const realPersonel = schedule.personel.filter((p) => p.group === "Real");
  const bizPersonel = schedule.personel.filter((p) => p.group === "Business");

  return (
    <AppShell
      title="Jadwal Kerja Tim"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />

          <Select
            value={selectedPeriod}
            onValueChange={(val) => {
              setSelectedPeriod(val);
              setIsEditing(false);
              setLocalSchedule(null);
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              {scheduleList.map((s) => (
                <SelectItem key={s.period} value={s.period}>
                  {s.period}
                </SelectItem>
              ))}
              {!scheduleList.some((s) => s.period === selectedPeriod) && (
                <SelectItem value={selectedPeriod}>{selectedPeriod}</Sel

Lovable:
ectItem>
              )}
            </SelectContent>
          </Select>

          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="size-3.5" />
                Upload Excel
              </Button>

              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleSave}
                  >
                    <Save className="size-3.5" />
                    Simpan Jadwal
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => {
                      setIsEditing(false);
                      setLocalSchedule(null);
                    }}
                  >
                    <X className="size-3.5" />
                    Batal
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="size-3.5" />
                  Edit Manual
                </Button>
              )}
            </>
          )}

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Download className="size-3.5" />
            Export Excel
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase text-foreground">
              {schedule.title}
            </h2>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Clock className="size-3.5" />
              {currentTime || "Thu, 24 Sep 26 at 08:44:00"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-300 text-xs">
                Mode Edit Manual Aktif
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-xs">
                Tersimpan di Cloud
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="matrix" className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="matrix">Matrix Roster Harian</TabsTrigger>
            <TabsTrigger value="rekap">Rekap Personel & Libur</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4 pt-2">
            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
              <table className="w-full border-collapse text-xs select-none">

Lovable:
1]) === 2) {
              dayRowIdx = r;
              dayColStart = c;
              break;
            }
          }
          if (dayColStart !== -1) break;
        }

        if (dayColStart === -1) {
          dayColStart = 3;
        }

        const parsedPersonel: PersonelShift[] = [];
        let currentGroup: "Real" | "Business" = "Real";

        const startR = dayRowIdx !== -1 ? dayRowIdx + 1 : 4;
        for (let r = startR; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const col0 = String(row[0] || "").trim().toUpperCase();
          const col1 = String(row[1] || "").trim().toUpperCase();

          if (col0.includes("BUSINESS") || col1.includes("BUSINESS")) {
            currentGroup = "Business";
          }
          if (col0.includes("REAL") || col1.includes("REAL")) {
            currentGroup = "Real";
          }

          let nik = "";
          let name = "";
          let phone = "";

          if (dayColStart >= 3) {
            nik = String(row[0] || "").trim();
            name = String(row[1] || "").trim();
            phone = String(row[2] || "").trim();
          } else {
            name = String(row[0] || "").trim();
          }

          if (name.includes("Care Center") || name.includes("Reguler") || name.length < 2) {
            continue;
          }

          const shifts: Record<number, string> = {};
          for (let d = 1; d <= days; d++) {
            const val = String(row[dayColStart + d - 1] || "").trim().toUpperCase();
            if (val) {
              shifts[d] = val;
            }
          }

          parsedPersonel.push({
            id: crypto.randomUUID(),
            nik,
            name,
            phone,
            group: currentGroup,
            shifts,
          });
        }

        if (parsedPersonel.length === 0) {
          toast.error("Tidak dapat membaca data personel. Pastikan template sesuai.");
          return;
        }

        let regDays = 0;
        for (let d = 1; d <= days; d++) {
          const dt = new Date(y, m - 1, d);
          if (dt.getDay() !== 0 && dt.getDay() !== 6) regDays++;
        }

        const newSchedule: ScheduleData = {
          period: selectedPeriod,
          title: `SCHEDULE ${(MONTH_NAMES_ID[m - 1] || "").toUpperCase()} ${y}`,
          year: y,
          month: m,
          daysInMonth: days,
          regulerDays: regDays,
          personel: parsedPersonel,
          holidays: schedule.holidays,
        };

        setLocalSchedule(newSchedule);
        setIsEditing(true);
        toast.success(`Berhasil memuat ${parsedPersonel.length} baris personel dari Excel!`);
      } catch (err: any) {
        toast.error("Gagal membaca Excel: " + (err.message || "Error format"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const handleExport = () => {
    try {
      const dataRows: any[][] = [];
      dataRows.push([schedule.title, "", "", currentTime]);
      dataRows.push([]);

      const header1 = ["JADWAL CARE CENTER", "Nama", "No Handphone"];
      for (let d = 1; d <= schedule.daysInMonth; d++) {
        const dt = new Date(schedule.year, schedule.month - 1, d);
        header1.push(DAY_NAMES_EN[dt.getDay()] || "");
      }
      dataRows.push(header1);

      const header2 = ["NIK", "Nama", "No Handphone"];
      for (let d = 1; d <= schedule.daysInMonth; d++) {
        header2.push(String(d));
      }
      dataRows.push(header2);

      for (const p of schedule.personel) {
        const row = [p.nik, p.name, p.phone];
        for (let d = 1; d <= schedule.daysInMonth; d++) {
          row.push(p.shifts[d] || "");
        }

Lovable:
     <thead>
                  <tr className="border-b border-border">
                    <th colSpan={3} className="bg-slate-200 dark:bg-slate-800 p-2 text-center font-bold border-r border-border min-w-[280px]">
                      JADWAL CARE CENTER
                    </th>
                    <th colSpan={schedule.daysInMonth} className="bg-emerald-100 dark:bg-emerald-950/50 p-2 text-center font-bold text-emerald-900 dark:text-emerald-200 border-b border-border">
                      {MONTH_NAMES_ID[schedule.month - 1]} {schedule.year}
                    </th>
                  </tr>
                  <tr className="border-b border-border text-[11px]">
                    <th className="p-1.5 border-r border-border bg-slate-100 dark:bg-slate-900 font-semibold w-[80px]">NIK</th>
                    <th className="p-1.5 border-r border-border bg-slate-100 dark:bg-slate-900 font-semibold w-[160px]">Nama</th>
                    <th className="p-1.5 border-r border-border bg-sky-100 dark:bg-sky-950/40 text-sky-900 dark:text-sky-300 font-semibold w-[110px]">No Handphone</th>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {
                      const day = idx + 1;
                      const dt = new Date(schedule.year, schedule.month - 1, day);
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <th
                          key={day}
                          className={`p-1 border-r border-border text-center min-w-[32px] ${
                            isWeekend ? "bg-rose-500 text-white font-bold" : "bg-slate-50 dark:bg-slate-900 text-foreground"
                          }`}
                        >
                          {DAY_NAMES_EN[dt.getDay()]}
                        </th>
                      );
                    })}
                  </tr>
                  <tr className="border-b-2 border-border text-xs">
                    <th colSpan={3} className="p-1.5 border-r border-border bg-slate-100 dark:bg-slate-900 text-left pl-3 text-muted-foreground font-medium">
                      Tanggal
                    </th>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {
                      const day = idx + 1;
                      const dt = new Date(schedule.year, schedule.month - 1, day);
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      const isToday = day === now.getDate() && schedule.month === (now.getMonth() + 1) && schedule.year === now.getFullYear();
                      return (
                        <th
                          key={day}
                          className={`p-1 border-r border-border text-center font-bold ${
                            isWeekend
                              ? "bg-rose-500 text-white"
                              : isToday
                              ? "bg-emerald-200 text-emerald-950 ring-2 ring-emerald-500"
                              : "bg-slate-100 dark:bg-slate-800 text-foreground"
                          }`}
                        >
                          {day}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50">
                    <td colSpan={3} className="p-2 border-r border-border font-semibold text-center text-muted-foreground">
                      Reguler
                    </td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {

Lovable:
         const day = idx + 1;
                      const dt = new Date(schedule.year, schedule.month - 1, day);
                      const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;
                      return (
                        <td key={day} className="p-1 border-r border-border text-center font-semibold text-emerald-700 dark:text-emerald-400">
                          {isWeekend ? "" : "R"}
                        </td>
                      );
                    })}
                  </tr>

                  {realPersonel.map((p, pIdx) => {
                    const rowBg = getPersonelRowBg(p.name);
                    return (
                      <tr key={p.id} className={`border-b border-border hover:bg-accent/40 ${rowBg}`}>
                        {pIdx === 0 && (
                          <td
                            rowSpan={realPersonel.length}
                            className="p-2 border-r border-border font-bold text-center bg-slate-100/80 dark:bg-slate-800/80"
                          >
                            Real
                          </td>
                        )}
                        <td className="p-1.5 border-r border-border font-mono text-[11px]">{p.nik || "-"}</td>
                        <td className="p-1.5 border-r border-border font-medium whitespace-nowrap">{p.name}</td>
                        <td className="p-1.5 border-r border-border font-mono text-[11px] text-muted-foreground">{p.phone || "-"}</td>
                        {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const shiftVal = p.shifts[day] || "";
                          return (
                            <td key={day} className="p-0.5 border-r border-border text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full text-center text-xs py-1 border-0 focus:ring-1 focus:ring-primary uppercase font-bold bg-transparent"
                                  value={shiftVal}
                                  placeholder="-"
                                  onChange={(e) => handleShiftChange(p.id, day, e.target.value)}
                                />
                              ) : (
                                <span className={`inline-block w-full py-0.5 rounded text-[11px] ${getShiftBadgeClass(shiftVal)}`}>
                                  {shiftVal || "—"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {bizPersonel.map((p, pIdx) => {
                    const rowBg = getPersonelRowBg(p.name);
                    return (
                      <tr key={p.id} className={`border-b border-border hover:bg-accent/40 ${rowBg}`}>
                        {pIdx === 0 && (
                          <td
                            rowSpan={bizPersonel.length}
                            className="p-2 border-r border-border font-bold text-center bg-slate-100/80 dark:bg-slate-800/80"
                          >
                            Business
                          </td>
                        )}
                        <td className="p-1.5 border-r border-border font-mono text-[11px]">{p.nik || "-"}</td>
                        <td className="p-1.5 border-r border-border font-medium whitespace-nowrap">{p.name}</td>
                        <td className="p-1.5 border-r

Lovable:
border-border font-mono text-[11px] text-muted-foreground">{p.phone || "-"}</td>
                        {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {
                          const day = idx + 1;
                          const shiftVal = p.shifts[day] || "";
                          return (
                            <td key={day} className="p-0.5 border-r border-border text-center">
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="w-full text-center text-xs py-1 border-0 focus:ring-1 focus:ring-primary uppercase font-bold bg-transparent"
                                  value={shiftVal}
                                  placeholder="-"
                                  onChange={(e) => handleShiftChange(p.id, day, e.target.value)}
                                />
                              ) : (
                                <span className={`inline-block w-full py-0.5 rounded text-[11px] ${getShiftBadgeClass(shiftVal)}`}>
                                  {shiftVal || "—"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  <tr className="border-t-2 border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td rowSpan={4} className="p-2 border-r border-border font-bold text-center">SHIFT</td>
                    <td colSpan={2} className="p-1.5 border-r border-border">P - Pagi (07:00 - 15:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.realDuty[idx + 1]?.p || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td colSpan={2} className="p-1.5 border-r border-border">S - Siang (15:00 - 23:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.realDuty[idx + 1]?.s || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td colSpan={2} className="p-1.5 border-r border-border">M - Malam (23:00 - 07:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.realDuty[idx + 1]?.m || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-border bg-rose-200 dark:bg-rose-950 text-rose-950 dark:text-rose-200 font-bold">
                    <td colSpan={2} className="p-1.5 border-r border-border text-center">On Duty/Day</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.realDuty[idx + 1]?.total || 0}</td>
                    ))}
                  </tr>

                  <tr className="border-t border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td rowSpan={4} className="p-2 border-r border-border font-bold text-center

Lovable:
">Business</td>
                    <td colSpan={2} className="p-1.5 border-r border-border">P - Pagi (07:00 - 15:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.bizDuty[idx + 1]?.p || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td colSpan={2} className="p-1.5 border-r border-border">S - Siang (15:00 - 23:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.bizDuty[idx + 1]?.s || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border bg-slate-100 dark:bg-slate-800/90 font-medium">
                    <td colSpan={2} className="p-1.5 border-r border-border">M - Malam (23:00 - 07:00)</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.bizDuty[idx + 1]?.m || 0}</td>
                    ))}
                  </tr>
                  <tr className="border-b-2 border-border bg-rose-200 dark:bg-rose-950 text-rose-950 dark:text-rose-200 font-bold">
                    <td colSpan={2} className="p-1.5 border-r border-border text-center">On Duty/Day</td>
                    {Array.from({ length: schedule.daysInMonth }).map((_, idx) => (
                      <td key={idx} className="p-1 border-r border-border text-center">{dailyShiftDuty.bizDuty[idx + 1]?.total || 0}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="rekap" className="space-y-6 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3 overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border bg-sky-100 dark:bg-sky-950/60 text-sky-950 dark:text-sky-200 font-bold">
                      <th className="p-2 border-r border-border text-center w-[60px]">Grup</th>
                      <th className="p-2 border-r border-border text-center w-[80px]">NIK</th>
                      <th className="p-2 border-r border-border text-left min-w-[150px]">Personil</th>
                      <th className="p-2 border-r border-border text-center w-[70px]">Status</th>
                      <th className="p-2 border-r border-border text-center w-[35px]">R</th>
                      <th className="p-2 border-r border-border text-center w-[35px]">P</th>
                      <th className="p-2 border-r border-border text-center w-[35px]">S</th>
                      <th className="p-2 border-r border-border text-center w-[35px]">M</th>
                      <th className="p-2 border-r border-border text-center w-[35px] bg-rose-200 dark:bg-rose-950 text-rose-900">L</th>
                      <th className="p-2 border-r border-border text-center w-[35px] bg-amber-200 dark:bg-amber-950 text-amber-900">CT</th>
                      <th classNam

Lovable:
e="p-2 border-r border-border text-center w-[35px] bg-emerald-200 dark:bg-emerald-950 text-emerald-900">ST</th>
                      <th className="p-2 border-r border-border text-center w-[75px] bg-sky-200 dark:bg-sky-900 font-bold">Total Hari Kerja</th>
                      <th className="p-2 border-r border-border text-center w-[75px] bg-sky-200 dark:bg-sky-900 font-bold">Total Jam Kerja</th>
                      <th className="p-2 border-r border-border text-center w-[90px] bg-sky-100 dark:bg-sky-950 text-[10px]">Total Hari Backup (HK)</th>
                      <th className="p-2 border-r border-border text-center w-[90px] bg-sky-100 dark:bg-sky-950 text-[10px]">Total Jam Backup (HK)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border bg-slate-50 dark:bg-slate-900 font-semibold">
                      <td colSpan={4} className="p-2 border-r border-border text-center text-muted-foreground">Reguler</td>
                      <td className="p-2 border-r border-border text-center">{schedule.regulerDays}</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{schedule.regulerDays}</td>
                      <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{schedule.regulerDays * 8}</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border text-center">-</td>
                    </tr>

                    {realPersonel.map((p, idx) => {
                      const stats = calculatePersonel(p);
                      const rowBg = getPersonelRowBg(p.name);
                      return (
                        <tr key={p.id} className={`border-b border-border hover:bg-accent/40 ${rowBg}`}>
                          {idx === 0 && (
                            <td rowSpan={realPersonel.length} className="p-2 border-r border-border text-center font-bold bg-slate-100/70 dark:bg-slate-800/70">
                              Real
                            </td>
                          )}
                          <td className="p-2 border-r border-border font-mono text-[11px]">{p.nik}</td>
                          <td className="p-2 border-r border-border font-medium">{p.name}</td>
                          <td className="p-2 border-r border-border text-center text-muted-foreground">Shift</td>
                          <td className="p-2 border-r border-border text-center">{stats.rCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats.pCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats.sCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats

Lovable:
.mCount || ""}</td>
                          <td className="p-2 border-r border-border text-center">{stats.lCount || ""}</td>
                          <td className="p-2 border-r border-border text-center bg-amber-100/50 dark:bg-amber-950/30 font-semibold">{stats.ctCount || ""}</td>
                          <td className="p-2 border-r border-border text-center bg-emerald-100/50 dark:bg-emerald-950/30 font-semibold">{stats.stCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{stats.totalHariKerja}</td>
                          <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{stats.totalJamKerja}</td>
                          <td className="p-2 border-r border-border text-center font-semibold text-blue-600 dark:text-blue-400">{stats.backupBufferHK || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold text-blue-600 dark:text-blue-400">{stats.backupBufferJam || ""}</td>
                        </tr>
                      );
                    })}

                    {bizPersonel.map((p, idx) => {
                      const stats = calculatePersonel(p);
                      const rowBg = getPersonelRowBg(p.name);
                      return (
                        <tr key={p.id} className={`border-b border-border hover:bg-accent/40 ${rowBg}`}>
                          {idx === 0 && (
                            <td rowSpan={bizPersonel.length} className="p-2 border-r border-border text-center font-bold bg-slate-100/70 dark:bg-slate-800/70">
                              Business
                            </td>
                          )}
                          <td className="p-2 border-r border-border font-mono text-[11px]">{p.nik}</td>
                          <td className="p-2 border-r border-border font-medium">{p.name}</td>
                          <td className="p-2 border-r border-border text-center text-muted-foreground">Shift</td>
                          <td className="p-2 border-r border-border text-center">{stats.rCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats.pCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats.sCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-semibold">{stats.mCount || ""}</td>
                          <td className="p-2 border-r border-border text-center">{stats.lCount || ""}</td>
                          <td className="p-2 border-r border-border text-center bg-amber-100/50 dark:bg-amber-950/30 font-semibold">{stats.ctCount || ""}</td>
                          <td className="p-2 border-r border-border text-center bg-emerald-100/50 dark:bg-emerald-950/30 font-semibold">{stats.stCount || ""}</td>
                          <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{stats.totalHariKerja}</td>
                          <td className="p-2 border-r border-border text-center font-bold bg-sky-50 dark:bg-sky-950/30">{stats.totalJamKerja}</td>
                          <td className="p-2 border-r border-border text-center font-semibold text-blue-600 dark:text-blue-400">{stats.backupBufferHK || ""}</td>
                          <td className="p-2 border-r

Lovable:
border-border text-center font-semibold text-blue-600 dark:text-blue-400">{stats.backupBufferJam || ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-4">
                <Card className="border-2 border-slate-900/40 shadow-sm">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-center text-sm font-black uppercase tracking-wider">
                      LIBUR NASIONAL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-2 text-xs space-y-2">
                    {schedule.holidays.length === 0 ? (
                      <p className="text-muted-foreground text-center italic">Tidak ada libur nasional.</p>
                    ) : (
                      schedule.holidays.map((h, i) => (
                        <div key={i} className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 font-medium text-center">
                          {h.date} {MONTH_NAMES_ID[schedule.month - 1]} {schedule.year}: {h.note}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border shadow-sm">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      KETERANGAN KODE SHIFT
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-2 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5"><span className="font-bold text-emerald-700">R</span><span>: Reguler</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-amber-700">P</span><span>: Pagi</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-sky-700">S</span><span>: Siang</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-purple-700">M</span><span>: Malam</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-rose-700">L</span><span>: Libur</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-amber-600">CT</span><span>: Cuti</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-emerald-600">ST</span><span>: Sakit</span></div>
                      <div className="flex items-center gap-1.5"><span className="font-bold text-blue-700">B</span><span>: Backup</span></div>
                    </div>
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