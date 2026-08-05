import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, History, Plus, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DailyActivityFilters } from "@/components/daily/DailyActivityFilters";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  emptyDailyFilters,
  filterDailyRows,
  formatTanggal,
  tahunOptionsFrom,
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
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [filters, setFilters] = useState(emptyDailyFilters);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["daily-activities", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DailyActivityRow[];
    },
  });

  const { data: deleted = [], isPending: deletedPending } = useQuery({
    queryKey: ["daily-activities", "deleted"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
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
    const { error } = await supabase
      .from("daily_activities")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selected);
    if (error) {
      toast.error("Gagal menghapus activity", { description: error.message });
      return;
    }
    toast.success(`${selected.length} activity dihapus`, {
      description: "Bisa dikembalikan lewat menu Rollback.",
    });
    setSelected([]);
    setConfirmDelete(false);
    refresh();
  };

  const restore = async (ids: string[]) => {
    const { error } = await supabase
      .from("daily_activities")
      .update({ deleted_at: null })
      .in("id", ids);
    if (error) {
      toast.error("Gagal mengembalikan activity", { description: error.message });
      return;
    }
    toast.success(`${ids.length} activity dikembalikan`);
    refresh();
  };

  const tahunOptions = useMemo(() => tahunOptionsFrom(rows), [rows]);
  const filtered = useMemo(() => filterDailyRows(rows, filters), [rows, filters]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

  const exportExcel = () => {
    const head = ["No", ...headers.map((h) => h.label)];
    const body = filtered.map((row, index) => [
      String(index + 1),
      ...headers.map((h) =>
        h.key === "tanggal"
          ? formatTanggal(row.tanggal)
          : ((row[h.key] as string | null) ?? "-"),
      ),
    ]);
    const escape = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head
      .map((h) => `<th>${escape(h)}</th>`)
      .join("")}</tr></thead><tbody>${body
      .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-activity-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel dimulai");
  };

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
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRollbackOpen(true)}>
            <History className="size-4" /> Rollback
            {deleted.length > 0 ? (
              <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {deleted.length}
              </span>
            ) : null}
          </Button>
          <span className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {rows.length} activity
          </span>
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

        <div className="mt-4">
          <DailyActivityFilters
            filters={filters}
            onChange={setFilters}
            tahunOptions={tahunOptions}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1900px] border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                <th className="cell-center w-8 px-1.5 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) =>
                      setSelected(checked ? filtered.map((r) => r.id) : [])
                    }
                    aria-label="Pilih semua activity"
                  />
                </th>
                <th className="cell-center w-9 px-1.5 py-2 text-[10px] font-bold uppercase">No</th>
                {headers.map((h) => (
                  <th
                    key={h.key}
                    className="cell-center px-2 py-2 text-[10px] font-bold tracking-wide whitespace-nowrap uppercase"
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length + 2}
                    className="cell-center px-3 py-10 text-muted-foreground"
                  >
                    Belum ada activity. Klik “Tambah Activity” untuk membuat baris baru.
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => (
                  <tr key={row.id} className="border-b border-border last:border-0 align-top">
                    <td className="cell-center px-1.5 py-1.5">
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
                    <td className="cell-center px-1.5 py-1.5 font-semibold">{index + 1}</td>
                    {headers.map((h) => (
                      <td key={h.key} className="px-1.5 py-1 align-middle">
                        {h.kind === "date" ? (
                          <Input
                            type="date"
                            value={(row.tanggal as string | null) ?? ""}
                            onChange={(e) => updateField(row.id, "tanggal", e.target.value)}
                            className="h-7 w-[118px] px-1 text-center text-[11px]"
                          />
                        ) : h.kind === "select" ? (
                          <Select
                            value={(row[h.key] as string | null) ?? ""}
                            onValueChange={(v) => updateField(row.id, h.key, v)}
                          >
                            <SelectTrigger className="h-7 w-[140px] justify-center px-2 text-[11px]">
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {(dropdowns[h.key] ?? []).map((option) => (
                                <SelectItem key={option} value={option} className="text-[11px]">
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
                            className="min-h-7 w-[170px] resize-y px-1.5 py-1 text-[11px] leading-snug break-words whitespace-pre-wrap"
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

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.length} activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Data activity yang dipilih akan dipindahkan ke Rollback dan bisa dikembalikan
              kapan saja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={deleteSelected}>Ya, hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rollback Daily Activity Terhapus</DialogTitle>
            <DialogDescription>
              Activity yang dihapus tersimpan di sini dan bisa dikembalikan kapan saja.
            </DialogDescription>
          </DialogHeader>
          {deletedPending ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Memuat data…</p>
          ) : deleted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada activity yang dihapus.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restore(deleted.map((row) => row.id))}
                >
                  <RotateCcw className="size-4" /> Kembalikan semua
                </Button>
              </div>
              {deleted.map((row) => (
                <div
                  key={row.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span>{formatTanggal(row.tanggal) || "-"}</span>
                      <span>{row.on_duty ?? "-"}</span>
                      <span className="text-muted-foreground">{row.product ?? "-"}</span>
                    </div>
                    <p className="text-xs break-words text-muted-foreground">
                      {row.customer ?? "-"} · {row.nama_lokasi ?? "-"}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => restore([row.id])}>
                    <RotateCcw className="size-4" /> Kembalikan
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
