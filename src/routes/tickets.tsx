import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  PackageOpen,
  FileSpreadsheet,
  History,
  Upload,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Tickets,
  Hourglass,
  UserRound,
  Truck,
  Building2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { JenisBadge } from "@/components/tickets/JenisBadge";
import { RollbackDialog } from "@/components/tickets/RollbackDialog";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { TicketDetailDialog } from "@/components/tickets/TicketDetailDialog";
import { TicketFormDialog, type SaveMeta } from "@/components/tickets/TicketFormDialog";
import { LiveDuration } from "@/components/tickets/LiveDuration";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  { key: "tiket_epicor", label: "Tiket Epicor", align: "center" },
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

function Subline({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string | null | undefined;
  emphasis?: boolean;
}) {
  return (
    <span
      className={`block leading-4 ${emphasis ? "mt-1 text-[10px] font-medium text-foreground" : "text-[9px] text-muted-foreground"}`}
    >
      <span className="text-[8px] font-bold uppercase text-muted-foreground">{label}:</span> {value || "-"}
    </span>
  );
}

// Klasifikasi tab: layanan "Vsat Star" masuk Care Center Vsat, selain itu Non-Vsat.
type TicketCategory = "vsat" | "non-vsat";

const ticketCategory = (layanan: string | null): TicketCategory =>
  layanan?.toLowerCase().includes("vsat") ? "vsat" : "non-vsat";

const TICKET_TABS: { key: TicketCategory; label: string }[] = [
  { key: "vsat", label: "Care Center Vsat" },
  { key: "non-vsat", label: "Care Center Non-Vsat" },
];

const summaryCards = [
  {
    label: "Ticket Aktif",
    status: null,
    icon: Tickets,
    tone: "primary",
    note: "Belum Close",
  },
  {
    label: "Pending Transport",
    status: "Pending Transport",
    icon: Clock3,
    tone: "warning",
    note: "Menunggu Transportasi",
  },
  {
    label: "Pending Spare",
    status: "Pending Spare",
    icon: PackageOpen,
    tone: "purple",
    note: "Menunggu Spare",
  },
  {
    label: "Pending Customer",
    status: "Pending Customer",
    icon: Building2,
    tone: "teal",
    note: "Menunggu Info Customer",
  },
  {
    label: "Pending",
    status: "Pending",
    icon: Hourglass,
    tone: "brown",
    note: "Pending",
  },
  {
    label: "Engineer On The Way",
    status: "Engineer On The Way",
    icon: Truck,
    tone: "blue",
    note: "Dalam Perjalanan",
  },
  {
    label: "Close",
    status: "Close",
    icon: CheckCircle2,
    tone: "success",
    note: "Tiket Close",
  },
] as const;

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
  const [tab, setTab] = useState<TicketCategory>("vsat");
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
        setTab(saved.tab === "non-vsat" ? "non-vsat" : "vsat");
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
        tab,
        perPage,
      }),
    );
  }, [search, bulan, tahun, status, regional, customer, jenis, layanan, tab, perPage, filtersReady]);

  const activeQuery = useQuery({
    queryKey: ["tickets", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });
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
  const tabTickets = useMemo(() => tickets.filter((t) => ticketCategory(t.layanan) === tab), [tickets, tab]);

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
    () => Array.from(new Set(tickets.map((t) => t.customer).filter(Boolean) as string[])).sort(),
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
      if (ticketCategory(t.layanan) !== tab) return false;
      if (status.length && !status.includes(t.status)) return false;
      if (regional.length && !regional.includes(t.regional ?? "")) return false;
      if (customer.length && !customer.includes(t.customer ?? "")) return false;
      if (jenis.length && !jenis.includes(t.jenis_ticket ?? "")) return false;
      if (layanan.length && !layanan.includes(t.layanan ?? "")) return false;
      if (bulan.length || tahun.length) {
        if (!t.tanggal_open) return false;
        const date = new Date(t.tanggal_open);
        if (bulan.length && !bulan.includes(BULAN_OPTIONS[date.getMonth()] as string)) return false;
        if (tahun.length && !tahun.includes(String(date.getFullYear()))) return false;
      }
      if (!term) return true;
      return columns.some((col) =>
        String(t[col.key] ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [tickets, tab, search, status, regional, customer, jenis, layanan, bulan, tahun]);

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
      const changed = note !== (editing.last_update ?? "").trim();
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
            tiket_epicor: values.tiket_epicor ?? "",
            layanan: values.layanan ?? "",
            jenis_ticket: values.jenis_ticket ?? "",
            regional: values.regional ?? "",
            indikasi_gangguan: values.indikasi_gangguan ?? "",
            open_by: values.open_by ?? "",
            teknisi: values.teknisi ?? "",
            last_update: values.last_update ?? "",
            tanggal_open: values.tanggal_open,
            tanggal_close: values.tanggal_close,
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

  const permanentlyDelete = async (id: string) => {
    const { error } = await supabase.from("tickets").delete().eq("id", id).not("deleted_at", "is", null);
    if (error) {
      toast.error("Gagal menghapus ticket permanen", { description: error.message });
      return;
    }
    toast.success("Ticket dihapus permanen");
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
          tiket_epicor: pick(row, "Tiket Epicor") || null,
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
    const rows = filtered.map((t, index) => [String(index + 1), ...columns.map((c) => cellValue(t, c.key))]);
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

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
    <AppShell title="Daftar Ticket" subtitle="Data ticket gangguan realtime">
      <div className="mb-3 flex gap-1 rounded-lg border border-ops-blue/20 bg-ops-mist/45 p-1 dark:bg-ops-mist/20" role="tablist" aria-label="Kategori care center">
        {TICKET_TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => {
              if (item.key === tab) return;
              setTab(item.key);
              setPage(1);
              setSelected([]);
            }}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
              tab === item.key
                ? "bg-ops-navy text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-ops-blue/10 hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <section className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7" aria-label="Ringkasan ticket">
                {summaryCards.map((card) => {
                    const activeStatuses = STATUS_OPTIONS.filter((s) => s !== "Close");
          const isSelected = card.status
            ? status.length === 1 && status[0] === card.status
            : status.length === activeStatuses.length && activeStatuses.every((s) => status.includes(s));

          // Menjaga agar angka di kartu lain tidak jadi 0 saat salah satu status diklik
          const baseList = status.length > 0
            ? tickets.filter((t) => {
                if (ticketCategory(t.layanan) !== tab) return false;
                if (regional.length && !regional.includes(t.regional ?? "")) return false;
                if (customer.length && !customer.includes(t.customer ?? "")) return false;
                if (jenis.length && !jenis.includes(t.jenis_ticket ?? "")) return false;
                if (layanan.length && !layanan.includes(t.layanan ?? "")) return false;
                if (bulan.length || tahun.length) {
                  if (!t.tanggal_open) return false;
                  const d = new Date(t.tanggal_open);
                  if (bulan.length && !bulan.includes(BULAN_OPTIONS[d.getMonth()] as string)) return false;
                  if (tahun.length && !tahun.includes(String(d.getFullYear()))) return false;
                }
                return true;
              })
            : filtered;

          // Kartu Ticket Aktif menghitung semua tiket kecuali yang sudah "Close"
          const openList = baseList.filter(
            (ticket) => ticket.status !== "Close",
          );

          const value = card.status
            ? baseList.filter((ticket) => ticket.status === card.status).length
            : openList.length;

          const cmCount = openList.filter(
            (t) => t.jenis_ticket?.toLowerCase().includes("corrective") || t.jenis_ticket === "CM",
          ).length;

          const pmCount = openList.filter(
            (t) => t.jenis_ticket?.toLowerCase().includes("preventive") || t.jenis_ticket === "PM",
          ).length;

          const Icon = card.icon;
          const toneClass =
            card.tone === "warning"
              ? "border-warning/35 text-warning"
              : card.tone === "purple"
                ? "border-status-purple/35 bg-status-purple/5 text-status-purple"
                : card.tone === "success"
                  ? "border-success/35 bg-success/5 text-success"
                  : card.tone === "brown"
                    ? "border-amber-700/35 bg-amber-700/5 text-amber-700"
                    : card.tone === "teal"
                      ? "border-teal-500/35 text-teal-600"
                      : card.tone === "blue"
                        ? "border-blue-500/35 text-blue-600"
                        : "border-ops-blue/35 bg-ops-blue/5 text-ops-blue";

          return (
            <article
              key={card.label}
                                          onClick={() => {
                if (!card.status) {
                  // Memfilter semua status kecuali "Close" (Technical Close tetap masuk)
                  const activeStatuses = STATUS_OPTIONS.filter((s) => s !== "Close");
                  setStatus([...activeStatuses]);
                } else {
                  setStatus([card.status]);
                }
                setPage(1);
              }}
              className={`group relative min-h-16 cursor-pointer overflow-hidden rounded-lg border bg-surface p-2 shadow-panel transition-all hover:-translate-y-0.5 select-none ${toneClass} ${
                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-md" : "hover:border-primary/50 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[9px] font-bold tracking-wide uppercase">{card.label}</h2>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-base font-bold leading-none">{value}</span>
                    <span className="text-[8px] text-muted-foreground">{card.note}</span>
                  </div>
                  {!card.status && (
                    <div className="mt-0.5 text-[8px] font-semibold text-muted-foreground">
                      (CM: {cmCount} · PM: {pmCount})
                    </div>
                  )}
                </div>
                <Icon className="size-4 shrink-0 opacity-70" />
              </div>
              <div className="mt-1.5 h-0.5 rounded-full bg-current opacity-30" />
            </article>
          );
        })}
      </section>

      <div className="panel overflow-hidden border-ops-blue/20">
        <div className="border-b border-border bg-ops-mist/45 p-4 md:p-5 dark:bg-ops-mist/20">
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
              {isAdmin ? (
                <>
                  <Button variant="outline" size="icon" onClick={exportExcel} title="Export">
                    <FileSpreadsheet className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => importInputRef.current?.click()} title="Import">
                    <Upload className="size-4" />
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
                </>
              ) : null}
              {isAdmin ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="relative"
                  onClick={() => setRollbackOpen(true)}
                  title="Rollback"
                >
                  <History className="size-4" />
                  {deleted.length > 0 ? (
                    <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {deleted.length}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["tickets"] });
                  toast.success("Data disegarkan");
                }}
                title="Refresh"
              >
                <RefreshCw className="size-4" />
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
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)} className="h-7">
                  <Trash2 className="size-3.5" /> Hapus terpilih
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-[10px] leading-tight">
            <thead>
              <tr className="border-b border-border bg-ops-navy text-primary-foreground dark:bg-ops-mist">
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
                <th className="cell-center w-9 px-1.5 py-2 text-[9px] font-bold tracking-wide uppercase">#</th>
                <th className="w-48 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">
                  Lokasi &amp; Pelanggan
                </th>
                <th className="w-36 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">No. Ticket</th>
                <th className="w-36 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">Layanan</th>
                <th className="w-36 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">Regional</th>
                <th className="w-40 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">
                  Indikasi Gangguan
                </th>
                <th className="min-w-80 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">
                  Keterangan &amp; Log Terakhir
                </th>
                <th className="w-40 px-2 py-2 text-left text-[9px] font-bold tracking-wide uppercase">Durasi</th>
                <th className="cell-center w-14 px-1.5 py-2 text-[9px] font-bold tracking-wide uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {activeQuery.isPending ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="cell-center px-3 py-10">
                    Memuat data…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="cell-center px-3 py-10 text-muted-foreground">
                    Tidak ada ticket yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-border last:border-0 even:bg-ops-mist/20 hover:bg-ops-blue/10"
                  >
                    {isAdmin ? (
                      <td className="cell-center px-1.5 py-1.5">
                        <Checkbox
                          checked={selected.includes(ticket.id)}
                          onCheckedChange={(checked) =>
                            setSelected((prev) =>
                              checked ? [...prev, ticket.id] : prev.filter((id) => id !== ticket.id),
                            )
                          }
                          aria-label={`Pilih ticket ${ticket.customer ?? ""}`}
                        />
                      </td>
                    ) : null}
                    <td className="cell-center px-1.5 py-1.5 font-semibold">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>
                    <td className="cell-wrap px-2 py-2">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setDetail(ticket)}
                        className="h-auto max-w-full justify-start whitespace-normal p-0 text-left text-[10px] font-bold leading-4"
                      >
                        {ticket.nama_lokasi ?? "-"}
                      </Button>
                      <Subline label="Customer" value={ticket.customer} />
                    </td>
                    <td className="cell-wrap px-2 py-2 font-semibold">
                      {ticket.tiket_mantools || "-"}
                      <Subline label="Noxis" value={ticket.tiket_noxis} />
                      <Subline label="Epicor" value={ticket.tiket_epicor} />
                    </td>
                    <td className="cell-wrap px-2 py-2 font-semibold">
                      {ticket.layanan || "-"}
                      <span className="mt-1 block">
                        <JenisBadge jenis={ticket.jenis_ticket} />
                      </span>
                      <Subline label="Teknisi" value={ticket.teknisi} />
                    </td>
                    <td className="cell-wrap px-2 py-2 font-semibold">
                      {ticket.regional || "-"}
                      <Subline label="Asal" value={ticket.asal_gangguan} />
                      <Subline label="Tim SEM" value={ticket.team_sem} />
                    </td>
                    <td className="cell-wrap px-2 py-2">{ticket.indikasi_gangguan || "-"}</td>
                    <td className="cell-wrap px-2 py-2">
                      <p className="text-[10px] font-semibold leading-4 text-foreground">{ticket.keterangan || "-"}</p>
                      <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{ticket.last_update || "-"}</p>
                      <span className="mt-1 flex items-baseline gap-1 text-[10px] leading-4">
                        <span className="text-[8px] font-bold uppercase text-muted-foreground">Status:</span>
                        <span className="italic">
                          <StatusBadge status={ticket.status} />
                        </span>
                      </span>
                      <Subline label="Open by" value={ticket.open_by} />
                    </td>
                    <td className="cell-wrap px-2 py-2 font-semibold">
                      <LiveDuration
                        openedAt={ticket.tanggal_open}
                        closedAt={ticket.tanggal_close}
                        fallback={ticket.durasi}
                      />
                      <Subline label="Open" value={formatDateTime(ticket.tanggal_open)} />
                      <Subline label="Close" value={formatDateTime(ticket.tanggal_close)} />
                    </td>
                    <td className="cell-center px-1.5 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-primary"
                        onClick={() => {
                          setEditing(ticket);
                          setFormOpen(true);
                        }}
                        aria-label="Edit ticket"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-ops-mist/30 p-4 dark:bg-ops-mist/15">
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
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
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

      <TicketFormDialog open={formOpen} onOpenChange={setFormOpen} ticket={editing} onSubmit={saveTicket} />
      <TicketDetailDialog ticket={detail} onOpenChange={() => setDetail(null)} />
      <RollbackDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        tickets={deleted}
        loading={deletedQuery.isPending}
        onRestore={(id) => restore([id])}
        onRestoreAll={() => restore(deleted.map((t) => t.id))}
        onDelete={(id) => void permanentlyDelete(id)}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selected.length} ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              Ticket yang dipilih akan dipindahkan ke daftar terhapus. Data masih bisa dikembalikan melalui menu
              Rollback.
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
