import { afterEach, describe, expect, it, vi } from "vitest";

import ZonePage, { generateMetadata } from "../../[code]/page";
import { resetFixtures } from "@/lib/server/integration-fixtures";

const ZONE_CODE = "COD-IT-IR";
const ZONE_RE = /COD-IT-IR/;

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

describe("ZonePage (integration)", () => {
  it("runs end-to-end against the real DB without throwing", async () => {
    const jsx = await ZonePage({ params: Promise.resolve({ code: ZONE_CODE }) });
    expect(jsx).toBeTruthy();
  });

  it("zone code appears in the JSX tree", async () => {
    const jsx = await ZonePage({ params: Promise.resolve({ code: ZONE_CODE }) });
    const str = JSON.stringify(jsx);
    expect(str).toMatch(ZONE_RE);
  });

  it("seeded confirmed value (98) appears in the JSX props for COD-IT-IR", async () => {
    const jsx = await ZonePage({ params: Promise.resolve({ code: ZONE_CODE }) });
    // getZoneStatTotals returns confirmed=98 for COD-IT-IR from the seed
    const str = JSON.stringify(jsx);
    expect(str).toContain("98");
  });

  it("seeded confirmed source_quote_id flows into the JSX props", async () => {
    const jsx = await ZonePage({ params: Promise.resolve({ code: ZONE_CODE }) });
    // Zone confirmed links to quote a1eebc99-...
    const str = JSON.stringify(jsx);
    expect(str).toContain("a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01");
  });
});

describe("ZonePage generateMetadata (integration)", () => {
  it("includes the zone code in the page title", async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ code: ZONE_CODE }) });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- vitest expect.stringMatching() returns an any-typed internal matcher
    expect(meta).toMatchObject({ title: expect.stringMatching(ZONE_RE) });
  });
});
