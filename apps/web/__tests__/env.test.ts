// @vitest-environment node
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

  it("throws when POSTGRES_URL_NON_POOLING is not a valid URL", async () => {
    vi.stubEnv("POSTGRES_URL_NON_POOLING", "not-a-valid-url");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("INNGEST_EVENT_KEY", "test-key");
    vi.stubEnv("INNGEST_SIGNING_KEY", "test-key");
    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow();
  });
});
