import { describe, expect, it, vi } from "vitest";

import { getSourceBySlug, listSources } from "../sources";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

const BASE_ROW = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  slug: "who-don",
  name: "WHO Disease Outbreak News",
  url: "https://www.who.int/emergencies/disease-outbreak-news",
  trust_score: "1.00",
  license_tier: "open",
  license_url: null,
  attribution_required: false,
  posture_terms:
    "WHO DON reports are published under the WHO Copyright Policy, which allows free reproduction with attribution for non-commercial purposes.",
  posture_attribution: "© World Health Organization",
  metadata: {},
  created_at: "2026-05-27T15:03:00Z",
  last_fetch: null,
  doc_count: 0,
};

describe("listSources", () => {
  it("maps posture_terms and posture_attribution onto returned Source", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "sources") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [BASE_ROW] }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      };
    });

    const result = await listSources();
    expect(result).toHaveLength(1);
    expect(result[0]!.postureTerms).toContain("WHO Copyright Policy");
    expect(result[0]!.postureAttribution).toBe("© World Health Organization");
  });

  it("returns empty array when data is null", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null }),
    }));

    expect(await listSources()).toEqual([]);
  });

  it("returns empty array when row fails zod parse (missing posture_terms)", async () => {
    const badRow = Object.fromEntries(
      Object.entries(BASE_ROW).filter(([k]) => k !== "posture_terms"),
    );
    mockFrom.mockImplementation((table: string) => {
      if (table === "sources") {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [badRow] }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [] }),
      };
    });

    expect(await listSources()).toEqual([]);
  });
});

describe("getSourceBySlug", () => {
  it("maps posture_terms and posture_attribution onto returned Source", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "sources") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: BASE_ROW, count: 1 }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], count: 0 }),
      };
    });

    const result = await getSourceBySlug("who-don");
    expect(result).not.toBeNull();
    expect(result!.postureTerms).toContain("WHO Copyright Policy");
    expect(result!.postureAttribution).toBe("© World Health Organization");
  });

  it("returns null when slug not found", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }));

    expect(await getSourceBySlug("nonexistent")).toBeNull();
  });
});
