import { describe, expect, it, vi } from "vitest";

import { listSourcesWithHealth } from "../sources-with-health";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

function chain(returnValue: { data: unknown; error: unknown }) {
  const m = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
  };
  return Object.assign(Promise.resolve(returnValue), m);
}

const ROW = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  slug: "who-don",
  name: "WHO DON",
  last_fetched_at: "2026-05-01T06:00:00Z",
  parser_version: "1.2.3",
  extraction_paused: false,
  license_tier: "open",
  failure_count_7d: 0,
};

describe("listSourcesWithHealth", () => {
  it("returns parsed rows on success", async () => {
    mockFrom.mockReturnValue(chain({ data: [ROW], error: null }));
    const result = await listSourcesWithHealth();
    expect(result).toHaveLength(1);
    expect(result[0]!.slug).toBe("who-don");
  });

  it("returns empty array on supabase error", async () => {
    mockFrom.mockReturnValue(chain({ data: null, error: { message: "fail" } }));
    expect(await listSourcesWithHealth()).toEqual([]);
  });

  it("queries the sources_with_health view", async () => {
    mockFrom.mockReturnValue(chain({ data: [], error: null }));
    await listSourcesWithHealth();
    expect(mockFrom).toHaveBeenCalledWith("sources_with_health");
  });

  it("returns empty array when row fails zod parse (null on non-null field)", async () => {
    const badRow = { ...ROW, slug: null };
    mockFrom.mockReturnValue(chain({ data: [badRow], error: null }));
    expect(await listSourcesWithHealth()).toEqual([]);
  });

  it("handles null optional fields gracefully", async () => {
    const rowWithNulls = {
      ...ROW,
      last_fetched_at: null,
      parser_version: null,
      failure_count_7d: null,
    };
    mockFrom.mockReturnValue(chain({ data: [rowWithNulls], error: null }));
    const result = await listSourcesWithHealth();
    expect(result).toHaveLength(1);
    expect(result[0]!.lastFetchedAt).toBeNull();
    expect(result[0]!.parserVersion).toBeNull();
    expect(result[0]!.failureCount7d).toBe(0);
  });
});
