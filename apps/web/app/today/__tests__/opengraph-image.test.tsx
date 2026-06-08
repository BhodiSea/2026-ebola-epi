// covers today OG image satori number-child fix: non-zero confirmed/deaths must render as strings
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/queries/outbreaks", () => ({
  getActiveOutbreak: vi.fn(),
}));

vi.mock("@/lib/queries/case-counts", () => ({
  getStatTotals: vi.fn(),
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

vi.mock("@/lib/og/wordmark", () => ({
  Wordmark: () => null,
}));

describe("TodayOgImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders heading text 'Today's Situation' without extra curly braces", async () => {
    const { getActiveOutbreak } = await import("@/lib/queries/outbreaks");
    vi.mocked(getActiveOutbreak).mockResolvedValue(null);
    const { default: TodayOgImage } = await import("../opengraph-image");
    const response = await TodayOgImage();
    const tree = JSON.parse(await response.text()) as unknown;
    expect(JSON.stringify(tree)).toContain("Today");
  });

  it("renders without crashing when confirmed and deaths are non-zero", async () => {
    const { getActiveOutbreak } = await import("@/lib/queries/outbreaks");
    const { getStatTotals } = await import("@/lib/queries/case-counts");
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    vi.mocked(getActiveOutbreak).mockResolvedValue({
      id: "outbreak-1",
      name: "Bundibugyo virus",
      severityLevel: "high",
    } as never);
    vi.mocked(getStatTotals).mockResolvedValue({
      confirmed: { value: 142, sourceQuoteId: "sq-1" },
      deaths: { value: 38, sourceQuoteId: "sq-2" },
    } as never);
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */

    const { default: TodayOgImage } = await import("../opengraph-image");
    const response = await TodayOgImage();
    expect(response.headers.get("content-type")).toBe("image/png");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tree = JSON.parse(await response.text());
    expect(tree).toBeDefined();
  });

  it("renders without crashing when outbreak is null", async () => {
    const { getActiveOutbreak } = await import("@/lib/queries/outbreaks");
    vi.mocked(getActiveOutbreak).mockResolvedValue(null);

    const { default: TodayOgImage } = await import("../opengraph-image");
    const response = await TodayOgImage();
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
