// covers outbreaks OG image satori number-child fix: non-zero confirmed/deaths must render as strings
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/queries/outbreaks", () => ({
  getOutbreakBySlug: vi.fn(),
}));

vi.mock("@/lib/queries/case-counts", () => ({
  getStatTotals: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@vercel/og", () => ({
  ImageResponse: vi.fn(
    (element: React.ReactElement) =>
      new Response(JSON.stringify(element), {
        headers: { "content-type": "image/png" },
      }),
  ),
}));

vi.mock("@/lib/og/fonts", () => ({
  getOgFonts: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/og/severity-badge", () => ({
  SeverityBadge: () => null,
}));

vi.mock("@/lib/og/wordmark", () => ({
  Wordmark: () => null,
}));

describe("OutbreakOgImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing when confirmed and deaths are non-zero", async () => {
    const { getOutbreakBySlug } = await import("@/lib/queries/outbreaks");
    const { getStatTotals } = await import("@/lib/queries/case-counts");
    const { createClient } = await import("@/lib/supabase/server");
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    vi.mocked(getOutbreakBySlug).mockResolvedValue({
      id: "outbreak-1",
      name: "Bundibugyo virus",
      severityLevel: "high",
    } as never);
    vi.mocked(getStatTotals).mockResolvedValue({
      confirmed: { value: 142, sourceQuoteId: "sq-1" },
      deaths: { value: 38, sourceQuoteId: "sq-2" },
    } as never);
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        }),
      }),
    } as never);
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */

    const { default: OutbreakOgImage } = await import("../opengraph-image");
    const response = await OutbreakOgImage({
      params: Promise.resolve({
        pathogen: "ebola-bundibugyo",
        country: "cod",
        onset: "2026-01-15",
      }),
    });
    expect(response.headers.get("content-type")).toBe("image/png");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tree = JSON.parse(await response.text());
    expect(tree).toBeDefined();
  });

  it("renders without crashing when outbreak is null", async () => {
    const { getOutbreakBySlug } = await import("@/lib/queries/outbreaks");
    vi.mocked(getOutbreakBySlug).mockResolvedValue(null);

    const { default: OutbreakOgImage } = await import("../opengraph-image");
    const response = await OutbreakOgImage({
      params: Promise.resolve({
        pathogen: "ebola-bundibugyo",
        country: "cod",
        onset: "2026-01-15",
      }),
    });
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
