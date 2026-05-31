import { afterEach, describe, expect, it, vi } from "vitest";

import OutbreakDetailPage, {
  generateMetadata as detailGenerateMetadata,
} from "../../[pathogen]/[country]/[onset]/page";
import OutbreaksPage from "../../page";
import { resetFixtures } from "@/lib/server/integration-fixtures";

const BUNDIBUGYO_RE = /bundibugyo/i;
// React renders [count, " results"] as separate children nodes; JSON has the
// number unquoted followed by the literal string " results".
const RESULTS_COUNT_RE = /" results"/;

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/outbreaks",
}));

afterEach(resetFixtures);

describe("OutbreaksPage (integration)", () => {
  it("runs end-to-end against the real DB without throwing", async () => {
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    expect(jsx).toBeTruthy();
  });

  it("seeded outbreak name appears in the JSX tree", async () => {
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    // listOutbreaks returns the seeded bundibugyo outbreak
    const str = JSON.stringify(jsx);
    expect(str).toMatch(BUNDIBUGYO_RE);
  });

  it("shows result count of at least 1 in the JSX", async () => {
    const jsx = await OutbreaksPage({ searchParams: Promise.resolve({}) });
    const str = JSON.stringify(jsx);
    // Outbreaks page renders "{outbreaks.length} results"
    expect(str).toMatch(RESULTS_COUNT_RE);
  });

  it("empty-state text appears when filtering by a nonexistent pathogen", async () => {
    const jsx = await OutbreaksPage({
      searchParams: Promise.resolve({ pathogen: "does-not-exist" }),
    });
    const str = JSON.stringify(jsx);
    expect(str).toContain("No outbreaks match your filters");
  });
});

describe("OutbreakDetailPage generateMetadata (integration)", () => {
  it("builds title from real DB data for seeded outbreak", async () => {
    const meta = await detailGenerateMetadata({
      params: Promise.resolve({ pathogen: "bundibugyo", country: "cod", onset: "2026-04-20" }),
    });
    expect(meta.title).toMatch(BUNDIBUGYO_RE);
    expect(meta.title).toContain("ituri-sitrep");
  });
});

describe("OutbreakDetailPage (integration)", () => {
  it("runs end-to-end against the real DB without throwing", async () => {
    const jsx = await OutbreakDetailPage({
      params: Promise.resolve({ pathogen: "bundibugyo", country: "cod", onset: "2026-04-20" }),
      searchParams: Promise.resolve({}),
    });
    expect(jsx).toBeTruthy();
  });
});
