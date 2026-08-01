import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  /** Local datetime string: YYYY-MM-DDTHH:mm (empty when unset) */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

const parseDate = (value: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const build = (date: Date, hour: string, minute: string) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hour}:${minute}`;

export function DateTimePicker({ value, onChange, placeholder = "Pilih tanggal & jam" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const hour = selected ? pad(selected.getHours()) : "00";
  const minute = selected ? pad(selected.getMinutes()) : "00";

  const display = selected
    ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()} ${hour}:${minute}`
    : placeholder;

  const setTime = (nextHour: string, nextMinute: string) => {
    const base = selected ?? new Date();
    onChange(build(base, nextHour, nextMinute));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full justify-start gap-2 bg-surface font-normal"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          <span className={selected ? "" : "text-muted-foreground"}>{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(2015, 0)}
          endMonth={new Date(2035, 11)}
          selected={selected}
          defaultMonth={selected ?? new Date()}
          onSelect={(date) => {
            if (!date) return;
            onChange(build(date, hour, minute));
          }}
          className="rounded-t-md bg-muted/40"
        />
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-3">
          <span className="text-xs text-muted-foreground">Jam (24h)</span>
          <Select value={hour} onValueChange={(v) => setTime(v, minute)}>
            <SelectTrigger className="h-9 w-[74px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">:</span>
          <Select value={minute} onValueChange={(v) => setTime(hour, v)}>
            <SelectTrigger className="h-9 w-[74px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {MINUTES.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className="size-4" /> Hapus
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Selesai
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}