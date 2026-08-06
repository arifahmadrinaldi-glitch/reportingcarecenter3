import * as XLSX from "xlsx";

/** Parse an uploaded .xlsx/.xls/.csv file into row objects keyed by header label. */
export async function parseSheetFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const first = workbook.SheetNames[0];
  if (!first) return [];
  const sheet = workbook.Sheets[first];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows.map((row) => {
    const clean: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      clean[String(key).trim().toLowerCase()] = String(value ?? "").trim();
    }
    return clean;
  });
}

/** Read a value from a parsed row using one of several possible header labels. */
export const pick = (row: Record<string, string>, ...labels: string[]) => {
  for (const label of labels) {
    const value = row[label.trim().toLowerCase()];
    if (value) return value;
  }
  return "";
};
