import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getDisagreements,
  getEpiCurveSeries,
  getInternationalStatTotals,
  getStatTotals,
} from "../case-counts";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom, rpc: mockRpc }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

interface ReturnVal {
  data: unknown;
  error: unknown;
}

function buildChain(returnValue: ReturnVal) {
  const methods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), methods);
}

const OUTBREAK = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
const Q1 = "11111111-1111-4111-8111-111111111111";

describe("getEpiCurveSeries", () => {
  it("groups by date and carries a representative source_quote_id per point", async () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          { as_of: "2026-05-01", metric: "confirmed", value: 10, source_quote_id: Q1 },
          { as_of: "2026-05-08", metric: "confirmed", value: 15, source_quote_id: Q1 },
          { as_of: "2026-05-08", metric: "deaths", value: 2, source_quote_id: Q1 },
        ],
        error: null,
      }),
    );
    const { confirmed, deaths } = await getEpiCurveSeries(OUTBREAK);
    expect(confirmed).toEqual([
      { date: "2026-05-01", value: 10, quoteId: Q1 },
      { date: "2026-05-08", value: 15, quoteId: Q1 },
    ]);
    expect(deaths).toEqual([{ date: "2026-05-08", value: 2, quoteId: Q1 }]);
  });
});

const Q2 = "22222222-2222-4222-8222-222222222222";
const Q3 = "33333333-3333-4333-8333-333333333333";

// Verifies national-cumulative-latest aggregation (international totals fix)
describe("getStatTotals", () => {
  it("picks the latest as_of row per metric rather than summing all snapshots", async () => {
    // Rows ordered by as_of desc, as the fixed query does.
    // Under the old (broken) accumulate() code, confirmed = 87 (47+40). Under the fix, confirmed = 47.
    mockFrom.mockReturnValueOnce(
      buildChain({
        data: [
          { metric: "confirmed", value: 47, as_of: "2026-05-15", source_quote_id: Q1 },
          { metric: "confirmed", value: 40, as_of: "2026-05-08", source_quote_id: Q2 },
          { metric: "deaths", value: 12, as_of: "2026-05-15", source_quote_id: Q1 },
        ],
        error: null,
      }),
    );
    // countZonesAffected issues a second from() call
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));

    const totals = await getStatTotals(OUTBREAK);
    expect(totals.confirmed.value).toBe(47);
    expect(totals.deaths.value).toBe(12);
    expect(totals.cfr).toBeCloseTo(25.5, 0);
    expect(totals.confirmed.quoteId).toBe(Q1);
  });

  it("returns zero totals when data is null", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: "oops" } }));
    const totals = await getStatTotals(OUTBREAK);
    expect(totals.confirmed.value).toBe(0);
    expect(totals.deaths.value).toBe(0);
    expect(totals.cfr).toBeNull();
  });
});

const OUTBREAK_COD = "c0d00000-0000-4000-8000-000000000001";
const OUTBREAK_UGA = "uga00000-0000-4000-8000-000000000002";

describe("getInternationalStatTotals", () => {
  it("sums the latest national snapshot for each country in the pathogen cluster", async () => {
    // Call 1: outbreaks table
    mockFrom.mockReturnValueOnce(
      buildChain({ data: [{ id: OUTBREAK_COD }, { id: OUTBREAK_UGA }], error: null }),
    );
    // Call 2: case_counts — one row per (outbreak, metric), ordered by as_of desc
    mockFrom.mockReturnValueOnce(
      buildChain({
        data: [
          {
            outbreak_id: OUTBREAK_COD,
            metric: "confirmed",
            value: 416,
            as_of: "2026-06-01",
            source_quote_id: Q1,
          },
          {
            outbreak_id: OUTBREAK_UGA,
            metric: "confirmed",
            value: 12,
            as_of: "2026-06-01",
            source_quote_id: Q2,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "deaths",
            value: 157,
            as_of: "2026-06-01",
            source_quote_id: Q1,
          },
          {
            outbreak_id: OUTBREAK_UGA,
            metric: "deaths",
            value: 3,
            as_of: "2026-06-01",
            source_quote_id: Q2,
          },
        ],
        error: null,
      }),
    );
    // Call 3: countZonesAffected
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));

    const totals = await getInternationalStatTotals("1D60.2");
    expect(totals.confirmed.value).toBe(428);
    expect(totals.deaths.value).toBe(160);
    // quoteId comes from the largest-value contributor
    expect(totals.confirmed.quoteId).toBe(Q1);
    expect(totals.deaths.quoteId).toBe(Q1);
  });

  it("only takes the latest as_of snapshot per (country, metric), not all historical rows", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: [{ id: OUTBREAK_COD }], error: null }));
    // Two confirmed rows for COD at different dates — only the latest (416) should count
    mockFrom.mockReturnValueOnce(
      buildChain({
        data: [
          {
            outbreak_id: OUTBREAK_COD,
            metric: "confirmed",
            value: 416,
            as_of: "2026-06-01",
            source_quote_id: Q1,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "confirmed",
            value: 380,
            as_of: "2026-05-25",
            source_quote_id: Q3,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "deaths",
            value: 157,
            as_of: "2026-06-01",
            source_quote_id: Q1,
          },
        ],
        error: null,
      }),
    );
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));

    const totals = await getInternationalStatTotals("1D60.2");
    expect(totals.confirmed.value).toBe(416); // not 796 (416+380)
    expect(totals.deaths.value).toBe(157);
  });

  it("returns zero totals when no outbreaks found for the pathogen", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    const totals = await getInternationalStatTotals("1D60.2");
    expect(totals.confirmed.value).toBe(0);
    expect(totals.deaths.value).toBe(0);
    expect(totals.cfr).toBeNull();
  });
});

const ROW_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("getDisagreements", () => {
  it("returns a map keyed by metric:asOf with entries from multiple sources", async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          row_id: ROW_A,
          metric: "cases",
          as_of: "2026-05-27",
          value: 142,
          source_slug: "who-don",
          source_quote_id: Q1,
          superseded_by: null,
        },
        {
          row_id: ROW_B,
          metric: "cases",
          as_of: "2026-05-27",
          value: 108,
          source_slug: "ecdc-cdtr",
          source_quote_id: Q2,
          superseded_by: ROW_A,
        },
      ],
      error: null,
    });
    const map = await getDisagreements(OUTBREAK);
    const key = "cases:2026-05-27";
    expect(map.has(key)).toBe(true);
    const entries = map.get(key)!;
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.sourceSlug === "who-don")?.value).toBe(142);
    expect(entries.find((e) => e.sourceSlug === "ecdc-cdtr")?.superseded).toBe(true);
  });

  it("returns an empty map when the RPC returns no rows", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const map = await getDisagreements(OUTBREAK);
    expect(map.size).toBe(0);
  });
});
