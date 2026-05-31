import { afterEach, describe, expect, it, vi } from "vitest";

import { listUnextractedDocuments } from "@/lib/queries/unextracted-documents";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));

afterEach(resetFixtures);

describe("listUnextractedDocuments (integration)", () => {
  it("returns documents without extraction runs (uses Drizzle, bypasses RLS)", async () => {
    // Seed: doc1 (e0..01) HAS an extraction run; doc2 (e1..01) and doc3 (e2..01) do NOT.
    // Drizzle connects via POSTGRES_URL_NON_POOLING (postgres superuser), bypasses RLS.
    const result = await listUnextractedDocuments();
    expect(result.length).toBeGreaterThanOrEqual(2);
    const ids = result.map((d) => d.id);
    expect(ids).toContain("e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
    expect(ids).toContain("e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
    // doc1 has an extraction run and must NOT appear
    expect(ids).not.toContain("e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
  });

  it("respects the limit argument", async () => {
    const result = await listUnextractedDocuments(1);
    expect(result.length).toBeLessThanOrEqual(1);
  });
});
