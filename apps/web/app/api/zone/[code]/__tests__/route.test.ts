import { describe, expect, it, vi } from "vitest";

import { GET } from "../route";
import { getDocumentsForZone } from "@/lib/queries/documents";
import { getSourceQuoteById } from "@/lib/queries/source-quotes";
import { getZoneEpiSeries, getZoneRawRows, getZoneStatTotals } from "@/lib/queries/zone-detail";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/zone-detail", () => ({
  getZoneStatTotals: vi.fn(),
  getZoneEpiSeries: vi.fn(),
  getZoneRawRows: vi.fn(),
}));
vi.mock("@/lib/queries/documents", () => ({
  getDocumentsForZone: vi.fn(),
}));
vi.mock("@/lib/queries/source-quotes", () => ({
  getSourceQuoteById: vi.fn(),
}));

const OUTBREAK = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
const QID = "11111111-1111-4111-8111-111111111111";

function ctx(code: string) {
  return { params: Promise.resolve({ code }) };
}
function req(code: string, qs: string) {
  return new Request(`http://localhost:3000/api/zone/${code}${qs}`);
}

function seedQueries() {
  vi.mocked(getZoneStatTotals).mockResolvedValue({
    confirmed: { value: 50, quoteId: QID },
    deaths: { value: 5, quoteId: null },
    cfr: 10,
    firstDetected: { value: "2026-05-01", quoteId: QID },
  });
  vi.mocked(getZoneEpiSeries).mockResolvedValue({
    confirmed: [{ date: "2026-05-01", value: 50 }],
    deaths: [{ date: "2026-05-01", value: 5 }],
  });
  vi.mocked(getZoneRawRows).mockResolvedValue([
    { metric: "confirmed", value: 50, asOf: "2026-05-01", status: "published", sourceQuoteId: QID },
  ]);
  vi.mocked(getDocumentsForZone).mockResolvedValue([
    {
      id: "doc-1",
      title: "WHO DON 2026",
      url: "https://who.int/don",
      publishedAt: "2026-05-02",
      ingestedAt: "2026-05-03",
      source: {
        id: "s1",
        slug: "who-don",
        name: "WHO DON",
        trustScore: 0.99,
        licenseTier: "open",
      },
    },
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- SourceQuote return type has deep generics; cast required for vitest mock literal
  vi.mocked(getSourceQuoteById).mockResolvedValue({
    id: QID,
    quote_text: "50 confirmed cases",
    char_start: 10,
    char_end: 28,
    created_at: "2026-05-02T00:00:00Z",
    document: {
      id: "doc-1",
      url: "https://who.int/don",
      published_at: "2026-05-02",
      source: { name: "WHO DON", slug: "who-don", license_tier: "open" },
    },
  } as never);
}

describe("GET /api/zone/[code]", () => {
  it("returns 400 when outbreak_id is missing/invalid", async () => {
    seedQueries();
    const res = await GET(req("COD-IT-BU", ""), ctx("COD-IT-BU"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid window value", async () => {
    seedQueries();
    const res = await GET(req("COD-IT-BU", `?outbreak_id=${OUTBREAK}&window=2y`), ctx("COD-IT-BU"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed zone code", async () => {
    seedQueries();
    const res = await GET(req("bad code!", `?outbreak_id=${OUTBREAK}`), ctx("bad code!"));
    expect(res.status).toBe(400);
  });

  it("returns 200 with per-zone totals, series, documents, and resolved provenance", async () => {
    seedQueries();
    const res = await GET(
      req("COD-IT-BU", `?outbreak_id=${OUTBREAK}&window=all`),
      ctx("COD-IT-BU"),
    );
    expect(res.status).toBe(200);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any; member accesses within expect() assertions on JSON response body */
    const body = await res.json();
    expect(body.totals.confirmed.value).toBe(50);
    expect(body.totals.confirmed.quote).not.toBeNull();
    expect(body.totals.confirmed.quote.sourceName).toBe("WHO DON");
    expect(body.totals.deaths.quote).toBeNull();
    expect(body.totals.cfr).toBe(10);
    // firstDetected is a factual figure → must carry resolved provenance (hard rule #2)
    expect(body.totals.firstDetected.value).toBe("2026-05-01");
    expect(body.totals.firstDetected.quote).not.toBeNull();
    expect(body.series.confirmed).toHaveLength(1);
    expect(body.documents).toHaveLength(1);
    expect(body.sourceCount).toBe(1);
    expect(body.rawRows[0].sourceQuoteId).toBe(QID);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });
});
