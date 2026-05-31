import { afterEach, describe, expect, it, vi } from "vitest";

import { listShadowResults } from "@/lib/queries/shadow-results";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listShadowResults (integration)", () => {
  it("returns an empty array when queried as anon (RLS: authenticated-only view)", async () => {
    // public.shadow_results is a view over audit.shadow_results.
    // anon is revoked: `revoke all on public.shadow_results from anon, public`.
    const result = await listShadowResults();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
