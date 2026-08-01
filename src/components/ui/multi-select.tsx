import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: readonly string[];
  className?: string;
};

export function MultiSelect({ label, values, onChange, options, className }: Props) {
  const summary =
    values.length === 0
      ? "Semua"
      : values.length === 1
        ? values[0]
        : `${values.length} dipilih`;

  const toggle = (option: string) =>
    onChange(
      values.includes(option) ? values.filter((v) => v !== option) : [...values, option],
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-full bg-surface px-4 text-xs font-normal",
            className,
          )}
        >
          <span className="truncate">
            <span className="text-muted-foreground">{label}: </span>
            <span className="font-medium">{summary}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <button
          type="button"
          onClick={() => onChange([])}
          className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
        >
          Semua
          {values.length === 0 ? <Check className="size-3.5 text-primary" /> : null}
        </button>
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent"
            >
              <Checkbox
                checked={values.includes(option)}
                onCheckedChange={() => toggle(option)}
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
          {options.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">Tidak ada pilihan</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}