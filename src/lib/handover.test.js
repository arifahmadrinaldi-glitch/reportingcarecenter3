import { describe, expect, test } from "bun:test";
import { currentShift, nextShift, officersOn, buildHandover } from "./handover";

describe("handover", () => {
  test("night shift after midnight belongs to previous day and hands over to Pagi", () => {
    const slot = currentShift(new Date(2026, 10, 12, 3, 0));
    expect(slot.shift).toBe("M");
    expect(slot.date.getDate()).toBe(11);
    const n = nextShift(slot);
    expect(n.shift).toBe("P");
    expect(n.date.getDate()).toBe(12);
  });
  test("Pagi hands over to Siang", () => {
    expect(nextShift(currentShift(new Date(2026, 10, 12, 10))).shift).toBe("S");
  });
  test("CT member is replaced by backup on the shift", () => {
    const data = { members: ["A", "B"], cells: { 0: { 12: { code: "CT", originalCode: "P" } }, 1: { 12: { code: "PS", backupFor: "A", originalCode: "S", covered: "P" } } } };
    const slot = currentShift(new Date(2026, 10, 12, 10));
    expect(officersOn(data, slot)).toEqual(["B (backup A)"]);
    expect(officersOn(data, nextShift(slot))).toEqual(["B"]);
  });
  test("report counts only selected category", () => {
    const t = (layanan, status) => ({ layanan, status, jenis_ticket: "Corrective Maintenance", nama_lokasi: "X", created_at: "2026-11-01" });
    const slot = currentShift(new Date(2026, 10, 12, 10));
    const text = buildHandover({ tickets: [t("Vsat IP", "Pending"), t("CGW", "Pending")], category: "vsat", now: new Date(2026, 10, 12, 10), current: slot, next: nextShift(slot), outgoing: [], incoming: [], notes: "" });
    expect(text).toContain("Total tiket aktif     : 1 (CM: 1 | PM: 0)");
  });
});
