import { describe, expect, test } from "bun:test";
import { LAYANAN_OPTIONS_VSAT, OPEN_BY_OPTIONS_VSAT, ticketCategory } from "./ticket-constants";
import { dailyActivityCategory } from "./daily-activity-constants";

describe("Care Center category rules", () => {
  test("Vsat IP Gyro follows Vsat IP", () => {
    expect(LAYANAN_OPTIONS_VSAT.slice(0, 2)).toEqual(["Vsat IP", "Vsat IP Gyro"]);
    expect(ticketCategory("Vsat IP Gyro")).toBe("vsat");
  });
  test("Vsat personnel split Arif and Ardi", () => {
    expect(OPEN_BY_OPTIONS_VSAT.slice(0, 2)).toEqual(["Arif", "Ardi"]);
    expect(OPEN_BY_OPTIONS_VSAT.includes("Arif Ardi")).toBe(false);
  });
  test("tickets and activity use the same category for each product", () => {
    for (const product of LAYANAN_OPTIONS_VSAT) {
      expect(ticketCategory(product)).toBe("vsat");
      expect(dailyActivityCategory({ product })).toBe("vsat");
    }
    for (const product of ["Vsat Star", "Gyro", "VSTAR", "SBS", "VIS", "Radio IP"]) {
      expect(ticketCategory(product)).toBe("non-vsat");
      expect(dailyActivityCategory({ product })).toBe("non-vsat");
    }
  });
});