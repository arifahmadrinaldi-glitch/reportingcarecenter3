import { expect, test } from "bun:test";
import { parseTelegramCommand, openTicketResume } from "./telegram-report";

test("opentiket vsat alias scopes Vsat", () => {
  expect(parseTelegramCommand("/opentiket vsat")).toEqual({ command: "/tiketopen", category: "vsat", args: [] });
});
test("every command accepts category without consuming other arguments", () => {
  for (const command of ["/tiketopen", "/rekap", "/tiketclose", "/tiketterlama", "/caritiket", "/ping", "/help", "/start"]) {
    expect(parseTelegramCommand(`${command}@CC3Notif_bot nonvsat November 2026`).category).toBe("non-vsat");
    expect(parseTelegramCommand(`${command} November vsat 2026`).args).toEqual(["November", "2026"]);
  }
});
test("without category commands combine both Care Centers", () => {
  expect(parseTelegramCommand("/tiketopen").category).toBe("all");
});
const rows = [
  { layanan: "Vsat Star", status: "Pending", jenis_ticket: "Corrective Maintenance" },
  { layanan: "CGW", status: "Pending Spare", jenis_ticket: "Preventive Maintenance" },
  { layanan: "Vsat IP", status: "Pending", jenis_ticket: "Corrective Maintenance" },
  { layanan: "Vsat Star", status: "Close", jenis_ticket: "Corrective Maintenance" },
  { layanan: "CGW", status: "Technical Close", jenis_ticket: "Preventive Maintenance" },
];
test("Non-Vsat resume counts Vsat Star and CGW separately excluding closed", () => {
  const resume = openTicketResume(rows, "non-vsat");
  expect(resume.total).toBe(2);
  expect(resume.services).toEqual([["Vsat Star", 1], ["CGW", 1]]);
  expect([resume.cm, resume.pm]).toEqual([1, 1]);
});
test("Vsat resume excludes Non-Vsat services", () => {
  const resume = openTicketResume(rows, "vsat");
  expect(resume.services).toEqual([["Vsat IP", 1]]);
  expect(resume.total).toBe(1);
});
test("combined resume counts all open tickets", () => {
  expect(openTicketResume(rows, "all").total).toBe(3);
});