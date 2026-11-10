import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, CircleHelp, MapPin, RefreshCw, Satellite, Search, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { filterStarlink, STARLINK_DEMO_TERMINALS, STARLINK_STATUSES, starlinkCounts, type StarlinkSnapshot, type StarlinkStatus } from "@/lib/starlink";
import { syncStarlink } from "@/lib/starlink.functions";

export const Route = createFileRoute("/monitoring-starlink")({
  head: () => ({ meta: [
    { title: "Monitoring Starlink — Reporting CC 3" },
    { name: "description", content: "Monitoring lokasi, service line, SN kit dan status koneksi Starlink Care Center." },
    { property: "og:title", content: "Monitoring Starlink — Reporting CC 3" },
    { property: "og:description", content: "Ringkasan Online, Offline, Inactive dan Standby/Unknown pada monitoring Starlink." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StarlinkPage,
});

const statusMeta = {
  online: { label: "Online", detail: "Terhubung", tone: "text-success", bg: "bg-success", icon: Wifi },
  offline: { label: "Offline", detail: "Tidak terhubung", tone: "text-destructive", bg: "bg-destructive", icon: WifiOff },
  inactive: { label: "Inactive", detail: "Layanan tidak aktif", tone: "text-warning", bg: "bg-warning", icon: AlertTriangle },
  unknown: { label: "Abu-abu", detail: "Standby / Unknown", tone: "text-muted-foreground", bg: "bg-muted-foreground", icon: CircleHelp },
};

function StarlinkPage() {
  const [snapshot, setSnapshot] = useState<StarlinkSnapshot>({ terminals: STARLINK_DEMO_TERMINALS, source: "demo", fetchedAt: "" });
  const [status, setStatus] = useState<StarlinkStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const synchronize = useServerFn(syncStarlink);
  const counts = useMemo(() => starlinkCounts(snapshot.terminals), [snapshot.terminals]);
  const filtered = useMemo(() => filterStarlink(snapshot.terminals, status, search), [snapshot.terminals, status, search]);
  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await synchronize();
      setSnapshot(next);
      toast.success(next.source === "demo" ? "Data contoh diperbarui" : "Data Starlink tersinkronisasi");
    } catch {
      setError("Sinkronisasi gagal. Data sebelumnya tetap ditampilkan. Silakan coba lagi.");
    } finally { setLoading(false); }
  };

  return <AppShell title="Monitoring Starlink" subtitle="Care Center · Status koneksi terminal">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Satellite className="size-7" /></span>
        <div><h2 className="text-lg font-bold">Starlink</h2><p className="text-xs text-muted-foreground">{snapshot.terminals.length} terminal · {snapshot.source === "demo" ? "Data contoh · API belum terhubung" : "Service account terhubung"}</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] text-muted-foreground" role="status">{snapshot.fetchedAt ? `Diperbarui ${new Date(snapshot.fetchedAt).toLocaleString("id-ID", { hour12: false })}` : "Belum disinkronisasi"}</span>
        <Button size="sm" onClick={refresh} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />{loading ? "Sinkronisasi…" : "Sinkronisasi / Refresh"}</Button>
      </div>
    </div>

    <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STARLINK_STATUSES.map((key) => {
        const meta = statusMeta[key];
        return <Button key={key} variant="outline" aria-pressed={status === key} onClick={() => setStatus(key)} className={`h-28 justify-between rounded-lg bg-surface px-4 text-left shadow-panel ${status === key ? "border-primary ring-1 ring-primary" : ""}`}>
          <span className="flex flex-col items-start gap-1"><span className={`text-xs font-semibold ${meta.tone}`}>{meta.label}</span><span className="text-3xl font-bold tabular-nums text-foreground">{counts[key]}</span><span className="text-[10px] font-normal text-muted-foreground">{meta.detail}</span></span>
          <meta.icon className={`size-6 shrink-0 ${meta.tone}`} />
        </Button>;
      })}
    </div>

    <div className="mb-4 flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 space-y-1.5 text-xs font-semibold"><span>Pencarian cepat</span><div className="relative"><Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" /><Input aria-label="Pencarian cepat" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama lokasi, service line, atau SN kit" className="pl-9 pr-9 text-xs" />{search && <Button variant="ghost" size="icon" className="absolute top-1 right-1 size-8" aria-label="Hapus pencarian" onClick={() => setSearch("")}><X className="size-4" /></Button>}</div></label>
      <div className="w-full space-y-1.5 sm:w-48"><label htmlFor="starlink-status" className="text-xs font-semibold">Status</label><Select value={status} onValueChange={(value) => { if (value === "all" || STARLINK_STATUSES.some((item) => item === value)) setStatus(value as StarlinkStatus | "all"); }}><SelectTrigger id="starlink-status" aria-label="Filter status Starlink" className="w-full text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{STARLINK_STATUSES.map((key) => <SelectItem key={key} value={key}>{statusMeta[key].label}</SelectItem>)}</SelectContent></Select></div>
    </div>
    {error && <p role="alert" className="mb-3 border-l-2 border-destructive bg-destructive/10 p-3 text-xs text-destructive">{error}</p>}
    <div className="flex items-center justify-between border-b border-border pb-3"><h3 className="text-sm font-bold">Daftar terminal</h3><span className="text-[11px] text-muted-foreground">{filtered.length} dari {snapshot.terminals.length} terminal</span></div>
    <div className="overflow-x-auto" aria-busy={loading}>
      <table className="w-full min-w-[640px] text-xs">
        <caption className="sr-only">Monitoring Starlink berdasarkan lokasi, service line, SN kit dan status</caption>
        <thead className="bg-muted text-muted-foreground"><tr>{["No.", "Nama lokasi", "Service line", "SN kit", "Status"].map((label) => <th key={label} scope="col" className="px-4 py-3 text-left text-[10px] font-semibold uppercase">{label}</th>)}</tr></thead>
        <tbody>{filtered.map((row, index) => <tr key={row.id} className="border-b border-border bg-surface even:bg-muted/40 hover:bg-accent/50">
          <td className="px-4 py-3 text-muted-foreground tabular-nums">{index + 1}</td>
          <td className="max-w-80 px-4 py-3 font-semibold"><span className="flex items-start gap-2"><MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" /><span className="break-words">{row.location}</span></span></td>
          <td className="px-4 py-3 font-mono text-[11px]">{row.serviceLine}</td><td className="px-4 py-3 font-mono text-[11px]">{row.kitSerial}</td>
          <td className="px-4 py-3"><span className={`inline-flex items-center gap-2 whitespace-nowrap font-semibold ${statusMeta[row.status].tone}`}><span className={`size-2 rounded-full ${statusMeta[row.status].bg}`} />{row.status === "unknown" ? "Standby / Unknown" : statusMeta[row.status].label}</span></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length && <div className="py-14 text-center"><Search className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="text-sm font-semibold">Tidak ada terminal yang cocok</p><Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearch(""); setStatus("all"); }}>Reset filter</Button></div>}
    </div>
  </AppShell>;
}