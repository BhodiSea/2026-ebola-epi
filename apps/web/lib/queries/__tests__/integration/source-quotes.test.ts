import { SourceQuoteId } from "@ituri/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getCustodyForQuote } from "@/lib/queries/source-quotes";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

// Seeded quote1: doc1, chars 0-27, "189 confirmed and 37 deaths"
const QUOTE_ID = SourceQuoteId.parse("a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
// f0... UUID: version=4 (third group starts with 4), variant=8 (fourth group starts with 8)
const MISSING_ID = SourceQuoteId.parse("f0000000-0000-4000-8000-000000000001");

afterEach(resetFixtures);

describe("getCustodyForQuote (integration)", () => {
  it("returns custody data for the seeded quote (linked to extraction run)", async () => {
    // The seeded quote1 is linked to extraction run f0ee..., so the quote_custody
    // view returns a computed custody record derived from the extraction run.
    const result = await getCustodyForQuote(QUOTE_ID);
    expect(result).not.toBeNull();
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- vitest expect.any() returns any-typed internal matchers */
    expect(result).toMatchObject({
      anomalyOpen: expect.any(Boolean),
      confidence: expect.any(Number),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it("returns null for a nonexistent quote id", async () => {
    const result = await getCustodyForQuote(MISSING_ID);
    expect(result).toBeNull();
  });
});
