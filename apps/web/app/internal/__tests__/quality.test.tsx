import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/internal/quality page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    } as never);
  });

  it("exports a default async function", async () => {
    const mod = await import("../quality/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders without throwing when data is empty", async () => {
    const { default: Page } = await import("../quality/page");
    const result = await Page();
    expect(result).toBeTruthy();
  });
});
