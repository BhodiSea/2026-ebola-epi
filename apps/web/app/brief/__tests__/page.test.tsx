import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("/brief/[date] page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as never);
  });

  it("exports a default async function", async () => {
    const mod = await import("../[date]/page");
    expect(typeof mod.default).toBe("function");
  });

  it("exports generateStaticParams", async () => {
    const mod = await import("../[date]/page");
    expect(typeof mod.generateStaticParams).toBe("function");
  });

  it("calls notFound when brief is missing", async () => {
    const { default: Page } = await import("../[date]/page");
    await expect(Page({ params: Promise.resolve({ date: "2026-05-29" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });
});
