import { afterEach, describe, expect, it, vi } from "vitest";

import { getSourceBySlug, listSources } from "@/lib/queries/sources";
import { resetFixtures } from "@/lib/server/integration-fixtures";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], setAll: vi.fn() }),
}));

afterEach(resetFixtures);

describe("listSources (integration)", () => {
  it("returns at least the three seeded sources", async () => {
    const result = await listSources();
    expect(result.length).toBeGreaterThanOrEqual(3);
    const slugs = result.map((s) => s.slug);
    expect(slugs).toContain("who-don");
    expect(slugs).toContain("who-afro");
    expect(slugs).toContain("ecdc-cdtr");
  });

  it("returns license and trust data from DB", async () => {
    const result = await listSources();
    const whoDon = result.find((s) => s.slug === "who-don");
    // posture_terms is NOT NULL (migration 20260601030000); seed.sql provides it
    expect(whoDon?.slug).toBe("who-don");
    expect(whoDon?.licenseTier).toBe("open");
    expect(whoDon?.trustScore).toBeGreaterThan(0);
  });
});

describe("getSourceBySlug (integration)", () => {
  it("returns the seeded who-don source", async () => {
    const result = await getSourceBySlug("who-don");
    expect(result).not.toBeNull();
    expect(result?.slug).toBe("who-don");
    expect(result?.licenseTier).toBe("open");
    expect(result?.trustScore).toBe(1);
  });

  it("returns null for a slug that does not exist", async () => {
    const result = await getSourceBySlug("nonexistent-source");
    expect(result).toBeNull();
  });
});
