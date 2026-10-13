// National holidays only (not collective leave), per annual joint ministerial decrees.
// 2026: SKB 1497/2025, 2/2025, 5/2025. 2027: SKB 1205/2026, 3/2026, 2/2026.
const dates: Record<number, string[]> = {
  2026: ["01-01", "01-16", "02-17", "03-19", "03-21", "03-22", "04-03", "04-05", "05-01", "05-14", "05-27", "05-31", "06-01", "06-16", "08-17", "08-25", "12-25"],
  2027: ["01-01", "01-05", "02-06", "03-08", "03-10", "03-11", "03-26", "03-28", "05-01", "05-06", "05-17", "05-20", "06-01", "06-06", "08-15", "08-17", "12-25", "12-26"],
};
export function isNationalHoliday(year: number, month: number, day: number) {
  const key = `${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return (dates[year] ?? ["01-01", "05-01", "06-01", "08-17", "12-25"]).includes(key);
}
export function regularCode(year: number, month: number, day: number) {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6 || isNationalHoliday(year, month, day) ? "L" : "R";
}
