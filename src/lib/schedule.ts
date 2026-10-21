export const CYCLE = ["P", "P", "M", "M", "S", "S", "L", "L"] as const;
export const CODES = ["P", "S", "M", "L", "CT", "R", "PS", "SM", "MP", "PM", "PSM"] as const;
export const WORK = new Set<string>(["P", "S", "M", "R"]);
export const DEFAULT_MEMBERS = ["Anggota 1", "Anggota 2", "Anggota 3", "Anggota 4"];
const ANCHOR = Date.UTC(2026, 0, 1);
const DAY = 86400000;
export type Cell = { code: string; backupFor?: string; originalCode?: string | undefined; covered?: string };
export const BUSINESS_CYCLE = ["PS", "PS", "M", "M", "L", "L", "L", "L"] as const;
export const BUSINESS_CODES = ["P", "S", "M", "L", "CT", "PS", "SM", "MP", "PM", "PSM"] as const;
export const shiftCount = (code: string) => (code === "CT" ? 0 : code.split("").filter((c) => WORK.has(c)).length);
export function scheduleStats(getCell: (day: number) => Cell, days: number, regularWork = 0) {
  let work = 0, ct = 0, bk = 0;
  for (let day = 1; day <= days; day++) {
    const cell = getCell(day);
    if (cell.code === "CT") ct++;
    if (cell.backupFor) bk++;
    work += cell.backupFor && cell.covered
      ? shiftCount(cell.originalCode ?? "") + shiftCount(cell.covered)
      : shiftCount(cell.code);
  }
  return { work, ct, bk, buffer: work - regularWork };
}

export function workExcelFormula(range: string, backupAdjustment = 0) {
  return CODES.filter((code) => shiftCount(code) > 0)
    .map((code) => `${shiftCount(code)}*COUNTIF(${range},"${code}")+${shiftCount(code)}*COUNTIF(${range},"${code} (BK *)")`)
    .join("+") + `+${backupAdjustment}`;
}
export type BusinessData = {
  members: string[];
  niks: string[];
  phones: string[];
  regular: { nik: string; name: string; phone: string };
  cells: Record<string, Record<string, Cell>>;
};
export function businessCode(m: number, year: number, month: number, day: number) {
  const n = Math.floor((Date.UTC(year, month, day) - ANCHOR) / DAY) + m * 2;
  const cycleLength = BUSINESS_CYCLE.length;
return BUSINESS_CYCLE[((n % cycleLength) + cycleLength) % cycleLength] ?? "P";
}
const DEFAULT_BUSINESS_MEMBERS = [
  "Ari Awaludin Muslim",
  "Raihan Fachrudiansyah",
  "Rangga Putra Rimba",
  "Muhammad Dicky Chairudin",
];

export function initializeBusiness(saved?: BusinessData, previous?: BusinessData): BusinessData {
  if (saved && Array.isArray(saved.members) && saved.cells) return structuredClone(saved);
  return {
    members: previous?.members?.length === 4 ? [...previous.members] : DEFAULT_BUSINESS_MEMBERS,
    niks: [...(previous?.niks ?? ["", "", "", ""])],
    phones: [...(previous?.phones ?? ["", "", "", ""])],
    regular: { ...(previous?.regular ?? { nik: "", name: "Reguler", phone: "" }) },
    cells: {},
  };
}
export type ScheduleData = {
  members: string[];
  niks?: string[];
  phones?: string[];
  regular?: { nik: string; name: string; phone: string };
  cells: Record<string, Record<string, Cell>>;
  normalCells?: Record<string, Record<string, Cell>>;
  patterns?: string[][];
  patternAnchor?: number;
  business?: BusinessData;
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
  const r = initShift(saved, previous);
  r.business = initializeBusiness(saved?.business, previous?.data?.business);
  return r;
}
function initShift(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }): ScheduleData {
  if (saved && Array.isArray(saved.members) && saved.cells) return structuredClone(saved);
  const source = previous?.data;
  const hasValidSource = Boolean(source && Array.isArray(source.members) && source.cells);
  const result: ScheduleData = {
    members: hasValidSource && source?.members?.length === 4 ? [...source.members] : [...DEFAULT_MEMBERS],
    niks: [...(source?.niks ?? ["", "", "", ""])],
    phones: [...(source?.phones ?? ["", "", "", ""])],
    regular: { ...(source?.regular ?? { nik: "", name: "Reguler", phone: "" }) },
    cells: {},
    normalCells: {},
  };
  if (!previous || !hasValidSource || !source) return result;
  const [y, mo] = previous.period.split("-").map(Number);
  if (!y || !mo) return result;
  const last = new Date(y, mo, 0).getDate();
  result.patternAnchor = Date.UTC(y, mo - 1, last - 7);
  result.patterns = result.members.map((_, m) => Array.from({ length: 8 }, (_, i) => {
    const d = last - 7 + i;
    const cell = source.normalCells?.[m]?.[d] ?? source.cells[m]?.[d];
    return cell?.originalCode ?? (cell && cell.code !== "CT" && !cell.backupFor ? cell.code : rosterCode(m, y, mo - 1, d, source));
  }));
  return result;
}
