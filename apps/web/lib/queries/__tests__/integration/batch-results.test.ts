import { afterEach, describe, expect, it, vi } from "vitest";

import { listBatchResults } from "@/lib/queries/batch-results";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listBatchResults (integration)", () => {
  it("returns an empty array when queried as anon (RLS: authenticated-only view)", async () => {
    // public.batch_results is a view over audit.batch_results.
    // anon is revoked: `revoke all on public.batch_results from anon, public`.
    const result = await listBatchResults();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
