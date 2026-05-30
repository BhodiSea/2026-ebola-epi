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

const { mockDailyQuery, mockOutliersQuery, mockRunsQuery } = vi.hoisted(() => ({
  mockDailyQuery: makeQuery(),
  mockOutliersQuery: makeQuery(),
  mockRunsQuery: makeQuery(),
}));

vi.mock("@/components/internal/cost-daily-area", () => ({
  CostDailyArea: vi.fn(() => null),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// BFS over a React element tree; returns the first node whose .type === target
function findReactElement(
  root: unknown,
  target: unknown,
): null | { props: Record<string, unknown> } {
  const queue: unknown[] = [root];
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === null || typeof node !== "object") {
      continue;
    }
    const el = node as { props?: { children?: unknown }; type?: unknown };
    if (el.type === target) {
      return el as { props: Record<string, unknown> };
    }
    const kids = el.props?.children;
    // Array.isArray narrows to any[] by TS design; cast is safe — we verified it's an array
    queue.push(...(Array.isArray(kids) ? (kids as unknown[]) : [kids]));
  }
  return null;
}

describe("/internal/cost page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    mockDailyQuery.select.mockReturnValue(mockDailyQuery);
    mockDailyQuery.gte.mockReturnValue(mockDailyQuery);
    mockDailyQuery.order.mockReturnValue(mockDailyQuery);
    mockDailyQuery.limit.mockResolvedValue({ count: 0, data: [], error: null });

    mockOutliersQuery.select.mockReturnValue(mockOutliersQuery);
    mockOutliersQuery.order.mockReturnValue(mockOutliersQuery);
    mockOutliersQuery.limit.mockResolvedValue({ count: 0, data: [], error: null });

    mockRunsQuery.select.mockReturnValue(mockRunsQuery);
    mockRunsQuery.gte.mockReturnValue(mockRunsQuery);
    mockRunsQuery.limit.mockResolvedValue({ count: 0, data: null, error: null });

    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "anthropic_usage_daily") {
          return mockDailyQuery;
        }
        if (table === "anthropic_usage_log") {
          return mockOutliersQuery;
        }
        return mockRunsQuery;
      }),
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

  it("applies a 30-day gte filter on anthropic_usage_daily", async () => {
    const { default: CostPage } = await import("../cost/page");
    await CostPage();
    expect(mockDailyQuery.gte).toHaveBeenCalledWith("day", expect.any(String));
  });

  it("queries extraction_runs for run count", async () => {
    const { default: CostPage } = await import("../cost/page");
    await CostPage();
    expect(mockRunsQuery.select).toHaveBeenCalled();
  });

  it("passes all view rows to the chart component (no truncation)", async () => {
    const multiModelRows = [
      { day: "2026-05-01", model_id: "claude-sonnet-4-6", total_cost: "0.020000" },
      { day: "2026-05-01", model_id: "claude-haiku-4-5", total_cost: "0.005000" },
      { day: "2026-05-02", model_id: "claude-sonnet-4-6", total_cost: "0.030000" },
    ];
    mockDailyQuery.limit.mockResolvedValue({ count: 0, data: multiModelRows, error: null });

    const { CostDailyArea } = await import("@/components/internal/cost-daily-area");
    const { default: CostPage } = await import("../cost/page");
    const result = await CostPage();

    const chartEl = findReactElement(result, CostDailyArea);
    expect(chartEl).not.toBeNull();
    expect(chartEl?.props.data).toEqual(multiModelRows);
  });
});
