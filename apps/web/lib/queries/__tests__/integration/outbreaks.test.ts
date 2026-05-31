import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getActiveOutbreak,
  getOutbreakBySlug,
  listOutbreaks,
  listPathogens,
} from "@/lib/queries/outbreaks";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const OUTBREAK_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01";

afterEach(resetFixtures);

describe("getOutbreakBySlug (integration)", () => {
  it("returns the seeded bundibugyo/COD/2026-04-20 outbreak", async () => {
    const result = await getOutbreakBySlug("bundibugyo", "COD", "2026-04-20");
    expect(result).not.toBeNull();
    expect(result?.id).toBe(OUTBREAK_ID);
    expect(result?.pathogenSlug).toBe("bundibugyo");
    expect(result?.countryIso3).toBe("COD");
    expect(result?.status).toBe("active");
    expect(result?.severityLevel).toBe("emergency");
  });

  it("returns null for a slug that does not exist", async () => {
    const result = await getOutbreakBySlug("marburg", "ZZZ", "2099-01-01");
    expect(result).toBeNull();
  });
});

describe("getActiveOutbreak (integration)", () => {
  it("returns the seeded active outbreak", async () => {
    const result = await getActiveOutbreak();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(OUTBREAK_ID);
    expect(result?.status).toBe("active");
    expect(result?.severityLevel).toBe("emergency");
  });
});

describe("listOutbreaks (integration)", () => {
  it("returns at least the seeded outbreak with no filter", async () => {
    const result = await listOutbreaks({});
    expect(result.length).toBeGreaterThanOrEqual(1);
    const seeded = result.find((o) => o.id === OUTBREAK_ID);
    expect(seeded).toBeDefined();
  });

  it("returns the seeded outbreak when filtering by active status", async () => {
    const result = await listOutbreaks({ status: "active" });
    expect(result.some((o) => o.id === OUTBREAK_ID)).toBe(true);
  });

  it("returns empty array when filtering by nonexistent pathogen", async () => {
    const result = await listOutbreaks({ pathogen: "does-not-exist" });
    expect(result).toEqual([]);
  });
});

describe("listPathogens (integration)", () => {
  it("returns at least bundibugyo from the seeded outbreaks", async () => {
    const result = await listPathogens();
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((p) => p.pathogenSlug === "bundibugyo")).toBe(true);
  });
});
