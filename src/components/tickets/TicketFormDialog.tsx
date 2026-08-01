import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/tickets/DateTimePicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ASAL_GANGGUAN_OPTIONS,
  JENIS_OPTIONS,
  LAYANAN_OPTIONS,
  OPEN_BY_OPTIONS,
  REGIONAL_OPTIONS,
  STATUS_OPTIONS,
  TEAM_SEM_OPTIONS,
  computeDurasi,
  emptyTicket,
  toInputDateTime,
  type TicketFormValues,
  type TicketRow,
} from "@/lib/ticket-constants";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: TicketRow | null;
  onSubmit: (values: TicketFormValues) => Promise<void>;
};

const toIso = (value: string) => (value ? new Date(value).toISOString() : null);

export function TicketFormDialog({ open, onOpenChange, ticket, onSubmit }: Props) {
  const [values, setValues] = useState<TicketFormValues>(emptyTicket());
  const [openAt, setOpenAt] = useState("");
  const [closeAt, setCloseAt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (ticket) {
      const { id: _id, deleted_at: _d, created_at: _c, updated_at: _u, ...rest } = ticket;
      setValues(rest);
      setOpenAt(toInputDateTime(ticket.tanggal_open));
      setCloseAt(toInputDateTime(ticket.tanggal_close));
    } else {
      setValues(emptyTicket());
      setOpenAt(toInputDateTime(new Date().toISOString()));
      setCloseAt("");
    }
  }, [open, ticket]);

  const set = <K extends keyof TicketFormValues>(key: K, value: TicketFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const durasiAuto = useMemo(
    () => computeDurasi(toIso(openAt), toIso(closeAt)),
    [openAt, closeAt],
  );

  const submit = async () => {
    setSaving(true);
    try {
      const tanggalOpen = toIso(openAt);
      const tanggalClose = toIso(closeAt);
      await onSubmit({
        ...values,
        tanggal_open: tanggalOpen,
        tanggal_close: tanggalClose,
        durasi: computeDurasi(tanggalOpen, tanggalClose),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const fieldLabel = (label: string, required = true) => (
    <Label className="text-[11px] font-bold tracking-wide uppercase">
      {label}
      {required ? <span className="text-destructive">*</span> : null}
    </Label>
  );

  const selectField = (
    label: string,
    key: keyof TicketFormValues,
    options: readonly string[],
  ) => (
    <div className="space-y-1.5">
      {fieldLabel(label)}
      <Select
        value={(values[key] as string) || ""}
        onValueChange={(v) => set(key, v as never)}
      >
        <SelectTrigger className="h-10 w-full bg-surface">
          <SelectValue placeholder={`Pilih ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const textField = (label: string, key: keyof TicketFormValues, required = true) => (
    <div className="space-y-1.5">
      {fieldLabel(label, required)}
      <Input
        value={(values[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={label}
        className="h-10 bg-surface"
      />
    </div>
  );

  const textareaField = (label: string, key: keyof TicketFormValues, rows: number, required = true) => (
    <div className="space-y-1.5 sm:col-span-2">
      {fieldLabel(label, required)}
      <Textarea
        rows={rows}
        value={(values[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
        className="bg-surface"
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="space-y-1 bg-gradient-to-r from-primary to-info px-5 py-4 text-left">
          <DialogTitle className="text-base font-bold text-primary-foreground">
            {ticket ? "Edit Ticket" : "Tambah Ticket"}
          </DialogTitle>
          <DialogDescription className="text-xs text-primary-foreground/85">
            Lengkapi data gangguan. Durasi dihitung otomatis dari Tanggal Open dan Tanggal
            Close.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {selectField("Status", "status", STATUS_OPTIONS)}
            {selectField("Indikasi Asal Gangguan", "asal_gangguan", ASAL_GANGGUAN_OPTIONS)}
            {textField("Customer", "customer")}
            {textField("Nama Lokasi", "nama_lokasi")}
            {textField("Tiket Mantools", "tiket_mantools")}
            {textField("Tiket Noxis", "tiket_noxis")}
            {selectField("Layanan", "layanan", LAYANAN_OPTIONS)}
            {selectField("Jenis Ticket", "jenis_ticket", JENIS_OPTIONS)}
            {selectField("Regional", "regional", REGIONAL_OPTIONS)}
            {textField("Teknisi", "teknisi")}
            {textareaField("Indikasi Gangguan", "indikasi_gangguan", 3)}
            {textareaField("Last Update", "last_update", 3, false)}
            <div className="space-y-1.5 sm:col-span-2">
              {fieldLabel("Keterangan")}
              <Input
                value={values.keterangan ?? ""}
                onChange={(e) => set("keterangan", e.target.value)}
                className="h-10 bg-surface"
              />
            </div>
            {selectField("Team SEM", "team_sem", TEAM_SEM_OPTIONS)}
            {selectField("Open By", "open_by", OPEN_BY_OPTIONS)}
            <div className="space-y-1.5">
              {fieldLabel("Tanggal Open")}
              <DateTimePicker value={openAt} onChange={setOpenAt} />
            </div>
            <div className="space-y-1.5">
              {fieldLabel("Tanggal Close", false)}
              <DateTimePicker value={closeAt} onChange={setCloseAt} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              {fieldLabel("Durasi (Otomatis)", false)}
              <Input
                readOnly
                value={durasiAuto || "-"}
                className="h-10 bg-muted/60 text-muted-foreground"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-muted/40 px-5 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Menyimpan…" : ticket ? "Simpan Perubahan" : "Simpan Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}