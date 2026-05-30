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

vi.mock("@/app/internal/escalations/actions", () => ({
  ackIncidentAction: vi.fn(),
}));

vi.mock("next-safe-action/hooks", () => ({
  useAction: vi.fn(() => ({ execute: vi.fn(), isPending: false })),
}));

describe("/internal/escalations page", () => {
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
    const mod = await import("../escalations/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders without throwing when data is empty", async () => {
    const { default: Page } = await import("../escalations/page");
    const result = await Page();
    expect(result).toBeTruthy();
  });
});
