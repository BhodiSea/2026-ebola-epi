import { describe, expect, it, vi } from "vitest";

import { getCostKpis } from "../cost";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function chain(returnValue: { count?: null | number; data: unknown; error: unknown }) {
  const m = {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), m);
}

const EMPTY = chain({ data: [], error: null });
const NO_RUNS = chain({ data: null, error: null, count: 0 });

describe("getCostKpis", () => {
  it("returns zero KPIs when tables are empty", async () => {
    mockFrom.mockReturnValue(EMPTY);
    const result = await getCostKpis("2026-05-01", "2026-05-31");
    expect(result.total30d).toBe(0);
    expect(result.runCount).toBe(0);
  });

  it("computes total30d from daily rows", async () => {
    const dailyChain = chain({
      data: [
        { day: "2026-05-01", model_id: "sonnet", total_cost: 1.5 },
        { day: "2026-05-02", model_id: "sonnet", total_cost: 2.5 },
      ],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(dailyChain)
      .mockReturnValueOnce(EMPTY)
      .mockReturnValueOnce(NO_RUNS);
    const result = await getCostKpis("2026-05-01", "2026-05-03");
    expect(result.total30d).toBeCloseTo(4);
  });

  it("queries anthropic_usage_daily, anthropic_usage_log, extraction_runs", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null, count: 0 }));
    await getCostKpis("2026-05-01", "2026-05-31");
    const calls = mockFrom.mock.calls.map((c) => c[0]);
    expect(calls).toContain("anthropic_usage_daily");
    expect(calls).toContain("anthropic_usage_log");
    expect(calls).toContain("extraction_runs");
  });
});
