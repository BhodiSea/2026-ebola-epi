import { describe, expect, it, vi } from "vitest";

import { GET } from "../route";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function makeChain(data: unknown[]) {
  return {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function req(qs: string) {
  return new Request(`http://localhost:3000/api/search${qs}`);
}

describe("GET /api/search", () => {
  it("returns 400 when q is missing", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is a single character", async () => {
    const res = await GET(req("?q=a"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when q exceeds 100 characters", async () => {
    const res = await GET(req(`?q=${"a".repeat(101)}`));
    expect(res.status).toBe(400);
  });

  it("returns 200 with groups for a valid query", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "outbreaks") {
        return makeChain([
          {
            id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
            name: "Ituri BVD 2026",
            pathogen_slug: "bundibugyo-virus",
            country_iso3: "COD",
            onset_date: "2026-04-20",
          },
        ]);
      }
      return makeChain([]);
    });

    const res = await GET(req("?q=ituri"));
    expect(res.status).toBe(200);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any; member accesses within expect() assertions on JSON response body */
    const body = await res.json();
    expect(body.groups).toHaveLength(1);
    expect(body.groups[0].heading).toBe("Outbreaks");
    expect(body.groups[0].items[0].label).toBe("Ituri BVD 2026");
    expect(body.groups[0].items[0].href).toBe("/outbreaks/bundibugyo-virus/cod/2026-04-20");
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });

  it("omits empty groups from the response", async () => {
    mockFrom.mockImplementation(() => makeChain([]));
    const res = await GET(req("?q=who"));
    expect(res.status).toBe(200);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- res.json() returns any; member access within expect() assertion */
    const body = await res.json();
    expect(body.groups).toHaveLength(0);
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
  });

  it("sets public Cache-Control header", async () => {
    mockFrom.mockImplementation(() => makeChain([]));
    const res = await GET(req("?q=ebola"));
    expect(res.headers.get("Cache-Control")).toContain("public");
  });
});
