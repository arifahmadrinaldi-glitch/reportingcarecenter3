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
  identityPeriod?: string;
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
  "Indra Nurrhaman",
  "Muhammad Dicky Chairudin",
  "Algyan Gufaira",
];
const NON_VSAT_NIKS = ["99210193", "1230315", "9215020", "2230414", "94210128", "93210167", "92210124"];

export function initializeBusiness(saved?: BusinessData, previous?: BusinessData, previousPeriod?: string, targetPeriod?: string): BusinessData {
  if (saved?.rosterVersion === 2 && Array.isArray(saved.members) && saved.cells) {
    const result = structuredClone(saved);
    if (result.regular?.name === "Ahmad Arif Rinaldi") result.regular.name = "Reguler";
    if (targetPeriod) rotateBusinessIdentities(result, saved.identityPeriod, targetPeriod);
    return result;
  }
  const source = previous?.rosterVersion === 2 ? previous : undefined;
  const regularSource = saved ?? previous;
  const regularCells = saved?.cells?.[-1];
  const regular = { ...(regularSource?.regular ?? { nik: "", name: "Reguler", phone: "" }) };
  if (regular.name === "Ahmad Arif Rinaldi") regular.name = "Reguler";

  const result: BusinessData = {
    rosterVersion: 2,
    members: [...(source?.members ?? DEFAULT_BUSINESS_MEMBERS)],
    niks: [...(source?.niks ?? NON_VSAT_NIKS)],
    phones: [...(source?.phones ?? Array(7).fill("0811-1666-727 / 081213954835"))],
    regular,
    cells: regularCells ? { [-1]: structuredClone(regularCells) } : {},
    normalCells: {},
  };
  if (targetPeriod) rotateBusinessIdentities(result, source ? previousPeriod : "2026-11", targetPeriod);
  if (source && previousPeriod) carryPatterns(result, source, previousPeriod);
  return result;
}
export type ScheduleData = {
  rosterVersion?: number;
  identityPeriod?: string;
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

export function initializeSchedule(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }, targetPeriod?: string): ScheduleData {
  const r = initShift(saved, previous, targetPeriod);
  r.business = initializeBusiness(saved?.business, previous?.data?.business, previous?.period, targetPeriod);
  return r;
}
function initShift(saved?: ScheduleData, previous?: { period: string; data: ScheduleData }, targetPeriod?: string): ScheduleData {
  if (saved?.rosterVersion === 2 && Array.isArray(saved.members) && saved.cells) {
    const result = structuredClone(saved);
    if (targetPeriod) rotateIdentities(result, saved.identityPeriod, targetPeriod);
    return result;
  }
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
  if (targetPeriod) rotateIdentities(result, source ? previous?.period : "2026-11", targetPeriod);
  if (!previous || !hasValidSource || !source) return result;
  carryPatterns(result, source, previous.period);
  return result;
}

function periodIndex(period: string) {
  const [year, month] = period.split("-").map(Number);
  return year && month && month >= 1 && month <= 12 ? year * 12 + month - 1 : undefined;
}

// Rotate identity columns only: shift patterns and month-specific cells stay at their roster positions.
function rotateIdentities(data: ScheduleData, sourcePeriod: string | undefined, targetPeriod: string) {
  const target = periodIndex(targetPeriod);
  if (target === undefined || !data.members.length) return;
  // Backfill missing legacy NIKs by name before rotating, preserving manually entered identities.
  data.niks = data.members.map((name, i) => data.niks?.[i] || VSAT_NIKS[DEFAULT_MEMBERS.indexOf(name)] || "");
  const anchor = periodIndex("2026-11");
  if (anchor === undefined) return;
  const source = sourcePeriod ? periodIndex(sourcePeriod) : undefined;
  // Older saves have no identity period. Infer their existing rotation rather than rotating twice.
  const knownIndex = data.members.findIndex((name, i) => VSAT_NIKS.includes(data.niks?.[i] ?? "") || DEFAULT_MEMBERS.includes(name));
  const knownOffset = knownIndex < 0 ? 0 : (() => {
    const nikIndex = VSAT_NIKS.indexOf(data.niks?.[knownIndex] ?? "");
    return (nikIndex >= 0 ? nikIndex : DEFAULT_MEMBERS.indexOf(data.members[knownIndex] ?? "")) - knownIndex;
  })();
  const steps = source === undefined ? target - anchor - knownOffset : target - source;
  const count = data.members.length;
  const offset = ((steps % count) + count) % count;
  const order = Array.from({ length: count }, (_, i) => (i + offset) % count);
  data.members = order.map((i) => data.members[i] ?? "");
  if (data.niks) data.niks = order.map((i) => data.niks?.[i] ?? "");
  if (data.phones) data.phones = order.map((i) => data.phones?.[i] ?? "");
  data.identityPeriod = targetPeriod;
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
function rotateBusinessIdentities(data: BusinessData, sourcePeriod: string | undefined, targetPeriod: string) {
  const target = periodIndex(targetPeriod);
  if (target === undefined || !data.members.length) return;
  data.niks = data.members.map((name, i) => data.niks?.[i] || NON_VSAT_NIKS[DEFAULT_BUSINESS_MEMBERS.indexOf(name)] || "");
  const anchor = periodIndex("2026-11");
  if (anchor === undefined) return;
  const source = sourcePeriod ? periodIndex(sourcePeriod) : undefined;
  const knownIndex = data.members.findIndex((name, i) => NON_VSAT_NIKS.includes(data.niks?.[i] ?? "") || DEFAULT_BUSINESS_MEMBERS.includes(name));
  const knownOffset = knownIndex < 0 ? 0 : (() => {
    const nikIndex = NON_VSAT_NIKS.indexOf(data.niks?.[knownIndex] ?? "");
    return (nikIndex >= 0 ? nikIndex : DEFAULT_BUSINESS_MEMBERS.indexOf(data.members[knownIndex] ?? "")) - knownIndex;
  })();
  const steps = source === undefined ? target - anchor - knownOffset : target - source;
  const count = data.members.length;
  const offset = ((steps % count) + count) % count;
  const order = Array.from({ length: count }, (_, i) => (i + offset) % count);
  data.members = order.map((i) => data.members[i] ?? "");
  if (data.niks) data.niks = order.map((i) => data.niks?.[i] ?? "");
  if (data.phones) data.phones = order.map((i) => data.phones?.[i] ?? "");
  data.identityPeriod = targetPeriod;
}
