import { beforeEach, describe, expect, it, vi } from "vitest";

import { getLastIngestedAt, listRecentDocuments } from "../documents";

vi.mock("server-only", () => ({}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

interface ReturnVal {
  data: unknown;
  error: unknown;
}

function chainWith(data: unknown, error: unknown = null) {
  const returnVal: ReturnVal = { data, error };
  return Object.assign(Promise.resolve(returnVal), {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnVal),
  });
}

const OUTBREAK = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";
const TS = "2026-06-01T12:00:00Z";
const DOC_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const DOC_ROW = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  title: "WHO DON 2026-06-01",
  url: "https://who.int/don/2026-06-01",
  published_at: "2026-06-01",
  ingested_at: "2026-06-01T12:00:00Z",
  source: {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    slug: "who-don",
    name: "WHO DON",
    trust_score: 0.95,
    license_tier: "open",
  },
};

describe("listRecentDocuments", () => {
  it("returns documents without outbreak filter (simple query)", async () => {
    mockFrom.mockReturnValueOnce(chainWith([DOC_ROW]));
    const result = await listRecentDocuments(5);
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("WHO DON 2026-06-01");
  });

  it("returns [] when DB returns null", async () => {
    mockFrom.mockReturnValueOnce(chainWith(null));
    const result = await listRecentDocuments(5);
    expect(result).toEqual([]);
  });

  it("filters by outbreakId when provided — uses two-step join", async () => {
    // first call: case_counts → source_quotes(document_id)
    mockFrom.mockReturnValueOnce(chainWith([{ source_quote: { document_id: DOC_ROW.id } }]));
    // second call: documents filtered to those IDs
    mockFrom.mockReturnValueOnce(chainWith([DOC_ROW]));
    const result = await listRecentDocuments(5, OUTBREAK);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(DOC_ROW.id);
  });

  it("returns [] when no case_counts exist for the outbreak", async () => {
    mockFrom.mockReturnValueOnce(chainWith([]));
    const result = await listRecentDocuments(5, OUTBREAK);
    expect(result).toEqual([]);
  });
});

describe("getLastIngestedAt", () => {
  it("returns the ingested_at timestamp of the most recently ingested document with case_counts", async () => {
    // first call: case_counts → source_quotes to get document IDs
    mockFrom.mockReturnValueOnce(chainWith([{ source_quote: { document_id: DOC_ID } }]));
    // second call: documents ordered by ingested_at desc, limit 1
    mockFrom.mockReturnValueOnce(chainWith({ ingested_at: TS }));

    const result = await getLastIngestedAt(OUTBREAK);
    expect(result).toBe(TS);
  });

  it("returns null when no published case_counts exist for the outbreak", async () => {
    mockFrom.mockReturnValueOnce(chainWith([]));
    const result = await getLastIngestedAt(OUTBREAK);
    expect(result).toBeNull();
  });

  it("returns null when the DB returns null data on the case_counts query", async () => {
    mockFrom.mockReturnValueOnce(chainWith(null));
    const result = await getLastIngestedAt(OUTBREAK);
    expect(result).toBeNull();
  });
});
