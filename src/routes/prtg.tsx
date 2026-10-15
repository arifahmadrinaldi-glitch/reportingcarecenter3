import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Settings } from "lucide-react";
import { listPrtgSensors, type PrtgSensor } from "@/lib/prtg.functions";

const statusTone = (s: string) => {
  const v = s.toLowerCase();
  if (v.includes("down")) return "text-destructive font-semibold";
  if (v.includes("warn") || v.includes("unusual")) return "text-amber-500 font-semibold";
  if (v.includes("up")) return "text-emerald-600 font-semibold";
  return "text-muted-foreground";
};
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/prtg")({
  head: () => ({
    meta: [
      { title: "Monitoring PRTG — Reporting CC 3" },
      { name: "description", content: "Monitoring PRTG on-demand: peta keseluruhan atau grafik sensor Core Link per rentang waktu." },
      { property: "og:title", content: "Monitoring PRTG — Reporting CC 3" },
      { property: "og:description", content: "Lihat PRTG Map dan grafik sensor sesuai rentang waktu dan interval." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrtgPage,
});

type Config = { url: string; token: string; mapId: string; sensors: string };
const KEY = "prtg-config";
const AVG: Record<string, number> = { detik: 0, menit: 60, jam: 3600, hari: 86400 };

const pad = (n: number) => String(n).padStart(2, "0");
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toPrtg = (v: string) => (v ? `${v.replace("T", "-").replace(":", "-")}-00` : "");

function PrtgPage() {
  const [cfg, setCfg] = useState<Config>({ url: "", token: "", mapId: "", sensors: "" });
  const [draft, setDraft] = useState(cfg);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<"map" | "sensor">("sensor");
  const [interval, setIntervalV] = useState("menit");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(KEY) ?? "null"); if (s) { setCfg(s); setDraft(s); } } catch { /* ignore */ }
    const now = new Date();
    setEnd(toLocal(now));
    setStart(toLocal(new Date(now.getTime() - 86400000)));
  }, []);

  const base = cfg.url.replace(/\/+$/, "");
  const auth = cfg.token ? (cfg.token.length > 20 ? `apitoken=${encodeURIComponent(cfg.token)}` : `passhash=${encodeURIComponent(cfg.token)}`) : "";
  const sensors = useMemo(() => cfg.sensors.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean), [cfg.sensors]);
  const invalid = start && end && start >= end;
  const fetchSensors = useServerFn(listPrtgSensors);
  const [all, setAll] = useState<PrtgSensor[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const byId = useMemo(() => new Map(all.map((s) => [s.objid, s])), [all]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? all.filter((s) => `${s.sensor} ${s.device} ${s.objid}`.toLowerCase().includes(t)) : all).slice(0, 200);
  }, [all, q]);

  const load = async () => {
    if (!base) return;
    setLoading(true); setLoadErr("");
    try {
      const r = await fetchSensors({ data: { url: base, token: cfg.token } });
      setAll(r.sensors); if (r.error) setLoadErr(r.error);
    } catch { setLoadErr("Gagal memuat daftar sensor"); }
    setLoading(false);
  };
  useEffect(() => { if (base) void load(); }, [base, cfg.token]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = (next: Config) => { localStorage.setItem(KEY, JSON.stringify(next)); setCfg(next); };
  const toggle = (id: string) => {
    const list = sensors.includes(id) ? sensors.filter((s) => s !== id) : [...sensors, id];
    persist({ ...cfg, sensors: list.join(", ") });
  };

  const save = () => {
    persist(draft); setOpen(false); toast.success("Konfigurasi PRTG disimpan");
  };

  return (
    <AppShell title="Monitoring PRTG" subtitle="PRTG Map & grafik sensor Core Link on-demand"
      actions={<Button size="sm" variant="outline" onClick={() => { setDraft(cfg); setOpen(true); }}><Settings className="size-4" /> Konfigurasi</Button>}>
      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-xs font-medium">Target
            <Select value={target} onValueChange={(v) => setTarget(v as "map" | "sensor")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="map">Dashboard Peta (PRTG Map)</SelectItem>
                <SelectItem value="sensor">Grafik Sensor (Core Link)</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-xs font-medium">Interval / Resolusi
            <Select value={interval} onValueChange={setIntervalV}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="detik">Detik</SelectItem>
                <SelectItem value="menit">Menit</SelectItem>
                <SelectItem value="jam">Jam</SelectItem>
                <SelectItem value="hari">Hari</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1 text-xs font-medium">Waktu Mulai
            <Input type="datetime-local" className="h-8 text-xs" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-medium">Waktu Selesai
            <Input type="datetime-local" className="h-8 text-xs" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>

        {base && target === "sensor" && (
          <div className="space-y-2 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2">
              <Input className="h-8 text-xs" placeholder="Cari sensor atau perangkat (mis. bonding)…" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Muat sensor</Button>
            </div>
            {loadErr && <p className="text-xs text-destructive">{loadErr}</p>}
            {all.length > 0 && (
              <div className="max-h-64 overflow-auto rounded border text-xs">
                {filtered.length ? filtered.map((s) => (
                  <button key={s.objid} onClick={() => toggle(s.objid)}
                    className={`flex w-full items-center justify-between gap-2 border-b px-2 py-1 text-left hover:bg-accent ${sensors.includes(s.objid) ? "bg-accent" : ""}`}>
                    <span className="truncate"><b>{s.sensor}</b> <span className="text-muted-foreground">· {s.device} · #{s.objid}</span></span>
                    <span className={`shrink-0 ${statusTone(s.status)}`}>{s.status}{s.lastvalue ? ` · ${s.lastvalue}` : ""}{sensors.includes(s.objid) ? " ✓" : ""}</span>
                  </button>
                )) : <p className="p-2 text-muted-foreground">Tidak ada sensor cocok.</p>}
              </div>
            )}
          </div>
        )}


        {!base ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Isi URL PRTG di tombol Konfigurasi terlebih dahulu.</p>
        ) : invalid ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-destructive">Waktu mulai harus sebelum waktu selesai.</p>
        ) : target === "map" ? (
          cfg.mapId ? (
            <iframe title="PRTG Map" className="h-[75vh] w-full rounded-lg border bg-card"
              src={`${base}/public/mapshow.htm?id=${encodeURIComponent(cfg.mapId)}${auth ? `&${auth}` : ""}`} />
          ) : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">ID Map belum diisi.</p>
        ) : sensors.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {sensors.map((id) => { const info = byId.get(id); return (
              <figure key={id} className="space-y-1 rounded-lg border bg-card p-2">
                <figcaption className="flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="truncate">{info ? `${info.device} — ${info.sensor}` : `Sensor ${id}`} <span className="text-muted-foreground">#{id}</span></span>
                  <span className="flex shrink-0 items-center gap-2">
                    {info && <span className={statusTone(info.status)}>{info.status}{info.lastvalue ? ` · ${info.lastvalue}` : ""}</span>}
                    <button className="text-muted-foreground hover:text-destructive" onClick={() => toggle(id)} aria-label="Hapus sensor">✕</button>
                  </span>
                </figcaption>
                <img alt={`Grafik sensor PRTG ${id}`} className="w-full rounded bg-white"
                  src={`${base}/chart.png?id=${encodeURIComponent(id)}&graphid=-1&sdate=${toPrtg(start)}&edate=${toPrtg(end)}&avg=${AVG[interval]}&width=1000&height=400&graphstyling=baseFontSize='11'${auth ? `&${auth}` : ""}`} />
              </figure>
            ); })}
          </div>
        ) : <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Daftar Sensor ID belum diisi.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Konfigurasi PRTG</DialogTitle>
            <DialogDescription>Disimpan di perangkat ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <label className="block space-y-1">URL PRTG publik<Input placeholder="https://prtg.example.com" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /></label>
            <label className="block space-y-1">API token / passhash<Input type="password" value={draft.token} onChange={(e) => setDraft({ ...draft, token: e.target.value })} /></label>
            <label className="block space-y-1">ID Map<Input value={draft.mapId} onChange={(e) => setDraft({ ...draft, mapId: e.target.value })} /></label>
            <label className="block space-y-1">Daftar Sensor ID (pisahkan koma/baris)<Textarea rows={3} value={draft.sensors} onChange={(e) => setDraft({ ...draft, sensors: e.target.value })} /></label>
            <Button className="w-full" onClick={save}>Simpan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
