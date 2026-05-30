import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockQuery = vi.hoisted(() => {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn<() => Promise<{ data: unknown[]; error: null }>>(),
  };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  q.order.mockReturnValue(q);
  q.range.mockResolvedValue({ data: [], error: null });
  return q;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/internal/audit page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockQuery.select.mockReturnValue(mockQuery);
    mockQuery.eq.mockReturnValue(mockQuery);
    mockQuery.order.mockReturnValue(mockQuery);
    mockQuery.range.mockResolvedValue({ data: [], error: null });

    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQuery),
    } as never);
  });

  it("exports a default async function", async () => {
    const mod = await import("../audit/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders without throwing when data is empty", async () => {
    const { default: Page } = await import("../audit/page");
    const result = await Page({ searchParams: Promise.resolve({}) });
    expect(result).toBeTruthy();
  });

  it("applies agent filter when searchParams.agent is set", async () => {
    const { default: Page } = await import("../audit/page");
    await Page({ searchParams: Promise.resolve({ agent: "extractor" }) });
    expect(mockQuery.eq).toHaveBeenCalledWith("agent", "extractor");
  });

  it("applies action filter when searchParams.action is set", async () => {
    const { default: Page } = await import("../audit/page");
    await Page({ searchParams: Promise.resolve({ action: "extract_figures" }) });
    expect(mockQuery.eq).toHaveBeenCalledWith("action", "extract_figures");
  });

  it("applies figure filter when searchParams.figure is set", async () => {
    const { default: Page } = await import("../audit/page");
    await Page({ searchParams: Promise.resolve({ figure: "abc123" }) });
    expect(mockQuery.eq).toHaveBeenCalledWith("figure_id", "abc123");
  });

  it("does not call eq when no filter params are set", async () => {
    const { default: Page } = await import("../audit/page");
    await Page({ searchParams: Promise.resolve({}) });
    expect(mockQuery.eq).not.toHaveBeenCalled();
  });
});
