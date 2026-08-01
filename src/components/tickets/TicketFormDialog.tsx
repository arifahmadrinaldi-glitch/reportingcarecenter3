import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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

  const submit = async () => {
    setSaving(true);
    try {
      const tanggalOpen = toIso(openAt);
      const tanggalClose = toIso(closeAt);
      await onSubmit({
        ...values,
        tanggal_open: tanggalOpen,
        tanggal_close: tanggalClose,
        durasi: values.durasi || computeDurasi(tanggalOpen, tanggalClose),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const selectField = (
    label: string,
    key: keyof TicketFormValues,
    options: readonly string[],
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select
        value={(values[key] as string) || ""}
        onValueChange={(v) => set(key, v as never)}
      >
        <SelectTrigger>
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

  const textField = (label: string, key: keyof TicketFormValues) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        value={(values[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as never)}
        placeholder={label}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{ticket ? "Edit Ticket" : "Tambah Ticket"}</DialogTitle>
          <DialogDescription>
            {ticket
              ? "Perbarui data ticket gangguan."
              : "Ticket baru akan muncul di posisi nomor 1 pada daftar."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {selectField("Status", "status", STATUS_OPTIONS)}
          {textField("Customer", "customer")}
          {textField("Nama Lokasi", "nama_lokasi")}
          {textField("Tiket Mantools", "tiket_mantools")}
          {textField("Tiket Noxis", "tiket_noxis")}
          {selectField("Layanan", "layanan", LAYANAN_OPTIONS)}
          {selectField("Jenis Ticket", "jenis_ticket", JENIS_OPTIONS)}
          {selectField("Asal Gangguan", "asal_gangguan", ASAL_GANGGUAN_OPTIONS)}
          {selectField("Regional", "regional", REGIONAL_OPTIONS)}
          {selectField("Team SEM", "team_sem", TEAM_SEM_OPTIONS)}
          {textField("Open By", "open_by")}
          {textField("Teknisi", "teknisi")}
          <div className="space-y-1.5">
            <Label>Tanggal Open</Label>
            <Input
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal Close</Label>
            <Input
              type="datetime-local"
              value={closeAt}
              onChange={(e) => setCloseAt(e.target.value)}
            />
          </div>
          {textField("Durasi", "durasi")}
          {textField("Indikasi Gangguan", "indikasi_gangguan")}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Keterangan</Label>
            <Textarea
              rows={2}
              value={values.keterangan ?? ""}
              onChange={(e) => set("keterangan", e.target.value)}
              placeholder="Keterangan ticket"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Last Update</Label>
            <Textarea
              rows={3}
              value={values.last_update ?? ""}
              onChange={(e) => set("last_update", e.target.value)}
              placeholder="Progres terakhir penanganan"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Menyimpan…" : ticket ? "Simpan Perubahan" : "Simpan Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}