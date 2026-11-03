export const CYCLE = ["P", "P", "S", "S", "M", "L", "L"] as const;
export const CODES = ["P", "S", "M", "L", "CT", "R", "PS", "SM", "MP", "PM", "PSM"] as const;
export const WORK = new Set<string>(["P", "S", "M", "R"]);
export const DEFAULT_MEMBERS = ["Ahmad Hidayah", "Opi Ul Umam", "Andriansyah", "Avian Dwi Nofyanto", "Muhammad Faishal Rayyan", "Ferdi Arsy Bahtiariyanza", "Rachmat Dwi Ramdani"];
const VSAT_NIKS = ["9818001", "91210131", "9416031", "9119008", "02250398", "94210087", "9717053"];
const ANCHOR = Date.UTC(2026, 10, 1);
const DAY = 86400000;
export type Cell = { code: string; backupFor?: string; originalCode?: string | undefined; covered?: string };
export const BUSINESS_CYCLE = CYCLE;
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
  rosterVersion?: number;
  normalCells?: Record<string, Record<string, Cell>>;
  patterns?: string[][];
  patternAnchor?: number;
  members: string[];
  niks: string[];
  phones: string[];
  regular: { nik: string; name: string; phone: string };
  cells: Record<string, Record<string, Cell>>;
};
export function businessCode(m: number, year: number, month: number, day: number, data?: BusinessData) {
  return rosterCode(m, year, month, day, data);
}
const DEFAULT_BUSINESS_MEMBERS = [
  "Randretya Davit Anugrah",
  "Ari Awaludin Muslim",
  "Rangga Putra Rimba",
  "Raihan Fachrudiansyah",
  "Indra Nurrahman",
  "Muhammad Dicky Chairudin",
  "Algyan Gufarira",
];

export function initializeBusiness(saved?: BusinessData, previous?: BusinessData, previousPeriod?: string): BusinessData {
  if (saved?.rosterVersion === 2 && Array.isArray(saved.members) && saved.cells) return structuredClone(saved);
  const source = previous?.rosterVersion === 2 ? previous : undefined;
  const regularSource = saved ?? previous;
  const regularCells = saved?.cells?.[-1];
  const result: BusinessData = {
    rosterVersion: 2,
    members: [...(source?.members ?? DEFAULT_BUSINESS_MEMBERS)],
    niks: [...(source?.niks ?? ["99210193", "1230315", "9215020", "2230414", "94210128", "93210167", "92210124"])],
    phones: [...(source?.phones ?? Array(7).fill("0811-1666-727 / 081213954835"))],
    regular: { ...(regularSource?.regular ?? { nik: "", name: "Reguler", phone: "" }) },
    cells: regularCells ? { [-1]: structuredClone(regularCells) } : {},
    normalCells: {},
  };
  if (source && previousPeriod) carryPatterns(result, source, previousPeriod);
  return result;
}
export type ScheduleData = {
  rosterVersion?: number;
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

export function rosterCode(m: number, year: number, month: number, day: number, data?: ScheduleData | BusinessData): string {
  const date = Date.UTC(year, month, day);
  const pattern = data?.patterns?.[m];
  const start = data?.patternAnchor;
  if (pattern?.length === 7 && start !== undefined) {
    return pattern[((Math.floor((date - start) / DAY) % 7) + 7) % 7] ?? "P";
  }
  return CYCLE[((Math.floor((date - ANCHOR) / DAY) - m) % 7 + 7) % 7] ?? "P";
}

export function initializeSchedule(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }): ScheduleData {
  const r = initShift(saved, previous);
  r.business = initializeBusiness(saved?.business, previous?.data?.business, previous?.period);
  return r;
}
function initShift(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }): ScheduleData {
  if (saved?.rosterVersion === 2 && Array.isArray(saved.members) && saved.cells) return structuredClone(saved);
  const source = previous?.data.rosterVersion === 2 ? previous.data : undefined;
  const hasValidSource = Boolean(source && Array.isArray(source.members) && source.cells);
  const regularCells = saved?.cells?.[-1];
  const result: ScheduleData = {
    rosterVersion: 2,
    members: [...(source?.members ?? DEFAULT_MEMBERS)],
    niks: [...(source?.niks ?? VSAT_NIKS)],
    phones: [...(source?.phones ?? Array(7).fill("0813-8257-3869 / 0823-1129-2761"))],
    regular: { ...(saved?.regular ?? previous?.data.regular ?? { nik: "", name: "Reguler", phone: "" }) },
    cells: regularCells ? { [-1]: structuredClone(regularCells) } : {},
    normalCells: {},
  };
  if (!previous || !hasValidSource || !source) return result;
  carryPatterns(result, source, previous.period);
  return result;
}
function carryPatterns(result: ScheduleData | BusinessData, source: ScheduleData | BusinessData, period: string) {
  const [y, mo] = period.split("-").map(Number);
  if (!y || !mo) return;
  const last = new Date(y, mo, 0).getDate();
  result.patternAnchor = Date.UTC(y, mo - 1, last - 6);
  result.patterns = result.members.map((_, m) => Array.from({ length: 7 }, (_, i) => {
    const d = last - 6 + i;
    const cell = source.normalCells?.[m]?.[d] ?? source.cells[m]?.[d];
    return cell?.originalCode ?? (cell && cell.code !== "CT" && !cell.backupFor ? cell.code : rosterCode(m, y, mo - 1, d, source));
  }));
}
