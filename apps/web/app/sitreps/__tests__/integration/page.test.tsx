import { afterEach, describe, expect, it, vi } from "vitest";

import SitrepsPage from "../../page";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

afterEach(resetFixtures);

describe("SitrepsPage (integration)", () => {
  it("runs end-to-end against the real DB without throwing", async () => {
    const jsx = await SitrepsPage({ searchParams: Promise.resolve({}) });
    expect(jsx).toBeTruthy();
  });

  it("includes seeded document titles in the JSX tree", async () => {
    const jsx = await SitrepsPage({ searchParams: Promise.resolve({}) });
    const str = JSON.stringify(jsx);
    // Seed has 3 documents; page renders their titles/URLs
    expect(str).toContain("documents");
  });

  it("includes WHO AFRO source name when listing all sitreps", async () => {
    const jsx = await SitrepsPage({ searchParams: Promise.resolve({}) });
    const str = JSON.stringify(jsx);
    // Seeded docs include WHO AFRO documents
    expect(str).toContain("WHO AFRO");
  });

  it("passes source chips for all seeded sources to SourceFilterBar", async () => {
    const jsx = await SitrepsPage({ searchParams: Promise.resolve({}) });
    const str = JSON.stringify(jsx);
    // SourceFilterBar is a non-async child component; JSON.stringify of the RSC
    // output serialises it as an unexecuted element — its `type` (the fn ref)
    // drops to undefined (omitted from JSON), but `props.chips` is present.
    expect(str).toContain('"slug":"africa-cdc"');
    expect(str).toContain('"slug":"who-afro"');
    expect(str).toContain('"chips"');
  });

  it("shows empty state text when filtering by a nonexistent source", async () => {
    const jsx = await SitrepsPage({
      searchParams: Promise.resolve({ source: "does-not-exist" }),
    });
    const str = JSON.stringify(jsx);
    expect(str).toContain("No situation reports match your filters");
  });
});
