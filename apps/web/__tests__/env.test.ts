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

  it("throws when NEXT_PUBLIC_SITE_URL is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow();
  });

  it("throws when NEXT_PUBLIC_SITE_URL is not a valid URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not-a-valid-url");
    vi.resetModules();
    await expect(import("../lib/env")).rejects.toThrow();
  });

  it("siteUrl() returns NEXT_PUBLIC_SITE_URL value", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ituri-epi.com");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("INNGEST_EVENT_KEY", "test-key");
    vi.stubEnv("INNGEST_SIGNING_KEY", "test-key");
    vi.stubEnv("POSTGRES_URL_NON_POOLING", "postgresql://localhost/test");
    vi.resetModules();
    const { siteUrl } = await import("../lib/env");
    expect(siteUrl()).toBe("https://ituri-epi.com");
  });

  it("RELIEFWEB_APPNAME is optional — env loads without it", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("INNGEST_EVENT_KEY", "test-key");
    vi.stubEnv("INNGEST_SIGNING_KEY", "test-key");
    vi.stubEnv("POSTGRES_URL_NON_POOLING", "postgresql://localhost/test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ituri-epi.com");
    vi.resetModules();
    const { env } = await import("../lib/env");
    expect(env.RELIEFWEB_APPNAME).toBeUndefined();
  });

  it("ACLED_ACCESS_TOKEN and ACLED_EMAIL are optional — env loads without them", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    vi.stubEnv("INNGEST_EVENT_KEY", "test-key");
    vi.stubEnv("INNGEST_SIGNING_KEY", "test-key");
    vi.stubEnv("POSTGRES_URL_NON_POOLING", "postgresql://localhost/test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://ituri-epi.com");
    vi.resetModules();
    const { env } = await import("../lib/env");
    expect(env.ACLED_ACCESS_TOKEN).toBeUndefined();
    expect(env.ACLED_EMAIL).toBeUndefined();
  });
});
