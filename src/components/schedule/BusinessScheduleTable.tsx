import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BULAN_LIST } from "@/lib/daily-activity-constants";
import { isNationalHoliday, regularCode } from "@/lib/indonesia-holidays";
import { BUSINESS_CODES, businessCode, shiftCount, scheduleStats, type BusinessData, type Cell } from "@/lib/schedule";

const tone: Record<string, string> = {
  P: "bg-shift-morning text-shift-light hover:bg-shift-morning/90",
  S: "bg-shift-day text-shift-ink hover:bg-shift-day/90",
  PS: "bg-shift-day text-shift-ink hover:bg-shift-day/90",
  SM: "bg-shift-day text-shift-ink hover:bg-shift-day/90",
  M: "bg-shift-night text-shift-ink hover:bg-shift-night/90",
  L: "bg-shift-off text-transparent hover:bg-shift-off/90 select-none",
  CT: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  PSM: "bg-primary text-primary-foreground hover:bg-primary/90",
  R: "bg-slate-500 text-white hover:bg-slate-600 dark:bg-slate-500 dark:text-white dark:hover:bg-slate-600",
};
const toneFor = (c: string) => `font-bold ${tone[c] ?? "bg-success text-success-foreground hover:bg-success/90"}`;
const ORDER = ["P", "S", "M"];

export function businessCell(b: BusinessData, m: number, d: number, year: number, month: number): Cell {
  return b.cells[m]?.[d] ?? { code: m === -1 ? regularCode(year, month, d) : businessCode(m, year, month, d) };
}
export function businessStats(b: BusinessData, m: number, days: number, year: number, month: number) {
  const regularWork = scheduleStats((d) => businessCell(b, -1, d, year, month), days).work;
  return scheduleStats((d) => businessCell(b, m, d, year, month), days, regularWork);
}

export function BusinessScheduleTable({ data, onChange, year, month, days }: {
  data: BusinessData; onChange: (fn: (b: BusinessData) => void) => void; year: number; month: number; days: number;
}) {
  const [editing, setEditing] = useState<{ m: number; d: number } | null>(null);
  const [pending, setPending] = useState("P");
  const [backup, setBackup] = useState("none");
  const get = (m: number, d: number) => businessCell(data, m, d, year, month);

  const apply = () => {
    if (!editing) return;
    const { m, d } = editing;
    const cur = get(m, d);
    const normal = cur.originalCode ?? (cur.code !== "CT" && !cur.backupFor ? cur.code : m === -1 ? regularCode(year, month, d) : businessCode(m, year, month, d));
    onChange((b) => {
      b.cells[m] ??= {};
      b.cells[m][d] = { code: pending, ...(pending === "CT" ? { originalCode: normal } : {}) };
      if (pending === "CT" && backup !== "none") {
        const i = Number(backup);
        const oc = get(i, d);
        const own = oc.originalCode ?? (oc.backupFor ? "" : oc.code);
        const covered = shiftCount(normal) ? normal : "P";
        const code = [...new Set((own + covered).split(""))].filter((c) => ORDER.includes(c)).sort((a, z) => ORDER.indexOf(a) - ORDER.indexOf(z)).join("");
        b.cells[i] ??= {};
        b.cells[i][d] = { code, backupFor: m === -1 ? b.regular.name : b.members[m] ?? "Anggota", originalCode: own || undefined, covered };
      }
    });
    setEditing(null);
  };

  const idInputs = (m: number) => (["nik", "name", "phone"] as const).map((f) => {
    const label = f === "nik" ? "NIK" : f === "name" ? "Nama" : "No. Tlp";
    const value = m === -1 ? data.regular[f] : f === "nik" ? data.niks[m] : f === "name" ? data.members[m] : data.phones[m];
    return (
      <td key={f} className="px-1 py-1">
        <Input aria-label={`Business ${m === -1 ? "Reguler" : `anggota ${m + 1}`} ${label}`} value={value ?? ""} className="h-7 text-[11px]"
          onChange={(e) => onChange((b) => {
            const v = e.target.value;
            if (m === -1) b.regular[f] = v;
            else if (f === "nik") b.niks[m] = v;
            else if (f === "name") b.members[m] = v;
            else b.phones[m] = v;
          })} />
      </td>
    );
  });

  const row = (m: number) => {
    const s = businessStats(data, m, days, year, month);
    const name = m === -1 ? data.regular.name : data.members[m];
    return (
      <tr key={m} className={`border-t ${m === -1 ? "bg-muted/20" : ""}`}>
        {idInputs(m)}
        {Array.from({ length: days }, (_, i) => {
  const c = get(m, i + 1);
  return (
    <td key={i} className="p-0.5 text-center">
      <Button
        variant="ghost"
        type="button"
        onClick={() => {
          setEditing({ m, d: i + 1 });
          setPending(c.code);
          setBackup("none");
        }}
        aria-label={`Business ${name} tanggal ${i + 1}: ${c.code}`}
        title={c.backupFor ? `Backup untuk ${c.backupFor}` : undefined}
        className={`h-6 w-full rounded p-0 text-[9px] ${toneFor(c.code)} ${c.backupFor ? "ring-2 ring-success" : ""}`}
      >
        {c.code}
      </Button>
    </td>
  );
})}
        <td className="text-center text-xs font-bold text-primary">{s.work}</td>
        <td className="text-center font-semibold text-destructive">{s.ct}</td>
        <td className="text-center font-semibold text-success">{m === -1 ? "-" : s.bk}</td>
        <td className="text-center font-semibold text-foreground">{m === -1 ? "-" : s.buffer}</td>
      </tr>
    );
  };

  return (
    <div className="space-y-2">
      <h2 className="font-display text-base font-semibold">Jadwal Business</h2>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1500px] table-fixed border-collapse text-[10px]">
  <colgroup>
    <col className="w-[90px]" />
    <col className="w-[220px]" />
    <col className="w-[140px]" />
    {Array.from({ length: days }, (_, i) => <col key={i} />)}
    <col className="w-14" />
    <col className="w-8" />
    <col className="w-12" />
    <col className="w-12" />
  </colgroup>
          <thead>
            <tr className="bg-ops-navy text-primary-foreground dark:bg-ops-mist dark:text-foreground">
              <th className="px-2 py-1.5 text-left">NIK</th><th className="px-2 py-1.5 text-left">Nama</th><th className="px-2 py-1.5 text-left">No. Tlp</th>
                {Array.from({ length: days }, (_, i) => {
                  const dow = new Date(year, month, i + 1).getDay();
                  const isOff = dow === 0 || dow === 6 || isNationalHoliday(year, month, i + 1);
                  return (
                    <th key={i} className={`min-w-[26px] px-0.5 py-1 text-center ${isOff ? "font-bold text-red-400" : ""}`}>
                      <div>{i + 1}</div>
                      <div className={`text-[8px] font-normal ${isOff ? "font-bold" : "opacity-70"}`}>{["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"][dow]}</div>
                    </th>
                  );
                })}
              <th className="px-2 text-center">Hari Kerja</th><th className="px-2 text-center">CT</th><th className="px-2 text-center">Backup</th><th className="px-2 text-center">Buffer</th>
            </tr>
          </thead>
          <tbody>{[-1, 0, 1, 2, 3].map(row)}</tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground"></p>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Jadwal Business</DialogTitle>
            <DialogDescription>{editing && `${editing.m === -1 ? data.regular.name : data.members[editing.m]} · ${editing.d} ${BULAN_LIST[month]} ${year}`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-1">
              {BUSINESS_CODES.map((c) => <Button key={c} size="sm" variant={pending === c ? "default" : "outline"} onClick={() => setPending(c)}>{c}</Button>)}
            </div>
            {pending === "CT" && editing && (
              <Select value={backup} onValueChange={setBackup}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa backup</SelectItem>
                  {data.members.map((n, i) => i === editing.m ? null : <SelectItem key={i} value={String(i)}>{n} ({get(i, editing.d).code})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button className="w-full" onClick={apply}>Terapkan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
