import { ticketCategory, type TicketCategory } from "./ticket-constants";

export type CareCenterSelection = TicketCategory | "all";

export function filterCareCenterRows<T>(
  rows: T[],
  selection: CareCenterSelection,
  service: (row: T) => string | null | undefined,
): T[] {
  return selection === "all"
    ? rows
    : rows.filter((row) => ticketCategory(service(row) ?? null) === selection);
}