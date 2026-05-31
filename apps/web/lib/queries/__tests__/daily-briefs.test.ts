import { describe, expect, it, vi } from "vitest";

import { getDailyBriefByDate, listPublishedBriefs } from "../daily-briefs";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase,
}));

const SEEDED_BRIEF = {
  date: "2026-05-28",
  headline: "Bundibugyo virus disease — Ituri Province, DRC",
  body: "As of 28 May 2026…",
  severity: "emergency",
  model_id: "editor",
  review_status: "published",
  source_quote_ids: ["a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01"],
};

function buildChain(returnValue: { data: unknown; error: unknown }) {
  const methods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
  };
  return Object.assign(Promise.resolve(returnValue), methods);
}

describe("getDailyBriefByDate", () => {
  it("returns a parsed brief when the DB returns a row", async () => {
    mockFrom.mockReturnValue(buildChain({ data: SEEDED_BRIEF, error: null }));
    const result = await getDailyBriefByDate("2026-05-28");
    expect(result).not.toBeNull();
    expect(result?.date).toBe("2026-05-28");
    expect(result?.modelId).toBe("editor");
    expect(result?.reviewStatus).toBe("published");
    expect(result?.severity).toBe("emergency");
  });

  it("returns null when the DB returns no row", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getDailyBriefByDate("2020-01-01");
    expect(result).toBeNull();
  });

  it("returns null on DB error", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: { message: "not found" } }));
    const result = await getDailyBriefByDate("2026-05-28");
    expect(result).toBeNull();
  });
});

describe("listPublishedBriefs", () => {
  it("returns an array of date strings", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ date: "2026-05-28" }], error: null }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listPublishedBriefs();
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toBe("2026-05-28");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "oops" } }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listPublishedBriefs();
    expect(result).toEqual([]);
  });
});
