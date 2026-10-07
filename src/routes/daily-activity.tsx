import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, History, Plus, RefreshCw, RotateCcw, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DailyActivityDetailDialog, DailyActivityStatus } from "@/components/daily/DailyActivityDetailDialog";
import { DailyActivityFilters } from "@/components/daily/DailyActivityFilters";
import { DailyActivityFormDialog, type DailyActivityFormValues } from "@/components/daily/DailyActivityFormDialog";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";
import { parseSheetFile, pick } from "@/lib/import-sheet";
import {
  emptyDailyFilters,
  filterDailyRows,
  formatTanggal,
  tahunOptionsFrom,
  type DailyActivityRow,
} from "@/lib/daily-activity-constants";

export const Route = createFileRoute("/daily-activity")({
  head: () => ({
    meta: [
      { title: "Daily Activity — Reporting CC 3" },
      {
        name: "description",
        content:
          "Catat aktivitas harian tim: on duty, shift, kategori, sumber informasi, produk, RFO general hingga status penyelesaian.",
      },
      { property: "og:title", content: "Daily Activity — Reporting CC 3" },
      {
        property: "og:description",
        content:
          "Tabel Daily Activity ringkas dengan detail lengkap, filter dan analisis aktivitas tim Reporting CC 3.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DailyActivityPage,
});

type Field = keyof DailyActivityRow;

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
  const { isAdmin } = useAccess();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<DailyActivityRow | null>(null);
  const editValues = useMemo(
    () =>
      editingRow
        ? (Object.fromEntries(headers.map(({ key }) => [key, editingRow[key] ?? ""])) as DailyActivityFormValues)
        : undefined,
    [editingRow],
  );
  const openAddForm = () => {
    setEditingRow(null);
    setFormOpen(true);
  };
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<DailyActivityRow | null>(null);
  const [filters, setFilters] = useState(emptyDailyFilters);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["daily-activities", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_activities")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
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

  const addRow = async (values: DailyActivityFormValues) => {
    const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() || null]));
    const { error } = await supabase.from("daily_activities").insert({
      ...payload,
      status: values.status || "Open",
    });
    if (error) {
      toast.error("Gagal menambah activity", { description: error.message });
      return false;
    }
    toast.success("Activity baru ditambahkan");
    refresh();
    return true;
  };

  const saveEdit = async (values: DailyActivityFormValues) => {
    if (!editingRow) return false;
    const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim() || null]));
    const { error } = await supabase
      .from("daily_activities")
      .update({ ...payload, status: values.status || "Open" })
      .eq("id", editingRow.id);
    if (error) {
      toast.error("Gagal menyimpan perubahan", { description: error.message });
      return false;
    }
    toast.success("Activity diperbarui");
    refresh();
    return true;
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
    const { error } = await supabase.from("daily_activities").update({ deleted_at: null }).in("id", ids);
    if (error) {
      toast.error("Gagal mengembalikan activity", { description: error.message });
      return;
    }
    toast.success(`${ids.length} activity dikembalikan`);
    refresh();
  };

  const permanentlyDelete = async (id: string) => {
    const { error } = await supabase.from("daily_activities").delete().eq("id", id).not("deleted_at", "is", null);
    if (error) {
      toast.error("Gagal menghapus activity permanen", { description: error.message });
      return;
    }
    toast.success("Activity dihapus permanen");
    setPermanentDeleteTarget(null);
    refresh();
  };

  const tahunOptions = useMemo(() => tahunOptionsFrom(rows), [rows]);
  const filtered = useMemo(() => filterDailyRows(rows, filters), [rows, filters]);
  const [perPage, setPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, currentPage, perPage]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.includes(r.id));

  const parseImportDate = (value: string) => {
    if (!value) return null;
    const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const pad = (n: string) => n.padStart(2, "0");
    if (dmy?.[1] && dmy[2] && dmy[3]) return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseSheetFile(file);
      const payload = parsed
        .map((row) => ({
          tanggal: parseImportDate(pick(row, "Date", "Tanggal")),
          on_duty: pick(row, "On Duty") || null,
          shift: pick(row, "Shift") || null,
          category: pick(row, "Category") || null,
          source_information: pick(row, "Source Information") || null,
          to_do: pick(row, "To Do") || null,
          product: pick(row, "Product") || null,
          customer: pick(row, "Customer") || null,
          nama_lokasi: pick(row, "Nama Lokasi") || null,
          kontak_pic: pick(row, "Kontak PIC") || null,
          rfo_general: pick(row, "RFO General") || null,
          type_modem_sn: pick(row, "Type Modem & SN KIT", "Type Modem") || null,
          problem: pick(row, "Problem") || null,
          action: pick(row, "Action") || null,
          status: pick(row, "Status") || "Open",
        }))
        .filter((row) => Object.values(row).some((value) => value && value !== "Open"));
      if (payload.length === 0) {
        toast.error("Tidak ada data yang bisa diimport", {
          description: "Pastikan judul kolom sama seperti hasil export Excel.",
        });
        return;
      }
      const { error } = await supabase.from("daily_activities").insert(payload);
      if (error) {
        toast.error("Gagal import activity", { description: error.message });
        return;
      }
      toast.success(`${payload.length} activity berhasil diimport`);
      refresh();
    } catch {
      toast.error("File tidak bisa dibaca", { description: "Gunakan file .xlsx, .xls atau .csv" });
    }
  };

  const exportExcel = () => {
    const head = ["No", ...headers.map((h) => h.label)];
    const body = filtered.map((row, index) => [
      String(index + 1),
      ...headers.map((h) =>
        h.key === "tanggal" ? formatTanggal(row.tanggal) : ((row[h.key] as string | null) ?? "-"),
      ),
    ]);
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
      subtitle="Pencatatan aktivitas harian tim Reporting CC 3"
      actions={
        <Button size="sm" onClick={openAddForm}>
          <Plus className="size-4" /> Tambah Activity
        </Button>
      }
    >
      <div className="panel p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={openAddForm}>
            <Plus className="size-4" /> Tambah Activity
          </Button>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="size-4" /> Import
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFile(file);
            }}
          />
          {isAdmin ? (
            <Button variant="outline" size="sm" onClick={() => setRollbackOpen(true)}>
              <History className="size-4" /> Rollback
              {deleted.length > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {deleted.length}
                </span>
              ) : null}
            </Button>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Menampilkan {filtered.length} dari {rows.length} activity
          </span>
          {!isAdmin ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              Mode user · hapus &amp; rollback khusus super user
            </span>
          ) : null}
          {isAdmin && selected.length > 0 ? (
            <Button variant="destructive" size="sm" className="h-7" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Hapus terpilih ({selected.length})
            </Button>
          ) : null}
        </div>

        <div className="mt-4">
          <DailyActivityFilters filters={filters} onChange={setFilters} tahunOptions={tahunOptions} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table
            aria-label="Daily Activity"
            className="w-full min-w-[640px] table-fixed border-collapse text-[11px] leading-snug"
          >
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left text-[10px] font-bold uppercase text-muted-foreground">
                {isAdmin && (
                  <th scope="col" className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => setSelected(checked ? filtered.map((r) => r.id) : [])}
                      aria-label="Pilih semua activity"
                    />
                  </th>
                )}
                <th scope="col" className="w-[18%] px-3 py-3">
                  Tanggal &amp; Shift
                </th>
                <th scope="col" className="w-[12%] px-3 py-3">
                  On Duty
                </th>
                <th scope="col" className="w-[30%] px-3 py-3">
                  Nama Lokasi / Customer
                </th>
                <th scope="col" className="w-[26%] px-3 py-3">
                  To Do / Product
                </th>
                <th scope="col" className="w-[14%] px-3 py-3 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {isPending || filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-3 py-10 text-center text-muted-foreground">
                    {isPending ? "Memuat data…" : "Belum ada activity."}
                  </td>
                </tr>
              ) : (
                pageRows.map((row, index) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailId(row.id)}
                    className="cursor-pointer border-b border-border align-middle transition-colors last:border-0 even:bg-muted/20 hover:bg-accent/50"
                  >
                    {isAdmin && (
                      <td
                        className="px-3 py-3"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          checked={selected.includes(row.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) =>
                              checked ? [...new Set([...prev, row.id])] : prev.filter((id) => id !== row.id),
                            )
                          }
                          aria-label={`Pilih activity ${index + 1}`}
                        />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <span className="block font-medium tabular-nums">{formatTanggal(row.tanggal) || "—"}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.shift || "—"}</span>
                    </td>
                    <td className="break-words px-3 py-3 font-medium">{row.on_duty || "—"}</td>
                    <td className="break-words px-3 py-3">
                      <Button
                        variant="link"
                        className="h-auto max-w-full justify-start whitespace-normal p-0 text-left text-[11px] font-semibold"
                        aria-label={`Detail activity ${index + 1}: ${row.nama_lokasi || row.customer || "Daily Activity"}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDetailId(row.id);
                        }}
                      >
                        {row.nama_lokasi || "—"}
                      </Button>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.customer || "—"}</span>
                    </td>
                    <td className="break-words px-3 py-3">
                      <span className="block font-medium">{row.to_do || "—"}</span>
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{row.product || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <DailyActivityStatus status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bar Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Baris per halaman</span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-muted-foreground">
              Halaman {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.length} activity?</AlertDialogTitle>
            <AlertDialogDescription>
              Data activity yang dipilih akan dipindahkan ke Rollback dan bisa dikembalikan kapan saja.
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
            <p className="py-8 text-center text-sm text-muted-foreground">Belum ada activity yang dihapus.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => restore(deleted.map((row) => row.id))}>
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
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => restore([row.id])}>
                      <RotateCcw className="size-4" /> Kembalikan
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setPermanentDeleteTarget(row)}>
                      <Trash2 className="size-4" /> Hapus
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DailyActivityDetailDialog
        row={rows.find((row) => row.id === detailId) ?? null}
        onClose={() => setDetailId(null)}
        onEdit={(row) => {
          setDetailId(null);
          setEditingRow(row);
          setFormOpen(true);
        }}
      />

      <DailyActivityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={editValues}
        onSubmit={editingRow ? saveEdit : addRow}
      />

      <AlertDialog
        open={Boolean(permanentDeleteTarget)}
        onOpenChange={(next) => !next && setPermanentDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus activity secara permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Activity {permanentDeleteTarget?.nama_lokasi ?? permanentDeleteTarget?.customer ?? "ini"} akan dihapus
              selamanya dan tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (permanentDeleteTarget) void permanentlyDelete(permanentDeleteTarget.id);
              }}
            >
              Ya, hapus permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
