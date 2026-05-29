import { describe, expect, it, vi } from "vitest";

import { GET } from "../route";
import { getZoneTotalsAsOf } from "@/lib/queries/zone-detail";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/queries/zone-detail", () => ({
  getZoneTotalsAsOf: vi.fn(),
}));

const OUTBREAK = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

function req(qs: string) {
  return new Request(`http://localhost:3000/api/zone-totals${qs}`);
}

describe("GET /api/zone-totals", () => {
  it("returns 400 when outbreak_id is missing/invalid", async () => {
    const res = await GET(req("?as_of=2026-05-08"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a malformed as_of date", async () => {
    const res = await GET(req(`?outbreak_id=${OUTBREAK}&as_of=last-week`));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a well-formatted but impossible as_of date", async () => {
    const res = await GET(req(`?outbreak_id=${OUTBREAK}&as_of=2026-13-45`));
    expect(res.status).toBe(400);
  });

  it("returns per-zone cumulative totals as JSON", async () => {
    vi.mocked(getZoneTotalsAsOf).mockResolvedValue({ "COD-IT-BU": 50, "COD-IT-DJ": 12 });
    const res = await GET(req(`?outbreak_id=${OUTBREAK}&as_of=2026-05-08`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ "COD-IT-BU": 50, "COD-IT-DJ": 12 });
    expect(getZoneTotalsAsOf).toHaveBeenCalledWith(OUTBREAK, "2026-05-08");
  });
});
