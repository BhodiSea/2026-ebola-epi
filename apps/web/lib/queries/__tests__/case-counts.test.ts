import { describe, expect, it, vi } from "vitest";

import { getDisagreements, getEpiCurveSeries } from "../case-counts";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom, rpc: mockRpc }),
}));

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

const ROW_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ROW_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const Q2 = "22222222-2222-4222-8222-222222222222";

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
