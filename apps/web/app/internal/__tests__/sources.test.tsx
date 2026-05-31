import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/actions/client", () => ({
  internalAction: {
    inputSchema: vi.fn(() => ({ action: vi.fn((h: unknown) => h) })),
  },
}));

vi.mock("@/app/internal/sources/actions", () => ({
  toggleSourcePauseAction: vi.fn(),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(() => ({ execute: vi.fn(), isPending: false })),
}));

describe("/internal/sources page", () => {
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const chainObj = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom = vi.fn().mockReturnValue(chainObj);
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as never);
  });

  it("exports a default async function", async () => {
    const mod = await import("../sources/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders without throwing when data is empty", async () => {
    const { default: Page } = await import("../sources/page");
    const result = await Page();
    expect(result).toBeTruthy();
  });

  it("reads from sources_with_health view, not the bare sources table", async () => {
    const { default: Page } = await import("../sources/page");
    await Page();
    expect(mockFrom).toHaveBeenCalledWith("sources_with_health");
    expect(mockFrom).not.toHaveBeenCalledWith("sources");
  });
});
