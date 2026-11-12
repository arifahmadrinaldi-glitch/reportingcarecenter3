import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/tickets/DateTimePicker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { LiveDuration } from "@/components/tickets/LiveDuration";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/app-access";
import {
  STATUS_OPTIONS,
  formatDateTime,
  parseUpdateHistory,
  toInputDateTime,
  type TicketRow,
  type UpdateEntry,
} from "@/lib/ticket-constants";

const fields: { label: string; get: (t: TicketRow) => string }[] = [
  { label: "Keterangan", get: (t) => t.keterangan ?? "-" },
  { label: "Customer", get: (t) => t.customer ?? "-" },
  { label: "Nama Lokasi", get: (t) => t.nama_lokasi ?? "-" },
  { label: "Tiket Mantools", get: (t) => t.tiket_mantools ?? "-" },
  { label: "Tiket Noxis", get: (t) => t.tiket_noxis ?? "-" },
  { label: "Tiket Epicor", get: (t) => t.tiket_epicor ?? "-" },
  { label: "Layanan", get: (t) => t.layanan ?? "-" },
  { label: "Jenis Ticket", get: (t) => t.jenis_ticket ?? "-" },
  { label: "Asal Gangguan", get: (t) => t.asal_gangguan ?? "-" },
  { label: "Regional", get: (t) => t.regional ?? "-" },
  { label: "Indikasi Gangguan", get: (t) => t.indikasi_gangguan ?? "-" },
  { label: "Team SEM", get: (t) => t.team_sem ?? "-" },
  { label: "Open By", get: (t) => t.open_by ?? "-" },
  { label: "Tanggal Open", get: (t) => formatDateTime(t.tanggal_open) },
  { label: "Tanggal Tech Close", get: (t) => formatDateTime(t.tanggal_close) },
  { label: "Teknisi", get: (t) => t.teknisi ?? "-" },
];

export function TicketDetailDialog({
  ticket,
  onOpenChange,
}: {
  ticket: TicketRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { isAdmin } = useAccess();
  const queryClient = useQueryClient();

  const [history, setHistory] = useState<UpdateEntry[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editAt, setEditAt] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHistory(ticket ? parseUpdateHistory(ticket.update_history) : []);
    setEditingIndex(null);
    setEditText("");
    setEditAt("");
    setEditStatus("");
  }, [ticket]);

  const ordered = useMemo(() => {
    return history.map((entry, originalIndex) => ({ ...entry, originalIndex })).sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [history]);

  const startEdit = (originalIndex: number, entry: UpdateEntry) => {
    setEditingIndex(originalIndex);
    setEditText(entry.text);
    setEditAt(toInputDateTime(entry.at));
    setEditStatus(entry.status ?? "");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditText("");
    setEditAt("");
    setEditStatus("");
  };

  const saveEdit = async (originalIndex: number) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const nextAt = editAt ? new Date(editAt).toISOString() : history[originalIndex]?.at;
      if (!nextAt) throw new Error("Tanggal dan jam update wajib diisi");

      const nextHistory = history.map((item, idx) =>
        idx === originalIndex
          ? { ...item, at: nextAt, text: editText.trim(), status: editStatus || null }
          : item,
      );
      const latestEntry = [...nextHistory].sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      const nextLastUpdate = latestEntry?.text ?? "";

      const { error } = await (supabase as any)
        .from("tickets")
        .update({ update_history: nextHistory, last_update: nextLastUpdate })
        .eq("id", ticket.id);

      if (error) throw error;

      setHistory(nextHistory);
      ticket.update_history = nextHistory;
      ticket.last_update = nextLastUpdate;
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Keterangan riwayat berhasil disimpan");
      setEditingIndex(null);
      setEditText("");
      setEditAt("");
      setEditStatus("");
    } catch (err: any) {
      toast.error("Gagal menyimpan riwayat", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!ticket} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {ticket ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                Detail Ticket
                <StatusBadge status={ticket.status} />
              </DialogTitle>
              <DialogDescription>{ticket.tiket_mantools ?? "Tanpa nomor mantools"}</DialogDescription>
            </DialogHeader>
            <dl className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label} className="rounded-lg border border-border p-3">
                  <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 text-sm break-words text-foreground">{field.get(ticket)}</dd>
                </div>
              ))}
              <div className="rounded-lg border border-border p-3">
                <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">Durasi</dt>
                <dd className="mt-1 text-sm break-words text-foreground">
                  <LiveDuration
                    openedAt={ticket.tanggal_open}
                    closedAt={ticket.tanggal_close}
                    fallback={ticket.durasi}
                    keterangan={ticket.keterangan}
                    status={ticket.status}
                  />
                </dd>
              </div>
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                  Last Update (terakhir)
                </dt>
                <dd className="mt-1 text-sm break-words text-foreground">{ticket.last_update ?? "-"}</dd>
              </div>
            </dl>

            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                Riwayat Update ({ordered.length})
              </p>
              {ordered.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">Belum ada riwayat update.</p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {ordered.map((entry) => {
                    const isEditing = editingIndex === entry.originalIndex;

                    return (
                      <li key={`${entry.at}-${entry.originalIndex}`} className="rounded-md bg-muted/50 p-2.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                            <span>{formatDateTime(entry.at)}</span>
                            {entry.status ? <span className="text-muted-foreground">· {entry.status}</span> : null}
                          </div>
                          {isAdmin && !isEditing ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => startEdit(entry.originalIndex, entry)}
                            >
                              <Pencil className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          ) : null}
                        </div>

                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <DateTimePicker
                                value={editAt}
                                onChange={setEditAt}
                                placeholder="Pilih tanggal & jam update"
                              />
                              <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger className="h-10 bg-background">
                                  <SelectValue placeholder="Pilih status" />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((status) => (
                                    <SelectItem key={status} value={status}>
                                      {status}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={3}
                              className="text-xs bg-background"
                              placeholder="Masukkan keterangan update..."
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={cancelEdit}
                                disabled={saving}
                              >
                                <X className="mr-1 h-3 w-3" />
                                Batal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => saveEdit(entry.originalIndex)}
                                disabled={saving}
                              >
                                {saving ? (
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="mr-1 h-3 w-3" />
                                )}
                                Simpan
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 break-words whitespace-pre-wrap text-muted-foreground">
                            {entry.text || "-"}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
