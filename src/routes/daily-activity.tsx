import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DailyActivityCharts } from "@/components/daily/DailyActivityCharts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  ACTIVITY_STATUS_OPTIONS,
  CATEGORY_OPTIONS,
  ON_DUTY_OPTIONS,
  PRODUCT_OPTIONS,
  RFO_GENERAL_OPTIONS,
  SHIFT_OPTIONS,
  SOURCE_OPTIONS,
  TO_DO_OPTIONS,
  type DailyActivityRow,
} from "@/lib/daily-activity-constants";

export const Route = createFileRoute("/daily-activity")({
  head: () => ({
    meta: [
      { title: "Daily Activity — Ticket Care Center 3" },
      {
        name: "description",
        content:
          "Catat aktivitas harian tim: on duty, shift, kategori, sumber informasi, produk, RFO general hingga status penyelesaian.",
      },
      { property: "og:title", content: "Daily Activity — Ticket Care Center 3" },
      {
        property: "og:description",
        content:
          "Tabel Daily Activity lengkap 15 kolom beserta dashboard analisis produk, on duty, to do dan RFO general.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyActivityPage,
});

type Field = keyof DailyActivityRow;

const dropdowns: Partial<Record<Field, readonly string[]>> = {
  on_duty: ON_DUTY_OPTIONS,
  shift: SHIFT_OPTIONS,
  category: CATEGORY_OPTIONS,
  source_information: SOURCE_OPTIONS,
  to_do: TO_DO_OPTIONS,
  product: PRODUCT_OPTIONS,
  rfo_general: RFO_GENERAL_OPTIONS,
  status: ACTIVITY_STATUS_OPTIONS,
};

const headers: { key: Field; label: string; kind: "date" | "select" | "text" }[] = [
  { key: "tanggal", label: "Date", kind: "date" },
  { key: "on_duty", label: "On Duty", kind: "select" },
  { key: "shift", label: "Shift", kind: "select" },
  { key: "category", label: "Category", kind: "select" },
  { key: "source_information", label: "Source Information", kind: "select" },
  { key: "to_do", label: "To Do", kind: "select" },
  { key: "product", label: "Product", kind: "select" },
  { key: "customer", label: "Customer", kind: "text" },
  { key: "nama_lokasi", label: "Nama Lokasi", kind: "text" },
  { key: "kontak_pic", label: "Kontak PIC", kind: "text" },
  { key: "rfo_general", label: "RFO General", kind: "select" },
  { key: "type_modem_sn", label: "Type Modem & SN KIT", kind: "text" },
  { key: "problem", label: "Problem", kind: "text" },
  { key: "action", label: "Action", kind: "text" },
  { key: "status", label: "Status", kind: "select" },
];

function DailyActivityPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["daily-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyActivityRow[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["daily-activities"] });

  const addRow = async () => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const { error } = await supabase.from("daily_activities").insert({
      tanggal: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      status: "Open",
    });
    if (error) {
      toast.error("Gagal menambah activity", { description: error.message });
      return;
    }
    toast.success("Activity baru ditambahkan di baris terakhir");
    refresh();
  };

  const updateField = async (id: string, key: Field, value: string) => {
    const patch = { [key]: value === "" ? null : value } as Partial<DailyActivityRow>;
    const { error } = await supabase
      .from("daily_activities")
      .update(patch)
      .eq("id", id);
    if (error) {
      toast.error("Gagal menyimpan perubahan", { description: error.message });
      return;
    }
    refresh();
  };

  const deleteSelected = async () => {
    const { error } = await supabase.from("daily_activities").delete().in("id", selected);
    if (error) {
      toast.error("Gagal menghapus activity", { description: error.message });
      return;
    }
    toast.success(`${selected.length} activity dihapus`);
    setSelected([]);
    setConfirmDelete(false);
    refresh();
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const charts = useMemo(() => rows, [rows]);

  return (
    <AppShell
      title="Daily Activity"
      subtitle="Pencatatan aktivitas harian tim Care Center 3"
      actions={
        <Button size="sm" onClick={addRow}>
          <Plus className="size-4" /> Tambah Activity
        </Button>
      }
    >
      <div className="panel p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={addRow}>
            <Plus className="size-4" /> Tambah Activity
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <span className="text-xs text-muted-foreground">{rows.length} activity tercatat</span>
          {selected.length > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              className="h-7"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" /> Hapus terpilih ({selected.length})
            </Button>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[2400px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="cell-center w-10 px-2 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? rows.map((r) => r.id) : [])
                    }
                    aria-label="Pilih semua activity"
                  />
                </th>
                <th className="cell-center w-12 px-2 py-3 text-[11px] font-bold uppercase">No</th>
                {headers.map((h) => (
                  <th
                    key={h.key}
                    className="cell-center px-3 py-3 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase"
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                <tr>
                  <td colSpan={headers.length + 2} className="cell-center px-3 py-10">
                    Memuat data…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length + 2}
                    className="cell-center px-3 py-10 text-muted-foreground"
                  >
                    Belum ada activity. Klik “Tambah Activity” untuk membuat baris baru.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-border last:border-0 align-top">
                    <td className="cell-center px-2 py-2">
                      <Checkbox
                        checked={selected.includes(row.id)}
                        onCheckedChange={(checked) =>
                          setSelected((prev) =>
                            checked ? [...prev, row.id] : prev.filter((id) => id !== row.id),
                          )
                        }
                        aria-label={`Pilih activity ${index + 1}`}
                      />
                    </td>
                    <td className="cell-center px-2 py-2 font-semibold">{index + 1}</td>
                    {headers.map((h) => (
                      <td key={h.key} className="px-2 py-2 align-middle">
                        {h.kind === "date" ? (
                          <Input
                            type="date"
                            value={(row.tanggal as string | null) ?? ""}
                            onChange={(e) => updateField(row.id, "tanggal", e.target.value)}
                            className="h-8 w-[150px] text-center text-xs"
                          />
                        ) : h.kind === "select" ? (
                          <Select
                            value={(row[h.key] as string | null) ?? ""}
                            onValueChange={(v) => updateField(row.id, h.key, v)}
                          >
                            <SelectTrigger className="h-8 w-[190px] justify-center text-xs">
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {(dropdowns[h.key] ?? []).map((option) => (
                                <SelectItem key={option} value={option} className="text-xs">
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Textarea
                            defaultValue={(row[h.key] as string | null) ?? ""}
                            onBlur={(e) => {
                              const next = e.target.value;
                              if (next !== ((row[h.key] as string | null) ?? "")) {
                                updateField(row.id, h.key, next);
                              }
                            }}
                            rows={2}
                            placeholder="Tulis di sini…"
                            className="min-h-8 w-[220px] resize-y text-xs break-words whitespace-pre-wrap"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DailyActivityCharts rows={charts} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.length} activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Data activity yang dipilih akan dihapus permanen dari daftar Daily Activity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSelected}>Ya, hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
