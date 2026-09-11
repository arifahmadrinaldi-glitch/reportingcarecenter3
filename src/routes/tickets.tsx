import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileSpreadsheet,
  History,
  Upload,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { JenisBadge } from "@/components/tickets/JenisBadge";
import { RollbackDialog } from "@/components/tickets/RollbackDialog";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { TicketDetailDialog } from "@/components/tickets/TicketDetailDialog";
import { TicketFormDialog, type SaveMeta } from "@/components/tickets/TicketFormDialog";
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
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";
import { parseSheetFile, pick } from "@/lib/import-sheet";
import { notifyNewTicket } from "@/lib/telegram.functions";
import {
  BULAN_OPTIONS,
  JENIS_OPTIONS,
  LAYANAN_OPTIONS,
  REGIONAL_OPTIONS,
  STATUS_OPTIONS,
  formatDateTime,
  parseUpdateHistory,
  type TicketFormValues,
  type TicketRow,
} from "@/lib/ticket-constants";

export const Route = createFileRoute("/tickets")({
  head: () => ({
    meta: [
      { title: "Daftar Ticket — Reporting CC 3" },
      {
        name: "description",
        content:
          "Kelola data ticket gangguan: tambah, edit, hapus dengan konfirmasi, rollback data terhapus, filter multi pilihan dan export Excel.",
      },
      { property: "og:title", content: "Daftar Ticket — Reporting CC 3" },
      {
        property: "og:description",
        content:
          "Tabel ticket lengkap dengan pencarian cepat, filter layanan, rollback data terhapus dan export Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TicketsPage,
});

type Align = "center" | "wrap" | "wide";

const columns: { key: keyof TicketRow; label: string; align: Align }[] = [
  { key: "status", label: "Status", align: "center" },
  { key: "keterangan", label: "Keterangan", align: "wrap" },
  { key: "customer", label: "Customer", align: "wrap" },
  { key: "nama_lokasi", label: "Nama Lokasi", align: "wrap" },
  { key: "tiket_mantools", label: "Tiket Mantools", align: "center" },
  { key: "tiket_noxis", label: "Tiket Noxis", align: "center" },
  { key: "layanan", label: "Layanan", align: "center" },
  { key: "jenis_ticket", label: "Jenis Ticket", align: "center" },
  { key: "asal_gangguan", label: "Asal Gangguan", align: "center" },
  { key: "regional", label: "Regional", align: "center" },
  { key: "indikasi_gangguan", label: "Indikasi Gangguan", align: "wrap" },
  { key: "last_update", label: "Last Update", align: "wide" },
  { key: "team_sem", label: "Team SEM", align: "center" },
  { key: "open_by", label: "Open By", align: "center" },
  { key: "tanggal_open", label: "Tanggal Open", align: "center" },
  { key: "tanggal_close", label: "Tanggal Close", align: "center" },
  { key: "durasi", label: "Durasi", align: "center" },
  { key: "teknisi", label: "Teknisi", align: "center" },
];

const cellValue = (ticket: TicketRow, key: keyof TicketRow) => {
  if (key === "tanggal_open" || key === "tanggal_close") {
    return formatDateTime(ticket[key] as string | null);
  }
  const value = ticket[key];
  return value ? String(value) : "-";
};

function TicketsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAccess();
  const [search, setSearch] = useState("");
  const [bulan, setBulan] = useState<string[]>([]);
  const [tahun, setTahun] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [regional, setRegional] = useState<string[]>([]);
  const [customer, setCustomer] = useState<string[]>([]);
  const [jenis, setJenis] = useState<string[]>([]);
  const [layanan, setLayanan] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TicketRow | null>(null);
  const [detail, setDetail] = useState<TicketRow | null>(null);
  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Restore filter state from localStorage on mount so selections survive
  // refresh, delete, or rollback operations.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tickets-filters");
      if (raw) {
        const saved = JSON.parse(raw);
        const valid = (arr: unknown, options: readonly string[]) =>
          Array.isArray(arr) ? arr.filter((v) => options.includes(String(v))) : [];

        setSearch(String(saved.search ?? ""));
        setBulan(valid(saved.bulan, BULAN_OPTIONS));
        setTahun(Array.isArray(saved.tahun) ? saved.tahun.map(String) : []);
        setStatus(valid(saved.status, STATUS_OPTIONS));
        setRegional(valid(saved.regional, REGIONAL_OPTIONS));
        setCustomer(Array.isArray(saved.customer) ? saved.customer.map(String) : []);
        setJenis(valid(saved.jenis, JENIS_OPTIONS));
        setLayanan(valid(saved.layanan, LAYANAN_OPTIONS));
        setPerPage(Number(saved.perPage) || 10);
      }
    } catch {
      // ignore corrupted storage
    }
    setFiltersReady(true);
  }, []);

  // Persist filter state whenever it changes.
  useEffect(() => {
    if (!filtersReady) return;
    localStorage.setItem(
      "tickets-filters",
      JSON.stringify({
        search,
        bulan,
        tahun,
        status,
        regional,
        customer,
        jenis,
        layanan,
        perPage,
      }),
    );
  }, [search, bulan, tahun, status, regional, customer, jenis, layanan, perPage, filtersReady]);

  const activeQuery = useQuery({
    queryKey: ["tickets", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  const deletedQuery = useQuery({
    queryKey: ["tickets", "deleted"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TicketRow[];
    },
  });

  const tickets = activeQuery.data ?? [];
  const deleted = deletedQuery.data ?? [];

  useEffect(() => {
    const channel = supabase
      .channel("tickets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const customerOptions = useMemo(
    () =>
      Array.from(new Set(tickets.map((t) => t.customer).filter(Boolean) as string[])).sort(),
    [tickets],
  );
  const tahunOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tickets
            .map((t) => (t.tanggal_open ? new Date(t.tanggal_open).getFullYear() : null))
            .filter(Boolean) as number[],
        ),
      )
        .sort((a, b) => b - a)
        .map(String),
    [tickets],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (status.length && !status.includes(t.status)) return false;
      if (regional.length && !regional.includes(t.regional ?? "")) return false;
      if (customer.length && !customer.includes(t.customer ?? "")) return false;
      if (jenis.length && !jenis.includes(t.jenis_ticket ?? "")) return false;
      if (layanan.length && !layanan.includes(t.layanan ?? "")) return false;
      if (bulan.length || tahun.length) {
        if (!t.tanggal_open) return false;
        const date = new Date(t.tanggal_open);
        if (bulan.length && !bulan.includes(BULAN_OPTIONS[date.getMonth()] as string))
          return false;
        if (tahun.length && !tahun.includes(String(date.getFullYear()))) return false;
      }
      if (!term) return true;
      return columns.some((col) =>
        String(t[col.key] ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [tickets, search, status, regional, customer, jenis, layanan, bulan, tahun]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const resetFilters = () => {
    setSearch("");
    setBulan([]);
    setTahun([]);
    setStatus([]);
    setRegional([]);
    setCustomer([]);
    setJenis([]);
    setLayanan([]);
    setPage(1);
  };

  const saveTicket = async (values: TicketFormValues, meta?: SaveMeta) => {
    const now = new Date().toISOString();
    if (editing) {
      const previous = parseUpdateHistory(editing.update_history);
      const note = (values.last_update ?? "").trim();
      const changed = note !== ((editing.last_update ?? "").trim());
      let history = previous;
      if (meta?.editLastAt) {
        // Super user memperbaiki keterangan/tanggal update terakhir yang tersimpan.
        const entry = { at: meta.editLastAt, text: note, status: values.status };
        history = previous.length > 0 ? [...previous.slice(0, -1), entry] : note ? [entry] : [];
      } else if (changed && note) {
        history = [...previous, { at: now, text: note, status: values.status }];
      }
      const { error } = await supabase
        .from("tickets")
        .update({ ...values, last_update: note || null, update_history: history })
        .eq("id", editing.id);
      if (error) {
        toast.error("Gagal menyimpan ticket", { description: error.message });
        return;
      }
      toast.success("Ticket diperbarui");
    } else {
      const note = (values.last_update ?? "").trim();
      const { error } = await supabase.from("tickets").insert({
        ...values,
        update_history: note ? [{ at: now, text: note, status: values.status }] : [],
      });
      if (error) {
        toast.error("Gagal menambah ticket", { description: error.message });
        return;
      }
      toast.success("Ticket baru ditambahkan di posisi paling bawah");
      setPage(Math.max(1, Math.ceil((tickets.length + 1) / perPage)));
      try {
        const result = await notifyNewTicket({
          data: {
            status: values.status,
            customer: values.customer ?? "",
            nama_lokasi: values.nama_lokasi ?? "",
            tiket_mantools: values.tiket_mantools ?? "",
            tiket_noxis: values.tiket_noxis ?? "",
            layanan: values.layanan ?? "",
            jenis_ticket: values.jenis_ticket ?? "",
            regional: values.regional ?? "",
            indikasi_gangguan: values.indikasi_gangguan ?? "",
            open_by: values.open_by ?? "",
            teknisi: values.teknisi ?? "",
            last_update: values.last_update ?? "",
          },
        });
        if (result?.sent) toast.success("Notifikasi Telegram terkirim");
        else if (result?.reason) toast.info(`Notifikasi Telegram: ${result.reason}`);
      } catch {
        toast.info("Notifikasi Telegram belum aktif");
      }
    }
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const deleteSelected = async () => {
    const { error } = await supabase
      .from("tickets")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", selected);
    if (error) {
      toast.error("Gagal menghapus ticket", { description: error.message });
      return;
    }
    toast.success(`${selected.length} ticket dihapus`, {
      description: "Bisa dikembalikan lewat menu Rollback.",
    });
    setSelected([]);
    setConfirmDelete(false);
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const restore = async (ids: string[]) => {
    const { error } = await supabase.from("tickets").update({ deleted_at: null }).in("id", ids);
    if (error) {
      toast.error("Gagal mengembalikan ticket", { description: error.message });
      return;
    }
    toast.success(`${ids.length} ticket dikembalikan`);
    queryClient.invalidateQueries({ queryKey: ["tickets"] });
  };

  const importFile = async (file: File) => {
    try {
      const parsed = await parseSheetFile(file);
      const payload = parsed
        .map((row) => ({
          status: pick(row, "Status") || "Diagnose",
          keterangan: pick(row, "Keterangan") || null,
          customer: pick(row, "Customer") || null,
          nama_lokasi: pick(row, "Nama Lokasi") || null,
          tiket_mantools: pick(row, "Tiket Mantools") || null,
          tiket_noxis: pick(row, "Tiket Noxis") || null,
          layanan: pick(row, "Layanan") || null,
          jenis_ticket: pick(row, "Jenis Ticket", "Jenis") || null,
          asal_gangguan: pick(row, "Asal Gangguan") || null,
          regional: pick(row, "Regional") || null,
          indikasi_gangguan: pick(row, "Indikasi Gangguan") || null,
          last_update: pick(row, "Last Update") || null,
          team_sem: pick(row, "Team SEM", "Tim SEM") || null,
          open_by: pick(row, "Open By") || null,
          durasi: pick(row, "Durasi") || null,
          teknisi: pick(row, "Teknisi") || null,
        }))
        .filter((row) => Object.values(row).some((value) => value && value !== "Diagnose"));
      if (payload.length === 0) {
        toast.error("Tidak ada data yang bisa diimport", {
          description: "Pastikan judul kolom sama seperti hasil export Excel.",
        });
        return;
      }
      const { error } = await supabase.from("tickets").insert(payload);
      if (error) {
        toast.error("Gagal import ticket", { description: error.message });
        return;
      }
      toast.success(`${payload.length} ticket berhasil diimport`);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    } catch {
      toast.error("File tidak bisa dibaca", { description: "Gunakan file .xlsx, .xls atau .csv" });
    }
  };

  const exportExcel = () => {
    const head = ["Nomor", ...columns.map((c) => c.label)];
    const rows = filtered.map((t, index) => [
      String(index + 1),
      ...columns.map((c) => cellValue(t, c.key)),
    ]);
    const escape = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr>${head
      .map((h) => `<th>${escape(h)}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`)
      .join("")}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daftar-ticket-${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel dimulai");
  };

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

  const filterSelect = (
    label: string,
    values: string[],
    onChange: (v: string[]) => void,
    options: readonly string[],
  ) => (
    <MultiSelect
      label={label}
      values={values}
      options={options}
      onChange={(next) => {
        onChange(next);
        setPage(1);
      }}
    />
  );

  return (
    <AppShell title="Daftar Ticket" subtitle="Data ticket gangguan tersinkron realtime">
      <div className="panel p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pencarian cepat…"
              className="h-10 rounded-full pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Tambah Ticket
            </Button>
            <Button variant="outline" onClick={exportExcel}>
              <FileSpreadsheet className="size-4" /> Excel
            </Button>
            <Button variant="outline" onClick={() => importInputRef.current?.click()}>
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
              <Button variant="outline" onClick={() => setRollbackOpen(true)}>
                <History className="size-4" /> Rollback
                {deleted.length > 0 ? (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {deleted.length}
                  </span>
                ) : null}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["tickets"] });
                toast.success("Data disegarkan");
              }}
            >
              <RefreshCw className="size-4" /> Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {filterSelect("Bulan", bulan, setBulan, BULAN_OPTIONS)}
          {filterSelect("Tahun", tahun, setTahun, tahunOptions)}
          {filterSelect("Status", status, setStatus, STATUS_OPTIONS)}
          {filterSelect("Regional", regional, setRegional, REGIONAL_OPTIONS)}
          {filterSelect("Customer", customer, setCustomer, customerOptions)}
          {filterSelect("Jenis", jenis, setJenis, JENIS_OPTIONS)}
          {filterSelect("Layanan", layanan, setLayanan, LAYANAN_OPTIONS)}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>
            Menampilkan {filtered.length} dari {tickets.length} ticket
          </span>
          <button onClick={resetFilters} className="text-primary hover:underline">
            Reset semua filter
          </button>
          {!isAdmin ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
              Mode user · hapus &amp; rollback khusus super user
            </span>
          ) : null}
          {isAdmin && selected.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{selected.length} dipilih</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="h-7"
              >
                <Trash2 className="size-3.5" /> Hapus terpilih
              </Button>
            </>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-full table-fixed border-collapse text-[11px] leading-tight">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {isAdmin ? (
                <th className="cell-center w-8 px-1.5 py-2">
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={(checked) =>
                      setSelected((prev) =>
                        checked
                          ? Array.from(new Set([...prev, ...pageRows.map((r) => r.id)]))
                          : prev.filter((id) => !pageRows.some((r) => r.id === id)),
                      )
                    }
                    aria-label="Pilih semua baris"
                  />
                </th>
                ) : null}
                <th className="cell-center w-10 px-1.5 py-2 text-[10px] font-bold tracking-wide uppercase">
                  Nomor
                </th>
                <th className="cell-center w-16 px-1.5 py-2 text-[10px] font-bold tracking-wide uppercase">
                  Aksi
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-2 py-2 text-[10px] font-bold tracking-wide whitespace-nowrap uppercase ${
                      col.align === "center" ? "cell-center" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeQuery.isPending ? (
                <tr>
                  <td colSpan={columns.length + (isAdmin ? 3 : 2)} className="cell-center px-3 py-10">
                    Memuat data…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (isAdmin ? 3 : 2)}
                    className="cell-center px-3 py-10 text-muted-foreground"
                  >
                    Tidak ada ticket yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border last:border-0 hover:bg-muted/40"
                  >
                    {isAdmin ? (
                    <td className="cell-center px-1.5 py-1.5">
                      <Checkbox
                        checked={selected.includes(ticket.id)}
                        onCheckedChange={(checked) =>
                          setSelected((prev) =>
                            checked
                              ? [...prev, ticket.id]
                              : prev.filter((id) => id !== ticket.id),
                          )
                        }
                        aria-label={`Pilih ticket ${ticket.customer ?? ""}`}
                      />
                    </td>
                    ) : null}
                    <td className="cell-center px-1.5 py-1.5 font-semibold">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>
                    <td className="cell-center px-1.5 py-1.5">
                      <div className="flex items-center justify-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 text-primary"
                          onClick={() => {
                            setEditing(ticket);
                            setFormOpen(true);
                          }}
                          aria-label="Edit ticket"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-2 py-1.5 ${
                          col.align === "center"
                            ? "cell-center whitespace-nowrap"
                            : col.align === "wide"
                              ? "cell-wrap w-[520px] max-w-[520px] min-w-[360px]"
                              : "cell-wrap max-w-[200px] min-w-[130px]"
                        }`}
                      >
                        {col.key === "status" ? (
                          <StatusBadge status={ticket.status} />
                        ) : col.key === "jenis_ticket" ? (
                          <JenisBadge jenis={ticket.jenis_ticket} />
                        ) : col.key === "nama_lokasi" ? (
                          <button
                            type="button"
                            onClick={() => setDetail(ticket)}
                            className="text-left font-medium text-primary hover:underline"
                          >
                            {ticket.nama_lokasi ?? "-"}
                          </button>
                        ) : (
                          cellValue(ticket, col.key)
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Baris per halaman</span>
            <Select
              value={String(perPage)}
              onValueChange={(v) => {
                setPerPage(Number(v));
                setPage(1);
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
              onClick={() => setPage(currentPage - 1)}
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
              onClick={() => setPage(currentPage + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      <TicketFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        ticket={editing}
        onSubmit={saveTicket}
      />
      <TicketDetailDialog ticket={detail} onOpenChange={() => setDetail(null)} />
      <RollbackDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        tickets={deleted}
        loading={deletedQuery.isPending}
        onRestore={(id) => restore([id])}
        onRestoreAll={() => restore(deleted.map((t) => t.id))}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.length} ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Ticket yang dipilih akan dipindahkan ke daftar terhapus. Data masih bisa
              dikembalikan melalui menu Rollback.
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