import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import { formatDateTime, type TicketRow } from "@/lib/ticket-constants";

export function RollbackDialog({
  open,
  onOpenChange,
  tickets,
  onRestore,
  onRestoreAll,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tickets: TicketRow[];
  onRestore: (id: string) => void;
  onRestoreAll: () => void;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Rollback Ticket Terhapus</DialogTitle>
          <DialogDescription>
            Data ticket yang dihapus tersimpan di sini dan bisa dikembalikan kapan saja.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Memuat data…</p>
        ) : tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Belum ada ticket yang dihapus.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onRestoreAll}>
                <RotateCcw className="size-4" /> Kembalikan semua
              </Button>
            </div>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ticket.status} />
                    <span className="text-sm font-semibold text-foreground">
                      {ticket.customer ?? "-"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ticket.tiket_mantools ?? "-"}
                    </span>
                  </div>
                  <p className="text-xs break-words text-muted-foreground">
                    {ticket.nama_lokasi ?? "-"} · dihapus {formatDateTime(ticket.deleted_at)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onRestore(ticket.id)}>
                  <RotateCcw className="size-4" /> Kembalikan
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}