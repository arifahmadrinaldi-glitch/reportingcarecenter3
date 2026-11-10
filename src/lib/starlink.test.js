import { describe, expect, test } from "bun:test";
import { filterStarlink, starlinkCounts } from "./starlink";
import { readStarlinkSnapshot } from "./starlink.server";

const rows = [
  { id: "1", location: "Merauke", serviceLine: "SL-101", kitSerial: "KIT201", status: "online" },
  { id: "2", location: "Solo", serviceLine: "SL-102", kitSerial: "KIT202", status: "offline" },
  { id: "3", location: "Buli", serviceLine: "SL-103", kitSerial: "KIT203", status: "inactive" },
  { id: "4", location: "Napan", serviceLine: "SL-104", kitSerial: "KIT204", status: "unknown" },
];
describe("Starlink monitoring", () => {
  test("counts all four status categories independently", () => {
    expect(starlinkCounts([...rows, rows[0]])).toEqual({ online: 2, offline: 1, inactive: 1, unknown: 1 });
  });
  test("status filter excludes other states", () => {
    expect(filterStarlink(rows, "inactive", "").map((row) => row.id)).toEqual(["3"]);
  });
  test("search matches location, service line and kit serial", () => {
    expect(filterStarlink(rows, "all", " MERAUKE ").map((row) => row.id)).toEqual(["1"]);
    expect(filterStarlink(rows, "all", "sl-102").map((row) => row.id)).toEqual(["2"]);
    expect(filterStarlink(rows, "all", "kit204").map((row) => row.id)).toEqual(["4"]);
    expect(filterStarlink(rows, "online", "kit202")).toEqual([]);
  });
  test("demo is explicitly distinguished from live service-account data", async () => {
    expect((await readStarlinkSnapshot()).source).toBe("demo");
    const live = await readStarlinkSnapshot({ listTerminals: async () => rows });
    expect(live.source).toBe("live");
    expect(live.terminals).toEqual(rows);
  });
  test("service-account failures never masquerade as demo success", async () => {
    await expect(readStarlinkSnapshot({ listTerminals: async () => { throw new Error("Unavailable"); } })).rejects.toThrow("Unavailable");
  });
});