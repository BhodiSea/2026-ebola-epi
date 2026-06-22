import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getZoneEpiSeries,
  getZoneRawRows,
  getZoneStatTotals,
  getZoneTotalsAsOf,
} from "@/lib/queries/zone-detail";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
// Irumu zone has 98 confirmed cases in seed
const ZONE_IR = "COD-IT-IR";

afterEach(resetFixtures);

describe("getZoneStatTotals (integration)", () => {
  it("returns cumulative confirmed for Irumu (COD-IT-IR)", async () => {
    const result = await getZoneStatTotals(OUTBREAK_ID, ZONE_IR, "all");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(98);
    expect(result.data.confirmed.quoteId).toBeTruthy();
  });

  it("returns no-rows for a nonexistent zone", async () => {
    const result = await getZoneStatTotals(OUTBREAK_ID, "ZZ-XX-00", "all");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("no-rows");
  });
});

describe("getZoneTotalsAsOf (integration)", () => {
  it("returns a map with all five seeded zones at 2026-05-24", async () => {
    const result = await getZoneTotalsAsOf(OUTBREAK_ID, "2026-05-24");
    expect(typeof result).toBe("object");
    expect(Object.keys(result).length).toBeGreaterThanOrEqual(5);
    expect(result["COD-IT-IR"]).toBe(98);
    expect(result["COD-IT-MB"]).toBe(45);
  });

  it("returns empty object before any data exists", async () => {
    const result = await getZoneTotalsAsOf(OUTBREAK_ID, "2020-01-01");
    expect(result).toEqual({});
  });
});

describe("getZoneEpiSeries (integration)", () => {
  it("returns a confirmed series with at least one point for seeded zone", async () => {
    const { confirmed } = await getZoneEpiSeries(OUTBREAK_ID, ZONE_IR, "all");
    expect(confirmed.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getZoneRawRows (integration)", () => {
  it("returns published rows for the seeded zone", async () => {
    const rows = await getZoneRawRows(OUTBREAK_ID, ZONE_IR);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]?.metric).toBe("confirmed");
    expect(rows[0]?.sourceQuoteId).toBeTruthy();
  });
});
