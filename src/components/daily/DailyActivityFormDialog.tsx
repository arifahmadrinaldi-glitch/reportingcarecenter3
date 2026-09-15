import { Save } from "lucide-react";
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
  ACTIVITY_STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  ON_DUTY_OPTIONS,
  PRODUCT_OPTIONS,
  RFO_GENERAL_OPTIONS,
  SHIFT_OPTIONS,
  SOURCE_OPTIONS,
  TO_DO_OPTIONS,
} from "@/lib/daily-activity-constants";

export type DailyActivityFormValues = {
  tanggal: string;
  on_duty: string;
  shift: string;
  category: string;
  source_information: string;
  to_do: string;
  product: string;
  customer: string;
  nama_lokasi: string;
  kontak_pic: string;
  rfo_general: string;
  type_modem_sn: string;
  problem: string;
  action: string;
  status: string;
};

const today = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const emptyActivity = (): DailyActivityFormValues => ({
  tanggal: today(),
  on_duty: "",
  shift: "",
  category: "",
  source_information: "",
  to_do: "",
  product: "",
  customer: "",
  nama_lokasi: "",
  kontak_pic: "",
  rfo_general: "",
  type_modem_sn: "",
  problem: "",
  action: "",
  status: "Open",
});

const selectFields = [
  ["on_duty", "On Duty", ON_DUTY_OPTIONS],
  ["shift", "Shift", SHIFT_OPTIONS],
  ["category", "Category", CATEGORY_OPTIONS],
  ["source_information", "Source Information", SOURCE_OPTIONS],
  ["to_do", "To Do", TO_DO_OPTIONS],
  ["product", "Product", PRODUCT_OPTIONS],
] as const;

const textFields = [
  ["customer", "Customer"],
  ["nama_lokasi", "Nama Lokasi"],
  ["kontak_pic", "Kontak PIC"],
] as const;

export function DailyActivityFormDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: DailyActivityFormValues) => Promise<boolean>;
}) {
  const [values, setValues] = useState<DailyActivityFormValues>(emptyActivity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues(emptyActivity());
  }, [open]);

  const set = (key: keyof DailyActivityFormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setSaving(true);
    try {
      const saved = await onSubmit(values);
      if (saved) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Tambah Daily Activity</DialogTitle>
          <DialogDescription>Lengkapi informasi activity baru sesuai urutan kolom tabel.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="activity-date">Date</Label>
            <Input
              id="activity-date"
              type="date"
              value={values.tanggal}
              onChange={(event) => set("tanggal", event.target.value)}
            />
          </div>

          {selectFields.map(([key, label, options]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Select value={values[key]} onValueChange={(value) => set(key, value)}>
                <SelectTrigger><SelectValue placeholder={`Pilih ${label}`} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}

          {textFields.map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`activity-${key}`}>{label}</Label>
              <Input
                id={`activity-${key}`}
                value={values[key]}
                onChange={(event) => set(key, event.target.value)}
                placeholder={`Masukkan ${label}`}
              />
            </div>
          ))}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>RFO General</Label>
            <Select value={values.rfo_general} onValueChange={(value) => set("rfo_general", value)}>
              <SelectTrigger><SelectValue placeholder="Pilih RFO General" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {RFO_GENERAL_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="activity-modem">Type Modem &amp; SN KIT</Label>
            <Input id="activity-modem" value={values.type_modem_sn} onChange={(event) => set("type_modem_sn", event.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="activity-problem">Problem</Label>
            <Textarea id="activity-problem" rows={3} value={values.problem} onChange={(event) => set("problem", event.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="activity-action">Action</Label>
            <Textarea id="activity-action" rows={3} value={values.action} onChange={(event) => set("action", event.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={values.status} onValueChange={(value) => set("status", value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIVITY_STATUS_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Batal</Button>
          <Button onClick={() => void submit()} disabled={saving}>
            <Save className="size-4" /> {saving ? "Menyimpan…" : "Simpan Activity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}