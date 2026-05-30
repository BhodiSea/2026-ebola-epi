import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/internal/audit page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          }),
        }),
      }),
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
});
