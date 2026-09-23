import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
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
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";

export const Route = createFileRoute("/jadwal" as any)({
  head: () => ({
    meta: [
      { title: "Jadwal Kerja Tim — Reporting CC 3" },
      {
        name: "description",
        content: "Roster shift bulanan, upload Excel jadwal, dan rekap kehadiran kerja.",
      },
    ],
  }),
  component: JadwalPage,
});

export interface PersonelShift {
  id: string;
  nik?: string;
  name: string;
  phone?: string;
  group: "Reguler" | "Business" | "Other";
  shifts: Record<number, string>; // tanggal 1-31 -> kode shift ("P", "S", "M", "R", "L", "CT", "ST")
}

export interface ScheduleData {
  period: string; // "2026-09"
  title: string;
  year: number;
  month: number; // 1-12
  daysInMonth: number;
  personel: PersonelShift[];
  holidays?: { date: number; note: string }[];
}

const SHIFT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  P: { bg: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300", text: "text-amber-700", label: "Pagi (07:00-15:00)" },
  S: { bg: "bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300", text: "text-sky-700", label: "Siang (15:00-23:00)" },
  M: { bg: "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300", text: "text-purple-700", label: "Malam (23:00-07:00)" },
  R: { bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300", text: "text-emerald-700", label: "Reguler (08:00-17:00)" },
  L: { bg: "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300", text: "text-rose-700", label: "Libur / Off" },
  CT: { bg: "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300", text: "text-teal-700", label: "Cuti Tahunan" },
  ST: { bg: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300", text: "text-slate-700", label: "Sakit / Izin" },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function JadwalPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAccess();
  const fileInputRef = useRef<HTMLInputElement>(null);

    const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const [isEditing, setIsEditing] = useState(false);
  const [localSchedule, setLocalSchedule] = useState<ScheduleData | null>(null);

  // Ambil daftar periode jadwal dari database Supabase
  const { data: scheduleList = [] } = useQuery({
    queryKey: ["schedules-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("schedules")
        .select("period, title, updated_at")
        .order("period", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Ambil detail jadwal periode terpilih
  const { data: currentSchedule, isLoading, refetch } = useQuery({
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

  // Sinkronkan state lokal saat ganti periode atau data baru masuk
  const schedule: ScheduleData = useMemo(() => {
    if (localSchedule && localSchedule.period === selectedPeriod) {
      return localSchedule;
    }
    if (currentSchedule) {
      return currentSchedule;
    }
    const [y, m] = selectedPeriod.split("-").map(Number);
    const days = getDaysInMonth(y, m);
    return {
      period: selectedPeriod,
      title: `SCHEDULE ${MONTH_NAMES[m - 1].toUpperCase()} ${y}`,
      year: y,
      month: m,
      daysInMonth: days,
      personel: [],
      holidays: [],
    };
  }, [localSchedule, currentSchedule, selectedPeriod]);

  // Handle parsing Excel
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (rows.length < 3) {
          toast.error("Format Excel terlalu pendek atau kosong.");
          return;
        }

        const [y, m] = selectedPeriod.split("-").map(Number);
        const days = getDaysInMonth(y, m);

        // Cari baris header tanggal (angka 1 s/d 28-31)
        let headerRowIdx = -1;
                let dayColStart = -1;

        for (let r = 0; r < Math.min(10, rows.length); r++) {
          for (let c = 0; c < rows[r].length; c++) {
            if (Number(rows[r][c]) === 1 && Number(rows[r][c + 1]) === 2) {
              headerRowIdx = r;
              dayColStart = c;
              break;
            }
          }
          if (headerRowIdx !== -1) break;
        }

        const parsedPersonel: PersonelShift[] = [];
        let currentGroup: "Reguler" | "Business" | "Other" = "Reguler";

        const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 3;
        const colStart = dayColStart !== -1 ? dayColStart : 3;

        for (let r = startRow; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const firstCell = String(row[0] || "").trim().toUpperCase();
          const secondCell = String(row[1] || "").trim().toUpperCase();

          // Deteksi grup/bagian
          if (firstCell.includes("BUSINESS") || secondCell.includes("BUSINESS")) {
            currentGroup = "Business";
            continue;
          }
          if (firstCell.includes("REGULER") || secondCell.includes("REGULER")) {
            currentGroup = "Reguler";
            continue;
          }

          // Cari kolom nama (biasanya kolom 1 atau 2)
          let name = "";
          let nik = "";
          let phone = "";

          if (colStart > 2) {
            nik = String(row[0] || "").trim();
            name = String(row[1] || "").trim();
            phone = String(row[2] || "").trim();
          } else {
            name = String(row[0] || "").trim();
          }

          if (!name || name === "0" || name === "-" || name.length < 2) continue;

          const shifts: Record<number, string> = {};
          for (let d = 1; d <= days; d++) {
            const shiftVal = String(row[colStart + d - 1] || "").trim().toUpperCase();
            if (shiftVal) {
              shifts[d] = shiftVal;
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
          toast.error("Tidak dapat menemukan data nama personel. Periksa susunan kolom Excel.");
          return;
        }

        const newSchedule: ScheduleData = {
          period: selectedPeriod,
          title: `SCHEDULE ${MONTH_NAMES[m - 1].toUpperCase()} ${y}`,
          year: y,
          month: m,
          daysInMonth: days,
          personel: parsedPersonel,
          holidays: [],
        };

        setLocalSchedule(newSchedule);
        setIsEditing(true);
        toast.success(`Berhasil memuat ${parsedPersonel.length} personel dari file Excel! Silakan klik 'Simpan Jadwal'.`);
      } catch (err: any) {
        toast.error("Gagal membaca file Excel: " + (err.message || "format tidak didukung"));
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  // Simpan data jadwal ke tabel Supabase
  const handleSaveSchedule = async () => {
    try {
      const payload = {
        period: schedule.period,
        title: schedule.title,
        data: {
          year: schedule.year,
          month: schedule.month,
          daysInMonth: schedule.daysInMonth,
          personel: schedule.personel,
          holidays: schedule.holidays || [],
        },
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any).from("schedules").upsert(payload, {
        onConflict: "period",
      });

      if (error) throw error;

      toast.success("Jadwal kerja berhasil disimpan ke database!");
      setIsEditing(false);
      setLocalSchedule(null);
      queryClient.invalidateQueries({ queryKey: ["schedules-list"] });
      queryClient.invalidateQueries({ queryKey: ["schedule", selectedPeriod] });
      refetch();
    } catch (err: any) {
      toast.error("Gagal menyimpan jadwal: " + (err.message || "Error database"));
    }
  };

  // Ubah shift seorang personel secara manual
  const updatePersonelShift = (personelId: string, day: number, val: string) => {
    if (!isEditing) return;
    const cleanVal = val.trim().toUpperCase();
    setLocalSchedule((prev) => {
      const base = prev || schedule;
      return {
        ...base,
        personel: base.personel.map((p) => {
          if (p.id !== personelId) return p;
          const updatedShifts = { ...p.shifts };
          if (!cleanVal) {
            delete updatedShifts[day];
          } else {
            updatedShifts[day] = cleanVal;
          }
          return { ...p, shifts: updatedShifts };
        }),
      };
    });
  };

    // Hitung rekap per orang
  const calculatePersonelSummary = (p: PersonelShift) => {
    let pCount = 0,
      sCount = 0,
      mCount = 0,
      rCount = 0,
      lCount = 0,
      ctCount = 0,
      stCount = 0;

    Object.values(p.shifts).forEach((val) => {
      const s = val.toUpperCase();
      if (s === "P") pCount++;
      else if (s === "S") sCount++;
      else if (s === "M") mCount++;
      else if (s === "R") rCount++;
      else if (s === "L") lCount++;
      else if (s === "CT") ctCount++;
      else if (s === "ST") stCount++;
    });

    const workDays = pCount + sCount + mCount + rCount;
    const workHours = workDays * 8;
    return { pCount, sCount, mCount, rCount, lCount, ctCount, stCount, workDays, workHours };
  };

  // Export kembali ke file Excel
  const handleExportExcel = () => {
    if (!schedule.personel.length) {
      toast.error("Belum ada data jadwal untuk diexport.");
      return;
    }
    const headers = ["NIK", "Nama Personel", "Handphone", "Grup"];
    for (let d = 1; d <= schedule.daysInMonth; d++) {
      headers.push(String(d));
    }
    headers.push("P", "S", "M", "R", "L", "CT", "ST", "Hari Kerja", "Jam Kerja");

    const dataRows = schedule.personel.map((p) => {
      const sum = calculatePersonelSummary(p);
      const row: any[] = [p.nik || "-", p.name, p.phone || "-", p.group];
      for (let d = 1; d <= schedule.daysInMonth; d++) {
        row.push(p.shifts[d] || "");
      }
      row.push(sum.pCount, sum.sCount, sum.mCount, sum.rCount, sum.lCount, sum.ctCount, sum.stCount, sum.workDays, sum.workHours);
      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jadwal");
    XLSX.writeFile(wb, `Jadwal_${schedule.period}.xlsx`);
    toast.success("File Excel berhasil didownload.");
  };

  return (
    <AppShell
      title="Jadwal Kerja Tim"
      subtitle={schedule.title || "Roster Shift & Jadwal Piket Care Center"}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleExcelUpload}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <Select value={selectedPeriod} onValueChange={(val) => { setSelectedPeriod(val); setIsEditing(false); setLocalSchedule(null); }}>
            <SelectTrigger className="h-8 w-36 text-xs bg-background">
              <SelectValue placeholder="Pilih Periode" />
            </SelectTrigger>
            <SelectContent>
              {scheduleList.length > 0 ? (
                scheduleList.map((item: any) => (
                  <SelectItem key={item.period} value={item.period} className="text-xs">
                    {item.period}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value={selectedPeriod} className="text-xs">
                  {selectedPeriod}
                </SelectItem>
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
                    onClick={handleSaveSchedule}
                    
                  >
                    <Save className="size-3.5" />
                    Simpan Jadwal
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => { setIsEditing(false); setLocalSchedule(null); }}
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

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={handleExportExcel}
          >
            <Download className="size-3.5" />
            Export
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Ringkasan Legenda Shift */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-xs shadow-sm">
          <span className="font-semibold text-muted-foreground mr-1">Legenda Shift:</span>
          {Object.entries(SHIFT_COLORS).map(([code, meta]) => (
            <div key={code} className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center font-bold size-5 rounded text-[11px] ${meta.bg}`}>
                {code}
              </span>
              <span className="text-[11px] text-muted-foreground mr-2">{meta.label}</span>
            </div>
          ))}
          {isEditing && (
            <span className="ml-auto text-xs font-medium text-amber-600 animate-pulse">
              ● Mode Edit Aktif — klik kotak shift untuk ubah langsung
            </span>
          )}
        </div>

        {/* Tabel Matriks Jadwal Roster */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur font-semibold border-b border-border">
                <tr>
                  <th className="p-2 border-r border-border min-w-[36px] text-center sticky left-0 bg-muted z-30">No</th>
                  <th className="p-2 border-r border-border min-w-[170px] sticky left-[36px] bg-muted z-30">Nama Personel</th>
                  <th className="p-2 border-r border-border min-w-[100px]">No HP</th>
                  <th className="p-2 border-r border-border min-w-[80px]">Grup</th>
                  {Array.from({ length: schedule.daysInMonth }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const dateObj = new Date(schedule.year, schedule.month - 1, dayNum);
                    const dayOfWeek = DAY_NAMES[dateObj.getDay()];
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    return (
                      <th
                                                className={`p-1.5 border-r border-border text-center min-w-[32px] ${
                          isWeekend ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold" : ""
                        }`}
                        <div className="text-[10px] uppercase">{dayOfWeek}</div>
                        <div className="text-xs">{dayNum}</div>
                      </th>
                    );
                  })}
                  <th className="p-2 text-center min-w-[50px] bg-muted/60 border-l border-border">R</th>
                  <th className="p-2 text-center min-w-[50px] bg-muted/60">P</th>
                  <th className="p-2 text-center min-w-[50px] bg-muted/60">S</th>
                  <th className="p-2 text-center min-w-[50px] bg-muted/60">M</th>
                  <th className="p-2 text-center min-w-[50px] bg-muted/60">L</th>
                  <th className="p-2 text-center min-w-[60px] bg-muted/60">Hari</th>
                  <th className="p-2 text-center min-w-[60px] bg-muted/60">Jam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.personel.length === 0 ? (
                  <tr>
                    <td
                      colSpan={schedule.daysInMonth + 11}
                      className="p-8 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet className="size-8 text-muted-foreground/40" />
                        <p className="font-medium">Belum ada data jadwal untuk periode {selectedPeriod}.</p>
                        {isAdmin && (
                          <p className="text-xs">
                            Klik tombol <strong>Upload Excel</strong> di atas untuk mengunggah file roster jadwal.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  schedule.personel.map((p, pIdx) => {
                    const sum = calculatePersonelSummary(p);
                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-2 text-center border-r border-border sticky left-0 bg-card z-10 font-mono text-[11px]">
                          {pIdx + 1}
                        </td>
                        <td className="p-2 border-r border-border sticky left-[36px] bg-card z-10 font-medium truncate max-w-[180px]">
                          <div>{p.name}</div>
                          {p.nik && <div className="text-[10px] text-muted-foreground font-mono">{p.nik}</div>}
                        </td>
                        <td className="p-2 border-r border-border font-mono text-[11px] text-muted-foreground truncate max-w-[100px]">
                          {p.phone || "-"}
                        </td>
                        <td className="p-2 border-r border-border">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              p.group === "Business"
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                            }`}
                          >
                            {p.group}
                          </span>
                        </td>
                             {Array.from({ length: schedule.daysInMonth }).map((_, dIdx) => {
                          const dayNum = dIdx + 1;
                          const shiftVal = p.shifts[dayNum] || "";
                          const shiftColor = SHIFT_COLORS[shiftVal];
                          const dateObj = new Date(schedule.year, schedule.month - 1, dayNum);
                          const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                          return (
                            <td
                              key={dayNum}
                              className={`p-0.5 border-r border-border text-center ${
                                isWeekend ? "bg-rose-500/5" : ""
                              }`}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={shiftVal}
                                  maxLength={3}
                                  onChange={(e) => updatePersonelShift(p.id, dayNum, e.target.value)}
                                  className={`w-7 h-7 text-center rounded border font-bold text-xs uppercase focus:outline-none focus:ring-1 focus:ring-primary ${
                                    shiftColor ? shiftColor.bg : "bg-transparent border-dashed border-border"
                                  }`}
                                />
                              ) : (
                                <span
                                  className={`inline-flex items-center justify-center size-6 rounded font-bold text-xs ${
                                    shiftColor ? shiftColor.bg : "text-muted-foreground/30"
                                  }`}
                                >
                                  {shiftVal || "·"}
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-2 text-center border-l border-border font-medium bg-muted/20">{sum.rCount}</td>
                        <td className="p-2 text-center font-medium bg-muted/20 text-amber-600">{sum.pCount}</td>
                        <td className="p-2 text-center font-medium bg-muted/20 text-sky-600">{sum.sCount}</td>
                        <td className="p-2 text-center font-medium bg-muted/20 text-purple-600">{sum.mCount}</td>
                        <td className="p-2 text-center font-medium bg-muted/20 text-rose-600">{sum.lCount}</td>
                        <td className="p-2 text-center font-bold bg-muted/30">{sum.workDays}</td>
                        <td className="p-2 text-center font-bold bg-muted/30">{sum.workHours}h</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
