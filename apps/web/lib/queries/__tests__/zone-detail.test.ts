// Refactor pass 3: use EMPTY_ZONE_STAT_TOTALS in zone page to eliminate optional chaining complexity
import { describe, expect, it, vi } from "vitest";

import {
  getZoneEpiSeries,
  getZoneRawRows,
  getZoneStatTotals,
  getZoneTotalsAsOf,
} from "../zone-detail";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

interface ReturnVal {
  data: unknown;
  error: unknown;
}

// Thenable chain: every builder method returns `this`; `await chain` resolves to returnValue.
function buildChain(returnValue: ReturnVal) {
  const methods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), methods);
}

const OUTBREAK = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
const CODE = "COD-IT-BU";
const Q1 = "11111111-1111-4111-8111-111111111111";
const Q2 = "22222222-2222-4222-8222-222222222222";

describe("getZoneTotalsAsOf", () => {
  it("takes the latest confirmed snapshot per zone up to the as_of date (cumulative, not summed)", async () => {
    const chain = buildChain({
      data: [
        { admin2_code: "COD-IT-BU", value: 30, as_of: "2026-05-08" },
        { admin2_code: "COD-IT-BU", value: 20, as_of: "2026-05-01" },
        { admin2_code: "COD-IT-DJ", value: 12, as_of: "2026-05-05" },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const totals = await getZoneTotalsAsOf(OUTBREAK, "2026-05-08");
    // cumulative restatements: latest (05-08) value for BU is 30, NOT 30+20=50
    expect(totals).toEqual({ "COD-IT-BU": 30, "COD-IT-DJ": 12 });
    expect(chain.lte).toHaveBeenCalledWith("as_of", "2026-05-08");
    expect(chain.order).toHaveBeenCalledWith("as_of", { ascending: false });
  });
});

describe("getZoneStatTotals", () => {
  it("takes the latest snapshot per metric (cumulative), derives CFR, keeps earliest as first-detected", async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          { metric: "confirmed", value: 40, as_of: "2026-05-08", source_quote_id: Q1 },
          { metric: "confirmed", value: 10, as_of: "2026-05-01", source_quote_id: Q2 },
          { metric: "deaths", value: 5, as_of: "2026-05-08", source_quote_id: Q1 },
        ],
        error: null,
      }),
    );
    const result = await getZoneStatTotals(OUTBREAK, CODE, "all");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    // latest cumulative confirmed is 40 (05-08), not 40+10=50
    expect(result.data.confirmed.value).toBe(40);
    expect(result.data.confirmed.quoteId).toBe(Q1);
    expect(result.data.deaths.value).toBe(5);
    expect(result.data.cfr).toBe(12.5); // 5/40 = 12.5%
    expect(result.data.firstDetected.value).toBe("2026-05-01");
    // first-detected carries the provenance of the earliest confirmed row (hard rule #2)
    expect(result.data.firstDetected.quoteId).toBe(Q2);
  });

  it("returns no-rows when the zone has no rows", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await getZoneStatTotals(OUTBREAK, CODE, "30d");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("no-rows");
  });
});

describe("getZoneEpiSeries", () => {
  it("groups confirmed and deaths by date", async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          { metric: "confirmed", value: 40, as_of: "2026-05-08" },
          { metric: "deaths", value: 5, as_of: "2026-05-08" },
        ],
        error: null,
      }),
    );
    const { confirmed, deaths } = await getZoneEpiSeries(OUTBREAK, CODE, "all");
    expect(confirmed).toEqual([{ date: "2026-05-08", value: 40 }]);
    expect(deaths).toEqual([{ date: "2026-05-08", value: 5 }]);
  });
});

describe("getZoneRawRows", () => {
  it("maps raw case_counts rows for the zone and restricts to published", async () => {
    const chain = buildChain({
      data: [
        {
          metric: "confirmed",
          value: 40,
          as_of: "2026-05-08",
          status: "published",
          source_quote_id: Q1,
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const rows = await getZoneRawRows(OUTBREAK, CODE);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceQuoteId).toBe(Q1);
    expect(rows[0]?.asOf).toBe("2026-05-08");
    // defense-in-depth: never expose unpublished rows even via the Raw tab
    expect(chain.eq).toHaveBeenCalledWith("status", "published");
    // bounded result set: the Raw tab must not pull a zone's entire published history
    expect(chain.limit).toHaveBeenCalledWith(200);
  });
});
