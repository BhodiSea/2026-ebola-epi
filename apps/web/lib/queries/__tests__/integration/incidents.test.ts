import { afterEach, describe, expect, it, vi } from "vitest";

import { listIncidents } from "@/lib/queries/incidents";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listIncidents (integration)", () => {
  it("returns an empty array when queried as anon (RLS: authenticated-only)", async () => {
    // public.incidents: anon SELECT is blocked by RLS policy "incidents_select_authenticated".
    // This verifies the table exists, the query shape is correct, and RLS denies anon.
    const result = await listIncidents();
    expect(result).toBeInstanceOf(Array);
    expect(result).toEqual([]);
  });
});
