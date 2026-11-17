import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Copy, ExternalLink, Pencil, Plus, Save, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { currentShift, officersOn, SHIFT_INFO, type ShiftKey } from "@/lib/handover";
import { initializeSchedule, type ScheduleData } from "@/lib/schedule";
import { sendHandover } from "@/lib/telegram.functions";

export const Route = createFileRoute("/daily-activity")({
  head: () => ({ meta: [{ title: "Daily Checklist — Care Center Telkomsat" }] }),
  component: DailyChecklistPage,
});

type ToolStatus = "normal" | "warning" | "critical" | "uncheck";

const CATEGORIES = [
  "NMS HUB",
  "PRTG",
  "NETFLOW",
  "CACTI",
  "NAGIOS",
  "LIBRE",
  "STARMON",
  "LAIN-LAIN",
] as const;

type Category = (typeof CATEGORIES)[number];

type Item = {
  id: string;
  name: string;
  cat: string;
  url?: string;
  status: ToolStatus;
  notes: string;
  ticket: string;
};

const DEFAULT_TOOLS: Item[] = [
  // PRTG
  { id: "prtg_gov1", name: "GOV 1", cat: "PRTG", url: "http://prtg-gov1.telkomsat.net:9100/", status: "uncheck", notes: "", ticket: "" },
  { id: "prtg_gov2", name: "GOV 2", cat: "PRTG", url: "http://prtg-gov2.telkomsat.net:9200/", status: "uncheck", notes: "", ticket: "" },
  // NETFLOW
  { id: "netflow_boo1", name: "BOO 1", cat: "NETFLOW", url: "http://netflow-main.telkomsat.net:8000/", status: "uncheck", notes: "", ticket: "" },
  // NMS HUB
  { id: "hub_main", name: "Hub VSAT Utama", cat: "NMS HUB", url: "", status: "uncheck", notes: "", ticket: "" },
  // CACTI
  { id: "cacti_main", name: "Cacti Server", cat: "CACTI", url: "", status: "uncheck", notes: "", ticket: "" },
  // NAGIOS
  { id: "nagios_main", name: "Nagios Core", cat: "NAGIOS", url: "", status: "uncheck", notes: "", ticket: "" },
  // LIBRE
  { id: "libre_main", name: "LibreNMS", cat: "LIBRE", url: "", status: "uncheck", notes: "", ticket: "" },
  // STARMON
  { id: "starmon_main", name: "Starlink Monitoring Portal", cat: "STARMON", url: "", status: "uncheck", notes: "", ticket: "" },
  // LAIN-LAIN
  { id: "bot_telegram", name: "Bot Telegram (@CC3Notif_bot)", cat: "LAIN-LAIN", url: "", status: "uncheck", notes: "", ticket: "" },
  { id: "carecenter_web", name: "Web Care Center Telkomsat", cat: "LAIN-LAIN", url: "", status:
    "uncheck", notes: "", ticket: "" },
  { id: "db_supabase", name: "Database & Server API", cat: "LAIN-LAIN", url: "", status: "uncheck", notes: "", ticket: "" },
];
