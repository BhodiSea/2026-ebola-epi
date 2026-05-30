import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function makeQuery() {
  const q = {
    gte: vi.fn(),
    limit: vi.fn<() => Promise<{ count: number; data: null | unknown[]; error: null }>>(),
    order: vi.fn(),
    select: vi.fn(),
  };
  q.select.mockReturnValue(q);
  q.gte.mockReturnValue(q);
  q.order.mockReturnValue(q);
  q.limit.mockResolvedValue({ count: 0, data: [], error: null });
  return q;
}

const { mockUsageQuery, mockRunsQuery } = vi.hoisted(() => {
  return { mockUsageQuery: makeQuery(), mockRunsQuery: makeQuery() };
});

vi.mock("@/components/internal/cost-daily-area", () => ({
  CostDailyArea: vi.fn(() => null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/internal/cost page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    mockUsageQuery.select.mockReturnValue(mockUsageQuery);
    mockUsageQuery.gte.mockReturnValue(mockUsageQuery);
    mockUsageQuery.order.mockReturnValue(mockUsageQuery);
    mockUsageQuery.limit.mockResolvedValue({ count: 0, data: [], error: null });

    mockRunsQuery.select.mockReturnValue(mockRunsQuery);
    mockRunsQuery.gte.mockReturnValue(mockRunsQuery);
    mockRunsQuery.limit.mockResolvedValue({ count: 0, data: null, error: null });

    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) =>
        table === "extraction_runs" ? mockRunsQuery : mockUsageQuery,
      ),
    } as never);
  });

  it("exports a default async function", async () => {
    const mod = await import("../cost/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders without throwing when data is empty", async () => {
    const { default: CostPage } = await import("../cost/page");
    const result = await CostPage();
    expect(result).toBeTruthy();
  });

  it("applies a 30-day gte filter on anthropic_usage_log", async () => {
    const { default: CostPage } = await import("../cost/page");
    await CostPage();
    expect(mockUsageQuery.gte).toHaveBeenCalledWith("logged_at", expect.any(String));
  });

  it("queries extraction_runs for run count", async () => {
    const { default: CostPage } = await import("../cost/page");
    await CostPage();
    expect(mockRunsQuery.select).toHaveBeenCalled();
  });
});
