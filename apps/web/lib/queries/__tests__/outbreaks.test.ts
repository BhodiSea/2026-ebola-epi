// Lint-clean refactor: fixing deprecated z.uuid(), naming conventions, unnecessary conditions, and unused disable directives.
import { describe, expect, it, vi } from "vitest";

import { getActiveOutbreak, getOutbreakBySlug, listOutbreaks, listPathogens } from "../outbreaks";

// Must mock server-only and Supabase client before importing the module under test.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase,
}));

const SEEDED_OUTBREAK = {
  id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01",
  pathogen_icd11: "1D60.00",
  pathogen_slug: "bundibugyo",
  country_iso3: "COD",
  onset_date: "2026-04-20",
  name: "Bundibugyo virus disease — Ituri Province, DRC",
  status: "active",
  severity_level: "emergency",
  created_at: "2026-04-20T00:00:00Z",
};

interface ReturnVal {
  data: unknown;
  error: unknown;
}

// Non-async so it returns the chain directly (not wrapped in an extra Promise).
// Object.assign onto Promise.resolve makes the chain thenable for `await query` patterns.
function buildChain(returnValue: ReturnVal) {
  const methods = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
  };
  return Object.assign(Promise.resolve(returnValue), methods);
}

describe("getOutbreakBySlug", () => {
  it("returns a parsed outbreak when the DB returns a row", async () => {
    mockFrom.mockReturnValue(buildChain({ data: SEEDED_OUTBREAK, error: null }));
    const result = await getOutbreakBySlug("bundibugyo", "COD", "2026-04-20");
    expect(result).not.toBeNull();
    expect(result?.pathogenSlug).toBe("bundibugyo");
    expect(result?.countryIso3).toBe("COD");
    expect(result?.severityLevel).toBe("emergency");
  });

  it("returns null when the DB returns no row", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getOutbreakBySlug("unknown", "COD", "2026-04-20");
    expect(result).toBeNull();
  });

  it("returns null when the DB returns an error", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: { message: "db error" } }));
    const result = await getOutbreakBySlug("bundibugyo", "COD", "2026-04-20");
    expect(result).toBeNull();
  });
});

describe("getActiveOutbreak", () => {
  it("returns the most-severe active outbreak", async () => {
    // Single query now returns array; severity ordering done client-side.
    mockFrom.mockReturnValue(buildChain({ data: [SEEDED_OUTBREAK], error: null }));
    const result = await getActiveOutbreak();
    expect(result?.status).toBe("active");
    expect(result?.severityLevel).toBe("emergency");
  });

  it("prefers emergency over alert when both exist", async () => {
    const alertOutbreak = {
      ...SEEDED_OUTBREAK,
      id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02",
      severity_level: "alert",
    };
    mockFrom.mockReturnValue(buildChain({ data: [alertOutbreak, SEEDED_OUTBREAK], error: null }));
    const result = await getActiveOutbreak();
    expect(result?.severityLevel).toBe("emergency");
  });

  it("returns null when no active outbreak exists", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));
    const result = await getActiveOutbreak();
    expect(result).toBeNull();
  });

  it("returns null when DB returns an empty array", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));
    const result = await getActiveOutbreak();
    expect(result).toBeNull();
  });
});

describe("listOutbreaks", () => {
  it("returns an array of outbreaks", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [SEEDED_OUTBREAK], error: null }));
    const result = await listOutbreaks({});
    expect(result).toHaveLength(1);
  });

  it("returns empty array on DB error", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: { message: "connection failed" } }));
    const result = await listOutbreaks({});
    expect(result).toEqual([]);
  });
});

describe("listPathogens", () => {
  it("returns distinct pathogen slugs", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ pathogen_slug: "bundibugyo", pathogen_icd11: "1D60.00" }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listPathogens();
    expect(result).toHaveLength(1);
    expect(result[0]?.pathogenSlug).toBe("bundibugyo");
    expect(result[0]?.pathogenIcd11).toBe("1D60.00");
  });

  it("returns empty array on error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: "oops" } }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await listPathogens();
    expect(result).toEqual([]);
  });
});
