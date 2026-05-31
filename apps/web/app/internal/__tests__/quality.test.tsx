import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function makeClientMock(data: unknown[]) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Supabase SupabaseClient<Database> generics too deep for vitest mock literal
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data, error: null }),
        }),
      }),
    }),
  } as never;
}

describe("/internal/quality page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(makeClientMock([]));
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

  it("renders KPI tiles with computed averages when eval rows exist", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValue(
      makeClientMock([
        {
          run_id: "aaaaaaaa-0000-0000-0000-000000000001",
          metric: "f1",
          score: 0.95,
          source_slug: "bundibugyo-ituri-2026-04-20",
          evaluated_at: "2026-05-31T00:00:00Z",
        },
        {
          run_id: "aaaaaaaa-0000-0000-0000-000000000002",
          metric: "precision",
          score: 0.9,
          source_slug: "bundibugyo-ituri-2026-04-20",
          evaluated_at: "2026-05-31T00:00:00Z",
        },
      ]),
    );
    const { default: Page } = await import("../quality/page");
    const html = renderToStaticMarkup(await Page());
    expect(html).not.toContain("No eval data yet.");
    expect(html).toContain("0.950");
    expect(html).toContain("0.900");
    expect(html).toContain("bundibugyo-ituri-2026-04-20");
  });
});
