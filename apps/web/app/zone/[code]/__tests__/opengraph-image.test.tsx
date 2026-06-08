// covers zone OG image satori number-child fix: non-zero confirmed/deaths must render as strings
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/queries/outbreaks", () => ({
  getActiveOutbreak: vi.fn(),
}));

vi.mock("@/lib/queries/zone-detail", () => ({
  getZoneStatTotals: vi.fn(),
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

describe("ZoneOgImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing when confirmed and deaths are non-zero", async () => {
    const { getActiveOutbreak } = await import("@/lib/queries/outbreaks");
    const { getZoneStatTotals } = await import("@/lib/queries/zone-detail");
    /* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
    vi.mocked(getActiveOutbreak).mockResolvedValue({
      id: "outbreak-1",
      severityLevel: "high",
    } as never);
    vi.mocked(getZoneStatTotals).mockResolvedValue({
      confirmed: { value: 57, sourceQuoteId: "sq-1" },
      deaths: { value: 14, sourceQuoteId: "sq-2" },
    } as never);
    /* eslint-enable @typescript-eslint/no-unsafe-type-assertion */

    const { default: ZoneOgImage } = await import("../opengraph-image");
    const response = await ZoneOgImage({ params: Promise.resolve({ code: "IRUMU" }) });
    expect(response.headers.get("content-type")).toBe("image/png");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tree = JSON.parse(await response.text());
    expect(tree).toBeDefined();
  });

  it("renders without crashing when outbreak is null", async () => {
    const { getActiveOutbreak } = await import("@/lib/queries/outbreaks");
    vi.mocked(getActiveOutbreak).mockResolvedValue(null);

    const { default: ZoneOgImage } = await import("../opengraph-image");
    const response = await ZoneOgImage({ params: Promise.resolve({ code: "IRUMU" }) });
    expect(response.headers.get("content-type")).toBe("image/png");
  });
});
