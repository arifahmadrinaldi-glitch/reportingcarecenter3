import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/tickets/StatusBadge";
import {
  formatDateTime,
  parseUpdateHistory,
  type TicketRow,
} from "@/lib/ticket-constants";

const fields: { label: string; get: (t: TicketRow) => string }[] = [
  { label: "Keterangan", get: (t) => t.keterangan ?? "-" },
  { label: "Customer", get: (t) => t.customer ?? "-" },
  { label: "Nama Lokasi", get: (t) => t.nama_lokasi ?? "-" },
  { label: "Tiket Mantools", get: (t) => t.tiket_mantools ?? "-" },
  { label: "Tiket Noxis", get: (t) => t.tiket_noxis ?? "-" },
  { label: "Layanan", get: (t) => t.layanan ?? "-" },
  { label: "Jenis Ticket", get: (t) => t.jenis_ticket ?? "-" },
  { label: "Asal Gangguan", get: (t) => t.asal_gangguan ?? "-" },
  { label: "Regional", get: (t) => t.regional ?? "-" },
  { label: "Indikasi Gangguan", get: (t) => t.indikasi_gangguan ?? "-" },
  { label: "Team SEM", get: (t) => t.team_sem ?? "-" },
  { label: "Open By", get: (t) => t.open_by ?? "-" },
  { label: "Tanggal Open", get: (t) => formatDateTime(t.tanggal_open) },
  { label: "Tanggal Close", get: (t) => formatDateTime(t.tanggal_close) },
  { label: "Durasi", get: (t) => t.durasi ?? "-" },
  { label: "Teknisi", get: (t) => t.teknisi ?? "-" },
];

export function TicketDetailDialog({
  ticket,
  onOpenChange,
}: {
  ticket: TicketRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const history = ticket ? parseUpdateHistory(ticket.update_history) : [];
  const ordered = [...history].sort((a, b) => (a.at < b.at ? 1 : -1));

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
              <DialogDescription>
                {ticket.tiket_mantools ?? "Tanpa nomor mantools"}
              </DialogDescription>
            </DialogHeader>
            <dl className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field.label} className="rounded-lg border border-border p-3">
                  <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="mt-1 text-sm break-words text-foreground">
                    {field.get(ticket)}
                  </dd>
                </div>
              ))}
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <dt className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                  Last Update (terakhir)
                </dt>
                <dd className="mt-1 text-sm break-words text-foreground">
                  {ticket.last_update ?? "-"}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg border border-border p-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                Riwayat Update ({ordered.length})
              </p>
              {ordered.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Belum ada riwayat update.
                </p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {ordered.map((entry, index) => (
                    <li
                      key={`${entry.at}-${index}`}
                      className="rounded-md bg-muted/50 p-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                        <span>{formatDateTime(entry.at)}</span>
                        {entry.status ? (
                          <span className="text-muted-foreground">· {entry.status}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 break-words whitespace-pre-wrap text-muted-foreground">
                        {entry.text || "-"}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
