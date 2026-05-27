import { afterEach, describe, expect, it, vi } from "vitest";

describe("env validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is provided but not a valid URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not-a-valid-url");
    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow();
  });
});
