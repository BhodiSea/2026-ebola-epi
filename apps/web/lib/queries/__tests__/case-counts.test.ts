import { describe, expect, it, vi } from "vitest";

import { getEpiCurveSeries } from "../case-counts";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
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
