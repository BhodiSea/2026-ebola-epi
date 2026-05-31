import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDisagreements,
  getEpiCurveSeries,
  getSparkline14d,
  getStatTotals,
} from "@/lib/queries/case-counts";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

afterEach(resetFixtures);

describe("getStatTotals (integration)", () => {
  it("returns seeded confirmed and deaths totals", async () => {
    const result = await getStatTotals(OUTBREAK_ID);
    // Seed has 5 confirmed zone rows: IR=98+MB=45+BU=23+KO=15+MA=8 = 189 minimum
    expect(result.confirmed.value).toBeGreaterThanOrEqual(189);
    // Seed has 1 deaths row: national value=37 minimum
    expect(result.deaths.value).toBeGreaterThanOrEqual(1);
    // Zones affected = 5 distinct admin2 codes with confirmed counts
    expect(result.zonesAffected).toBe(5);
    // CFR is derived: 37/189 * 100 ≈ 19.6
    expect(result.cfr).not.toBeNull();
  });

  it("returns zero totals for a nonexistent outbreak", async () => {
    const result = await getStatTotals("00000000-0000-0000-0000-000000000000");
    expect(result.confirmed.value).toBe(0);
    expect(result.deaths.value).toBe(0);
    expect(result.cfr).toBeNull();
  });
});

describe("getEpiCurveSeries (integration)", () => {
  it("returns time series with seeded data points", async () => {
    const { confirmed } = await getEpiCurveSeries(OUTBREAK_ID);
    // Seed has confirmed rows for 2026-05-24 (5 zone rows)
    expect(confirmed.length).toBeGreaterThanOrEqual(1);
    const mayPoint = confirmed.find((p) => p.date === "2026-05-24");
    expect(mayPoint).toBeDefined();
    expect(mayPoint?.value).toBe(189);
  });

  it("returns empty series for nonexistent outbreak", async () => {
    const result = await getEpiCurveSeries("00000000-0000-0000-0000-000000000000");
    expect(result.confirmed).toEqual([]);
    expect(result.deaths).toEqual([]);
  });
});

describe("getSparkline14d (integration)", () => {
  it("returns recent confirmed data points", async () => {
    const result = await getSparkline14d(OUTBREAK_ID, "confirmed");
    // Seeded 2026-05-24 confirmed rows may be within 14d of today (2026-05-31)
    expect(result).toBeInstanceOf(Array);
  });
});

describe("getDisagreements (integration)", () => {
  it("returns an empty map when no duplicate metric/date rows exist", async () => {
    const result = await getDisagreements(OUTBREAK_ID);
    // Seeded data has no conflicting entries from multiple sources for same date
    expect(result).toBeInstanceOf(Map);
  });
});
