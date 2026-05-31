import { SourceQuoteId } from "@ituri/shared";
import { describe, expect, it, vi } from "vitest";

import { getCustodyForQuote } from "../source-quotes";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => mockSupabase,
}));

const QUOTE_ID = SourceQuoteId.parse("a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");

const CUSTODY_ROW = {
  quote_id: QUOTE_ID,
  reviewed_at: "2026-05-24T13:05:00Z",
  anomaly_open: false,
  confidence: 1,
};

describe("getCustodyForQuote", () => {
  it("returns parsed custody data when the DB returns a row", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: CUSTODY_ROW, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await getCustodyForQuote(QUOTE_ID);
    expect(result).not.toBeNull();
    expect(result?.reviewedAt).toBe("2026-05-24T13:05:00Z");
    expect(result?.anomalyOpen).toBe(false);
    expect(result?.confidence).toBe(1);
  });

  it("returns null when no row found", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await getCustodyForQuote(QUOTE_ID);
    expect(result).toBeNull();
  });

  it("returns null on DB error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: "oops" } }),
    };
    mockFrom.mockReturnValue(chain);
    const result = await getCustodyForQuote(QUOTE_ID);
    expect(result).toBeNull();
  });
});
