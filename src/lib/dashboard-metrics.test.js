import { describe, expect, test } from "bun:test";
import { dashboardMetrics, dailyTicketTrend, ticketOverdue, matchesDashboardPeriod } from "./dashboard-metrics";
import { filterCareCenterRows } from "./care-center-filter";

const row = (overrides = {}) => ({ id: "a", status: "Diagnose", layanan: "Vsat IP", tanggal_open: "2026-11-01T08:00:00", tanggal_close: null, keterangan: null, ...overrides });
const now = new Date("2026-11-13T10:00:00").getTime();
describe("Dashboard KPI and trends", () => {
  test("MTTR averages valid durations of Close and Technical Close tickets", () => {
    const metrics = dashboardMetrics([row({ status: "Close", tanggal_close: "2026-11-01T10:00:00" }), row({ status: "Technical Close", tanggal_close: "2026-11-01T12:00:00" }), row(), row({ status: "Close", tanggal_close: null })], now);
    expect(metrics.mttrMs).toBe(3 * 3600000);
  });
  test("completion rate is closed divided by all filtered tickets", () => {
    const metrics = dashboardMetrics([row(), row({ status: "Close" }), row({ status: "Technical Close" }), row()], now);
    expect(metrics.completionRate).toBe(50);
    expect(metrics.active).toBe(2);
  });
  test("only active tickets with elapsed pending deadlines are overdue", () => {
    expect(ticketOverdue(row({ keterangan: "Pending sampai 13/11/2026 09:59" }), now)).toBe(true);
    expect(ticketOverdue(row({ keterangan: "Pending sampai 13/11/2026 10:01" }), now)).toBe(false);
    expect(ticketOverdue(row({ status: "Technical Close", keterangan: "13/11/2026 09:00" }), now)).toBe(false);
    expect(dashboardMetrics([row({ keterangan: "13/11/2026 09:00" }), row()], now).overdue).toBe(1);
  });
  test("Top 5 contains oldest active tickets and excludes closed and invalid dates", () => {
    const tickets = Array.from({ length: 7 }, (_, i) => row({ id: String(i), tanggal_open: `2026-11-0${i + 1}T08:00:00` }));
    expect(dashboardMetrics([...tickets.reverse(), row({ id: "closed", status: "Close", tanggal_open: "2026-10-01" }), row({ tanggal_open: null })], now).oldest.map((t) => t.id)).toEqual(["0", "1", "2", "3", "4"]);
  });
  test("daily close counts use closing date even when opened in the previous month", () => {
    const trend = dailyTicketTrend([row(), row({ status: "Close", tanggal_open: "2026-10-31T08:00:00", tanggal_close: "2026-11-02T10:00:00" })], "November", "2026");
    expect(trend).toHaveLength(30);
    expect(trend[0].open).toBe(1);
    expect(trend[1].close).toBe(1);
    expect(trend[1].open).toBe(0);
    expect(trend[2].close).toBe(0);
  });
  test("Care Center, month and year scope KPIs and trend", () => {
    const scoped = filterCareCenterRows([row(), row({ layanan: "Vsat Star" }), row({ tanggal_open: "2025-11-01" }), row({ tanggal_open: "2026-10-01" })], "vsat", (t) => t.layanan);
    expect(dashboardMetrics(scoped.filter((t) => matchesDashboardPeriod(t.tanggal_open, "November", "2026")), now).active).toBe(1);
    expect(dailyTicketTrend(scoped, "November", "2026").reduce((n, d) => n + d.open, 0)).toBe(1);
  });
  test("empty data has no fabricated MTTR or tickets", () => {
    expect(dashboardMetrics([], now)).toMatchObject({ mttrMs: null, completionRate: 0, active: 0, overdue: 0, oldest: [] });
  });
});