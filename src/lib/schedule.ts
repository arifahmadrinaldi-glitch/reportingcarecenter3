export const CYCLE = ["P", "P", "M", "M", "S", "S", "L", "L"] as const;
export const CODES = ["P", "S", "M", "L", "CT"] as const;
export const WORK = new Set<string>(["P", "S", "M"]);
export const DEFAULT_MEMBERS = ["Anggota 1", "Anggota 2", "Anggota 3", "Anggota 4"];
const ANCHOR = Date.UTC(2026, 0, 1);
const DAY = 86400000;
export type Cell = { code: string; backupFor?: string; originalCode?: string };
export type ScheduleData = {
  members: string[];
  niks?: string[];
  phones?: string[];
  regular?: { nik: string; name: string; phone: string };
  cells: Record<string, Record<string, Cell>>;
  normalCells?: Record<string, Record<string, Cell>>;
  patterns?: string[][];
  patternAnchor?: number;
};

export function rosterCode(m: number, year: number, month: number, day: number, data?: ScheduleData): string {
  const date = Date.UTC(year, month, day);
  const pattern = data?.patterns?.[m];
  const start = data?.patternAnchor;
  if (pattern?.length === 8 && start !== undefined) {
    return pattern[((Math.floor((date - start) / DAY) % 8) + 8) % 8] ?? "P";
  }
  return CYCLE[((Math.floor((date - ANCHOR) / DAY) + m * 2) % 8 + 8) % 8] ?? "P";
}

export function initializeSchedule(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }): ScheduleData {
  if (saved) return structuredClone(saved);
  const source = previous?.data;
  const result: ScheduleData = {
    members: source?.members?.length === 4 ? [...source.members] : [...DEFAULT_MEMBERS],
    niks: [...(source?.niks ?? ["", "", "", ""])],
    phones: [...(source?.phones ?? ["", "", "", ""])],
    regular: { ...(source?.regular ?? { nik: "", name: "Reguler", phone: "" }) },
    cells: {},
    normalCells: {},
  };
  if (!previous || !source) return result;
  const [y, mo] = previous.period.split("-").map(Number);
  if (!y || !mo) return result;
  const last = new Date(y, mo, 0).getDate();
  result.patternAnchor = Date.UTC(y, mo - 1, last - 7);
  result.patterns = source.members.map((_, m) => Array.from({ length: 8 }, (_, i) => {
    const d = last - 7 + i;
    const cell = source.normalCells?.[m]?.[d] ?? source.cells[m]?.[d];
    // Never propagate leave or replacement assignments into a normal month.
    return cell?.originalCode ?? (cell && cell.code !== "CT" && !cell.backupFor ? cell.code : rosterCode(m, y, mo - 1, d, source));
  }));
  return result;
}