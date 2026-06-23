// refactor: extract fetchOutbreakIds; add partitionByComment to sort-modules config
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

function trustRow({
  asOf,
  metric,
  value,
  quoteId,
  trustScore,
}: {
  asOf: string;
  metric: string;
  quoteId: string;
  trustScore: number;
  value: number;
}) {
  return {
    as_of: asOf,
    metric,
    value,
    source_quote_id: quoteId,
    source_quotes: { documents: { sources: { trust_score: trustScore } } },
  };
}

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

  it("picks the highest-trust_score row per date — does NOT sum across sources", async () => {
    const Q2 = "22222222-2222-4222-8222-222222222222";
    mockFrom.mockReturnValue(
      buildChain({
        data: [
          trustRow({
            asOf: "2026-05-08",
            metric: "confirmed",
            value: 150,
            quoteId: Q1,
            trustScore: 0.95,
          }), // high trust → winner
          trustRow({
            asOf: "2026-05-08",
            metric: "confirmed",
            value: 172,
            quoteId: Q2,
            trustScore: 0.8,
          }), // lower trust → dropped
        ],
        error: null,
      }),
    );
    const { confirmed } = await getEpiCurveSeries(OUTBREAK);
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0]?.value).toBe(150);
    expect(confirmed[0]?.quoteId).toBe(Q1);
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

    const result = await getStatTotals(OUTBREAK);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(47);
    expect(result.data.deaths.value).toBe(12);
    expect(result.data.cfr).toBeCloseTo(25.5, 0);
    expect(result.data.confirmed.quoteId).toBe(Q1);
  });

  it("prefers cumulative (null is_new_in_period) over weekly-delta rows at the same as_of", async () => {
    // When a sitrep publishes both a weekly delta (is_new_in_period=true, 258) and a cumulative
    // total (null, 808) at the same as_of, the secondary sort on is_new_in_period (nulls first,
    // ascending) makes the DB return cumulative rows first. pickLatest takes the first match, so
    // 808 wins. This mock reflects that DB-sorted order.
    mockFrom.mockReturnValueOnce(
      buildChain({
        data: [
          { metric: "confirmed", value: 808, as_of: "2026-06-14", source_quote_id: Q1 }, // cumulative
          { metric: "confirmed", value: 258, as_of: "2026-06-14", source_quote_id: Q2 }, // delta
          { metric: "deaths", value: 192, as_of: "2026-06-14", source_quote_id: Q1 },
          { metric: "deaths", value: 91, as_of: "2026-06-14", source_quote_id: Q2 },
        ],
        error: null,
      }),
    );
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    const result = await getStatTotals(OUTBREAK);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(808);
    expect(result.data.deaths.value).toBe(192);
  });

  it("returns rpc-error when data is null", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: null, error: { message: "oops" } }));
    const result = await getStatTotals(OUTBREAK);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("rpc-error");
  });

  it("returns no-rows when there are no published case_counts rows", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    const result = await getStatTotals(OUTBREAK);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("no-rows");
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

    const result = await getInternationalStatTotals("1D60.2");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(428);
    expect(result.data.deaths.value).toBe(160);
    // quoteId comes from the largest-value contributor
    expect(result.data.confirmed.quoteId).toBe(Q1);
    expect(result.data.deaths.quoteId).toBe(Q1);
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

    const result = await getInternationalStatTotals("1D60.2");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(416); // not 796 (416+380)
    expect(result.data.deaths.value).toBe(157);
  });

  it("returns no-rows when no outbreaks found for the pathogen", async () => {
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    const result = await getInternationalStatTotals("1D60.2");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe("no-rows");
  });

  it("prefers cumulative rows over weekly-delta rows when as_of ties across countries", async () => {
    // DRC sitrep publishes both a weekly delta (258) and a cumulative total (808) at 2026-06-14.
    // The secondary sort (is_new_in_period nulls first, ascending) makes cumulative arrive first;
    // sumLatestPerCountry's seen-set takes the first row per (outbreak_id, metric), so 808 wins.
    mockFrom.mockReturnValueOnce(buildChain({ data: [{ id: OUTBREAK_COD }], error: null }));
    mockFrom.mockReturnValueOnce(
      buildChain({
        data: [
          {
            outbreak_id: OUTBREAK_COD,
            metric: "confirmed",
            value: 808,
            as_of: "2026-06-14",
            source_quote_id: Q1,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "confirmed",
            value: 258,
            as_of: "2026-06-14",
            source_quote_id: Q2,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "deaths",
            value: 192,
            as_of: "2026-06-14",
            source_quote_id: Q1,
          },
          {
            outbreak_id: OUTBREAK_COD,
            metric: "deaths",
            value: 91,
            as_of: "2026-06-14",
            source_quote_id: Q2,
          },
        ],
        error: null,
      }),
    );
    mockFrom.mockReturnValueOnce(buildChain({ data: [], error: null }));
    const result = await getInternationalStatTotals("1D60.2");
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.confirmed.value).toBe(808);
    expect(result.data.deaths.value).toBe(192);
  });
});

const ROW_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Refactor pass 4: fix lint errors (optional-chain, jsx-leaked-render, max-params, consistent-type-definitions)
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
          trust_score: 0.95,
        },
        {
          row_id: ROW_B,
          metric: "cases",
          as_of: "2026-05-27",
          value: 108,
          source_slug: "ecdc-cdtr",
          source_quote_id: Q2,
          superseded_by: ROW_A,
          trust_score: 0.8,
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
    expect(entries.find((e) => e.sourceSlug === "who-don")?.trustScore).toBe(0.95);
    expect(entries.find((e) => e.sourceSlug === "ecdc-cdtr")?.superseded).toBe(true);
    expect(entries.find((e) => e.sourceSlug === "ecdc-cdtr")?.trustScore).toBe(0.8);
  });

  it("returns an empty map when the RPC returns no rows", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const map = await getDisagreements(OUTBREAK);
    expect(map.size).toBe(0);
  });
});
