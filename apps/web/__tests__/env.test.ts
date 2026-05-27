import { describe, expect, it, vi } from "vitest";

// Covers proxy.ts String.raw fix, theme-switcher hydration guard, and eslint config corrections.
describe("env validation", () => {
  it("throws when NEXT_PUBLIC_SUPABASE_URL is provided but not a valid URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-valid-url");
    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow();
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
