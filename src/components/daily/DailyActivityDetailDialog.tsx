import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatTanggal, type DailyActivityRow } from "@/lib/daily-activity-constants";

const detailFields = [
  ["tanggal", "Date"], ["on_duty", "On Duty"], ["shift", "Shift"],
  ["category", "Category"], ["source_information", "Source Information"],
  ["to_do", "To Do"], ["product", "Product"], ["customer", "Customer"],
  ["nama_lokasi", "Nama Lokasi"], ["kontak_pic", "Kontak PIC"],
  ["rfo_general", "RFO General"], ["type_modem_sn", "Type Modem & SN KIT"],
  ["problem", "Problem"], ["action", "Action"], ["status", "Status"],
] as const;

export function DailyActivityStatus({ status }: { status: string }) {
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${status === "Close" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{status || "—"}</span>;
}

export function DailyActivityDetailDialog({ row, onClose, onEdit }: {
  row: DailyActivityRow | null;
  onClose: () => void;
  onEdit: (row: DailyActivityRow) => void;
}) {
  return (
    <Dialog open={Boolean(row)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detail Daily Activity</DialogTitle>
          <DialogDescription className="break-words">{row?.nama_lokasi || row?.customer || "Daily Activity"}</DialogDescription>
        </DialogHeader>
        {row && <dl className="grid gap-x-6 gap-y-4 py-2 sm:grid-cols-2">
          {detailFields.map(([key, label]) => (
            <div key={key} className={`min-w-0 border-b border-border pb-3 ${key === "problem" || key === "action" ? "sm:col-span-2" : ""}`}>
              <dt className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">{label}</dt>
              <dd className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground">
                {key === "status" ? <DailyActivityStatus status={row.status} /> : key === "tanggal" ? formatTanggal(row.tanggal) || "—" : row[key] || "—"}
              </dd>
            </div>
          ))}
        </dl>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={() => { if (row) onEdit(row); }}><Pencil className="size-4" /> Edit Activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}